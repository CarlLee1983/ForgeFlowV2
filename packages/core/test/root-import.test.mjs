import assert from "node:assert/strict";
import test from "node:test";

test("AC-005: the Core package root exposes only the public contract", async () => {
  const core = await import("@forgeflow/core");

  assert.deepEqual(Object.keys(core).sort(), [
    "IMPLEMENTED_PROTOCOL_VERSION",
    "RESULT_SCHEMA_VERSION",
    "ResultEnvelopeValidationError",
    "SUPPORTED_PROTOCOL_RANGE",
    "assertResultEnvelope",
    "evaluateHandoff",
    "evaluateVerificationResult",
    "getToolingCapabilities",
    "resolveProtocolSelector",
    "resolveVerificationPlan",
    "validateResultEnvelope",
  ]);
});
