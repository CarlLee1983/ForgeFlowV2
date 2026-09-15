import assert from "node:assert/strict";
import test from "node:test";

import { evaluateHandoff, validateResultEnvelope } from "@praxisbound/core";

const revision = "0123456789abcdef0123456789abcdef01234567";
const complete = (overrides = {}) => {
  const fields = {
    story: "TST-004",
    recordedAt: "2026-09-12T02:30:00Z",
    repository: "owner/repository",
    revision,
    command: "make verify",
    result: "pass",
    ...overrides,
  };
  return [
    "Prose is ignored.",
    "```yaml",
    "handoff:",
    `  story: ${fields.story}`,
    `  recorded_at: ${fields.recordedAt}`,
    `  repository: ${fields.repository}`,
    `  revision: ${fields.revision}`,
    "",
    "verification:",
    `  command: ${fields.command}`,
    `  result: ${fields.result}`,
    "```",
  ].join("\n");
};

function failure(source) {
  const evaluation = evaluateHandoff(source);
  assert.equal(evaluation.result.status, "fail");
  assert.equal(evaluation.result.outcome, "failure");
  assert.equal(evaluation.result.exit, 1);
  assert.deepEqual(validateResultEnvelope(evaluation.result), {
    ok: true,
    value: evaluation.result,
  });
  assert.equal(evaluation.evidence, undefined);
  return evaluation.result.issues;
}

test("TST004-AC-001: complete CRLF source returns frozen evidence and a canonical pass", () => {
  const evaluation = evaluateHandoff(complete().replaceAll("\n", "\r\n"));
  assert.deepEqual(evaluation.result, {
    schemaVersion: "1.0.0",
    protocolVersion: "0.10.0",
    status: "pass",
    outcome: "success",
    exit: 0,
    subject: "handoff",
    issues: [],
  });
  assert.deepEqual(evaluation.evidence, {
    story: "TST-004",
    recordedAt: "2026-09-12T02:30:00Z",
    repository: "owner/repository",
    revision,
    verificationCommand: "make verify",
    verificationResult: "pass",
  });
  assert.equal(Object.isFrozen(evaluation), true);
  assert.equal(Object.isFrozen(evaluation.result), true);
  assert.equal(Object.isFrozen(evaluation.result.issues), true);
  assert.equal(Object.isFrozen(evaluation.evidence), true);
  assert.deepEqual(validateResultEnvelope(evaluation.result), {
    ok: true,
    value: evaluation.result,
  });
});

test("TST004-AC-003: structural block precedence and syntax failures are stable", () => {
  assert.deepEqual(
    failure(complete().replace("```yaml", "```yml")).map(({ code }) => code),
    ["HANDOFF_BLOCK_COUNT_INVALID"],
  );
  assert.deepEqual(
    failure(complete().replace(/```$/, "")).map(({ code }) => code),
    ["HANDOFF_BLOCK_UNCLOSED"],
  );
  assert.deepEqual(
    failure(`${complete()}\n\`\`\`yaml\n\`\`\``).map(({ code }) => code),
    ["HANDOFF_BLOCK_COUNT_INVALID"],
  );
  assert.deepEqual(
    failure(complete().replace("  story:", "    story:")).map(
      ({ code }) => code,
    ),
    ["HANDOFF_INDENTATION", "HANDOFF_MISSING_FIELD"],
  );
  assert.deepEqual(
    failure(complete().replace("  story:", "    - story:")).map(
      ({ code }) => code,
    ),
    ["HANDOFF_LIST", "HANDOFF_MISSING_FIELD"],
  );
  assert.deepEqual(
    failure(complete().replace("  story: TST-004", "  story:TST-004")).map(
      ({ code }) => code,
    ),
    ["HANDOFF_UNSUPPORTED_LINE", "HANDOFF_MISSING_FIELD"],
  );
  assert.deepEqual(
    failure(
      complete()
        .replace("  story: TST-004", "    story: TST-004")
        .replace(/```$/, ""),
    ).map(({ code }) => code),
    ["HANDOFF_INDENTATION", "HANDOFF_BLOCK_UNCLOSED"],
  );
  assert.deepEqual(
    failure(
      `${complete().replace("  story: TST-004", "    story: TST-004")}\n\`\`\`yaml\n\`\`\``,
    ).map(({ code }) => code),
    ["HANDOFF_INDENTATION", "HANDOFF_BLOCK_COUNT_INVALID"],
  );
});

test("TST004-AC-003: section, field, mutable, and separator defects preserve encounter order", () => {
  assert.deepEqual(
    failure(complete().replace("verification:", "other:")).map(
      ({ code }) => code,
    ),
    [
      "HANDOFF_UNKNOWN_SECTION",
      "HANDOFF_UNKNOWN_KEY",
      "HANDOFF_UNKNOWN_KEY",
      "HANDOFF_SECTION_COUNT",
      "HANDOFF_MISSING_FIELD",
      "HANDOFF_MISSING_FIELD",
    ],
  );
  assert.deepEqual(
    failure(
      complete().replace("  result: pass", "  unknown: value\n  result: pass"),
    ).map(({ code }) => code),
    ["HANDOFF_UNKNOWN_KEY"],
  );
  assert.deepEqual(
    failure(
      complete()
        .replace("verification:", "workflow:")
        .replace("  command:", "  current_story:"),
    ).map(({ code }) => code),
    [
      "HANDOFF_MUTABLE_SECTION",
      "HANDOFF_MUTABLE_KEY",
      "HANDOFF_MUTABLE_KEY",
      "HANDOFF_SECTION_COUNT",
      "HANDOFF_MISSING_FIELD",
      "HANDOFF_MISSING_FIELD",
    ],
  );
  assert.deepEqual(
    failure(complete().replace("  story: TST-004", "  story:  TST-004")).map(
      ({ code }) => code,
    ),
    ["HANDOFF_VALUE_SEPARATOR", "HANDOFF_INVALID_STORY_ID"],
  );
  assert.deepEqual(
    failure(
      complete().replace(
        "  story: TST-004",
        "  story: TST-004\n  story: OTHER-1",
      ),
    ).map(({ code }) => code),
    ["HANDOFF_REPEATED_FIELD"],
  );
});

test("TST004-AC-003: Story-ID, timestamps, scalars, revision, result, and embedded breaks are rejected", () => {
  for (const story of ["FF-1-2", "ff-1", "FF-A", "FF--1", "1FF-1"]) {
    assert.deepEqual(
      failure(complete({ story })).map(({ code }) => code),
      ["HANDOFF_INVALID_STORY_ID"],
    );
  }
  for (const recordedAt of [
    "2026-00-01T00:00:00Z",
    "2026-01-32T00:00:00Z",
    "2026-01-01T24:00:00Z",
    "2026-01-01T00:60:00Z",
    "2026-01-01T00:00:00+00:00",
  ]) {
    assert.deepEqual(
      failure(complete({ recordedAt })).map(({ code }) => code),
      ["HANDOFF_INVALID_TIMESTAMP"],
    );
  }
  for (const repository of [
    "null",
    "true",
    "12",
    '"owner/repository"',
    "[owner]",
    "owner: repository",
    "owner # note",
  ]) {
    assert.deepEqual(
      failure(complete({ repository })).map(({ code }) => code),
      ["HANDOFF_INVALID_PLAIN_SCALAR"],
    );
  }
  for (const repository of [
    "owner:repository",
    "https://example.test",
    "0x",
    "0o",
    "0b",
  ]) {
    assert.equal(evaluateHandoff(complete({ repository })).result.exit, 0);
  }
  for (const repository of ["0x1suffix", "0o7suffix", "0b1suffix"]) {
    assert.deepEqual(
      failure(complete({ repository })).map(({ code }) => code),
      ["HANDOFF_INVALID_PLAIN_SCALAR"],
    );
  }
  assert.deepEqual(
    failure(complete({ revision: revision.toUpperCase() })).map(
      ({ code }) => code,
    ),
    ["HANDOFF_INVALID_REVISION"],
  );
  assert.deepEqual(
    failure(complete({ result: "success" })).map(({ code }) => code),
    ["HANDOFF_INVALID_RESULT"],
  );
  assert.deepEqual(
    failure(
      complete().replace("owner/repository", "owner\u0085repository"),
    ).map(({ code }) => code),
    ["HANDOFF_EMBEDDED_LINE_BREAK", "HANDOFF_MISSING_FIELD"],
  );
});

test("TST004-AC-003: input type failures are typed and all issues are immutable", () => {
  const evaluation = evaluateHandoff({ source: complete() });
  assert.deepEqual(
    evaluation.result.issues.map(({ code }) => code),
    ["HANDOFF_SOURCE_TYPE"],
  );
  assert.equal(Object.isFrozen(evaluation.result.issues[0]), true);
  assert.deepEqual(validateResultEnvelope(evaluation.result), {
    ok: true,
    value: evaluation.result,
  });
});
