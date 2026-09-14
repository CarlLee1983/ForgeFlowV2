import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  type ResultEnvelope,
  type ResultIssue,
} from "./result.js";

export type ReleaseIndexFlags = "clear" | "hidden";
export type ReleaseWorktree = "clean" | "dirty";
export type ReleaseTagState =
  "absent" | "same-head" | "wrong-head" | "non-commit" | "conflict";

export interface ReleaseVersionObject {
  readonly kind: "blob" | "missing" | "other";
  readonly object?: string;
  readonly content?: string;
}

export interface ReleaseWorkingVersion {
  readonly kind: "file" | "missing" | "other";
  readonly object?: string;
}

/** A normalized, local Git observation. Core never acquires these facts. */
export interface ReleaseReadinessState {
  readonly head: string;
  readonly indexFlags: ReleaseIndexFlags;
  readonly headVersion: ReleaseVersionObject;
  readonly workingVersion: ReleaseWorkingVersion;
  readonly worktree: ReleaseWorktree;
  readonly tag: ReleaseTagState;
  readonly tagRefs: string;
}

export interface ReleaseReadinessInput {
  readonly initial: ReleaseReadinessState;
  readonly final: ReleaseReadinessState;
}

export type ReleaseReadinessOutcome = "RELEASE_READY" | "RELEASE_INCOMPLETE";

export interface ReleaseReadinessEvaluation {
  readonly outcome: ReleaseReadinessOutcome;
  readonly exit: 0 | 1;
  readonly result: ResultEnvelope;
}

const versionPattern = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\n$/;

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

function version(state: ReleaseReadinessState): string | undefined {
  const content = state.headVersion.content;
  if (state.headVersion.kind !== "blob" || content === undefined)
    return undefined;
  const match = versionPattern.exec(content);
  return match === null ? undefined : content.slice(0, -1);
}

function commit(state: ReleaseReadinessState): string | undefined {
  return /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(state.head)
    ? state.head
    : undefined;
}

function incomplete(
  firstIssue: ResultIssue,
  state: ReleaseReadinessState,
): ReleaseReadinessEvaluation {
  const releaseVersion = version(state);
  const releaseCommit = commit(state);
  return Object.freeze({
    outcome: "RELEASE_INCOMPLETE",
    exit: 1,
    result: Object.freeze({
      schemaVersion: RESULT_SCHEMA_VERSION,
      protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
      status: "fail",
      outcome: "RELEASE_INCOMPLETE",
      exit: 1,
      subject: "release",
      issues: Object.freeze([firstIssue]),
      data: Object.freeze({
        remoteChecks: "not-performed",
        ...(releaseVersion === undefined ? {} : { version: releaseVersion }),
        ...(releaseCommit === undefined ? {} : { commit: releaseCommit }),
      }),
    }),
  });
}

function differs(
  initial: ReleaseReadinessState,
  final: ReleaseReadinessState,
): ResultIssue | undefined {
  if (final.head !== initial.head)
    return issue("RELEASE_HEAD_CHANGED", "HEAD changed during release check");
  if (final.tagRefs !== initial.tagRefs)
    return issue(
      "RELEASE_TAGS_CHANGED",
      "local tags changed during release check",
    );
  if (final.indexFlags !== initial.indexFlags)
    return issue(
      "RELEASE_INDEX_CHANGED",
      "index flags changed during release check",
    );
  if (final.workingVersion.object !== initial.workingVersion.object)
    return issue(
      "RELEASE_VERSION_CHANGED",
      "working VERSION changed during release check",
    );
  if (final.worktree !== initial.worktree)
    return issue(
      "RELEASE_WORKTREE_CHANGED",
      "worktree changed during release check",
    );
  return undefined;
}

/**
 * Evaluates local release readiness from two normalized observations. This is
 * intentionally pure: the CLI Git adapter owns all process and environment
 * acquisition, while this module owns policy and result projection.
 */
export function evaluateReleaseReadiness(
  input: ReleaseReadinessInput,
): ReleaseReadinessEvaluation {
  const { initial, final } = input;
  if (initial.indexFlags !== "clear")
    return incomplete(
      issue(
        "RELEASE_INDEX_FLAGS",
        "index contains assume-unchanged or skip-worktree entries",
      ),
      initial,
    );
  if (initial.headVersion.kind === "missing")
    return incomplete(
      issue("RELEASE_VERSION_MISSING", "VERSION is not committed at HEAD"),
      initial,
    );
  if (initial.headVersion.kind !== "blob")
    return incomplete(
      issue("RELEASE_VERSION_NOT_FILE", "committed VERSION is not a file"),
      initial,
    );
  if (
    initial.workingVersion.kind !== "file" ||
    initial.workingVersion.object !== initial.headVersion.object
  )
    return incomplete(
      issue(
        "RELEASE_VERSION_MISMATCH",
        "working VERSION does not match committed HEAD",
      ),
      initial,
    );

  const releaseVersion = version(initial);
  const releaseCommit = commit(initial);
  if (releaseVersion === undefined)
    return incomplete(
      issue(
        "RELEASE_VERSION_INVALID",
        "VERSION must contain one MAJOR.MINOR.PATCH value",
      ),
      initial,
    );
  if (initial.worktree !== "clean")
    return incomplete(
      issue("RELEASE_WORKTREE_DIRTY", "worktree is not clean"),
      initial,
    );
  if (initial.tag === "wrong-head")
    return incomplete(
      issue(
        "RELEASE_EXPECTED_TAG_WRONG_HEAD",
        "expected tag does not resolve to HEAD",
      ),
      initial,
    );
  if (initial.tag === "non-commit")
    return incomplete(
      issue(
        "RELEASE_EXPECTED_TAG_NOT_COMMIT",
        "expected tag does not resolve to a commit",
      ),
      initial,
    );
  if (initial.tag === "conflict")
    return incomplete(
      issue("RELEASE_CONFLICTING_TAG", "different release tag points to HEAD"),
      initial,
    );

  const changed = differs(initial, final);
  if (changed !== undefined) return incomplete(changed, initial);

  return Object.freeze({
    outcome: "RELEASE_READY",
    exit: 0,
    result: Object.freeze({
      schemaVersion: RESULT_SCHEMA_VERSION,
      protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
      status: "pass",
      outcome: "RELEASE_READY",
      exit: 0,
      subject: "release",
      issues: Object.freeze([]),
      data: Object.freeze({
        remoteChecks: "not-performed",
        version: releaseVersion,
        ...(releaseCommit === undefined ? {} : { commit: releaseCommit }),
        expectedTag: `v${releaseVersion}`,
        localTag: initial.tag,
      }),
    }),
  });
}
