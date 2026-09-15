import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateStoryReadiness,
  validateResultEnvelope,
} from "@praxisbound/core";

const story = `# Story: TST-008 Fixture

## Goal

Evaluate Story readiness deterministically.

## Scope

* Evaluate minimum Story content.

## Classification

* Security sensitive: no
* Baseline conformance: no
`;

const acceptance = `# Acceptance Criteria

## Happy Path

* [ ] AC-001: Readiness succeeds.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| \`AC-001\` | test | \`test\` | \`fixture\` | \`pass\` |
`;

test("TST008-AC-001: a complete Story has clean readiness and structure results", () => {
  const evaluation = evaluateStoryReadiness({
    directory: "specs/stories/TST-008-fixture",
    story,
    acceptance,
  });

  assert.deepEqual(validateResultEnvelope(evaluation.result), {
    ok: true,
    value: evaluation.result,
  });
  assert.deepEqual(validateResultEnvelope(evaluation.structure), {
    ok: true,
    value: evaluation.structure,
  });
  assert.equal(evaluation.result.exit, 0);
  assert.equal(evaluation.structure.exit, 0);
  assert.deepEqual(evaluation.result.issues, []);
});
