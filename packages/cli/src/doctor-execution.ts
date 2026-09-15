import {
  executeCanonicalVerification,
  nodeVerificationProcessAdapter,
  renderVerificationCompletion,
  type CanonicalVerificationExecution,
  type VerificationOutputObserver,
  type VerificationProcessAdapter,
} from "./canonical-verification.js";
import {
  doctorUsageError,
  hasConfirmedRequiredStructure,
  nodeDoctorFilesystemAdapter,
  renderDoctorHuman,
  runDoctor,
  type DoctorCommandExecution,
  type DoctorFilesystemAdapter,
  type DoctorOutputMode,
} from "./doctor.js";

export type DoctorVerificationExecution =
  | {
      readonly kind: "static";
      readonly mode: DoctorOutputMode;
      readonly static: DoctorCommandExecution;
    }
  | {
      readonly kind: "executed";
      readonly mode: DoctorOutputMode;
      readonly static: DoctorCommandExecution;
      readonly execution: CanonicalVerificationExecution;
    };

function parseArguments(args: readonly string[]): {
  readonly mode: DoctorOutputMode;
  readonly target?: string;
  readonly valid: boolean;
} {
  if (args[0] !== "--run-verify")
    return Object.freeze({ mode: "human", valid: false });

  const mode = args[1] === "--json" ? "json" : "human";
  const tail = args.slice(mode === "json" ? 2 : 1);
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

/**
 * The explicit Doctor execution path composes static acquisition with the
 * canonical verifier without giving the static Doctor module process access.
 */
export async function runDoctorVerification(
  args: readonly string[],
  cwd: string = process.cwd(),
  filesystem: DoctorFilesystemAdapter = nodeDoctorFilesystemAdapter,
  processAdapter: VerificationProcessAdapter = nodeVerificationProcessAdapter,
  observer?: VerificationOutputObserver,
  onReady?: (staticExecution: DoctorCommandExecution) => void,
): Promise<DoctorVerificationExecution> {
  const parsed = parseArguments(args);
  if (!parsed.valid)
    return Object.freeze({
      kind: "static",
      mode: parsed.mode,
      static: doctorUsageError(parsed.mode),
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
      kind: "static",
      mode: parsed.mode,
      static: staticExecution,
    });

  onReady?.(staticExecution);
  const execution = await executeCanonicalVerification(
    staticExecution.root,
    processAdapter,
    observer,
  );
  return Object.freeze({
    kind: "executed",
    mode: parsed.mode,
    static: staticExecution,
    execution,
  });
}

export function renderDoctorVerificationStart(
  staticExecution: DoctorCommandExecution,
): string {
  const facts = new Map(
    staticExecution.evaluation.facts.map(({ name, value }) => [name, value]),
  );
  const preparation =
    "PraxisBound Doctor\n\n" +
    (facts.get("agents") === "OK" ? "PASS  Agent guide: AGENTS.md\n" : "") +
    (facts.get("stories") === "OK"
      ? "PASS  Story directory: specs/stories/\n"
      : "") +
    (facts.get("makefile") === "OK" ? "PASS  Makefile: readable\n" : "") +
    "\n";
  return (
    preparation +
    "WARNING: --run-verify executes repository-owned code; this is not read-only or sandboxed.\n" +
    "Use this mode only with a repository you trust.\n" +
    "Running: make verify\n\n"
  );
}

export function renderDoctorVerificationHuman(
  execution: DoctorVerificationExecution,
): { readonly stdout: string; readonly stderr: string } {
  if (execution.kind === "static") return renderDoctorHuman(execution.static);
  return Object.freeze({
    stdout: renderVerificationCompletion(execution.execution),
    stderr: "",
  });
}
