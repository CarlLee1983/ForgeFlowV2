import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateRepositoryDoctor,
  validateResultEnvelope,
} from "@forgeflow/core";

const file = (text = "content") => ({ kind: "file", readable: true, text });
const directory = () => ({
  kind: "directory",
  readable: true,
  searchable: true,
});
const missing = { kind: "missing" };

const complete = (overrides = {}) => ({
  checkoutVersion: "0.9.0",
  agents: file("agent guide\n"),
  specs: directory(),
  stories: directory(),
  makefile: file("verify:\n\t@:\n"),
  adoptionMarker: file("version=0.9.0\nrevision=unknown\n"),
  guidance: missing,
  guidanceEntry: missing,
  skills: missing,
  agentSkills: missing,
  github: missing,
  storyContract: "ok",
  handoffContract: "ok",
  ...overrides,
});

test("TST009-AC-001: conformant static snapshot produces ordered facts and STRUCTURE_OK", () => {
  const evaluation = evaluateRepositoryDoctor(complete());
  assert.equal(evaluation.outcome, "STRUCTURE_OK");
  assert.equal(evaluation.exit, 0);
  assert.deepEqual(evaluation.facts, [
    { name: "agents", value: "OK" },
    { name: "stories", value: "OK" },
    { name: "makefile", value: "OK" },
    { name: "adopted-version", value: "0.9.0" },
    { name: "story-contract", value: "STORY_CONTRACT_OK" },
    { name: "handoff", value: "HANDOFF_CONTRACT_OK" },
    { name: "guidance", value: "NOT_PRESENT" },
    { name: "skills", value: "NOT_PRESENT" },
    { name: "ci", value: "NOT_PRESENT" },
    { name: "verify-rule", value: "FOUND" },
    { name: "makefile-limited", value: "NOT_LIMITED" },
  ]);
  assert.deepEqual(validateResultEnvelope(evaluation.result), {
    ok: true,
    value: evaluation.result,
  });
  assert.equal(Object.isFrozen(evaluation), true);
  assert.equal(Object.isFrozen(evaluation.facts), true);
});

test("TST009-AC-002: marker, composed contracts, guidance, optional capabilities, and limited Make clues compose as advisory drift", () => {
  const evaluation = evaluateRepositoryDoctor(
    complete({
      adoptionMarker: file("version=0.8.0\n"),
      storyContract: "incomplete",
      handoffContract: "incomplete",
      guidance: directory(),
      guidanceEntry: file(" \t\n"),
      skills: directory(),
      github: directory(),
      makefile: file("include local.mk\nverify := maybe\n"),
    }),
  );
  assert.equal(evaluation.outcome, "CONTRACT_DRIFT");
  assert.equal(evaluation.exit, 0);
  assert.deepEqual(evaluation.facts.slice(3), [
    { name: "adopted-version", value: "0.8.0" },
    { name: "story-contract", value: "STORY_CONTRACT_INCOMPLETE" },
    { name: "handoff", value: "HANDOFF_CONTRACT_INCOMPLETE" },
    { name: "guidance", value: "GUIDANCE_CONTRACT_INCOMPLETE" },
    { name: "skills", value: "DETECTED" },
    { name: "ci", value: "DETECTED" },
    { name: "verify-rule", value: "UNCONFIRMED" },
    { name: "makefile-limited", value: "LIMITED" },
  ]);
});

test("TST009-AC-003: absent optional capabilities do not make confirmed structure incomplete", () => {
  const evaluation = evaluateRepositoryDoctor(
    complete({
      adoptionMarker: missing,
      storyContract: "no-stories",
      handoffContract: "not-present",
    }),
  );
  assert.equal(evaluation.outcome, "STRUCTURE_OK");
  assert.equal(evaluation.exit, 0);
});

test("TST009-AC-004: confirmed required defects are incomplete, while unsafe or unconfirmable input takes ERROR precedence", () => {
  const incomplete = evaluateRepositoryDoctor(complete({ makefile: missing }));
  assert.equal(incomplete.outcome, "STRUCTURE_INCOMPLETE");
  assert.equal(incomplete.exit, 1);
  assert.deepEqual(
    incomplete.result.issues.map(({ code }) => code),
    ["REPOSITORY_REQUIRED_MISSING"],
  );

  const unsafe = evaluateRepositoryDoctor(
    complete({
      agents: { kind: "symlink" },
      makefile: missing,
    }),
  );
  assert.equal(unsafe.outcome, "ERROR");
  assert.equal(unsafe.exit, 2);
  assert.deepEqual(
    unsafe.result.issues.map(({ code }) => code),
    ["REPOSITORY_PATH_SYMLINK", "REPOSITORY_REQUIRED_MISSING"],
  );
});

test("TST009-AC-004: unsafe composed observations produce one error result envelope", () => {
  const evaluation = evaluateRepositoryDoctor(
    complete({ handoffContract: "error" }),
  );
  assert.equal(evaluation.outcome, "ERROR");
  assert.equal(evaluation.exit, 2);
  assert.deepEqual(
    evaluation.result.issues.map(({ code }) => code),
    ["REPOSITORY_COMPOSED_UNCONFIRMABLE"],
  );
});

test("TST009-AC-002/004: chained structure and double-colon Make clues retain Doctor semantics", () => {
  const absentSpecs = evaluateRepositoryDoctor(
    complete({ specs: missing, stories: missing }),
  );
  assert.equal(absentSpecs.outcome, "STRUCTURE_INCOMPLETE");
  assert.deepEqual(
    absentSpecs.result.issues.map(({ message }) => message),
    ["story directory is missing: specs/stories/"],
  );

  const doubleColon = evaluateRepositoryDoctor(
    complete({ makefile: file("verify::\n\t@:\n") }),
  );
  assert.equal(
    doubleColon.facts.find(({ name }) => name === "verify-rule")?.value,
    "FOUND",
  );

  const spacedRule = evaluateRepositoryDoctor(
    complete({ makefile: file("verify: = not-an-assignment\n") }),
  );
  assert.equal(
    spacedRule.facts.find(({ name }) => name === "verify-rule")?.value,
    "FOUND",
  );

  const doubleColonAssignment = evaluateRepositoryDoctor(
    complete({ makefile: file("verify::= not-a-rule\n") }),
  );
  assert.equal(
    doubleColonAssignment.facts.find(({ name }) => name === "verify-rule")
      ?.value,
    "UNCONFIRMED",
  );

  const tabSeparated = evaluateRepositoryDoctor(
    complete({ makefile: file("verify\t:\n") }),
  );
  assert.equal(
    tabSeparated.facts.find(({ name }) => name === "verify-rule")?.value,
    "UNCONFIRMED",
  );
});
