import assert from "node:assert/strict";
import { constants } from "node:fs";
import {
  chmod,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateResultEnvelope } from "@forgeflow/core";

import {
  createNodeHandoffSourceReader,
  renderHandoffHuman,
  runHandoffCheck,
} from "../dist/handoff.js";

const bin = fileURLToPath(
  new globalThis.URL("../dist/bin.js", import.meta.url),
);
const completeSource = `# ForgeFlow Handoff Evidence

Prose context that the contract check ignores.

\`\`\`yaml
handoff:
  story: TST-004
  recorded_at: 2026-09-12T02:30:00Z
  repository: example/repository
  revision: 0123456789abcdef0123456789abcdef01234567

verification:
  command: make verify
  result: pass
\`\`\`
`;

function runCli(args, options = {}) {
  return spawnSync(globalThis.process.execPath, [bin, ...args], {
    encoding: "utf8",
    ...options,
  });
}

function parseMachineResult(result, expectedExit) {
  assert.equal(result.status, expectedExit);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^\{[^\n]+\}\n$/);
  const envelope = JSON.parse(result.stdout);
  assert.deepEqual(validateResultEnvelope(envelope), {
    ok: true,
    value: envelope,
  });
  assert.equal(envelope.exit, expectedExit);
  return envelope;
}

test("TST004-AC-001: complete evidence has exact human and machine results", async (t) => {
  const sandbox = await mkdtemp(join(tmpdir(), "forgeflow-handoff-command-"));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const handoff = join(sandbox, "handoff.md");
  await writeFile(handoff, completeSource);

  const human = runCli(["handoff", "check", handoff]);
  assert.equal(human.status, 0);
  assert.equal(human.stderr, "");
  assert.equal(
    human.stdout,
    `ForgeFlow Handoff Contract Check

PASS  Story evidence: TST-004
PASS  recorded at: 2026-09-12T02:30:00Z
PASS  repository revision: example/repository 0123456789abcdef0123456789abcdef01234567
PASS  verification evidence: make verify pass

Result: HANDOFF_CONTRACT_OK

Next:
Historical evidence only. Ask the human or control plane for current state.
`,
  );

  const machine = parseMachineResult(
    runCli(["handoff", "check", "--json", handoff]),
    0,
  );
  assert.equal(machine.status, "pass");
  assert.equal(machine.outcome, "success");
  assert.deepEqual(machine.issues, []);
});

test("TST004-AC-001: the default path is specs/handoff.md", async (t) => {
  const sandbox = await mkdtemp(join(tmpdir(), "forgeflow-handoff-default-"));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  await mkdir(join(sandbox, "specs"));
  await writeFile(join(sandbox, "specs", "handoff.md"), completeSource);

  const result = runCli(["handoff", "check", "--json"], { cwd: sandbox });
  assert.equal(parseMachineResult(result, 0).status, "pass");
});

test("TST004-AC-003: incomplete evidence has ordered human failures and a valid envelope", async (t) => {
  const sandbox = await mkdtemp(
    join(tmpdir(), "forgeflow-handoff-incomplete-"),
  );
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const handoff = join(sandbox, "handoff.md");
  await writeFile(
    handoff,
    completeSource
      .replace("  story: TST-004\n", "")
      .replace("  result: pass\n", "  result: probably\n"),
  );

  const human = runCli(["handoff", "check", handoff]);
  assert.equal(human.status, 1);
  assert.equal(human.stderr, "");
  assert.match(human.stdout, /FAIL {2}handoff is missing: handoff\.story\n/);
  assert.match(
    human.stdout,
    /FAIL {2}verification\.result must be pass, fail, or not_run\n/,
  );
  assert.ok(
    human.stdout.indexOf("handoff is missing") <
      human.stdout.indexOf("verification.result"),
  );
  assert.match(human.stdout, /Result: HANDOFF_CONTRACT_INCOMPLETE/);

  const machine = parseMachineResult(
    runCli(["handoff", "check", "--json", handoff]),
    1,
  );
  assert.equal(machine.status, "fail");
  assert.equal(machine.outcome, "failure");
  assert.equal(machine.issues.length, 2);
});

test("TST004-AC-004: every acquisition error emits one valid machine result", async (t) => {
  const sandbox = await mkdtemp(join(tmpdir(), "forgeflow-handoff-errors-"));
  t.after(async () => {
    await chmod(join(sandbox, "unreadable.md"), 0o600).catch(() => {});
    await rm(sandbox, { recursive: true, force: true });
  });
  const missing = join(sandbox, "missing.md");
  const empty = join(sandbox, "empty.md");
  const directory = join(sandbox, "directory");
  const unreadable = join(sandbox, "unreadable.md");
  const link = join(sandbox, "handoff-link.md");
  await writeFile(empty, "");
  await mkdir(directory);
  await writeFile(unreadable, completeSource);
  await chmod(unreadable, 0o000);
  await symlink(empty, link);

  for (const [name, path, code] of [
    ["missing", missing, "HANDOFF_SOURCE_UNAVAILABLE"],
    ["empty", empty, "HANDOFF_SOURCE_UNAVAILABLE"],
    ["directory", directory, "HANDOFF_SOURCE_UNAVAILABLE"],
    ["unreadable", unreadable, "HANDOFF_SOURCE_UNAVAILABLE"],
    ["symlink", link, "HANDOFF_PATH_SYMLINK"],
  ]) {
    await t.test(name, () => {
      const envelope = parseMachineResult(
        runCli(["handoff", "check", "--json", path]),
        2,
      );
      assert.equal(envelope.status, "error");
      assert.equal(envelope.outcome, "configuration-error");
      assert.equal(envelope.issues[0].code, code);
    });
  }
});

test("TST004-AC-004: JSON mode survives invalid arity and misplaced options", () => {
  for (const args of [
    ["handoff", "check", "--json", "one", "two"],
    ["handoff", "check", "--json", "--unknown"],
  ]) {
    const envelope = parseMachineResult(runCli(args), 2);
    assert.equal(envelope.outcome, "usage-error");
    assert.equal(envelope.issues[0].code, "INVALID_ARGUMENTS");
  }

  const misplaced = runCli(["handoff", "check", "file", "--json"]);
  assert.equal(misplaced.status, 2);
  assert.equal(misplaced.stdout, "");
  assert.match(misplaced.stderr, /^ERROR Invalid arguments\n/);
});

test("TST004-AC-004: the Handoff subcommand exposes focused help", () => {
  const result = runCli(["handoff", "check", "--help"]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /^ForgeFlow Handoff Contract Check\n\n/);
  assert.match(
    result.stdout,
    /forgeflow handoff check \[--json\] \[handoff-file\]/,
  );
  assert.match(result.stdout, /static and read-only/);
});

test("TST004-AC-005: the adapter performs one read and no target write", async (t) => {
  const sandbox = await mkdtemp(join(tmpdir(), "forgeflow-handoff-readonly-"));
  t.after(() => rm(sandbox, { recursive: true, force: true }));
  const handoff = join(sandbox, "handoff.md");
  await writeFile(handoff, completeSource);
  const beforeBytes = await readFile(handoff);
  const beforeEntries = await readdir(sandbox);
  const beforeStats = await lstat(handoff);

  const result = runCli(["handoff", "check", "--json", handoff]);
  parseMachineResult(result, 0);

  assert.deepEqual(await readFile(handoff), beforeBytes);
  assert.deepEqual(await readdir(sandbox), beforeEntries);
  const afterStats = await lstat(handoff);
  assert.equal(afterStats.size, beforeStats.size);
  assert.equal(afterStats.mtimeMs, beforeStats.mtimeMs);

  const reads = [];
  const execution = await runHandoffCheck(["fixture.md"], {
    async read(path) {
      reads.push(path);
      return { ok: true, source: completeSource };
    },
  });
  assert.deepEqual(reads, ["fixture.md"]);
  assert.equal(execution.evaluation.result.exit, 0);
});

test("TST004-AC-005: the opened handle is no-follow, nonblocking, and revalidated before reading", async () => {
  const operations = [];
  const reader = createNodeHandoffSourceReader({
    async lstat(path) {
      operations.push(["lstat", path]);
      return {
        size: completeSource.length,
        isFile: () => true,
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
          return {
            size: 0,
            isFile: () => false,
            isSymbolicLink: () => false,
          };
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
  });

  assert.deepEqual(await reader.read("handoff.md"), {
    ok: false,
    reason: "unavailable",
  });
  assert.deepEqual(
    operations.map(([operation]) => operation),
    ["lstat", "open", "stat", "close"],
  );
});

test("TST004-AC-004/005: an adapter read failure becomes a rendered configuration result", async () => {
  const execution = await runHandoffCheck(["unreadable.md"], {
    async read() {
      return { ok: false, reason: "unavailable" };
    },
  });
  assert.deepEqual(validateResultEnvelope(execution.evaluation.result), {
    ok: true,
    value: execution.evaluation.result,
  });
  assert.equal(execution.evaluation.result.exit, 2);
  const rendered = renderHandoffHuman(execution);
  assert.match(rendered.stderr, /unreadable\.md/);
  assert.match(rendered.stdout, /Result: ERROR/);
});

test("TST004-AC-005: production Handoff modules contain no process or write API", async () => {
  const sourceRoot = new globalThis.URL("../src/", import.meta.url);
  for (const name of ["bin.ts", "handoff.ts"]) {
    const source = await readFile(new globalThis.URL(name, sourceRoot), "utf8");
    assert.doesNotMatch(source, /node:child_process/);
    assert.doesNotMatch(
      source,
      /\b(?:writeFile|appendFile|truncate|rename|unlink|rm|mkdir|cp)\b/,
    );
  }
});
