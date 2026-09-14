import { isStoryId } from "./story-id.js";
import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  type ResultEnvelope,
  type ResultIssue,
} from "./result.js";

/** Immutable historical evidence extracted from one Handoff Markdown block. */
export interface HandoffEvidence {
  readonly story: string;
  readonly recordedAt: string;
  readonly repository: string;
  readonly revision: string;
  readonly verificationCommand: string;
  readonly verificationResult: "pass" | "fail" | "not_run";
}

/** A pure Handoff contract evaluation. Evidence is present only for success. */
export interface HandoffEvaluation {
  readonly result: ResultEnvelope;
  readonly evidence?: HandoffEvidence;
}

type FieldName =
  | "handoff.story"
  | "handoff.recorded_at"
  | "handoff.repository"
  | "handoff.revision"
  | "verification.command"
  | "verification.result";

const fieldNames: readonly FieldName[] = [
  "handoff.story",
  "handoff.recorded_at",
  "handoff.repository",
  "handoff.revision",
  "verification.command",
  "verification.result",
];
const hexadecimal = "0123456789abcdef";
const embeddedLineBreak = /[\r\u0085\u2028\u2029]/;

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

function incomplete(issues: readonly ResultIssue[]): HandoffEvaluation {
  return Object.freeze({
    result: Object.freeze({
      schemaVersion: RESULT_SCHEMA_VERSION,
      protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
      status: "fail",
      outcome: "failure",
      exit: 1,
      subject: "handoff",
      issues: Object.freeze([...issues]),
    }),
  });
}

function hasOnly(value: string, allowed: string): boolean {
  return [...value].every((character) => allowed.includes(character));
}

function isTimestamp(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/.exec(
    value,
  );
  if (!match) return false;
  const [, , month = "", day = "", hour = "", minute = "", second = ""] = match;
  return (
    [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
    ].includes(month) &&
    Number(day) >= 1 &&
    Number(day) <= 31 &&
    Number(hour) >= 0 &&
    Number(hour) <= 23 &&
    Number(minute) >= 0 &&
    Number(minute) <= 59 &&
    Number(second) >= 0 &&
    Number(second) <= 59
  );
}

function isPlainScalar(value: string): boolean {
  if (
    value.length === 0 ||
    /^[ \t]/.test(value) ||
    /^(?:null|Null|NULL|~|true|True|TRUE|false|False|FALSE|yes|Yes|YES|no|No|NO|on|On|ON|off|Off|OFF|\.nan|\.NaN|\.NAN|[+-]?\.inf|[+-]?\.Inf|[+-]?\.INF)$/.test(
      value,
    ) ||
    /^(?:\{|\}|\[|\]|,|&|\*|!|\||>|'|"|%|@|`|#)/.test(value) ||
    /^(?:-|\?|:)(?:$| )/.test(value) ||
    value.includes(": ") ||
    value.endsWith(":") ||
    value.includes(" #")
  )
    return false;
  const numeric = /^[+-]/.test(value) ? value.slice(1) : value;
  if (
    /^0[xX][0-9a-fA-F]/.test(numeric) ||
    /^0[oO][0-7]/.test(numeric) ||
    /^0[bB][01]/.test(numeric)
  )
    return false;
  return !(/^[0-9._eE+-]*$/.test(numeric) && /[0-9]/.test(numeric));
}

/**
 * Evaluates Markdown source using the deliberately restricted, line-oriented
 * Handoff YAML grammar. It performs no I/O and never throws for runtime input.
 */
export function evaluateHandoff(source: unknown): HandoffEvaluation {
  if (typeof source !== "string") {
    return incomplete([
      issue("HANDOFF_SOURCE_TYPE", "handoff source must be a string"),
    ]);
  }

  const issues: ResultIssue[] = [];
  const values = new Map<FieldName, string>();
  const counts = new Map<FieldName, number>();
  for (const name of fieldNames) counts.set(name, 0);
  let handoffSections = 0;
  let verificationSections = 0;
  let blockCount = 0;
  let inBlock = false;
  let section = "";

  const record = (name: string, value: string): void => {
    if (embeddedLineBreak.test(value)) {
      issues.push(
        issue(
          "HANDOFF_EMBEDDED_LINE_BREAK",
          `handoff evidence value contains an embedded YAML line break: ${name}`,
        ),
      );
    }
    if (/^[ \t]/.test(value)) {
      issues.push(
        issue(
          "HANDOFF_VALUE_SEPARATOR",
          `handoff evidence value must follow exactly one separator space: ${name}`,
        ),
      );
    }
    if (fieldNames.includes(name as FieldName)) {
      const field = name as FieldName;
      counts.set(field, (counts.get(field) ?? 0) + 1);
      values.set(field, value);
    } else if (name.startsWith("workflow.") || name.startsWith("baseline.")) {
      issues.push(
        issue(
          "HANDOFF_MUTABLE_KEY",
          `mutable lifecycle evidence is forbidden: ${name}`,
        ),
      );
    } else {
      issues.push(
        issue("HANDOFF_UNKNOWN_KEY", `unknown handoff evidence key: ${name}`),
      );
    }
  };

  for (const rawLine of source.split("\n")) {
    const line = rawLine.replace(/[\r\t ]+$/g, "");
    if (embeddedLineBreak.test(line)) {
      issues.push(
        issue(
          "HANDOFF_EMBEDDED_LINE_BREAK",
          "handoff source line contains an embedded YAML line break",
        ),
      );
      continue;
    }
    if (!inBlock) {
      if (line === "```yaml") {
        blockCount += 1;
        inBlock = true;
      }
      continue;
    }
    if (line === "```") {
      inBlock = false;
      continue;
    }
    if (line === "" || /^ *#/.test(line)) continue;
    if (line.startsWith("    - ")) {
      issues.push(
        issue(
          "HANDOFF_LIST",
          `lists are not part of handoff evidence: ${line}`,
        ),
      );
      continue;
    }
    if (line.startsWith("  ")) {
      const pair = line.slice(2);
      if (pair.startsWith(" ") || pair.startsWith("-")) {
        issues.push(
          issue(
            "HANDOFF_INDENTATION",
            `unsupported handoff evidence indentation: ${line}`,
          ),
        );
        continue;
      }
      let key: string;
      let value: string;
      const separator = pair.indexOf(": ");
      if (separator >= 0) {
        key = pair.slice(0, separator);
        value = pair.slice(separator + 2);
      } else if (pair.endsWith(":")) {
        key = pair.slice(0, -1);
        value = "";
      } else {
        issues.push(
          issue(
            "HANDOFF_UNSUPPORTED_LINE",
            `unsupported handoff evidence line: ${line}`,
          ),
        );
        continue;
      }
      if (section === "") {
        issues.push(
          issue(
            "HANDOFF_KEY_OUTSIDE_SECTION",
            `handoff evidence key declared outside a section: ${key}`,
          ),
        );
        continue;
      }
      record(`${section}.${key}`, value);
      continue;
    }
    if (line.endsWith(":")) {
      section = line.slice(0, -1);
      if (section === "handoff") handoffSections += 1;
      else if (section === "verification") verificationSections += 1;
      else if (section === "workflow" || section === "baseline")
        issues.push(
          issue(
            "HANDOFF_MUTABLE_SECTION",
            `mutable lifecycle section is forbidden: ${section}`,
          ),
        );
      else
        issues.push(
          issue(
            "HANDOFF_UNKNOWN_SECTION",
            `unknown handoff evidence section: ${section}`,
          ),
        );
      continue;
    }
    issues.push(
      issue(
        "HANDOFF_UNSUPPORTED_LINE",
        `unsupported handoff evidence line: ${line}`,
      ),
    );
  }

  if (blockCount === 1 && inBlock)
    return incomplete([
      ...issues,
      issue("HANDOFF_BLOCK_UNCLOSED", "handoff evidence block is not closed"),
    ]);
  if (blockCount !== 1)
    return incomplete([
      ...issues,
      issue(
        "HANDOFF_BLOCK_COUNT_INVALID",
        "handoff must contain exactly one machine-readable evidence block",
      ),
    ]);

  for (const [name, count] of [
    ["handoff", handoffSections],
    ["verification", verificationSections],
  ] as const) {
    if (count !== 1)
      issues.push(
        issue(
          "HANDOFF_SECTION_COUNT",
          `evidence block must declare the ${name} section exactly once`,
        ),
      );
  }
  for (const field of fieldNames) {
    const count = counts.get(field) ?? 0;
    if (count === 0)
      issues.push(
        issue("HANDOFF_MISSING_FIELD", `handoff is missing: ${field}`),
      );
    else if (count > 1)
      issues.push(
        issue(
          "HANDOFF_REPEATED_FIELD",
          `handoff declares ${field} more than once`,
        ),
      );
    else {
      const value = values.get(field) ?? "";
      if (field === "handoff.story" && !isStoryId(value))
        issues.push(
          issue(
            "HANDOFF_INVALID_STORY_ID",
            "handoff.story must be one Story ID",
          ),
        );
      if (field === "handoff.recorded_at" && !isTimestamp(value))
        issues.push(
          issue(
            "HANDOFF_INVALID_TIMESTAMP",
            "handoff.recorded_at must be YYYY-MM-DDTHH:MM:SSZ in UTC",
          ),
        );
      if (
        (field === "handoff.repository" || field === "verification.command") &&
        !isPlainScalar(value)
      )
        issues.push(
          issue(
            "HANDOFF_INVALID_PLAIN_SCALAR",
            `${field} must be one non-null unquoted plain scalar`,
          ),
        );
      if (
        field === "handoff.revision" &&
        !(value.length === 40 && hasOnly(value, hexadecimal))
      )
        issues.push(
          issue(
            "HANDOFF_INVALID_REVISION",
            "handoff.revision must be a full 40-character commit SHA",
          ),
        );
      if (
        field === "verification.result" &&
        value !== "pass" &&
        value !== "fail" &&
        value !== "not_run"
      )
        issues.push(
          issue(
            "HANDOFF_INVALID_RESULT",
            "verification.result must be pass, fail, or not_run",
          ),
        );
    }
  }
  if (issues.length > 0) return incomplete(issues);

  const evidence: HandoffEvidence = Object.freeze({
    story: values.get("handoff.story")!,
    recordedAt: values.get("handoff.recorded_at")!,
    repository: values.get("handoff.repository")!,
    revision: values.get("handoff.revision")!,
    verificationCommand: values.get("verification.command")!,
    verificationResult: values.get(
      "verification.result",
    )! as HandoffEvidence["verificationResult"],
  });
  return Object.freeze({
    result: Object.freeze({
      schemaVersion: RESULT_SCHEMA_VERSION,
      protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
      status: "pass",
      outcome: "success",
      exit: 0,
      subject: "handoff",
      issues: Object.freeze([]),
    }),
    evidence,
  });
}
