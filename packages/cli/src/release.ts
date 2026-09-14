import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  evaluateReleaseReadiness,
  type ReleaseReadinessEvaluation,
  type ReleaseReadinessState,
  type ResultEnvelope,
  type ResultIssue,
} from "@forgeflow/core";

import { nodeReleaseGitAdapter } from "./release-git.js";

export type ReleaseOutputMode = "human" | "json";

export type ReleaseInspection =
  | {
      readonly kind: "observed";
      readonly root: string;
      readonly initial: ReleaseReadinessState;
      readonly final: ReleaseReadinessState;
    }
  | {
      readonly kind: "incomplete";
      readonly code: string;
      readonly message: string;
    }
  | {
      readonly kind: "error";
      readonly code: string;
      readonly message: string;
      readonly exit: 2 | 3;
    };

/** The sole command seam: real Git acquisition and deterministic fixtures. */
export interface ReleaseObservationAdapter {
  inspect(request: { readonly candidate: string }): Promise<ReleaseInspection>;
}

export interface ReleaseCommandExecution {
  readonly mode: ReleaseOutputMode;
  readonly result: ResultEnvelope;
  readonly evaluation?: ReleaseReadinessEvaluation;
}

export interface ReleaseRenderedOutput {
  readonly stdout: string;
  readonly stderr: string;
}

export const releaseHelp = `ForgeFlow Local Release Check

Usage:
  forgeflow release check [--json] [repository-directory]
  forgeflow release check --help

Checks only local Git state for release readiness. It does not contact remotes,
fetch, push, run hooks, or modify the repository.
`;

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

function error(
  mode: ReleaseOutputMode,
  code: string,
  message: string,
  exit: 2 | 3,
): ReleaseCommandExecution {
  return Object.freeze({
    mode,
    result: Object.freeze({
      schemaVersion: RESULT_SCHEMA_VERSION,
      protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
      status: "error" as const,
      outcome: "ERROR" as const,
      exit,
      subject: "release",
      issues: Object.freeze([issue(code, message)]),
      error: Object.freeze({ code, message }),
      data: Object.freeze({ remoteChecks: "not-performed" }),
    }),
  });
}

function incomplete(
  mode: ReleaseOutputMode,
  code: string,
  message: string,
): ReleaseCommandExecution {
  return Object.freeze({
    mode,
    result: Object.freeze({
      schemaVersion: RESULT_SCHEMA_VERSION,
      protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
      status: "fail" as const,
      outcome: "RELEASE_INCOMPLETE" as const,
      exit: 1 as const,
      subject: "release",
      issues: Object.freeze([issue(code, message)]),
      data: Object.freeze({ remoteChecks: "not-performed" }),
    }),
  });
}

function parse(args: readonly string[]):
  | {
      readonly valid: true;
      readonly mode: ReleaseOutputMode;
      readonly candidate?: string;
    }
  | { readonly valid: false; readonly mode: ReleaseOutputMode } {
  const requestedMode: ReleaseOutputMode = args.includes("--json")
    ? "json"
    : "human";
  let mode: ReleaseOutputMode = "human";
  let jsonSeen = false;
  let candidate: string | undefined;
  for (const argument of args) {
    if (argument === "--json") {
      if (jsonSeen) return { valid: false, mode: requestedMode };
      jsonSeen = true;
      mode = "json";
    } else if (argument.startsWith("-")) {
      return { valid: false, mode: requestedMode };
    } else if (candidate === undefined) {
      candidate = argument;
    } else {
      return { valid: false, mode: requestedMode };
    }
  }
  return candidate === undefined
    ? { valid: true, mode }
    : { valid: true, mode, candidate };
}

export async function runReleaseCheck(
  args: readonly string[],
  cwd: string = process.cwd(),
  adapter: ReleaseObservationAdapter = nodeReleaseGitAdapter,
): Promise<ReleaseCommandExecution> {
  const invocation = parse(args);
  if (!invocation.valid)
    return error(invocation.mode, "RELEASE_USAGE", "Invalid arguments", 2);

  try {
    const inspection = await adapter.inspect({
      candidate: invocation.candidate ?? cwd,
    });
    if (inspection.kind === "incomplete")
      return incomplete(invocation.mode, inspection.code, inspection.message);
    if (inspection.kind === "error")
      return error(
        invocation.mode,
        inspection.code,
        inspection.message,
        inspection.exit,
      );

    const evaluation = evaluateReleaseReadiness({
      initial: inspection.initial,
      final: inspection.final,
    });
    return Object.freeze({
      mode: invocation.mode,
      evaluation,
      result: evaluation.result,
    });
  } catch {
    return error(
      invocation.mode,
      "RELEASE_INTERNAL_ERROR",
      "Release inspection could not complete",
      3,
    );
  }
}

export function renderReleaseHuman(
  execution: ReleaseCommandExecution,
): ReleaseRenderedOutput {
  const prefix = execution.result.outcome === "RELEASE_READY" ? "PASS" : "FAIL";
  const firstIssue = execution.result.issues[0];
  const line =
    firstIssue === undefined
      ? `${prefix} release check\n`
      : `${prefix} release check: ${firstIssue.code}: ${firstIssue.message}\n`;
  return Object.freeze({
    stdout: execution.result.exit === 0 ? line : "",
    stderr: execution.result.exit === 0 ? "" : line,
  });
}
