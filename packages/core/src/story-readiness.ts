/**
 * The opt-in minimum-content layer of the Story contract.
 *
 * This module owns only readiness semantics. The Story evaluator decides where
 * those checks compose with default contract diagnostics; Core never observes
 * a filesystem or executes evidence.
 */

import { readContentLines, trimDeclarationText } from "./declarations.js";
import type { ResultIssue } from "./result.js";
import { readStructuredLiteral } from "./story-literals.js";
import {
  countTablePipes,
  isFiveColumnTableSeparator,
  splitTableCells,
} from "./story-table.js";

export interface StoryReadinessFacts {
  readonly acceptanceIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

function readyContent(value: string): boolean {
  let content = trimDeclarationText(value);
  if (content.startsWith("* ") || content.startsWith("- "))
    content = trimDeclarationText(content.slice(2));
  return ![
    "",
    "*",
    "-",
    "TBD",
    "tbd",
    "TODO",
    "todo",
    "N/A",
    "n/a",
    "...",
    "<goal>",
    "<scope>",
    "<acceptance criterion>",
    "Describe the user or business outcome.",
  ].includes(content);
}

const evidencePlaceholders: ReadonlySet<string> = new Set([
  "",
  "*",
  "-",
  "TBD",
  "tbd",
  "TODO",
  "todo",
  "N/A",
  "n/a",
  "...",
  "<evidence>",
  "<fixture>",
  "<fixture / precondition>",
  "<expected observation>",
]);

function exactEvidenceLiteral(value: string): boolean {
  const literal = readStructuredLiteral(value);
  return literal !== undefined && !evidencePlaceholders.has(literal);
}

function acceptanceId(value: string): string | undefined {
  if (!value.startsWith("AC-")) return undefined;
  const separator = value.indexOf(":");
  if (separator < 0) return undefined;
  const id = value.slice(0, separator);
  return /^AC-[0-9]+$/.test(id) ? id : undefined;
}

function evidenceAcceptanceId(value: string): string | undefined {
  const literal = readStructuredLiteral(value);
  return literal !== undefined && /^AC-[0-9]+$/.test(literal)
    ? literal
    : undefined;
}

function checkEvidenceRow(
  row: string,
  number: number,
  acceptanceIds: string[],
  evidenceIds: string[],
  issues: ResultIssue[],
): void {
  if (countTablePipes(row) !== 6) {
    issues.push(
      issue(
        "STORY_READY_EVIDENCE_COLUMNS",
        `readiness: acceptance evidence row ${number} must declare five columns`,
      ),
    );
    return;
  }

  const [
    ac = "",
    method = "",
    evidence = "",
    fixture = "",
    observation = "",
    tail = "",
  ] = splitTableCells(row.slice(1));
  if (tail !== "") {
    issues.push(
      issue(
        "STORY_READY_EVIDENCE_TAIL",
        `readiness: acceptance evidence row ${number} must end after the fifth column`,
      ),
    );
    return;
  }
  const id = evidenceAcceptanceId(ac);
  if (id === undefined) {
    issues.push(
      issue(
        "STORY_READY_EVIDENCE_AC",
        `readiness: acceptance evidence row ${number} must name one exact backticked AC-<digits> ID`,
      ),
    );
  } else {
    if (!acceptanceIds.includes(id))
      issues.push(
        issue(
          "STORY_READY_EVIDENCE_AC_UNKNOWN",
          `readiness: acceptance evidence row ${number} names unknown AC ID: ${id}`,
        ),
      );
    if (evidenceIds.includes(id))
      issues.push(
        issue(
          "STORY_READY_EVIDENCE_AC_DUPLICATE",
          `readiness: acceptance evidence duplicates AC ID: ${id}`,
        ),
      );
    evidenceIds.push(id);
  }

  if (!["test", "command", "human"].includes(method))
    issues.push(
      issue(
        "STORY_READY_EVIDENCE_METHOD",
        `readiness: acceptance evidence row ${number} method must be test, command, or human`,
      ),
    );

  for (const [name, value] of [
    ["evidence", evidence],
    ["fixture / precondition", fixture],
    ["expected observation", observation],
  ] as const) {
    if (evidencePlaceholders.has(value))
      issues.push(
        issue(
          "STORY_READY_EVIDENCE_UNSPECIFIED",
          `readiness: acceptance evidence row ${number} leaves ${name} unspecified`,
        ),
      );
    else if (!exactEvidenceLiteral(value))
      issues.push(
        issue(
          "STORY_READY_EVIDENCE_LITERAL",
          `readiness: acceptance evidence row ${number} must give ${name} as one exact backticked value`,
        ),
      );
  }
}

/** Runs the initial readiness checks before default governance evaluation. */
export function checkStoryReadiness(
  story: string,
  acceptance: string,
  issues: ResultIssue[],
): StoryReadinessFacts {
  let section: "goal" | "scope" | undefined;
  let goal = false;
  let scope = false;
  for (const line of readContentLines(story)) {
    if (line === "## Goal") {
      section = "goal";
      continue;
    }
    if (line === "## Scope") {
      section = "scope";
      continue;
    }
    if (
      line === "#" ||
      line === "##" ||
      line.startsWith("# ") ||
      line.startsWith("## ") ||
      line.startsWith("#\t") ||
      line.startsWith("##\t")
    ) {
      section = undefined;
      continue;
    }
    if (line.startsWith("###")) continue;
    if (readyContent(line)) {
      if (section === "goal") goal = true;
      if (section === "scope") scope = true;
    }
  }
  if (!goal)
    issues.push(
      issue(
        "STORY_READY_GOAL",
        "readiness: ## Goal needs non-placeholder content",
      ),
    );
  if (!scope)
    issues.push(
      issue(
        "STORY_READY_SCOPE",
        "readiness: ## Scope needs non-placeholder content",
      ),
    );

  const acceptanceIds: string[] = [];
  let acceptanceCount = 0;
  for (const line of readContentLines(acceptance)) {
    const bullet =
      line.startsWith("* ") || line.startsWith("- ")
        ? line.slice(2)
        : undefined;
    if (bullet === undefined) continue;
    const checkbox =
      bullet.startsWith("[ ] ") ||
      bullet.startsWith("[x] ") ||
      bullet.startsWith("[X] ")
        ? bullet.slice(4)
        : undefined;
    if (checkbox === undefined) continue;
    const id = acceptanceId(checkbox);
    if (id === undefined) continue;
    if (acceptanceIds.includes(id))
      issues.push(
        issue("STORY_READY_AC_DUPLICATE", `readiness: duplicate AC ID: ${id}`),
      );
    acceptanceIds.push(id);
    acceptanceCount += 1;
    if (!readyContent(checkbox.slice(id.length + 1)))
      issues.push(
        issue(
          "STORY_READY_AC_CONTENT",
          `readiness: ${id} needs non-placeholder same-line content`,
        ),
      );
  }
  if (acceptanceCount === 0)
    issues.push(
      issue(
        "STORY_READY_AC_MISSING",
        "readiness: acceptance.md needs a checkbox AC-<digits>: criterion",
      ),
    );

  let found = 0;
  let inEvidence = false;
  let header = false;
  let separator = false;
  let rows = 0;
  const evidenceIds: string[] = [];
  const expectedHeader =
    "| AC | Method | Evidence | Fixture / precondition | Expected observation |";
  for (const line of readContentLines(acceptance)) {
    if (line.startsWith("#")) {
      if (line === "## Acceptance Evidence") {
        found += 1;
        inEvidence = true;
      } else inEvidence = false;
      continue;
    }
    if (!inEvidence || !line.startsWith("|")) continue;
    if (!header) {
      if (line !== expectedHeader)
        issues.push(
          issue(
            "STORY_READY_EVIDENCE_HEADER",
            "readiness: acceptance evidence header must be exactly the documented five columns",
          ),
        );
      header = true;
      continue;
    }
    if (!separator) {
      if (!isFiveColumnTableSeparator(line))
        issues.push(
          issue(
            "STORY_READY_EVIDENCE_SEPARATOR",
            "readiness: acceptance evidence header must be followed by a five-column separator row",
          ),
        );
      separator = true;
      continue;
    }
    rows += 1;
    checkEvidenceRow(line, rows, acceptanceIds, evidenceIds, issues);
  }
  if (found === 0)
    issues.push(
      issue(
        "STORY_READY_EVIDENCE_MISSING",
        "readiness: acceptance.md is missing ## Acceptance Evidence",
      ),
    );
  else if (found !== 1)
    issues.push(
      issue(
        "STORY_READY_EVIDENCE_REPEATED",
        "readiness: acceptance.md must declare ## Acceptance Evidence exactly once",
      ),
    );
  else if (rows === 0)
    issues.push(
      issue(
        "STORY_READY_EVIDENCE_EMPTY",
        "readiness: acceptance evidence declares no rows",
      ),
    );

  for (const id of acceptanceIds)
    if (!evidenceIds.includes(id))
      issues.push(
        issue(
          "STORY_READY_EVIDENCE_AC_MISSING",
          `readiness: acceptance evidence is missing AC ID: ${id}`,
        ),
      );

  return Object.freeze({
    acceptanceIds: Object.freeze(acceptanceIds),
    evidenceIds: Object.freeze(evidenceIds),
  });
}

const riskPlaceholders: ReadonlySet<string> = new Set([
  "",
  "*",
  "-",
  "TBD",
  "tbd",
  "TODO",
  "todo",
  "N/A",
  "n/a",
  "...",
  "<value>",
  "<source failure>",
  "<public projection>",
  "<detail policy>",
  "<contended resource>",
  "<linearization point>",
  "<conflict outcome>",
  "<bounded resource>",
  "<limit>",
  "<saturation behavior>",
  "<failure projection>",
  "<retained resource>",
  "<retention bound>",
  "<overflow policy>",
  "<recovery / observability>",
  "<evidence ac>",
]);

/** Adds the readiness placeholder check for one structurally valid field. */
export function checkRiskContractFieldReadiness(
  name: string,
  field: string,
  value: string,
  report: (entry: ResultIssue) => void,
): void {
  if (!riskPlaceholders.has(value)) return;
  report(
    issue(
      "STORY_READY_RISK_PLACEHOLDER",
      `readiness: ${name} ${field} is a placeholder`,
    ),
  );
}

/** Adds the readiness evidence-link check after all risk fields are read. */
export function checkRiskEvidenceReadiness(
  name: string,
  declared: ReadonlyMap<string, readonly string[]>,
  readiness: StoryReadinessFacts,
  report: (entry: ResultIssue) => void,
): void {
  const evidence = declared.get("Evidence AC") ?? [];
  if (evidence.length !== 1) return;
  const value = readStructuredLiteral(evidence[0] ?? "");
  if (value === undefined) return;
  if (!/^AC-[0-9]+$/.test(value)) {
    report(
      issue(
        "STORY_READY_RISK_EVIDENCE_FORMAT",
        `readiness: ${name} Evidence AC must name one exact AC-<digits> ID`,
      ),
    );
    return;
  }
  if (!readiness.acceptanceIds.includes(value)) {
    report(
      issue(
        "STORY_READY_RISK_EVIDENCE_UNKNOWN",
        `readiness: ${name} Evidence AC names unknown AC ID: ${value}`,
      ),
    );
    return;
  }
  if (!readiness.evidenceIds.includes(value))
    report(
      issue(
        "STORY_READY_RISK_EVIDENCE_UNMAPPED",
        `readiness: ${name} Evidence AC has no Acceptance Evidence row: ${value}`,
      ),
    );
}
