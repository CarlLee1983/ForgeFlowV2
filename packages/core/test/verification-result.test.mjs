import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateVerificationResult,
  validateResultEnvelope,
} from "@praxisbound/core";

const acceptance = `# Acceptance Criteria

## Happy Path

* [ ] AC-001: Fixture happy path.
`;

function story(...sections) {
  return [
    "# Story: TST-006 Fixture",
    "",
    "## Goal",
    "",
    "Provide a deterministic Story fixture.",
    "",
    "## Classification",
    "",
    "* Security sensitive: no",
    "",
    ...sections,
  ].join("\n");
}

function record(...sections) {
  return ["# Verification Result: TST-006", "", ...sections].join("\n");
}

const completeRecord = record(
  "## Checks",
  "",
  "* lint: pass — `pnpm run lint`",
  "* static: pass — `pnpm run typecheck`",
  "* unit: pass — `pnpm test`",
  "",
  "## Evidence",
  "",
  "* `AC-001`: pass — `the unit suite proved the happy path`",
  "",
  "## Authority Used",
  "",
  "* plan",
  "* modify",
  "",
);

function evaluated(sources) {
  const evaluation = evaluateVerificationResult({
    story: story(),
    acceptance,
    record: completeRecord,
    ...sources,
  });
  assert.deepEqual(validateResultEnvelope(evaluation.result), {
    ok: true,
    value: evaluation.result,
  });
  return evaluation;
}

function codes(evaluation) {
  return evaluation.diagnostics.map((diagnostic) => diagnostic.issue.code);
}

function messages(evaluation) {
  return evaluation.diagnostics.map((diagnostic) => diagnostic.issue.message);
}

test("TST006-AC-001: a complete record evaluates to PASS", () => {
  const evaluation = evaluated({});

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.incomplete, false);
  assert.deepEqual(evaluation.diagnostics, []);
  assert.deepEqual(evaluation.planIssues, []);
  assert.deepEqual(evaluation.result, {
    schemaVersion: "1.0.0",
    protocolVersion: "0.10.0",
    status: "pass",
    outcome: "success",
    exit: 0,
    subject: "verification",
    issues: [],
  });
});

test("TST006-AC-005: a complete record reports its declared facts", () => {
  const evaluation = evaluated({});

  assert.deepEqual(evaluation.record, {
    checks: [
      { layer: "lint", status: "pass" },
      { layer: "static", status: "pass" },
      { layer: "unit", status: "pass" },
    ],
    evidenceTraced: 1,
    acceptanceCount: 1,
    authorityUsed: ["plan", "modify"],
    residualRisks: 0,
  });
  assert.equal(Object.isFrozen(evaluation.record), true);
  assert.equal(Object.isFrozen(evaluation.record.checks), true);
});

test("TST006-AC-003: an unrecorded required check is PARTIAL, never PASS", () => {
  const evaluation = evaluated({
    record: record(
      "## Checks",
      "",
      "* lint: pass — `pnpm run lint`",
      "",
      "## Evidence",
      "",
      "* `AC-001`: pass — `the unit suite proved the happy path`",
      "",
      "## Residual Risks",
      "",
      "* `static and unit were not recorded`",
      "",
    ),
  });

  assert.equal(evaluation.status, "partial");
  assert.equal(evaluation.incomplete, false);
  assert.deepEqual(codes(evaluation), [
    "VERIFICATION_REQUIRED_CHECK_NOT_RECORDED",
    "VERIFICATION_REQUIRED_CHECK_NOT_RECORDED",
  ]);
  assert.deepEqual(messages(evaluation), [
    "required check is not recorded: static",
    "required check is not recorded: unit",
  ]);
  assert.deepEqual(
    evaluation.diagnostics.map((diagnostic) => diagnostic.kind),
    ["unproven", "unproven"],
  );
  assert.equal(evaluation.result.exit, 1);
});

test("TST006-AC-003: a non-passing required check is PARTIAL, never PASS", () => {
  for (const status of ["skipped", "blocked", "unsupported"]) {
    const unproven = completeRecord.replace(
      "* unit: pass — `pnpm test`",
      `* unit: ${status} — \`the runner is unavailable\``,
    );
    const silent = evaluated({ record: unproven });

    assert.equal(silent.status, "partial");
    assert.equal(silent.incomplete, true);
    assert.deepEqual(messages(silent), [
      "required check did not pass: unit",
      "incomplete verification must record at least one residual risk",
    ]);

    const stated = evaluated({
      record: `${unproven}\n## Residual Risks\n\n* \`the unit layer is unproven\`\n`,
    });

    assert.equal(stated.status, "partial");
    assert.equal(stated.incomplete, false);
    assert.deepEqual(messages(stated), ["required check did not pass: unit"]);
    assert.equal(stated.record.residualRisks, 1);
  }
});

test("TST006-AC-003: an acceptance criterion with no passing evidence is PARTIAL", () => {
  const evaluation = evaluated({
    acceptance: `${acceptance}* [ ] AC-002: Fixture second path.\n`,
    record: completeRecord.concat(
      "\n## Residual Risks\n\n* `AC-002 is unproven`\n",
    ),
  });

  assert.equal(evaluation.status, "partial");
  assert.deepEqual(messages(evaluation), [
    "acceptance criterion has no passing evidence: AC-002",
  ]);
  assert.equal(evaluation.record.evidenceTraced, 1);
  assert.equal(evaluation.record.acceptanceCount, 2);
});

test("TST006-AC-003: an incomplete record without a residual risk is a defect", () => {
  const evaluation = evaluated({
    record: record(
      "## Checks",
      "",
      "* lint: pass — `pnpm run lint`",
      "",
      "## Evidence",
      "",
      "* `AC-001`: pass — `the unit suite proved the happy path`",
      "",
    ),
  });

  assert.equal(evaluation.status, "partial");
  assert.equal(evaluation.incomplete, true);
  assert.deepEqual(
    codes(evaluation).at(-1),
    "VERIFICATION_RESIDUAL_RISK_REQUIRED",
  );
  assert.equal(evaluation.result.exit, 1);
});

test("TST006-AC-003: a silent record never evaluates to PASS", () => {
  const evaluation = evaluated({
    record: record("## Checks", "", "## Evidence", ""),
  });

  assert.equal(evaluation.status, "partial");
  assert.equal(evaluation.incomplete, true);
  assert.deepEqual(evaluation.record.checks, []);
  assert.deepEqual(codes(evaluation), [
    "VERIFICATION_REQUIRED_CHECK_NOT_RECORDED",
    "VERIFICATION_REQUIRED_CHECK_NOT_RECORDED",
    "VERIFICATION_REQUIRED_CHECK_NOT_RECORDED",
    "VERIFICATION_ACCEPTANCE_UNPROVEN",
    "VERIFICATION_RESIDUAL_RISK_REQUIRED",
  ]);
});

test("TST006-AC-004: a recorded failure evaluates to FAIL", () => {
  const failedCheck = evaluated({
    record: completeRecord.replace(
      "* unit: pass — `pnpm test`",
      "* unit: fail — `pnpm test`",
    ),
  });
  assert.equal(failedCheck.status, "fail");
  assert.equal(failedCheck.incomplete, false);
  assert.equal(failedCheck.result.exit, 1);
  assert.deepEqual(codes(failedCheck), [
    "VERIFICATION_REQUIRED_CHECK_NOT_PASSED",
  ]);

  const failedEvidence = evaluated({
    record: completeRecord.replace(
      "* `AC-001`: pass — `the unit suite proved the happy path`",
      "* `AC-001`: fail — `the unit suite refuted the happy path`",
    ),
  });
  assert.equal(failedEvidence.status, "fail");
  assert.equal(failedEvidence.record.evidenceTraced, 1);
});

test("TST006-AC-004: using an ungranted authority evaluates to FAIL", () => {
  const evaluation = evaluated({
    record: completeRecord.replace("* modify\n", "* modify\n* push\n"),
  });

  assert.equal(evaluation.status, "fail");
  assert.equal(evaluation.incomplete, false);
  assert.deepEqual(codes(evaluation), ["VERIFICATION_AUTHORITY_CONFLICT"]);
  assert.deepEqual(messages(evaluation), [
    "authority conflict: push was used but the Story does not grant it",
  ]);
  assert.deepEqual(
    evaluation.diagnostics.map((diagnostic) => diagnostic.kind),
    ["conflict"],
  );
});

test("TST006-AC-004: a granted authority that was used is not a conflict", () => {
  const evaluation = evaluated({
    story: story("## Authority", "", "* push: yes", ""),
    record: completeRecord.replace("* modify\n", "* modify\n* push\n"),
  });

  assert.equal(evaluation.status, "pass");
  assert.deepEqual(evaluation.record.authorityUsed, ["plan", "modify", "push"]);
});

test("TST006-AC-004: a malformed record is a stable record defect", () => {
  const cases = [
    [
      ["* lint pass"],
      ["VERIFICATION_CHECK_ENTRY_INVALID"],
      ["check entry is not a declaration: lint pass"],
    ],
    [
      ["* smoke: pass — `run`"],
      ["VERIFICATION_CHECK_UNKNOWN"],
      ["unknown verification check: smoke"],
    ],
    [
      ["* lint: pass — `run`", "* lint: pass — `run`"],
      ["VERIFICATION_CHECK_REPEATED"],
      ["verification check is recorded more than once: lint"],
    ],
    [
      ["* lint: done — `run`"],
      ["VERIFICATION_CHECK_STATUS_INVALID"],
      [
        "check lint status must be pass, fail, skipped, blocked, or unsupported",
      ],
    ],
    [
      ["* lint: pass — TBD"],
      ["VERIFICATION_CHECK_DETAIL_INVALID"],
      ["check lint must name one exact backticked command or reason"],
    ],
    [
      ["* lint: pass"],
      ["VERIFICATION_CHECK_DETAIL_INVALID"],
      ["check lint must name one exact backticked command or reason"],
    ],
  ];

  for (const [checks, expectedCodes, expectedMessages] of cases) {
    const evaluation = evaluated({
      record: record(
        "## Checks",
        "",
        ...checks,
        "",
        "## Evidence",
        "",
        "* `AC-001`: pass — `the unit suite proved the happy path`",
        "",
        "## Residual Risks",
        "",
        "* `the record is under repair`",
        "",
      ),
    });

    assert.equal(evaluation.incomplete, true);
    assert.equal(evaluation.result.exit, 1);
    assert.deepEqual(
      codes(evaluation).slice(0, expectedCodes.length),
      expectedCodes,
    );
    assert.deepEqual(
      messages(evaluation).slice(0, expectedMessages.length),
      expectedMessages,
    );
  }
});

test("TST006-AC-004: a malformed evidence entry is a stable record defect", () => {
  const cases = [
    [
      ["* an evidence note"],
      "VERIFICATION_EVIDENCE_ENTRY_INVALID",
      "evidence entry is not a declaration: an evidence note",
    ],
    [
      ["* AC-001: pass — `observed`"],
      "VERIFICATION_EVIDENCE_AC_INVALID",
      "evidence entry must name one exact backticked AC ID: AC-001",
    ],
    [
      ["* `AC-009`: pass — `observed`"],
      "VERIFICATION_EVIDENCE_AC_UNKNOWN",
      "evidence names unknown AC ID: AC-009",
    ],
    [
      ["* `AC-001`: pass — `observed`", "* `AC-001`: pass — `observed`"],
      "VERIFICATION_EVIDENCE_AC_REPEATED",
      "evidence duplicates AC ID: AC-001",
    ],
    [
      ["* `AC-001`: partial — `observed`"],
      "VERIFICATION_EVIDENCE_STATUS_INVALID",
      "evidence AC-001 status must be pass, fail, blocked, or skipped",
    ],
    [
      ["* `AC-001`: pass — n/a"],
      "VERIFICATION_EVIDENCE_DETAIL_INVALID",
      "evidence AC-001 must name one exact backticked observation",
    ],
  ];

  for (const [evidence, expectedCode, expectedMessage] of cases) {
    const evaluation = evaluated({
      record: record(
        "## Checks",
        "",
        "* lint: pass — `pnpm run lint`",
        "* static: pass — `pnpm run typecheck`",
        "* unit: pass — `pnpm test`",
        "",
        "## Evidence",
        "",
        ...evidence,
        "",
        "## Residual Risks",
        "",
        "* `the record is under repair`",
        "",
      ),
    });

    assert.equal(evaluation.incomplete, true);
    assert.equal(codes(evaluation)[0], expectedCode);
    assert.equal(messages(evaluation)[0], expectedMessage);
  }
});

test("TST006-AC-004: unknown used authority and loose residual risks are defects", () => {
  const evaluation = evaluated({
    record: completeRecord
      .replace("* modify\n", "* modify\n* merge\n")
      .concat("\n## Residual Risks\n\n* none that matter\n"),
  });

  assert.equal(evaluation.incomplete, true);
  assert.deepEqual(codes(evaluation), [
    "VERIFICATION_AUTHORITY_USED_UNKNOWN",
    "VERIFICATION_RESIDUAL_RISK_INVALID",
  ]);
  assert.deepEqual(messages(evaluation), [
    "authority used names an unknown operation: merge",
    "every residual risk must be one exact backticked statement",
  ]);
});

test("TST006-AC-004: an unusable record stops before a status is decided", () => {
  for (const [sources, code, message] of [
    [
      { record: undefined },
      "VERIFICATION_RECORD_UNAVAILABLE",
      "verification.md is missing, unreadable, or empty",
    ],
    [
      { record: "" },
      "VERIFICATION_RECORD_UNAVAILABLE",
      "verification.md is missing, unreadable, or empty",
    ],
    [
      { record: "  \n\t\n" },
      "VERIFICATION_CHECKS_SECTION_INVALID",
      "verification.md must declare ## Checks exactly once",
    ],
    [
      { record: record("## Evidence", "") },
      "VERIFICATION_CHECKS_SECTION_INVALID",
      "verification.md must declare ## Checks exactly once",
    ],
    [
      { record: record("## Checks", "", "## Checks", "", "## Evidence", "") },
      "VERIFICATION_CHECKS_SECTION_INVALID",
      "verification.md must declare ## Checks exactly once",
    ],
    [
      { record: record("## Checks", "") },
      "VERIFICATION_EVIDENCE_SECTION_INVALID",
      "verification.md must declare ## Evidence exactly once",
    ],
    [
      { acceptance: "# Acceptance Criteria\n\nNo checkbox here.\n" },
      "VERIFICATION_ACCEPTANCE_MISSING",
      "acceptance.md declares no checkbox AC to trace evidence to",
    ],
  ]) {
    const evaluation = evaluated(sources);

    assert.equal(evaluation.status, undefined);
    assert.equal(evaluation.record, undefined);
    assert.equal(evaluation.incomplete, true);
    assert.deepEqual(codes(evaluation).at(-1), code);
    assert.deepEqual(messages(evaluation).at(-1), message);
    assert.equal(evaluation.result.exit, 1);
  }
});

test("TST006-AC-004: a plan defect and a record defect are both reported", () => {
  const evaluation = evaluated({
    story: story("## Risk", "", "* Level: extreme", ""),
    record: record("## Checks", ""),
  });

  assert.deepEqual(
    evaluation.planIssues.map((issue) => issue.code),
    ["VERIFICATION_RISK_LEVEL_INVALID"],
  );
  assert.deepEqual(codes(evaluation), [
    "VERIFICATION_EVIDENCE_SECTION_INVALID",
  ]);
  assert.deepEqual(
    evaluation.result.issues.map((issue) => issue.code),
    [
      "VERIFICATION_RISK_LEVEL_INVALID",
      "VERIFICATION_EVIDENCE_SECTION_INVALID",
    ],
  );
});

test("TST006-AC-005: a non-string source is a typed failure, not an exception", () => {
  for (const source of [undefined, 42, null, {}])
    assert.equal(evaluated({ acceptance: source }).incomplete, true);

  const evaluation = evaluated({ story: 42 });
  assert.deepEqual(
    evaluation.planIssues.map((issue) => issue.code),
    ["VERIFICATION_SOURCE_TYPE"],
  );
});

test("TST006-AC-005: a fenced example is never read as a declaration", () => {
  const evaluation = evaluated({
    record: record(
      "## Checks",
      "",
      "```markdown",
      "* smoke: perfect — nonsense",
      "```",
      "",
      "* lint: pass — `pnpm run lint`",
      "* static: pass — `pnpm run typecheck`",
      "* unit: pass — `pnpm test`",
      "",
      "## Evidence",
      "",
      "* `AC-001`: pass — `the unit suite proved the happy path`",
      "",
    ),
  });

  assert.equal(evaluation.status, "pass");
  assert.deepEqual(evaluation.diagnostics, []);
});
