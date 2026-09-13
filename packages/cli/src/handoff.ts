import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";

import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  evaluateHandoff,
  type HandoffEvaluation,
} from "@forgeflow/core";

export type HandoffOutputMode = "human" | "json";

export type HandoffSourceRead =
  | { readonly ok: true; readonly source: string }
  | { readonly ok: false; readonly reason: "symlink" | "unavailable" };

export interface HandoffSourceReader {
  read(path: string): Promise<HandoffSourceRead>;
}

interface HandoffPathStats {
  readonly size: number;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

interface OpenedHandoffFile {
  stat(): Promise<HandoffPathStats>;
  readFile(options: { readonly encoding: "utf8" }): Promise<string>;
  close(): Promise<void>;
}

export interface HandoffFileAccess {
  lstat(path: string): Promise<HandoffPathStats>;
  open(path: string, flags: number): Promise<OpenedHandoffFile>;
}

export interface HandoffCommandExecution {
  readonly mode: HandoffOutputMode;
  readonly path: string;
  readonly evaluation: HandoffEvaluation;
}

export interface HandoffRenderedOutput {
  readonly stdout: string;
  readonly stderr: string;
}

export const DEFAULT_HANDOFF_PATH = "specs/handoff.md";

export const handoffHelp = `ForgeFlow Handoff Contract Check

Usage:
  forgeflow handoff check [--json] [handoff-file]
  forgeflow handoff check --help

The handoff file defaults to specs/handoff.md.

The check is static and read-only. It validates one immutable
point-in-time evidence block; it never reads lifecycle state, runs
verification, or authorizes a merge.
`;

function issueResult(
  outcome: "usage-error" | "configuration-error",
  code: string,
  message: string,
): HandoffEvaluation {
  return {
    result: {
      schemaVersion: RESULT_SCHEMA_VERSION,
      protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
      status: "error",
      outcome,
      exit: 2,
      subject: "handoff",
      issues: [{ code, message }],
    },
  };
}

const nodeHandoffFileAccess: HandoffFileAccess = { lstat, open };

export function createNodeHandoffSourceReader(
  fileAccess: HandoffFileAccess = nodeHandoffFileAccess,
): HandoffSourceReader {
  return Object.freeze({
    async read(path: string): Promise<HandoffSourceRead> {
      let pathStats;
      try {
        pathStats = await fileAccess.lstat(path);
      } catch {
        return { ok: false, reason: "unavailable" };
      }

      if (pathStats.isSymbolicLink()) {
        return { ok: false, reason: "symlink" };
      }
      if (!pathStats.isFile()) {
        return { ok: false, reason: "unavailable" };
      }

      let handle;
      try {
        handle = await fileAccess.open(
          path,
          constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
        );
      } catch {
        return { ok: false, reason: "unavailable" };
      }

      try {
        const openedStats = await handle.stat();
        if (!openedStats.isFile() || openedStats.size === 0) {
          return { ok: false, reason: "unavailable" };
        }
        const source = await handle.readFile({ encoding: "utf8" });
        return source.length === 0
          ? { ok: false, reason: "unavailable" }
          : { ok: true, source };
      } catch {
        return { ok: false, reason: "unavailable" };
      } finally {
        await handle.close().catch(() => undefined);
      }
    },
  });
}

export const nodeHandoffSourceReader = createNodeHandoffSourceReader();

function parseArguments(args: readonly string[]): {
  readonly mode: HandoffOutputMode;
  readonly path?: string;
  readonly valid: boolean;
} {
  const mode = args[0] === "--json" ? "json" : "human";
  const tail = mode === "json" ? args.slice(1) : args;

  return {
    mode,
    ...(tail.length === 1 ? { path: tail[0] } : {}),
    valid:
      tail.length <= 1 && tail.every((argument) => !argument.startsWith("-")),
  };
}

export async function runHandoffCheck(
  args: readonly string[],
  reader: HandoffSourceReader = nodeHandoffSourceReader,
): Promise<HandoffCommandExecution> {
  const parsed = parseArguments(args);
  const path = parsed.path ?? DEFAULT_HANDOFF_PATH;

  if (!parsed.valid) {
    return {
      mode: parsed.mode,
      path,
      evaluation: issueResult(
        "usage-error",
        "INVALID_ARGUMENTS",
        "Invalid arguments",
      ),
    };
  }

  const source = await reader.read(path);
  if (!source.ok) {
    return {
      mode: parsed.mode,
      path,
      evaluation: issueResult(
        "configuration-error",
        source.reason === "symlink"
          ? "HANDOFF_PATH_SYMLINK"
          : "HANDOFF_SOURCE_UNAVAILABLE",
        source.reason === "symlink"
          ? "Handoff path is a symlink."
          : "Handoff is missing, unreadable, or empty.",
      ),
    };
  }

  return {
    mode: parsed.mode,
    path,
    evaluation: evaluateHandoff(source.source),
  };
}

function renderError(
  execution: HandoffCommandExecution,
): HandoffRenderedOutput {
  const { result } = execution.evaluation;
  const issue = result.issues[0];
  const message = issue?.message ?? "Internal error.";

  if (result.outcome === "usage-error") {
    return {
      stdout: "",
      stderr:
        `ERROR ${message}\n` +
        "Usage: forgeflow handoff check [--json] [handoff-file]\n" +
        "       forgeflow handoff check --help\n\n" +
        "Result: ERROR\n",
    };
  }

  const detail =
    issue?.code === "HANDOFF_PATH_SYMLINK"
      ? `Handoff path is a symlink: ${execution.path}`
      : `Handoff is missing, unreadable, or empty: ${execution.path}`;

  return {
    stdout: "ForgeFlow Handoff Contract Check\n\n\nResult: ERROR\n",
    stderr: `ERROR ${detail}\n`,
  };
}

function renderIncomplete(
  execution: HandoffCommandExecution,
): HandoffRenderedOutput {
  const issueCode = execution.evaluation.result.issues[0]?.code;
  const failures = execution.evaluation.result.issues
    .map((issue) => `FAIL  ${issue.message}\n`)
    .join("");
  const next =
    issueCode === "HANDOFF_BLOCK_UNCLOSED"
      ? `Close the fenced yaml evidence block in ${execution.path}.\n`
      : issueCode === "HANDOFF_BLOCK_COUNT_INVALID"
        ? `Add exactly one fenced yaml evidence block to ${execution.path}.\n`
        : `Resolve the reported evidence fields in ${execution.path}, then run this check\n` +
          "again. Mutable lifecycle state belongs in a control plane, not here.\n";

  return {
    stdout:
      "ForgeFlow Handoff Contract Check\n\n" +
      failures +
      "\nResult: HANDOFF_CONTRACT_INCOMPLETE\n\n" +
      "Next:\n" +
      next,
    stderr: "",
  };
}

function renderSuccess(
  execution: HandoffCommandExecution,
): HandoffRenderedOutput {
  const evidence = execution.evaluation.evidence;
  if (evidence === undefined) {
    return renderError({
      ...execution,
      evaluation: issueResult(
        "configuration-error",
        "HANDOFF_EVIDENCE_UNAVAILABLE",
        "Handoff evidence is unavailable.",
      ),
    });
  }

  return {
    stdout:
      "ForgeFlow Handoff Contract Check\n\n" +
      `PASS  Story evidence: ${evidence.story}\n` +
      `PASS  recorded at: ${evidence.recordedAt}\n` +
      `PASS  repository revision: ${evidence.repository} ${evidence.revision}\n` +
      `PASS  verification evidence: ${evidence.verificationCommand} ${evidence.verificationResult}\n` +
      "\nResult: HANDOFF_CONTRACT_OK\n\n" +
      "Next:\n" +
      "Historical evidence only. Ask the human or control plane for current state.\n",
    stderr: "",
  };
}

export function renderHandoffHuman(
  execution: HandoffCommandExecution,
): HandoffRenderedOutput {
  const { result } = execution.evaluation;
  if (result.status === "error") {
    return renderError(execution);
  }
  if (result.status === "fail") {
    return renderIncomplete(execution);
  }
  return renderSuccess(execution);
}
