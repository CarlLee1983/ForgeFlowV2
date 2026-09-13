import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

import {
  createNodeStoryReader,
  renderVerificationHuman,
  runVerificationCheck,
} from "../dist/verification.js";
import { runDifferentialParity } from "./support/differential-parity-harness.mjs";

const execFile = promisify(execFileCallback);
const fixtureSource = fileURLToPath(
  new globalThis.URL("./fixtures/verification-parity/", import.meta.url),
);
const verificationCheck = fileURLToPath(
  new globalThis.URL("../../../scripts/verification-check", import.meta.url),
);
const caseStory = "specs/stories/TST-901-case";
const resultBase = Object.freeze({
  schemaVersion: "1.0.0",
  protocolVersion: "0.9.0",
  subject: "verification",
});
const acceptance = `# Acceptance Criteria

## Happy Path

* [ ] AC-001: Fixture happy path.
`;

function issueForLegacyMessage(message) {
  const exact = new Map([
    [
      'Classification must declare "Task mode" at most once',
      "VERIFICATION_TASK_MODE_REPEATED",
    ],
    [
      "Task mode must be architecture, execution, evidence, or mixed",
      "VERIFICATION_TASK_MODE_INVALID",
    ],
    [
      'Architecture must declare "Impact" at most once',
      "VERIFICATION_ARCHITECTURE_IMPACT_REPEATED",
    ],
    [
      "Architecture impact must be low, medium, or high",
      "VERIFICATION_ARCHITECTURE_IMPACT_INVALID",
    ],
    [
      'Risk must declare "Level" at most once',
      "VERIFICATION_RISK_LEVEL_REPEATED",
    ],
    [
      "Risk level must be low, medium, or high",
      "VERIFICATION_RISK_LEVEL_INVALID",
    ],
    [
      "risk reason must name one same-line backticked signal",
      "VERIFICATION_RISK_REASON_INVALID",
    ],
    [
      "risk signal must name one same-line backticked signal",
      "VERIFICATION_RISK_SIGNAL_INVALID",
    ],
    [
      "architecture decision must name one exact backticked decision ID",
      "VERIFICATION_ARCHITECTURE_LITERAL_INVALID",
    ],
    [
      "architecture boundary must name one exact backticked boundary",
      "VERIFICATION_ARCHITECTURE_LITERAL_INVALID",
    ],
    [
      "architecture contract must state one exact backticked contract",
      "VERIFICATION_ARCHITECTURE_LITERAL_INVALID",
    ],
    [
      "architecture owner must state one exact backticked `<boundary> = <owner>`",
      "VERIFICATION_ARCHITECTURE_LITERAL_INVALID",
    ],
  ]);
  const code = exact.get(message);
  if (code !== undefined) return { code, message };

  const dynamic = [
    [
      /^Story must declare ## (Authority|Architecture|Risk) at most once$/,
      "VERIFICATION_SECTION_REPEATED",
    ],
    [
      /^authority entry is not a declaration: .+$/,
      "VERIFICATION_AUTHORITY_ENTRY_INVALID",
    ],
    [
      /^authority declares an unknown operation: .+$/,
      "VERIFICATION_AUTHORITY_UNKNOWN_OPERATION",
    ],
    [
      /^authority declares (plan|modify|add_dependency|migration|commit|push|deploy) more than once$/,
      "VERIFICATION_AUTHORITY_REPEATED",
    ],
    [
      /^authority (plan|modify|add_dependency|migration|commit|push|deploy) must be declared as yes or no$/,
      "VERIFICATION_AUTHORITY_VALUE_INVALID",
    ],
    [
      /^architecture entry is not a declaration: .+$/,
      "VERIFICATION_ARCHITECTURE_ENTRY_INVALID",
    ],
    [
      /^architecture declares an unknown label: .+$/,
      "VERIFICATION_ARCHITECTURE_UNKNOWN_LABEL",
    ],
    [
      /^risk entry is not a declaration: .+$/,
      "VERIFICATION_RISK_ENTRY_INVALID",
    ],
    [/^risk declares an unknown label: .+$/, "VERIFICATION_RISK_UNKNOWN_LABEL"],
    [/^risk signal is unknown: .+$/, "VERIFICATION_RISK_SIGNAL_UNKNOWN"],
    [
      /^risk signal declared more than once: .+$/,
      "VERIFICATION_RISK_SIGNAL_REPEATED",
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
      const separator = line.indexOf(": plan: ");
      if (separator < 0) return { ok: false };
      const mapped = issueForLegacyMessage(line.slice(separator + 8));
      if (mapped === undefined) return { ok: false };
      issues.push(mapped);
      continue;
    }
    if (line.startsWith("ERROR ") || line.startsWith("WARN "))
      return { ok: false };
    if (
      line === "Result: VERIFICATION_PLAN_OK" ||
      line === "Result: VERIFICATION_PLAN_INCOMPLETE"
    ) {
      if (resultLine !== undefined) return { ok: false };
      resultLine = line;
      continue;
    }
    return { ok: false };
  }

  if (resultLine === "Result: VERIFICATION_PLAN_OK" && issues.length === 0)
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
  if (
    resultLine === "Result: VERIFICATION_PLAN_INCOMPLETE" &&
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
    /^ForgeFlow Verification Check$/,
    /^[^ ].*:$/,
    /^ {2}(Task mode|Authority|Risk level|Architecture impact|Required checks): .+$/,
    /^Stories checked: \d+$/,
    /^A resolved plan only\. Run make verify, record the result, and take$/,
    /^the work to human review\.$/,
    /^Correct the reported task mode, authority, architecture, or risk$/,
    /^declaration in the Story, then run this check again\.$/,
  ];

  return output
    .split("\n")
    .filter((line) => !ignored.some((pattern) => pattern.test(line)))
    .join("\n");
}

function legacyEvidence(output) {
  const plans = [];
  let current;

  for (const line of output.split("\n")) {
    const heading = /^([^ ].*):$/.exec(line);
    if (heading && heading[1] !== "Next") {
      current = { label: heading[1] };
      plans.push(current);
      continue;
    }
    const declaration = /^ {2}([^:]+): (.+)$/.exec(line);
    if (declaration && current !== undefined)
      current[declaration[1]] = declaration[2];
    const checked = /^Stories checked: (\d+)$/.exec(line);
    if (checked) plans.push({ checked: Number(checked[1]) });
  }

  return plans;
}

async function legacyOutcome(fixture, args, observe) {
  let output;
  let exit = 0;
  try {
    ({ stdout: output } = await execFile(verificationCheck, args, {
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

function typescriptEvidence(execution) {
  const plans = [];
  for (const entry of execution.entries) {
    if (entry.kind !== "plan") continue;
    const { authority } = entry.plan;
    const granted = (value) => (value ? "yes" : "no");
    plans.push({
      label: entry.label,
      "Task mode": entry.plan.taskMode,
      Authority:
        `plan=${granted(authority.plan)}` +
        ` modify=${granted(authority.modify)}` +
        ` add_dependency=${granted(authority.add_dependency)}` +
        ` migration=${granted(authority.migration)}` +
        ` commit=${granted(authority.commit)}` +
        ` push=${granted(authority.push)}` +
        ` deploy=${granted(authority.deploy)}`,
      "Risk level": entry.plan.riskLevel,
      "Architecture impact": entry.plan.architectureImpact,
      "Required checks": entry.plan.requiredChecks.join(" "),
    });
  }
  plans.push({ checked: execution.checked });
  return plans;
}

async function typescriptOutcome(fixture, args, observe) {
  const execution = await runVerificationCheck(
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

async function writeCase(fixture, story) {
  const directory = join(fixture, caseStory);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "story.md"), story);
  await writeFile(join(directory, "acceptance.md"), acceptance);
}

async function assertParity(name, story, args = [caseStory], extend) {
  const prepare = async (fixture) => {
    if (story !== undefined) await writeCase(fixture, story);
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

function withClassification(entry) {
  return base.replace(
    "* Baseline conformance: no\n",
    `* Baseline conformance: no\n${entry}\n`,
  );
}

function withSection(heading, ...entries) {
  return `${base}\n${heading}\n\n${entries.join("\n")}\n`;
}

test("TST005-AC-002: defaults and task modes have retained-checker parity", async () => {
  await assertParity("bare", base);
  await assertParity("discovery", base, []);
  await assertParity("baseline-only", undefined, []);

  for (const mode of [
    "architecture",
    "execution",
    "evidence",
    "mixed",
    "refactor",
    "Execution",
    "",
  ])
    await assertParity(
      `task-mode-${mode || "empty"}`,
      withClassification(`* Task mode: ${mode}`),
    );

  await assertParity(
    "task-mode-repeated",
    withClassification("* Task mode: evidence\n* Task mode: mixed"),
  );
  await assertParity(
    "task-mode-fenced",
    withClassification("```markdown\n* Task mode: evidence\n```"),
  );
});

test("TST005-AC-002: authority declarations have retained-checker parity", async () => {
  const cases = [
    [
      "full",
      [
        "* plan: yes",
        "* modify: yes",
        "* add_dependency: yes",
        "* migration: yes",
        "* commit: yes",
        "* push: yes",
        "* deploy: yes",
      ],
    ],
    ["denied", ["* plan: no", "* modify: no"]],
    ["modify-only", ["* modify: yes"]],
    ["unknown", ["* merge: yes"]],
    ["repeated", ["* modify: yes", "* modify: no"]],
    ["invalid-value", ["* modify: maybe"]],
    ["empty-value", ["* modify:"]],
    ["prose", ["* an authority note"]],
    ["dash-bullets", ["- modify: no", "- commit: no"]],
    ["padded", ["*   modify:   no   "]],
    [
      "mixed-defects",
      [
        "* prose",
        "* merge: yes",
        "* modify: yes",
        "* modify: no",
        "* commit: maybe",
      ],
    ],
  ];

  for (const [name, entries] of cases)
    await assertParity(
      `authority-${name}`,
      withSection("## Authority", ...entries),
    );

  await assertParity(
    "authority-repeated-section",
    `${withSection("## Authority", "* modify: yes")}\n## Authority\n\n* commit: no\n`,
  );
  await assertParity(
    "authority-evidence-mode",
    `${withClassification("* Task mode: evidence")}\n## Authority\n\n* commit: no\n`,
  );
});

test("TST005-AC-002: architecture declarations have retained-checker parity", async () => {
  const cases = [
    ["impact-low", ["* Impact: low"]],
    ["impact-medium", ["* Impact: medium"]],
    ["impact-high", ["* Impact: high"]],
    ["impact-invalid", ["* Impact: critical"]],
    ["impact-repeated", ["* Impact: medium", "* Impact: high"]],
    [
      "literals",
      [
        "* Impact: high",
        "* Decision: `ADR-901`",
        "* Boundary: `Gateway`",
        "* Contract: `Gateway stays compatible`",
        "* Owner: `Gateway = gateway-domain`",
      ],
    ],
    ["decision-prose", ["* Impact: medium", "* Decision: ADR-901"]],
    ["boundary-placeholder", ["* Impact: medium", "* Boundary: `TBD`"]],
    ["contract-prose", ["* Impact: medium", "* Contract: stays compatible"]],
    ["owner-empty-literal", ["* Impact: medium", "* Owner: ``"]],
    ["owner-spaces-literal", ["* Impact: medium", "* Owner: `   `"]],
    ["unknown-label", ["* Impact: low", "* Layer: `domain`"]],
    ["prose", ["* an architecture note"]],
    [
      "fenced-example",
      ["```markdown", "* Impact: high", "```", "* Impact: medium"],
    ],
  ];

  for (const [name, entries] of cases)
    await assertParity(
      `architecture-${name}`,
      withSection("## Architecture", ...entries),
    );

  await assertParity(
    "architecture-repeated-section",
    `${withSection("## Architecture", "* Impact: medium")}\n## Architecture\n\n* Impact: medium\n`,
  );
});

test("TST005-AC-002: risk declarations have retained-checker parity", async () => {
  const cases = [
    ["level-low", ["* Level: low"]],
    ["level-medium", ["* Level: medium"]],
    ["level-high", ["* Level: high"]],
    ["level-invalid", ["* Level: critical"]],
    ["level-repeated", ["* Level: medium", "* Level: high"]],
    ["reason", ["* Level: high", "* Reason: `payment`"]],
    ["reason-prose", ["* Reason: a prose explanation"]],
    ["reason-placeholder", ["* Reason: `TBD`"]],
    ["reason-line-spanning", ["* Reason: `versioned-", "surface`"]],
    ["signal-error-projection", ["* Signal: `error-projection`"]],
    ["signal-concurrency", ["* Signal: `concurrency`"]],
    ["signal-bounded-capacity", ["* Signal: `bounded-capacity`"]],
    ["signal-retention-overflow", ["* Signal: `retention-overflow`"]],
    ["signal-unknown", ["* Signal: `unbounded-retry`"]],
    ["signal-prose", ["* Signal: concurrency"]],
    ["signal-repeated", ["* Signal: `concurrency`", "* Signal: `concurrency`"]],
    ["signal-fenced", ["```markdown", "* Signal: `concurrency`", "```"]],
    ["unknown-label", ["* Scope: `wide`"]],
    ["prose", ["* a risk note"]],
  ];

  for (const [name, entries] of cases)
    await assertParity(`risk-${name}`, withSection("## Risk", ...entries));

  await assertParity(
    "risk-repeated-section",
    `${withSection("## Risk", "* Level: medium")}\n## Risk\n\n* Level: medium\n`,
  );
});

test("TST005-AC-002: the required profile has retained-checker parity", async () => {
  for (const level of ["low", "medium", "high"])
    for (const impact of ["low", "medium", "high"])
      await assertParity(
        `profile-${level}-${impact}`,
        `${withSection("## Risk", `* Level: ${level}`)}\n## Architecture\n\n* Impact: ${impact}\n`,
      );
});

test("TST005-AC-002: layout variants have retained-checker parity", async () => {
  const declared = `${withClassification("* Task mode: mixed")}
## Authority

* modify: yes
* commit: yes

## Architecture

* Impact: medium
* Boundary: \`Gateway\`

## Risk

* Level: medium
* Reason: \`external-api\`
`;

  await assertParity("layout-declared", declared);
  await assertParity("layout-crlf", declared.replaceAll("\n", "\r\n"));
  await assertParity(
    "layout-trailing-whitespace",
    declared.replaceAll("\n", "   \n"),
  );
  await assertParity(
    "layout-indented-bullets",
    declared.replaceAll("\n* ", "\n  * "),
  );
  await assertParity(
    "layout-tilde-fence",
    `${declared}\n## Risk\n\n~~~markdown\n* Level: high\n~~~\n`,
  );
});

test("TST005-AC-002: multi-Story discovery has retained-checker parity", async () => {
  const failing = withSection("## Authority", "* merge: yes");

  await assertParity("discovery-failing-case", failing, []);
  await assertParity(
    "discovery-hidden-and-failing",
    failing,
    [],
    async (fixture) => {
      await mkdir(join(fixture, "specs", "stories", ".hidden"), {
        recursive: true,
      });
      await writeFile(
        join(fixture, "specs", "stories", ".hidden", "story.md"),
        withSection("## Risk", "* Level: critical"),
      );
      await writeFile(
        join(fixture, "specs", "stories", ".hidden", "acceptance.md"),
        acceptance,
      );
    },
  );
});

test("TST005-AC-002: collation changes presentation order only", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-collation-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const names = [
    "TST-1-Alpha",
    "TST-1-beta",
    "tst-1-gamma",
    "TST-10-delta",
    "TST-2-epsilon",
  ];

  for (const name of names) {
    const directory = join(root, "specs", "stories", name);
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, "story.md"),
      name === "TST-2-epsilon"
        ? withSection("## Risk", "* Level: critical")
        : base,
    );
    await writeFile(join(directory, "acceptance.md"), acceptance);
  }

  const runLegacy = async (collation) =>
    execFile(verificationCheck, [], {
      cwd: root,
      encoding: "utf8",
      env: { ...globalThis.process.env, LC_ALL: collation },
    }).catch((error) => ({
      stdout: `${error.stdout ?? ""}`,
      code: error.code,
    }));
  const execution = await runVerificationCheck(
    [],
    createNodeStoryReader(undefined, root),
  );
  const typescript = typescriptEvidence(execution);
  const byLabel = (entries) =>
    entries
      .filter((entry) => entry.label !== undefined)
      .sort((left, right) => (left.label < right.label ? -1 : 1));

  // The reader is locale independent, so it matches the byte collation exactly
  // and stays equivalent under any other collation the retained glob may use.
  const byteOrdered = await runLegacy("C");
  assert.equal(byteOrdered.code, 1);
  assert.equal(execution.result.exit, 1);
  assert.deepEqual(legacyEvidence(byteOrdered.stdout), typescript);

  const collated = await runLegacy("en_US.UTF-8");
  assert.equal(collated.code, 1);
  assert.deepEqual(
    byLabel(legacyEvidence(collated.stdout)),
    byLabel(typescript),
  );
  assert.deepEqual(
    legacyEvidence(collated.stdout).find(
      (entry) => entry.checked !== undefined,
    ),
    { checked: names.length },
  );
});

test("TST005-AC-002: the legacy normalizer fails closed outside its allow-list", () => {
  assert.deepEqual(
    normalizeLegacyDiagnostic(
      "FAIL  specs/stories/x: plan: unknown diagnostic\nResult: VERIFICATION_PLAN_INCOMPLETE",
    ),
    { ok: false },
  );
  assert.deepEqual(normalizeLegacyDiagnostic("Result: ERROR"), { ok: false });
  assert.deepEqual(
    normalizeLegacyDiagnostic("Result: VERIFICATION_PLAN_INCOMPLETE"),
    { ok: false },
  );
  assert.deepEqual(
    normalizeLegacyDiagnostic(
      "FAIL  specs/stories/x: authority declares an unknown operation: merge",
    ),
    { ok: false },
  );
});

test("TST005-AC-002: the corpus comparison detects a divergent plan", async () => {
  const divergent = await runDifferentialParity({
    fixtureSource,
    legacy: async ({ fixture, observe }) => {
      await writeCase(fixture, withSection("## Risk", "* Level: high"));
      return legacyOutcome(fixture, [caseStory], observe);
    },
    typescript: async ({ fixture, observe }) => {
      await writeCase(fixture, withSection("## Risk", "* Level: low"));
      return typescriptOutcome(fixture, [caseStory], observe);
    },
    normalizeLegacyDiagnostic,
  });

  assert.equal(divergent.ok, false);
  assert.deepEqual(divergent.mismatches, ["evidence", "mutation"]);
});

// --- Recorded result mode ---------------------------------------------------

/** Strictly maps only retained checker result-mode diagnostics to Core values. */
function issueForLegacyRecordMessage(text) {
  const exact = new Map([
    [
      "result: verification.md is missing, unreadable, or empty",
      "VERIFICATION_RECORD_UNAVAILABLE",
    ],
    [
      "result: verification.md must declare ## Checks exactly once",
      "VERIFICATION_CHECKS_SECTION_INVALID",
    ],
    [
      "result: verification.md must declare ## Evidence exactly once",
      "VERIFICATION_EVIDENCE_SECTION_INVALID",
    ],
    [
      "result: acceptance.md declares no checkbox AC to trace evidence to",
      "VERIFICATION_ACCEPTANCE_MISSING",
    ],
    [
      "result: every residual risk must be one exact backticked statement",
      "VERIFICATION_RESIDUAL_RISK_INVALID",
    ],
    [
      "result: incomplete verification must record at least one residual risk",
      "VERIFICATION_RESIDUAL_RISK_REQUIRED",
    ],
  ]);
  const dynamic = [
    [
      /^result: check entry is not a declaration: .+$/,
      "VERIFICATION_CHECK_ENTRY_INVALID",
    ],
    [/^result: unknown verification check: .+$/, "VERIFICATION_CHECK_UNKNOWN"],
    [
      /^result: verification check is recorded more than once: .+$/,
      "VERIFICATION_CHECK_REPEATED",
    ],
    [
      /^result: check \S+ status must be pass, fail, skipped, blocked, or unsupported$/,
      "VERIFICATION_CHECK_STATUS_INVALID",
    ],
    [
      /^result: check \S+ must name one exact backticked command or reason$/,
      "VERIFICATION_CHECK_DETAIL_INVALID",
    ],
    [
      /^result: evidence entry is not a declaration: .+$/,
      "VERIFICATION_EVIDENCE_ENTRY_INVALID",
    ],
    [
      /^result: evidence entry must name one exact backticked AC ID: .+$/,
      "VERIFICATION_EVIDENCE_AC_INVALID",
    ],
    [
      /^result: evidence names unknown AC ID: .+$/,
      "VERIFICATION_EVIDENCE_AC_UNKNOWN",
    ],
    [
      /^result: evidence duplicates AC ID: .+$/,
      "VERIFICATION_EVIDENCE_AC_REPEATED",
    ],
    [
      /^result: evidence \S+ status must be pass, fail, blocked, or skipped$/,
      "VERIFICATION_EVIDENCE_STATUS_INVALID",
    ],
    [
      /^result: evidence \S+ must name one exact backticked observation$/,
      "VERIFICATION_EVIDENCE_DETAIL_INVALID",
    ],
    [
      /^result: authority used names an unknown operation: .+$/,
      "VERIFICATION_AUTHORITY_USED_UNKNOWN",
    ],
    [
      /^authority conflict: \S+ was used but the Story does not grant it$/,
      "VERIFICATION_AUTHORITY_CONFLICT",
    ],
    [
      /^required check is not recorded: \S+$/,
      "VERIFICATION_REQUIRED_CHECK_NOT_RECORDED",
    ],
    [
      /^required check did not pass: \S+$/,
      "VERIFICATION_REQUIRED_CHECK_NOT_PASSED",
    ],
    [
      /^acceptance criterion has no passing evidence: \S+$/,
      "VERIFICATION_ACCEPTANCE_UNPROVEN",
    ],
  ];

  const code =
    exact.get(text) ??
    dynamic.find(([pattern]) => pattern.test(text))?.[1] ??
    undefined;
  if (code === undefined) return undefined;

  return {
    code,
    message: text.startsWith("result: ") ? text.slice(8) : text,
  };
}

const recordResults = new Map([
  [
    "Result: VERIFICATION_PASS",
    { status: "pass", outcome: "success", exit: 0 },
  ],
  [
    "Result: VERIFICATION_PARTIAL",
    { status: "fail", outcome: "failure", exit: 1 },
  ],
  [
    "Result: VERIFICATION_FAIL",
    { status: "fail", outcome: "failure", exit: 1 },
  ],
  [
    "Result: VERIFICATION_RESULT_INCOMPLETE",
    { status: "fail", outcome: "failure", exit: 1 },
  ],
]);

function normalizeLegacyRecordDiagnostic(diagnostic) {
  const issues = [];
  let resultLine;
  let planLine;

  for (const line of diagnostic.split("\n")) {
    if (line === "") continue;
    if (line.startsWith("FAIL  ") || line.startsWith("WARN  ")) {
      const labelled = line.slice(6);
      const separator = labelled.indexOf(": ");
      if (separator < 0) return { ok: false };
      const text = labelled.slice(separator + 2);
      const mapped = text.startsWith("plan: ")
        ? issueForLegacyMessage(text.slice(6))
        : issueForLegacyRecordMessage(text);
      if (mapped === undefined) return { ok: false };
      issues.push(mapped);
      continue;
    }
    if (line.startsWith("Plan: ")) {
      if (
        planLine !== undefined ||
        (line !== "Plan: VERIFICATION_PLAN_OK" &&
          line !== "Plan: VERIFICATION_PLAN_INCOMPLETE")
      )
        return { ok: false };
      planLine = line;
      continue;
    }
    if (recordResults.has(line)) {
      if (resultLine !== undefined) return { ok: false };
      resultLine = line;
      continue;
    }
    return { ok: false };
  }

  const mapped = recordResults.get(resultLine);
  if (mapped === undefined || planLine === undefined) return { ok: false };
  if (mapped.exit === 0 && issues.length > 0) return { ok: false };

  return { ok: true, value: { ...resultBase, ...mapped, issues } };
}

function recordDiagnosticLines(output) {
  const ignored = [
    /^$/,
    /^ForgeFlow Verification Check$/,
    /^[^ ].*:$/,
    /^ {2}(Task mode|Authority|Risk level|Architecture impact|Required checks): .+$/,
    /^ {2}(Checks|Evidence traced|Status): .+$/,
    /^Stories checked: \d+$/,
    /^A resolved plan only\. Run make verify, record the result, and take$/,
    /^the work to human review\.$/,
    /^Correct the reported task mode, authority, architecture, or risk$/,
    /^declaration in the Story, then run this check again\.$/,
    /^A required check or acceptance criterion is unproven\. The Story is$/,
    /^not complete; resolve the recorded residual risk or record the$/,
    /^missing evidence\.$/,
    /^Declared evidence only\. Human Review still decides product, design,$/,
    /^and architecture acceptance\.$/,
  ];

  return output
    .split("\n")
    .filter((line) => !ignored.some((pattern) => pattern.test(line)))
    .join("\n");
}

/** Reads the per-Story facts both implementations must report identically. */
function recordEvidence(output) {
  const entries = [];
  let current;

  for (const line of output.split("\n")) {
    const heading = /^([^ ].*):$/.exec(line);
    if (heading && heading[1] !== "Next") {
      current = { label: heading[1] };
      entries.push(current);
      continue;
    }
    const declaration = /^ {2}([^:]+): (.+)$/.exec(line);
    if (declaration && current !== undefined)
      current[declaration[1]] = declaration[2];
    const checked = /^Stories checked: (\d+)$/.exec(line);
    if (checked) entries.push({ checked: Number(checked[1]) });
  }

  return entries;
}

async function legacyRecordOutcome(fixture, args, observe) {
  let output;
  let exit = 0;
  try {
    ({ stdout: output } = await execFile(verificationCheck, args, {
      cwd: fixture,
      encoding: "utf8",
      env: { ...globalThis.process.env, LC_ALL: "C" },
    }));
  } catch (error) {
    output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    exit = error.code;
  }

  const normalized = normalizeLegacyRecordDiagnostic(
    recordDiagnosticLines(output),
  );
  observe.evidence(recordEvidence(output));
  return {
    result: normalized.ok ? normalized.value : { invalid: true },
    issues: normalized.ok ? normalized.value.issues : [],
    exit,
    legacyDiagnostic: recordDiagnosticLines(output),
  };
}

async function typescriptRecordOutcome(fixture, args, observe) {
  const execution = await runVerificationCheck(
    args,
    createNodeStoryReader(undefined, fixture),
  );
  observe.evidence(recordEvidence(renderVerificationHuman(execution).stdout));
  return {
    result: execution.result,
    issues: execution.result.issues,
    exit: execution.result.exit,
  };
}

async function writeRecordCase(fixture, sources) {
  const directory = join(fixture, caseStory);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "story.md"), sources.story ?? base);
  await writeFile(
    join(directory, "acceptance.md"),
    sources.acceptance ?? acceptance,
  );
  if (sources.record !== undefined)
    await writeFile(join(directory, "verification.md"), sources.record);
}

async function assertRecordParity(name, sources, args = [caseStory]) {
  const parity = await runDifferentialParity({
    fixtureSource,
    legacy: async ({ fixture, observe }) => {
      await writeRecordCase(fixture, sources);
      return legacyRecordOutcome(fixture, ["--result", ...args], observe);
    },
    typescript: async ({ fixture, observe }) => {
      await writeRecordCase(fixture, sources);
      return typescriptRecordOutcome(fixture, ["--result", ...args], observe);
    },
    normalizeLegacyDiagnostic: normalizeLegacyRecordDiagnostic,
  });
  assert.deepEqual(parity, { ok: true, mismatches: [] }, name);
}

function recorded(...sections) {
  return ["# Verification Result: TST-901", "", ...sections].join("\n");
}

const observed = "—";
const passingRecord = recorded(
  "## Checks",
  "",
  `* lint: pass ${observed} \`pnpm run lint\``,
  `* static: pass ${observed} \`pnpm run typecheck\``,
  `* unit: pass ${observed} \`pnpm test\``,
  "",
  "## Evidence",
  "",
  `* \`AC-001\`: pass ${observed} \`the unit suite proved the happy path\``,
  "",
  "## Authority Used",
  "",
  "* plan",
  "* modify",
  "",
);
const passingUnit = `* unit: pass ${observed} \`pnpm test\``;

test("TST006-AC-002: passing and partial records have retained-checker parity", async () => {
  await assertRecordParity("pass", { record: passingRecord });
  await assertRecordParity("pass-discovery", { record: passingRecord }, []);
  await assertRecordParity("missing-record", {});
  await assertRecordParity("empty-record", { record: "" });

  for (const status of ["skipped", "blocked", "unsupported", "fail"])
    await assertRecordParity(`unit-${status}`, {
      record: passingRecord.replace(
        passingUnit,
        `* unit: ${status} ${observed} \`the runner is unavailable\``,
      ),
    });

  await assertRecordParity("partial-with-residual", {
    record: `${passingRecord.replace(`${passingUnit}\n`, "")}
## Residual Risks

* \`the unit layer is unproven\`
`,
  });
  await assertRecordParity("partial-without-residual", {
    record: passingRecord.replace(`${passingUnit}\n`, ""),
  });
  await assertRecordParity("silent", {
    record: recorded("## Checks", "", "## Evidence", ""),
  });
});

test("TST006-AC-002: malformed records have retained-checker parity", async () => {
  const checks = [
    ["* lint pass"],
    [`* smoke: pass ${observed} \`run\``],
    [`* lint: pass ${observed} \`run\``, `* lint: pass ${observed} \`run\``],
    [`* lint: done ${observed} \`run\``],
    [`* lint: pass ${observed} TBD`],
    ["* lint: pass"],
    [`- lint: pass ${observed} \`run\``],
    [`*   lint:   pass   ${observed}   \`run\`   `],
  ];

  for (const [index, entries] of checks.entries())
    await assertRecordParity(`checks-${index}`, {
      record: recorded(
        "## Checks",
        "",
        ...entries,
        "",
        "## Evidence",
        "",
        `* \`AC-001\`: pass ${observed} \`observed\``,
        "",
        "## Residual Risks",
        "",
        "* `the record is under repair`",
        "",
      ),
    });

  const evidence = [
    ["* an evidence note"],
    [`* AC-001: pass ${observed} \`observed\``],
    [`* \`AC-009\`: pass ${observed} \`observed\``],
    [
      `* \`AC-001\`: pass ${observed} \`observed\``,
      `* \`AC-001\`: pass ${observed} \`observed\``,
    ],
    [`* \`AC-001\`: partial ${observed} \`observed\``],
    [`* \`AC-001\`: pass ${observed} n/a`],
    [`* \`AC-001\`: blocked ${observed} \`the environment is unavailable\``],
    [`* \`AC-001\`: fail ${observed} \`the unit suite refuted the path\``],
  ];

  for (const [index, entries] of evidence.entries())
    await assertRecordParity(`evidence-${index}`, {
      record: recorded(
        "## Checks",
        "",
        `* lint: pass ${observed} \`pnpm run lint\``,
        `* static: pass ${observed} \`pnpm run typecheck\``,
        passingUnit,
        "",
        "## Evidence",
        "",
        ...entries,
        "",
        "## Residual Risks",
        "",
        "* `the record is under repair`",
        "",
      ),
    });

  await assertRecordParity("checks-missing", {
    record: recorded(
      "## Evidence",
      "",
      `* \`AC-001\`: pass ${observed} \`observed\``,
      "",
    ),
  });
  await assertRecordParity("checks-repeated", {
    record: recorded("## Checks", "", "## Checks", "", "## Evidence", ""),
  });
  await assertRecordParity("evidence-missing", {
    record: recorded("## Checks", "", `* lint: pass ${observed} \`run\``, ""),
  });
  await assertRecordParity("acceptance-without-checkbox", {
    acceptance: "# Acceptance Criteria\n\nNo checkbox here.\n",
    record: passingRecord,
  });
  await assertRecordParity("fenced-record", {
    record: recorded(
      "## Checks",
      "",
      "```markdown",
      `* smoke: perfect ${observed} nonsense`,
      "```",
      "",
      `* lint: pass ${observed} \`pnpm run lint\``,
      `* static: pass ${observed} \`pnpm run typecheck\``,
      passingUnit,
      "",
      "## Evidence",
      "",
      `* \`AC-001\`: pass ${observed} \`observed\``,
      "",
    ),
  });
});

test("TST006-AC-002: authority and residual records have retained-checker parity", async () => {
  await assertRecordParity("authority-conflict", {
    record: passingRecord.replace("* modify\n", "* modify\n* push\n"),
  });
  await assertRecordParity("authority-granted", {
    story: `${base}\n## Authority\n\n* push: yes\n`,
    record: passingRecord.replace("* modify\n", "* modify\n* push\n"),
  });
  await assertRecordParity("authority-unknown", {
    record: passingRecord.replace("* modify\n", "* modify\n* merge\n"),
  });
  await assertRecordParity("authority-declaration", {
    record: passingRecord.replace("* modify\n", "* modify: yes\n"),
  });
  await assertRecordParity("residual-loose", {
    record: `${passingRecord}\n## Residual Risks\n\n* none that matter\n`,
  });
  await assertRecordParity("multi-acceptance", {
    acceptance: `${acceptance}- [x] AC-002: Fixture second path.\n`,
    record: passingRecord,
  });
  await assertRecordParity("higher-profile", {
    story: `${base}\n## Risk\n\n* Level: high\n`,
    record: passingRecord,
  });
  await assertRecordParity("plan-and-record-defect", {
    story: `${base}\n## Risk\n\n* Level: extreme\n`,
    record: recorded("## Checks", ""),
  });
});

test("TST006-AC-002: the record normalizer fails closed outside its allow-list", () => {
  assert.deepEqual(normalizeLegacyRecordDiagnostic("Result: ERROR"), {
    ok: false,
  });
  assert.deepEqual(
    normalizeLegacyRecordDiagnostic(
      "Plan: VERIFICATION_PLAN_OK\nResult: VERIFICATION_PASS\nWARN  x: something new",
    ),
    { ok: false },
  );
  assert.deepEqual(
    normalizeLegacyRecordDiagnostic("Result: VERIFICATION_PASS"),
    {
      ok: false,
    },
  );
  assert.deepEqual(
    normalizeLegacyRecordDiagnostic(
      "Plan: VERIFICATION_PLAN_OK\nResult: VERIFICATION_PASS\nFAIL  x: result: verification.md is missing, unreadable, or empty",
    ),
    { ok: false },
  );
});

test("TST006-AC-002: the corpus comparison detects a divergent record", async () => {
  const divergent = await runDifferentialParity({
    fixtureSource,
    legacy: async ({ fixture, observe }) => {
      await writeRecordCase(fixture, { record: passingRecord });
      return legacyRecordOutcome(fixture, ["--result", caseStory], observe);
    },
    typescript: async ({ fixture, observe }) => {
      await writeRecordCase(fixture, {
        record: passingRecord.replace(`${passingUnit}\n`, ""),
      });
      return typescriptRecordOutcome(fixture, ["--result", caseStory], observe);
    },
    normalizeLegacyDiagnostic: normalizeLegacyRecordDiagnostic,
  });

  assert.equal(divergent.ok, false);
  assert.deepEqual(divergent.mismatches, [
    "result",
    "issues",
    "exit",
    "evidence",
    "mutation",
  ]);
});
