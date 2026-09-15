import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  type ResultEnvelope,
  type ResultIssue,
} from "@praxisbound/core";

import {
  executeCanonicalVerification,
  nodeVerificationProcessAdapter,
  renderVerificationCompletion,
  type CanonicalVerificationExecution,
  type VerificationOutputObserver,
  type VerificationProcessAdapter,
} from "./canonical-verification.js";
import {
  hasConfirmedRequiredStructure,
  nodeDoctorFilesystemAdapter,
  renderDoctorHuman,
  runDoctor,
  type DoctorCommandExecution,
  type DoctorFilesystemAdapter,
} from "./doctor.js";

export type VerifyOutputMode = "human" | "json";

export type VerifyCommandExecution =
  | {
      readonly kind: "static-failure";
      readonly mode: VerifyOutputMode;
      readonly static?: DoctorCommandExecution;
      readonly result: ResultEnvelope;
    }
  | {
      readonly kind: "executed";
      readonly mode: VerifyOutputMode;
      readonly root: string;
      readonly execution: CanonicalVerificationExecution;
      readonly result: ResultEnvelope;
    };

export interface VerifyRenderedOutput {
  readonly stdout: string;
  readonly stderr: string;
}

export const verifyHelp = `PraxisBound Canonical Verification

Usage:
  praxisbound verify [--json] [repository-directory]
  praxisbound verify --help

Verification executes the trusted repository's make verify target once from
its resolved physical root. It is not read-only or sandboxed and may run
repository-owned code, write files, start services, or use the network.
`;

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

function result(
  status: "fail" | "error",
  outcome: "failure" | "usage-error" | "configuration-error",
  exit: 1 | 2,
  issues: readonly ResultIssue[],
): ResultEnvelope {
  return Object.freeze({
    schemaVersion: RESULT_SCHEMA_VERSION,
    protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
    status,
    outcome,
    exit,
    subject: "verification",
    issues: Object.freeze([...issues]),
  });
}

function parseArguments(args: readonly string[]): {
  readonly mode: VerifyOutputMode;
  readonly target?: string;
  readonly valid: boolean;
} {
  const mode = args[0] === "--json" ? "json" : "human";
  const tail = mode === "json" ? args.slice(1) : args;
  return Object.freeze({
    mode,
    ...(tail.length === 1 ? { target: tail[0] } : {}),
    valid:
      tail.length <= 1 &&
      tail.every(
        (argument) => argument.length > 0 && !argument.startsWith("-"),
      ),
  });
}

function staticResult(staticExecution: DoctorCommandExecution): ResultEnvelope {
  const { evaluation } = staticExecution;
  const exit: 1 | 2 = evaluation.result.exit === 1 ? 1 : 2;
  return result(
    exit === 1 ? "fail" : "error",
    exit === 1 ? "failure" : "configuration-error",
    exit,
    evaluation.result.issues,
  );
}

/**
 * Resolves and structurally confirms a target before it runs exactly one
 * repository-owned canonical verification command.
 */
export async function runVerify(
  args: readonly string[],
  cwd: string = process.cwd(),
  filesystem: DoctorFilesystemAdapter = nodeDoctorFilesystemAdapter,
  processAdapter: VerificationProcessAdapter = nodeVerificationProcessAdapter,
  observer?: VerificationOutputObserver,
  onReady?: () => void,
): Promise<VerifyCommandExecution> {
  const parsed = parseArguments(args);
  if (!parsed.valid)
    return Object.freeze({
      kind: "static-failure",
      mode: parsed.mode,
      result: result("error", "usage-error", 2, [
        issue("VERIFY_USAGE", "Invalid arguments"),
      ]),
    });

  const staticExecution = await runDoctor(
    parsed.target === undefined ? [] : [parsed.target],
    cwd,
    filesystem,
  );
  if (
    !hasConfirmedRequiredStructure(staticExecution.evaluation) ||
    staticExecution.root === undefined
  )
    return Object.freeze({
      kind: "static-failure",
      mode: parsed.mode,
      static: staticExecution,
      result: staticResult(staticExecution),
    });

  onReady?.();
  const execution = await executeCanonicalVerification(
    staticExecution.root,
    processAdapter,
    observer,
  );
  return Object.freeze({
    kind: "executed",
    mode: parsed.mode,
    root: staticExecution.root,
    execution,
    result: execution.result,
  });
}

export function renderVerifyStart(): string {
  return (
    "PraxisBound Canonical Verification\n\n" +
    "WARNING: praxisbound verify executes repository-owned code; this is not read-only or sandboxed.\n" +
    "Use this mode only with a repository you trust.\n" +
    "Running: make verify\n\n"
  );
}

export function renderVerifyHuman(
  execution: VerifyCommandExecution,
): VerifyRenderedOutput {
  if (execution.kind === "executed")
    return Object.freeze({
      stdout: renderVerificationCompletion(execution.execution),
      stderr: "",
    });

  if (execution.result.outcome === "usage-error")
    return Object.freeze({
      stdout:
        "\nResult: ERROR\nVerification: NOT_RUN\nCI: NOT_CHECKED\nMerge policy: NOT_CHECKED\n",
      stderr:
        "ERROR Invalid arguments\n" +
        "Usage: praxisbound verify [--json] [repository-directory]\n" +
        "       praxisbound verify --help\n",
    });

  const rendered = renderDoctorHuman(
    execution.static as DoctorCommandExecution,
  );
  return Object.freeze({
    stdout: rendered.stdout,
    stderr: rendered.stderr,
  });
}
