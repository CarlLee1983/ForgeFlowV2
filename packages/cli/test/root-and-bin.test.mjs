import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validateResultEnvelope } from "@forgeflow/core";

const bin = fileURLToPath(
  new globalThis.URL("../dist/bin.js", import.meta.url),
);
const help = `ForgeFlow CLI v0.1.0

Usage:
  forgeflow [command]

Commands:
  doctor             Inspect the static Repository Contract
  verify             Run the canonical repository verification target
  handoff check      Check immutable Handoff evidence
  story check        Check the static Story contract
  verification check Resolve plans and check recorded results
  help, --help       Show this help
  version, --version Print the CLI version

Other migration commands are unavailable.
`;
const unavailable =
  "forgeflow: command unavailable; migration commands are not yet available. Run forgeflow --help.\n";

function runCli(args, cwd) {
  return spawnSync(globalThis.process.execPath, [bin, ...args], {
    encoding: "utf8",
    cwd,
  });
}

test("AC-005: the CLI package root exposes only machine serialization", async () => {
  const cli = await import("@forgeflow/cli");

  assert.deepEqual(Object.keys(cli), ["serializeResultEnvelope"]);
});

test("TST008-AC-001/004: the packed CLI emits one ready JSON result", async () => {
  const root = await mkdtemp(join(tmpdir(), "packed-story-ready-"));
  try {
    const directory = join(root, "specs", "stories", "TST-008-case");
    await mkdir(directory, { recursive: true });
    await writeFile(
      join(directory, "story.md"),
      `# Story: TST-008 Fixture

## Goal

Check minimum Story content.

## Scope

* Check this fixture.

## Classification

* Security sensitive: no
* Baseline conformance: no
`,
    );
    await writeFile(
      join(directory, "acceptance.md"),
      `# Acceptance Criteria

* [ ] AC-001: The fixture is ready.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| \`AC-001\` | test | \`test\` | \`fixture\` | \`pass\` |
`,
    );

    const result = runCli(
      ["story", "check", "--ready", "--json", "specs/stories/TST-008-case"],
      root,
    );
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    const parsed = JSON.parse(result.stdout);
    assert.deepEqual(validateResultEnvelope(parsed), {
      ok: true,
      value: parsed,
    });
    assert.equal(parsed.status, "pass");
    assert.equal(parsed.exit, 0);
    assert.equal(result.stdout, `${JSON.stringify(parsed)}\n`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST009-AC-005: the packed CLI emits one static Doctor JSON result", async () => {
  const root = await mkdtemp(join(tmpdir(), "packed-doctor-"));
  try {
    await mkdir(join(root, "specs", "stories"), { recursive: true });
    await writeFile(join(root, "AGENTS.md"), "agent guide\n");
    await writeFile(join(root, "Makefile"), "verify:\n\t@:\n");
    const result = runCli(["doctor", "--json"], root);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    const parsed = JSON.parse(result.stdout);
    assert.deepEqual(validateResultEnvelope(parsed), {
      ok: true,
      value: parsed,
    });
    assert.equal(parsed.subject, "repository");
    assert.equal(parsed.status, "pass");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const args of [[], ["help"], ["--help"]]) {
  test(`CLI help succeeds for ${args.join(" ") || "no arguments"}`, () => {
    const result = runCli(args);

    assert.equal(result.status, 0);
    assert.equal(result.stdout, help);
    assert.equal(result.stderr, "");
  });
}

for (const args of [["version"], ["--version"]]) {
  test(`CLI version succeeds for ${args[0]}`, () => {
    const result = runCli(args);

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
    const result = runCli(args);

    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, unavailable);
  });
}
