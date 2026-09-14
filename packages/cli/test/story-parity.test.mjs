import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

import { createNodeStoryReader, runStoryCheck } from "../dist/story.js";
import { runDifferentialParity } from "./support/differential-parity-harness.mjs";

const execFile = promisify(execFileCallback);
const fixtureSource = fileURLToPath(
  new globalThis.URL("./fixtures/story-parity/", import.meta.url),
);
const storyCheck = fileURLToPath(
  new globalThis.URL("../../../scripts/story-check", import.meta.url),
);
const caseStory = "specs/stories/TST-901-case";
const resultBase = Object.freeze({
  schemaVersion: "1.0.0",
  protocolVersion: "0.9.0",
  subject: "story",
});
const plainAcceptance =
  "# Acceptance Criteria\n\n## Happy Path\n\n* AC-001: Fixture.\n";

/**
 * Maps a retained checker diagnostic onto one Core issue code. An unmapped
 * message fails the comparison closed rather than passing it through.
 */
function issueForLegacyMessage(message) {
  const exact = new Map([
    [
      'Classification must declare "Security sensitive" exactly once',
      "STORY_CLASSIFICATION_COUNT",
    ],
    [
      'Classification must declare "Baseline conformance" exactly once',
      "STORY_CLASSIFICATION_COUNT",
    ],
    [
      "Security sensitive must be declared as yes or no",
      "STORY_CLASSIFICATION_VALUE",
    ],
    [
      "Baseline conformance must be declared as yes or no",
      "STORY_CLASSIFICATION_VALUE",
    ],
    [
      'Classification must declare "Task mode" at most once',
      "STORY_TASK_MODE_REPEATED",
    ],
    [
      "Task mode must be architecture, execution, evidence, or mixed",
      "STORY_TASK_MODE_INVALID",
    ],
    ["authority grants deploy without push", "STORY_AUTHORITY_CHAIN"],
    ["authority grants push without commit", "STORY_AUTHORITY_CHAIN"],
    ["authority grants commit without modify", "STORY_AUTHORITY_CHAIN"],
    [
      'Architecture must declare "Impact" at most once',
      "STORY_ARCHITECTURE_IMPACT_REPEATED",
    ],
    [
      "Architecture impact must be low, medium, or high",
      "STORY_ARCHITECTURE_IMPACT_INVALID",
    ],
    ['Risk must declare "Level" at most once', "STORY_RISK_LEVEL_REPEATED"],
    ["Risk level must be low, medium, or high", "STORY_RISK_LEVEL_INVALID"],
    [
      "risk reason must name one same-line backticked signal",
      "STORY_RISK_REASON_INVALID",
    ],
    [
      "risk signal must name one same-line backticked value",
      "STORY_RISK_SIGNAL_INVALID",
    ],
    [
      "security-sensitive Story is missing acceptance section: ## Security Fixture Matrix",
      "STORY_MATRIX_MISSING",
    ],
    ["security fixture matrix declares no fixture rows", "STORY_MATRIX_EMPTY"],
    [
      "security-sensitive Story must enumerate its trust-boundary fields under ## Trust Boundary Fields",
      "STORY_TRUST_BOUNDARY_MISSING",
    ],
    [
      "every trust-boundary field must name an exact field, not prose",
      "STORY_TRUST_BOUNDARY_PROSE",
    ],
    [
      "Story declares Security sensitive: no but provides a security fixture matrix",
      "STORY_MATRIX_UNEXPECTED",
    ],
    [
      "baseline-conformance Story must list superseded tests or behavior under ## Superseded Behavior",
      "STORY_SUPERSEDED_MISSING",
    ],
    [
      "every superseded entry must name an exact test path or behavior",
      "STORY_SUPERSEDED_PROSE",
    ],
    [
      "Story declares Baseline conformance: no but declares superseded behavior",
      "STORY_SUPERSEDED_UNEXPECTED",
    ],
    [
      "security fixture matrix header must be exactly the documented five columns",
      "STORY_MATRIX_HEADER",
    ],
    [
      "security fixture matrix header must be followed by a five-column separator row",
      "STORY_MATRIX_SEPARATOR",
    ],
  ]);
  const code = exact.get(message);
  if (code !== undefined) return { code, message };

  const dynamic = [
    [
      /^readiness: ## (Goal|Scope) needs non-placeholder content$/,
      (match) =>
        match[1] === "Goal" ? "STORY_READY_GOAL" : "STORY_READY_SCOPE",
    ],
    [/^readiness: duplicate AC ID: AC-\d+$/, "STORY_READY_AC_DUPLICATE"],
    [
      /^readiness: AC-\d+ needs non-placeholder same-line content$/,
      "STORY_READY_AC_CONTENT",
    ],
    [
      /^readiness: acceptance\.md needs a checkbox AC-<digits>: criterion$/,
      "STORY_READY_AC_MISSING",
    ],
    [
      /^readiness: acceptance evidence row \d+ must declare five columns$/,
      "STORY_READY_EVIDENCE_COLUMNS",
    ],
    [
      /^readiness: acceptance evidence row \d+ must end after the fifth column$/,
      "STORY_READY_EVIDENCE_TAIL",
    ],
    [
      /^readiness: acceptance evidence row \d+ must name one exact backticked AC-<digits> ID$/,
      "STORY_READY_EVIDENCE_AC",
    ],
    [
      /^readiness: acceptance evidence row \d+ names unknown AC ID: AC-\d+$/,
      "STORY_READY_EVIDENCE_AC_UNKNOWN",
    ],
    [
      /^readiness: acceptance evidence duplicates AC ID: AC-\d+$/,
      "STORY_READY_EVIDENCE_AC_DUPLICATE",
    ],
    [
      /^readiness: acceptance evidence row \d+ method must be test, command, or human$/,
      "STORY_READY_EVIDENCE_METHOD",
    ],
    [
      /^readiness: acceptance evidence row \d+ leaves (evidence|fixture \/ precondition|expected observation) unspecified$/,
      "STORY_READY_EVIDENCE_UNSPECIFIED",
    ],
    [
      /^readiness: acceptance evidence row \d+ must give (evidence|fixture \/ precondition|expected observation) as one exact backticked value$/,
      "STORY_READY_EVIDENCE_LITERAL",
    ],
    [
      /^readiness: acceptance evidence (header must be exactly the documented five columns|header must be followed by a five-column separator row|declares no rows)$/,
      (match) =>
        match[1].startsWith("header must be exactly")
          ? "STORY_READY_EVIDENCE_HEADER"
          : match[1].startsWith("header must be followed")
            ? "STORY_READY_EVIDENCE_SEPARATOR"
            : "STORY_READY_EVIDENCE_EMPTY",
    ],
    [
      /^readiness: acceptance\.md is missing ## Acceptance Evidence$/,
      "STORY_READY_EVIDENCE_MISSING",
    ],
    [
      /^readiness: acceptance\.md must declare ## Acceptance Evidence exactly once$/,
      "STORY_READY_EVIDENCE_REPEATED",
    ],
    [
      /^readiness: acceptance evidence is missing AC ID: AC-\d+$/,
      "STORY_READY_EVIDENCE_AC_MISSING",
    ],
    [
      /^readiness: (Error Projection|Concurrency|Capacity|Retention and Overflow) .+ is a placeholder$/,
      "STORY_READY_RISK_PLACEHOLDER",
    ],
    [
      /^readiness: (Error Projection|Concurrency|Capacity|Retention and Overflow) Evidence AC must name one exact AC-<digits> ID$/,
      "STORY_READY_RISK_EVIDENCE_FORMAT",
    ],
    [
      /^readiness: (Error Projection|Concurrency|Capacity|Retention and Overflow) Evidence AC names unknown AC ID: AC-\d+$/,
      "STORY_READY_RISK_EVIDENCE_UNKNOWN",
    ],
    [
      /^readiness: (Error Projection|Concurrency|Capacity|Retention and Overflow) Evidence AC has no Acceptance Evidence row: AC-\d+$/,
      "STORY_READY_RISK_EVIDENCE_UNMAPPED",
    ],
    [/^Story directory does not name a Story ID: .+$/s, "STORY_ID_INVALID"],
    [
      /^Story must declare ## (Authority|Architecture|Risk) at most once$/,
      "STORY_SECTION_REPEATED",
    ],
    [
      /^authority entry is not a declaration: .+$/,
      "STORY_AUTHORITY_ENTRY_INVALID",
    ],
    [
      /^authority declares an unknown operation: .+$/,
      "STORY_AUTHORITY_UNKNOWN_OPERATION",
    ],
    [
      /^authority declares (plan|modify|add_dependency|migration|commit|push|deploy) more than once$/,
      "STORY_AUTHORITY_REPEATED",
    ],
    [
      /^authority (plan|modify|add_dependency|migration|commit|push|deploy) must be declared as yes or no$/,
      "STORY_AUTHORITY_VALUE_INVALID",
    ],
    [
      /^evidence task mode must not authorize (modify|add_dependency|migration|commit|push|deploy)$/,
      "STORY_AUTHORITY_EVIDENCE_MODE",
    ],
    [
      /^architecture entry is not a declaration: .+$/,
      "STORY_ARCHITECTURE_ENTRY_INVALID",
    ],
    [
      /^architecture declares an unknown label: .+$/,
      "STORY_ARCHITECTURE_UNKNOWN_LABEL",
    ],
    [
      /^architecture (Decision|Boundary|Contract|Owner) must state one exact backticked value$/,
      "STORY_ARCHITECTURE_LITERAL_INVALID",
    ],
    [
      /^architecture impact (medium|high) must name at least one decision or contract$/,
      "STORY_ARCHITECTURE_IMPACT_UNSUPPORTED",
    ],
    [
      /^architecture references the same decision twice: .+$/,
      "STORY_ARCHITECTURE_DECISION_REPEATED",
    ],
    [
      /^architecture owner must be stated as <boundary> = <owner>: .+$/,
      "STORY_ARCHITECTURE_OWNER_MALFORMED",
    ],
    [
      /^architecture owner names no owning domain: .+$/,
      "STORY_ARCHITECTURE_OWNER_UNOWNED",
    ],
    [
      /^architecture owner names an undeclared boundary: .+$/,
      "STORY_ARCHITECTURE_OWNER_UNDECLARED",
    ],
    [
      /^architecture decision must be ADR-<digits>: .+$/,
      "STORY_DECISION_MALFORMED",
    ],
    [
      /^referenced decision record does not exist: .+$/,
      "STORY_DECISION_MISSING",
    ],
    [
      /^referenced decision resolves to more than one record: .+$/,
      "STORY_DECISION_AMBIGUOUS",
    ],
    [
      /^referenced decision record is unreadable: .+$/,
      "STORY_DECISION_UNREADABLE",
    ],
    [
      /^referenced decision must declare Status exactly once: .+$/,
      "STORY_DECISION_STATUS_COUNT",
    ],
    [/^referenced decision is still proposed: .+$/, "STORY_DECISION_PROPOSED"],
    [
      /^referenced decision is not usable \((superseded|rejected)\): .+$/,
      "STORY_DECISION_UNUSABLE",
    ],
    [
      /^referenced decision declares an unknown status: .+$/,
      "STORY_DECISION_UNKNOWN_STATUS",
    ],
    [/^risk entry is not a declaration: .+$/, "STORY_RISK_ENTRY_INVALID"],
    [/^risk declares an unknown label: .+$/, "STORY_RISK_UNKNOWN_LABEL"],
    [
      /^risk level (medium|high) must name at least one reason$/,
      "STORY_RISK_REASON_MISSING",
    ],
    [
      /^risk reason .+ is a high-risk signal but the level is (low|medium)$/,
      "STORY_RISK_SIGNAL_UNDERSTATED",
    ],
    [/^risk signal is unknown: .+$/, "STORY_RISK_SIGNAL_UNKNOWN"],
    [
      /^risk signal is declared more than once: .+$/,
      "STORY_RISK_SIGNAL_REPEATED",
    ],
    [
      /^risk signal (error-projection|concurrency|bounded-capacity|retention-overflow) requires ## .+ exactly once$/,
      "STORY_RISK_CONTRACT_SECTION",
    ],
    [
      /^(Error Projection|Concurrency|Capacity|Retention and Overflow) entry is not a declaration: .+$/,
      "STORY_RISK_CONTRACT_ENTRY_INVALID",
    ],
    [
      /^(Error Projection|Concurrency|Capacity|Retention and Overflow) declares an unknown label: .+$/,
      "STORY_RISK_CONTRACT_UNKNOWN_LABEL",
    ],
    [
      /^(Error Projection|Concurrency|Capacity|Retention and Overflow) must declare ".+" exactly once$/,
      "STORY_RISK_CONTRACT_FIELD_COUNT",
    ],
    [
      /^(Error Projection|Concurrency|Capacity|Retention and Overflow) .+ must state one exact same-line backticked value$/,
      "STORY_RISK_CONTRACT_FIELD_LITERAL",
    ],
    [
      /^security fixture row \d+ must declare five columns$/,
      "STORY_MATRIX_ROW_COLUMNS",
    ],
    [
      /^security fixture row \d+ leaves (source field|payload|persisted locations|verification) unspecified$/,
      "STORY_MATRIX_CELL_UNSPECIFIED",
    ],
    [
      /^security fixture row \d+ states (source field|payload|persisted locations|verification) as prose instead of an exact value$/,
      "STORY_MATRIX_CELL_PROSE",
    ],
    [
      /^security fixture row \d+ expected result must be preserve, redact, reject, or omit$/,
      "STORY_MATRIX_EXPECTED_RESULT",
    ],
  ];
  const matched = dynamic.find(([pattern]) => pattern.test(message));
  if (matched === undefined) return undefined;
  const result = matched[0].exec(message);
  const resolvedCode =
    typeof matched[1] === "function" ? matched[1](result) : matched[1];
  return { code: resolvedCode, message };
}

/** Strictly maps only retained checker diagnostic/result lines to Core values. */
function normalizeLegacyDiagnostic(diagnostic) {
  const issues = [];
  let resultLine;

  for (const line of diagnostic.split("\n")) {
    if (line === "") continue;
    if (line.startsWith("FAIL  ")) {
      const separator = line.indexOf(": ");
      if (separator < 0) return { ok: false };
      const mapped = issueForLegacyMessage(line.slice(separator + 2));
      if (mapped === undefined) return { ok: false };
      issues.push(mapped);
      continue;
    }
    if (line.startsWith("ERROR ") || line.startsWith("WARN "))
      return { ok: false };
    if (
      line === "Result: STORY_CONTRACT_OK" ||
      line === "Result: STORY_CONTRACT_INCOMPLETE" ||
      line === "Result: STORY_READINESS_OK" ||
      line === "Result: STORY_READINESS_INCOMPLETE"
    ) {
      if (resultLine !== undefined) return { ok: false };
      resultLine = line;
      continue;
    }
    return { ok: false };
  }

  if (
    (resultLine === "Result: STORY_CONTRACT_OK" ||
      resultLine === "Result: STORY_READINESS_OK") &&
    issues.length === 0
  )
    return {
      ok: true,
      value: {
        ...resultBase,
        status: "pass",
        outcome: "success",
        exit: 0,
        issues: [],
      },
    };
  if (
    (resultLine === "Result: STORY_CONTRACT_INCOMPLETE" ||
      resultLine === "Result: STORY_READINESS_INCOMPLETE") &&
    issues.length > 0
  )
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

  return { ok: false };
}

function diagnosticLines(output) {
  const ignored = [
    /^$/,
    /^ForgeFlow Story Contract Check$/,
    /^INFO {2}.+: Story ID .+$/,
    /^PASS {2}.+: classification security=(yes|no) baseline=(yes|no)$/,
    /^Stories checked: \d+$/,
    /^Structure: STORY_CONTRACT_(OK|INCOMPLETE)$/,
    /^Minimum content only, not human-approved READY\. Run make verify and human review\.$/,
    /^Fill the reported structure or minimum content, then recheck\.$/,
    /^Next:$/,
    /^Static Story structure only\. Run make verify and human review\.$/,
    /^Record the missing classification, conditional contract, fixture$/,
    /^matrix, or superseded behavior in the Story, then recheck\.$/,
  ];

  return output
    .split("\n")
    .filter((line) => !ignored.some((pattern) => pattern.test(line)))
    .join("\n");
}

/** The per-subject facts both implementations must agree on. */
function legacyEvidence(output) {
  const facts = [];

  for (const line of output.split("\n")) {
    const identified = /^INFO {2}(.+): Story ID (.+)$/.exec(line);
    if (identified) {
      facts.push({ label: identified[1], storyId: identified[2] });
      continue;
    }
    const passed =
      /^PASS {2}(.+): classification security=(yes|no) baseline=(yes|no)$/.exec(
        line,
      );
    if (passed)
      facts.push({
        label: passed[1],
        security: passed[2],
        baseline: passed[3],
      });
    const checked = /^Stories checked: (\d+)$/.exec(line);
    if (checked) facts.push({ checked: Number(checked[1]) });
    const structure = /^Structure: STORY_CONTRACT_(OK|INCOMPLETE)$/.exec(line);
    if (structure) facts.push({ structure: structure[1] });
  }

  return facts;
}

function typescriptEvidence(execution) {
  const facts = [];

  for (const entry of execution.entries) {
    if (entry.kind !== "story") continue;
    if (entry.facts.storyId !== undefined)
      facts.push({ label: entry.label, storyId: entry.facts.storyId });
    if (entry.structureIssues.length === 0)
      facts.push({
        label: entry.label,
        security: entry.facts.securitySensitive === true ? "yes" : "no",
        baseline: entry.facts.baselineConformance === true ? "yes" : "no",
      });
  }
  if (execution.ready)
    facts.push({
      structure: execution.entries.some(
        (entry) => entry.kind === "story" && entry.structureIssues.length > 0,
      )
        ? "INCOMPLETE"
        : "OK",
    });
  facts.push({ checked: execution.checked });

  return facts;
}

async function legacyOutcome(fixture, args, observe) {
  let output;
  let exit = 0;
  try {
    ({ stdout: output } = await execFile(storyCheck, args, {
      cwd: fixture,
      encoding: "utf8",
      // The TypeScript reader is locale independent by contract, so the
      // retained checker's glob is pinned to the matching byte collation.
      env: { ...globalThis.process.env, LC_ALL: "C" },
    }));
  } catch (error) {
    output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    exit = error.code;
  }

  const normalized = normalizeLegacyDiagnostic(diagnosticLines(output));
  observe.evidence(legacyEvidence(output));
  return {
    result: normalized.ok ? normalized.value : { invalid: true },
    issues: normalized.ok ? normalized.value.issues : [],
    exit,
    legacyDiagnostic: diagnosticLines(output),
  };
}

async function typescriptOutcome(fixture, args, observe) {
  const execution = await runStoryCheck(
    args,
    createNodeStoryReader(undefined, fixture),
  );
  observe.evidence(typescriptEvidence(execution));
  return {
    result: execution.result,
    issues: execution.result.issues,
    exit: execution.result.exit,
  };
}

async function writeCase(fixture, story, acceptance) {
  const directory = join(fixture, caseStory);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "story.md"), story);
  await writeFile(
    join(directory, "acceptance.md"),
    acceptance ?? plainAcceptance,
  );
}

async function assertParity(name, story, options = {}) {
  const { acceptance, args = [caseStory], extend } = options;
  const prepare = async (fixture) => {
    if (story !== undefined) await writeCase(fixture, story, acceptance);
    if (extend !== undefined) await extend(fixture);
  };
  const parity = await runDifferentialParity({
    fixtureSource,
    legacy: async ({ fixture, observe }) => {
      await prepare(fixture);
      return legacyOutcome(fixture, args, observe);
    },
    typescript: async ({ fixture, observe }) => {
      await prepare(fixture);
      return typescriptOutcome(fixture, args, observe);
    },
    normalizeLegacyDiagnostic,
  });
  assert.deepEqual(parity, { ok: true, mismatches: [] }, name);
}

const base = `# Story: TST-901 Fixture

## Goal

Provide a deterministic Story fixture.

## Classification

* Security sensitive: no
* Baseline conformance: no
`;

function withClassification(...entries) {
  return base.replace(
    "* Baseline conformance: no\n",
    `* Baseline conformance: no\n${entries.join("\n")}\n`,
  );
}

function replaceClassification(...entries) {
  return base.replace(
    "* Security sensitive: no\n* Baseline conformance: no\n",
    `${entries.join("\n")}\n`,
  );
}

function withSection(heading, ...entries) {
  return `${base}\n${heading}\n\n${entries.join("\n")}\n`;
}

const matrixHeader =
  "| Source field | Payload | Expected result | Persisted locations | Verification |";
const separator = "| --- | --- | --- | --- | --- |";

function acceptanceWithMatrix(...rows) {
  return `# Acceptance Criteria\n\n## Security Fixture Matrix\n\n${matrixHeader}\n${separator}\n${rows
    .map((row) => `${row}\n`)
    .join("")}`;
}

const evidenceHeader =
  "| AC | Method | Evidence | Fixture / precondition | Expected observation |";
const evidenceSeparator = "| --- | --- | --- | --- | --- |";

function readyStory(...sections) {
  return `# Story: TST-901 Fixture

## Goal

Provide a deterministic Story fixture.

## Scope

* Check Story readiness.

## Classification

* Security sensitive: no
* Baseline conformance: no
${sections.length === 0 ? "" : `\n${sections.join("\n\n")}\n`}`;
}

function readyAcceptance(criteria = "* [ ] AC-001: Fixture.", ...rows) {
  return `# Acceptance Criteria

## Happy Path

${criteria}

## Acceptance Evidence

${evidenceHeader}
${evidenceSeparator}
${rows.length === 0 ? "| `AC-001` | test | `test` | `fixture` | `pass` |" : rows.join("\n")}
`;
}

function readinessRiskStory(signal, heading, fields) {
  return readyStory(
    `## Risk

* Level: low
* Signal: \`${signal}\``,
    `${heading}

${fields.map(([label, value]) => `* ${label}: \`${value}\``).join("\n")}`,
  );
}

async function assertReadinessParity(name, story, options = {}) {
  const args = ["--ready", ...(options.args ?? [caseStory])];
  await assertParity(name, story, { ...options, args });
}

test("TST007-AC-002: identity and classification have retained-checker parity", async () => {
  await assertParity("bare", base);
  await assertParity("discovery", base, { args: [] });
  await assertParity("baseline-only", undefined, { args: [] });

  for (const entries of [
    ["* Baseline conformance: no"],
    ["* Security sensitive: no"],
    [],
    [
      "* Security sensitive: no",
      "* Security sensitive: yes",
      "* Baseline conformance: no",
    ],
    ["* Security sensitive: maybe", "* Baseline conformance: no"],
    ["* Security sensitive: no", "* Baseline conformance: maybe"],
    ["- Security sensitive: no", "- Baseline conformance: no"],
    ["*   Security sensitive:   no   ", "* Baseline conformance: no"],
  ])
    await assertParity(
      `classification-${entries.length}-${entries.join("|")}`,
      replaceClassification(...entries),
    );

  await assertParity(
    "classification-fenced",
    replaceClassification(
      "```markdown",
      "* Security sensitive: yes",
      "```",
      "* Security sensitive: no",
      "* Baseline conformance: no",
    ),
  );
});

test("TST007-AC-003: task mode and authority have retained-checker parity", async () => {
  for (const mode of [
    "architecture",
    "execution",
    "evidence",
    "mixed",
    "refactor",
    "",
  ])
    await assertParity(
      `task-mode-${mode || "empty"}`,
      withClassification(`* Task mode: ${mode}`),
    );

  await assertParity(
    "task-mode-repeated",
    withClassification("* Task mode: evidence", "* Task mode: mixed"),
  );

  const authorities = [
    ["chain-deploy", ["* deploy: yes"]],
    ["chain-push", ["* push: yes"]],
    ["chain-commit", ["* commit: yes", "* modify: no"]],
    [
      "full",
      [
        "* plan: yes",
        "* modify: yes",
        "* commit: yes",
        "* push: yes",
        "* deploy: yes",
      ],
    ],
    ["unknown", ["* teleport: yes"]],
    ["repeated", ["* commit: no", "* commit: yes"]],
    ["invalid-value", ["* commit: perhaps"]],
    ["empty-value", ["* commit:"]],
    ["prose", ["* just prose"]],
    ["dash-bullets", ["- modify: no", "- commit: no"]],
  ];
  for (const [name, entries] of authorities)
    await assertParity(
      `authority-${name}`,
      withSection("## Authority", ...entries),
    );

  await assertParity(
    "authority-repeated-section",
    `${base}\n## Authority\n\n* plan: yes\n\n## Authority\n\n* plan: yes\n`,
  );
  await assertParity(
    "authority-fenced",
    withSection("## Authority", "~~~", "* deploy: yes", "~~~"),
  );
  await assertParity(
    "evidence-mutating",
    `${withClassification("* Task mode: evidence")}\n## Authority\n\n* modify: yes\n* commit: yes\n`,
  );
});

test("TST007-AC-002: architecture declarations have retained-checker parity", async () => {
  const cases = [
    ["impact-medium-bare", ["* Impact: medium"]],
    ["impact-high-bare", ["* Impact: high"]],
    ["impact-bogus", ["* Impact: enormous"]],
    ["impact-repeated", ["* Impact: low", "* Impact: high"]],
    ["unknown-label", ["* Nonsense: `x`"]],
    ["prose-boundary", ["* Boundary: not backticked"]],
    ["placeholder-boundary", ["* Boundary: `TBD`"]],
    ["angle-placeholder-boundary", ["* Boundary: `<evidence>`"]],
    ["owner-malformed", ["* Boundary: `A`", "* Owner: `A and B`"]],
    ["owner-empty", ["* Boundary: `A`", "* Owner: `A = `"]],
    ["owner-undeclared", ["* Boundary: `A`", "* Owner: `B = team`"]],
    ["owner-declared", ["* Boundary: `A`", "* Owner: `A = team`"]],
    ["decision-repeated", ["* Decision: `ADR-001`", "* Decision: `ADR-001`"]],
    ["decision-malformed", ["* Decision: `ADR-abc`"]],
    ["decision-missing", ["* Decision: `ADR-001`"]],
    ["entry-prose", ["* just prose"]],
    [
      "contract-satisfies-impact",
      ["* Impact: medium", "* Contract: `a contract`"],
    ],
  ];
  for (const [name, entries] of cases)
    await assertParity(
      `architecture-${name}`,
      withSection("## Architecture", ...entries),
    );

  await assertParity(
    "architecture-repeated-section",
    `${base}\n## Architecture\n\n* Impact: low\n\n## Architecture\n\n* Impact: low\n`,
  );
});

test("TST007-AC-004: referenced decisions have retained-checker parity", async () => {
  const story = withSection("## Architecture", "* Decision: `ADR-001`");

  const writeDecision = (name, body) => async (fixture) => {
    await mkdir(join(fixture, "specs", "decisions"), { recursive: true });
    await writeFile(join(fixture, "specs", "decisions", name), body);
  };

  for (const status of [
    "accepted",
    "proposed",
    "superseded",
    "rejected",
    "invented",
  ])
    await assertParity(`decision-${status}`, story, {
      extend: writeDecision("ADR-001.md", `# ADR-001\n\n* Status: ${status}\n`),
    });

  await assertParity("decision-no-status", story, {
    extend: writeDecision("ADR-001.md", "# ADR-001\n\nNo status at all.\n"),
  });
  await assertParity("decision-repeated-status", story, {
    extend: writeDecision(
      "ADR-001.md",
      "# ADR-001\n\n* Status: accepted\n* Status: proposed\n",
    ),
  });
  await assertParity("decision-slugged", story, {
    extend: writeDecision(
      "ADR-001-some-slug.md",
      "# ADR-001\n\n* Status: accepted\n",
    ),
  });
  await assertParity("decision-ambiguous", story, {
    extend: async (fixture) => {
      await mkdir(join(fixture, "specs", "decisions"), { recursive: true });
      await writeFile(
        join(fixture, "specs", "decisions", "ADR-001.md"),
        "# ADR-001\n\n* Status: accepted\n",
      );
      await writeFile(
        join(fixture, "specs", "decisions", "ADR-001-other.md"),
        "# ADR-001\n\n* Status: accepted\n",
      );
    },
  });
  await assertParity(
    "decision-proposed-architecture-mode",
    `${withClassification("* Task mode: architecture")}\n## Architecture\n\n* Decision: \`ADR-001\`\n`,
    {
      extend: writeDecision("ADR-001.md", "# ADR-001\n\n* Status: proposed\n"),
    },
  );
});

test("TST007-AC-002: risk and its contracts have retained-checker parity", async () => {
  const cases = [
    ["level-medium-bare", ["* Level: medium"]],
    ["level-high-bare", ["* Level: high"]],
    ["level-bogus", ["* Level: spicy"]],
    ["level-repeated", ["* Level: low", "* Level: high"]],
    ["reason-prose", ["* Level: medium", "* Reason: prose"]],
    ["reason-literal", ["* Level: medium", "* Reason: `slow`"]],
    ["understated", ["* Level: medium", "* Reason: `data-loss`"]],
    ["understated-low", ["* Level: low", "* Reason: `public-contract`"]],
    ["high-signal-at-high", ["* Level: high", "* Reason: `public-contract`"]],
    ["unknown-label", ["* Nonsense: `x`"]],
    ["entry-prose", ["* just prose"]],
    ["signal-unknown", ["* Level: low", "* Signal: `nonsense`"]],
    ["signal-prose", ["* Level: low", "* Signal: prose"]],
    ["signal-placeholder", ["* Level: low", "* Signal: `TBD`"]],
    [
      "signal-repeated",
      ["* Level: low", "* Signal: `concurrency`", "* Signal: `concurrency`"],
    ],
  ];
  for (const [name, entries] of cases)
    await assertParity(`risk-${name}`, withSection("## Risk", ...entries));

  await assertParity(
    "risk-repeated-section",
    `${base}\n## Risk\n\n* Level: low\n\n## Risk\n\n* Level: low\n`,
  );

  const contracts = [
    ["error-projection", "## Error Projection", "Source failure"],
    ["concurrency", "## Concurrency", "Contended resource"],
    ["bounded-capacity", "## Capacity", "Bounded resource"],
    ["retention-overflow", "## Retention and Overflow", "Retained resource"],
  ];

  for (const [signal, heading, field] of contracts) {
    const declare = (...entries) =>
      `${base}\n## Risk\n\n* Level: low\n* Signal: \`${signal}\`\n${
        entries.length === 0 ? "" : `\n${heading}\n\n${entries.join("\n")}\n`
      }`;

    await assertParity(`contract-${signal}-absent`, declare());
    await assertParity(
      `contract-${signal}-partial`,
      declare(`* ${field}: \`x\``),
    );
    await assertParity(
      `contract-${signal}-prose`,
      declare(`* ${field}: prose`),
    );
    await assertParity(
      `contract-${signal}-unknown`,
      declare("* Nonsense: `x`"),
    );
    await assertParity(`contract-${signal}-entry`, declare("* just prose"));
    await assertParity(
      `contract-${signal}-placeholder`,
      declare(`* ${field}: \`TBD\``),
    );
    await assertParity(
      `contract-${signal}-repeated-section`,
      `${declare(`* ${field}: \`x\``)}\n${heading}\n\n* ${field}: \`x\`\n`,
    );
  }
});

test("TST007-AC-002: conditional sections have retained-checker parity", async () => {
  const secure = replaceClassification(
    "* Security sensitive: yes",
    "* Baseline conformance: no",
  );
  const trust = `${secure}\n## Trust Boundary Fields\n\n* \`field\`\n`;
  const goodRow = "| `a` | `b` | preserve | `c` | `d` |";

  await assertParity("security-yes-no-matrix", trust);
  await assertParity("security-yes-empty-matrix", trust, {
    acceptance: acceptanceWithMatrix(),
  });
  await assertParity("security-yes-complete", trust, {
    acceptance: acceptanceWithMatrix(goodRow),
  });
  await assertParity("security-yes-no-trust", secure, {
    acceptance: acceptanceWithMatrix(goodRow),
  });
  await assertParity(
    "security-yes-prose-trust",
    `${secure}\n## Trust Boundary Fields\n\n* prose only\n`,
    { acceptance: acceptanceWithMatrix(goodRow) },
  );
  await assertParity(
    "security-yes-placeholder-trust",
    `${secure}\n## Trust Boundary Fields\n\n* TBD\n`,
    { acceptance: acceptanceWithMatrix(goodRow) },
  );
  await assertParity("security-no-with-matrix", base, {
    acceptance: acceptanceWithMatrix(goodRow),
  });

  const rows = [
    ["columns", "| `a` | `b` |"],
    ["placeholder", "| <source> | `b` | preserve | `c` | `d` |"],
    ["prose", "| prose | `b` | preserve | `c` | `d` |"],
    ["expected", "| `a` | `b` | mangle | `c` | `d` |"],
    ["escaped-pipe", "| `a\\|b` | `b` | preserve | `c` | `d` |"],
    ["empty-cells", "|  |  |  |  |  |"],
  ];
  for (const [name, row] of rows)
    await assertParity(`matrix-row-${name}`, trust, {
      acceptance: acceptanceWithMatrix(row),
    });

  await assertParity("matrix-bad-header", trust, {
    acceptance: `# Acceptance Criteria\n\n## Security Fixture Matrix\n\n| Wrong | Header |\n${separator}\n${goodRow}\n`,
  });
  await assertParity("matrix-bad-separator", trust, {
    acceptance: `# Acceptance Criteria\n\n## Security Fixture Matrix\n\n${matrixHeader}\n| -- | -- |\n${goodRow}\n`,
  });

  const baseline = replaceClassification(
    "* Security sensitive: no",
    "* Baseline conformance: yes",
  );
  await assertParity("baseline-yes-bare", baseline);
  await assertParity(
    "baseline-yes-literal",
    `${baseline}\n## Superseded Behavior\n\n* \`tests/x.sh\`\n`,
  );
  await assertParity(
    "baseline-yes-prose",
    `${baseline}\n## Superseded Behavior\n\n* prose only\n`,
  );
  await assertParity(
    "baseline-yes-placeholder",
    `${baseline}\n## Superseded Behavior\n\n* TBD\n`,
  );
  await assertParity(
    "baseline-no-with-superseded",
    `${base}\n## Superseded Behavior\n\n* \`tests/x.sh\`\n`,
  );
});

test("TST007-AC-002: declared lists expand as the retained checker expands them", async () => {
  // The checker iterates its decision and reason lists unquoted, so a value
  // carrying inner whitespace becomes several entries.
  await assertParity(
    "decision-inner-whitespace",
    withSection("## Architecture", "* Decision: `ADR-1 ADR-2`"),
  );
  await assertParity(
    "decision-glob-character",
    withSection("## Architecture", "* Decision: `ADR-*`"),
  );
  await assertParity(
    "reason-inner-whitespace-high-risk",
    withSection("## Risk", "* Level: medium", "* Reason: `slow data-loss`"),
  );
  await assertParity(
    "reason-inner-whitespace-plain",
    withSection("## Risk", "* Level: medium", "* Reason: `a b c`"),
  );
});

test("TST007-AC-005: repeated and malformed matrices have retained-checker parity", async () => {
  const secure = replaceClassification(
    "* Security sensitive: yes",
    "* Baseline conformance: no",
  );
  const trust = `${secure}\n## Trust Boundary Fields\n\n* \`field\`\n`;
  const goodRow = "| `a` | `b` | preserve | `c` | `d` |";

  // The header and separator flags are not reset per section, so a second
  // matrix section's first pipe row is read as a data row.
  await assertParity("matrix-repeated-section", trust, {
    acceptance: `# Acceptance Criteria\n\n## Security Fixture Matrix\n\n${matrixHeader}\n${separator}\n${goodRow}\n\n## Other\n\n## Security Fixture Matrix\n\n${matrixHeader}\n${separator}\n${goodRow}\n`,
  });
  // The matrix is read even when the Story declares no security sensitivity,
  // so row defects and the contradiction are reported together.
  await assertParity("matrix-malformed-non-security", base, {
    acceptance: `# Acceptance Criteria\n\n## Security Fixture Matrix\n\n${matrixHeader}\n${separator}\n| prose | <p> | mangle | prose | prose |\n`,
  });
  await assertParity("matrix-row-without-header", base, {
    acceptance: `# Acceptance Criteria\n\n## Security Fixture Matrix\n\n${goodRow}\n`,
  });
});

test("TST007-AC-005: hostile Markdown boundaries have retained-checker parity", async () => {
  await assertParity("crlf", base.split("\n").join("\r\n"));
  await assertParity("empty-label", withSection("## Risk", "* : value"));
  await assertParity("colon-only", withSection("## Risk", "* Level:"));
  await assertParity(
    "sub-heading",
    withSection("## Risk", "### Sub", "", "* Level: high"),
  );
  await assertParity(
    "fenced-risk",
    withSection("## Risk", "```", "* Level: high", "```"),
  );
  await assertParity("multiple-subjects", base, {
    args: [caseStory, "specs/stories/TST-900-baseline"],
  });
  await assertParity("repeated-subject", base, {
    args: [caseStory, caseStory],
  });
});

test("TST008-AC-002: readiness content, fences, and acceptance criteria have retained-checker parity", async () => {
  await assertReadinessParity("ready-complete", readyStory(), {
    acceptance: readyAcceptance(),
  });
  await assertReadinessParity(
    "ready-goal-scope-placeholders",
    readyStory().replace(
      "Provide a deterministic Story fixture.\n\n## Scope\n\n* Check Story readiness.",
      "<goal>\n\n## Scope\n\n* <scope>",
    ),
    { acceptance: readyAcceptance() },
  );
  await assertReadinessParity(
    "ready-non-english-and-technical-content",
    readyStory().replace(
      "Provide a deterministic Story fixture.\n\n## Scope\n\n* Check Story readiness.",
      "驗證契約。\n\n## Scope\n\n* `<T>` remains valid content.",
    ),
    { acceptance: readyAcceptance("* [ ] AC-001: 驗證 `<T>`。") },
  );
  await assertReadinessParity(
    "ready-fenced-content-is-ignored",
    readyStory().replace(
      "Provide a deterministic Story fixture.",
      "```markdown\n<goal>\n```\n\nProvide a deterministic Story fixture.",
    ),
    { acceptance: readyAcceptance() },
  );
  await assertReadinessParity("ready-missing-checkbox", readyStory(), {
    acceptance: readyAcceptance("* AC-001: not a checkbox"),
  });
  await assertReadinessParity(
    "ready-duplicate-and-placeholder-checkbox",
    readyStory(),
    {
      acceptance: readyAcceptance(
        "* [ ] AC-001: <acceptance criterion>\n* [x] AC-001: Fixture.",
        "| `AC-001` | test | `test` | `fixture` | `pass` |",
      ),
    },
  );
});

test("TST008-AC-002: readiness evidence tables have retained-checker parity", async () => {
  await assertReadinessParity("ready-evidence-missing", readyStory(), {
    acceptance: "# Acceptance Criteria\n\n* [ ] AC-001: Fixture.\n",
  });
  await assertReadinessParity("ready-evidence-header", readyStory(), {
    acceptance: `# Acceptance Criteria

* [ ] AC-001: Fixture.

## Acceptance Evidence

| Wrong | Header |
${evidenceSeparator}
| \`AC-001\` | test | \`test\` | \`fixture\` | \`pass\` |
`,
  });
  await assertReadinessParity(
    "ready-evidence-separator-and-pipe",
    readyStory(),
    {
      acceptance: readyAcceptance(
        "* [ ] AC-001: Fixture.",
        "| `AC-001` | test | `a|b` | `fixture` | `pass` |",
      ).replace(evidenceSeparator, "| -- | -- |"),
    },
  );
  await assertReadinessParity("ready-evidence-cells", readyStory(), {
    acceptance: readyAcceptance(
      "* [ ] AC-001: Fixture.",
      "| `AC-002` | machine | `<evidence>` | prose | `pass` |",
      "| `AC-002` | test | `test` | `fixture` | `pass` |",
    ),
  });
  await assertReadinessParity("ready-evidence-tail", readyStory(), {
    acceptance: readyAcceptance(
      "* [ ] AC-001: Fixture.",
      "| `AC-001` | test | `test` | `fixture` | `pass` | trailing-garbage",
    ),
  });
  await assertReadinessParity("ready-evidence-repeated-section", readyStory(), {
    acceptance: `${readyAcceptance()}
## Acceptance Evidence

${evidenceHeader}
${evidenceSeparator}
| \`AC-001\` | test | \`test\` | \`fixture\` | \`pass\` |
`,
  });
});

test("TST008-AC-002: readiness risk evidence and placeholders have retained-checker parity", async () => {
  const contracts = [
    [
      "error-projection",
      "## Error Projection",
      [
        ["Source failure", "<source failure>"],
        ["Public projection", "public"],
        ["Detail policy", "detail"],
        ["Evidence AC", "AC-002"],
      ],
    ],
    [
      "concurrency",
      "## Concurrency",
      [
        ["Contended resource", "resource"],
        ["Linearization point", "point"],
        ["Conflict outcome", "conflict"],
        ["Evidence AC", "<evidence ac>"],
      ],
    ],
    [
      "bounded-capacity",
      "## Capacity",
      [
        ["Bounded resource", "resource"],
        ["Limit", "<limit>"],
        ["Saturation behavior", "saturate"],
        ["Failure projection", "failure"],
        ["Evidence AC", "AC-001"],
      ],
    ],
    [
      "retention-overflow",
      "## Retention and Overflow",
      [
        ["Retained resource", "resource"],
        ["Retention bound", "bound"],
        ["Overflow policy", "overflow"],
        ["Recovery / observability", "<recovery / observability>"],
        ["Evidence AC", "AC-001"],
      ],
    ],
  ];
  for (const [signal, heading, fields] of contracts)
    await assertReadinessParity(
      `ready-risk-${signal}`,
      readinessRiskStory(signal, heading, fields),
      { acceptance: readyAcceptance() },
    );

  await assertReadinessParity(
    "ready-risk-interleaves-placeholder-and-structure",
    readyStory(
      `## Risk

* Level: low
* Signal: \`error-projection\``,
      `## Error Projection

* Source failure: \`<source failure>\`
* Detail policy: \`detail\`
* Evidence AC: \`AC-001\``,
    ),
    { acceptance: readyAcceptance() },
  );
});

test("TST007-AC-002: independent review findings stay fixed", async () => {
  // Whitespace is the C-locale [:space:] class, so a non-breaking space is
  // content rather than blank.
  await assertParity(
    "nbsp-contract",
    withSection("## Architecture", "* Impact: high", "* Contract: `\u00a0`"),
  );
  await assertParity(
    "nbsp-matrix-cell",
    `${replaceClassification("* Security sensitive: yes", "* Baseline conformance: no")}\n## Trust Boundary Fields\n\n* \`field\`\n`,
    {
      acceptance: `# Acceptance Criteria\n\n## Security Fixture Matrix\n\n${matrixHeader}\n${separator}\n| \`\u00a0\` | \`b\` | preserve | \`c\` | \`d\` |\n`,
    },
  );
  await assertParity(
    "nbsp-trust-bullet",
    `${replaceClassification("* Security sensitive: yes", "* Baseline conformance: no")}\n## Trust Boundary Fields\n\n* \`\u00a0\`\n`,
    {
      acceptance: `# Acceptance Criteria\n\n## Security Fixture Matrix\n\n${matrixHeader}\n${separator}\n| \`a\` | \`b\` | preserve | \`c\` | \`d\` |\n`,
    },
  );

  // The checker tests repeat membership on its space-joined reference list, so
  // a token already present is a repeat even when declared inside a longer
  // value, while a mere prefix is not.
  for (const [name, entries] of [
    ["multi-then-single", ["* Decision: `ADR-1 ADR-2`", "* Decision: `ADR-1`"]],
    ["single-then-multi", ["* Decision: `ADR-1`", "* Decision: `ADR-1 ADR-2`"]],
    ["multi-then-second", ["* Decision: `ADR-1 ADR-2`", "* Decision: `ADR-2`"]],
    [
      "overlapping-multi",
      ["* Decision: `ADR-1 ADR-2`", "* Decision: `ADR-2 ADR-3`"],
    ],
    ["prefix-is-not-a-token", ["* Decision: `ADR-1`", "* Decision: `ADR-11`"]],
    [
      "three-references",
      ["* Decision: `ADR-1`", "* Decision: `ADR-2`", "* Decision: `ADR-1`"],
    ],
  ])
    await assertParity(
      `decision-repeat-${name}`,
      withSection("## Architecture", ...entries),
    );

  // A repeated risk contract section still reports its bullet defects, because
  // the checker scans every occurrence before judging the heading count.
  await assertParity(
    "repeated-contract-keeps-bullet-defects",
    `${base}\n## Risk\n\n* Level: low\n* Signal: \`concurrency\`\n\n## Concurrency\n\n* Bogus label: \`x\`\n\n## Concurrency\n\n* Contended resource: \`r\`\n`,
  );
  await assertParity(
    "repeated-contract-keeps-entry-defects",
    `${base}\n## Risk\n\n* Level: low\n* Signal: \`error-projection\`\n\n## Error Projection\n\n* just prose\n\n## Error Projection\n\n* Source failure: \`s\`\n`,
  );
});

test("TST007-AC-004: a decision status is read strictly", async () => {
  const story = withSection("## Architecture", "* Decision: `ADR-1`");
  const writeDecision = (body) => async (fixture) => {
    await mkdir(join(fixture, "specs", "decisions"), { recursive: true });
    await writeFile(
      join(fixture, "specs", "decisions", "ADR-1.md"),
      `# ADR-1\n\n${body}\n`,
    );
  };

  // Only `* Status: <value>` with single spaces is a status declaration.
  for (const body of [
    "* Status: accepted",
    "- Status: accepted",
    "*   Status: accepted",
    "*  Status:  accepted",
    "* Status:",
    "* status: accepted",
    "Status: accepted",
    "* Status: accepted\n* Status: proposed",
  ])
    await assertParity(`decision-status-${body}`, story, {
      extend: writeDecision(body),
    });
});

test("TST007-AC-002: the corpus comparison detects a divergent Story", async () => {
  // Without this the suite could not distinguish a faithful implementation
  // from a comparison that always agrees.
  const divergent = await runDifferentialParity({
    fixtureSource,
    legacy: async ({ fixture, observe }) => {
      await writeCase(fixture, withSection("## Risk", "* Level: high"));
      return legacyOutcome(fixture, [caseStory], observe);
    },
    typescript: async ({ fixture, observe }) => {
      await writeCase(
        fixture,
        withSection("## Risk", "* Level: medium", "* Reason: `slow`"),
      );
      return typescriptOutcome(fixture, [caseStory], observe);
    },
    normalizeLegacyDiagnostic,
  });

  assert.equal(divergent.ok, false);
  assert.ok(divergent.mismatches.includes("mutation"));
});

test("TST007-AC-002: an unrecognized legacy diagnostic fails the comparison closed", async () => {
  assert.deepEqual(
    normalizeLegacyDiagnostic("FAIL  x: a message nobody maps"),
    {
      ok: false,
    },
  );
  assert.deepEqual(normalizeLegacyDiagnostic("WARN  x: anything"), {
    ok: false,
  });
  assert.deepEqual(normalizeLegacyDiagnostic("Result: SOMETHING_ELSE"), {
    ok: false,
  });
  // A clean result carrying diagnostics, and a defect result carrying none,
  // are both incoherent and must not normalize.
  assert.deepEqual(
    normalizeLegacyDiagnostic(
      "FAIL  x: risk reason must name one same-line backticked signal\nResult: STORY_CONTRACT_OK",
    ),
    { ok: false },
  );
  assert.deepEqual(
    normalizeLegacyDiagnostic("Result: STORY_CONTRACT_INCOMPLETE"),
    {
      ok: false,
    },
  );
});
