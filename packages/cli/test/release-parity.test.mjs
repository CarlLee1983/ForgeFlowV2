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

import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
} from "@praxisbound/core";

import { runReleaseCheck } from "../dist/release.js";
import { runDifferentialParity } from "./support/differential-parity-harness.mjs";

const execFile = promisify(execFileCallback);
const retainedChecker = new globalThis.URL(
  "../../../scripts/release-check",
  import.meta.url,
);

async function git(cwd, args) {
  await execFile("git", args, { cwd, encoding: "utf8" });
}

async function gitOutput(cwd, args) {
  return (await execFile("git", args, { cwd, encoding: "utf8" })).stdout.trim();
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

async function plainFixture(label) {
  const root = await mkdtemp(join(tmpdir(), `forgeflow-release-${label}-`));
  await mkdir(join(root, "scripts"));
  await copyFile(retainedChecker, join(root, "scripts", "release-check"));
  await chmod(join(root, "scripts", "release-check"), 0o755);
  await writeFile(join(root, "VERSION"), "0.2.1\n");
  return root;
}

async function legacyCheck(root) {
  try {
    const output = await execFile(join(root, "scripts", "release-check"), [], {
      cwd: new globalThis.URL("../../../", import.meta.url).pathname,
      encoding: "utf8",
    });
    return { exit: 0, output: `${output.stdout}${output.stderr}` };
  } catch (error) {
    return {
      exit: error.code,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

async function legacyMetadata(root) {
  const environment = {
    ...globalThis.process.env,
    GIT_NO_REPLACE_OBJECTS: "1",
  };
  const [head, version] = await Promise.allSettled([
    execFile("git", ["rev-parse", "HEAD"], {
      cwd: root,
      env: environment,
      encoding: "utf8",
    }),
    execFile("git", ["show", "HEAD:VERSION"], {
      cwd: root,
      env: environment,
      encoding: "utf8",
    }),
  ]);
  return {
    ...(head.status === "fulfilled" ? { head: head.value.stdout.trim() } : {}),
    ...(version.status === "fulfilled"
      ? { version: version.value.stdout }
      : {}),
  };
}

function normalizedLegacyIssue(output) {
  const mappings = [
    ["repository is not a Git worktree", "RELEASE_NOT_GIT_WORKTREE"],
    ["HEAD does not resolve to a commit", "RELEASE_HEAD_UNAVAILABLE"],
    ["index contains assume-unchanged", "RELEASE_INDEX_FLAGS"],
    ["VERSION is not committed at HEAD", "RELEASE_VERSION_MISSING"],
    ["committed VERSION is not a file", "RELEASE_VERSION_NOT_FILE"],
    ["working VERSION does not match", "RELEASE_VERSION_MISMATCH"],
    ["VERSION must contain", "RELEASE_VERSION_INVALID"],
    ["worktree is not clean", "RELEASE_WORKTREE_DIRTY"],
    [
      "expected tag does not resolve to a commit",
      "RELEASE_EXPECTED_TAG_NOT_COMMIT",
    ],
    [
      "expected tag does not resolve to HEAD",
      "RELEASE_EXPECTED_TAG_WRONG_HEAD",
    ],
    ["different release tag points to HEAD", "RELEASE_CONFLICTING_TAG"],
  ];
  return mappings.find(([diagnostic]) => output.includes(diagnostic))?.[1];
}

function normalizedLegacyResult(diagnostic) {
  const { output, exit, metadata } = diagnostic;
  const issueCode = normalizedLegacyIssue(output);
  const base = {
    schemaVersion: RESULT_SCHEMA_VERSION,
    protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
    subject: "release",
  };
  if (exit === 0) {
    const lines = output.split("\n");
    if (
      lines.length !== 7 ||
      lines[0] !== "release check passed" ||
      lines[6] !== ""
    )
      return null;
    const fields = Object.fromEntries(
      lines.slice(1, -1).map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
    );
    if (
      !lines.slice(1, -1).every((line) => line.includes("=")) ||
      Object.keys(fields).sort().join(",") !==
        "commit,expected_tag,local_tag,remote_checks,version" ||
      fields.version === undefined ||
      fields.commit === undefined ||
      !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(fields.commit) ||
      fields.expected_tag !== `v${fields.version}` ||
      !["absent", "same-head"].includes(fields.local_tag) ||
      fields.remote_checks !== "not-performed"
    )
      return null;
    return {
      ...base,
      status: "pass",
      outcome: "RELEASE_READY",
      exit: 0,
      issues: [],
      data: {
        remoteChecks: "not-performed",
        version: fields.version,
        commit: fields.commit,
        expectedTag: fields.expected_tag,
        localTag: fields.local_tag,
      },
    };
  }
  const messages = {
    RELEASE_NOT_GIT_WORKTREE: "target is not a Git worktree",
    RELEASE_HEAD_UNAVAILABLE: "HEAD is not a commit",
    RELEASE_INDEX_FLAGS:
      "index contains assume-unchanged or skip-worktree entries",
    RELEASE_VERSION_MISSING: "VERSION is not committed at HEAD",
    RELEASE_VERSION_NOT_FILE: "committed VERSION is not a file",
    RELEASE_VERSION_MISMATCH: "working VERSION does not match committed HEAD",
    RELEASE_VERSION_INVALID: "VERSION must contain one MAJOR.MINOR.PATCH value",
    RELEASE_WORKTREE_DIRTY: "worktree is not clean",
    RELEASE_EXPECTED_TAG_NOT_COMMIT:
      "expected tag does not resolve to a commit",
    RELEASE_EXPECTED_TAG_WRONG_HEAD: "expected tag does not resolve to HEAD",
    RELEASE_CONFLICTING_TAG: "different release tag points to HEAD",
  };
  const terminal =
    /^(?<prefix>(?:[ MADRCU?!]{2} .*\n)*)release check failed: (?<message>[^\n]+)\n$/.exec(
      output,
    );
  const retainedMessages = {
    ...messages,
    RELEASE_NOT_GIT_WORKTREE: "repository is not a Git worktree",
    RELEASE_HEAD_UNAVAILABLE: "HEAD does not resolve to a commit",
  };
  const prefix = terminal?.groups?.prefix ?? "";
  if (
    exit !== 1 ||
    terminal === null ||
    issueCode === undefined ||
    !(issueCode in messages) ||
    (prefix !== "" && issueCode !== "RELEASE_WORKTREE_DIRTY") ||
    !terminal.groups?.message?.includes(retainedMessages[issueCode])
  )
    return null;
  const version =
    /^((?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*))\n$/.exec(
      metadata.version ?? "",
    )?.[1];
  const includeVersion = ![
    "RELEASE_NOT_GIT_WORKTREE",
    "RELEASE_HEAD_UNAVAILABLE",
    "RELEASE_VERSION_MISSING",
    "RELEASE_VERSION_NOT_FILE",
    "RELEASE_VERSION_INVALID",
  ].includes(issueCode);
  return {
    ...base,
    status: "fail",
    outcome: "RELEASE_INCOMPLETE",
    exit: 1,
    issues: [{ code: issueCode, message: messages[issueCode] }],
    data: {
      remoteChecks: "not-performed",
      ...(includeVersion && version !== undefined ? { version } : {}),
      ...(metadata.head === undefined ? {} : { commit: metadata.head }),
    },
  };
}

async function assertIsolatedParity(root, label) {
  const parity = await runDifferentialParity({
    fixtureSource: root,
    legacy: async ({ fixture }) => {
      const legacy = await legacyCheck(fixture);
      return {
        result: null,
        issues: [],
        exit: legacy.exit,
        legacyDiagnostic: {
          ...legacy,
          metadata: await legacyMetadata(fixture),
        },
      };
    },
    typescript: async ({ fixture }) => {
      const execution = await runReleaseCheck(["--json"], fixture);
      return {
        result: execution.result,
        issues: [],
        exit: execution.result.exit,
      };
    },
    normalizeLegacyDiagnostic: async (diagnostic) => {
      const value = normalizedLegacyResult(diagnostic);
      return value === null ? { ok: false } : { ok: true, value };
    },
  });
  assert.deepEqual(parity, { ok: true, mismatches: [] }, label);
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
      label: "annotated-tag",
      prepare: async (root) =>
        git(root, [
          "-c",
          "user.name=Release Test",
          "-c",
          "user.email=release@example.test",
          "tag",
          "-a",
          "v0.2.1",
          "-m",
          "release",
        ]),
      outcome: "RELEASE_READY",
      issue: undefined,
    },
    {
      label: "wrong-expected-tag",
      prepare: async (root) => {
        await git(root, ["tag", "v0.2.1"]);
        await writeFile(join(root, "tracked.txt"), "advanced\n");
        await git(root, ["add", "tracked.txt"]);
        await git(root, ["commit", "-qm", "advance"]);
      },
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_EXPECTED_TAG_WRONG_HEAD",
    },
    {
      label: "non-commit-expected-tag",
      prepare: async (root) => {
        const blob = await gitOutput(root, ["hash-object", "-w", "VERSION"]);
        await git(root, ["update-ref", "refs/tags/v0.2.1", blob]);
      },
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_EXPECTED_TAG_NOT_COMMIT",
    },
    {
      label: "conflicting-tag",
      prepare: async (root) => git(root, ["tag", "v0.2.0"]),
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_CONFLICTING_TAG",
    },
    {
      label: "ambiguous-branch-and-tag",
      prepare: async (root) => {
        await git(root, ["branch", "v0.2.0"]);
        await git(root, ["tag", "v0.2.0"]);
      },
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
    ...[
      ["empty-version", ""],
      ["multiline-version", "0.2.1\nextra\n"],
      ["unterminated-extra-version", "0.2.1\nextra"],
      ["prefixed-version", "v0.2.1\n"],
    ].map(([label, content]) => ({
      label,
      prepare: async (root) => {
        await writeFile(join(root, "VERSION"), content);
        await git(root, ["add", "VERSION"]);
        await git(root, ["commit", "-qm", label]);
      },
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_VERSION_INVALID",
    })),
    {
      label: "missing-version",
      prepare: async (root) => {
        await git(root, ["rm", "--cached", "VERSION"]);
        await writeFile(join(root, ".gitignore"), "VERSION\n");
        await git(root, ["add", ".gitignore"]);
        await git(root, ["commit", "-qm", "remove VERSION"]);
      },
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_VERSION_MISSING",
    },
    {
      label: "assume-unchanged",
      prepare: async (root) => {
        await git(root, ["update-index", "--assume-unchanged", "VERSION"]);
        await writeFile(join(root, "VERSION"), "9.9.9\n");
      },
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_INDEX_FLAGS",
    },
    {
      label: "skip-worktree",
      prepare: async (root) => {
        await git(root, ["update-index", "--skip-worktree", "VERSION"]);
        await writeFile(join(root, "VERSION"), "9.9.9\n");
      },
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_INDEX_FLAGS",
    },
    {
      label: "replacement-ref",
      prepare: async (root) => {
        const original = await gitOutput(root, ["rev-parse", "HEAD"]);
        await writeFile(join(root, "VERSION"), "9.9.9\n");
        await git(root, ["add", "VERSION"]);
        await git(root, ["commit", "-qm", "replacement source"]);
        const replacement = await gitOutput(root, ["rev-parse", "HEAD"]);
        await git(root, ["replace", original, replacement]);
        await execFile("git", ["reset", "--hard", original], {
          cwd: root,
          env: { ...globalThis.process.env, GIT_NO_REPLACE_OBJECTS: "1" },
          encoding: "utf8",
        });
        await writeFile(join(root, "VERSION"), "9.9.9\n");
      },
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_VERSION_MISMATCH",
    },
    ...[
      [
        "staged",
        async (root) => {
          await writeFile(join(root, "tracked.txt"), "staged\n");
          await git(root, ["add", "tracked.txt"]);
        },
      ],
      [
        "untracked",
        async (root) => writeFile(join(root, "untracked.txt"), "new\n"),
      ],
      ["deleted", async (root) => rm(join(root, "tracked.txt"))],
      [
        "renamed",
        async (root) => {
          await git(root, ["mv", "tracked.txt", "renamed.txt"]);
        },
      ],
    ].map(([label, prepare]) => ({
      label: `dirty-${label}`,
      prepare,
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_WORKTREE_DIRTY",
    })),
    {
      label: "dirty-conflict",
      prepare: async (root) => {
        const branch = await gitOutput(root, [
          "symbolic-ref",
          "--short",
          "HEAD",
        ]);
        await git(root, ["checkout", "-qb", "conflict-side"]);
        await writeFile(join(root, "conflict.txt"), "side\n");
        await git(root, ["add", "conflict.txt"]);
        await git(root, ["commit", "-qm", "side conflict"]);
        await git(root, ["checkout", "-q", branch]);
        await writeFile(join(root, "conflict.txt"), "main\n");
        await git(root, ["add", "conflict.txt"]);
        await git(root, ["commit", "-qm", "main conflict"]);
        await assert.rejects(git(root, ["merge", "conflict-side"]));
      },
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_WORKTREE_DIRTY",
    },
    {
      label: "dirty-submodule",
      prepare: async (root) => {
        const source = await mkdtemp(join(tmpdir(), "forgeflow-submodule-"));
        await git(source, ["init", "-q"]);
        await git(source, ["config", "user.email", "release@example.test"]);
        await git(source, ["config", "user.name", "Release Test"]);
        await writeFile(join(source, "content.txt"), "baseline\n");
        await git(source, ["add", "content.txt"]);
        await git(source, ["commit", "-qm", "baseline"]);
        await git(root, [
          "-c",
          "protocol.file.allow=always",
          "submodule",
          "add",
          "-q",
          source,
          "module",
        ]);
        await git(root, ["add", ".gitmodules", "module"]);
        await git(root, ["commit", "-qm", "add submodule"]);
        await writeFile(join(root, "module", "content.txt"), "dirty\n");
        await rm(source, { recursive: true, force: true });
      },
      outcome: "RELEASE_INCOMPLETE",
      issue: "RELEASE_WORKTREE_DIRTY",
    },
  ];

  for (const entry of cases) {
    const root = await fixture(entry.label);
    t.after(() => rm(root, { recursive: true, force: true }));
    await entry.prepare(root);
    const [legacy, explicit, currentDirectory] = await Promise.all([
      legacyCheck(root),
      runReleaseCheck(["--json", root], "/irrelevant"),
      runReleaseCheck(["--json"], root),
    ]);
    assert.deepEqual(explicit.result, currentDirectory.result, entry.label);
    assert.equal(currentDirectory.result.exit, legacy.exit, entry.label);
    assert.equal(currentDirectory.result.outcome, entry.outcome, entry.label);
    assert.equal(
      normalizedLegacyIssue(legacy.output),
      currentDirectory.result.issues[0]?.code,
      entry.label,
    );
    assert.equal(
      currentDirectory.result.issues[0]?.code,
      entry.issue,
      entry.label,
    );
    assert.equal(
      currentDirectory.result.data.remoteChecks,
      "not-performed",
      entry.label,
    );
    await assertIsolatedParity(root, entry.label);
  }
});

test("TST011-AC-002: retained non-Git and unborn fixtures retain their diagnosed exits", async (t) => {
  const nonGit = await plainFixture("non-git");
  const unborn = await plainFixture("unborn");
  t.after(async () => {
    await rm(nonGit, { recursive: true, force: true });
    await rm(unborn, { recursive: true, force: true });
  });
  await git(unborn, ["init", "-q"]);
  for (const [label, root, issue] of [
    ["non-git", nonGit, "RELEASE_NOT_GIT_WORKTREE"],
    ["unborn", unborn, "RELEASE_HEAD_UNAVAILABLE"],
  ]) {
    const [legacy, explicit, currentDirectory] = await Promise.all([
      legacyCheck(root),
      runReleaseCheck(["--json", root], "/irrelevant"),
      runReleaseCheck(["--json"], root),
    ]);
    assert.deepEqual(explicit.result, currentDirectory.result, label);
    assert.equal(currentDirectory.result.exit, legacy.exit, label);
    assert.equal(currentDirectory.result.outcome, "RELEASE_INCOMPLETE", label);
    assert.equal(normalizedLegacyIssue(legacy.output), issue, label);
    assert.equal(currentDirectory.result.issues[0]?.code, issue, label);
    assert.equal(
      currentDirectory.result.data.remoteChecks,
      "not-performed",
      label,
    );
    await assertIsolatedParity(root, label);
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

test("TST011-AC-002: legacy diagnostic normalization fails closed for malformed output", () => {
  const success = [
    "release check passed",
    "version=0.2.1",
    "commit=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "expected_tag=v0.2.1",
    "local_tag=absent",
    "remote_checks=not-performed",
    "",
  ].join("\n");
  for (const output of [
    success.replace("release check passed", "unexpected success"),
    success.replace(
      "remote_checks=not-performed",
      "extra=value\nremote_checks=not-performed",
    ),
    success.replace(
      "commit=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "commit=bad",
    ),
    "release check failed: repository is not a Git worktree\nunmapped diagnostic\n",
    "release check failed: unknown diagnostic\n",
  ]) {
    assert.equal(
      normalizedLegacyResult({ output, exit: 0, metadata: {} }),
      null,
    );
  }
  assert.equal(
    normalizedLegacyResult({
      output: "release check failed: unknown diagnostic\n",
      exit: 1,
      metadata: {},
    }),
    null,
  );
});
