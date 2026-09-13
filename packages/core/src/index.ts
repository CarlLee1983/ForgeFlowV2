export {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  ResultEnvelopeValidationError,
  assertResultEnvelope,
  validateResultEnvelope,
} from "./result.js";

export type {
  ResultEnvelope,
  ResultEnvelopeValidation,
  ResultExit,
  ResultIssue,
  ResultOutcome,
  ResultStatus,
  ResultValidationIssue,
} from "./result.js";

export { evaluateHandoff } from "./handoff.js";
export type { HandoffEvaluation, HandoffEvidence } from "./handoff.js";

export { resolveVerificationPlan } from "./verification.js";
export type {
  VerificationAuthority,
  VerificationAuthorityOperation,
  VerificationLayer,
  VerificationLevel,
  VerificationPlan,
  VerificationPlanEvaluation,
  VerificationTaskMode,
} from "./verification.js";

export {
  SUPPORTED_PROTOCOL_RANGE,
  getToolingCapabilities,
  resolveProtocolSelector,
} from "./protocol.js";

export type {
  ProtocolSelection,
  ProtocolSelectionErrorCode,
  ProtocolSelector,
  ProtocolSelectorSource,
  ToolingCapabilities,
} from "./protocol.js";

export { evaluateVerificationResult } from "./verification-result.js";
export type {
  VerificationCheckStatus,
  VerificationDiagnostic,
  VerificationDiagnosticKind,
  VerificationEvidenceStatus,
  VerificationRecord,
  VerificationRecordStatus,
  VerificationRecordedCheck,
  VerificationResultEvaluation,
  VerificationResultSources,
} from "./verification-result.js";
