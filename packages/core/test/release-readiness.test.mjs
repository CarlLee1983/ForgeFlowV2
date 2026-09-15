import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateReleaseReadiness,
  validateResultEnvelope,
} from "@praxisbound/core";

const releaseState = (overrides = {}) => ({
  head: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  indexFlags: "clear",
  headVersion: {
    kind: "blob",
    object: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    content: "0.2.1\n",
  },
  workingVersion: {
    kind: "file",
    object: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  worktree: "clean",
  tag: "absent",
  tagRefs: "",
  ...overrides,
});

test("TST011-AC-001: a complete local observation evaluates to RELEASE_READY", () => {
  const state = releaseState();
  const evaluation = evaluateReleaseReadiness({ initial: state, final: state });

  assert.equal(evaluation.outcome, "RELEASE_READY");
  assert.equal(evaluation.exit, 0);
  assert.deepEqual(evaluation.result.data, {
    remoteChecks: "not-performed",
    version: "0.2.1",
    commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    expectedTag: "v0.2.1",
    localTag: "absent",
  });
  assert.deepEqual(validateResultEnvelope(evaluation.result), {
    ok: true,
    value: evaluation.result,
  });
});

test("TST011-AC-003: a changed tag snapshot is RELEASE_INCOMPLETE without retry semantics", () => {
  const evaluation = evaluateReleaseReadiness({
    initial: releaseState(),
    final: releaseState({
      tagRefs: "refs/tags/v0.2.1 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }),
  });

  assert.equal(evaluation.outcome, "RELEASE_INCOMPLETE");
  assert.equal(evaluation.exit, 1);
  assert.deepEqual(
    evaluation.result.issues.map(({ code }) => code),
    ["RELEASE_TAGS_CHANGED"],
  );
});

test("TST011-AC-004: a malformed committed VERSION is a diagnosed incomplete result", () => {
  const state = releaseState({
    headVersion: {
      kind: "blob",
      object: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      content: "0.02.1\n",
    },
  });
  const evaluation = evaluateReleaseReadiness({ initial: state, final: state });

  assert.equal(evaluation.outcome, "RELEASE_INCOMPLETE");
  assert.equal(evaluation.exit, 1);
  assert.deepEqual(
    evaluation.result.issues.map(({ code }) => code),
    ["RELEASE_VERSION_INVALID"],
  );
});
