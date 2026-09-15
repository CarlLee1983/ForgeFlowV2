import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveVerificationPlan,
  validateResultEnvelope,
} from "@praxisbound/core";

const bare = [
  "# Story: TST-005 Fixture",
  "",
  "## Goal",
  "",
  "Provide a deterministic Story fixture.",
  "",
  "## Classification",
  "",
  "* Security sensitive: no",
  "* Baseline conformance: no",
  "",
].join("\n");

function withSection(heading, ...entries) {
  return `${bare}\n${heading}\n\n${entries.join("\n")}\n`;
}

function resolved(source) {
  const evaluation = resolveVerificationPlan(source);
  assert.deepEqual(validateResultEnvelope(evaluation.result), {
    ok: true,
    value: evaluation.result,
  });
  return evaluation;
}

function failure(source) {
  const evaluation = resolved(source);
  assert.equal(evaluation.result.status, "fail");
  assert.equal(evaluation.result.outcome, "failure");
  assert.equal(evaluation.result.exit, 1);
  return evaluation.result.issues;
}

function messages(source) {
  return failure(source).map((issue) => issue.message);
}

test("TST005-AC-001: an undeclared Story keeps the documented defaults", () => {
  const evaluation = resolved(bare);

  assert.deepEqual(evaluation.result, {
    schemaVersion: "1.0.0",
    protocolVersion: "0.10.0",
    status: "pass",
    outcome: "success",
    exit: 0,
    subject: "verification",
    issues: [],
  });
  assert.deepEqual(evaluation.plan, {
    taskMode: "execution",
    authority: {
      plan: true,
      modify: true,
      add_dependency: false,
      migration: false,
      commit: false,
      push: false,
      deploy: false,
    },
    riskLevel: "low",
    architectureImpact: "low",
    requiredChecks: ["lint", "static", "unit"],
  });
  assert.equal(Object.isFrozen(evaluation.plan), true);
  assert.equal(Object.isFrozen(evaluation.plan.authority), true);
  assert.equal(Object.isFrozen(evaluation.plan.requiredChecks), true);
});

test("TST005-AC-001: a declared Story resolves every declaration", () => {
  const source = `${bare.replace(
    "* Baseline conformance: no\n",
    "* Baseline conformance: no\n* Task mode: mixed\n",
  )}
## Authority

* plan: yes
* modify: yes
* add_dependency: yes
* migration: no
* commit: yes
* push: no
* deploy: no

## Architecture

* Impact: high
* Decision: \`ADR-901\`
* Boundary: \`Gateway\`
* Contract: \`Gateway public interface remains compatible\`
* Owner: \`Gateway = gateway-domain\`

## Risk

* Level: high
* Reason: \`payment\`
* Signal: \`concurrency\`
`;
  const evaluation = resolved(source);

  assert.equal(evaluation.result.exit, 0);
  assert.deepEqual(evaluation.plan, {
    taskMode: "mixed",
    authority: {
      plan: true,
      modify: true,
      add_dependency: true,
      migration: false,
      commit: true,
      push: false,
      deploy: false,
    },
    riskLevel: "high",
    architectureImpact: "high",
    requiredChecks: [
      "lint",
      "static",
      "unit",
      "integration",
      "contract",
      "e2e",
      "architecture",
    ],
  });
});

test("TST005-AC-001: evidence and architecture task modes never resolve modify", () => {
  for (const taskMode of ["evidence", "architecture"]) {
    const source = bare.replace(
      "* Baseline conformance: no\n",
      `* Baseline conformance: no\n* Task mode: ${taskMode}\n`,
    );
    assert.deepEqual(resolved(source).plan.authority, {
      plan: true,
      modify: false,
      add_dependency: false,
      migration: false,
      commit: false,
      push: false,
      deploy: false,
    });
  }
});

test("TST005-AC-001: the profile follows risk level and architecture impact", () => {
  for (const [level, checks] of [
    ["low", ["lint", "static", "unit"]],
    ["medium", ["lint", "static", "unit", "integration"]],
    ["high", ["lint", "static", "unit", "integration", "contract", "e2e"]],
  ]) {
    assert.deepEqual(
      resolved(withSection("## Risk", `* Level: ${level}`)).plan.requiredChecks,
      checks,
    );
  }

  for (const impact of ["medium", "high"]) {
    assert.deepEqual(
      resolved(withSection("## Architecture", `* Impact: ${impact}`)).plan
        .requiredChecks,
      ["lint", "static", "unit", "architecture"],
    );
  }
});

test("TST005-AC-003: task mode defects fail and fall back to execution", () => {
  const repeated = bare.replace(
    "* Baseline conformance: no\n",
    "* Baseline conformance: no\n* Task mode: evidence\n* Task mode: evidence\n",
  );
  assert.deepEqual(messages(repeated), [
    'Classification must declare "Task mode" at most once',
  ]);
  assert.equal(resolveVerificationPlan(repeated).plan.taskMode, "execution");

  const invalid = bare.replace(
    "* Baseline conformance: no\n",
    "* Baseline conformance: no\n* Task mode: refactor\n",
  );
  assert.deepEqual(messages(invalid), [
    "Task mode must be architecture, execution, evidence, or mixed",
  ]);
  assert.equal(resolveVerificationPlan(invalid).plan.authority.modify, true);
});

test("TST005-AC-003: authority defects are reported in encounter order", () => {
  assert.deepEqual(
    messages(
      withSection(
        "## Authority",
        "* prose entry",
        "* merge: yes",
        "* modify: yes",
        "* modify: no",
        "* commit: maybe",
      ),
    ),
    [
      "authority entry is not a declaration: prose entry",
      "authority declares an unknown operation: merge",
      "authority declares modify more than once",
      "authority commit must be declared as yes or no",
    ],
  );
});

test("TST005-AC-003: a repeated governance section is reported once", () => {
  for (const heading of ["## Authority", "## Architecture", "## Risk"]) {
    const section = heading.slice(3);
    assert.deepEqual(
      messages(`${withSection(heading)}\n${heading}\n`),
      [`Story must declare ${heading} at most once`],
      section,
    );
  }
});

test("TST005-AC-003: architecture defects are typed", () => {
  assert.deepEqual(
    messages(
      withSection(
        "## Architecture",
        "* prose entry",
        "* Impact: low",
        "* Impact: high",
        "* Decision: ADR-901",
        "* Boundary: `TBD`",
        "* Contract: stays compatible",
        "* Owner: ``",
        "* Layer: `domain`",
      ),
    ),
    [
      "architecture entry is not a declaration: prose entry",
      "architecture decision must name one exact backticked decision ID",
      "architecture boundary must name one exact backticked boundary",
      "architecture contract must state one exact backticked contract",
      "architecture owner must state one exact backticked `<boundary> = <owner>`",
      "architecture declares an unknown label: Layer",
      'Architecture must declare "Impact" at most once',
    ],
  );

  assert.deepEqual(
    messages(withSection("## Architecture", "* Impact: severe")),
    ["Architecture impact must be low, medium, or high"],
  );
});

test("TST005-AC-003: risk defects are typed", () => {
  assert.deepEqual(
    messages(
      withSection(
        "## Risk",
        "* prose entry",
        "* Reason: a prose explanation",
        "* Signal: concurrency",
        "* Signal: `unbounded-retry`",
        "* Signal: `concurrency`",
        "* Signal: `concurrency`",
        "* Scope: `wide`",
      ),
    ),
    [
      "risk entry is not a declaration: prose entry",
      "risk reason must name one same-line backticked signal",
      "risk signal must name one same-line backticked signal",
      "risk signal is unknown: unbounded-retry",
      "risk signal declared more than once: concurrency",
      "risk declares an unknown label: Scope",
    ],
  );

  assert.deepEqual(
    messages(withSection("## Risk", "* Level: low", "* Level: high")),
    ['Risk must declare "Level" at most once'],
  );
  assert.equal(
    resolveVerificationPlan(withSection("## Risk", "* Level: critical")).plan
      .riskLevel,
    "low",
  );
});

test("TST005-AC-003: a fenced example is documentation, not a declaration", () => {
  const fenced = withSection(
    "## Risk",
    "```markdown",
    "* Signal: `unbounded-retry`",
    "```",
    "* Level: medium",
  );

  const evaluation = resolved(fenced);
  assert.equal(evaluation.result.exit, 0);
  assert.equal(evaluation.plan.riskLevel, "medium");
});

test("TST005-AC-003: declarations survive dashes, CRLF, and indentation", () => {
  const source = withSection(
    "## Authority",
    "  - modify: no  ",
    "- commit: no",
  ).replaceAll("\n", "\r\n");

  const evaluation = resolved(source);
  assert.equal(evaluation.result.exit, 0);
  assert.equal(evaluation.plan.authority.modify, false);
});

test("TST005-AC-003: a non-string source is a typed failure", () => {
  for (const source of [undefined, null, 42, {}, ["# Story"]]) {
    const issues = failure(source);
    assert.deepEqual(
      issues.map((issue) => issue.code),
      ["VERIFICATION_SOURCE_TYPE"],
    );
  }
  assert.deepEqual(resolveVerificationPlan(null).plan.requiredChecks, [
    "lint",
    "static",
    "unit",
  ]);
});

test("TST005-AC-003: every issue is immutable and canonically coded", () => {
  const issues = failure(withSection("## Authority", "* merge: yes"));

  assert.equal(Object.isFrozen(issues), true);
  for (const issue of issues) {
    assert.equal(Object.isFrozen(issue), true);
    assert.match(issue.code, /^VERIFICATION_[A-Z0-9_]+$/);
  }
});
