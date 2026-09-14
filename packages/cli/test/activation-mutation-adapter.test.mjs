import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  lstat,
  link,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename as renamePath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath, URL } from "node:url";
import test from "node:test";
import { TextEncoder } from "node:util";

import {
  activationDestinations,
  evaluateActivationMutation,
  planActivation,
} from "@forgeflow/core";

import { nodeActivationFilesystemAdapter } from "../dist/activation.js";
import { executeActivationMutation } from "../dist/activation-mutation.js";
import { nodeInitMutationOperations } from "../dist/init-mutation.js";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

async function adopted(root, name) {
  const target = join(root, name);
  await mkdir(target);
  const result = spawnSync(
    join(repositoryRoot, "scripts/bootstrap"),
    [target],
    {
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 0, result.stderr);
  await writeFile(join(target, "AGENTS.md"), "original AGENTS\n", {
    mode: 0o600,
  });
  return target;
}

async function planned(root) {
  const inspection = await nodeActivationFilesystemAdapter.inspect(root);
  const evaluation = planActivation({
    rootIdentity: inspection.rootIdentity,
    source: inspection.source,
    paths: inspection.paths,
  });
  assert.equal(evaluation.result.outcome, "ACTIVATION_PREVIEW");
  assert.ok(evaluation.plan);
  assert.ok(evaluation.payloads);
  return { plan: evaluation.plan, payloads: evaluation.payloads };
}

async function manifest(root) {
  const entries = [];
  async function visit(directory) {
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name);
      const stats = await lstat(path);
      const entry = relative(root, path);
      if (stats.isDirectory()) {
        entries.push([entry, "directory"]);
        await visit(path);
      } else {
        entries.push([entry, "file", new Uint8Array(await readFile(path))]);
      }
    }
  }
  await visit(root);
  return entries;
}

function withOperation(name, implementation) {
  return Object.freeze({
    ...nodeInitMutationOperations,
    [name]: implementation,
  });
}

test("TST014-AC-005: changed target content and occupied stages are refused before mutation", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-activation-stale-"));
  try {
    const target = await adopted(root, "target");
    const first = await planned(target);
    await writeFile(join(target, "AGENTS.md"), "changed after planning\n");
    const changedBefore = await manifest(target);
    const changedObservation = await executeActivationMutation(
      target,
      first.plan,
      first.payloads,
    );
    const changed = evaluateActivationMutation(
      first.plan,
      changedObservation,
    ).result;
    assert.equal(changed.outcome, "ACTIVATION_OPERATION_REFUSED");
    assert.equal(changed.issues[0].code, "ACTIVATION_STALE_PLAN");
    assert.deepEqual(await manifest(target), changedBefore);

    await writeFile(join(target, "AGENTS.md"), "original AGENTS\n", {
      mode: 0o600,
    });
    const second = await planned(target);
    const stage = join(target, second.plan.stagePreconditions[0].path);
    await mkdir(stage);
    const stageBefore = await manifest(target);
    const stageObservation = await executeActivationMutation(
      target,
      second.plan,
      second.payloads,
    );
    const collision = evaluateActivationMutation(
      second.plan,
      stageObservation,
    ).result;
    assert.equal(collision.outcome, "ACTIVATION_OPERATION_REFUSED");
    assert.equal(collision.issues[0].code, "ACTIVATION_STAGE_COLLISION");
    assert.deepEqual(await manifest(target), stageBefore);

    const membershipTarget = await adopted(root, "membership");
    const initial = await planned(membershipTarget);
    const initialObservation = await executeActivationMutation(
      membershipTarget,
      initial.plan,
      initial.payloads,
    );
    assert.equal(
      evaluateActivationMutation(initial.plan, initialObservation).result
        .outcome,
      "ACTIVATION_APPLIED",
    );
    const inspection =
      await nodeActivationFilesystemAdapter.inspect(membershipTarget);
    const update = planActivation({
      rootIdentity: inspection.rootIdentity,
      source: {
        ...inspection.source,
        revision: "0123456789abcdef0123456789abcdef01234567",
      },
      paths: inspection.paths,
    });
    assert.equal(update.result.outcome, "ACTIVATION_PREVIEW");
    let injected = false;
    const membershipObservation = await executeActivationMutation(
      membershipTarget,
      update.plan,
      update.payloads,
      withOperation("afterOperation", async (operation, path) => {
        if (
          !injected &&
          operation === "makeDirectory" &&
          path.includes(".forgeflow-activate.")
        ) {
          injected = true;
          await writeFile(
            join(membershipTarget, ".agents/skills/forgeflow/local-note.md"),
            "concurrent owner\n",
          );
        }
      }),
    );
    const membership = evaluateActivationMutation(
      update.plan,
      membershipObservation,
    ).result;
    assert.equal(membership.outcome, "ACTIVATION_OPERATION_REFUSED");
    assert.equal(membership.issues[0].code, "ACTIVATION_STALE_PLAN");
    assert.equal(membershipObservation.attempted.length, 0);
    assert.equal(
      await readFile(
        join(membershipTarget, ".agents/skills/forgeflow/local-note.md"),
        "utf8",
      ),
      "concurrent owner\n",
    );

    const rootTarget = await adopted(root, "root-change");
    const rootPlan = await planned(rootTarget);
    const movedTarget = join(root, "root-change-original");
    await renamePath(rootTarget, movedTarget);
    await mkdir(rootTarget);
    const movedBefore = await manifest(movedTarget);
    const replacementBefore = await manifest(rootTarget);
    const rootObservation = await executeActivationMutation(
      rootTarget,
      rootPlan.plan,
      rootPlan.payloads,
    );
    const rootResult = evaluateActivationMutation(
      rootPlan.plan,
      rootObservation,
    ).result;
    assert.equal(rootResult.outcome, "ACTIVATION_OPERATION_REFUSED");
    assert.equal(rootResult.issues[0].code, "ACTIVATION_STALE_PLAN");
    assert.deepEqual(await manifest(movedTarget), movedBefore);
    assert.deepEqual(await manifest(rootTarget), replacementBefore);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST014-AC-005/006: preparation and before/after rename faults recover exact target bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-activation-recover-"));
  try {
    const cases = [
      { kind: "prepare" },
      ...["before", "after"].flatMap((timing) =>
        activationDestinations.map((path) => ({
          kind: `rename-${timing}`,
          path,
        })),
      ),
    ];
    for (const [index, fault] of cases.entries()) {
      const target = await adopted(root, `fault-${index}`);
      const { plan, payloads } = await planned(target);
      const alias = join(root, `fault-${index}-agents-alias`);
      await link(join(target, "AGENTS.md"), alias);
      const before = await manifest(target);
      const aliasBefore = await readFile(alias);
      let operations;
      if (fault.kind === "prepare") {
        let failed = false;
        operations = withOperation(
          "writeFileExclusive",
          async (path, bytes, mode, preserveMode) => {
            if (!failed && path.endsWith("/new")) {
              failed = true;
              throw new Error("injected preparation failure");
            }
            return nodeInitMutationOperations.writeFileExclusive(
              path,
              bytes,
              mode,
              preserveMode,
            );
          },
        );
      } else {
        let failed = false;
        operations = withOperation("rename", async (source, destination) => {
          if (!failed && destination === join(target, fault.path)) {
            failed = true;
            if (fault.kind === "rename-after")
              await nodeInitMutationOperations.rename(source, destination);
            throw new Error("injected rename failure");
          }
          return nodeInitMutationOperations.rename(source, destination);
        });
      }
      const observation = await executeActivationMutation(
        target,
        plan,
        payloads,
        operations,
      );
      const result = evaluateActivationMutation(plan, observation).result;
      assert.equal(result.outcome, "ACTIVATION_APPLY_FAILED_RECOVERED");
      assert.deepEqual(await manifest(target), before);
      assert.deepEqual(await readFile(alias), aliasBefore);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST014-AC-005/006: a changed backup read is stale and can never become recovered target content", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-activation-backup-"));
  try {
    const target = await adopted(root, "target");
    const { plan, payloads } = await planned(target);
    const before = await manifest(target);
    const operations = withOperation("readFileNoFollow", async (path) => {
      const original = await nodeInitMutationOperations.readFileNoFollow(path);
      return path === join(target, "AGENTS.md")
        ? { ...original, bytes: new TextEncoder().encode("WRONG-BACKUP\n") }
        : original;
    });
    const observation = await executeActivationMutation(
      target,
      plan,
      payloads,
      operations,
    );
    const result = evaluateActivationMutation(plan, observation).result;
    assert.equal(result.outcome, "ACTIVATION_OPERATION_REFUSED");
    assert.equal(result.issues[0].code, "ACTIVATION_STALE_PLAN");
    assert.deepEqual(observation.attempted, []);
    assert.deepEqual(await manifest(target), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST014-AC-006: failed restoration continues recovery and retains every stage", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "forgeflow-activation-incomplete-"),
  );
  try {
    const target = await adopted(root, "target");
    const { plan, payloads } = await planned(target);
    let applyFailed = false;
    const operations = Object.freeze({
      ...nodeInitMutationOperations,
      async rename(source, destination) {
        if (!applyFailed && destination === join(target, "AGENTS.md")) {
          applyFailed = true;
          await nodeInitMutationOperations.rename(source, destination);
          throw new Error("after-effect failure");
        }
        if (source.endsWith("/restore"))
          throw new Error("injected restore failure");
        return nodeInitMutationOperations.rename(source, destination);
      },
    });
    const observation = await executeActivationMutation(
      target,
      plan,
      payloads,
      operations,
    );
    const result = evaluateActivationMutation(plan, observation).result;
    assert.equal(result.outcome, "ACTIVATION_RECOVERY_INCOMPLETE");
    assert.deepEqual(result.data.unrecovered, ["AGENTS.md"]);
    assert.deepEqual(
      result.data.retained,
      plan.stagePreconditions.map(({ path }) => path),
    );
    assert.deepEqual(result.data.invalidated, [
      ".agents/skills/forgeflow/.forgeflow-snapshot",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST014-AC-006: failed snapshot invalidation remains incomplete with retained recovery evidence", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "forgeflow-activation-invalidation-"),
  );
  try {
    const target = await adopted(root, "target");
    const { plan, payloads } = await planned(target);
    let applyFailed = false;
    const operations = Object.freeze({
      ...nodeInitMutationOperations,
      async rename(source, destination) {
        if (!applyFailed && destination === join(target, "AGENTS.md")) {
          applyFailed = true;
          await nodeInitMutationOperations.rename(source, destination);
          throw new Error("after-effect failure");
        }
        if (source.endsWith("/restore"))
          throw new Error("injected restore failure");
        return nodeInitMutationOperations.rename(source, destination);
      },
      async removeFile(path) {
        if (
          path === join(target, ".agents/skills/forgeflow/.forgeflow-snapshot")
        )
          throw new Error("injected invalidation failure");
        return nodeInitMutationOperations.removeFile(path);
      },
    });
    const observation = await executeActivationMutation(
      target,
      plan,
      payloads,
      operations,
    );
    const result = evaluateActivationMutation(plan, observation).result;
    assert.equal(result.outcome, "ACTIVATION_RECOVERY_INCOMPLETE");
    assert.deepEqual(result.data.unrecovered, ["AGENTS.md"]);
    assert.deepEqual(result.data.invalidationFailed, [plan.commitMarker]);
    assert.deepEqual(
      result.data.retained,
      plan.stagePreconditions.map(({ path }) => path),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST014-AC-007: committed stage cleanup residue has its distinct result", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-activation-cleanup-"));
  try {
    const target = await adopted(root, "target");
    const { plan, payloads } = await planned(target);
    let failed = false;
    const operations = withOperation("removeDirectory", async (path) => {
      if (!failed && path.includes(".forgeflow-activate.")) {
        failed = true;
        throw new Error("injected cleanup failure");
      }
      return nodeInitMutationOperations.removeDirectory(path);
    });
    const observation = await executeActivationMutation(
      target,
      plan,
      payloads,
      operations,
    );
    const result = evaluateActivationMutation(plan, observation).result;
    assert.equal(result.outcome, "ACTIVATION_CLEANUP_INCOMPLETE");
    assert.equal(result.data.cleanupResidue.length, 1);
    assert.equal(result.data.applied.at(-1), plan.commitMarker);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST014-AC-006/007: preparation directory cleanup failure reports every retained owned directory", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "forgeflow-activation-directory-cleanup-"),
  );
  try {
    const target = await adopted(root, "target");
    const { plan, payloads } = await planned(target);
    let writeFailed = false;
    const operations = Object.freeze({
      ...nodeInitMutationOperations,
      async writeFileExclusive(path, bytes, mode, preserveMode) {
        if (!writeFailed && path.endsWith("/new")) {
          writeFailed = true;
          throw new Error("injected preparation failure");
        }
        return nodeInitMutationOperations.writeFileExclusive(
          path,
          bytes,
          mode,
          preserveMode,
        );
      },
      async removeDirectory(path) {
        if (path === join(target, ".agents/skills/forgeflow"))
          throw new Error("injected directory cleanup failure");
        return nodeInitMutationOperations.removeDirectory(path);
      },
    });
    const observation = await executeActivationMutation(
      target,
      plan,
      payloads,
      operations,
    );
    const result = evaluateActivationMutation(plan, observation).result;
    assert.equal(result.outcome, "ACTIVATION_CLEANUP_INCOMPLETE");
    assert.deepEqual(result.data.cleanupResidue, [
      ".agents",
      ".agents/skills",
      ".agents/skills/forgeflow",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST014-AC-003/008: production adapters report facts without activation outcomes, network, or subprocesses", async () => {
  const mutationSource = await readFile(
    fileURLToPath(new URL("../src/activation-mutation.ts", import.meta.url)),
    "utf8",
  );
  assert.doesNotMatch(
    mutationSource,
    /ACTIVATION_(?:APPLIED|PREVIEW|UNCHANGED|CONFLICT|OPERATION_REFUSED|APPLY_FAILED_RECOVERED|RECOVERY_INCOMPLETE|CLEANUP_INCOMPLETE)/,
  );
  const commandSource = await readFile(
    fileURLToPath(new URL("../src/activation.ts", import.meta.url)),
    "utf8",
  );
  assert.doesNotMatch(commandSource, /outcome\s*:\s*["']ACTIVATION_/);
  for (const path of [
    "../src/activation.ts",
    "../src/activation-mutation.ts",
    "../src/activation-observation.ts",
    "../src/activation-snapshot.ts",
  ]) {
    const source = await readFile(
      fileURLToPath(new URL(path, import.meta.url)),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /node:(?:child_process|http|https|net|tls)|\b(?:fetch|spawn|execFile|exec)\s*\(/,
      `unexpected process or network capability in ${path}`,
    );
  }
});
