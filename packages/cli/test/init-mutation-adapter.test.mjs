import assert from "node:assert/strict";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { setImmediate as waitImmediate } from "node:timers/promises";
import { TextEncoder } from "node:util";
import { fileURLToPath, URL } from "node:url";
import test from "node:test";

import { evaluateInitMutation, planMutation } from "@forgeflow/core";

import { nodeInitFilesystemAdapter, renderInitHuman } from "../dist/init.js";
import {
  executeInitMutation,
  executeInitMutationWithSignals,
  nodeInitMutationOperations,
} from "../dist/init-mutation.js";

async function planned(root, mode = "safe") {
  const inspection = await nodeInitFilesystemAdapter.inspect(root, mode);
  const evaluation = planMutation({
    mode,
    rootIdentity: inspection.rootIdentity,
    snapshot: inspection.snapshot,
    paths: inspection.paths,
  });
  assert.equal(evaluation.result.outcome, "INIT_PREVIEW");
  assert.ok(evaluation.plan);
  assert.ok(inspection.payloads);
  return { inspection, plan: evaluation.plan };
}

async function manifest(root) {
  const entries = [];
  async function visit(directory) {
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name);
      const entry = relative(root, path);
      const stats = await lstat(path);
      if (stats.isDirectory()) {
        entries.push([entry, "directory"]);
        await visit(path);
      } else if (stats.isSymbolicLink()) {
        entries.push([entry, "symlink"]);
      } else {
        entries.push([entry, "file", new Uint8Array(await readFile(path))]);
      }
    }
  }
  await visit(root);
  return entries;
}

async function apply(root, mode = "safe") {
  const { inspection, plan } = await planned(root, mode);
  const observation = await executeInitMutation(
    root,
    plan,
    inspection.snapshot,
    inspection.payloads,
  );
  const result = evaluateInitMutation(plan, observation).result;
  assert.equal(result.outcome, "INIT_APPLIED");
}

function withOperation(name, implementation) {
  return Object.freeze({
    ...nodeInitMutationOperations,
    [name]: implementation,
  });
}

test("TST013-AC-003: changed content and a new symlink make the original plan stale before executor mutation", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-stale-"));
  try {
    const first = join(root, "first");
    await mkdir(first);
    await writeFile(join(first, "AGENTS.md"), "original\n");
    const force = await planned(first, "force");
    await writeFile(join(first, "AGENTS.md"), "changed after planning\n");
    const beforeContentApply = await manifest(first);
    const contentObservation = await executeInitMutation(
      first,
      force.plan,
      force.inspection.snapshot,
      force.inspection.payloads,
    );
    const contentResult = evaluateInitMutation(
      force.plan,
      contentObservation,
    ).result;
    assert.equal(contentResult.outcome, "INIT_OPERATION_REFUSED");
    assert.equal(contentResult.issues[0].code, "INIT_STALE_PLAN");
    assert.deepEqual(await manifest(first), beforeContentApply);

    const second = join(root, "second");
    const outside = join(root, "outside");
    await mkdir(second);
    await writeFile(outside, "outside\n");
    const safe = await planned(second);
    await symlink(outside, join(second, "AGENTS.md"));
    const beforeLinkApply = await manifest(second);
    const linkObservation = await executeInitMutation(
      second,
      safe.plan,
      safe.inspection.snapshot,
      safe.inspection.payloads,
    );
    const linkResult = evaluateInitMutation(safe.plan, linkObservation).result;
    assert.equal(linkResult.outcome, "INIT_OPERATION_REFUSED");
    assert.equal(linkResult.issues[0].code, "INIT_STALE_PLAN");
    assert.deepEqual(await manifest(second), beforeLinkApply);
    assert.equal(await readFile(outside, "utf8"), "outside\n");

    const third = join(root, "third");
    await mkdir(third);
    const wrongType = await planned(third);
    await mkdir(join(third, "AGENTS.md"));
    const beforeWrongTypeApply = await manifest(third);
    const wrongTypeObservation = await executeInitMutation(
      third,
      wrongType.plan,
      wrongType.inspection.snapshot,
      wrongType.inspection.payloads,
    );
    const wrongTypeResult = evaluateInitMutation(
      wrongType.plan,
      wrongTypeObservation,
    ).result;
    assert.equal(wrongTypeResult.outcome, "INIT_OPERATION_REFUSED");
    assert.equal(wrongTypeResult.issues[0].code, "INIT_STALE_PLAN");
    assert.deepEqual(await manifest(third), beforeWrongTypeApply);

    const fourth = join(root, "fourth");
    await mkdir(fourth);
    const newFile = await planned(fourth);
    await writeFile(join(fourth, "AGENTS.md"), "created after planning\n");
    const beforeExistenceApply = await manifest(fourth);
    const existenceObservation = await executeInitMutation(
      fourth,
      newFile.plan,
      newFile.inspection.snapshot,
      newFile.inspection.payloads,
    );
    const existenceResult = evaluateInitMutation(
      newFile.plan,
      existenceObservation,
    ).result;
    assert.equal(existenceResult.outcome, "INIT_OPERATION_REFUSED");
    assert.equal(existenceResult.issues[0].code, "INIT_STALE_PLAN");
    assert.deepEqual(await manifest(fourth), beforeExistenceApply);

    const fifth = join(root, "fifth");
    const outsideDirectory = join(root, "outside-directory");
    await mkdir(fifth);
    await mkdir(outsideDirectory);
    const directoryLink = await planned(fifth);
    await symlink(outsideDirectory, join(fifth, "specs"));
    const beforeDirectoryLinkApply = await manifest(fifth);
    const directoryLinkObservation = await executeInitMutation(
      fifth,
      directoryLink.plan,
      directoryLink.inspection.snapshot,
      directoryLink.inspection.payloads,
    );
    const directoryLinkResult = evaluateInitMutation(
      directoryLink.plan,
      directoryLinkObservation,
    ).result;
    assert.equal(directoryLinkResult.outcome, "INIT_OPERATION_REFUSED");
    assert.equal(directoryLinkResult.issues[0].code, "INIT_STALE_PLAN");
    assert.deepEqual(await manifest(fifth), beforeDirectoryLinkApply);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-003: a managed-path change takes precedence over a simultaneous stage collision", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-mixed-stale-"));
  try {
    const { inspection, plan } = await planned(root);
    await writeFile(join(root, "AGENTS.md"), "late file\n");
    await mkdir(join(root, plan.stagePreconditions[0].path));

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(result.outcome, "INIT_OPERATION_REFUSED");
    assert.equal(result.issues[0].code, "INIT_STALE_PLAN");
    assert.equal(
      result.data.preconditionMismatches.includes("AGENTS.md"),
      true,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-001: every payload is staged before the first marker-last rename", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-order-"));
  try {
    const { inspection, plan } = await planned(root);
    const events = [];
    const operations = Object.freeze({
      ...nodeInitMutationOperations,
      afterOperation: async (operation, path) => {
        if (operation === "writeFileExclusive" && path.endsWith("/new"))
          events.push(`stage:${path}`);
        if (operation === "rename") events.push(`rename:${path}`);
      },
    });

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
      operations,
    );
    const result = evaluateInitMutation(plan, execution).result;
    const firstRename = events.findIndex((entry) =>
      entry.startsWith("rename:"),
    );

    assert.equal(result.outcome, "INIT_APPLIED");
    assert.equal(events.slice(0, firstRename).length, plan.effects.length);
    assert.equal(
      events.at(-1),
      `rename:${join(root, "specs/.forgeflow-adoption")}`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-003: replacing the resolved target root makes the plan stale", async () => {
  const parent = await mkdtemp(join(tmpdir(), "forgeflow-init-root-swap-"));
  try {
    const target = join(parent, "target");
    const prior = join(parent, "prior");
    await mkdir(target);
    const { inspection, plan } = await planned(target);
    await rename(target, prior);
    await mkdir(target);

    const execution = await executeInitMutation(
      target,
      plan,
      inspection.snapshot,
      inspection.payloads,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(result.outcome, "INIT_OPERATION_REFUSED");
    assert.equal(result.issues[0].code, "INIT_STALE_PLAN");
    assert.deepEqual(await manifest(target), []);
    assert.deepEqual(await manifest(prior), []);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("TST013-AC-003: invalid packaged payload bytes are refused before mutation", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-payload-"));
  try {
    const { inspection, plan } = await planned(root);
    const payloads = inspection.payloads.map((payload, index) =>
      index === 0
        ? { ...payload, bytes: new TextEncoder().encode("tampered\n") }
        : payload,
    );

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      payloads,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(result.outcome, "INIT_OPERATION_REFUSED");
    assert.equal(result.issues[0].code, "INIT_PAYLOAD_INVALID");
    assert.deepEqual(await manifest(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-003: an existing deterministic sibling stage is refused and retained", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-stage-collision-"));
  try {
    const { inspection, plan } = await planned(root);
    const stage = plan.stagePreconditions[0].path;
    await mkdir(join(root, stage));
    await writeFile(join(root, stage, "sentinel"), "unrelated\n");
    const before = await manifest(root);

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(result.outcome, "INIT_OPERATION_REFUSED");
    assert.equal(result.issues[0].code, "INIT_STAGE_COLLISION");
    assert.deepEqual(await manifest(root), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-004: an after-effect preparation fault removes owned stages and directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-prepare-fault-"));
  try {
    const { inspection, plan } = await planned(root);
    let writes = 0;
    const operations = Object.freeze({
      ...nodeInitMutationOperations,
      afterOperation: async (operation) => {
        if (operation !== "writeFileExclusive") return;
        writes += 1;
        if (writes === 2) throw new Error("injected preparation failure");
      },
    });

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
      operations,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(result.outcome, "INIT_APPLY_FAILED_RECOVERED");
    assert.deepEqual(await manifest(root), []);
    assert.equal(JSON.stringify(result).includes(root), false);
    assert.equal(
      JSON.stringify(result).includes("injected preparation"),
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-004: every preparation boundary restores the exact prior manifest", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-prepare-matrix-"));
  try {
    const cases = [
      {
        name: "managed-directory",
        mode: "safe",
        operation: "makeDirectory",
        matches: (path) => path.endsWith("specs/stories"),
      },
      {
        name: "sibling-stage",
        mode: "safe",
        operation: "makeDirectory",
        matches: (path) => path.includes(".forgeflow-install."),
      },
      {
        name: "original-backup",
        mode: "force",
        operation: "writeFileExclusive",
        matches: (path) => path.endsWith("/original"),
      },
      {
        name: "payload",
        mode: "safe",
        operation: "writeFileExclusive",
        matches: (path) => path.endsWith("/new"),
      },
      {
        name: "marker",
        mode: "safe",
        operation: "writeFileExclusive",
        matches: (path) =>
          path.includes(".forgeflow-adoption") && path.endsWith("/new"),
      },
    ];

    for (const fixture of cases) {
      const target = join(root, fixture.name);
      await mkdir(target);
      if (fixture.mode === "force") await apply(target);
      const before = await manifest(target);
      const { inspection, plan } = await planned(target, fixture.mode);
      let triggered = false;
      const operations = Object.freeze({
        ...nodeInitMutationOperations,
        afterOperation: async (operation, path) => {
          if (
            !triggered &&
            operation === fixture.operation &&
            fixture.matches(path)
          ) {
            triggered = true;
            throw new Error(`injected ${fixture.name} failure`);
          }
        },
      });

      const execution = await executeInitMutation(
        target,
        plan,
        inspection.snapshot,
        inspection.payloads,
        operations,
      );
      const result = evaluateInitMutation(plan, execution).result;

      assert.equal(triggered, true, fixture.name);
      assert.equal(result.outcome, "INIT_APPLY_FAILED_RECOVERED", fixture.name);
      assert.deepEqual(await manifest(target), before, fixture.name);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-004: a failed mkdir is never treated as an owned directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-unowned-dir-"));
  try {
    const { inspection, plan } = await planned(root);
    let triggered = false;
    const operations = withOperation("makeDirectory", async (path, mode) => {
      if (!triggered && path.endsWith("/specs")) {
        triggered = true;
        await nodeInitMutationOperations.makeDirectory(path, mode);
        throw new Error("simulated concurrent creator");
      }
      return nodeInitMutationOperations.makeDirectory(path, mode);
    });

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
      operations,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(result.outcome, "INIT_APPLY_FAILED_RECOVERED");
    assert.equal((await lstat(join(root, "specs"))).isDirectory(), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-004/006: cleanup refuses a substituted stage symlink", async () => {
  const parent = await mkdtemp(join(tmpdir(), "forgeflow-init-stage-swap-"));
  try {
    const root = join(parent, "target");
    const outside = join(parent, "outside");
    await mkdir(root);
    await mkdir(outside);
    await writeFile(join(outside, "new"), "outside\n");
    const { inspection, plan } = await planned(root);
    let triggered = false;
    const operations = Object.freeze({
      ...nodeInitMutationOperations,
      afterOperation: async (operation, path) => {
        if (
          !triggered &&
          operation === "makeDirectory" &&
          path.includes(".forgeflow-install.")
        ) {
          triggered = true;
          await rm(path, { recursive: true });
          await symlink(outside, path);
          throw new Error("simulated stage substitution");
        }
      },
    });

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
      operations,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(result.outcome, "INIT_RECOVERY_INCOMPLETE");
    assert.equal(await readFile(join(outside, "new"), "utf8"), "outside\n");
    assert.equal(
      execution.cleanupResidue.includes(plan.stagePreconditions[0].path),
      true,
    );
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("TST013-AC-005: an after-effect rename fault reverse-recovers the exact force baseline", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-replace-fault-"));
  try {
    await apply(root);
    await writeFile(join(root, "AGENTS.md"), "custom guide\n");
    const before = await manifest(root);
    const { inspection, plan } = await planned(root, "force");
    let triggered = false;
    const operations = withOperation("rename", async (source, destination) => {
      if (
        !triggered &&
        source.endsWith("/new") &&
        destination.endsWith("specs/stories/_template/acceptance.md")
      ) {
        triggered = true;
        await nodeInitMutationOperations.rename(source, destination);
        throw new Error("injected after-effect rename failure");
      }
      await nodeInitMutationOperations.rename(source, destination);
    });

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
      operations,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(triggered, true);
    assert.equal(result.outcome, "INIT_APPLY_FAILED_RECOVERED");
    assert.deepEqual(execution.restored, [
      "specs/stories/_template/acceptance.md",
      "specs/stories/_template/story.md",
      "AGENTS.md",
    ]);
    assert.deepEqual(await manifest(root), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-005: before/after rename faults recover fresh, force, and upgrade modes", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-rename-matrix-"));
  try {
    for (const mode of ["safe", "force", "upgrade"]) {
      for (const afterEffect of [false, true]) {
        const target = join(
          root,
          `${mode}-${afterEffect ? "after" : "before"}`,
        );
        await mkdir(target);
        if (mode !== "safe") await apply(target);
        const before = await manifest(target);
        const { inspection, plan } = await planned(target, mode);
        const failedPath = "specs/stories/_template/acceptance.md";
        let triggered = false;
        const operations = withOperation(
          "rename",
          async (source, destination) => {
            if (
              !triggered &&
              source.endsWith("/new") &&
              destination.endsWith(failedPath)
            ) {
              triggered = true;
              if (afterEffect)
                await nodeInitMutationOperations.rename(source, destination);
              throw new Error("injected rename failure");
            }
            await nodeInitMutationOperations.rename(source, destination);
          },
        );

        const execution = await executeInitMutation(
          target,
          plan,
          inspection.snapshot,
          inspection.payloads,
          operations,
        );
        const result = evaluateInitMutation(plan, execution).result;

        assert.equal(triggered, true, `${mode}/${afterEffect}`);
        assert.equal(
          result.outcome,
          "INIT_APPLY_FAILED_RECOVERED",
          `${mode}/${afterEffect}`,
        );
        assert.deepEqual(
          await manifest(target),
          before,
          `${mode}/${afterEffect}`,
        );
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-005: a detected interruption after a rename recovers the attempted prefix", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-interruption-"));
  try {
    const { inspection, plan } = await planned(root);
    let checks = 0;
    const operations = Object.freeze({
      ...nodeInitMutationOperations,
      shouldAbort: () => {
        checks += 1;
        return checks >= 2;
      },
    });

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
      operations,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(result.outcome, "INIT_APPLY_FAILED_RECOVERED");
    assert.deepEqual(execution.attempted, ["AGENTS.md"]);
    assert.deepEqual(
      execution.recoveryAttempted,
      [...execution.attempted].reverse(),
    );
    assert.equal(execution.recoveryAttempted.length > 0, true);
    assert.deepEqual(await manifest(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-005: SIGTERM wiring recovers and removes every installed listener", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-signal-"));
  const signals = ["SIGHUP", "SIGINT", "SIGTERM"];
  const listenerCounts = signals.map((signal) =>
    globalThis.process.listenerCount(signal),
  );
  try {
    const { inspection, plan } = await planned(root);
    let sent = false;
    const operations = Object.freeze({
      ...nodeInitMutationOperations,
      afterOperation: async (operation) => {
        if (!sent && operation === "rename") {
          sent = true;
          globalThis.process.kill(globalThis.process.pid, "SIGTERM");
          await waitImmediate();
        }
      },
    });

    const execution = await executeInitMutationWithSignals(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
      operations,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(sent, true);
    assert.equal(result.outcome, "INIT_APPLY_FAILED_RECOVERED");
    assert.equal(result.exit, 1);
    assert.deepEqual(
      execution.recoveryAttempted,
      [...execution.attempted].reverse(),
    );
    assert.equal(execution.recoveryAttempted.length > 0, true);
    assert.deepEqual(await manifest(root), []);
  } finally {
    assert.deepEqual(
      signals.map((signal) => globalThis.process.listenerCount(signal)),
      listenerCounts,
    );
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-005/006: restore failure continues siblings and retains every prepared recovery stage", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-recovery-fault-"));
  try {
    await apply(root);
    const { inspection, plan } = await planned(root, "force");
    let applyTriggered = false;
    const operations = withOperation("rename", async (source, destination) => {
      if (
        !applyTriggered &&
        source.endsWith("/new") &&
        destination.endsWith("specs/.forgeflow-adoption")
      ) {
        applyTriggered = true;
        await nodeInitMutationOperations.rename(source, destination);
        throw new Error("injected marker rename failure");
      }
      if (
        source.endsWith("/restore") &&
        destination.endsWith("specs/stories/_template/story.md")
      )
        throw new Error("injected restore failure");
      await nodeInitMutationOperations.rename(source, destination);
    });

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
      operations,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(result.outcome, "INIT_RECOVERY_INCOMPLETE");
    assert.deepEqual(execution.unrecovered, [
      "specs/stories/_template/story.md",
    ]);
    assert.equal(execution.restored.includes("AGENTS.md"), true);
    assert.deepEqual(execution.invalidated, ["specs/.forgeflow-adoption"]);
    await assert.rejects(lstat(join(root, "specs/.forgeflow-adoption")), {
      code: "ENOENT",
    });
    assert.deepEqual(
      execution.retained,
      plan.stagePreconditions.map(({ path }) => path),
    );
    for (const stage of execution.retained)
      assert.equal((await lstat(join(root, stage))).isDirectory(), true);
    assert.equal(JSON.stringify(result).includes(root), false);
    const human = renderInitHuman({ mode: "human", result });
    assert.equal(human.stdout, "");
    assert.match(
      human.stderr,
      /UNRESTORED: specs\/stories\/_template\/story\.md/,
    );
    for (const stage of execution.retained)
      assert.match(
        human.stderr,
        new RegExp(`Recovery copies retained: ${stage}`),
      );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-005: a failed marker restore records successful marker invalidation", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-marker-recovery-"));
  try {
    await apply(root);
    const { inspection, plan } = await planned(root, "force");
    let applyTriggered = false;
    const operations = withOperation("rename", async (source, destination) => {
      if (
        !applyTriggered &&
        source.endsWith("/new") &&
        destination.endsWith("specs/.forgeflow-adoption")
      ) {
        applyTriggered = true;
        await nodeInitMutationOperations.rename(source, destination);
        throw new Error("injected marker apply failure");
      }
      if (
        source.endsWith("/restore") &&
        destination.endsWith("specs/.forgeflow-adoption")
      )
        throw new Error("injected marker restore failure");
      await nodeInitMutationOperations.rename(source, destination);
    });

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
      operations,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(result.outcome, "INIT_RECOVERY_INCOMPLETE");
    assert.deepEqual(execution.invalidated, ["specs/.forgeflow-adoption"]);
    await assert.rejects(lstat(join(root, "specs/.forgeflow-adoption")), {
      code: "ENOENT",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-005/006: marker invalidation failure is reported with exact retained evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-marker-retained-"));
  try {
    await apply(root);
    const { inspection, plan } = await planned(root, "force");
    let applyTriggered = false;
    const operations = Object.freeze({
      ...nodeInitMutationOperations,
      rename: async (source, destination) => {
        if (
          !applyTriggered &&
          source.endsWith("/new") &&
          destination.endsWith("specs/.forgeflow-adoption")
        ) {
          applyTriggered = true;
          await nodeInitMutationOperations.rename(source, destination);
          throw new Error("injected marker apply failure");
        }
        if (
          source.endsWith("/restore") &&
          destination.endsWith("specs/stories/_template/story.md")
        )
          throw new Error("injected sibling restore failure");
        await nodeInitMutationOperations.rename(source, destination);
      },
      removeFile: async (path) => {
        if (path.endsWith("specs/.forgeflow-adoption"))
          throw new Error("injected marker invalidation failure");
        await nodeInitMutationOperations.removeFile(path);
      },
    });

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
      operations,
    );
    const result = evaluateInitMutation(plan, execution).result;
    const human = renderInitHuman({ mode: "human", result });

    assert.equal(result.outcome, "INIT_RECOVERY_INCOMPLETE");
    assert.deepEqual(execution.invalidationFailed, [
      "specs/.forgeflow-adoption",
    ]);
    assert.match(
      human.stderr,
      /Marker invalidation failed: specs\/.forgeflow-adoption/,
    );
    assert.deepEqual(
      execution.retained,
      plan.stagePreconditions.map(({ path }) => path),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-005/006: failed marker restore and invalidation produce one valid incomplete trace", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "forgeflow-init-marker-double-fault-"),
  );
  try {
    await apply(root);
    const { inspection, plan } = await planned(root, "force");
    let applyTriggered = false;
    const operations = Object.freeze({
      ...nodeInitMutationOperations,
      rename: async (source, destination) => {
        if (
          !applyTriggered &&
          source.endsWith("/new") &&
          destination.endsWith("specs/.forgeflow-adoption")
        ) {
          applyTriggered = true;
          await nodeInitMutationOperations.rename(source, destination);
          throw new Error("injected marker apply failure");
        }
        if (
          source.endsWith("/restore") &&
          destination.endsWith("specs/.forgeflow-adoption")
        )
          throw new Error("injected marker restore failure");
        await nodeInitMutationOperations.rename(source, destination);
      },
      removeFile: async (path) => {
        if (path.endsWith("specs/.forgeflow-adoption"))
          throw new Error("injected marker invalidation failure");
        await nodeInitMutationOperations.removeFile(path);
      },
    });

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
      operations,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(result.outcome, "INIT_RECOVERY_INCOMPLETE");
    assert.deepEqual(execution.unrecovered, ["specs/.forgeflow-adoption"]);
    assert.deepEqual(execution.invalidationFailed, [
      "specs/.forgeflow-adoption",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-005: an absent fresh marker is confirmed invalid after incomplete early recovery", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "forgeflow-init-fresh-incomplete-"),
  );
  try {
    const { inspection, plan } = await planned(root, "safe");
    let applyTriggered = false;
    const operations = Object.freeze({
      ...nodeInitMutationOperations,
      rename: async (source, destination) => {
        if (
          !applyTriggered &&
          source.endsWith("/new") &&
          destination.endsWith("specs/stories/_template/story.md")
        ) {
          applyTriggered = true;
          throw new Error("injected early apply failure");
        }
        await nodeInitMutationOperations.rename(source, destination);
      },
      removeFile: async (path) => {
        if (path.endsWith("/AGENTS.md"))
          throw new Error("injected fresh recovery failure");
        await nodeInitMutationOperations.removeFile(path);
      },
    });

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
      operations,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(result.outcome, "INIT_RECOVERY_INCOMPLETE");
    assert.deepEqual(execution.unrecovered, ["AGENTS.md"]);
    assert.deepEqual(execution.invalidated, ["specs/.forgeflow-adoption"]);
    await assert.rejects(lstat(join(root, "specs/.forgeflow-adoption")), {
      code: "ENOENT",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-006: a committed apply with exact stage residue is cleanup-incomplete", async () => {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-init-cleanup-fault-"));
  try {
    const { inspection, plan } = await planned(root);
    const retainedStage = plan.stagePreconditions[0].path;
    const operations = withOperation("removeDirectory", async (path) => {
      if (path.endsWith(retainedStage))
        throw new Error("injected cleanup failure");
      await nodeInitMutationOperations.removeDirectory(path);
    });

    const execution = await executeInitMutation(
      root,
      plan,
      inspection.snapshot,
      inspection.payloads,
      operations,
    );
    const result = evaluateInitMutation(plan, execution).result;

    assert.equal(result.outcome, "INIT_CLEANUP_INCOMPLETE");
    assert.deepEqual(execution.cleanupResidue, [retainedStage]);
    assert.equal((await lstat(join(root, retainedStage))).isDirectory(), true);
    assert.equal(
      await readFile(join(root, "specs/.forgeflow-adoption"), "utf8"),
      "version=0.9.0\nrevision=unknown\n",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST013-AC-002: the mutation adapter reports facts and contains no semantic outcomes", async () => {
  const source = await readFile(
    fileURLToPath(new URL("../src/init-mutation.ts", import.meta.url)),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /INIT_(?:APPLIED|OPERATION_REFUSED|APPLY_FAILED_RECOVERED|RECOVERY_INCOMPLETE|CLEANUP_INCOMPLETE)/,
  );
});
