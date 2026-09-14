import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdtemp,
  mkdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { runReleaseCheck } from "../dist/release.js";

const execFile = promisify(execFileCallback);
const retainedChecker = new globalThis.URL(
  "../../../scripts/release-check",
  import.meta.url,
);

async function git(cwd, args) {
  await execFile("git", args, { cwd, encoding: "utf8" });
}

async function fixture(label) {
  const root = await mkdtemp(join(tmpdir(), `forgeflow-release-${label}-`));
  await mkdir(join(root, "scripts"));
  await copyFile(retainedChecker, join(root, "scripts", "release-check"));
  await chmod(join(root, "scripts", "release-check"), 0o755);
  await writeFile(join(root, "VERSION"), "0.2.1\n");
  await writeFile(join(root, "tracked.txt"), "tracked\n");
  await git(root, ["init", "-q"]);
  await git(root, ["config", "user.email", "release@example.test"]);
  await git(root, ["config", "user.name", "Release Test"]);
  await git(root, ["add", "."]);
  await git(root, ["commit", "-qm", "baseline"]);
  return root;
}

async function legacyExit(root) {
  try {
    await execFile(join(root, "scripts", "release-check"), [], {
      cwd: new globalThis.URL("../../../", import.meta.url).pathname,
      encoding: "utf8",
    });
    return 0;
  } catch (error) {
    return error.code;
  }
}

test("TST011-AC-002: retained local release fixtures agree on pass/fail exit semantics", async (t) => {
  const cases = [
    {
      label: "ready",
      prepare: async () => {},
      outcome: "RELEASE_READY",
      issue: undefined,
    },
    {
      label: "same-head-tag",
      prepare: async (root) => git(root, ["tag", "v0.2.1"]),
      outcome: "RELEASE_READY",
      issue: undefined,
    },
    {
      label: "conflicting-tag",
      prepare: async (root) => git(root, ["tag", "v0.2.0"]),
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_CONFLICTING_TAG",
    },
    {
      label: "ordinary-tag",
      prepare: async (root) => git(root, ["tag", "latest"]),
      outcome: "RELEASE_READY",
      issue: undefined,
    },
    {
      label: "dirty-worktree",
      prepare: async (root) =>
        writeFile(join(root, "tracked.txt"), "changed\n"),
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_WORKTREE_DIRTY",
    },
    {
      label: "invalid-version",
      prepare: async (root) => {
        await writeFile(join(root, "VERSION"), "0.02.1\n");
        await git(root, ["add", "VERSION"]);
        await git(root, ["commit", "-qm", "invalid version"]);
      },
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_VERSION_INVALID",
    },
  ];

  for (const entry of cases) {
    const root = await fixture(entry.label);
    t.after(() => rm(root, { recursive: true, force: true }));
    await entry.prepare(root);
    const [legacy, migrated] = await Promise.all([
      legacyExit(root),
      runReleaseCheck(["--json"], root),
    ]);
    assert.equal(migrated.result.exit, legacy, entry.label);
    assert.equal(migrated.result.outcome, entry.outcome, entry.label);
    assert.equal(migrated.result.issues[0]?.code, entry.issue, entry.label);
    assert.equal(
      migrated.result.data.remoteChecks,
      "not-performed",
      entry.label,
    );
  }
});

test("TST011-AC-001: explicit root and current-directory invocation have equal typed results", async (t) => {
  const root = await fixture("root-equivalence");
  t.after(() => rm(root, { recursive: true, force: true }));
  const [explicit, implicit] = await Promise.all([
    runReleaseCheck(["--json", root], "/irrelevant"),
    runReleaseCheck(["--json"], root),
  ]);
  assert.deepEqual(explicit.result, implicit.result);
});
