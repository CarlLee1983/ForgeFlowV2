import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";

import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  type ResultEnvelope,
  type ResultIssue,
} from "@forgeflow/core";

export interface VerificationProcessRequest {
  readonly command: "make";
  readonly args: readonly ["verify"];
  readonly cwd: string;
  readonly env: Readonly<NodeJS.ProcessEnv>;
  readonly onStdout: (chunk: string) => void;
  readonly onStderr: (chunk: string) => void;
}

export type VerificationProcessObservation =
  | {
      readonly kind: "completed";
      readonly status: number | null;
      readonly signal: string | null;
    }
  | {
      readonly kind: "spawn-error";
      readonly code?: string;
    };

export interface VerificationProcessAdapter {
  run(
    request: VerificationProcessRequest,
  ): Promise<VerificationProcessObservation>;
}

export const nodeVerificationProcessAdapter: VerificationProcessAdapter =
  Object.freeze({
    run(
      request: VerificationProcessRequest,
    ): Promise<VerificationProcessObservation> {
      return new Promise<VerificationProcessObservation>((resolve) => {
        let settled = false;
        const finish = (observation: VerificationProcessObservation): void => {
          if (settled) return;
          settled = true;
          resolve(Object.freeze(observation));
        };

        let child;
        try {
          child = spawn(request.command, request.args, {
            cwd: request.cwd,
            env: request.env,
            stdio: ["ignore", "pipe", "pipe"],
          });
        } catch (error: unknown) {
          finish({ kind: "spawn-error", ...errorCode(error) });
          return;
        }

        forward(child.stdout, request.onStdout);
        forward(child.stderr, request.onStderr);
        child.once("error", (error: unknown) =>
          finish({ kind: "spawn-error", ...errorCode(error) }),
        );
        child.once("close", (status, signal) =>
          finish({ kind: "completed", status, signal }),
        );
      });
    },
  });

export interface VerificationOutputObserver {
  onStdout(chunk: string): void;
  onStderr(chunk: string): void;
}

function forward(
  stream: NodeJS.ReadableStream | null,
  destination: (chunk: string) => void,
): void {
  if (stream === null) return;
  const decoder = new StringDecoder("utf8");
  stream.on("data", (chunk: Buffer) => {
    const text = decoder.write(chunk);
    if (text.length > 0) destination(text);
  });
  stream.once("end", () => {
    const text = decoder.end();
    if (text.length > 0) destination(text);
  });
}

export type CanonicalVerificationOutcome =
  "VERIFIED_LOCAL" | "VERIFICATION_FAILED" | "ERROR";

export interface CanonicalVerificationExecution {
  readonly outcome: CanonicalVerificationOutcome;
  readonly result: ResultEnvelope;
  readonly observation: VerificationProcessObservation;
}

function errorCode(error: unknown): { readonly code?: string } {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  )
    return { code: error.code };
  return {};
}

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

function envelope(
  status: "pass" | "fail" | "error",
  outcome: "success" | "failure" | "configuration-error",
  exit: 0 | 1 | 2,
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

/**
 * Runs the only repository-owned verification command. Callers must have
 * already resolved and structurally confirmed the physical target root.
 */
export async function executeCanonicalVerification(
  root: string,
  processAdapter: VerificationProcessAdapter = nodeVerificationProcessAdapter,
  observer?: VerificationOutputObserver,
): Promise<CanonicalVerificationExecution> {
  let observation: VerificationProcessObservation;
  try {
    observation = await processAdapter.run({
      command: "make",
      args: ["verify"],
      cwd: root,
      // Clone the inherited environment before passing it to the child so the
      // adapter's command contract is explicit and cannot mutate its caller.
      env: controlledEnvironment(),
      onStdout: (chunk) => observer?.onStdout(chunk),
      onStderr: (chunk) => observer?.onStderr(chunk),
    });
  } catch (error: unknown) {
    observation = Object.freeze({ kind: "spawn-error", ...errorCode(error) });
  }

  if (observation.kind === "spawn-error")
    return Object.freeze({
      outcome: "ERROR",
      observation,
      result: envelope("error", "configuration-error", 2, [
        issue("VERIFICATION_PROCESS_UNAVAILABLE", "make could not be started"),
      ]),
    });

  if (observation.status === 0 && observation.signal === null)
    return Object.freeze({
      outcome: "VERIFIED_LOCAL",
      observation,
      result: envelope("pass", "success", 0, []),
    });

  return Object.freeze({
    outcome: "VERIFICATION_FAILED",
    observation,
    result: envelope("fail", "failure", 1, [
      issue("VERIFICATION_PROCESS_FAILED", "make verify did not pass"),
    ]),
  });
}

function controlledEnvironment(): Readonly<NodeJS.ProcessEnv> {
  const env = { ...process.env };
  delete env.MAKEFILES;
  delete env.MAKEFLAGS;
  delete env.MFLAGS;
  return Object.freeze({ ...env, CDPATH: "" });
}

function printableSignal(signal: string | null): string {
  return signal !== null && /^[A-Z0-9]+$/.test(signal) ? signal : "UNKNOWN";
}

export function renderVerificationCompletion(
  execution: CanonicalVerificationExecution,
): string {
  if (execution.outcome === "VERIFIED_LOCAL")
    return (
      "\nResult: VERIFIED_LOCAL\n" +
      "Verification: PASS\n" +
      "Verification exit: 0\n" +
      "CI: NOT_CHECKED\n" +
      "Merge policy: NOT_CHECKED\n" +
      "Human review is still required.\n"
    );

  if (execution.outcome === "VERIFICATION_FAILED") {
    const detail =
      execution.observation.kind === "completed" &&
      execution.observation.status !== null
        ? `Verification exit: ${execution.observation.status}\n`
        : `Verification signal: ${
            execution.observation.kind === "completed"
              ? printableSignal(execution.observation.signal)
              : "UNKNOWN"
          }\n`;
    return (
      "\nResult: VERIFICATION_FAILED\n" +
      "Verification: FAIL\n" +
      detail +
      "CI: NOT_CHECKED\n" +
      "Merge policy: NOT_CHECKED\n" +
      "Human review is still required.\n"
    );
  }

  return (
    "\nResult: ERROR\n" +
    "Verification: NOT_RUN\n" +
    "CI: NOT_CHECKED\n" +
    "Merge policy: NOT_CHECKED\n"
  );
}
