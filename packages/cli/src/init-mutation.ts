import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, rename, rm, rmdir } from "node:fs/promises";
import { resolve } from "node:path";

import {
  adoptionMarkerPath,
  createAdoptionMarker,
  findInitPreconditionMismatches,
  getInitObservationScope,
  type InitMutationExecutionObservation,
  type InitMutationFailure,
  type InitMutationPlan,
  type InitPathObservation,
  type InitSnapshot,
} from "@praxisbound/core";

import {
  captureInitObservations,
  captureInitStageObservations,
  initFilesystemIdentity,
} from "./init-observation.js";
import type { PackagedInitPayload } from "./init-snapshot.js";

interface OriginalFile {
  readonly bytes: Uint8Array;
  readonly mode: number;
  readonly identity: string;
}

interface OwnedDirectory {
  readonly path: string;
  readonly identity: string;
}

export type InitMutationOperation =
  | "makeDirectory"
  | "writeFileExclusive"
  | "rename"
  | "removeFile"
  | "removeDirectory";

export interface InitMutationOperations {
  readonly makeDirectory: (path: string, mode: number) => Promise<string>;
  readonly readFileNoFollow: (path: string) => Promise<OriginalFile>;
  readonly writeFileExclusive: (
    path: string,
    bytes: Uint8Array,
    mode: number,
    preserveMode?: boolean,
  ) => Promise<void>;
  readonly rename: (source: string, destination: string) => Promise<void>;
  readonly removeFile: (path: string) => Promise<void>;
  readonly removeDirectory: (path: string) => Promise<void>;
  readonly afterOperation?: (
    operation: InitMutationOperation,
    path: string,
  ) => Promise<void>;
  readonly shouldAbort?: () => boolean;
}

async function readFileNoFollow(path: string): Promise<OriginalFile> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = await handle.stat();
    if (!before.isFile()) throw new Error("Not a regular file");
    const bytes = new Uint8Array(await handle.readFile());
    const after = await handle.stat();
    if (
      !after.isFile() ||
      initFilesystemIdentity(before) !== initFilesystemIdentity(after) ||
      before.size !== after.size ||
      before.mtimeMs !== after.mtimeMs ||
      before.mode !== after.mode
    )
      throw new Error("File changed while being read");
    return Object.freeze({
      bytes,
      mode: after.mode & 0o777,
      identity: initFilesystemIdentity(after),
    });
  } finally {
    await handle.close();
  }
}

async function writeFileExclusive(
  path: string,
  bytes: Uint8Array,
  mode: number,
  preserveMode: boolean = false,
): Promise<void> {
  const handle = await open(
    path,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    mode,
  );
  try {
    await handle.writeFile(bytes);
    if (preserveMode) await handle.chmod(mode);
  } finally {
    await handle.close();
  }
}

export const nodeInitMutationOperations: InitMutationOperations = Object.freeze(
  {
    makeDirectory: async (path: string, mode: number) => {
      await mkdir(path, { mode });
      return initFilesystemIdentity(await lstat(path));
    },
    readFileNoFollow,
    writeFileExclusive,
    rename,
    removeFile: async (path: string) => {
      await rm(path, { force: true });
    },
    removeDirectory: rmdir,
    shouldAbort: () => false,
  },
);

function failure(
  stage: InitMutationFailure["stage"],
  code: string,
  path?: string,
): InitMutationFailure {
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
  plan: InitMutationPlan,
  state: {
    readonly committed?: boolean;
    readonly prepared?: readonly string[];
    readonly attempted?: readonly string[];
    readonly applied?: readonly string[];
    readonly recoveryAttempted?: readonly string[];
    readonly restored?: readonly string[];
    readonly unrecovered?: readonly string[];
    readonly invalidated?: readonly string[];
    readonly invalidationFailed?: readonly string[];
    readonly retained?: readonly string[];
    readonly cleanupResidue?: readonly string[];
    readonly preconditionMismatches?: readonly string[];
    readonly failure?: InitMutationFailure;
  },
): InitMutationExecutionObservation {
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

function stageByDestination(plan: InitMutationPlan): Map<string, string> {
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
  plan: InitMutationPlan,
  actual: readonly InitPathObservation[],
  createdDirectories: ReadonlyMap<string, string>,
): readonly InitPathObservation[] {
  const expected = new Map(
    plan.preconditions.map((entry) => [entry.path, entry]),
  );
  return Object.freeze(
    actual.map((entry) =>
      createdDirectories.get(entry.path) === entry.identity &&
      expected.get(entry.path)?.kind === "missing"
        ? (expected.get(entry.path) as InitPathObservation)
        : entry,
    ),
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

export async function executeInitMutation(
  candidate: string,
  plan: InitMutationPlan,
  snapshot: InitSnapshot,
  payloads: readonly PackagedInitPayload[],
  operations: InitMutationOperations = nodeInitMutationOperations,
): Promise<InitMutationExecutionObservation> {
  const prepared: string[] = [];
  const attempted: string[] = [];
  const applied: string[] = [];
  const restored: string[] = [];
  const unrecovered: string[] = [];
  const recoveryAttempted: string[] = [];
  const invalidated: string[] = [];
  const invalidationFailed: string[] = [];
  const createdDirectories: OwnedDirectory[] = [];
  const createdStages: OwnedDirectory[] = [];
  const stages = stageByDestination(plan);
  const originals = new Set<string>();
  const root = candidate;

  try {
    const rootStats = await lstat(root);
    if (
      !rootStats.isDirectory() ||
      initFilesystemIdentity(rootStats) !== plan.rootIdentity
    )
      throw new Error("Target identity changed");
  } catch {
    return observation(plan, {
      failure: failure("precondition", "INIT_STALE_PLAN"),
    });
  }

  const payloadByPath = new Map(
    payloads.map((payload) => [payload.path, payload]),
  );
  const markerBytes = new TextEncoder().encode(createAdoptionMarker(snapshot));
  const effectBytes = new Map<string, Uint8Array>();
  for (const effect of plan.effects) {
    const payload = payloadByPath.get(effect.path);
    const bytes =
      effect.kind === "remove"
        ? new Uint8Array()
        : effect.path === adoptionMarkerPath
          ? markerBytes
          : payload?.bytes;
    if (
      bytes === undefined ||
      digest(bytes) !== effect.digest ||
      (effect.kind !== "remove" &&
        effect.path !== adoptionMarkerPath &&
        (payload === undefined ||
          !Number.isInteger(payload.mode) ||
          payload.mode < 0 ||
          payload.mode > 0o777))
    )
      return observation(plan, {
        failure: failure("precondition", "INIT_PAYLOAD_INVALID", effect.path),
      });
    effectBytes.set(effect.path, bytes);
  }

  const initialPaths = await captureInitObservations(root, plan.mode);
  const initialStages = await captureInitStageObservations(
    root,
    plan.stagePreconditions.map(({ path }) => path),
  );
  const initialMismatches = findInitPreconditionMismatches(
    plan,
    initialPaths,
    initialStages,
  );
  if (initialMismatches.length > 0) {
    const onlyStageCollisions = initialMismatches.every((path) =>
      stagesHas(stages, path),
    );
    return observation(plan, {
      preconditionMismatches: initialMismatches,
      failure: failure(
        "precondition",
        onlyStageCollisions ? "INIT_STAGE_COLLISION" : "INIT_STALE_PLAN",
        initialMismatches[0],
      ),
    });
  }

  const scope = getInitObservationScope(plan.mode);
  try {
    for (const directory of scope.directories) {
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
      if (effect.kind !== "remove") {
        await operations.writeFileExclusive(
          resolve(stage, "new"),
          effectBytes.get(effect.path) as Uint8Array,
          effect.path === adoptionMarkerPath
            ? 0o666
            : (payloadByPath.get(effect.path)?.mode as number),
        );
        await operations.afterOperation?.(
          "writeFileExclusive",
          resolve(stage, "new"),
        );
      }
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
          ? "INIT_PREPARATION_FAILED"
          : "INIT_RECOVERY_CLEANUP_FAILED",
        prepared.at(-1),
      ),
    });
  }

  const preparedPaths = await captureInitObservations(root, plan.mode);
  const changedDirectories = await changedOwnedDirectories(root, [
    ...createdDirectories,
    ...createdStages,
  ]);
  const normalizedPaths = normalizePreparedRecapture(
    plan,
    preparedPaths,
    new Map(createdDirectories.map(({ path, identity }) => [path, identity])),
  );
  const recaptureMismatches = findInitPreconditionMismatches(
    plan,
    normalizedPaths,
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
        "INIT_STALE_PLAN",
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
          ? "INIT_INTERRUPTED"
          : "INIT_RECOVERY_CLEANUP_FAILED",
        residue[0],
      ),
    });
  }

  let applyFailure: InitMutationFailure | undefined;
  for (const effect of plan.effects) {
    const stagePath = stages.get(effect.path) as string;
    attempted.push(effect.path);
    try {
      if (effect.kind === "remove") {
        await operations.removeFile(resolve(root, effect.path));
        await operations.afterOperation?.(
          "removeFile",
          resolve(root, effect.path),
        );
      } else {
        await operations.rename(
          resolve(root, stagePath, "new"),
          resolve(root, effect.path),
        );
        await operations.afterOperation?.("rename", resolve(root, effect.path));
      }
      applied.push(effect.path);
      if (operations.shouldAbort?.() === true) {
        applyFailure = failure("apply", "INIT_INTERRUPTED", effect.path);
        break;
      }
    } catch {
      applyFailure = failure("apply", "INIT_REPLACEMENT_FAILED", effect.path);
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
        if (path === adoptionMarkerPath) {
          try {
            await operations.removeFile(resolve(root, path));
            invalidated.push(path);
          } catch {
            invalidationFailed.push(path);
          }
        }
      }
    }

    if (unrecovered.length > 0) {
      if (
        !invalidated.includes(adoptionMarkerPath) &&
        !invalidationFailed.includes(adoptionMarkerPath)
      ) {
        try {
          await lstat(resolve(root, adoptionMarkerPath));
          await operations.removeFile(resolve(root, adoptionMarkerPath));
          invalidated.push(adoptionMarkerPath);
        } catch (error: unknown) {
          if ((error as { code?: string }).code === "ENOENT")
            invalidated.push(adoptionMarkerPath);
          else invalidationFailed.push(adoptionMarkerPath);
        }
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
        failure: failure("recovery", "INIT_RESTORE_FAILED", unrecovered[0]),
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
      invalidated,
      cleanupResidue: residue,
      failure:
        residue.length === 0
          ? applyFailure
          : failure("recovery", "INIT_RECOVERY_CLEANUP_FAILED", residue[0]),
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
          failure: failure("cleanup", "INIT_CLEANUP_FAILED", cleanupResidue[0]),
        }),
  });
}

export async function executeInitMutationWithSignals(
  candidate: string,
  plan: InitMutationPlan,
  snapshot: InitSnapshot,
  payloads: readonly PackagedInitPayload[],
  operations: InitMutationOperations = nodeInitMutationOperations,
): Promise<InitMutationExecutionObservation> {
  let interrupted = false;
  const onSignal = (): void => {
    interrupted = true;
  };
  const signals: readonly NodeJS.Signals[] = ["SIGHUP", "SIGINT", "SIGTERM"];
  for (const signal of signals) process.on(signal, onSignal);
  try {
    return await executeInitMutation(candidate, plan, snapshot, payloads, {
      ...operations,
      shouldAbort: () => interrupted,
    });
  } finally {
    for (const signal of signals) process.off(signal, onSignal);
  }
}

function stagesHas(stages: ReadonlyMap<string, string>, path: string): boolean {
  for (const stage of stages.values()) if (stage === path) return true;
  return false;
}
