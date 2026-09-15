import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, URL } from "node:url";
import test from "node:test";

import { validateResultEnvelope } from "@praxisbound/core";

import {
  nodeInitFilesystemAdapter,
  renderInitHuman,
  runInit,
} from "../dist/init.js";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const bin = fileURLToPath(new URL("../dist/bin.js", import.meta.url));
const managedFiles = [
  "AGENTS.md",
  "specs/stories/_template/story.md",
  "specs/stories/_template/acceptance.md",
  "specs/stories/_template/task.md",
  "guidance/ENTRY.md",
  "guidance/PRINCIPLES.md",
  "guidance/DECISIONS.md",
  "guidance/PRACTICES.md",
  "specs/.praxisbound-adoption",
];
const legacyRevision = "0123456789abcdef0123456789abcdef01234567-dirty";

function runCli(args, cwd) {
  return spawnSync(globalThis.process.execPath, [bin, "init", ...args], {
    cwd,
    encoding: "utf8",
  });
}

async function copySourceFile(sourceRoot, path) {
  const destination = join(sourceRoot, path);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(repositoryRoot, path), destination);
}

async function makeLegacySource(root) {
  const sourceRoot = join(root, "legacy-source");
  for (const path of [
    "scripts/bootstrap",
    "VERSION",
    "templates/AGENTS.md",
    "templates/story/story.md",
    "templates/story/acceptance.md",
    "templates/story/task.md",
    "guidance/ENTRY.md",
    "guidance/PRINCIPLES.md",
    "guidance/DECISIONS.md",
    "guidance/PRACTICES.md",
  ])
    await copySourceFile(sourceRoot, path);
  await chmod(join(sourceRoot, "scripts/bootstrap"), 0o755);
  return sourceRoot;
}

async function seed(target, mode) {
  if (mode === "safe") return;
  await mkdir(join(target, "specs/stories/_template"), { recursive: true });
  for (const name of ["story", "acceptance", "task"])
    await writeFile(
      join(target, `specs/stories/_template/${name}.md`),
      `old ${name}\n`,
    );
  await writeFile(join(target, "AGENTS.md"), "repository guide\n");
  await mkdir(join(target, "guidance"), { recursive: true });
  await writeFile(join(target, "guidance/ENTRY.md"), "repository guidance\n");
  await writeFile(
    join(target, "specs/.praxisbound-adoption"),
    "version=0.8.0\nrevision=unknown\n",
  );
  if (mode === "force") {
    for (const name of ["PRINCIPLES", "DECISIONS", "PRACTICES"])
      await writeFile(join(target, `guidance/${name}.md`), `old ${name}\n`);
  }
}

async function manifest(root) {
  const entries = [];
  async function visit(directory) {
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name);
      const entry = relative(root, path);
      const stats = await lstat(path);
      if (stats.isDirectory()) {
        entries.push([entry, "directory", stats.mode & 0o777]);
        await visit(path);
      } else {
        entries.push([
          entry,
          "file",
          stats.mode & 0o777,
          new Uint8Array(await readFile(path)),
        ]);
      }
    }
  }
  await visit(root);
  return entries;
}

test("TST013-AC-001/006/007: packed fresh, force, and upgrade apply have complete legacy byte parity", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-parity-"));
  try {
    const legacySource = await makeLegacySource(root);
    for (const mode of ["safe", "force", "upgrade"]) {
      const cliTarget = join(root, `${mode}-cli`);
      const legacyTarget = join(root, `${mode}-legacy`);
      await mkdir(cliTarget);
      await mkdir(legacyTarget);
      await seed(cliTarget, mode);
      await seed(legacyTarget, mode);
      const args = mode === "safe" ? [] : [`--${mode}`];

      const cli = runCli([...args, "--json", cliTarget], root);
      const legacy = spawnSync(
        join(legacySource, "scripts/bootstrap"),
        [...args, legacyTarget],
        { cwd: root, encoding: "utf8" },
      );

      assert.equal(cli.status, 0, cli.stderr);
      assert.equal(legacy.status, 0, legacy.stderr);
      const result = JSON.parse(cli.stdout);
      assert.equal(result.outcome, "INIT_APPLIED");
      assert.deepEqual(validateResultEnvelope(result), {
        ok: true,
        value: result,
      });
      assert.deepEqual(await manifest(cliTarget), await manifest(legacyTarget));
      assert.deepEqual(
        result.data.attempted,
        result.data.changes.map(({ path }) => path),
      );
      assert.deepEqual(
        result.data.prepared,
        result.data.changes.map(({ path }) => path),
      );
      assert.equal(result.data.attempted.at(-1), "specs/.praxisbound-adoption");
      assert.deepEqual(result.data.cleanupResidue, []);
      assert.equal(
        await readFile(join(cliTarget, "specs/.praxisbound-adoption"), "utf8"),
        "version=0.10.0\nrevision=unknown\n",
      );
      assert.equal(
        (await manifest(cliTarget)).some(([path]) =>
          path.includes(".praxisbound-install."),
        ),
        false,
      );

      if (mode === "upgrade") {
        assert.equal(
          await readFile(join(cliTarget, "AGENTS.md"), "utf8"),
          "repository guide\n",
        );
        assert.equal(
          await readFile(join(cliTarget, "guidance/ENTRY.md"), "utf8"),
          "repository guidance\n",
        );
      }
      for (const path of result.data.changes.map(({ path }) => path))
        assert.ok(managedFiles.includes(path));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("PB001-AC-002/006: shell and CLI migrate a ForgeFlow 0.9.0 marker to identical current bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "praxisbound-legacy-init-parity-"));
  try {
    const source = await makeLegacySource(root);
    const cliTarget = join(root, "cli");
    const shellTarget = join(root, "shell");
    for (const target of [cliTarget, shellTarget]) {
      await mkdir(target);
      await seed(target, "upgrade");
      await rm(join(target, "specs/.praxisbound-adoption"));
      await writeFile(
        join(target, "specs/.forgeflow-adoption"),
        `version=0.9.0\nrevision=${legacyRevision}\n`,
      );
    }

    const cli = runCli(["--upgrade", "--json", cliTarget], root);
    const shell = spawnSync(
      join(source, "scripts/bootstrap"),
      ["--upgrade", shellTarget],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(cli.status, 0, `${cli.stderr}\n${cli.stdout}`);
    assert.equal(shell.status, 0, shell.stderr);
    assert.equal(JSON.parse(cli.stdout).outcome, "INIT_APPLIED");
    assert.deepEqual(await manifest(cliTarget), await manifest(shellTarget));
    assert.equal(
      await readFile(join(cliTarget, "specs/.praxisbound-adoption"), "utf8"),
      `version=0.10.0\nrevision=${legacyRevision}\n`,
    );
    await assert.rejects(lstat(join(cliTarget, "specs/.forgeflow-adoption")), {
      code: "ENOENT",
    });

    const invalidTarget = join(root, "invalid-legacy");
    await mkdir(invalidTarget);
    await seed(invalidTarget, "upgrade");
    await rm(join(invalidTarget, "specs/.praxisbound-adoption"));
    await writeFile(
      join(invalidTarget, "specs/.forgeflow-adoption"),
      "version=0.9.0\nrevision=unsafe/value\n",
    );
    const before = await manifest(invalidTarget);
    const refusal = runCli(["--upgrade", "--json", invalidTarget], root);
    assert.equal(refusal.status, 1);
    assert.equal(JSON.parse(refusal.stdout).outcome, "INIT_OPERATION_REFUSED");
    assert.deepEqual(await manifest(invalidTarget), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-006: human and JSON modes preserve each distinct exit-1 Core mutation outcome", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-outcomes-"));
  try {
    const inspection = await nodeInitFilesystemAdapter.inspect(root, "safe");
    const executionFor = (kind) => async (_root, plan) => {
      const paths = plan.effects.map(({ path }) => path);
      const base = {
        planId: plan.planId,
        committed: false,
        prepared: [],
        attempted: [],
        applied: [],
        recoveryAttempted: [],
        restored: [],
        unrecovered: [],
        invalidated: [],
        invalidationFailed: [],
        retained: [],
        cleanupResidue: [],
        preconditionMismatches: [],
      };
      if (kind === "INIT_OPERATION_REFUSED")
        return {
          ...base,
          preconditionMismatches: [paths[0]],
          failure: {
            stage: "precondition",
            code: "INIT_STALE_PLAN",
            path: paths[0],
          },
        };
      if (kind === "INIT_APPLY_FAILED_RECOVERED")
        return {
          ...base,
          prepared: paths,
          attempted: [paths[0]],
          recoveryAttempted: [paths[0]],
          restored: [paths[0]],
          failure: {
            stage: "apply",
            code: "INIT_REPLACEMENT_FAILED",
            path: paths[0],
          },
        };
      if (kind === "INIT_RECOVERY_INCOMPLETE")
        return {
          ...base,
          prepared: paths,
          attempted: [paths[0]],
          recoveryAttempted: [paths[0]],
          unrecovered: [paths[0]],
          invalidated: ["specs/.praxisbound-adoption"],
          retained: plan.stagePreconditions.map(({ path }) => path),
          failure: {
            stage: "recovery",
            code: "INIT_RESTORE_FAILED",
            path: paths[0],
          },
        };
      return {
        ...base,
        committed: true,
        prepared: paths,
        attempted: paths,
        applied: paths,
        cleanupResidue: [plan.stagePreconditions[0].path],
        failure: {
          stage: "cleanup",
          code: "INIT_CLEANUP_FAILED",
          path: plan.stagePreconditions[0].path,
        },
      };
    };
    const adapter = {
      inspect: async () => inspection,
    };

    for (const outcome of [
      "INIT_OPERATION_REFUSED",
      "INIT_APPLY_FAILED_RECOVERED",
      "INIT_RECOVERY_INCOMPLETE",
      "INIT_CLEANUP_INCOMPLETE",
    ]) {
      const human = await runInit([root], root, adapter, executionFor(outcome));
      const json = await runInit(
        ["--json", root],
        root,
        adapter,
        executionFor(outcome),
      );

      assert.equal(human.result.outcome, outcome);
      assert.equal(json.result.outcome, outcome);
      assert.equal(json.result.exit, 1);
      assert.deepEqual(human.result, json.result);
      assert.equal(validateResultEnvelope(json.result).ok, true);
      assert.match(renderInitHuman(human).stderr, /^FAIL init:/);
      assert.equal(renderInitHuman(human).stderr.includes("completed"), false);
      assert.equal(JSON.stringify(json.result).includes(root), false);
      assert.equal(JSON.stringify(json.result).includes("EACCES"), false);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-006: human and JSON apply render the same successful Core outcome", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-render-"));
  try {
    const jsonTarget = join(root, "json");
    const humanTarget = join(root, "human");
    await mkdir(jsonTarget);
    await mkdir(humanTarget);

    const json = runCli(["--json", jsonTarget], root);
    const human = runCli([humanTarget], root);

    assert.equal(JSON.parse(json.stdout).outcome, "INIT_APPLIED");
    assert.equal(human.status, 0, human.stderr);
    assert.match(human.stdout, /^PraxisBound init\n/);
    assert.match(human.stdout, /PraxisBound init completed\n$/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-006: an unavailable apply target is one sanitized JSON error", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-missing-target-"));
  try {
    const missing = join(root, "missing-target");
    const execution = runCli(["--json", missing], root);
    const result = JSON.parse(execution.stdout);

    assert.equal(execution.status, 2);
    assert.equal(execution.stderr, "");
    assert.equal(result.outcome, "ERROR");
    assert.equal(result.error.code, "INIT_TARGET_UNAVAILABLE");
    assert.equal(JSON.stringify(result).includes(missing), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-006: raw mutation adapter diagnostics are omitted from human and JSON errors", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-sanitized-"));
  try {
    const throwingExecutor = async () => {
      throw new Error("EACCES /private/target secret-token");
    };
    const execution = await runInit(
      ["--json", root],
      root,
      nodeInitFilesystemAdapter,
      throwingExecutor,
    );
    const serialized = JSON.stringify(execution.result);
    const human = renderInitHuman({ ...execution, mode: "human" }).stderr;

    assert.equal(execution.result.outcome, "ERROR");
    assert.equal(execution.result.exit, 3);
    for (const secret of ["EACCES", "/private/target", "secret-token"]) {
      assert.equal(serialized.includes(secret), false);
      assert.equal(human.includes(secret), false);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
