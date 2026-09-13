import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

import { evaluateHandoff } from "@forgeflow/core";

import { runHandoffCheck } from "../dist/handoff.js";
import { runDifferentialParity } from "./support/differential-parity-harness.mjs";

const execFile = promisify(execFileCallback);
const fixtureSource = fileURLToPath(
  new URL("./fixtures/handoff-parity/", import.meta.url),
);
const handoffCheck = fileURLToPath(
  new URL("../../../scripts/handoff-check", import.meta.url),
);

const resultBase = Object.freeze({
  schemaVersion: "1.0.0",
  protocolVersion: "0.9.0",
  subject: "handoff",
});

function issueForLegacyMessage(message) {
  const exact = new Map([
    [
      "handoff source line contains an embedded YAML line break",
      "HANDOFF_EMBEDDED_LINE_BREAK",
    ],
    ["handoff evidence block is not closed", "HANDOFF_BLOCK_UNCLOSED"],
    [
      "handoff must contain exactly one machine-readable evidence block",
      "HANDOFF_BLOCK_COUNT_INVALID",
    ],
    ["handoff.story must be one Story ID", "HANDOFF_INVALID_STORY_ID"],
    [
      "handoff.recorded_at must be YYYY-MM-DDTHH:MM:SSZ in UTC",
      "HANDOFF_INVALID_TIMESTAMP",
    ],
    [
      "handoff.repository must be one non-null unquoted plain scalar",
      "HANDOFF_INVALID_PLAIN_SCALAR",
    ],
    [
      "verification.command must be one non-null unquoted plain scalar",
      "HANDOFF_INVALID_PLAIN_SCALAR",
    ],
    [
      "handoff.revision must be a full 40-character commit SHA",
      "HANDOFF_INVALID_REVISION",
    ],
    [
      "verification.result must be pass, fail, or not_run",
      "HANDOFF_INVALID_RESULT",
    ],
  ]);
  const code = exact.get(message);
  if (code !== undefined) return { code, message };

  const dynamic = [
    [
      /^evidence block must declare the (handoff|verification) section exactly once$/,
      "HANDOFF_SECTION_COUNT",
    ],
    [
      /^handoff is missing: (handoff\.(story|recorded_at|repository|revision)|verification\.(command|result))$/,
      "HANDOFF_MISSING_FIELD",
    ],
    [
      /^handoff declares (handoff\.(story|recorded_at|repository|revision)|verification\.(command|result)) more than once$/,
      "HANDOFF_REPEATED_FIELD",
    ],
    [
      /^handoff evidence value contains an embedded YAML line break: (handoff\.(story|recorded_at|repository|revision)|verification\.(command|result))$/,
      "HANDOFF_EMBEDDED_LINE_BREAK",
    ],
    [
      /^handoff evidence value must follow exactly one separator space: (handoff\.(story|recorded_at|repository|revision)|verification\.(command|result))$/,
      "HANDOFF_VALUE_SEPARATOR",
    ],
    [/^lists are not part of handoff evidence: .+$/, "HANDOFF_LIST"],
    [/^unsupported handoff evidence indentation: .+$/, "HANDOFF_INDENTATION"],
    [/^unsupported handoff evidence line: .+$/, "HANDOFF_UNSUPPORTED_LINE"],
    [
      /^handoff evidence key declared outside a section: [A-Za-z_][A-Za-z0-9_-]*$/,
      "HANDOFF_KEY_OUTSIDE_SECTION",
    ],
    [
      /^mutable lifecycle section is forbidden: (workflow|baseline)$/,
      "HANDOFF_MUTABLE_SECTION",
    ],
    [
      /^mutable lifecycle evidence is forbidden: (workflow|baseline)\.[A-Za-z_][A-Za-z0-9_-]*$/,
      "HANDOFF_MUTABLE_KEY",
    ],
    [
      /^unknown handoff evidence section: [A-Za-z_][A-Za-z0-9_-]*$/,
      "HANDOFF_UNKNOWN_SECTION",
    ],
    [
      /^unknown handoff evidence key: [A-Za-z_][A-Za-z0-9_-]*\.[A-Za-z_][A-Za-z0-9_-]*$/,
      "HANDOFF_UNKNOWN_KEY",
    ],
  ];
  const matched = dynamic.find(([pattern]) => pattern.test(message));
  return matched === undefined ? undefined : { code: matched[1], message };
}

/** Strictly maps only retained checker diagnostic/result lines to Core values. */
function normalizeLegacyDiagnostic(diagnostic) {
  const issues = [];
  let resultLine;
  for (const line of diagnostic.split("\n")) {
    if (line === "") continue;
    if (line.startsWith("FAIL  ")) {
      const mapped = issueForLegacyMessage(line.slice(6));
      if (mapped === undefined) return { ok: false };
      issues.push(mapped);
      continue;
    }
    if (line.startsWith("ERROR ")) return { ok: false };
    if (
      line === "Result: HANDOFF_CONTRACT_OK" ||
      line === "Result: HANDOFF_CONTRACT_INCOMPLETE"
    ) {
      if (resultLine !== undefined) return { ok: false };
      resultLine = line;
      continue;
    }
    return { ok: false };
  }
  if (resultLine === "Result: HANDOFF_CONTRACT_OK" && issues.length === 0) {
    return {
      ok: true,
      value: {
        ...resultBase,
        status: "pass",
        outcome: "success",
        exit: 0,
        issues,
      },
    };
  }
  if (resultLine === "Result: HANDOFF_CONTRACT_INCOMPLETE") {
    return {
      ok: true,
      value: {
        ...resultBase,
        status: "fail",
        outcome: "failure",
        exit: 1,
        issues,
      },
    };
  }
  return { ok: false };
}

function diagnosticLines(output) {
  const ignored = [
    /^$/,
    /^ForgeFlow Handoff Contract Check$/,
    /^PASS {2}Story evidence: .+$/,
    /^PASS {2}recorded at: .+$/,
    /^PASS {2}repository revision: .+$/,
    /^PASS {2}verification evidence: .+$/,
    /^Next:$/,
    /^Historical evidence only\. Ask the human or control plane for current state\.$/,
    /^Resolve the reported evidence fields in .+, then run this check$/,
    /^again\. Mutable lifecycle state belongs in a control plane, not here\.$/,
    /^Close the fenced yaml evidence block in .+\.$/,
    /^Add exactly one fenced yaml evidence block to .+\.$/,
  ];

  return output
    .split("\n")
    .filter((line) => !ignored.some((pattern) => pattern.test(line)))
    .join("\n");
}

function legacyEvidence(output) {
  const values = {};
  for (const line of output.split("\n")) {
    if (line.startsWith("PASS  Story evidence: "))
      values.story = line.slice(22);
    if (line.startsWith("PASS  recorded at: "))
      values.recordedAt = line.slice(19);
    if (line.startsWith("PASS  repository revision: ")) {
      const value = line.slice(27);
      const separator = value.lastIndexOf(" ");
      values.repository = value.slice(0, separator);
      values.revision = value.slice(separator + 1);
    }
    if (line.startsWith("PASS  verification evidence: ")) {
      const [verificationCommand, verificationResult] = line
        .slice(29)
        .split(/ (?=[^ ]+$)/);
      values.verificationCommand = verificationCommand;
      values.verificationResult = verificationResult;
    }
  }
  return Object.keys(values).length === 0 ? undefined : values;
}

async function legacyOutcome(path, observe) {
  let output;
  let exit = 0;
  try {
    ({ stdout: output } = await execFile(handoffCheck, [path], {
      encoding: "utf8",
    }));
  } catch (error) {
    output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    exit = error.code;
  }
  const diagnostic = diagnosticLines(output);
  const normalized = normalizeLegacyDiagnostic(diagnostic);
  if (normalized.ok && normalized.value.status === "pass")
    observe.evidence(legacyEvidence(output));
  return {
    result: normalized.ok ? normalized.value : { invalid: true },
    issues: normalized.ok ? normalized.value.issues : [],
    exit,
    legacyDiagnostic: diagnostic,
  };
}

function legacyRunner(file) {
  return async ({ fixture, observe }) =>
    legacyOutcome(new URL(file, `file://${fixture}/`).pathname, observe);
}

function typescriptRunner(file) {
  return async ({ fixture, observe }) => {
    const execution = await runHandoffCheck([
      new URL(file, `file://${fixture}/`).pathname,
    ]);
    const { evaluation } = execution;
    if (evaluation.evidence !== undefined)
      observe.evidence(evaluation.evidence);
    return {
      result: evaluation.result,
      issues: evaluation.result.issues,
      exit: evaluation.result.exit,
    };
  };
}

async function assertParity(file, expectedExit) {
  const source = await readFile(join(fixtureSource, file), "utf8");
  assert.equal(evaluateHandoff(source).result.exit, expectedExit, file);
  const parity = await runDifferentialParity({
    fixtureSource,
    legacy: legacyRunner(file),
    typescript: typescriptRunner(file),
    normalizeLegacyDiagnostic,
  });
  assert.deepEqual(parity, { ok: true, mismatches: [] }, file);
}

async function assertSourceParity(name, source) {
  const generated = `generated-${name}.md`;
  const parity = await runDifferentialParity({
    fixtureSource,
    legacy: async ({ fixture, observe }) => {
      const path = join(fixture, generated);
      await writeFile(path, source);
      return legacyOutcome(path, observe);
    },
    typescript: async ({ fixture, observe }) => {
      const path = join(fixture, generated);
      await writeFile(path, source);
      const execution = await runHandoffCheck([path]);
      const { evaluation } = execution;
      if (evaluation.evidence !== undefined)
        observe.evidence(evaluation.evidence);
      return {
        result: evaluation.result,
        issues: evaluation.result.issues,
        exit: evaluation.result.exit,
      };
    },
    normalizeLegacyDiagnostic,
  });
  assert.deepEqual(parity, { ok: true, mismatches: [] }, name);
}

const storyIds = [
  "FF-001",
  "A-1",
  "DBCLI-004",
  "FF2-30",
  "DBCLI-PLAT-001",
  "FF-CORE-A1-042",
  "ff-001",
  "FF001",
  "FF-",
  "-1",
  "FF-1a",
  "1F-1",
  "FF-1-2",
  "FF-01x",
  "FF-plat-001",
  "FF--1",
];

const revision = "0123456789abcdef0123456789abcdef01234567";

function completeSource(overrides = {}) {
  const values = {
    story: "TST-004",
    recordedAt: "2026-09-12T02:30:00Z",
    repository: "example/repository",
    revision,
    command: "make verify",
    result: "pass",
    ...overrides,
  };
  return `# ForgeFlow Handoff Evidence

\`\`\`yaml
handoff:
  story: ${values.story}
  recorded_at: ${values.recordedAt}
  repository: ${values.repository}
  revision: ${values.revision}

verification:
  command: ${values.command}
  result: ${values.result}
\`\`\`
`;
}

function replaceLine(source, field, replacement) {
  return source.replace(new RegExp(`^  ${field}:.*$`, "m"), replacement);
}

test("TST004-AC-002: exact shared Story-ID corpus has retained-checker parity", async () => {
  for (const [index, storyId] of storyIds.entries()) {
    const file = `story-ids/${index + 1}.md`;
    const source = await readFile(join(fixtureSource, file), "utf8");
    assert.equal(
      source.split("\n").find((line) => line.startsWith("  story: ")),
      `  story: ${storyId}`,
    );
    await assertParity(file, index < 6 ? 0 : 1);
  }
});

test("TST004-AC-002: Handoff lexical families have retained-checker parity", async () => {
  for (const [file, expectedExit] of [
    ["success.md", 0],
    ["sections-fields.md", 1],
    ["timestamp-result.md", 1],
    ["mutable-unknown.md", 1],
    ["scalars-layout.md", 1],
    ["comments-breaks.md", 1],
    ["block-count.md", 1],
    ["unclosed.txt", 1],
    ["revision.md", 1],
  ]) {
    await assertParity(`lexical/${file}`, expectedExit);
  }
});

test("TST004-AC-002: full Handoff lexical corpus preserves semantic parity", async () => {
  const cases = [
    ["success-lf", completeSource()],
    ["success-crlf", completeSource().replaceAll("\n", "\r\n")],
    ["result-fail", completeSource({ result: "fail" })],
    ["result-not-run", completeSource({ result: "not_run" })],
    ["repository-spaces", completeSource({ repository: "example repository" })],
    ["repository-colon", completeSource({ repository: "owner:repository" })],
    ["repository-url", completeSource({ repository: "https://example.test" })],
    ["repository-0x", completeSource({ repository: "0x" })],
    ["command-colon", completeSource({ command: "make:verify" })],
    [
      "whole-line-comment",
      completeSource().replace(
        "handoff:\n",
        "handoff:\n  # Historical context only.\n",
      ),
    ],
    ["no-block", completeSource().replace("```yaml", "```text")],
    ["duplicate-block", `${completeSource()}\n${completeSource()}`],
    ["unclosed-block", completeSource().replace(/```\n$/, "")],
    [
      "repeated-handoff-section",
      completeSource().replace(
        "verification:\n",
        "handoff:\n\nverification:\n",
      ),
    ],
    [
      "missing-verification-section",
      completeSource().replace("verification:\n", ""),
    ],
    [
      "unknown-section",
      completeSource().replace(
        "verification:\n",
        "gates:\n  open: GATE-1\n\nverification:\n",
      ),
    ],
    [
      "mutable-sections",
      completeSource().replace(
        "handoff:\n",
        "workflow:\n  current_story: TST-999\nbaseline:\n  repository: old/repository\nhandoff:\n",
      ),
    ],
    [
      "unknown-key",
      completeSource().replace(
        "  story: TST-004\n",
        "  story: TST-004\n  current_status: implementing\n",
      ),
    ],
    [
      "key-outside-section",
      completeSource().replace("handoff:\n", "  orphan: value\nhandoff:\n"),
    ],
    [
      "list",
      completeSource().replace("  story: TST-004", "    - story: TST-004"),
    ],
    [
      "indentation",
      completeSource().replace("  story: TST-004", "    story: TST-004"),
    ],
    [
      "unsupported-line",
      completeSource().replace("  story: TST-004", "  unsupported"),
    ],
    [
      "malformed-unclosed",
      completeSource()
        .replace("  story: TST-004", "    story: TST-004")
        .replace(/```\n$/, ""),
    ],
    [
      "malformed-multiple-blocks",
      `${completeSource().replace("  story: TST-004", "    story: TST-004")}\n\`\`\`yaml\n\`\`\`\n`,
    ],
  ];

  for (const field of [
    "story",
    "recorded_at",
    "repository",
    "revision",
    "command",
    "result",
  ]) {
    const source = completeSource();
    const line = source.match(new RegExp(`^  ${field}:.*$`, "m"))?.[0];
    assert.notEqual(line, undefined);
    cases.push([`missing-${field}`, source.replace(`${line}\n`, "")]);
    cases.push([`repeated-${field}`, source.replace(line, `${line}\n${line}`)]);
  }

  for (const [index, recordedAt] of [
    "2026-13-12T02:30:00Z",
    "2026-09-00T02:30:00Z",
    "2026-09-12T24:30:00Z",
    "2026-09-12T02:60:00Z",
    "2026-09-12T02:30:00+00:00",
  ].entries()) {
    cases.push([`timestamp-${index}`, completeSource({ recordedAt })]);
  }

  for (const [index, repository] of [
    "null",
    "false",
    "123",
    "|",
    "0x1suffix",
    "0o7suffix",
    "0b1suffix",
  ].entries()) {
    cases.push([`repository-scalar-${index}`, completeSource({ repository })]);
  }

  for (const [index, command] of [
    "!!str make verify",
    "&verify make verify",
    "*verify",
    '"make verify"',
    "make verify # current result",
    "-",
    "?",
    ":",
    "make verify:",
  ].entries()) {
    cases.push([`command-scalar-${index}`, completeSource({ command })]);
  }

  for (const [index, value] of [
    '{"current_story":"TST-999","status":"implementing"}',
    "[make, verify]",
    "null",
    '"make verify"',
    "|",
  ].entries()) {
    cases.push([
      `separator-${index}`,
      replaceLine(completeSource(), "command", `  command:  ${value}`),
    ]);
  }

  for (const [index, value] of [
    revision.slice(0, -1),
    `${revision}8`,
    revision.toUpperCase(),
    "0123456789abcdefg123456789abcdef01234567",
  ].entries()) {
    cases.push([`revision-${index}`, completeSource({ revision: value })]);
  }

  for (const [index, result] of ["probably", "PASS", "not-run"].entries()) {
    cases.push([`result-${index}`, completeSource({ result })]);
  }

  for (const [name, lineBreak] of [
    ["cr", "\r"],
    ["nel", "\u0085"],
    ["ls", "\u2028"],
    ["ps", "\u2029"],
  ]) {
    cases.push([
      `${name}-field`,
      completeSource({ command: `${lineBreak}    {current_story: TST-999}` }),
    ]);
    cases.push([
      `${name}-hidden-before`,
      `Historical context${lineBreak}\`\`\`yaml\nworkflow:\n  current_story: TST-999\n\`\`\`\n${completeSource()}`,
    ]);
    cases.push([
      `${name}-hidden-after`,
      `${completeSource()}Historical context${lineBreak}\`\`\`yaml\nworkflow:\n  current_story: TST-999\n\`\`\`\n`,
    ]);
  }

  for (const [name, source] of cases) await assertSourceParity(name, source);
});

test("TST004-AC-002: legacy normalizer fails closed outside its anchored allow-list", () => {
  assert.deepEqual(
    normalizeLegacyDiagnostic(
      "FAIL  unknown diagnostic\nResult: HANDOFF_CONTRACT_INCOMPLETE",
    ),
    { ok: false },
  );
  assert.deepEqual(normalizeLegacyDiagnostic("Result: ERROR"), { ok: false });
});
