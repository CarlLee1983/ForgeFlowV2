import assert from "node:assert/strict";
import test from "node:test";

test("the Core package root imports from built output", async () => {
  const core = await import("@forgeflow/core");

  assert.equal(Object.keys(core).length, 0);
});
