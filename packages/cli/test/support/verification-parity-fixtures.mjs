import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const fixtureSource = fileURLToPath(
  new globalThis.URL("../fixtures/verification-parity/", import.meta.url),
);
export const verificationCheck = fileURLToPath(
  new globalThis.URL("../../../../scripts/verification-check", import.meta.url),
);
export const caseStory = "specs/stories/TST-901-case";
export const resultBase = Object.freeze({
  schemaVersion: "1.0.0",
  protocolVersion: "0.10.0",
  subject: "verification",
});
export const acceptance = `# Acceptance Criteria

## Happy Path

* [ ] AC-001: Fixture happy path.
`;

export const base = `# Story: TST-901 Fixture

## Goal

Provide a deterministic Story fixture.

## Classification

* Security sensitive: no
* Baseline conformance: no
`;

export function issueForLegacyMessage(message) {
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

export async function writeCase(fixture, story) {
  const directory = join(fixture, caseStory);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "story.md"), story);
  await writeFile(join(directory, "acceptance.md"), acceptance);
}

export async function writeRecordCase(fixture, sources) {
  const directory = join(fixture, caseStory);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "story.md"), sources.story ?? base);
  await writeFile(
    join(directory, "acceptance.md"),
    sources.acceptance ?? acceptance,
  );
  if (sources.record !== undefined)
    await writeFile(join(directory, "verification.md"), sources.record);
  if (sources.link !== undefined) {
    // The link target is relative so both private fixture copies hold the
    // byte-identical symlink.
    await writeFile(join(fixture, "elsewhere.md"), sources.link);
    await symlink("../../../elsewhere.md", join(directory, "verification.md"));
  }
}
