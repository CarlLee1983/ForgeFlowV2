import { constants } from "node:fs";
import { access, lstat, realpath } from "node:fs/promises";
import { resolve } from "node:path";

import {
  adoptionMarkerPath,
  IMPLEMENTED_PROTOCOL_VERSION,
  planMutation,
  RESULT_SCHEMA_VERSION,
  type InitPathObservation,
  type InitPlanEvaluation,
  type InitSnapshot,
  type ResultEnvelope,
  type ResultIssue,
} from "@forgeflow/core";

import { loadPackagedInitSnapshot } from "./init-snapshot.js";

export type InitOutputMode = "human" | "json";

export interface InitCommandExecution {
  readonly mode: InitOutputMode;
  readonly result: ResultEnvelope;
  readonly evaluation?: InitPlanEvaluation;
}

export interface InitRenderedOutput {
  readonly stdout: string;
  readonly stderr: string;
}

export interface InitInspection {
  readonly snapshot: InitSnapshot;
  readonly paths: readonly InitPathObservation[];
}

export interface InitFilesystemAdapter {
  inspect(
    candidate: string,
    mode: "safe" | "force" | "upgrade",
  ): Promise<InitInspection>;
}

const directories = [
  "specs",
  "specs/stories",
  "specs/stories/_template",
  "guidance",
] as const;
const destinations = [
  "AGENTS.md",
  "specs/stories/_template/story.md",
  "specs/stories/_template/acceptance.md",
  "specs/stories/_template/task.md",
  "guidance/ENTRY.md",
  "guidance/PRINCIPLES.md",
  "guidance/DECISIONS.md",
  "guidance/PRACTICES.md",
  adoptionMarkerPath,
] as const;

export const initHelp = `ForgeFlow Init Preview

Usage:
  forgeflow init --dry-run [--force | --upgrade] [--json] [repository-directory]
  forgeflow init --help

Plans an offline ForgeFlow initialization from the Protocol snapshot bundled in
this CLI package. --dry-run performs no target writes, staging, recovery,
network access, prompts, or apply operation. --force and --upgrade are mutually
exclusive. Apply mode is not available yet.
`;

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

function commandError(
  mode: InitOutputMode,
  code: string,
  message: string,
): InitCommandExecution {
  const problems = Object.freeze([issue(code, message)]);
  return Object.freeze({
    mode,
    result: Object.freeze({
      schemaVersion: RESULT_SCHEMA_VERSION,
      protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
      status: "error" as const,
      outcome: "ERROR" as const,
      exit: 2 as const,
      subject: "init",
      error: Object.freeze({ code, message }),
      issues: problems,
    }),
  });
}

function sourceRefusal(mode: InitOutputMode): InitCommandExecution {
  const code = "INIT_SNAPSHOT_UNAVAILABLE";
  const message =
    "The bundled Protocol snapshot could not be safely inspected.";
  return Object.freeze({
    mode,
    result: Object.freeze({
      schemaVersion: RESULT_SCHEMA_VERSION,
      protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
      status: "fail" as const,
      outcome: "INIT_OPERATION_REFUSED" as const,
      exit: 1 as const,
      subject: "init",
      issues: Object.freeze([issue(code, message)]),
    }),
  });
}

function parse(args: readonly string[]):
  | {
      readonly valid: true;
      readonly mode: InitOutputMode;
      readonly dryRun: boolean;
      readonly initMode: "safe" | "force" | "upgrade";
      readonly candidate?: string;
    }
  | { readonly valid: false; readonly mode: InitOutputMode } {
  const requestedMode: InitOutputMode = args.includes("--json")
    ? "json"
    : "human";
  let mode: InitOutputMode = "human";
  let dryRun = false;
  let initMode: "safe" | "force" | "upgrade" = "safe";
  let candidate: string | undefined;
  for (const argument of args) {
    if (candidate !== undefined) return { valid: false, mode: requestedMode };
    if (argument === "--json") {
      if (mode === "json") return { valid: false, mode: requestedMode };
      mode = "json";
    } else if (argument === "--dry-run") {
      if (dryRun) return { valid: false, mode: requestedMode };
      dryRun = true;
    } else if (argument === "--force" || argument === "--upgrade") {
      const requested = argument === "--force" ? "force" : "upgrade";
      if (initMode !== "safe") return { valid: false, mode: requestedMode };
      initMode = requested;
    } else if (argument.startsWith("-")) {
      return { valid: false, mode: requestedMode };
    } else if (candidate === undefined) {
      candidate = argument;
    } else {
      return { valid: false, mode: requestedMode };
    }
  }
  return Object.freeze({
    valid: true,
    mode,
    dryRun,
    initMode,
    ...(candidate === undefined ? {} : { candidate }),
  });
}

async function canAccess(path: string, mode: number): Promise<boolean> {
  try {
    await access(path, mode);
    return true;
  } catch {
    return false;
  }
}

async function observe(
  path: string,
  relativePath: string,
): Promise<InitPathObservation> {
  try {
    const stats = await lstat(path);
    if (stats.isSymbolicLink())
      return Object.freeze({ path: relativePath, kind: "symlink" });
    if (stats.isDirectory())
      return Object.freeze({
        path: relativePath,
        kind: "directory",
        readable: await canAccess(path, constants.R_OK),
        searchable: await canAccess(path, constants.X_OK),
      });
    if (stats.isFile())
      return Object.freeze({
        path: relativePath,
        kind: "file",
        readable: await canAccess(path, constants.R_OK),
      });
    return Object.freeze({ path: relativePath, kind: "other" });
  } catch (error: unknown) {
    return (error as { code?: string }).code === "ENOENT"
      ? Object.freeze({ path: relativePath, kind: "missing" })
      : Object.freeze({ path: relativePath, kind: "unconfirmable" });
  }
}

export const nodeInitFilesystemAdapter: InitFilesystemAdapter = Object.freeze({
  async inspect(
    candidate: string,
    mode: "safe" | "force" | "upgrade",
  ): Promise<InitInspection> {
    const root = await realpath(candidate);
    const rootStats = await lstat(root);
    if (!rootStats.isDirectory())
      throw new Error("The target is not a directory.");
    let snapshot: InitSnapshot;
    try {
      snapshot = await loadPackagedInitSnapshot();
    } catch {
      throw new InitSnapshotUnavailableError();
    }
    const activeDirectories =
      mode === "upgrade" ? directories.slice(0, 3) : directories;
    const activeDestinations =
      mode === "upgrade"
        ? [
            "specs/stories/_template/story.md",
            "specs/stories/_template/acceptance.md",
            "specs/stories/_template/task.md",
            adoptionMarkerPath,
          ]
        : destinations;
    const paths: InitPathObservation[] = [];
    const blockedPrefixes: string[] = [];
    for (const path of activeDirectories) {
      if (blockedPrefixes.some((prefix) => path.startsWith(`${prefix}/`))) {
        paths.push({ path, kind: "unconfirmable" });
        continue;
      }
      const entry = await observe(resolve(root, path), path);
      paths.push(entry);
      if (
        entry.kind !== "missing" &&
        (entry.kind !== "directory" ||
          entry.readable !== true ||
          entry.searchable !== true)
      )
        blockedPrefixes.push(path);
    }
    for (const path of activeDestinations) {
      if (!paths.some((entry) => entry.path === path))
        paths.push(
          blockedPrefixes.some((prefix) => path.startsWith(`${prefix}/`))
            ? { path, kind: "unconfirmable" }
            : await observe(resolve(root, path), path),
        );
    }
    return Object.freeze({ snapshot, paths: Object.freeze(paths) });
  },
});

export async function runInit(
  args: readonly string[],
  cwd: string = process.cwd(),
  adapter: InitFilesystemAdapter = nodeInitFilesystemAdapter,
): Promise<InitCommandExecution> {
  const invocation = parse(args);
  if (!invocation.valid)
    return commandError(invocation.mode, "INIT_USAGE", "Invalid arguments");
  if (!invocation.dryRun)
    return commandError(
      invocation.mode,
      "INIT_APPLY_UNAVAILABLE",
      "Init apply mode is not available; use --dry-run.",
    );
  try {
    const inspection = await adapter.inspect(
      invocation.candidate ?? cwd,
      invocation.initMode,
    );
    const evaluation = planMutation({
      mode: invocation.initMode,
      snapshot: inspection.snapshot,
      paths: inspection.paths,
    });
    return Object.freeze({
      mode: invocation.mode,
      result: evaluation.result,
      evaluation,
    });
  } catch (error: unknown) {
    if (error instanceof InitSnapshotUnavailableError)
      return sourceRefusal(invocation.mode);
    return commandError(
      invocation.mode,
      "INIT_TARGET_UNAVAILABLE",
      "The init target or bundled Protocol snapshot could not be inspected.",
    );
  }
}

class InitSnapshotUnavailableError extends Error {}

export function renderInitHuman(
  execution: InitCommandExecution,
): InitRenderedOutput {
  if (execution.result.outcome !== "INIT_PREVIEW") {
    const first = execution.result.issues[0];
    const detail =
      first === undefined
        ? "Init preview failed."
        : `${first.code}: ${first.message}`;
    return Object.freeze({ stdout: "", stderr: `FAIL init: ${detail}\n` });
  }
  const data = execution.result.data;
  const changes = Array.isArray(data?.changes) ? data.changes : [];
  const lines = [
    "ForgeFlow init dry run",
    `Protocol snapshot: ${String(data?.protocolVersion)}`,
    `Provenance: ${String(data?.provenance)}`,
    "",
    ...changes.map((change) => {
      const entry = change as { kind?: unknown; path?: unknown };
      return `Would ${entry.kind === "replace" ? "replace" : "install"} ${String(entry.path)}`;
    }),
    "",
    "ForgeFlow init dry run completed",
  ];
  return Object.freeze({ stdout: `${lines.join("\n")}\n`, stderr: "" });
}
