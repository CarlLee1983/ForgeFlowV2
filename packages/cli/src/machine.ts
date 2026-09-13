import {
  assertResultEnvelope,
  type ResultEnvelope,
  type ResultIssue,
} from "@forgeflow/core";

function hasOwn(value: object, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function canonicalIssue(issue: ResultIssue): Record<string, unknown> {
  return {
    code: issue.code,
    message: issue.message,
    ...(hasOwn(issue, "path") ? { path: issue.path } : {}),
    ...(hasOwn(issue, "subject") ? { subject: issue.subject } : {}),
  };
}

function canonicalEnvelope(envelope: ResultEnvelope): Record<string, unknown> {
  return {
    schemaVersion: envelope.schemaVersion,
    protocolVersion: envelope.protocolVersion,
    status: envelope.status,
    outcome: envelope.outcome,
    exit: envelope.exit,
    subject: envelope.subject,
    ...(hasOwn(envelope, "path") ? { path: envelope.path } : {}),
    issues: envelope.issues.map(canonicalIssue),
  };
}

export function serializeResultEnvelope(input: unknown): string {
  const envelope = assertResultEnvelope(input);
  return `${JSON.stringify(canonicalEnvelope(envelope))}\n`;
}
