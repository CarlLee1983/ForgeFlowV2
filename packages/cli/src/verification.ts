import { readdir, stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  evaluateVerificationResult,
  resolveVerificationPlan,
  type ResultEnvelope,
  type ResultIssue,
  type VerificationPlan,
  type VerificationResultEvaluation,
} from "@forgeflow/core";

import {
  nodeFileAccess,
  readSafeSource,
  type FileAccess,
  type SafeSourceRead,
} from "./source.js";

export type VerificationOutputMode = "human" | "json";

export type VerificationDiscovery =
  | { readonly ok: true; readonly stories: readonly string[] }
  | { readonly ok: false };

export interface VerificationStoryReader {
  /** Lists every Story directory under the default Story root. */
  discover(): Promise<VerificationDiscovery>;
  isStoryDirectory(path: string): Promise<boolean>;
  readStoryFile(path: string): Promise<SafeSourceRead>;
}

export interface VerificationStoryFileAccess extends FileAccess {
  readdir(path: string): Promise<readonly string[]>;
  stat(path: string): Promise<{ isDirectory(): boolean }>;
}

export const nodeStoryFileAccess: VerificationStoryFileAccess = {
  ...nodeFileAccess,
  readdir,
  stat,
};

/** One checked Story: a resolved plan, a recorded result, or an error. */
export type VerificationStoryEntry =
  | {
      readonly kind: "plan";
      readonly label: string;
      readonly plan: VerificationPlan;
      readonly issues: readonly ResultIssue[];
    }
  | {
      readonly kind: "record";
      readonly label: string;
      readonly evaluation: VerificationResultEvaluation;
    }
  | {
      readonly kind: "error";
      readonly label?: string;
      readonly issue: ResultIssue;
      readonly diagnostic: string;
    };

/** The stable result name the command reports, as the retained checker names it. */
export type VerificationOutcomeName =
  | "VERIFICATION_PLAN_OK"
  | "VERIFICATION_PLAN_INCOMPLETE"
  | "VERIFICATION_PASS"
  | "VERIFICATION_PARTIAL"
  | "VERIFICATION_FAIL"
  | "VERIFICATION_RESULT_INCOMPLETE"
  | "ERROR";

export interface VerificationCommandExecution {
  readonly mode: VerificationOutputMode;
  /** Whether recorded results were evaluated as well as plans. */
  readonly record: boolean;
  readonly entries: readonly VerificationStoryEntry[];
  readonly checked: number;
  readonly outcome: VerificationOutcomeName;
  readonly result: ResultEnvelope;
}

export interface VerificationRenderedOutput {
  readonly stdout: string;
  readonly stderr: string;
}

export const DEFAULT_STORY_ROOT = "specs/stories";
const TEMPLATE_DIRECTORY = "_template";
const REQUIRED_STORY_FILES = ["story.md", "acceptance.md"] as const;
const RECORD_FILE = "verification.md";
const RESIDUAL_RISK_REQUIRED = "VERIFICATION_RESIDUAL_RISK_REQUIRED";
const BANNER = "ForgeFlow Verification Check\n";

export const verificationHelp = `ForgeFlow Verification Check

Usage:
  forgeflow verification check [--result] [--json] [story-directory ...]
  forgeflow verification check --help

Without a story directory, every directory under specs/stories/ except
_template/ is checked relative to the current directory.

The command resolves the task mode, authority, risk level, architecture
impact, and the required verification profile a Story declares, applying
the documented defaults for an older Story.

--result also reads verification.md and reports PASS, PARTIAL, or FAIL.

The check is static and read-only. It never executes a verification
command, never re-runs a recorded check, and never replaces make verify
or human review.
`;

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

function envelope(
  status: "pass" | "fail" | "error",
  outcome: "success" | "failure" | "usage-error" | "configuration-error",
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
  } as const);
}

export function createNodeStoryReader(
  fileAccess: VerificationStoryFileAccess = nodeStoryFileAccess,
  root: string = process.cwd(),
): VerificationStoryReader {
  const locate = (path: string): string =>
    isAbsolute(path) ? path : resolve(root, path);
  const isDirectory = async (path: string): Promise<boolean> => {
    try {
      return (await fileAccess.stat(locate(path))).isDirectory();
    } catch {
      return false;
    }
  };

  return Object.freeze({
    isStoryDirectory: isDirectory,
    readStoryFile: (path: string) => readSafeSource(fileAccess, locate(path)),
    async discover(): Promise<VerificationDiscovery> {
      if (!(await isDirectory(DEFAULT_STORY_ROOT))) return { ok: false };

      let names: readonly string[];
      try {
        names = await fileAccess.readdir(locate(DEFAULT_STORY_ROOT));
      } catch {
        return { ok: false };
      }

      // The retained checker globs specs/stories/*, which never matches a dot
      // directory and orders by byte value.
      const stories: string[] = [];
      for (const name of [...names].sort()) {
        if (name === TEMPLATE_DIRECTORY || name.startsWith(".")) continue;
        const path = `${DEFAULT_STORY_ROOT}/${name}`;
        if (await isDirectory(path)) stories.push(path);
      }

      return { ok: true, stories };
    },
  });
}

function parseArguments(args: readonly string[]): {
  readonly mode: VerificationOutputMode;
  readonly record: boolean;
  readonly stories: readonly string[];
  readonly valid: boolean;
} {
  let mode: VerificationOutputMode = "human";
  let record = false;
  let index = 0;

  for (; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--json" && mode === "human") mode = "json";
    else if (argument === "--result" && !record) record = true;
    else break;
  }

  const stories = args.slice(index);

  return {
    mode,
    record,
    stories,
    valid: stories.every((argument) => !argument.startsWith("-")),
  };
}

function acquisitionError(
  label: string,
  read: { readonly reason: "symlink" | "unavailable" },
  path: string,
  subject: string,
): VerificationStoryEntry {
  return read.reason === "symlink"
    ? {
        kind: "error",
        label,
        issue: issue(
          "VERIFICATION_STORY_FILE_SYMLINK",
          `a ${subject} is a symlink`,
        ),
        diagnostic: `ERROR ${label}: ${subject} is a symlink: ${path}\n`,
      }
    : {
        kind: "error",
        label,
        issue: issue(
          "VERIFICATION_STORY_FILE_UNAVAILABLE",
          `a ${subject} is missing or unreadable`,
        ),
        diagnostic: `ERROR ${label}: ${subject} is missing or unreadable: ${path}\n`,
      };
}

async function checkStory(
  reader: VerificationStoryReader,
  label: string,
  record: boolean,
): Promise<VerificationStoryEntry> {
  const sources: string[] = [];

  for (const name of REQUIRED_STORY_FILES) {
    const path = `${label}/${name}`;
    const read = await reader.readStoryFile(path);

    if (!read.ok)
      return acquisitionError(label, read, path, "required Story file");

    sources.push(read.source);
  }

  const [story, acceptance] = sources;

  if (!record) {
    const evaluation = resolveVerificationPlan(story);
    return {
      kind: "plan",
      label,
      plan: evaluation.plan,
      issues: evaluation.result.issues,
    };
  }

  // A symlinked record is unsafe to read at all; any other unusable record is
  // a defect of the record itself, not of the run.
  const read = await reader.readStoryFile(`${label}/${RECORD_FILE}`);
  if (!read.ok && read.reason === "symlink")
    return acquisitionError(
      label,
      read,
      `${label}/${RECORD_FILE}`,
      "verification record",
    );

  return {
    kind: "record",
    label,
    evaluation: evaluateVerificationResult({
      story,
      acceptance,
      record: read.ok ? read.source : undefined,
    }),
  };
}

function outcomeOf(
  record: boolean,
  entries: readonly VerificationStoryEntry[],
): VerificationOutcomeName {
  if (entries.some((entry) => entry.kind === "error")) return "ERROR";

  const planIncomplete = entries.some((entry) =>
    entry.kind === "plan"
      ? entry.issues.length > 0
      : entry.kind === "record" && entry.evaluation.planIssues.length > 0,
  );

  if (!record)
    return planIncomplete
      ? "VERIFICATION_PLAN_INCOMPLETE"
      : "VERIFICATION_PLAN_OK";

  const records = entries.filter((entry) => entry.kind === "record");

  if (planIncomplete || records.some((entry) => entry.evaluation.incomplete))
    return "VERIFICATION_RESULT_INCOMPLETE";
  if (records.some((entry) => entry.evaluation.status === "fail"))
    return "VERIFICATION_FAIL";
  if (records.some((entry) => entry.evaluation.status === "partial"))
    return "VERIFICATION_PARTIAL";

  return "VERIFICATION_PASS";
}

function aggregate(
  mode: VerificationOutputMode,
  record: boolean,
  entries: readonly VerificationStoryEntry[],
  checked: number,
): VerificationCommandExecution {
  // Every diagnostic the run produced is reported in subject order, so the
  // machine result is never poorer than the human one. Precedence decides the
  // status only: error dominates fail, because an unsafe or unreadable subject
  // means the run could not evaluate everything it was asked to evaluate.
  const issues = entries.flatMap((entry) => {
    if (entry.kind === "error") return [entry.issue];
    if (entry.kind === "plan") return [...entry.issues];
    return [...entry.evaluation.result.issues];
  });
  const outcome = outcomeOf(record, entries);
  const negative =
    outcome === "VERIFICATION_FAIL" || outcome === "VERIFICATION_PARTIAL";

  if (outcome === "ERROR")
    return Object.freeze({
      mode,
      record,
      entries,
      checked,
      outcome,
      result: envelope("error", "configuration-error", 2, issues),
    });
  if (issues.length > 0 || negative)
    return Object.freeze({
      mode,
      record,
      entries,
      checked,
      outcome,
      result: envelope("fail", "failure", 1, issues),
    });

  return Object.freeze({
    mode,
    record,
    entries,
    checked,
    outcome,
    result: envelope("pass", "success", 0, []),
  });
}

export async function runVerificationCheck(
  args: readonly string[],
  reader: VerificationStoryReader = createNodeStoryReader(),
): Promise<VerificationCommandExecution> {
  const parsed = parseArguments(args);

  if (!parsed.valid)
    return Object.freeze({
      mode: parsed.mode,
      record: parsed.record,
      entries: Object.freeze([]),
      checked: 0,
      outcome: "ERROR",
      result: envelope("error", "usage-error", 2, [
        issue("INVALID_ARGUMENTS", "Invalid arguments"),
      ]),
    });

  const entries: VerificationStoryEntry[] = [];
  let checked = 0;

  if (parsed.stories.length === 0) {
    const discovery = await reader.discover();
    if (!discovery.ok)
      return aggregate(
        parsed.mode,
        parsed.record,
        [
          {
            kind: "error",
            issue: issue(
              "VERIFICATION_STORIES_ROOT_MISSING",
              "the Story directory is missing",
            ),
            diagnostic: `ERROR Story directory is missing: ${DEFAULT_STORY_ROOT}/\n`,
          },
        ],
        0,
      );

    for (const label of discovery.stories) {
      checked += 1;
      entries.push(await checkStory(reader, label, parsed.record));
    }
  } else {
    for (const label of parsed.stories) {
      if (!(await reader.isStoryDirectory(label))) {
        entries.push({
          kind: "error",
          label,
          issue: issue(
            "VERIFICATION_STORY_MISSING",
            "the requested Story directory is missing",
          ),
          diagnostic: `ERROR Story directory is missing: ${label}\n`,
        });
        continue;
      }
      checked += 1;
      entries.push(await checkStory(reader, label, parsed.record));
    }
  }

  if (checked === 0 && !entries.some((entry) => entry.kind === "error"))
    entries.push({
      kind: "error",
      issue: issue(
        "VERIFICATION_NO_STORY_CHECKED",
        "no Story directory was checked",
      ),
      diagnostic: "ERROR No Story directory was checked\n",
    });

  return aggregate(parsed.mode, parsed.record, entries, checked);
}

function renderPlan(label: string, plan: VerificationPlan): string {
  const { authority } = plan;
  const granted = (value: boolean): string => (value ? "yes" : "no");

  return (
    `\n${label}:\n` +
    `  Task mode: ${plan.taskMode}\n` +
    `  Authority: plan=${granted(authority.plan)}` +
    ` modify=${granted(authority.modify)}` +
    ` add_dependency=${granted(authority.add_dependency)}` +
    ` migration=${granted(authority.migration)}` +
    ` commit=${granted(authority.commit)}` +
    ` push=${granted(authority.push)}` +
    ` deploy=${granted(authority.deploy)}\n` +
    `  Risk level: ${plan.riskLevel}\n` +
    `  Architecture impact: ${plan.architectureImpact}\n` +
    `  Required checks: ${plan.requiredChecks.join(" ")}\n`
  );
}

function renderDiagnostic(
  label: string,
  diagnostic: VerificationResultEvaluation["diagnostics"][number],
): string {
  if (diagnostic.kind === "unproven")
    return `WARN  ${label}: ${diagnostic.issue.message}\n`;
  if (diagnostic.kind === "conflict")
    return `FAIL  ${label}: ${diagnostic.issue.message}\n`;

  return `FAIL  ${label}: result: ${diagnostic.issue.message}\n`;
}

function renderRecord(
  label: string,
  evaluation: VerificationResultEvaluation,
): string {
  const { record } = evaluation;
  // The residual-risk defect is decided from the completeness the record block
  // reports, so the retained checker states it after that block.
  const last = evaluation.diagnostics.at(-1);
  const trailing =
    record !== undefined && last?.issue.code === RESIDUAL_RISK_REQUIRED
      ? last
      : undefined;
  const diagnostics =
    trailing === undefined
      ? evaluation.diagnostics
      : evaluation.diagnostics.slice(0, -1);
  let output = diagnostics
    .map((diagnostic) => renderDiagnostic(label, diagnostic))
    .join("");

  if (record === undefined || evaluation.status === undefined) return output;

  const checks = record.checks
    .map((check) => `${check.layer}=${check.status}`)
    .join(" ");
  output += `  Checks: ${checks === "" ? "none" : checks}\n`;
  output += `  Evidence traced: ${record.evidenceTraced} of ${record.acceptanceCount}\n`;
  if (trailing !== undefined) output += renderDiagnostic(label, trailing);
  output += `  Status: ${evaluation.status.toUpperCase()}\n`;

  return output;
}

const nextByOutcome: Readonly<
  Partial<Record<VerificationOutcomeName, string>>
> = Object.freeze({
  VERIFICATION_PLAN_OK:
    "A resolved plan only. Run make verify, record the result, and take\n" +
    "the work to human review.\n",
  VERIFICATION_PLAN_INCOMPLETE:
    "Correct the reported task mode, authority, architecture, or risk\n" +
    "declaration in the Story, then run this check again.\n",
  VERIFICATION_PARTIAL:
    "A required check or acceptance criterion is unproven. The Story is\n" +
    "not complete; resolve the recorded residual risk or record the\n" +
    "missing evidence.\n",
  VERIFICATION_PASS:
    "Declared evidence only. Human Review still decides product, design,\n" +
    "and architecture acceptance.\n",
});

export function renderVerificationHuman(
  execution: VerificationCommandExecution,
): VerificationRenderedOutput {
  const { result } = execution;

  if (result.outcome === "usage-error")
    return {
      stdout: "\nResult: ERROR\nStories checked: 0\n",
      stderr:
        "ERROR Invalid arguments\n" +
        "Usage: forgeflow verification check [--result] [--json] [story-directory ...]\n" +
        "       forgeflow verification check --help\n",
    };

  let stdout = BANNER;
  let stderr = "";

  // Each Story reports its own failures immediately before its resolved plan.
  for (const entry of execution.entries) {
    if (entry.kind === "error") {
      stderr += entry.diagnostic;
      continue;
    }
    if (entry.kind === "plan") {
      for (const planIssue of entry.issues)
        stdout += `FAIL  ${entry.label}: plan: ${planIssue.message}\n`;
      stdout += renderPlan(entry.label, entry.plan);
      continue;
    }
    for (const planIssue of entry.evaluation.planIssues)
      stdout += `FAIL  ${entry.label}: plan: ${planIssue.message}\n`;
    stdout += renderPlan(entry.label, entry.evaluation.plan);
    stdout += renderRecord(entry.label, entry.evaluation);
  }

  stdout += "\n";

  if (execution.outcome === "ERROR")
    return {
      stdout: `${stdout}Result: ERROR\nStories checked: ${execution.checked}\n`,
      stderr,
    };

  if (execution.record)
    stdout += execution.entries.some(
      (entry) =>
        entry.kind === "record" && entry.evaluation.planIssues.length > 0,
    )
      ? "Plan: VERIFICATION_PLAN_INCOMPLETE\n"
      : "Plan: VERIFICATION_PLAN_OK\n";

  const next = nextByOutcome[execution.outcome];
  stdout += `Result: ${execution.outcome}\n`;
  stdout +=
    next === undefined
      ? `Stories checked: ${execution.checked}\n`
      : `Stories checked: ${execution.checked}\n\nNext:\n${next}`;

  return { stdout, stderr };
}
