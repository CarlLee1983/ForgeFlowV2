import { isStrictNumericSemVer } from "./version.js";

export const RESULT_SCHEMA_VERSION = "1.0.0" as const;
export const IMPLEMENTED_PROTOCOL_VERSION = "0.9.0" as const;

export type ResultStatus = "pass" | "fail" | "warning" | "error";

export type ResultOutcome =
  | "success"
  | "failure"
  | "warning"
  | "usage-error"
  | "configuration-error"
  | "internal-error";

export type ResultExit = 0 | 1 | 2;

export interface ResultIssue {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly subject?: string;
}

export interface ResultEnvelope {
  readonly schemaVersion: typeof RESULT_SCHEMA_VERSION;
  readonly protocolVersion: typeof IMPLEMENTED_PROTOCOL_VERSION;
  readonly status: ResultStatus;
  readonly outcome: ResultOutcome;
  readonly exit: ResultExit;
  readonly subject: string;
  readonly path?: string;
  readonly issues: readonly ResultIssue[];
}

export interface ResultValidationIssue {
  readonly code: string;
  readonly field: string;
}

export type ResultEnvelopeValidation =
  | { readonly ok: true; readonly value: ResultEnvelope }
  | { readonly ok: false; readonly issues: readonly ResultValidationIssue[] };

export class ResultEnvelopeValidationError extends TypeError {
  readonly code = "INVALID_RESULT_ENVELOPE" as const;
  readonly issues: readonly ResultValidationIssue[];

  constructor(issues: readonly ResultValidationIssue[]) {
    super("The value does not satisfy the ForgeFlow result envelope contract.");
    this.name = "ResultEnvelopeValidationError";
    this.issues = Object.freeze(
      issues.map((issue) => Object.freeze({ ...issue })),
    );
  }
}

const resultMappings = new Set([
  "pass|success|0",
  "fail|failure|1",
  "warning|warning|0",
  "error|usage-error|2",
  "error|configuration-error|2",
  "error|internal-error|2",
]);

const envelopeFields = new Set([
  "schemaVersion",
  "protocolVersion",
  "status",
  "outcome",
  "exit",
  "subject",
  "path",
  "issues",
]);
const requiredEnvelopeFields = [
  "schemaVersion",
  "protocolVersion",
  "status",
  "outcome",
  "exit",
  "subject",
  "issues",
];
const issueFields = new Set(["code", "message", "path", "subject"]);
const statuses: ReadonlySet<unknown> = new Set([
  "pass",
  "fail",
  "warning",
  "error",
]);
const outcomes: ReadonlySet<unknown> = new Set([
  "success",
  "failure",
  "warning",
  "usage-error",
  "configuration-error",
  "internal-error",
]);
const exits: ReadonlySet<unknown> = new Set([0, 1, 2]);
const subjectPattern = /^[a-z][a-z0-9-]*(?::[A-Za-z0-9][A-Za-z0-9._-]*)?$/;
const issueCodePattern = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
const lineBreakPattern = /[\r\n\u0085\u2028\u2029]/;

function invalid(code: string, field: string): ResultEnvelopeValidation {
  return {
    ok: false,
    issues: [{ code, field }],
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function hasOwn(value: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function unknownField(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): string | undefined {
  return Object.keys(value)
    .sort()
    .find((field) => !allowed.has(field));
}

function isSubject(value: unknown): value is string {
  return typeof value === "string" && subjectPattern.test(value);
}

function isPath(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    Array.from(value).some((character) => {
      const codePoint = character.codePointAt(0);
      return (
        codePoint !== undefined &&
        (codePoint <= 31 || (codePoint >= 127 && codePoint <= 159))
      );
    })
  ) {
    return false;
  }

  return value.split("/").every((segment) => {
    return segment.length > 0 && segment !== "." && segment !== "..";
  });
}

export function validateResultEnvelope(
  input: unknown,
): ResultEnvelopeValidation {
  if (!isRecord(input)) {
    return invalid("RESULT_NOT_OBJECT", "$");
  }

  const value = input;
  const extraField = unknownField(value, envelopeFields);
  if (extraField !== undefined) {
    return invalid("UNKNOWN_FIELD", extraField);
  }
  for (const field of requiredEnvelopeFields) {
    if (!hasOwn(value, field)) {
      return invalid("MISSING_FIELD", field);
    }
  }

  if (!isStrictNumericSemVer(value.schemaVersion)) {
    return invalid("INVALID_SEMVER", "schemaVersion");
  }
  if (value.schemaVersion !== RESULT_SCHEMA_VERSION) {
    return invalid("UNSUPPORTED_SCHEMA_VERSION", "schemaVersion");
  }
  if (!isStrictNumericSemVer(value.protocolVersion)) {
    return invalid("INVALID_SEMVER", "protocolVersion");
  }
  if (value.protocolVersion !== IMPLEMENTED_PROTOCOL_VERSION) {
    return invalid("UNSUPPORTED_PROTOCOL_VERSION", "protocolVersion");
  }
  if (!statuses.has(value.status)) {
    return invalid("INVALID_STATUS", "status");
  }
  if (!outcomes.has(value.outcome)) {
    return invalid("INVALID_OUTCOME", "outcome");
  }
  if (!exits.has(value.exit)) {
    return invalid("INVALID_EXIT", "exit");
  }
  if (
    !resultMappings.has(
      `${String(value.status)}|${String(value.outcome)}|${String(value.exit)}`,
    )
  ) {
    return invalid("INVALID_RESULT_COMBINATION", "$");
  }
  if (!isSubject(value.subject)) {
    return invalid("INVALID_SUBJECT", "subject");
  }
  if (hasOwn(value, "path") && !isPath(value.path)) {
    return invalid("INVALID_PATH", "path");
  }
  if (!Array.isArray(value.issues)) {
    return invalid("INVALID_ISSUES", "issues");
  }

  for (const [index, issue] of value.issues.entries()) {
    const issueField = `issues[${index}]`;
    if (!isRecord(issue)) {
      return invalid("INVALID_ISSUE", issueField);
    }
    const extraIssueField = unknownField(issue, issueFields);
    if (extraIssueField !== undefined) {
      return invalid("UNKNOWN_FIELD", `${issueField}.${extraIssueField}`);
    }
    if (
      !hasOwn(issue, "code") ||
      typeof issue.code !== "string" ||
      !issueCodePattern.test(issue.code)
    ) {
      return invalid("INVALID_ISSUE_CODE", `${issueField}.code`);
    }
    if (
      !hasOwn(issue, "message") ||
      typeof issue.message !== "string" ||
      issue.message.length === 0 ||
      lineBreakPattern.test(issue.message)
    ) {
      return invalid("INVALID_ISSUE_MESSAGE", `${issueField}.message`);
    }
    if (hasOwn(issue, "path") && !isPath(issue.path)) {
      return invalid("INVALID_PATH", `${issueField}.path`);
    }
    if (hasOwn(issue, "subject") && !isSubject(issue.subject)) {
      return invalid("INVALID_SUBJECT", `${issueField}.subject`);
    }
  }

  return { ok: true, value: input as unknown as ResultEnvelope };
}

export function assertResultEnvelope(input: unknown): ResultEnvelope {
  const validation = validateResultEnvelope(input);
  if (!validation.ok) {
    throw new ResultEnvelopeValidationError(validation.issues);
  }

  return validation.value;
}
