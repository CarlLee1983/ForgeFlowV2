import {
  lstat,
  mkdtemp,
  realpath,
  rm,
  rmdir,
  writeFile,
} from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";

import {
  evaluateActivationAcquisition,
  evaluateActivationMutation,
  evaluateActivationScratchCleanup,
  IMPLEMENTED_PROTOCOL_VERSION,
  planActivation,
  RESULT_SCHEMA_VERSION,
  type ActivationPathObservation,
  type ActivationAcquisitionObservation,
  type ActivationPlanEvaluation,
  type ActivationPlannedPayload,
  type ActivationSourceSnapshot,
  type ResultEnvelope,
  type ResultIssue,
} from "@forgeflow/core";

import { executeActivationMutationWithSignals } from "./activation-mutation.js";
import { captureActivationObservations } from "./activation-observation.js";
import { loadPackagedActivationSource } from "./activation-snapshot.js";
import { initFilesystemIdentity } from "./init-observation.js";

export type ActivationOutputMode = "human" | "json";

export interface ActivationInspection {
  readonly root: string;
  readonly rootIdentity: string;
  readonly source: ActivationSourceSnapshot;
  readonly paths: readonly ActivationPathObservation[];
}

export interface ActivationFilesystemAdapter {
  inspect(
    candidate: string,
  ): Promise<ActivationInspection | ActivationAcquisitionObservation>;
}

export interface ActivationScratchSession {
  readonly path: string;
  readonly token: string;
  cleanup(): Promise<boolean>;
}

export interface ActivationScratchPreparation {
  readonly prepared: boolean;
  readonly cleaned: boolean;
  readonly retainedPath?: string;
  readonly retainedToken?: string;
  readonly session?: ActivationScratchSession;
}

export interface ActivationScratchAdapter {
  prepare(
    payloads: readonly ActivationPlannedPayload[],
  ): Promise<ActivationScratchPreparation>;
}

export interface ActivationCommandExecution {
  readonly mode: ActivationOutputMode;
  readonly result: ResultEnvelope;
  readonly root?: string;
  readonly evaluation?: ActivationPlanEvaluation;
  readonly retainedScratchPath?: string;
  readonly humanPreview?: ActivationHumanPreview;
}

interface ActivationHumanPreview {
  readonly before: Uint8Array;
  readonly after: Uint8Array;
}

export interface ActivationRenderedOutput {
  readonly stdout: string;
  readonly stderr: string;
}

export const activationHelp = `ForgeFlow Codex Activation

Usage:
  forgeflow codex activate [--apply] [--json] repository-directory
  forgeflow codex activate --help

Previews the bounded project-local Codex integration by default. --apply
explicitly installs or updates the packaged offline snapshot. Activation never
uses the network or executes target-owned code.
`;

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

function commandError(
  mode: ActivationOutputMode,
  code: string,
  message: string,
): ActivationCommandExecution {
  const problems = Object.freeze([issue(code, message)]);
  return Object.freeze({
    mode,
    result: Object.freeze({
      schemaVersion: RESULT_SCHEMA_VERSION,
      protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
      status: "error" as const,
      outcome: "ERROR" as const,
      exit: 2 as const,
      subject: "activation",
      error: Object.freeze({ code, message }),
      issues: problems,
    }),
  });
}

function internalError(mode: ActivationOutputMode): ActivationCommandExecution {
  const code = "ACTIVATION_INTERNAL_ERROR";
  const message =
    "Codex activation could not complete because of an internal failure.";
  const problems = Object.freeze([issue(code, message)]);
  return Object.freeze({
    mode,
    result: Object.freeze({
      schemaVersion: RESULT_SCHEMA_VERSION,
      protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
      status: "error" as const,
      outcome: "ERROR" as const,
      exit: 3 as const,
      subject: "activation",
      error: Object.freeze({ code, message }),
      issues: problems,
    }),
  });
}

function parse(args: readonly string[]):
  | {
      readonly valid: true;
      readonly mode: ActivationOutputMode;
      readonly apply: boolean;
      readonly candidate: string;
    }
  | { readonly valid: false; readonly mode: ActivationOutputMode } {
  const requestedMode: ActivationOutputMode = args.includes("--json")
    ? "json"
    : "human";
  let mode: ActivationOutputMode = "human";
  let apply = false;
  let candidate: string | undefined;
  for (const argument of args) {
    if (candidate !== undefined) return { valid: false, mode: requestedMode };
    if (argument === "--json") {
      if (mode === "json") return { valid: false, mode: requestedMode };
      mode = "json";
    } else if (argument === "--apply") {
      if (apply) return { valid: false, mode: requestedMode };
      apply = true;
    } else if (argument.startsWith("-")) {
      return { valid: false, mode: requestedMode };
    } else {
      candidate = argument;
    }
  }
  return candidate === undefined
    ? { valid: false, mode: requestedMode }
    : Object.freeze({ valid: true, mode, apply, candidate });
}

export const nodeActivationFilesystemAdapter: ActivationFilesystemAdapter =
  Object.freeze({
    async inspect(
      candidate: string,
    ): Promise<ActivationInspection | ActivationAcquisitionObservation> {
      let root: string;
      let rootIdentity: string;
      try {
        root = await realpath(candidate);
        const rootStats = await lstat(root);
        if (!rootStats.isDirectory())
          return Object.freeze({ kind: "target-unavailable" as const });
        rootIdentity = initFilesystemIdentity(rootStats);
      } catch {
        return Object.freeze({ kind: "target-unavailable" as const });
      }
      let source: ActivationSourceSnapshot;
      try {
        source = await loadPackagedActivationSource();
      } catch {
        return Object.freeze({ kind: "source-unavailable" as const });
      }
      const paths = await captureActivationObservations(root);
      return Object.freeze({
        root,
        rootIdentity,
        source,
        paths,
      });
    },
  });

export const nodeActivationScratchAdapter: ActivationScratchAdapter =
  Object.freeze({
    async prepare(
      payloads: readonly ActivationPlannedPayload[],
    ): Promise<ActivationScratchPreparation> {
      let path: string;
      try {
        path = await mkdtemp(join(tmpdir(), "forgeflow-activation-"));
      } catch {
        return Object.freeze({ prepared: false, cleaned: true });
      }
      const token = `scratch/${basename(path)}`;
      let identity: string;
      try {
        identity = initFilesystemIdentity(await lstat(path));
      } catch {
        return Object.freeze({
          prepared: false,
          cleaned: false,
          retainedPath: path,
          retainedToken: token,
        });
      }
      const ownedNames = Object.freeze(
        payloads.map(({ path: payloadPath }) => basename(payloadPath)),
      );
      const cleanupOwned = async (): Promise<boolean> => {
        try {
          const stats = await lstat(path);
          if (
            !stats.isDirectory() ||
            initFilesystemIdentity(stats) !== identity
          )
            return false;
          for (const name of ownedNames)
            await rm(join(path, name), { force: true });
          await rmdir(path);
          return true;
        } catch {
          return false;
        }
      };
      try {
        for (const payload of payloads) {
          await writeFile(join(path, basename(payload.path)), payload.bytes, {
            flag: "wx",
            mode: payload.mode,
          });
        }
      } catch {
        if (await cleanupOwned())
          return Object.freeze({ prepared: false, cleaned: true });
        return Object.freeze({
          prepared: false,
          cleaned: false,
          retainedPath: path,
          retainedToken: token,
        });
      }
      const session: ActivationScratchSession = Object.freeze({
        path,
        token,
        async cleanup(): Promise<boolean> {
          return cleanupOwned();
        },
      });
      return Object.freeze({
        prepared: true,
        cleaned: false,
        session,
      });
    },
  });

function withScratchObservation(
  mode: ActivationOutputMode,
  root: string,
  evaluation: ActivationPlanEvaluation,
  preparation: ActivationScratchPreparation,
  humanPreview?: ActivationHumanPreview,
): ActivationCommandExecution {
  const retained =
    preparation.retainedToken === undefined
      ? Object.freeze([])
      : Object.freeze([preparation.retainedToken]);
  const observed = evaluateActivationScratchCleanup(evaluation, {
    prepared: preparation.prepared,
    cleaned: preparation.cleaned,
    retained,
  });
  return Object.freeze({
    mode,
    root,
    result: observed.result,
    evaluation: observed,
    ...(preparation.retainedPath === undefined
      ? {}
      : { retainedScratchPath: preparation.retainedPath }),
    ...(humanPreview === undefined ? {} : { humanPreview }),
  });
}

function getHumanPreview(
  inspection: ActivationInspection,
  evaluation: ActivationPlanEvaluation,
): ActivationHumanPreview | undefined {
  const current = inspection.paths.find(({ path }) => path === "AGENTS.md");
  const desired = evaluation.payloads?.find(({ path }) => path === "AGENTS.md");
  return current?.bytes === undefined || desired === undefined
    ? undefined
    : Object.freeze({
        before: current.bytes.slice(),
        after: desired.bytes.slice(),
      });
}

async function cleanupScratch(
  session: ActivationScratchSession,
): Promise<boolean> {
  try {
    return await session.cleanup();
  } catch {
    return false;
  }
}

export async function runActivation(
  args: readonly string[],
  filesystem: ActivationFilesystemAdapter = nodeActivationFilesystemAdapter,
  scratch: ActivationScratchAdapter = nodeActivationScratchAdapter,
  mutationExecutor: typeof executeActivationMutationWithSignals = executeActivationMutationWithSignals,
): Promise<ActivationCommandExecution> {
  const invocation = parse(args);
  if (!invocation.valid)
    return commandError(
      invocation.mode,
      "ACTIVATION_USAGE",
      "Invalid arguments",
    );
  let acquired: ActivationInspection | ActivationAcquisitionObservation;
  try {
    acquired = await filesystem.inspect(invocation.candidate);
  } catch {
    return internalError(invocation.mode);
  }
  if ("kind" in acquired) {
    const evaluation = evaluateActivationAcquisition(acquired);
    return Object.freeze({
      mode: invocation.mode,
      result: evaluation.result,
      evaluation,
    });
  }
  const inspection = acquired;
  const planned = planActivation({
    rootIdentity: inspection.rootIdentity,
    source: inspection.source,
    paths: inspection.paths,
  });
  if (
    planned.result.outcome !== "ACTIVATION_PREVIEW" &&
    planned.result.outcome !== "ACTIVATION_UNCHANGED"
  )
    return Object.freeze({
      mode: invocation.mode,
      root: inspection.root,
      result: planned.result,
      evaluation: planned,
    });
  if (planned.payloads === undefined) return internalError(invocation.mode);

  let preparation: ActivationScratchPreparation;
  try {
    preparation = await scratch.prepare(planned.payloads);
  } catch {
    return internalError(invocation.mode);
  }
  if (!preparation.prepared || preparation.session === undefined)
    return withScratchObservation(
      invocation.mode,
      inspection.root,
      planned,
      preparation,
      getHumanPreview(inspection, planned),
    );

  if (!invocation.apply || planned.result.outcome === "ACTIVATION_UNCHANGED") {
    const cleaned = await cleanupScratch(preparation.session);
    return withScratchObservation(
      invocation.mode,
      inspection.root,
      planned,
      Object.freeze({
        prepared: true,
        cleaned,
        ...(cleaned
          ? {}
          : {
              retainedPath: preparation.session.path,
              retainedToken: preparation.session.token,
            }),
      }),
      getHumanPreview(inspection, planned),
    );
  }
  if (planned.plan === undefined) return internalError(invocation.mode);
  try {
    const mutation = await mutationExecutor(
      inspection.root,
      planned.plan,
      planned.payloads,
    );
    const evaluated = evaluateActivationMutation(planned.plan, mutation);
    const cleaned = await cleanupScratch(preparation.session);
    return withScratchObservation(
      invocation.mode,
      inspection.root,
      evaluated,
      Object.freeze({
        prepared: true,
        cleaned,
        ...(cleaned
          ? {}
          : {
              retainedPath: preparation.session.path,
              retainedToken: preparation.session.token,
            }),
      }),
    );
  } catch {
    await cleanupScratch(preparation.session);
    return internalError(invocation.mode);
  }
}

function renderDiffSide(bytes: Uint8Array, prefix: "-" | "+"): string[] {
  const source = new TextDecoder().decode(bytes);
  const terminated = source.endsWith("\n");
  const lines = source.split("\n");
  if (terminated) lines.pop();
  const rendered = lines.map((line) => `${prefix}${line}`);
  if (!terminated) rendered.push("\\ No newline at end of file");
  return rendered;
}

function renderAgentsDiff(
  root: string,
  preview: ActivationHumanPreview,
): readonly string[] {
  const before = renderDiffSide(preview.before, "-");
  const after = renderDiffSide(preview.after, "+");
  return Object.freeze([
    `--- ${root}/AGENTS.md`,
    `+++ ${root}/AGENTS.md (proposed)`,
    `@@ -1,${before.filter((line) => !line.startsWith("\\")).length} +1,${after.filter((line) => !line.startsWith("\\")).length} @@`,
    ...before,
    ...after,
  ]);
}

export function renderActivationHuman(
  execution: ActivationCommandExecution,
): ActivationRenderedOutput {
  const data = execution.result.data;
  if (execution.result.outcome === "ACTIVATION_PREVIEW") {
    const changes = Array.isArray(data?.changes) ? data.changes : [];
    const lines = [
      ...changes.map((change) => {
        const entry = change as { path?: unknown };
        return `Would write ${execution.root ?? "."}/${String(entry.path)}`;
      }),
      ...(execution.humanPreview === undefined
        ? []
        : renderAgentsDiff(execution.root ?? ".", execution.humanPreview)),
      "Preview only; review the changes, then authorize --apply.",
    ];
    return Object.freeze({ stdout: `${lines.join("\n")}\n`, stderr: "" });
  }
  if (execution.result.outcome === "ACTIVATION_UNCHANGED") {
    return Object.freeze({
      stdout: `Already installed: ForgeFlow ${String(data?.version)} (${String(data?.revision)})\n`,
      stderr: "",
    });
  }
  if (execution.result.outcome === "ACTIVATION_APPLIED") {
    return Object.freeze({
      stdout: `Installed ForgeFlow ${String(data?.version)} (${String(data?.revision)}) in ${execution.root ?? "."}\n`,
      stderr: "",
    });
  }
  const first = execution.result.issues[0];
  const detail =
    first === undefined
      ? "Activation failed."
      : `${first.code}: ${first.message}`;
  const unrecovered = Array.isArray(data?.unrecovered) ? data.unrecovered : [];
  const retained = Array.isArray(data?.retained) ? data.retained : [];
  const cleanup = Array.isArray(data?.cleanupResidue)
    ? data.cleanupResidue
    : [];
  const lines = [
    `FAIL activation: ${detail}`,
    ...unrecovered.map((path) => `UNRESTORED: ${String(path)}`),
    ...retained.map((path) => `Recovery copies retained: ${String(path)}`),
    ...cleanup.map((path) => `Cleanup incomplete: ${String(path)}`),
    ...(execution.retainedScratchPath === undefined
      ? []
      : [`Retained activation scratch: ${execution.retainedScratchPath}`]),
  ];
  return Object.freeze({ stdout: "", stderr: `${lines.join("\n")}\n` });
}
