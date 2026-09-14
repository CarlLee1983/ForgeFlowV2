import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

import { runDifferentialParity } from "./support/differential-parity-harness.mjs";

const execFile = promisify(execFileCallback);
const doctor = fileURLToPath(
  new globalThis.URL("../../../scripts/doctor", import.meta.url),
);
const bin = fileURLToPath(
  new globalThis.URL("../dist/bin.js", import.meta.url),
);

async function writeFixture(root, options = {}) {
  await mkdir(join(root, "specs", "stories", "TST-901-fixture"), {
    recursive: true,
  });
  await writeFile(join(root, "AGENTS.md"), "agent guide\n");
  await writeFile(join(root, "Makefile"), "verify:\n\t@:\n");
  await writeFile(
    join(root, "specs", "stories", "TST-901-fixture", "story.md"),
    "# Story: TST-901 Fixture\n\n## Classification\n\n* Security sensitive: no\n* Baseline conformance: no\n",
  );
  await writeFile(
    join(root, "specs", "stories", "TST-901-fixture", "acceptance.md"),
    "# Acceptance Criteria\n",
  );
  if (options.marker !== undefined)
    await writeFile(join(root, "specs", ".forgeflow-adoption"), options.marker);
  if (options.makefile !== undefined)
    await writeFile(join(root, "Makefile"), options.makefile);
  if (options.handoff !== undefined)
    await writeFile(join(root, "specs", "handoff.md"), options.handoff);
  if (options.guidance) {
    await mkdir(join(root, "guidance"));
    if (options.guidance === "complete")
      await writeFile(join(root, "guidance", "ENTRY.md"), "guidance\n");
  }
  if (options.noStories)
    await rm(join(root, "specs", "stories", "TST-901-fixture"), {
      recursive: true,
    });
  if (options.missingMakefile) await rm(join(root, "Makefile"));
  if (options.blankStory)
    await writeFile(
      join(root, "specs", "stories", "TST-901-fixture", "story.md"),
      "",
    );
  if (options.symlinkAgents) {
    await rm(join(root, "AGENTS.md"));
    await symlink(join(root, "Makefile"), join(root, "AGENTS.md"));
  }
}

function outcomeFrom(stdout) {
  const match = /^Result: (\S+)$/m.exec(stdout);
  return match?.[1];
}

function factsFrom(stdout) {
  const summary = stdout
    .split("\n")
    .filter((line) =>
      /^(?:Adopted version|Story contract|Handoff|Guidance|Skills|CI capability|Result): /.test(
        line,
      ),
    )
    .concat(
      stdout.includes("INFO  Found a literal verify rule; not executed")
        ? ["verify-rule=FOUND"]
        : ["verify-rule=UNCONFIRMED"],
      stdout.includes("static inspection is limited")
        ? ["makefile-limited=LIMITED"]
        : ["makefile-limited=NOT_LIMITED"],
    );
  return [
    ...(stdout.includes("PASS  Agent guide: AGENTS.md") ? ["agents=OK"] : []),
    ...(stdout.includes("PASS  Story directory: specs/stories/")
      ? ["stories=OK"]
      : []),
    ...(stdout.includes("PASS  Makefile: readable") ? ["makefile=OK"] : []),
    ...summary,
  ];
}

function issuesFrom(stdout) {
  return stdout.split("\n").flatMap((line) => {
    const match = /^(?:FAIL|ERROR) +(.+)$/.exec(line);
    if (match === null) return [];
    if (
      /composed|Story contract check could not read|STORY_CONTRACT_OK observation/i.test(
        match[1],
      )
    )
      return ["REPOSITORY_COMPOSED_UNCONFIRMABLE"];
    if (/symbolic link|symlink/i.test(match[1]))
      return ["REPOSITORY_PATH_SYMLINK"];
    if (/missing/i.test(match[1])) return ["REPOSITORY_REQUIRED_MISSING"];
    return [`UNKNOWN_DOCTOR_DIAGNOSTIC:${match[1]}`];
  });
}

async function command(file, args, cwd) {
  try {
    const value = await execFile(file, args, { cwd, encoding: "utf8" });
    return { stdout: value.stdout, exit: 0 };
  } catch (error) {
    return { stdout: error.stdout ?? "", exit: error.code ?? 2 };
  }
}

/** The legacy normalizer admits only Doctor's stable summary facts. */
function normalizeLegacyDiagnostic(stdout) {
  const outcome = outcomeFrom(stdout);
  return outcome === undefined
    ? { ok: false }
    : { ok: true, value: { outcome, facts: factsFrom(stdout) } };
}

test("TST009-AC-002/003: retained static Doctor corpus has result, effect, and manifest parity", async (t) => {
  const source = await mkdtemp(
    join(tmpdir(), "forgeflow-doctor-parity-source-"),
  );
  t.after(() => rm(source, { recursive: true, force: true }));

  for (const [name, options] of [
    ["conformant", {}],
    ["marker-drift", { marker: "version=0.0.0\r\n" }],
    ["blank-story", { blankStory: true }],
    ["unsafe-agent", { symlinkAgents: true }],
    ["no-stories", { noStories: true }],
    ["handoff-drift", { handoff: "# Handoff\n" }],
    ["guidance-drift", { guidance: "incomplete" }],
    [
      "limited-makefile",
      { makefile: "include local.mk\nverify: = documented clue\n" },
    ],
    ["double-colon-assignment", { makefile: "verify::= not-a-rule\n" }],
    ["tab-separated-target", { makefile: "verify\t:\n" }],
    ["missing-makefile", { missingMakefile: true }],
  ]) {
    const fixture = join(source, name);
    await writeFixture(fixture, options);
    const observation = await runDifferentialParity({
      fixtureSource: fixture,
      legacy: async ({ fixture: isolated, observe }) => {
        const executed = await command(doctor, [isolated], source);
        observe.process({ targetOwned: 0, command: "static-doctor" });
        return {
          result: {
            outcome: outcomeFrom(executed.stdout),
            facts: factsFrom(executed.stdout),
          },
          issues: issuesFrom(executed.stdout),
          exit: executed.exit,
          legacyDiagnostic: executed.stdout,
        };
      },
      typescript: async ({ fixture: isolated, observe }) => {
        const executed = await command(
          globalThis.process.execPath,
          [bin, "doctor", isolated],
          source,
        );
        observe.process({ targetOwned: 0, command: "static-doctor" });
        return {
          result: {
            outcome: outcomeFrom(executed.stdout),
            facts: factsFrom(executed.stdout),
          },
          issues: issuesFrom(executed.stdout),
          exit: executed.exit,
        };
      },
      normalizeLegacyDiagnostic,
    });
    assert.deepEqual(observation, { ok: true, mismatches: [] }, name);
  }
});

test("TST010-AC-001: explicit Doctor verification retains the shell success result and exit", async (t) => {
  const source = await mkdtemp(
    join(tmpdir(), "forgeflow-doctor-execution-parity-"),
  );
  t.after(() => rm(source, { recursive: true, force: true }));
  const fixture = join(source, "conformant");
  await writeFixture(fixture);

  const legacy = await command(doctor, ["--run-verify", fixture], source);
  const typescript = await command(
    globalThis.process.execPath,
    [bin, "doctor", "--run-verify", fixture],
    source,
  );

  assert.equal(typescript.exit, legacy.exit);
  assert.equal(outcomeFrom(typescript.stdout), outcomeFrom(legacy.stdout));
  assert.match(typescript.stdout, /^Verification: PASS$/m);
  assert.match(typescript.stdout, /^Verification exit: 0$/m);
});
