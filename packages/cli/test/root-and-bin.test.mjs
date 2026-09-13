import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const bin = fileURLToPath(
  new globalThis.URL("../dist/bin.js", import.meta.url),
);
const help = `ForgeFlow CLI v0.1.0

Usage:
  forgeflow [command]

Commands:
  handoff check      Check immutable Handoff evidence
  story check        Check the static Story contract
  verification check Resolve plans and check recorded results
  help, --help       Show this help
  version, --version Print the CLI version

Other migration commands are unavailable.
`;
const unavailable =
  "forgeflow: command unavailable; migration commands are not yet available. Run forgeflow --help.\n";

function runCli(...args) {
  return spawnSync(globalThis.process.execPath, [bin, ...args], {
    encoding: "utf8",
  });
}

test("AC-005: the CLI package root exposes only machine serialization", async () => {
  const cli = await import("@forgeflow/cli");

  assert.deepEqual(Object.keys(cli), ["serializeResultEnvelope"]);
});

for (const args of [[], ["help"], ["--help"]]) {
  test(`CLI help succeeds for ${args.join(" ") || "no arguments"}`, () => {
    const result = runCli(...args);

    assert.equal(result.status, 0);
    assert.equal(result.stdout, help);
    assert.equal(result.stderr, "");
  });
}

for (const args of [["version"], ["--version"]]) {
  test(`CLI version succeeds for ${args[0]}`, () => {
    const result = runCli(...args);

    assert.equal(result.status, 0);
    assert.equal(result.stdout, "0.1.0\n");
    assert.equal(result.stderr, "");
  });
}

for (const args of [
  ["init"],
  ["--quiet"],
  ["migrate", "orders"],
  ["help", "extra"],
  ["version", "extra"],
]) {
  test(`CLI rejects unavailable arguments: ${args.join(" ")}`, () => {
    const result = runCli(...args);

    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, unavailable);
  });
}
