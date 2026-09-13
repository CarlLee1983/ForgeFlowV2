import { isDeepStrictEqual } from "node:util";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { deserialize, serialize } from "node:v8";

export const BASELINE_FIXTURE_FAMILIES = Object.freeze([
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

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function cloneObservation(value) {
  return deserialize(serialize(value));
}

async function snapshotTree(root) {
  const entries = [[".", "directory"]];

  async function visit(directory) {
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((left, right) => left.name.localeCompare(right.name, "en"));

    for (const child of children) {
      const path = join(directory, child.name);
      const entryPath = relative(root, path);
      const stats = await lstat(path);

      if (stats.isDirectory()) {
        entries.push([entryPath, "directory"]);
        await visit(path);
      } else if (stats.isFile()) {
        entries.push([
          entryPath,
          "file",
          (await readFile(path)).toString("base64"),
        ]);
      } else if (stats.isSymbolicLink()) {
        entries.push([entryPath, "symlink", await readlink(path)]);
      } else {
        entries.push([entryPath, "unsupported"]);
      }
    }
  }

  await visit(root);
  return entries;
}

function isRunnerOutcome(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    hasOwn(value, "result") &&
    hasOwn(value, "issues") &&
    hasOwn(value, "exit") &&
    Array.isArray(value.issues) &&
    typeof value.exit === "number"
  );
}

async function runSide({ side, fixtureSource, sandbox, runner, normalizer }) {
  const fixture = join(sandbox, side, "fixture");
  const artifacts = join(sandbox, side, "artifacts");
  const evidence = [];
  const process = [];

  await cp(fixtureSource, fixture, {
    recursive: true,
    verbatimSymlinks: true,
  });
  await mkdir(artifacts, { recursive: true });

  const outcome = await runner({
    fixture,
    artifacts,
    observe: Object.freeze({
      evidence(value) {
        evidence.push(cloneObservation(value));
      },
      process(value) {
        process.push(cloneObservation(value));
      },
    }),
  });

  if (!isRunnerOutcome(outcome)) {
    return { invalid: `${side.toUpperCase()}_OUTCOME_INVALID` };
  }

  let result = cloneObservation(outcome.result);
  if (side === "legacy" && hasOwn(outcome, "legacyDiagnostic")) {
    const normalized = await normalizer(outcome.legacyDiagnostic);
    if (
      normalized === null ||
      typeof normalized !== "object" ||
      normalized.ok !== true ||
      !hasOwn(normalized, "value")
    ) {
      return { invalid: "LEGACY_DIAGNOSTIC_UNKNOWN" };
    }
    result = cloneObservation(normalized.value);
  }

  return {
    result,
    issues: cloneObservation(outcome.issues),
    exit: outcome.exit,
    evidence,
    process,
    mutation: await snapshotTree(fixture),
    artifacts: await snapshotTree(artifacts),
  };
}

/**
 * Test-only parity seam. Runners receive private fixture copies and report
 * semantic output plus evidence and process observations. Human legacy output
 * is normalized only through the supplied allow-listing test helper.
 */
export async function runDifferentialParity({
  fixtureSource,
  legacy,
  typescript,
  normalizeLegacyDiagnostic,
}) {
  const sourceBefore = await snapshotTree(fixtureSource);
  const sandbox = await mkdtemp(join(tmpdir(), "forgeflow-parity-"));

  try {
    const [legacyObservation, typescriptObservation] = await Promise.all([
      runSide({
        side: "legacy",
        fixtureSource,
        sandbox,
        runner: legacy,
        normalizer: normalizeLegacyDiagnostic,
      }),
      runSide({
        side: "typescript",
        fixtureSource,
        sandbox,
        runner: typescript,
        normalizer: normalizeLegacyDiagnostic,
      }),
    ]);
    const mismatches = [];

    if (legacyObservation.invalid !== undefined) {
      mismatches.push(legacyObservation.invalid);
    }
    if (typescriptObservation.invalid !== undefined) {
      mismatches.push(typescriptObservation.invalid);
    }
    if (mismatches.length === 0) {
      for (const field of [
        "result",
        "issues",
        "exit",
        "evidence",
        "process",
        "mutation",
        "artifacts",
      ]) {
        if (
          !isDeepStrictEqual(
            legacyObservation[field],
            typescriptObservation[field],
          )
        ) {
          mismatches.push(field);
        }
      }
    }

    if (!isDeepStrictEqual(sourceBefore, await snapshotTree(fixtureSource))) {
      mismatches.push("FIXTURE_SOURCE_MODIFIED");
    }

    return { ok: mismatches.length === 0, mismatches };
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
}
