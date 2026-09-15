import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import {
  createNodeStoryReader,
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
  writeCase,
} from "./support/verification-parity-fixtures.mjs";

const execFile = promisify(execFileCallback);

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
    /^PraxisBound Verification Check$/,
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
