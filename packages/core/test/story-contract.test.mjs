import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateStoryContract,
  readStoryDecisions,
  validateResultEnvelope,
} from "@forgeflow/core";

const story = [
  "# Story: TST-007 Fixture",
  "",
  "## Classification",
  "",
  "* Security sensitive: no",
  "* Baseline conformance: no",
  "",
].join("\n");

const acceptance = ["# Acceptance Criteria", ""].join("\n");

function evaluated(input) {
  const evaluation = evaluateStoryContract({
    directory: "specs/stories/TST-007-fixture",
    story,
    acceptance,
    ...input,
  });
  assert.deepEqual(validateResultEnvelope(evaluation.result), {
    ok: true,
    value: evaluation.result,
  });
  return evaluation;
}

function messages(input) {
  return evaluated(input).result.issues.map((issue) => issue.message);
}

test("TST007-AC-003: the Story ID is the shortest leading run of segments", () => {
  const cases = [
    ["specs/stories/FF-227-story-id-grammar", "FF-227"],
    ["specs/stories/FF-232-API-limits", "FF-232"],
    ["specs/stories/DBCLI-PLAT-001", "DBCLI-PLAT-001"],
    ["specs/stories/TST-007-story-contract-evaluation", "TST-007"],
    ["specs/stories/TST-007-story-contract-evaluation/", "TST-007"],
    ["specs/stories/FF-1-2", "FF-1"],
    ["specs/stories/FF-201", "FF-201"],
  ];

  for (const [directory, expected] of cases) {
    assert.equal(evaluated({ directory }).facts.storyId, expected, directory);
  }
});

test("TST007-AC-003: a directory that names no Story ID is a contract defect", () => {
  for (const directory of [
    "specs/stories/story",
    "specs/stories/ff-201-lowercase",
    "specs/stories/FF-201x",
  ]) {
    const evaluation = evaluated({ directory });
    assert.equal(evaluation.facts.storyId, undefined, directory);
    assert.equal(evaluation.result.exit, 1, directory);
    assert.ok(
      evaluation.result.issues.some((issue) =>
        issue.message.startsWith("Story directory does not name a Story ID: "),
      ),
      directory,
    );
  }
});

test("TST007-AC-001: a complete Story resolves to a clean contract", () => {
  const evaluation = evaluated({});
  assert.equal(evaluation.result.status, "pass");
  assert.equal(evaluation.result.outcome, "success");
  assert.equal(evaluation.result.exit, 0);
  assert.deepEqual(messages({}), []);
  assert.equal(evaluation.facts.securitySensitive, false);
  assert.equal(evaluation.facts.baselineConformance, false);
});

function withArchitecture(...entries) {
  return [
    "# Story: TST-007 Fixture",
    "",
    "## Classification",
    "",
    "* Security sensitive: no",
    "* Baseline conformance: no",
    "",
    "## Architecture",
    "",
    ...entries,
    "",
  ].join("\n");
}

function decisionRecord(status) {
  return `# ADR-001\n\n* Status: ${status}\n`;
}

test("TST007-AC-004: a decision is usable only when its status allows it", () => {
  const cases = [
    ["accepted", "execution", []],
    ["accepted", "architecture", []],
    ["proposed", "architecture", []],
    ["proposed", "mixed", []],
    [
      "proposed",
      "execution",
      ["referenced decision is still proposed: ADR-001"],
    ],
    [
      "superseded",
      "execution",
      ["referenced decision is not usable (superseded): ADR-001"],
    ],
    [
      "rejected",
      "execution",
      ["referenced decision is not usable (rejected): ADR-001"],
    ],
    [
      "invented",
      "execution",
      ["referenced decision declares an unknown status: ADR-001"],
    ],
  ];

  for (const [status, taskMode, expected] of cases) {
    const story = withArchitecture("* Decision: `ADR-001`").replace(
      "* Baseline conformance: no",
      `* Baseline conformance: no\n* Task mode: ${taskMode}`,
    );
    const evaluation = evaluateStoryContract({
      directory: "specs/stories/TST-007-fixture",
      story,
      acceptance,
      decision: () => ({ kind: "found", source: decisionRecord(status) }),
    });

    assert.deepEqual(
      evaluation.result.issues.map((issue) => issue.message),
      expected,
      `${status} in ${taskMode}`,
    );
  }
});

test("TST007-AC-004: an unresolvable decision is a stable contract defect", () => {
  const cases = [
    [{ kind: "missing" }, "referenced decision record does not exist: ADR-001"],
    [
      { kind: "ambiguous" },
      "referenced decision resolves to more than one record: ADR-001",
    ],
    [
      { kind: "unreadable" },
      "referenced decision record is unreadable: ADR-001",
    ],
    [
      { kind: "found", source: "# ADR-001\n\nNo status.\n" },
      "referenced decision must declare Status exactly once: ADR-001",
    ],
    [
      {
        kind: "found",
        source: "# ADR-001\n\n* Status: accepted\n* Status: proposed\n",
      },
      "referenced decision must declare Status exactly once: ADR-001",
    ],
  ];

  for (const [record, expected] of cases) {
    const evaluation = evaluateStoryContract({
      directory: "specs/stories/TST-007-fixture",
      story: withArchitecture("* Decision: `ADR-001`"),
      acceptance,
      decision: () => record,
    });

    assert.deepEqual(
      evaluation.result.issues.map((issue) => issue.message),
      [expected],
      record.kind,
    );
  }
});

test("TST007-AC-004: a malformed decision ID is never resolved", () => {
  let resolutions = 0;
  const evaluation = evaluateStoryContract({
    directory: "specs/stories/TST-007-fixture",
    story: withArchitecture("* Decision: `ADR-abc`"),
    acceptance,
    decision: () => {
      resolutions += 1;
      return { kind: "missing" };
    },
  });

  assert.equal(resolutions, 0);
  assert.deepEqual(
    evaluation.result.issues.map((issue) => issue.message),
    ["architecture decision must be ADR-<digits>: ADR-abc"],
  );
});

test("TST007-AC-003: an invalid classification suppresses conditional checks", () => {
  const evaluation = evaluateStoryContract({
    directory: "specs/stories/TST-007-fixture",
    story: [
      "# Story: TST-007 Fixture",
      "",
      "## Classification",
      "",
      "* Security sensitive: maybe",
      "* Baseline conformance: no",
      "",
      "## Superseded Behavior",
      "",
      "* `tests/x.sh`",
      "",
    ].join("\n"),
    acceptance,
  });

  // The superseded contradiction is never reported, because neither condition
  // is known once the classification is invalid.
  assert.deepEqual(
    evaluation.result.issues.map((issue) => issue.message),
    ["Security sensitive must be declared as yes or no"],
  );
});

test("TST007-AC-003: authority defaults follow task mode and imply nothing", () => {
  const authorityFor = (taskMode) =>
    evaluated({
      story: [
        "# Story: TST-007 Fixture",
        "",
        "## Classification",
        "",
        "* Security sensitive: no",
        "* Baseline conformance: no",
        `* Task mode: ${taskMode}`,
        "",
      ].join("\n"),
    }).facts.authority;

  for (const taskMode of ["execution", "mixed"])
    assert.equal(authorityFor(taskMode).modify, true, taskMode);
  for (const taskMode of ["architecture", "evidence"])
    assert.equal(authorityFor(taskMode).modify, false, taskMode);

  for (const taskMode of ["execution", "architecture", "evidence", "mixed"]) {
    const authority = authorityFor(taskMode);
    assert.equal(authority.plan, true, taskMode);
    for (const operation of [
      "add_dependency",
      "migration",
      "commit",
      "push",
      "deploy",
    ])
      assert.equal(authority[operation], false, `${taskMode}.${operation}`);
  }
});

test("TST007-AC-004: reported decisions match what the reader hands the caller", () => {
  // The caller resolves what readStoryDecisions reports, so the evaluated
  // facts must name exactly the same records.
  for (const entries of [
    ["* Decision: `ADR-001`"],
    ["* Decision: `ADR-001`", "* Decision: `ADR-002`"],
    ["* Decision: `ADR-1 ADR-2`"],
    ["* Decision: `ADR-001`", "* Decision: `ADR-001`"],
    ["* Decision: `ADR-abc`"],
    ["* Decision: not backticked"],
    [],
  ]) {
    const story = withArchitecture(...entries);
    const evaluation = evaluateStoryContract({
      directory: "specs/stories/TST-007-fixture",
      story,
      acceptance,
      decision: () => ({ kind: "found", source: decisionRecord("accepted") }),
    });

    assert.deepEqual(
      [...evaluation.facts.decisions],
      [...readStoryDecisions(story)],
      entries.join(" | "),
    );
  }
});

test("TST007-AC-004: one declared value can name several records", () => {
  const resolved = [];
  const evaluation = evaluateStoryContract({
    directory: "specs/stories/TST-007-fixture",
    story: withArchitecture("* Decision: `ADR-001 ADR-002`"),
    acceptance,
    decision: (id) => {
      resolved.push(id);
      return { kind: "missing" };
    },
  });

  assert.deepEqual(resolved, ["ADR-001", "ADR-002"]);
  assert.deepEqual(
    evaluation.result.issues.map((issue) => issue.message),
    [
      "referenced decision record does not exist: ADR-001",
      "referenced decision record does not exist: ADR-002",
    ],
  );
});
