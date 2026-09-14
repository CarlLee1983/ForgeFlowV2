/**
 * Pure static Repository Doctor evaluation.
 *
 * The CLI owns acquisition: it resolves the target root and supplies
 * no-follow observations for this exact operation.  Core owns only the
 * deterministic interpretation below; it never reads a path or executes a
 * target command.
 */

import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  type ResultEnvelope,
  type ResultExit,
  type ResultIssue,
  type ResultStatus,
} from "./result.js";

export type RepositoryPathKind =
  "missing" | "file" | "directory" | "symlink" | "other" | "unconfirmable";

/** A no-follow observation of one named repository-relative path. */
export interface RepositoryPathObservation {
  readonly kind: RepositoryPathKind;
  /** Present for entries for which reading is meaningful. */
  readonly readable?: boolean;
  /** Present for directories for which traversal is meaningful. */
  readonly searchable?: boolean;
  /** UTF-8 text acquired by the adapter only after a safe readable-file check. */
  readonly text?: string;
}

export type RepositoryComposedObservation =
  "not-checked" | "no-stories" | "not-present" | "ok" | "incomplete" | "error";

/**
 * An immutable, operation-specific static observation.  It deliberately names
 * the small Doctor surface instead of accepting a general filesystem port.
 */
export interface RepositoryDoctorSnapshot {
  readonly checkoutVersion: string;
  readonly agents: RepositoryPathObservation;
  readonly specs: RepositoryPathObservation;
  readonly stories: RepositoryPathObservation;
  readonly makefile: RepositoryPathObservation;
  readonly adoptionMarker: RepositoryPathObservation;
  readonly guidance: RepositoryPathObservation;
  readonly guidanceEntry: RepositoryPathObservation;
  readonly skills: RepositoryPathObservation;
  readonly agentSkills: RepositoryPathObservation;
  readonly github: RepositoryPathObservation;
  readonly storyContract: RepositoryComposedObservation;
  readonly handoffContract: RepositoryComposedObservation;
}

export type RepositoryDoctorOutcome =
  "STRUCTURE_OK" | "CONTRACT_DRIFT" | "STRUCTURE_INCOMPLETE" | "ERROR";

export interface RepositoryDoctorFact {
  readonly name:
    | "agents"
    | "stories"
    | "makefile"
    | "adopted-version"
    | "story-contract"
    | "handoff"
    | "guidance"
    | "skills"
    | "ci"
    | "verify-rule"
    | "makefile-limited";
  readonly value: string;
}

export interface RepositoryDoctorEvaluation {
  readonly outcome: RepositoryDoctorOutcome;
  readonly exit: ResultExit;
  readonly facts: readonly RepositoryDoctorFact[];
  readonly result: ResultEnvelope;
}

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

function pathError(
  path: string,
  observation: RepositoryPathObservation,
): ResultIssue | undefined {
  if (observation.kind === "symlink")
    return issue(
      "REPOSITORY_PATH_SYMLINK",
      `required path is a symlink: ${path}`,
    );
  if (observation.kind === "unconfirmable")
    return issue(
      "REPOSITORY_PATH_UNCONFIRMABLE",
      `required path cannot be safely confirmed: ${path}`,
    );
  return undefined;
}

function requiredFile(
  path: string,
  observation: RepositoryPathObservation,
  label: string,
  issues: ResultIssue[],
): boolean {
  const unsafe = pathError(path, observation);
  if (unsafe) {
    issues.push(unsafe);
    return false;
  }
  if (observation.kind === "missing") {
    issues.push(
      issue("REPOSITORY_REQUIRED_MISSING", `${label} is missing: ${path}`),
    );
    return false;
  }
  if (observation.kind !== "file") {
    issues.push(
      issue(
        "REPOSITORY_REQUIRED_TYPE",
        `${label} is not a regular file: ${path}`,
      ),
    );
    return false;
  }
  if (observation.readable !== true) {
    issues.push(
      issue(
        "REPOSITORY_REQUIRED_UNREADABLE",
        `${label} is not readable: ${path}`,
      ),
    );
    return false;
  }
  if (typeof observation.text !== "string") {
    issues.push(
      issue(
        "REPOSITORY_PATH_UNCONFIRMABLE",
        `${label} content was not acquired: ${path}`,
      ),
    );
    return false;
  }
  if (!/\S/.test(observation.text)) {
    issues.push(
      issue("REPOSITORY_REQUIRED_BLANK", `${label} is blank: ${path}`),
    );
    return false;
  }
  return true;
}

function requiredDirectory(
  path: string,
  observation: RepositoryPathObservation,
  label: string,
  readable: boolean,
  issues: ResultIssue[],
): boolean {
  const unsafe = pathError(path, observation);
  if (unsafe) {
    issues.push(unsafe);
    return false;
  }
  if (observation.kind === "missing") {
    issues.push(
      issue("REPOSITORY_REQUIRED_MISSING", `${label} is missing: ${path}`),
    );
    return false;
  }
  if (observation.kind !== "directory") {
    issues.push(
      issue("REPOSITORY_REQUIRED_TYPE", `${label} is not a directory: ${path}`),
    );
    return false;
  }
  if (
    observation.searchable !== true ||
    (readable && observation.readable !== true)
  ) {
    issues.push(
      issue(
        "REPOSITORY_REQUIRED_UNREADABLE",
        `${label} cannot be safely read: ${path}`,
      ),
    );
    return false;
  }
  return true;
}

function scanMakefile(text: string): {
  readonly clue: "FOUND" | "UNCONFIRMED";
  readonly limited: boolean;
} {
  let continuation = false;
  let defineDepth = 0;
  let complex = false;
  let found = false;
  for (const raw of text.split("\n")) {
    let line = raw;
    if (defineDepth > 0) {
      complex = true;
      const trimmed = line.replace(/^[ \t]+/, "");
      if (/^(?:(?:override|export)[ \t]+){0,2}define(?:[ \t]+|$)/.test(trimmed))
        defineDepth += 1;
      else if (/^endef(?:[ \t]+|$)/.test(trimmed)) defineDepth -= 1;
      continue;
    }
    const nextContinuation = /\\$/.test(line);
    if (nextContinuation) complex = true;
    if (continuation) {
      continuation = nextContinuation;
      continue;
    }
    continuation = nextContinuation;
    if (/^\t/.test(line)) continue;
    line = line.replace(/^ +/, "");
    if (line === "" || line.startsWith("#")) continue;
    if (/^(?:-?s?include)(?:[ \t]+|$)/.test(line)) complex = true;
    if (/^(?:(?:override|export)[ \t]+){0,2}define(?:[ \t]+|$)/.test(line)) {
      defineDepth = 1;
      complex = true;
      continue;
    }
    if (line.includes("$(") || line.includes("${")) complex = true;
    // Match the shell checker exactly: remove indentation after `verify`, then
    // every consecutive colon, and treat only an immediately following `=` as
    // a Make assignment.  A regex negative lookahead is subtly wrong here:
    // it can backtrack from `::=` to `:=` and misclassify the line as a rule.
    if (line.startsWith("verify")) {
      const suffix = line.slice("verify".length).replace(/^ +/, "");
      if (suffix.startsWith(":")) {
        const afterColons = suffix.replace(/^:+/, "");
        if (!afterColons.startsWith("=")) found = true;
      }
    }
  }
  // Complexity intentionally does not change the clue outcome.  This mirrors
  // Doctor: even a found literal rule is only a non-executed clue.
  void complex;
  return Object.freeze({
    clue: found ? "FOUND" : "UNCONFIRMED",
    limited: complex,
  });
}

function composed(
  observation: RepositoryComposedObservation,
  names: {
    readonly ok: string;
    readonly incomplete: string;
    readonly absent: string;
  },
  issues: ResultIssue[],
): string {
  if (observation === "error") {
    issues.push(
      issue(
        "REPOSITORY_COMPOSED_UNCONFIRMABLE",
        `${names.ok} observation cannot be safely confirmed`,
      ),
    );
    return "ERROR";
  }
  if (observation === "incomplete") return names.incomplete;
  if (observation === "not-present") return names.absent;
  if (observation === "no-stories") return "NO_STORIES";
  if (observation === "ok") return names.ok;
  return "NOT_CHECKED";
}

function optionalDirectory(observation: RepositoryPathObservation): boolean {
  return observation.kind !== "missing";
}

/** Evaluates the supplied static snapshot without I/O or mutation. */
export function evaluateRepositoryDoctor(
  snapshot: RepositoryDoctorSnapshot,
): RepositoryDoctorEvaluation {
  const issues: ResultIssue[] = [];
  const facts: RepositoryDoctorFact[] = [];
  const agentsOk = requiredFile(
    "AGENTS.md",
    snapshot.agents,
    "agent guide",
    issues,
  );
  facts.push(
    Object.freeze({ name: "agents", value: agentsOk ? "OK" : "INCOMPLETE" }),
  );
  // The retained Doctor checks this chain conditionally. In particular, an
  // absent specs/ reports the required stories location once; it does not
  // manufacture a second descendant diagnostic.
  let specsOk = false;
  let storiesOk = false;
  const specsUnsafe = pathError("specs/", snapshot.specs);
  if (specsUnsafe !== undefined) issues.push(specsUnsafe);
  else if (snapshot.specs.kind === "missing")
    issues.push(
      issue(
        "REPOSITORY_REQUIRED_MISSING",
        "story directory is missing: specs/stories/",
      ),
    );
  else if (snapshot.specs.kind !== "directory")
    issues.push(
      issue(
        "REPOSITORY_REQUIRED_TYPE",
        "story directory parent is not a directory: specs/",
      ),
    );
  else if (snapshot.specs.searchable !== true)
    issues.push(
      issue(
        "REPOSITORY_REQUIRED_UNREADABLE",
        "story directory parent is not searchable: specs/",
      ),
    );
  else {
    specsOk = true;
    storiesOk = requiredDirectory(
      "specs/stories/",
      snapshot.stories,
      "story directory",
      true,
      issues,
    );
  }
  facts.push(
    Object.freeze({
      name: "stories",
      value: specsOk && storiesOk ? "OK" : "INCOMPLETE",
    }),
  );
  const makefileOk = requiredFile(
    "Makefile",
    snapshot.makefile,
    "Makefile",
    issues,
  );
  facts.push(
    Object.freeze({
      name: "makefile",
      value: makefileOk ? "OK" : "INCOMPLETE",
    }),
  );
  // The retained Doctor scans a readable Makefile even if an earlier required
  // path is incomplete or unsafe. Keep those non-executed clues in the
  // snapshot result so the renderer can preserve that static observation.
  const makefileClues =
    snapshot.makefile.kind === "file" &&
    snapshot.makefile.readable === true &&
    typeof snapshot.makefile.text === "string"
      ? scanMakefile(snapshot.makefile.text)
      : undefined;
  const structureComplete = agentsOk && specsOk && storiesOk && makefileOk;
  if (makefileClues !== undefined && !structureComplete) {
    facts.push(
      Object.freeze({ name: "verify-rule", value: makefileClues.clue }),
    );
    facts.push(
      Object.freeze({
        name: "makefile-limited",
        value: makefileClues.limited ? "LIMITED" : "NOT_LIMITED",
      }),
    );
  }

  const unsafe = issues.some(
    (entry) =>
      entry.code.includes("UNCONFIRMABLE") ||
      entry.code.includes("UNREADABLE") ||
      entry.code.includes("SYMLINK"),
  );
  if (!structureComplete) {
    const outcome: RepositoryDoctorOutcome = unsafe
      ? "ERROR"
      : "STRUCTURE_INCOMPLETE";
    return complete(outcome, facts, issues);
  }

  let drift = false;
  let adopted = "UNKNOWN";
  if (
    snapshot.adoptionMarker.kind === "symlink" ||
    snapshot.adoptionMarker.kind === "unconfirmable" ||
    (snapshot.adoptionMarker.kind !== "missing" &&
      (snapshot.adoptionMarker.kind !== "file" ||
        snapshot.adoptionMarker.readable !== true ||
        typeof snapshot.adoptionMarker.text !== "string"))
  ) {
    issues.push(
      issue(
        "REPOSITORY_MARKER_UNCONFIRMABLE",
        "adoption marker cannot be safely read: specs/.forgeflow-adoption",
      ),
    );
  } else if (snapshot.adoptionMarker.kind === "file") {
    const markerText = snapshot.adoptionMarker.text;
    const version =
      markerText === undefined
        ? undefined
        : markerText
            .split("\n")
            .find((line) => line.startsWith("version="))
            ?.slice(8)
            .replace(/[ \t\r]+$/, "");
    if (version === undefined || version === "")
      issues.push(
        issue(
          "REPOSITORY_MARKER_VERSION",
          "adoption marker records no version: specs/.forgeflow-adoption",
        ),
      );
    else {
      adopted = version;
      drift = version !== snapshot.checkoutVersion;
    }
  }
  facts.push(Object.freeze({ name: "adopted-version", value: adopted }));

  const story = composed(
    snapshot.storyContract,
    {
      ok: "STORY_CONTRACT_OK",
      incomplete: "STORY_CONTRACT_INCOMPLETE",
      absent: "NOT_PRESENT",
    },
    issues,
  );
  const handoff = composed(
    snapshot.handoffContract,
    {
      ok: "HANDOFF_CONTRACT_OK",
      incomplete: "HANDOFF_CONTRACT_INCOMPLETE",
      absent: "NOT_PRESENT",
    },
    issues,
  );
  facts.push(Object.freeze({ name: "story-contract", value: story }));
  facts.push(Object.freeze({ name: "handoff", value: handoff }));
  drift ||=
    story === "STORY_CONTRACT_INCOMPLETE" ||
    handoff === "HANDOFF_CONTRACT_INCOMPLETE";

  let guidance = "NOT_PRESENT";
  if (snapshot.guidance.kind !== "missing") {
    if (
      snapshot.guidance.kind !== "directory" ||
      snapshot.guidance.readable !== true ||
      snapshot.guidance.searchable !== true
    ) {
      issues.push(
        issue(
          "REPOSITORY_GUIDANCE_UNCONFIRMABLE",
          "guidance capability cannot be safely read: guidance/",
        ),
      );
      guidance = "ERROR";
    } else if (
      snapshot.guidanceEntry.kind === "symlink" ||
      snapshot.guidanceEntry.kind === "unconfirmable" ||
      (snapshot.guidanceEntry.kind !== "missing" &&
        (snapshot.guidanceEntry.kind !== "file" ||
          snapshot.guidanceEntry.readable !== true ||
          typeof snapshot.guidanceEntry.text !== "string"))
    ) {
      issues.push(
        issue(
          "REPOSITORY_GUIDANCE_UNCONFIRMABLE",
          "guidance entrypoint cannot be safely read: guidance/ENTRY.md",
        ),
      );
      guidance = "ERROR";
    } else if (
      snapshot.guidanceEntry.kind !== "file" ||
      !/\S/.test(snapshot.guidanceEntry.text ?? "")
    ) {
      guidance = "GUIDANCE_CONTRACT_INCOMPLETE";
      drift = true;
    } else guidance = "GUIDANCE_CONTRACT_OK";
  }
  facts.push(Object.freeze({ name: "guidance", value: guidance }));
  facts.push(
    Object.freeze({
      name: "skills",
      value:
        optionalDirectory(snapshot.skills) ||
        optionalDirectory(snapshot.agentSkills)
          ? "DETECTED"
          : "NOT_PRESENT",
    }),
  );
  facts.push(
    Object.freeze({
      name: "ci",
      value: optionalDirectory(snapshot.github) ? "DETECTED" : "NOT_PRESENT",
    }),
  );
  if (makefileClues !== undefined) {
    facts.push(
      Object.freeze({ name: "verify-rule", value: makefileClues.clue }),
    );
    facts.push(
      Object.freeze({
        name: "makefile-limited",
        value: makefileClues.limited ? "LIMITED" : "NOT_LIMITED",
      }),
    );
  }
  if (issues.length > 0) return complete("ERROR", facts, issues);
  return complete(drift ? "CONTRACT_DRIFT" : "STRUCTURE_OK", facts, issues);
}

function complete(
  outcome: RepositoryDoctorOutcome,
  facts: readonly RepositoryDoctorFact[],
  issues: readonly ResultIssue[],
): RepositoryDoctorEvaluation {
  const exit: ResultExit =
    outcome === "ERROR" ? 2 : outcome === "STRUCTURE_INCOMPLETE" ? 1 : 0;
  const status: ResultStatus =
    outcome === "ERROR"
      ? "error"
      : outcome === "STRUCTURE_INCOMPLETE"
        ? "fail"
        : outcome === "CONTRACT_DRIFT"
          ? "warning"
          : "pass";
  const result: ResultEnvelope = Object.freeze({
    schemaVersion: RESULT_SCHEMA_VERSION,
    protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
    status,
    outcome:
      outcome === "ERROR"
        ? "configuration-error"
        : outcome === "STRUCTURE_INCOMPLETE"
          ? "failure"
          : outcome === "CONTRACT_DRIFT"
            ? "warning"
            : "success",
    exit,
    subject: "repository",
    issues: Object.freeze([...issues]),
  });
  return Object.freeze({
    outcome,
    exit,
    facts: Object.freeze([...facts]),
    result,
  });
}
