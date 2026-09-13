import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { constants } from "node:fs";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validateResultEnvelope } from "@forgeflow/core";

import {
  createNodeStoryReader,
  nodeStoryFileAccess,
  renderVerificationHuman,
  runVerificationCheck,
} from "../dist/verification.js";

const bin = fileURLToPath(
  new globalThis.URL("../dist/bin.js", import.meta.url),
);
const storySource = `# Story: TST-005 Fixture

## Goal

Provide a deterministic Story fixture.

## Classification

* Security sensitive: no
* Baseline conformance: no
`;
const acceptanceSource = `# Acceptance Criteria

## Happy Path

* [ ] AC-001: Fixture happy path.
`;

function runCli(args, cwd) {
  return spawnSync(globalThis.process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function parseMachineResult(result, expectedExit) {
  assert.equal(result.status, expectedExit);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.endsWith("\n"), true);
  assert.equal(result.stdout.trimEnd().split("\n").length, 1);
  const envelope = JSON.parse(result.stdout);
  assert.deepEqual(validateResultEnvelope(envelope), {
    ok: true,
    value: envelope,
  });
  assert.equal(envelope.exit, expectedExit);
  assert.equal(envelope.subject, "verification");
  return envelope;
}

async function newStory(root, name, story = storySource) {
  const directory = join(root, "specs", "stories", name);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "story.md"), story);
  await writeFile(join(directory, "acceptance.md"), acceptanceSource);
  return directory;
}

async function sandbox(t) {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-verification-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("TST005-AC-001: a resolved plan has exact human output and exit 0", async (t) => {
  const root = await sandbox(t);
  await newStory(root, "TST-500-fixture");

  const human = runCli(["verification", "check"], root);
  assert.equal(human.status, 0);
  assert.equal(human.stderr, "");
  assert.equal(
    human.stdout,
    `ForgeFlow Verification Check

specs/stories/TST-500-fixture:
  Task mode: execution
  Authority: plan=yes modify=yes add_dependency=no migration=no commit=no push=no deploy=no
  Risk level: low
  Architecture impact: low
  Required checks: lint static unit

Result: VERIFICATION_PLAN_OK
Stories checked: 1

Next:
A resolved plan only. Run make verify, record the result, and take
the work to human review.
`,
  );

  const machine = parseMachineResult(
    runCli(["verification", "check", "--json"], root),
    0,
  );
  assert.deepEqual(machine.issues, []);
  assert.equal(machine.status, "pass");
});

test("TST005-AC-001: a declared Story renders its resolved contract", async (t) => {
  const root = await sandbox(t);
  await newStory(
    root,
    "TST-501-declared",
    `${storySource.replace(
      "* Baseline conformance: no\n",
      "* Baseline conformance: no\n* Task mode: mixed\n",
    )}
## Authority

* modify: yes
* commit: yes

## Architecture

* Impact: medium
* Boundary: \`Gateway\`

## Risk

* Level: medium
* Reason: \`external-api\`
`,
  );

  const human = runCli(
    ["verification", "check", "specs/stories/TST-501-declared"],
    root,
  );
  assert.equal(human.status, 0);
  assert.match(human.stdout, /^ {2}Task mode: mixed$/m);
  assert.match(
    human.stdout,
    /^ {2}Authority: plan=yes modify=yes add_dependency=no migration=no commit=yes push=no deploy=no$/m,
  );
  assert.match(human.stdout, /^ {2}Risk level: medium$/m);
  assert.match(human.stdout, /^ {2}Architecture impact: medium$/m);
  assert.match(
    human.stdout,
    /^ {2}Required checks: lint static unit integration architecture$/m,
  );
  assert.match(human.stdout, /^Result: VERIFICATION_PLAN_OK$/m);
});

test("TST005-AC-003: an incomplete plan reports ordered failures and exit 1", async (t) => {
  const root = await sandbox(t);
  await newStory(
    root,
    "TST-502-incomplete",
    `${storySource}
## Authority

* merge: yes
* modify: maybe
`,
  );

  const human = runCli(["verification", "check"], root);
  assert.equal(human.status, 1);
  assert.equal(human.stderr, "");
  assert.equal(
    human.stdout,
    `ForgeFlow Verification Check
FAIL  specs/stories/TST-502-incomplete: plan: authority declares an unknown operation: merge
FAIL  specs/stories/TST-502-incomplete: plan: authority modify must be declared as yes or no

specs/stories/TST-502-incomplete:
  Task mode: execution
  Authority: plan=yes modify=yes add_dependency=no migration=no commit=no push=no deploy=no
  Risk level: low
  Architecture impact: low
  Required checks: lint static unit

Result: VERIFICATION_PLAN_INCOMPLETE
Stories checked: 1

Next:
Correct the reported task mode, authority, architecture, or risk
declaration in the Story, then run this check again.
`,
  );

  const machine = parseMachineResult(
    runCli(["verification", "check", "--json"], root),
    1,
  );
  assert.equal(machine.status, "fail");
  assert.deepEqual(
    machine.issues.map((issue) => issue.code),
    [
      "VERIFICATION_AUTHORITY_UNKNOWN_OPERATION",
      "VERIFICATION_AUTHORITY_VALUE_INVALID",
    ],
  );
});

test("TST005-AC-001: every discovered Story is checked in order", async (t) => {
  const root = await sandbox(t);
  await newStory(root, "TST-503-b");
  await newStory(root, "TST-503-a");
  await mkdir(join(root, "specs", "stories", "_template"), { recursive: true });
  await writeFile(join(root, "specs", "stories", "README.md"), "ignored\n");

  const human = runCli(["verification", "check"], root);
  assert.equal(human.status, 0);
  assert.deepEqual(
    human.stdout.split("\n").filter((line) => line.endsWith(":")),
    ["specs/stories/TST-503-a:", "specs/stories/TST-503-b:", "Next:"],
  );
  assert.match(human.stdout, /^Stories checked: 2$/m);
});

test("TST005-AC-004: acquisition defects emit one error result and exit 2", async (t) => {
  const root = await sandbox(t);
  const complete = await newStory(root, "TST-504-complete");
  const missingFile = await newStory(root, "TST-504-missing-acceptance");
  await rm(join(missingFile, "acceptance.md"));
  const empty = await newStory(root, "TST-504-empty");
  await writeFile(join(empty, "story.md"), "");
  const linked = await newStory(root, "TST-504-symlink");
  await rm(join(linked, "story.md"));
  await symlink(join(complete, "story.md"), join(linked, "story.md"));
  const unreadable = await newStory(root, "TST-504-unreadable");
  await chmod(join(unreadable, "story.md"), 0o000);
  t.after(() => chmod(join(unreadable, "story.md"), 0o600).catch(() => {}));

  for (const [name, target, code] of [
    ["missing directory", "specs/stories/absent", "VERIFICATION_STORY_MISSING"],
    [
      "file argument",
      "specs/stories/TST-504-complete/story.md",
      "VERIFICATION_STORY_MISSING",
    ],
    [
      "missing acceptance",
      "specs/stories/TST-504-missing-acceptance",
      "VERIFICATION_STORY_FILE_UNAVAILABLE",
    ],
    [
      "empty story",
      "specs/stories/TST-504-empty",
      "VERIFICATION_STORY_FILE_UNAVAILABLE",
    ],
    [
      "unreadable story",
      "specs/stories/TST-504-unreadable",
      "VERIFICATION_STORY_FILE_UNAVAILABLE",
    ],
    [
      "symlinked story",
      "specs/stories/TST-504-symlink",
      "VERIFICATION_STORY_FILE_SYMLINK",
    ],
  ]) {
    await t.test(name, () => {
      const envelope = parseMachineResult(
        runCli(["verification", "check", "--json", target], root),
        2,
      );
      assert.equal(envelope.status, "error");
      assert.equal(envelope.outcome, "configuration-error");
      assert.equal(envelope.issues[0].code, code);
    });
  }
});

test("TST005-AC-004: a repository with no Story is an error, not a pass", async (t) => {
  const root = await sandbox(t);

  const absent = parseMachineResult(
    runCli(["verification", "check", "--json"], root),
    2,
  );
  assert.equal(absent.issues[0].code, "VERIFICATION_STORIES_ROOT_MISSING");

  await mkdir(join(root, "specs", "stories"), { recursive: true });
  const empty = parseMachineResult(
    runCli(["verification", "check", "--json"], root),
    2,
  );
  assert.equal(empty.issues[0].code, "VERIFICATION_NO_STORY_CHECKED");

  const human = runCli(["verification", "check"], root);
  assert.equal(human.status, 2);
  assert.match(human.stdout, /^Result: ERROR$/m);
  assert.match(human.stdout, /^Stories checked: 0$/m);
  assert.match(human.stderr, /^ERROR No Story directory was checked$/m);
});

test("TST005-AC-004: an acquisition error dominates a plan failure", async (t) => {
  const root = await sandbox(t);
  await newStory(
    root,
    "TST-505-incomplete",
    `${storySource}\n## Authority\n\n* merge: yes\n`,
  );
  const broken = await newStory(root, "TST-505-broken");
  await rm(join(broken, "story.md"));

  const envelope = parseMachineResult(
    runCli(["verification", "check", "--json"], root),
    2,
  );
  assert.equal(envelope.outcome, "configuration-error");
  assert.deepEqual(
    envelope.issues.map((issue) => issue.code),
    [
      "VERIFICATION_STORY_FILE_UNAVAILABLE",
      "VERIFICATION_AUTHORITY_UNKNOWN_OPERATION",
    ],
  );

  const human = runCli(["verification", "check"], root);
  assert.equal(human.status, 2);
  assert.match(human.stdout, /^Result: ERROR$/m);
  assert.doesNotMatch(human.stdout, /VERIFICATION_PLAN/);
  assert.match(
    human.stderr,
    /^ERROR specs\/stories\/TST-505-broken: required Story file is missing or unreadable: specs\/stories\/TST-505-broken\/story\.md$/m,
  );
});

test("TST005-AC-002: each Story reports its failures before its own plan", async (t) => {
  const root = await sandbox(t);
  await newStory(
    root,
    "TST-508-a",
    `${storySource}\n## Risk\n\n* Level: critical\n`,
  );
  await newStory(
    root,
    "TST-508-b",
    `${storySource}\n## Authority\n\n* merge: yes\n`,
  );
  await mkdir(join(root, "specs", "stories", ".hidden"), { recursive: true });

  const human = runCli(["verification", "check"], root);
  assert.equal(human.status, 1);
  assert.deepEqual(
    human.stdout
      .split("\n")
      .filter((line) => line.startsWith("FAIL") || line.endsWith(":"))
      .map((line) => line.replace(/: plan: .*$/, ": plan"))
      .filter((line) => line !== "Next:"),
    [
      "FAIL  specs/stories/TST-508-a: plan",
      "specs/stories/TST-508-a:",
      "FAIL  specs/stories/TST-508-b: plan",
      "specs/stories/TST-508-b:",
    ],
  );
  assert.match(human.stdout, /^Stories checked: 2$/m);

  const machine = parseMachineResult(
    runCli(["verification", "check", "--json"], root),
    1,
  );
  assert.deepEqual(
    machine.issues.map((issue) => issue.code),
    [
      "VERIFICATION_RISK_LEVEL_INVALID",
      "VERIFICATION_AUTHORITY_UNKNOWN_OPERATION",
    ],
  );
});

test("TST005-AC-004: JSON mode survives invalid options", async (t) => {
  const root = await sandbox(t);
  await newStory(root, "TST-506-fixture");

  for (const args of [
    ["verification", "check", "--json", "--unknown"],
    ["verification", "check", "--json", "--json"],
    ["verification", "check", "--json", "--result", "--result"],
  ]) {
    const envelope = parseMachineResult(runCli(args, root), 2);
    assert.equal(envelope.outcome, "usage-error");
    assert.equal(envelope.issues[0].code, "INVALID_ARGUMENTS");
  }

  const misplaced = runCli(["verification", "check", "story", "--json"], root);
  assert.equal(misplaced.status, 2);
  assert.equal(misplaced.stdout, "\nResult: ERROR\nStories checked: 0\n");
  assert.match(misplaced.stderr, /^ERROR Invalid arguments\n/);
});

test("TST005-AC-004: the verification subcommand exposes focused help", () => {
  const result = runCli(["verification", "check", "--help"]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^ForgeFlow Verification Check\n\n/);
  assert.match(
    result.stdout,
    /forgeflow verification check \[--result\] \[--json\] \[story-directory \.\.\.\]/,
  );
  assert.match(result.stdout, /static and read-only/);
});

test("TST005-AC-005: the adapter reads only required Story files and writes nothing", async (t) => {
  const root = await sandbox(t);
  const story = await newStory(root, "TST-507-readonly");
  const beforeBytes = await readFile(join(story, "story.md"));
  const beforeEntries = await readdir(story);
  const beforeStats = await lstat(join(story, "story.md"));

  parseMachineResult(runCli(["verification", "check", "--json"], root), 0);

  assert.deepEqual(await readFile(join(story, "story.md")), beforeBytes);
  assert.deepEqual(await readdir(story), beforeEntries);
  assert.equal(
    (await lstat(join(story, "story.md"))).mtimeMs,
    beforeStats.mtimeMs,
  );

  const reads = [];
  const execution = await runVerificationCheck(["fixture"], {
    async discover() {
      throw new Error("an explicit Story argument must not discover");
    },
    async isStoryDirectory() {
      return true;
    },
    async readStoryFile(path) {
      reads.push(path);
      return { ok: true, source: storySource };
    },
  });
  assert.deepEqual(reads, ["fixture/story.md", "fixture/acceptance.md"]);
  assert.equal(execution.result.exit, 0);
});

test("TST005-AC-005: the opened handle is no-follow, nonblocking, and revalidated", async () => {
  const operations = [];
  const reader = createNodeStoryReader({
    async lstat(path) {
      operations.push(["lstat", path]);
      return {
        size: storySource.length,
        isFile: () => true,
        isDirectory: () => false,
        isSymbolicLink: () => false,
      };
    },
    async open(path, flags) {
      operations.push(["open", path, flags]);
      assert.notEqual(flags & constants.O_NOFOLLOW, 0);
      assert.notEqual(flags & constants.O_NONBLOCK, 0);
      return {
        async stat() {
          operations.push(["stat"]);
          return { size: 0, isFile: () => false, isSymbolicLink: () => false };
        },
        async readFile() {
          operations.push(["read"]);
          throw new Error("a replaced non-regular path must not be read");
        },
        async close() {
          operations.push(["close"]);
        },
      };
    },
    async readdir() {
      throw new Error("this fixture does not discover");
    },
  });

  assert.deepEqual(await reader.readStoryFile("story.md"), {
    ok: false,
    reason: "unavailable",
  });
  assert.deepEqual(
    operations.map(([operation]) => operation),
    ["lstat", "open", "stat", "close"],
  );
});

test("TST005-AC-004/005: an adapter failure becomes a rendered configuration result", async () => {
  const execution = await runVerificationCheck(["broken"], {
    async discover() {
      return { ok: false };
    },
    async isStoryDirectory() {
      return true;
    },
    async readStoryFile() {
      return { ok: false, reason: "unavailable" };
    },
  });

  assert.deepEqual(validateResultEnvelope(execution.result), {
    ok: true,
    value: execution.result,
  });
  assert.equal(execution.result.exit, 2);
  const rendered = renderVerificationHuman(execution);
  assert.match(rendered.stderr, /broken\/story\.md/);
  assert.match(rendered.stdout, /Result: ERROR/);
});

test("TST005-AC-005: production verification modules contain no process or write API", async () => {
  const sourceRoot = new globalThis.URL("../src/", import.meta.url);
  for (const name of ["bin.ts", "verification.ts", "source.ts"]) {
    const source = await readFile(new globalThis.URL(name, sourceRoot), "utf8");
    assert.doesNotMatch(source, /node:child_process/);
    assert.doesNotMatch(
      source,
      /\b(?:writeFile|appendFile|truncate|rename|unlink|rm|mkdir|cp)\b/,
    );
  }
});

const recordSource = `# Verification Result: TST-006

## Checks

* lint: pass — \`pnpm run lint\`
* static: pass — \`pnpm run typecheck\`
* unit: pass — \`pnpm test\`

## Evidence

* \`AC-001\`: pass — \`the unit suite proved the happy path\`

## Authority Used

* plan
* modify
`;

async function newRecordedStory(root, name, record = recordSource) {
  const directory = await newStory(root, name);
  if (record !== undefined)
    await writeFile(join(directory, "verification.md"), record);
  return directory;
}

test("TST006-AC-001: a complete record has exact human output and exit 0", async (t) => {
  const root = await sandbox(t);
  await newRecordedStory(root, "TST-600-fixture");

  const human = runCli(["verification", "check", "--result"], root);
  assert.equal(human.status, 0);
  assert.equal(human.stderr, "");
  assert.equal(
    human.stdout,
    `ForgeFlow Verification Check

specs/stories/TST-600-fixture:
  Task mode: execution
  Authority: plan=yes modify=yes add_dependency=no migration=no commit=no push=no deploy=no
  Risk level: low
  Architecture impact: low
  Required checks: lint static unit
  Checks: lint=pass static=pass unit=pass
  Evidence traced: 1 of 1
  Status: PASS

Plan: VERIFICATION_PLAN_OK
Result: VERIFICATION_PASS
Stories checked: 1

Next:
Declared evidence only. Human Review still decides product, design,
and architecture acceptance.
`,
  );

  const machine = parseMachineResult(
    runCli(["verification", "check", "--result", "--json"], root),
    0,
  );
  assert.deepEqual(machine.issues, []);
  assert.equal(machine.status, "pass");

  const reordered = parseMachineResult(
    runCli(["verification", "check", "--json", "--result"], root),
    0,
  );
  assert.deepEqual(reordered, machine);
});

test("TST006-AC-004: a partial record reports its unproven observations", async (t) => {
  const root = await sandbox(t);
  await newRecordedStory(
    root,
    "TST-601-fixture",
    recordSource.replace("* unit: pass — `pnpm test`\n", ""),
  );

  const human = runCli(["verification", "check", "--result"], root);
  assert.equal(human.status, 1);
  assert.equal(human.stderr, "");
  assert.match(
    human.stdout,
    /^WARN {2}specs\/stories\/TST-601-fixture: required check is not recorded: unit$/m,
  );
  assert.match(
    human.stdout,
    /^FAIL {2}specs\/stories\/TST-601-fixture: result: incomplete verification must record at least one residual risk$/m,
  );
  assert.match(human.stdout, /^ {2}Status: PARTIAL$/m);
  assert.match(human.stdout, /^Result: VERIFICATION_RESULT_INCOMPLETE$/m);

  const machine = parseMachineResult(
    runCli(["verification", "check", "--result", "--json"], root),
    1,
  );
  assert.deepEqual(
    machine.issues.map((entry) => entry.code),
    [
      "VERIFICATION_REQUIRED_CHECK_NOT_RECORDED",
      "VERIFICATION_RESIDUAL_RISK_REQUIRED",
    ],
  );
});

test("TST006-AC-004: record outcomes stay distinct across Stories", async (t) => {
  const root = await sandbox(t);
  await newRecordedStory(root, "TST-602-pass");
  await newRecordedStory(
    root,
    "TST-603-fail",
    recordSource.replace("* unit: pass", "* unit: fail"),
  );

  const failing = runCli(["verification", "check", "--result"], root);
  assert.equal(failing.status, 1);
  assert.match(failing.stdout, /^Result: VERIFICATION_FAIL$/m);
  assert.match(failing.stdout, /^ {2}Status: PASS$/m);
  assert.match(failing.stdout, /^ {2}Status: FAIL$/m);

  await rm(join(root, "specs", "stories", "TST-603-fail"), {
    recursive: true,
    force: true,
  });
  await newRecordedStory(
    root,
    "TST-604-partial",
    `${recordSource.replace("* unit: pass — `pnpm test`\n", "")}
## Residual Risks

* \`the unit layer is unproven\`
`,
  );

  const partial = runCli(["verification", "check", "--result"], root);
  assert.equal(partial.status, 1);
  assert.match(partial.stdout, /^Result: VERIFICATION_PARTIAL$/m);
  assert.doesNotMatch(partial.stdout, /^FAIL /m);
});

test("TST006-AC-005: an unsafe record is an operational error", async (t) => {
  const root = await sandbox(t);
  const directory = await newStory(root, "TST-605-fixture");
  const target = join(root, "elsewhere.md");
  await writeFile(target, recordSource);
  await symlink(target, join(directory, "verification.md"));

  const human = runCli(["verification", "check", "--result"], root);
  assert.equal(human.status, 2);
  assert.match(human.stdout, /^Result: ERROR$/m);
  assert.doesNotMatch(human.stdout, /^Plan: /m);
  assert.equal(
    human.stderr,
    "ERROR specs/stories/TST-605-fixture: verification record is a symlink: specs/stories/TST-605-fixture/verification.md\n",
  );

  const machine = parseMachineResult(
    runCli(["verification", "check", "--result", "--json"], root),
    2,
  );
  assert.equal(machine.issues[0].code, "VERIFICATION_STORY_FILE_SYMLINK");
});

test("TST006-AC-005: result mode reads only, and reports declared facts", async (t) => {
  const root = await sandbox(t);
  const directory = await newRecordedStory(root, "TST-606-fixture");
  const before = await readFile(join(directory, "verification.md"), "utf8");
  const reads = [];
  const reader = createNodeStoryReader(
    {
      ...nodeStoryFileAccess,
      open(path, flags) {
        reads.push([path, flags]);
        return nodeStoryFileAccess.open(path, flags);
      },
    },
    root,
  );

  const execution = await runVerificationCheck(["--result"], reader);
  const entry = execution.entries[0];

  assert.equal(entry.kind, "record");
  assert.deepEqual(entry.evaluation.record, {
    checks: [
      { layer: "lint", status: "pass" },
      { layer: "static", status: "pass" },
      { layer: "unit", status: "pass" },
    ],
    evidenceTraced: 1,
    acceptanceCount: 1,
    authorityUsed: ["plan", "modify"],
    residualRisks: 0,
  });
  assert.deepEqual(
    reads.map(([path]) => path.slice(root.length + 1)),
    [
      "specs/stories/TST-606-fixture/story.md",
      "specs/stories/TST-606-fixture/acceptance.md",
      "specs/stories/TST-606-fixture/verification.md",
    ],
  );
  for (const [, flags] of reads)
    assert.equal((flags & constants.O_NOFOLLOW) !== 0, true);
  assert.equal(
    await readFile(join(directory, "verification.md"), "utf8"),
    before,
  );
});
