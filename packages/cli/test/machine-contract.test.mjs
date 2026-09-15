import assert from "node:assert/strict";
import test from "node:test";

import {
  ResultEnvelopeValidationError,
  getToolingCapabilities,
} from "@praxisbound/core";
import { serializeResultEnvelope } from "@praxisbound/cli";

test("AC-004: tooling capabilities report exact immutable versions", () => {
  const capabilities = getToolingCapabilities();

  assert.deepEqual(capabilities, {
    resultSchemaVersion: "1.0.0",
    implementedProtocolVersion: "0.10.0",
    supportedProtocolRange: {
      minimum: "0.10.0",
      maximum: "0.10.0",
    },
  });
  assert.equal(Object.isFrozen(capabilities), true);
  assert.equal(Object.isFrozen(capabilities.supportedProtocolRange), true);
  assert.strictEqual(getToolingCapabilities(), capabilities);
});

test("AC-004: CLI serialization is canonical and newline terminated", () => {
  const envelope = {
    issues: [
      {
        subject: "story:TST-002",
        path: "specs/stories/TST-002/story.md",
        message: "The Goal section is missing.",
        code: "MISSING_FIELD",
      },
    ],
    path: "specs/stories/TST-002/story.md",
    subject: "story:TST-002",
    exit: 1,
    outcome: "failure",
    status: "fail",
    protocolVersion: "0.10.0",
    schemaVersion: "1.0.0",
  };

  assert.equal(
    serializeResultEnvelope(envelope),
    '{"schemaVersion":"1.0.0","protocolVersion":"0.10.0","status":"fail","outcome":"failure","exit":1,"subject":"story:TST-002","path":"specs/stories/TST-002/story.md","issues":[{"code":"MISSING_FIELD","message":"The Goal section is missing.","path":"specs/stories/TST-002/story.md","subject":"story:TST-002"}]}\n',
  );
});

test("AC-004: CLI serialization rejects invalid envelopes with the Core error", () => {
  assert.throws(
    () =>
      serializeResultEnvelope({
        schemaVersion: "1.0.0",
        protocolVersion: "0.10.0",
        status: "pass",
        outcome: "success",
        exit: 1,
        subject: "repository",
        issues: [],
      }),
    (error) => {
      assert.equal(error instanceof ResultEnvelopeValidationError, true);
      assert.equal(error.code, "INVALID_RESULT_ENVELOPE");
      assert.deepEqual(error.issues, [
        { code: "INVALID_RESULT_COMBINATION", field: "$" },
      ]);
      return true;
    },
  );
});
