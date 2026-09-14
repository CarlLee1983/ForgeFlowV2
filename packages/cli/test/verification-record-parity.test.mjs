import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

import {
  createNodeStoryReader,
  renderVerificationHuman,
  runVerificationCheck,
} from "../dist/verification.js";
import { runDifferentialParity } from "./support/differential-parity-harness.mjs";
import {
  acceptance,
  base,
  caseStory,
  fixtureSource,
  issueForLegacyMessage,
  resultBase,
  verificationCheck,
  writeRecordCase,
} from "./support/verification-parity-fixtures.mjs";

const execFile = promisify(execFileCallback);

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
    "Result: ERROR",
    { status: "error", outcome: "configuration-error", exit: 2 },
  ],
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
    if (line.startsWith("ERROR ")) {
      const separator = line.indexOf(": ");
      if (separator < 0) return { ok: false };
      if (
        !/^verification record is a symlink: \S+$/.test(
          line.slice(separator + 2),
        )
      )
        return { ok: false };
      issues.push({
        code: "VERIFICATION_STORY_FILE_SYMLINK",
        message: "a verification record is a symlink",
      });
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
  if (mapped === undefined) return { ok: false };
  // The retained checker prints no Plan line once a run is an operational
  // error, and prints one for every other recorded outcome.
  if ((planLine === undefined) !== (mapped.exit === 2)) return { ok: false };
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
    const completed = await execFile(verificationCheck, args, {
      cwd: fixture,
      encoding: "utf8",
      env: { ...globalThis.process.env, LC_ALL: "C" },
    });
    output = `${completed.stdout}${completed.stderr}`;
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
  const rendered = renderVerificationHuman(execution);
  observe.evidence(recordEvidence(`${rendered.stdout}${rendered.stderr}`));
  return {
    result: execution.result,
    issues: execution.result.issues,
    exit: execution.result.exit,
  };
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

const detailSeparator = "—";
const passingRecord = recorded(
  "## Checks",
  "",
  `* lint: pass ${detailSeparator} \`pnpm run lint\``,
  `* static: pass ${detailSeparator} \`pnpm run typecheck\``,
  `* unit: pass ${detailSeparator} \`pnpm test\``,
  "",
  "## Evidence",
  "",
  `* \`AC-001\`: pass ${detailSeparator} \`the unit suite proved the happy path\``,
  "",
  "## Authority Used",
  "",
  "* plan",
  "* modify",
  "",
);
const passingUnit = `* unit: pass ${detailSeparator} \`pnpm test\``;

test("TST006-AC-002: passing and partial records have retained-checker parity", async () => {
  await assertRecordParity("pass", { record: passingRecord });
  await assertRecordParity("pass-discovery", { record: passingRecord }, []);
  await assertRecordParity("missing-record", {});
  await assertRecordParity("empty-record", { record: "" });

  for (const status of ["skipped", "blocked", "unsupported", "fail"])
    await assertRecordParity(`unit-${status}`, {
      record: passingRecord.replace(
        passingUnit,
        `* unit: ${status} ${detailSeparator} \`the runner is unavailable\``,
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
    [`* smoke: pass ${detailSeparator} \`run\``],
    [
      `* lint: pass ${detailSeparator} \`run\``,
      `* lint: pass ${detailSeparator} \`run\``,
    ],
    [`* lint: done ${detailSeparator} \`run\``],
    [`* lint: pass ${detailSeparator} TBD`],
    ["* lint: pass"],
    [`- lint: pass ${detailSeparator} \`run\``],
    [`*   lint:   pass   ${detailSeparator}   \`run\`   `],
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
        `* \`AC-001\`: pass ${detailSeparator} \`observed\``,
        "",
        "## Residual Risks",
        "",
        "* `the record is under repair`",
        "",
      ),
    });

  const evidence = [
    ["* an evidence note"],
    [`* AC-001: pass ${detailSeparator} \`observed\``],
    [`* \`AC-009\`: pass ${detailSeparator} \`observed\``],
    [
      `* \`AC-001\`: pass ${detailSeparator} \`observed\``,
      `* \`AC-001\`: pass ${detailSeparator} \`observed\``,
    ],
    [`* \`AC-001\`: partial ${detailSeparator} \`observed\``],
    [`* \`AC-001\`: pass ${detailSeparator} n/a`],
    [
      `* \`AC-001\`: blocked ${detailSeparator} \`the environment is unavailable\``,
    ],
    [
      `* \`AC-001\`: fail ${detailSeparator} \`the unit suite refuted the path\``,
    ],
  ];

  for (const [index, entries] of evidence.entries())
    await assertRecordParity(`evidence-${index}`, {
      record: recorded(
        "## Checks",
        "",
        `* lint: pass ${detailSeparator} \`pnpm run lint\``,
        `* static: pass ${detailSeparator} \`pnpm run typecheck\``,
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
      `* \`AC-001\`: pass ${detailSeparator} \`observed\``,
      "",
    ),
  });
  await assertRecordParity("checks-repeated", {
    record: recorded("## Checks", "", "## Checks", "", "## Evidence", ""),
  });
  await assertRecordParity("evidence-missing", {
    record: recorded(
      "## Checks",
      "",
      `* lint: pass ${detailSeparator} \`run\``,
      "",
    ),
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
      `* smoke: perfect ${detailSeparator} nonsense`,
      "```",
      "",
      `* lint: pass ${detailSeparator} \`pnpm run lint\``,
      `* static: pass ${detailSeparator} \`pnpm run typecheck\``,
      passingUnit,
      "",
      "## Evidence",
      "",
      `* \`AC-001\`: pass ${detailSeparator} \`observed\``,
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
  assert.deepEqual(
    normalizeLegacyRecordDiagnostic(
      "Plan: VERIFICATION_PLAN_OK\nResult: ERROR",
    ),
    { ok: false },
  );
  assert.deepEqual(
    normalizeLegacyRecordDiagnostic("ERROR x: something new\nResult: ERROR"),
    { ok: false },
  );
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

test("TST006-AC-002: unsafe and non-ASCII records have retained-checker parity", async () => {
  const verticalTab = "\v";
  const nonBreakingSpace = "\u00a0";

  for (const [name, blank] of [
    ["vertical-tab", verticalTab],
    ["non-breaking-space", nonBreakingSpace],
  ]) {
    await assertRecordParity(`status-${name}`, {
      record: passingRecord.replace(
        `* lint: pass ${detailSeparator}`,
        `* lint: pass${blank} ${detailSeparator}`,
      ),
    });
    await assertRecordParity(`evidence-status-${name}`, {
      record: passingRecord.replace(
        `* \`AC-001\`: pass ${detailSeparator}`,
        `* \`AC-001\`: pass${blank} ${detailSeparator}`,
      ),
    });
    await assertRecordParity(`authority-${name}`, {
      record: passingRecord.replace("* modify\n", `* modify${blank}\n`),
    });
  }

  // The retained checker resolves and prints the plan before it guards the
  // record, so an unsafe record must not hide the resolved contract.
  await assertRecordParity("record-symlink", {
    record: undefined,
    link: passingRecord,
  });
  await assertRecordParity("record-symlink-with-plan-defect", {
    story: `${base}\n## Risk\n\n* Level: extreme\n`,
    record: undefined,
    link: passingRecord,
  });
});
