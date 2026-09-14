import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { chmod, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { validateResultEnvelope } from "@forgeflow/core";

import { runReleaseCheck } from "../dist/release.js";

const execFile = promisify(execFileCallback);

async function git(cwd, args) {
  await execFile("git", args, { cwd, encoding: "utf8" });
}

async function readyRepository() {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-release-"));
  await git(root, ["init", "-q"]);
  await git(root, ["config", "user.email", "release@example.test"]);
  await git(root, ["config", "user.name", "Release Test"]);
  await writeFile(join(root, "VERSION"), "0.2.1\n");
  await git(root, ["add", "VERSION"]);
  await git(root, ["commit", "-qm", "release candidate"]);
  return root;
}

const releaseState = (overrides = {}) => ({
  head: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  indexFlags: "clear",
  headVersion: {
    kind: "blob",
    object: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    content: "0.2.1\n",
  },
  workingVersion: {
    kind: "file",
    object: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  worktree: "clean",
  tag: "absent",
  tagRefs: "",
  ...overrides,
});

test("TST011-AC-001: release check uses one injected observation adapter and emits RELEASE_READY", async () => {
  const calls = [];
  const state = releaseState();
  const execution = await runReleaseCheck(["--json"], "/candidate", {
    async inspect(request) {
      calls.push(request);
      return {
        kind: "observed",
        root: "/candidate",
        initial: state,
        final: state,
      };
    },
  });

  assert.equal(execution.mode, "json");
  assert.equal(execution.result.outcome, "RELEASE_READY");
  assert.equal(execution.result.exit, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].candidate, "/candidate");
  assert.equal(execution.result.data.remoteChecks, "not-performed");
  assert.deepEqual(validateResultEnvelope(execution.result), {
    ok: true,
    value: execution.result,
  });
});

test("TST011-AC-004: invalid release invocation is a typed ERROR exit 2", async () => {
  const execution = await runReleaseCheck(["one", "two"], "/candidate", {
    async inspect() {
      throw new Error("must not inspect invalid arguments");
    },
  });

  assert.equal(execution.mode, "human");
  assert.equal(execution.result.outcome, "ERROR");
  assert.equal(execution.result.exit, 2);
  assert.equal(execution.result.issues[0].code, "RELEASE_USAGE");
});

test("TST011-AC-004: invalid JSON invocation retains its one-envelope mode", async () => {
  for (const arguments_ of [
    ["--json", "--json"],
    ["--unknown", "--json"],
    ["one", "two", "--json"],
  ]) {
    const execution = await runReleaseCheck(arguments_, "/candidate");
    assert.equal(execution.mode, "json");
    assert.equal(execution.result.outcome, "ERROR");
    assert.equal(execution.result.exit, 2);
  }
});

test("TST011-AC-001/002: real local Git inspection accepts a physical root and leaves it unchanged", async (t) => {
  const root = await readyRepository();
  t.after(() => rm(root, { recursive: true, force: true }));
  const before = await execFile("git", ["status", "--porcelain=v1"], {
    cwd: root,
    encoding: "utf8",
  });

  const execution = await runReleaseCheck(["--json"], root);

  const after = await execFile("git", ["status", "--porcelain=v1"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(execution.result.outcome, "RELEASE_READY");
  assert.equal(execution.result.data.remoteChecks, "not-performed");
  assert.equal(after.stdout, before.stdout);
});

test("TST011-AC-001/004: packed CLI writes one JSON result with the same outcome", async (t) => {
  const root = await readyRepository();
  t.after(() => rm(root, { recursive: true, force: true }));
  const bin = new globalThis.URL("../dist/bin.js", import.meta.url);
  const output = await execFile(
    globalThis.process.execPath,
    [bin.pathname, "release", "check", "--json", root],
    {
      encoding: "utf8",
    },
  );
  assert.equal(output.stderr, "");
  assert.match(output.stdout, /^\{[^\n]+\}\n$/);
  assert.equal(JSON.parse(output.stdout).outcome, "RELEASE_READY");
});

test("TST011-AC-002/004: symlinked root is accepted, a non-root path and hostile Git routing are rejected safely", async (t) => {
  const root = await readyRepository();
  const alias = `${root}-alias`;
  t.after(async () => {
    await rm(alias, { force: true });
    await rm(root, { recursive: true, force: true });
  });
  await symlink(root, alias);
  const priorGitDir = globalThis.process.env.GIT_DIR;
  globalThis.process.env.GIT_DIR = join(root, ".git", "missing");
  try {
    const linked = await runReleaseCheck(["--json"], alias);
    const nested = await runReleaseCheck(["--json"], join(root, ".git"));
    assert.equal(linked.result.outcome, "RELEASE_READY");
    assert.equal(nested.result.outcome, "ERROR");
    assert.equal(nested.result.exit, 2);
    assert.equal(nested.result.error.code, "RELEASE_TARGET_NOT_ROOT");
  } finally {
    if (priorGitDir === undefined) delete globalThis.process.env.GIT_DIR;
    else globalThis.process.env.GIT_DIR = priorGitDir;
  }
});

test("TST011-AC-004: a guarded show-ref operational failure is not treated as an absent tag", async (t) => {
  const root = await readyRepository();
  const trap = await mkdtemp(join(tmpdir(), "forgeflow-git-trap-"));
  const executable = join(trap, "git");
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(trap, { recursive: true, force: true });
  });
  await writeFile(
    executable,
    '#!/bin/sh\nfor argument in "$@"; do [ "$argument" = show-ref ] && exit 2; done\nexec "$REAL_GIT" "$@"\n',
  );
  await chmod(executable, 0o755);
  const priorPath = globalThis.process.env.PATH;
  const priorRealGit = globalThis.process.env.REAL_GIT;
  const realGit = (
    await execFile("sh", ["-c", "command -v git"], { encoding: "utf8" })
  ).stdout.trim();
  globalThis.process.env.PATH = `${trap}:${priorPath ?? ""}`;
  globalThis.process.env.REAL_GIT = realGit;
  try {
    const execution = await runReleaseCheck(["--json"], root);
    assert.equal(execution.result.outcome, "RELEASE_INCOMPLETE");
    assert.equal(execution.result.exit, 1);
    assert.equal(
      execution.result.issues[0].code,
      "RELEASE_TAGS_INSPECTION_FAILED",
    );
  } finally {
    if (priorPath === undefined) delete globalThis.process.env.PATH;
    else globalThis.process.env.PATH = priorPath;
    if (priorRealGit === undefined) delete globalThis.process.env.REAL_GIT;
    else globalThis.process.env.REAL_GIT = priorRealGit;
  }
});
