import assert from "node:assert/strict";
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { URL } from "node:url";

import {
  BASELINE_FIXTURE_FAMILIES,
  runDifferentialParity,
} from "./support/differential-parity-harness.mjs";

const fixtureRoot = new URL("./fixtures/differential-parity/", import.meta.url);

async function fixturePath(family) {
  return new URL(`./${family}/`, fixtureRoot).pathname;
}

function matchingRunner(side, family, recordFixture) {
  return async ({ fixture, artifacts, observe }) => {
    recordFixture?.(fixture);
    const input = await readFile(join(fixture, "fixture.txt"), "utf8");
    observe.evidence({ family, input });
    observe.process({ command: "fixture-runner", side: "shared" });

    if (family === "mutation") {
      await writeFile(join(fixture, "mutation.txt"), "same mutation\n");
    }
    if (family === "artifact") {
      await writeFile(join(artifacts, "result.txt"), "same artifact\n");
    }

    return {
      result: { kind: "pass", side: "semantic" },
      issues: [{ code: "FIXTURE", message: input.trim() }],
      exit: 0,
      legacyDiagnostic: side === "legacy" ? "PASS fixture" : undefined,
    };
  };
}

test("TST003-AC-005: nine baseline fixture families are represented", async () => {
  assert.deepEqual(BASELINE_FIXTURE_FAMILIES, [
    "result",
    "issue",
    "exit",
    "evidence",
    "process",
    "mutation",
    "artifact",
    "unknown-diagnostic",
    "source-cleanliness",
  ]);

  const families = (await readdir(fixtureRoot)).sort();
  assert.deepEqual(families, [...BASELINE_FIXTURE_FAMILIES].sort());
});

test("TST003-AC-001/004: equal runners are isolated and preserve every source fixture", async () => {
  for (const family of BASELINE_FIXTURE_FAMILIES) {
    const source = await fixturePath(family);
    const before = await readFile(join(source, "fixture.txt"));
    const locations = [];
    const parity = await runDifferentialParity({
      fixtureSource: source,
      legacy: matchingRunner("legacy", family, (path) => locations.push(path)),
      typescript: matchingRunner("typescript", family, (path) =>
        locations.push(path),
      ),
      normalizeLegacyDiagnostic(diagnostic) {
        return diagnostic === "PASS fixture"
          ? { ok: true, value: { kind: "pass", side: "semantic" } }
          : { ok: false };
      },
    });

    assert.deepEqual(parity, { ok: true, mismatches: [] });
    assert.equal(locations.length, 2);
    assert.notEqual(locations[0], locations[1]);
    assert.notEqual(locations[0], source);
    assert.notEqual(locations[1], source);
    assert.deepEqual(await readFile(join(source, "fixture.txt")), before);
  }
});

for (const mismatch of [
  "result",
  "issues",
  "exit",
  "evidence",
  "process",
  "mutation",
  "artifacts",
]) {
  test(`TST003-AC-002: detects a mismatched ${mismatch} observation`, async () => {
    const family =
      mismatch === "artifacts"
        ? "artifact"
        : mismatch === "mutation"
          ? "mutation"
          : "result";
    const parity = await runDifferentialParity({
      fixtureSource: await fixturePath(family),
      legacy: matchingRunner("legacy", family),
      typescript: async (context) => {
        const outcome = await matchingRunner("typescript", family)(context);
        if (mismatch === "result") outcome.result = { kind: "fail" };
        if (mismatch === "issues") outcome.issues = [];
        if (mismatch === "exit") outcome.exit = 1;
        if (mismatch === "evidence") context.observe.evidence({ mismatch });
        if (mismatch === "process") context.observe.process({ mismatch });
        if (mismatch === "mutation")
          await writeFile(
            join(context.fixture, "different.txt"),
            "different\n",
          );
        if (mismatch === "artifacts")
          await writeFile(
            join(context.artifacts, "different.txt"),
            "different\n",
          );
        return outcome;
      },
      normalizeLegacyDiagnostic: () => ({
        ok: true,
        value: { kind: "pass", side: "semantic" },
      }),
    });

    assert.deepEqual(parity, { ok: false, mismatches: [mismatch] });
  });
}

test("TST003-AC-003: unknown legacy diagnostics fail closed", async () => {
  const parity = await runDifferentialParity({
    fixtureSource: await fixturePath("unknown-diagnostic"),
    legacy: async () => ({
      result: { kind: "pass" },
      issues: [],
      exit: 0,
      legacyDiagnostic: "unrecognized legacy text",
    }),
    typescript: async () => ({ result: { kind: "pass" }, issues: [], exit: 0 }),
    normalizeLegacyDiagnostic: () => ({ ok: false }),
  });

  assert.deepEqual(parity, {
    ok: false,
    mismatches: ["LEGACY_DIAGNOSTIC_UNKNOWN"],
  });
});

test("TST003-AC-004: source fixture modification is a parity failure", async () => {
  const sourceFixture = await fixturePath("source-cleanliness");
  const sandbox = await mkdtemp(join(tmpdir(), "forgeflow-source-fixture-"));
  const source = join(sandbox, "fixture");
  const outcome = { result: { kind: "pass" }, issues: [], exit: 0 };
  let typescriptCopyReady;
  const typescriptCopied = new Promise((resolve) => {
    typescriptCopyReady = resolve;
  });
  let allowTypescriptReturn;
  const typescriptMayReturn = new Promise((resolve) => {
    allowTypescriptReturn = resolve;
  });

  try {
    await cp(sourceFixture, source, { recursive: true });
    const parity = await runDifferentialParity({
      fixtureSource: source,
      legacy: async () => {
        await typescriptCopied;
        await writeFile(
          join(source, "fixture.txt"),
          "modified source fixture\n",
        );
        allowTypescriptReturn();
        return outcome;
      },
      typescript: async () => {
        typescriptCopyReady();
        await typescriptMayReturn;
        return outcome;
      },
      normalizeLegacyDiagnostic: () => ({ ok: true, value: outcome.result }),
    });

    assert.deepEqual(parity, {
      ok: false,
      mismatches: ["FIXTURE_SOURCE_MODIFIED"],
    });
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});
