import { readdir, stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  resolveVerificationPlan,
  type ResultEnvelope,
  type ResultIssue,
  type VerificationPlan,
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

/** One checked Story: either a resolved plan or an acquisition error. */
export type VerificationStoryEntry =
  | {
      readonly kind: "plan";
      readonly label: string;
      readonly plan: VerificationPlan;
      readonly issues: readonly ResultIssue[];
    }
  | {
      readonly kind: "error";
      readonly label?: string;
      readonly issue: ResultIssue;
      readonly diagnostic: string;
    };

export interface VerificationCommandExecution {
  readonly mode: VerificationOutputMode;
  readonly entries: readonly VerificationStoryEntry[];
  readonly checked: number;
  readonly result: ResultEnvelope;
}

export interface VerificationRenderedOutput {
  readonly stdout: string;
  readonly stderr: string;
}

export const DEFAULT_STORY_ROOT = "specs/stories";
const TEMPLATE_DIRECTORY = "_template";
const REQUIRED_STORY_FILES = ["story.md", "acceptance.md"] as const;
const BANNER = "ForgeFlow Verification Check\n";

export const verificationHelp = `ForgeFlow Verification Check

Usage:
  forgeflow verification check [--json] [story-directory ...]
  forgeflow verification check --help

Without a story directory, every directory under specs/stories/ except
_template/ is checked relative to the current directory.

The command resolves the task mode, authority, risk level, architecture
impact, and the required verification profile a Story declares, applying
the documented defaults for an older Story.

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
  readonly stories: readonly string[];
  readonly valid: boolean;
} {
  const mode = args[0] === "--json" ? "json" : "human";
  const stories = mode === "json" ? args.slice(1) : args;

  return {
    mode,
    stories,
    valid: stories.every((argument) => !argument.startsWith("-")),
  };
}

async function checkStory(
  reader: VerificationStoryReader,
  label: string,
): Promise<VerificationStoryEntry> {
  let story: string | undefined;

  for (const name of REQUIRED_STORY_FILES) {
    const path = `${label}/${name}`;
    const read = await reader.readStoryFile(path);

    if (!read.ok) {
      return read.reason === "symlink"
        ? {
            kind: "error",
            label,
            issue: issue(
              "VERIFICATION_STORY_FILE_SYMLINK",
              "a required Story file is a symlink",
            ),
            diagnostic: `ERROR ${label}: required Story file is a symlink: ${path}\n`,
          }
        : {
            kind: "error",
            label,
            issue: issue(
              "VERIFICATION_STORY_FILE_UNAVAILABLE",
              "a required Story file is missing or unreadable",
            ),
            diagnostic: `ERROR ${label}: required Story file is missing or unreadable: ${path}\n`,
          };
    }

    story ??= read.source;
  }

  const evaluation = resolveVerificationPlan(story);
  return {
    kind: "plan",
    label,
    plan: evaluation.plan,
    issues: evaluation.result.issues,
  };
}

function aggregate(
  mode: VerificationOutputMode,
  entries: readonly VerificationStoryEntry[],
  checked: number,
): VerificationCommandExecution {
  // Every diagnostic the run produced is reported in subject order, so the
  // machine result is never poorer than the human one. Precedence decides the
  // status only: error dominates fail, because an unsafe or unreadable subject
  // means the run could not evaluate everything it was asked to evaluate.
  const issues = entries.flatMap((entry) =>
    entry.kind === "error" ? [entry.issue] : [...entry.issues],
  );
  const failed = entries.some((entry) => entry.kind === "error");

  if (failed)
    return Object.freeze({
      mode,
      entries,
      checked,
      result: envelope("error", "configuration-error", 2, issues),
    });
  if (issues.length > 0)
    return Object.freeze({
      mode,
      entries,
      checked,
      result: envelope("fail", "failure", 1, issues),
    });

  return Object.freeze({
    mode,
    entries,
    checked,
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
      entries: Object.freeze([]),
      checked: 0,
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
      entries.push(await checkStory(reader, label));
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
      entries.push(await checkStory(reader, label));
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

  return aggregate(parsed.mode, entries, checked);
}

function renderPlan(entry: {
  readonly label: string;
  readonly plan: VerificationPlan;
}): string {
  const { authority } = entry.plan;
  const granted = (value: boolean): string => (value ? "yes" : "no");

  return (
    `\n${entry.label}:\n` +
    `  Task mode: ${entry.plan.taskMode}\n` +
    `  Authority: plan=${granted(authority.plan)}` +
    ` modify=${granted(authority.modify)}` +
    ` add_dependency=${granted(authority.add_dependency)}` +
    ` migration=${granted(authority.migration)}` +
    ` commit=${granted(authority.commit)}` +
    ` push=${granted(authority.push)}` +
    ` deploy=${granted(authority.deploy)}\n` +
    `  Risk level: ${entry.plan.riskLevel}\n` +
    `  Architecture impact: ${entry.plan.architectureImpact}\n` +
    `  Required checks: ${entry.plan.requiredChecks.join(" ")}\n`
  );
}

export function renderVerificationHuman(
  execution: VerificationCommandExecution,
): VerificationRenderedOutput {
  const { result } = execution;

  if (result.outcome === "usage-error")
    return {
      stdout: "\nResult: ERROR\nStories checked: 0\n",
      stderr:
        "ERROR Invalid arguments\n" +
        "Usage: forgeflow verification check [--json] [story-directory ...]\n" +
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
    for (const planIssue of entry.issues)
      stdout += `FAIL  ${entry.label}: plan: ${planIssue.message}\n`;
    stdout += renderPlan(entry);
  }

  stdout += "\n";

  if (result.status === "error")
    return {
      stdout: `${stdout}Result: ERROR\nStories checked: ${execution.checked}\n`,
      stderr,
    };

  if (result.status === "fail")
    return {
      stdout:
        `${stdout}Result: VERIFICATION_PLAN_INCOMPLETE\n` +
        `Stories checked: ${execution.checked}\n\n` +
        "Next:\n" +
        "Correct the reported task mode, authority, architecture, or risk\n" +
        "declaration in the Story, then run this check again.\n",
      stderr,
    };

  return {
    stdout:
      `${stdout}Result: VERIFICATION_PLAN_OK\n` +
      `Stories checked: ${execution.checked}\n\n` +
      "Next:\n" +
      "A resolved plan only. Run make verify, record the result, and take\n" +
      "the work to human review.\n",
    stderr,
  };
}
