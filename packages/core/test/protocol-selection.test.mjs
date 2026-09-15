import assert from "node:assert/strict";
import test from "node:test";

import { resolveProtocolSelector } from "@praxisbound/core";

const supportedSelectors = [
  [{ kind: "current" }, "current"],
  [{ kind: "adopted", version: "0.10.0" }, "adopted"],
  [{ kind: "explicit", version: "0.10.0" }, "explicit"],
];

test("AC-003: supported selectors resolve the exact implemented Protocol", () => {
  for (const [selector, source] of supportedSelectors) {
    assert.deepEqual(resolveProtocolSelector(selector), {
      ok: true,
      value: { source, version: "0.10.0" },
    });
  }
});

const selectorErrors = [
  ["missing selector", undefined, "MISSING_SELECTOR"],
  ["non-object selector", "current", "INVALID_SELECTOR"],
  ["unknown selector", { kind: "nearest" }, "INVALID_SELECTOR"],
  [
    "extra selector field",
    { kind: "current", version: "0.10.0" },
    "INVALID_SELECTOR",
  ],
  ["missing adopted version", { kind: "adopted" }, "MISSING_PROTOCOL_VERSION"],
  [
    "missing explicit version",
    { kind: "explicit" },
    "MISSING_PROTOCOL_VERSION",
  ],
  [
    "non-string selected version",
    { kind: "explicit", version: 9 },
    "INVALID_PROTOCOL_VERSION",
  ],
  [
    "malformed selected version",
    { kind: "explicit", version: "0.09.0" },
    "INVALID_PROTOCOL_VERSION",
  ],
  [
    "unsupported adopted version",
    { kind: "adopted", version: "0.9.1" },
    "UNSUPPORTED_PROTOCOL_VERSION",
  ],
  [
    "unsupported explicit version",
    { kind: "explicit", version: "1.0.0" },
    "UNSUPPORTED_PROTOCOL_VERSION",
  ],
];

for (const [name, selector, code] of selectorErrors) {
  test(`AC-003: ${name} returns a typed error`, () => {
    assert.deepEqual(resolveProtocolSelector(selector), {
      ok: false,
      error: { code },
    });
  });
}
