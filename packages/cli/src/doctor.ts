import { constants } from "node:fs";
import { access, lstat, open, readdir, realpath } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  evaluateHandoff,
  evaluateRepositoryDoctor,
  evaluateStoryContract,
  readStoryDecisions,
  type RepositoryComposedObservation,
  type RepositoryDoctorEvaluation,
  type RepositoryDoctorSnapshot,
  type RepositoryPathObservation,
  type ResultIssue,
  type StoryDecisionRecord,
} from "@forgeflow/core";

import { createNodeStoryReader } from "./story.js";

export type DoctorOutputMode = "human" | "json";

export interface DoctorCommandExecution {
  readonly mode: DoctorOutputMode;
  /** Resolved physical target root when static acquisition succeeded. */
  readonly root?: string;
  readonly evaluation: RepositoryDoctorEvaluation;
}

/** The CLI seam for real and deterministic fake static filesystem acquisition. */
export interface DoctorFilesystemAdapter {
  inspect(root: string): Promise<RepositoryDoctorEvaluation>;
}

export interface DoctorRenderedOutput {
  readonly stdout: string;
  readonly stderr: string;
}

export const doctorHelp = `ForgeFlow Repository Doctor

Usage:
  forgeflow doctor [--json] [repository-directory]
  forgeflow doctor --run-verify [--json] [repository-directory]
  forgeflow doctor --help

Doctor performs static, read-only Repository Contract inspection. It never
executes repository-owned code, runs verification, or repairs a repository
unless --run-verify is explicitly selected. Static success does not mean make
verify or human review passed. Execution mode is not read-only or sandboxed.
`;

const missing: RepositoryPathObservation = Object.freeze({ kind: "missing" });
const unconfirmable: RepositoryPathObservation = Object.freeze({
  kind: "unconfirmable",
});

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

function configurationError(
  mode: DoctorOutputMode,
  code: string,
  message: string,
): DoctorCommandExecution {
  const result = Object.freeze({
    schemaVersion: RESULT_SCHEMA_VERSION,
    protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
    status: "error" as const,
    outcome: "configuration-error" as const,
    exit: 2 as const,
    subject: "repository",
    issues: Object.freeze([issue(code, message)]),
  });
  return Object.freeze({
    mode,
    evaluation: Object.freeze({
      outcome: "ERROR" as const,
      exit: 2 as const,
      facts: Object.freeze([]),
      result,
    }),
  });
}

function usageError(mode: DoctorOutputMode): DoctorCommandExecution {
  const result = Object.freeze({
    schemaVersion: RESULT_SCHEMA_VERSION,
    protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
    status: "error" as const,
    outcome: "usage-error" as const,
    exit: 2 as const,
    subject: "repository",
    issues: Object.freeze([issue("DOCTOR_USAGE", "Invalid arguments")]),
  });
  return Object.freeze({
    mode,
    evaluation: Object.freeze({
      outcome: "ERROR" as const,
      exit: 2 as const,
      facts: Object.freeze([]),
      result,
    }),
  });
}

export function doctorUsageError(
  mode: DoctorOutputMode,
): DoctorCommandExecution {
  return usageError(mode);
}

async function canAccess(path: string, mode: number): Promise<boolean> {
  try {
    await access(path, mode);
    return true;
  } catch {
    return false;
  }
}

/** A no-follow observation; no target path is ever written or executed. */
async function observe(
  path: string,
  readText = false,
): Promise<RepositoryPathObservation> {
  let stats;
  try {
    stats = await lstat(path);
  } catch (error: unknown) {
    return (error as { code?: string }).code === "ENOENT"
      ? missing
      : unconfirmable;
  }
  if (stats.isSymbolicLink()) return Object.freeze({ kind: "symlink" });
  if (stats.isDirectory())
    return Object.freeze({
      kind: "directory",
      readable: await canAccess(path, constants.R_OK),
      searchable: await canAccess(path, constants.X_OK),
    });
  if (!stats.isFile()) return Object.freeze({ kind: "other" });

  const readable = await canAccess(path, constants.R_OK);
  if (!readText || !readable) return Object.freeze({ kind: "file", readable });

  let handle;
  try {
    handle = await open(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    const opened = await handle.stat();
    if (!opened.isFile()) return unconfirmable;
    return Object.freeze({
      kind: "file",
      readable: true,
      text: await handle.readFile({ encoding: "utf8" }),
    });
  } catch {
    return unconfirmable;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

/**
 * Retain an inode identity while inspecting a directory subtree. Node exposes
 * no `openat`-style relative traversal, so we verify the ancestor immediately
 * before and after its descendants are read and fail closed if it changed.
 */
interface StableDirectory {
  readonly path: string;
  readonly dev: number;
  readonly ino: number;
}

async function stableDirectory(path: string): Promise<StableDirectory | null> {
  try {
    const stats = await lstat(path);
    return stats.isDirectory() && !stats.isSymbolicLink()
      ? Object.freeze({ path, dev: stats.dev, ino: stats.ino })
      : null;
  } catch {
    return null;
  }
}

async function remainsStable(directory: StableDirectory): Promise<boolean> {
  try {
    const stats = await lstat(directory.path);
    return (
      stats.isDirectory() &&
      !stats.isSymbolicLink() &&
      stats.dev === directory.dev &&
      stats.ino === directory.ino
    );
  } catch {
    return false;
  }
}

function fact(
  evaluation: RepositoryDoctorEvaluation,
  name: string,
  fallback: string,
): string {
  return (
    evaluation.facts.find((entry) => entry.name === name)?.value ?? fallback
  );
}

function structural(evaluation: RepositoryDoctorEvaluation): boolean {
  return (
    evaluation.outcome === "ERROR" ||
    evaluation.outcome === "STRUCTURE_INCOMPLETE"
  );
}

export function hasStructuralFailure(
  evaluation: RepositoryDoctorEvaluation,
): boolean {
  return structural(evaluation);
}

/** Required paths alone authorize canonical verification execution. */
export function hasConfirmedRequiredStructure(
  evaluation: RepositoryDoctorEvaluation,
): boolean {
  return ["agents", "stories", "makefile"].every(
    (name) => fact(evaluation, name, "INCOMPLETE") === "OK",
  );
}

function byteOrder(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left), Buffer.from(right));
}

async function storyObservation(
  root: string,
): Promise<RepositoryComposedObservation> {
  const storiesRoot = resolve(root, "specs/stories");
  const stableStories = await stableDirectory(storiesRoot);
  if (stableStories === null) return "error";
  let names: readonly string[];
  try {
    names = await readdir(storiesRoot);
  } catch {
    return "error";
  }

  // Doctor's static contract never follows an environment-configured decision
  // root. Decisions are repository-relative and their ancestor is checked
  // only if a Story actually references one.
  const reader = createNodeStoryReader(undefined, root, {});
  let count = 0;
  let incomplete = false;
  for (const name of [...names].sort(byteOrder)) {
    if (name === "_template" || name.startsWith(".")) continue;
    const label = `specs/stories/${name}`;
    let entry;
    try {
      entry = await lstat(resolve(root, label));
    } catch {
      return "error";
    }
    if (entry.isSymbolicLink()) return "error";
    if (!entry.isDirectory()) continue;
    const stableStory = await stableDirectory(resolve(root, label));
    if (stableStory === null) return "error";
    count += 1;

    const [story, acceptance] = await Promise.all([
      observe(resolve(root, label, "story.md"), true),
      observe(resolve(root, label, "acceptance.md"), true),
    ]);
    if (
      story.kind !== "file" ||
      story.readable !== true ||
      typeof story.text !== "string" ||
      story.text.length === 0 ||
      acceptance.kind !== "file" ||
      acceptance.readable !== true ||
      typeof acceptance.text !== "string" ||
      acceptance.text.length === 0
    )
      return "error";

    const decisions = new Map<string, StoryDecisionRecord>();
    const decisionIds = readStoryDecisions(story.text);
    if (decisionIds.length > 0) {
      const decisionRoot = await stableDirectory(
        resolve(root, "specs/decisions"),
      );
      if (decisionRoot === null) return "error";
      for (const id of decisionIds)
        decisions.set(id, await reader.readDecision(label, id));
      if (!(await remainsStable(decisionRoot))) return "error";
    }
    if (!(await remainsStable(stableStory))) return "error";
    const evaluation = evaluateStoryContract({
      directory: label,
      story: story.text,
      acceptance: acceptance.text,
      decision: (id) => decisions.get(id) ?? { kind: "missing" },
    });
    if (evaluation.result.status !== "pass") incomplete = true;
  }
  if (!(await remainsStable(stableStories))) return "error";
  if (count === 0) return "no-stories";
  return incomplete ? "incomplete" : "ok";
}

async function handoffObservation(
  root: string,
): Promise<RepositoryComposedObservation> {
  const stableSpecs = await stableDirectory(resolve(root, "specs"));
  if (stableSpecs === null) return "error";
  const observed = await observe(resolve(root, "specs/handoff.md"), true);
  if (!(await remainsStable(stableSpecs))) return "error";
  if (observed.kind === "missing") return "not-present";
  if (
    observed.kind !== "file" ||
    observed.readable !== true ||
    typeof observed.text !== "string" ||
    observed.text.length === 0
  )
    return "error";
  return evaluateHandoff(observed.text).result.status === "pass"
    ? "ok"
    : "incomplete";
}

function parseArguments(args: readonly string[]): {
  readonly mode: DoctorOutputMode;
  readonly target?: string;
  readonly valid: boolean;
} {
  let mode: DoctorOutputMode = "human";
  let index = 0;
  if (args[0] === "--json") {
    mode = "json";
    index = 1;
  }
  const tail = args.slice(index);
  return Object.freeze({
    mode,
    ...(tail.length === 1 ? { target: tail[0] } : {}),
    valid:
      tail.length <= 1 &&
      tail.every((value) => value.length > 0 && !value.startsWith("-")),
  });
}

async function inspectNodeRepository(
  root: string,
): Promise<RepositoryDoctorEvaluation> {
  // Observe ancestor directories before any descendant. O_NOFOLLOW only
  // protects the leaf supplied to open(), so descendants of an unsafe specs/
  // or guidance/ path must not be touched at all.
  const [agents, specs, makefile, guidance, skills, agentSkills, github] =
    await Promise.all([
      observe(resolve(root, "AGENTS.md"), true),
      observe(resolve(root, "specs")),
      observe(resolve(root, "Makefile"), true),
      observe(resolve(root, "guidance")),
      observe(resolve(root, "skills")),
      observe(resolve(root, ".agents/skills")),
      observe(resolve(root, ".github")),
    ]);
  const specsSafe = specs.kind === "directory" && specs.searchable === true;
  const stableSpecs = specsSafe
    ? await stableDirectory(resolve(root, "specs"))
    : null;
  const [stories, adoptionMarker] = specsSafe
    ? await Promise.all([
        observe(resolve(root, "specs/stories")),
        observe(resolve(root, "specs/.forgeflow-adoption"), true),
      ])
    : [missing, missing];
  const guidanceEntry =
    guidance.kind === "directory" && guidance.searchable === true
      ? await observe(resolve(root, "guidance/ENTRY.md"), true)
      : missing;
  const base: Omit<
    RepositoryDoctorSnapshot,
    "storyContract" | "handoffContract"
  > = {
    checkoutVersion: IMPLEMENTED_PROTOCOL_VERSION,
    agents,
    specs,
    stories,
    makefile,
    adoptionMarker,
    guidance,
    guidanceEntry,
    skills,
    agentSkills,
    github,
  };
  const preliminary = evaluateRepositoryDoctor({
    ...base,
    // Only required structure decides whether later Contract observations may
    // be acquired. Marker and optional-capability defects must not suppress
    // the retained Story/Handoff composition path.
    adoptionMarker: missing,
    guidance: missing,
    guidanceEntry: missing,
    storyContract: "not-checked",
    handoffContract: "not-checked",
  });
  if (structural(preliminary)) return preliminary;

  const [storyContract, handoffContract] = await Promise.all([
    storyObservation(root),
    handoffObservation(root),
  ]);
  if (stableSpecs === null || !(await remainsStable(stableSpecs)))
    return evaluateRepositoryDoctor({
      ...base,
      storyContract: "error",
      handoffContract: "error",
    });
  return evaluateRepositoryDoctor({
    ...base,
    storyContract,
    handoffContract,
  });
}

export const nodeDoctorFilesystemAdapter: DoctorFilesystemAdapter =
  Object.freeze({ inspect: inspectNodeRepository });

/** Runs static Repository Doctor inspection. It has no process adapter. */
export async function runDoctor(
  args: readonly string[],
  cwd: string = process.cwd(),
  filesystem: DoctorFilesystemAdapter = nodeDoctorFilesystemAdapter,
): Promise<DoctorCommandExecution> {
  const parsed = parseArguments(args);
  if (!parsed.valid) return usageError(parsed.mode);
  const requested =
    parsed.target === undefined
      ? cwd
      : isAbsolute(parsed.target)
        ? parsed.target
        : resolve(cwd, parsed.target);

  let root: string;
  try {
    root = await realpath(requested);
    if (!(await lstat(root)).isDirectory())
      return configurationError(
        parsed.mode,
        "REPOSITORY_ROOT_INVALID",
        "Repository is not a directory",
      );
  } catch {
    return configurationError(
      parsed.mode,
      "REPOSITORY_ROOT_INVALID",
      "Repository is not a directory",
    );
  }
  return Object.freeze({
    mode: parsed.mode,
    root,
    evaluation: await filesystem.inspect(root),
  });
}

export function renderDoctorHuman(
  execution: DoctorCommandExecution,
): DoctorRenderedOutput {
  const { evaluation } = execution;
  if (evaluation.result.outcome === "usage-error")
    return {
      stdout: "\nResult: ERROR\n",
      stderr:
        "ERROR Invalid arguments\nUsage: forgeflow doctor [--json] [repository-directory]\n       forgeflow doctor --help\n",
    };

  const diagnostics = evaluation.result.issues
    .map(
      (entry) =>
        `${evaluation.outcome === "STRUCTURE_INCOMPLETE" ? "FAIL" : "ERROR"}  ${entry.message}\n`,
    )
    .join("");
  const requiredFacts =
    (fact(evaluation, "agents", "INCOMPLETE") === "OK"
      ? "PASS  Agent guide: AGENTS.md\n"
      : "") +
    (fact(evaluation, "stories", "INCOMPLETE") === "OK"
      ? "PASS  Story directory: specs/stories/\n"
      : "") +
    (fact(evaluation, "makefile", "INCOMPLETE") === "OK"
      ? "PASS  Makefile: readable\n"
      : "");
  const makeRule = fact(evaluation, "verify-rule", "UNCONFIRMED");
  const makefileLimited = fact(evaluation, "makefile-limited", "NOT_LIMITED");
  const clue =
    makeRule === "FOUND"
      ? "INFO  Found a literal verify rule; not executed\n"
      : "WARN  Verification entrypoint: UNCONFIRMED\nINFO  Static inspection cannot prove that make verify is absent\n";
  const limited =
    makefileLimited === "LIMITED"
      ? "WARN  Makefile uses include, continuation, definition, or dynamic syntax; static inspection is limited\n"
      : "";
  // Contract acquisition errors still occur after static Makefile inspection;
  // only an unsafe or incomplete required structure suppresses these clues.
  const makefileReadable = fact(evaluation, "makefile", "INCOMPLETE") === "OK";
  const stdout =
    "ForgeFlow Doctor\n\n" +
    diagnostics +
    requiredFacts +
    (makefileReadable ? clue + limited : "") +
    "\n" +
    `Adopted version: ${fact(evaluation, "adopted-version", "UNKNOWN")}\n` +
    `Story contract: ${fact(evaluation, "story-contract", "NOT_CHECKED")}\n` +
    `Handoff: ${fact(evaluation, "handoff", "NOT_CHECKED")}\n` +
    `Guidance: ${fact(evaluation, "guidance", "NOT_CHECKED")}\n\n` +
    `Skills: ${fact(evaluation, "skills", "NOT_CHECKED")}\n` +
    `CI capability: ${fact(evaluation, "ci", "NOT_CHECKED")}\n\n` +
    `Result: ${evaluation.outcome}\n` +
    "Verification: NOT_RUN\nCI: NOT_CHECKED\nMerge policy: NOT_CHECKED\n";
  return { stdout, stderr: "" };
}
