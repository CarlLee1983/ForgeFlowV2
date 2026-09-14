import { createHash } from "node:crypto";
import { lstat } from "node:fs/promises";
import { resolve } from "node:path";

import {
  activationDirectories,
  activationSkillDirectory,
  activationSnapshotPath,
  findActivationPreconditionMismatches,
  type ActivationMutationPlan,
  type ActivationPathObservation,
  type ActivationPlannedPayload,
  type MutationExecutionObservation,
  type MutationFailure,
} from "@forgeflow/core";

import {
  captureActivationObservations,
  captureActivationStageObservations,
} from "./activation-observation.js";
import {
  nodeInitMutationOperations,
  type InitMutationOperations,
} from "./init-mutation.js";
import { initFilesystemIdentity } from "./init-observation.js";

interface OwnedDirectory {
  readonly path: string;
  readonly identity: string;
}

function failure(
  stage: MutationFailure["stage"],
  code: string,
  path?: string,
): MutationFailure {
  return Object.freeze({
    stage,
    code,
    ...(path === undefined ? {} : { path }),
  });
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function observation(
  plan: ActivationMutationPlan,
  state: Partial<Omit<MutationExecutionObservation, "planId">> = {},
): MutationExecutionObservation {
  return Object.freeze({
    planId: plan.planId,
    committed: state.committed ?? false,
    prepared: Object.freeze([...(state.prepared ?? [])]),
    attempted: Object.freeze([...(state.attempted ?? [])]),
    applied: Object.freeze([...(state.applied ?? [])]),
    recoveryAttempted: Object.freeze([...(state.recoveryAttempted ?? [])]),
    restored: Object.freeze([...(state.restored ?? [])]),
    unrecovered: Object.freeze([...(state.unrecovered ?? [])]),
    invalidated: Object.freeze([...(state.invalidated ?? [])]),
    invalidationFailed: Object.freeze([...(state.invalidationFailed ?? [])]),
    retained: Object.freeze([...(state.retained ?? [])]),
    cleanupResidue: Object.freeze([...(state.cleanupResidue ?? [])]),
    preconditionMismatches: Object.freeze([
      ...(state.preconditionMismatches ?? []),
    ]),
    ...(state.failure === undefined ? {} : { failure: state.failure }),
  });
}

function stageByDestination(plan: ActivationMutationPlan): Map<string, string> {
  return new Map(
    plan.effects.map((effect, index) => [
      effect.path,
      plan.stagePreconditions[index]?.path as string,
    ]),
  );
}

async function cleanupStages(
  root: string,
  stages: readonly OwnedDirectory[],
  operations: InitMutationOperations,
): Promise<readonly string[]> {
  const residue: string[] = [];
  for (const owned of [...stages].reverse()) {
    const stage = resolve(root, owned.path);
    try {
      const stats = await lstat(stage);
      if (
        !stats.isDirectory() ||
        initFilesystemIdentity(stats) !== owned.identity
      ) {
        residue.push(owned.path);
        continue;
      }
      await operations.removeFile(resolve(stage, "new"));
      await operations.removeFile(resolve(stage, "restore"));
      await operations.removeFile(resolve(stage, "original"));
      await operations.removeDirectory(stage);
    } catch {
      try {
        await lstat(stage);
        residue.push(owned.path);
      } catch (inspectionError: unknown) {
        if ((inspectionError as { code?: string }).code !== "ENOENT")
          residue.push(owned.path);
      }
    }
  }
  return Object.freeze(residue.reverse());
}

async function cleanupDirectories(
  root: string,
  directories: readonly OwnedDirectory[],
  operations: InitMutationOperations,
): Promise<readonly string[]> {
  const residue: string[] = [];
  for (const owned of [...directories].reverse()) {
    const path = resolve(root, owned.path);
    try {
      const stats = await lstat(path);
      if (
        !stats.isDirectory() ||
        initFilesystemIdentity(stats) !== owned.identity
      ) {
        residue.push(owned.path);
        continue;
      }
      await operations.removeDirectory(path);
    } catch {
      try {
        await lstat(path);
        residue.push(owned.path);
      } catch (inspectionError: unknown) {
        if ((inspectionError as { code?: string }).code !== "ENOENT")
          residue.push(owned.path);
      }
    }
  }
  return Object.freeze(residue.reverse());
}

function normalizePreparedRecapture(
  plan: ActivationMutationPlan,
  actual: readonly ActivationPathObservation[],
  createdDirectories: ReadonlyMap<string, string>,
): readonly ActivationPathObservation[] {
  const expected = new Map(
    plan.preconditions.map((entry) => [entry.path, entry]),
  );
  return Object.freeze(
    actual.map((entry) => {
      const createdIsStillOwned =
        createdDirectories.get(entry.path) === entry.identity &&
        expected.get(entry.path)?.kind === "missing";
      const integrationIsStillEmpty =
        entry.path !== activationSkillDirectory ||
        (entry.kind === "directory" && entry.members?.length === 0);
      return createdIsStillOwned && integrationIsStillEmpty
        ? (expected.get(entry.path) as ActivationPathObservation)
        : entry;
    }),
  );
}

async function changedOwnedDirectories(
  root: string,
  directories: readonly OwnedDirectory[],
): Promise<readonly string[]> {
  const changed: string[] = [];
  for (const owned of directories) {
    try {
      const stats = await lstat(resolve(root, owned.path));
      if (
        !stats.isDirectory() ||
        initFilesystemIdentity(stats) !== owned.identity
      )
        changed.push(owned.path);
    } catch {
      changed.push(owned.path);
    }
  }
  return Object.freeze(changed);
}

function stageCollision(
  stages: ReadonlyMap<string, string>,
  path: string,
): boolean {
  for (const stage of stages.values()) if (stage === path) return true;
  return false;
}

export async function executeActivationMutation(
  root: string,
  plan: ActivationMutationPlan,
  payloads: readonly ActivationPlannedPayload[],
  operations: InitMutationOperations = nodeInitMutationOperations,
): Promise<MutationExecutionObservation> {
  const prepared: string[] = [];
  const attempted: string[] = [];
  const applied: string[] = [];
  const recoveryAttempted: string[] = [];
  const restored: string[] = [];
  const unrecovered: string[] = [];
  const invalidated: string[] = [];
  const invalidationFailed: string[] = [];
  const createdDirectories: OwnedDirectory[] = [];
  const createdStages: OwnedDirectory[] = [];
  const originals = new Set<string>();
  const stages = stageByDestination(plan);

  try {
    const stats = await lstat(root);
    if (
      !stats.isDirectory() ||
      initFilesystemIdentity(stats) !== plan.rootIdentity
    )
      throw new Error("Target identity changed");
  } catch {
    return observation(plan, {
      failure: failure("precondition", "ACTIVATION_STALE_PLAN"),
    });
  }

  const payloadByPath = new Map(
    payloads.map((payload) => [payload.path, payload]),
  );
  for (const effect of plan.effects) {
    const payload = payloadByPath.get(effect.path);
    if (
      payload === undefined ||
      payload.digest !== effect.digest ||
      digest(payload.bytes) !== effect.digest ||
      payload.mode !== effect.mode ||
      !Number.isInteger(payload.mode) ||
      payload.mode < 0 ||
      payload.mode > 0o777
    )
      return observation(plan, {
        failure: failure(
          "precondition",
          "ACTIVATION_PAYLOAD_INVALID",
          effect.path,
        ),
      });
  }

  const initialPaths = await captureActivationObservations(root);
  const initialStages = await captureActivationStageObservations(
    root,
    plan.stagePreconditions.map(({ path }) => path),
  );
  const initialMismatches = findActivationPreconditionMismatches(
    plan,
    initialPaths,
    initialStages,
  );
  if (initialMismatches.length > 0) {
    const stagesOnly = initialMismatches.every((path) =>
      stageCollision(stages, path),
    );
    return observation(plan, {
      preconditionMismatches: initialMismatches,
      failure: failure(
        "precondition",
        stagesOnly ? "ACTIVATION_STAGE_COLLISION" : "ACTIVATION_STALE_PLAN",
        initialMismatches[0],
      ),
    });
  }

  try {
    for (const directory of activationDirectories.slice(2)) {
      const expected = plan.preconditions.find(
        ({ path }) => path === directory,
      );
      if (expected?.kind !== "missing") continue;
      const destination = resolve(root, directory);
      const identity = await operations.makeDirectory(destination, 0o777);
      createdDirectories.push({ path: directory, identity });
      await operations.afterOperation?.("makeDirectory", destination);
    }
    for (const effect of plan.effects) {
      const stagePath = stages.get(effect.path) as string;
      const stage = resolve(root, stagePath);
      const stageIdentity = await operations.makeDirectory(stage, 0o700);
      createdStages.push({ path: stagePath, identity: stageIdentity });
      await operations.afterOperation?.("makeDirectory", stage);
      const expected = plan.preconditions.find(
        ({ path }) => path === effect.path,
      );
      if (expected?.kind === "file") {
        const original = await operations.readFileNoFollow(
          resolve(root, effect.path),
        );
        if (
          original.identity !== expected.identity ||
          original.mode !== expected.mode ||
          digest(original.bytes) !== expected.digest
        ) {
          const stageResidue = await cleanupStages(
            root,
            createdStages,
            operations,
          );
          const directoryResidue = await cleanupDirectories(
            root,
            createdDirectories,
            operations,
          );
          return observation(plan, {
            prepared,
            preconditionMismatches: [effect.path],
            cleanupResidue: [...stageResidue, ...directoryResidue],
            failure: failure(
              "precondition",
              "ACTIVATION_STALE_PLAN",
              effect.path,
            ),
          });
        }
        await operations.writeFileExclusive(
          resolve(stage, "original"),
          original.bytes,
          original.mode,
          true,
        );
        await operations.afterOperation?.(
          "writeFileExclusive",
          resolve(stage, "original"),
        );
        originals.add(effect.path);
      }
      const payload = payloadByPath.get(
        effect.path,
      ) as ActivationPlannedPayload;
      await operations.writeFileExclusive(
        resolve(stage, "new"),
        payload.bytes,
        payload.mode,
        true,
      );
      await operations.afterOperation?.(
        "writeFileExclusive",
        resolve(stage, "new"),
      );
      prepared.push(effect.path);
    }
  } catch {
    const stageResidue = await cleanupStages(root, createdStages, operations);
    const directoryResidue = await cleanupDirectories(
      root,
      createdDirectories,
      operations,
    );
    const residue = [...stageResidue, ...directoryResidue];
    return observation(plan, {
      prepared,
      cleanupResidue: residue,
      failure: failure(
        "prepare",
        residue.length === 0
          ? "ACTIVATION_PREPARATION_FAILED"
          : "ACTIVATION_CLEANUP_FAILED",
        prepared.at(-1),
      ),
    });
  }

  const ignoredStages = plan.stagePreconditions.map(({ path }) => path);
  const preparedPaths = await captureActivationObservations(
    root,
    ignoredStages,
  );
  const changedDirectories = await changedOwnedDirectories(root, [
    ...createdDirectories,
    ...createdStages,
  ]);
  const normalized = normalizePreparedRecapture(
    plan,
    preparedPaths,
    new Map(createdDirectories.map(({ path, identity }) => [path, identity])),
  );
  const recaptureMismatches = findActivationPreconditionMismatches(
    plan,
    normalized,
    plan.stagePreconditions,
  );
  const preparedMismatches = Object.freeze([
    ...recaptureMismatches,
    ...changedDirectories.filter((path) => !recaptureMismatches.includes(path)),
  ]);
  if (preparedMismatches.length > 0) {
    const stageResidue = await cleanupStages(root, createdStages, operations);
    const directoryResidue = await cleanupDirectories(
      root,
      createdDirectories,
      operations,
    );
    return observation(plan, {
      prepared,
      preconditionMismatches: preparedMismatches,
      cleanupResidue: [...stageResidue, ...directoryResidue],
      failure: failure(
        "precondition",
        "ACTIVATION_STALE_PLAN",
        preparedMismatches[0],
      ),
    });
  }

  if (operations.shouldAbort?.() === true) {
    const stageResidue = await cleanupStages(root, createdStages, operations);
    const directoryResidue = await cleanupDirectories(
      root,
      createdDirectories,
      operations,
    );
    const residue = [...stageResidue, ...directoryResidue];
    return observation(plan, {
      prepared,
      cleanupResidue: residue,
      failure: failure(
        "prepare",
        residue.length === 0
          ? "ACTIVATION_INTERRUPTED"
          : "ACTIVATION_CLEANUP_FAILED",
        residue[0],
      ),
    });
  }

  let applyFailure: MutationFailure | undefined;
  for (const effect of plan.effects) {
    const stagePath = stages.get(effect.path) as string;
    attempted.push(effect.path);
    try {
      await operations.rename(
        resolve(root, stagePath, "new"),
        resolve(root, effect.path),
      );
      await operations.afterOperation?.("rename", resolve(root, effect.path));
      applied.push(effect.path);
      if (operations.shouldAbort?.() === true) {
        applyFailure = failure("apply", "ACTIVATION_INTERRUPTED", effect.path);
        break;
      }
    } catch {
      applyFailure = failure(
        "apply",
        "ACTIVATION_REPLACEMENT_FAILED",
        effect.path,
      );
      break;
    }
  }

  if (applyFailure !== undefined) {
    for (const path of [...attempted].reverse()) {
      const stagePath = stages.get(path) as string;
      recoveryAttempted.push(path);
      try {
        if (originals.has(path)) {
          const original = await operations.readFileNoFollow(
            resolve(root, stagePath, "original"),
          );
          const expected = plan.preconditions.find(
            (entry) => entry.path === path,
          );
          if (
            expected?.kind !== "file" ||
            original.mode !== expected.mode ||
            digest(original.bytes) !== expected.digest
          )
            throw new Error("Prepared recovery copy changed");
          await operations.writeFileExclusive(
            resolve(root, stagePath, "restore"),
            original.bytes,
            original.mode,
            true,
          );
          await operations.afterOperation?.(
            "writeFileExclusive",
            resolve(root, stagePath, "restore"),
          );
          await operations.rename(
            resolve(root, stagePath, "restore"),
            resolve(root, path),
          );
          await operations.afterOperation?.("rename", resolve(root, path));
        } else {
          await operations.removeFile(resolve(root, path));
        }
        restored.push(path);
      } catch {
        unrecovered.push(path);
      }
    }

    if (unrecovered.length > 0) {
      try {
        await operations.removeFile(resolve(root, activationSnapshotPath));
        invalidated.push(activationSnapshotPath);
      } catch {
        invalidationFailed.push(activationSnapshotPath);
      }
      return observation(plan, {
        prepared,
        attempted,
        applied,
        recoveryAttempted,
        restored,
        unrecovered,
        invalidated,
        invalidationFailed,
        retained: createdStages.map(({ path }) => path),
        failure: failure(
          "recovery",
          "ACTIVATION_RESTORE_FAILED",
          unrecovered[0],
        ),
      });
    }

    const stageResidue = await cleanupStages(root, createdStages, operations);
    const directoryResidue = await cleanupDirectories(
      root,
      createdDirectories,
      operations,
    );
    const residue = [...stageResidue, ...directoryResidue];
    return observation(plan, {
      prepared,
      attempted,
      applied,
      recoveryAttempted,
      restored,
      cleanupResidue: residue,
      failure:
        residue.length === 0
          ? applyFailure
          : failure("recovery", "ACTIVATION_CLEANUP_FAILED", residue[0]),
    });
  }

  const cleanupResidue = await cleanupStages(root, createdStages, operations);
  return observation(plan, {
    committed: true,
    prepared,
    attempted,
    applied,
    cleanupResidue,
    ...(cleanupResidue.length === 0
      ? {}
      : {
          failure: failure(
            "cleanup",
            "ACTIVATION_CLEANUP_FAILED",
            cleanupResidue[0],
          ),
        }),
  });
}

export async function executeActivationMutationWithSignals(
  root: string,
  plan: ActivationMutationPlan,
  payloads: readonly ActivationPlannedPayload[],
  operations: InitMutationOperations = nodeInitMutationOperations,
): Promise<MutationExecutionObservation> {
  let interrupted = false;
  const onSignal = (): void => {
    interrupted = true;
  };
  const signals: readonly NodeJS.Signals[] = ["SIGHUP", "SIGINT", "SIGTERM"];
  for (const signal of signals) process.on(signal, onSignal);
  try {
    return await executeActivationMutation(root, plan, payloads, {
      ...operations,
      shouldAbort: () => interrupted,
    });
  } finally {
    for (const signal of signals) process.off(signal, onSignal);
  }
}
