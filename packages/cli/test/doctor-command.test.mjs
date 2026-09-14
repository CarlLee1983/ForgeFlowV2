import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  evaluateRepositoryDoctor,
  validateResultEnvelope,
} from "@forgeflow/core";

import { runDoctor } from "../dist/doctor.js";

const bin = fileURLToPath(
  new globalThis.URL("../dist/bin.js", import.meta.url),
);

function runCli(args, cwd) {
  return spawnSync(globalThis.process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
  });
}

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-doctor-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "specs", "stories", "TST-900-fixture"), {
    recursive: true,
  });
  await writeFile(join(root, "AGENTS.md"), "Follow the Story.\n");
  await writeFile(join(root, "Makefile"), "verify:\n\t@:\n");
  await writeFile(
    join(root, "specs", "stories", "TST-900-fixture", "story.md"),
    `# Story: TST-900 Fixture

## Classification

* Security sensitive: no
* Baseline conformance: no
`,
  );
  await writeFile(
    join(root, "specs", "stories", "TST-900-fixture", "acceptance.md"),
    "# Acceptance Criteria\n",
  );
  return root;
}

function parseJson(result, expectedExit) {
  assert.equal(result.status, expectedExit);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.endsWith("\n"), true);
  assert.equal(result.stdout.trimEnd().split("\n").length, 1);
  const parsed = JSON.parse(result.stdout);
  assert.deepEqual(validateResultEnvelope(parsed), { ok: true, value: parsed });
  assert.equal(parsed.exit, expectedExit);
  assert.equal(parsed.subject, "repository");
  return parsed;
}

test("TST009-AC-001: doctor reports a conformant static repository in human and JSON modes", async (t) => {
  const root = await fixture(t);
  const human = runCli(["doctor"], root);
  assert.equal(human.status, 0);
  assert.equal(human.stderr, "");
  assert.match(human.stdout, /^ForgeFlow Doctor$/m);
  assert.match(human.stdout, /^Story contract: STORY_CONTRACT_OK$/m);
  assert.match(human.stdout, /^Handoff: NOT_PRESENT$/m);
  assert.match(human.stdout, /^Result: STRUCTURE_OK$/m);
  const json = parseJson(runCli(["doctor", "--json"], root), 0);
  assert.equal(json.status, "pass");
  assert.equal(json.outcome, "success");
  assert.deepEqual(json.issues, []);
});

test("TST009-AC-002: marker, Story, and Handoff drift remain advisory", async (t) => {
  const root = await fixture(t);
  await writeFile(
    join(root, "specs", ".forgeflow-adoption"),
    "version=not-this-version\r\n",
  );
  await writeFile(join(root, "specs", "handoff.md"), "# Handoff\n");
  const human = runCli(["doctor"], root);
  assert.equal(human.status, 0);
  assert.match(human.stdout, /^Adopted version: not-this-version$/m);
  assert.match(human.stdout, /^Handoff: HANDOFF_CONTRACT_INCOMPLETE$/m);
  assert.match(human.stdout, /^Result: CONTRACT_DRIFT$/m);
  const json = parseJson(runCli(["doctor", "--json"], root), 0);
  assert.equal(json.status, "warning");
  assert.equal(json.outcome, "warning");
});

test("TST009-AC-003/004: static inspection does not mutate and rejects an internal symlink", async (t) => {
  const root = await fixture(t);
  const agents = join(root, "AGENTS.md");
  const before = await readFile(agents, "utf8");
  await rm(agents);
  await symlink(join(root, "Makefile"), agents);
  const result = parseJson(runCli(["doctor", "--json"], root), 2);
  assert.equal(result.status, "error");
  assert.equal(result.outcome, "configuration-error");
  assert.equal(result.issues[0].code, "REPOSITORY_PATH_SYMLINK");
  assert.equal(
    await readFile(join(root, "Makefile"), "utf8"),
    "verify:\n\t@:\n",
  );
  assert.notEqual(before, "");
});

test("TST009-AC-004: a missing required path is incomplete rather than unsafe", async (t) => {
  const root = await fixture(t);
  await rm(join(root, "Makefile"));
  const result = parseJson(runCli(["doctor", "--json"], root), 1);
  assert.equal(result.status, "fail");
  assert.equal(result.outcome, "failure");
  assert.equal(result.issues[0].code, "REPOSITORY_REQUIRED_MISSING");
});

test("TST009-AC-004: unsafe ancestors and blank composed sources are errors", async (t) => {
  const root = await fixture(t);
  const outside = join(root, "outside-specs");
  await mkdir(join(outside, "stories"), { recursive: true });
  await rm(join(root, "specs"), { recursive: true });
  await symlink(outside, join(root, "specs"));
  const unsafe = parseJson(runCli(["doctor", "--json"], root), 2);
  assert.equal(unsafe.issues[0].code, "REPOSITORY_PATH_SYMLINK");

  const blankRoot = await fixture(t);
  await writeFile(
    join(blankRoot, "specs", "stories", "TST-900-fixture", "story.md"),
    "",
  );
  const blank = parseJson(runCli(["doctor", "--json"], blankRoot), 2);
  assert.equal(blank.issues[0].code, "REPOSITORY_COMPOSED_UNCONFIRMABLE");
});

test("TST009-AC-004/005: a fake filesystem adapter deterministically reports an unreadable required file", async (t) => {
  const root = await fixture(t);
  const execution = await runDoctor([], root, {
    async inspect() {
      return evaluateRepositoryDoctor({
        checkoutVersion: "0.9.0",
        agents: { kind: "file", readable: false },
        specs: { kind: "directory", readable: true, searchable: true },
        stories: { kind: "directory", readable: true, searchable: true },
        makefile: { kind: "file", readable: true, text: "verify:\n" },
        adoptionMarker: { kind: "missing" },
        guidance: { kind: "missing" },
        guidanceEntry: { kind: "missing" },
        skills: { kind: "missing" },
        agentSkills: { kind: "missing" },
        github: { kind: "missing" },
        storyContract: "not-checked",
        handoffContract: "not-checked",
      });
    },
  });
  assert.equal(execution.evaluation.outcome, "ERROR");
  assert.equal(execution.evaluation.exit, 2);
  assert.deepEqual(
    execution.evaluation.result.issues.map(({ code }) => code),
    ["REPOSITORY_REQUIRED_UNREADABLE"],
  );
});

test("TST009-AC-002: a double-colon Make rule remains a static clue", async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, "Makefile"), "verify::\n\t@:\n");
  const human = runCli(["doctor"], root);
  assert.equal(human.status, 0);
  assert.match(human.stdout, /Found a literal verify rule; not executed/);
});

test("TST009-AC-001: doctor has focused static help and JSON usage errors", async (t) => {
  const root = await fixture(t);
  const help = runCli(["doctor", "--help"], root);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /^ForgeFlow Repository Doctor\n\n/);
  assert.match(help.stdout, /executes repository-owned code/);
  const invalid = parseJson(runCli(["doctor", "--json", "--unknown"], root), 2);
  assert.equal(invalid.outcome, "usage-error");
  assert.equal(invalid.issues[0].code, "DOCTOR_USAGE");
});

test("TST009-AC-003: production Doctor has no process or target-write API", async () => {
  const source = await readFile(
    fileURLToPath(new globalThis.URL("../src/doctor.ts", import.meta.url)),
    "utf8",
  );
  assert.doesNotMatch(source, /node:child_process|spawn\(|exec\(/);
  assert.doesNotMatch(source, /\b(?:spawnSync|execFile|fork)\b/);
  assert.doesNotMatch(source, /writeFile|appendFile|mkdir\(|rm\(/);
});
