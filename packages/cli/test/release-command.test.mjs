import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import {
  chmod,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
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

async function gitOutput(cwd, args) {
  return (await execFile("git", args, { cwd, encoding: "utf8" })).stdout.trim();
}

async function candidateFacts(root) {
  const [head, refs, index, config, status] = await Promise.all([
    gitOutput(root, ["rev-parse", "HEAD"]),
    gitOutput(root, ["show-ref", "--head"]),
    readFile(join(root, ".git", "index")),
    readFile(join(root, ".git", "config")),
    gitOutput(root, ["status", "--porcelain=v1", "--untracked-files=all"]),
  ]);
  return { head, refs, index, config, status };
}

async function withEnvironment(entries, action) {
  const prior = new Map(
    Object.keys(entries).map((name) => [name, globalThis.process.env[name]]),
  );
  Object.assign(globalThis.process.env, entries);
  try {
    return await action();
  } finally {
    for (const [name, value] of prior) {
      if (value === undefined) delete globalThis.process.env[name];
      else globalThis.process.env[name] = value;
    }
  }
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

test("TST011-AC-004: unexpected adapter faults are typed internal errors", async () => {
  const execution = await runReleaseCheck(["--json"], "/candidate", {
    async inspect() {
      throw new Error("hostile adapter diagnostic must not escape");
    },
  });
  assert.equal(execution.mode, "json");
  assert.equal(execution.result.outcome, "ERROR");
  assert.equal(execution.result.exit, 3);
  assert.equal(execution.result.error.code, "RELEASE_INTERNAL_ERROR");
  assert.doesNotMatch(
    JSON.stringify(execution.result),
    /hostile adapter diagnostic/,
  );
});

test("TST011-AC-001/002: real local Git inspection accepts a physical root and leaves every required fact unchanged", async (t) => {
  const root = await readyRepository();
  t.after(() => rm(root, { recursive: true, force: true }));
  const before = await candidateFacts(root);

  const execution = await runReleaseCheck(["--json"], root);

  const after = await candidateFacts(root);
  assert.equal(execution.result.outcome, "RELEASE_READY");
  assert.equal(execution.result.data.remoteChecks, "not-performed");
  assert.deepEqual(after, before);
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

test("TST011-AC-001/004: packed CLI human rendering preserves the JSON typed outcome", async (t) => {
  const root = await readyRepository();
  t.after(() => rm(root, { recursive: true, force: true }));
  const bin = new globalThis.URL("../dist/bin.js", import.meta.url);
  const [human, json] = await Promise.all([
    execFile(
      globalThis.process.execPath,
      [bin.pathname, "release", "check", root],
      {
        encoding: "utf8",
      },
    ),
    runReleaseCheck(["--json", root]),
  ]);
  assert.equal(json.result.outcome, "RELEASE_READY");
  assert.equal(human.stderr, "");
  assert.equal(human.stdout, "PASS release check\n");

  await assert.rejects(
    execFile(
      globalThis.process.execPath,
      [bin.pathname, "release", "check", join(root, ".git")],
      { encoding: "utf8" },
    ),
    (error) => {
      assert.equal(error.code, 2);
      assert.equal(error.stdout, "");
      assert.match(
        error.stderr,
        /^FAIL release check: RELEASE_TARGET_NOT_ROOT:/,
      );
      return true;
    },
  );
});

test("TST011-AC-004: packed CLI writes exactly one JSON error envelope", async () => {
  const bin = new globalThis.URL("../dist/bin.js", import.meta.url);
  await assert.rejects(
    execFile(
      globalThis.process.execPath,
      [bin.pathname, "release", "check", "--unknown", "--json"],
      { encoding: "utf8" },
    ),
    (error) => {
      assert.equal(error.code, 2);
      assert.equal(error.stderr, "");
      assert.match(error.stdout, /^\{[^\n]+\}\n$/);
      const result = JSON.parse(error.stdout);
      assert.equal(result.outcome, "ERROR");
      assert.equal(result.exit, 2);
      assert.equal(result.error.code, "RELEASE_USAGE");
      return true;
    },
  );
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

test("TST011-AC-004: missing and non-directory candidates are typed target errors", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-invalid-target-"));
  const file = join(root, "not-a-directory");
  await writeFile(file, "not a repository\n");
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const candidate of [join(root, "missing"), file]) {
    const execution = await runReleaseCheck(["--json", candidate]);
    assert.equal(execution.result.outcome, "ERROR");
    assert.equal(execution.result.exit, 2);
    assert.equal(execution.result.error.code, "RELEASE_TARGET_INVALID");
  }
});

test("TST011-AC-003: hostile Git routing and config environment are cleared before every acquisition", async (t) => {
  const root = await readyRepository();
  const hostile = await mkdtemp(join(tmpdir(), "forgeflow-hostile-git-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(hostile, { recursive: true, force: true });
  });
  const hook = join(hostile, "hook");
  const marker = join(hostile, "hook-ran");
  await writeFile(hook, `#!/bin/sh\nprintf hook > "${marker}"\n`);
  await chmod(hook, 0o755);

  await withEnvironment(
    {
      GIT_DIR: join(hostile, "missing-git-dir"),
      GIT_WORK_TREE: join(hostile, "missing-worktree"),
      GIT_INDEX_FILE: join(hostile, "missing-index"),
      GIT_OPTIONAL_LOCKS: "1",
      GIT_NO_LAZY_FETCH: "0",
      GIT_NO_REPLACE_OBJECTS: "0",
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "core.hooksPath",
      GIT_CONFIG_VALUE_0: hostile,
    },
    async () => {
      const execution = await runReleaseCheck(["--json"], root);
      assert.equal(execution.result.outcome, "RELEASE_READY");
    },
  );
  await assert.rejects(readFile(marker));
});

test("TST011-AC-003: fsmonitor, remote commands, and lazy fetch cannot be activated", async (t) => {
  const root = await readyRepository();
  const trap = await mkdtemp(join(tmpdir(), "forgeflow-git-command-trap-"));
  const wrapper = join(trap, "git");
  const fsmonitor = join(trap, "fsmonitor");
  const remoteMarker = join(trap, "remote-ran");
  const lazyMarker = join(trap, "lazy-fetch-enabled");
  const fsmonitorMarker = join(trap, "fsmonitor-ran");
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(trap, { recursive: true, force: true });
  });
  await writeFile(
    wrapper,
    `#!/bin/sh\nfor argument in "$@"; do\n  case "$argument" in fetch|push|ls-remote|remote|gh) printf remote > "$FF205_REMOTE_MARKER" ;; esac\ndone\n[ "$GIT_NO_LAZY_FETCH" = 1 ] || printf lazy > "$FF205_LAZY_MARKER"\nexec "$REAL_GIT" "$@"\n`,
  );
  await writeFile(
    fsmonitor,
    `#!/bin/sh\nprintf fsmonitor > "$FF205_FSMONITOR_MARKER"\nprintf '\\n'\n`,
  );
  await chmod(wrapper, 0o755);
  await chmod(fsmonitor, 0o755);
  for (const client of ["gh", "ci", "npm", "pnpm", "curl", "wget"]) {
    const executable = join(trap, client);
    await writeFile(
      executable,
      `#!/bin/sh\nprintf ${client} > "$FF205_CLIENT_MARKER"\nexit 99\n`,
    );
    await chmod(executable, 0o755);
  }
  await git(root, ["config", "core.fsmonitor", fsmonitor]);
  const realGit = (
    await execFile("sh", ["-c", "command -v git"], { encoding: "utf8" })
  ).stdout.trim();
  await withEnvironment(
    {
      PATH: `${trap}:${globalThis.process.env.PATH ?? ""}`,
      REAL_GIT: realGit,
      FF205_REMOTE_MARKER: remoteMarker,
      FF205_LAZY_MARKER: lazyMarker,
      FF205_FSMONITOR_MARKER: fsmonitorMarker,
      FF205_CLIENT_MARKER: join(trap, "client-ran"),
    },
    async () => {
      const execution = await runReleaseCheck(["--json"], root);
      assert.equal(execution.result.outcome, "RELEASE_READY");
    },
  );
  await Promise.all(
    [remoteMarker, lazyMarker, fsmonitorMarker, join(trap, "client-ran")].map(
      (marker) => assert.rejects(readFile(marker)),
    ),
  );
});

test("TST011-AC-003: a concurrent local tag change is retained exactly and returns no retryable ready result", async (t) => {
  const root = await readyRepository();
  const trap = await mkdtemp(join(tmpdir(), "forgeflow-concurrent-tag-"));
  const wrapper = join(trap, "git");
  const marker = join(trap, "tag-created");
  const head = await gitOutput(root, ["rev-parse", "HEAD"]);
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(trap, { recursive: true, force: true });
  });
  await writeFile(
    wrapper,
    `#!/bin/sh\nis_snapshot=false\nfor argument in "$@"; do [ "$argument" = for-each-ref ] && is_snapshot=true; done\n"$REAL_GIT" "$@"\nstatus=$?\nif [ "$is_snapshot" = true ] && [ ! -e "$FF205_CONCURRENT_MARKER" ]; then\n  printf changed > "$FF205_CONCURRENT_MARKER"\n  "$REAL_GIT" -C "$FF205_CONCURRENT_REPO" update-ref refs/tags/v0.2.1 "$FF205_CONCURRENT_HEAD"\nfi\nexit "$status"\n`,
  );
  await chmod(wrapper, 0o755);
  const realGit = (
    await execFile("sh", ["-c", "command -v git"], { encoding: "utf8" })
  ).stdout.trim();
  await withEnvironment(
    {
      PATH: `${trap}:${globalThis.process.env.PATH ?? ""}`,
      REAL_GIT: realGit,
      FF205_CONCURRENT_MARKER: marker,
      FF205_CONCURRENT_REPO: root,
      FF205_CONCURRENT_HEAD: head,
    },
    async () => {
      const execution = await runReleaseCheck(["--json"], root);
      assert.equal(execution.result.outcome, "RELEASE_INCOMPLETE");
      assert.equal(execution.result.exit, 1);
      assert.equal(execution.result.issues[0].code, "RELEASE_TAGS_CHANGED");
    },
  );
  assert.equal(await gitOutput(root, ["rev-parse", "refs/tags/v0.2.1"]), head);
  assert.equal((await readFile(marker, "utf8")).trim(), "changed");
});

test("TST011-AC-003/004: a missing promisor VERSION blob cannot lazy-fetch and retains the non-file diagnosis", async (t) => {
  const root = await readyRepository();
  const holding = await mkdtemp(join(tmpdir(), "forgeflow-promisor-blob-"));
  const trace = join(holding, "git.trace");
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
    await rm(holding, { recursive: true, force: true });
  });
  const blob = await gitOutput(root, ["rev-parse", "HEAD:VERSION"]);
  const object = join(root, ".git", "objects", blob.slice(0, 2), blob.slice(2));
  await rename(object, join(holding, "VERSION.blob"));
  await git(root, ["config", "core.repositoryFormatVersion", "1"]);
  await git(root, ["config", "extensions.partialClone", "origin"]);
  await git(root, ["config", "remote.origin.promisor", "true"]);
  await git(root, ["config", "remote.origin.partialCloneFilter", "blob:none"]);
  await git(root, [
    "config",
    "remote.origin.url",
    join(holding, "missing-origin"),
  ]);
  await withEnvironment({ GIT_TRACE: trace }, async () => {
    const execution = await runReleaseCheck(["--json"], root);
    assert.equal(execution.result.outcome, "RELEASE_INCOMPLETE");
    assert.equal(execution.result.exit, 1);
    assert.equal(execution.result.issues[0].code, "RELEASE_VERSION_NOT_FILE");
  });
  const traceContents = await readFile(trace, "utf8").catch(() => "");
  assert.doesNotMatch(traceContents, /(?:fetch|upload-pack)/);
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
