import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, lstat, open } from "node:fs/promises";
import { resolve } from "node:path";

import {
  getInitObservationScope,
  type InitMode,
  type InitPathKind,
  type InitPathObservation,
  type InitStageObservation,
} from "@forgeflow/core";

export function initFilesystemIdentity(stats: {
  readonly dev: number;
  readonly ino: number;
}): string {
  return `${stats.dev}:${stats.ino}`;
}

function sameFileState(
  before: {
    readonly dev: number;
    readonly ino: number;
    readonly size: number;
    readonly mtimeMs: number;
  },
  after: {
    readonly dev: number;
    readonly ino: number;
    readonly size: number;
    readonly mtimeMs: number;
  },
): boolean {
  return (
    before.dev === after.dev &&
    before.ino === after.ino &&
    before.size === after.size &&
    before.mtimeMs === after.mtimeMs
  );
}

async function canAccess(path: string, mode: number): Promise<boolean> {
  try {
    await access(path, mode);
    return true;
  } catch {
    return false;
  }
}

export async function observeInitPath(
  path: string,
  relativePath: string,
): Promise<InitPathObservation> {
  try {
    const stats = await lstat(path);
    if (stats.isSymbolicLink())
      return Object.freeze({ path: relativePath, kind: "symlink" });
    if (stats.isDirectory())
      return Object.freeze({
        path: relativePath,
        kind: "directory",
        readable: await canAccess(path, constants.R_OK),
        searchable: await canAccess(path, constants.X_OK),
        identity: initFilesystemIdentity(stats),
      });
    if (!stats.isFile())
      return Object.freeze({ path: relativePath, kind: "other" });

    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const before = await handle.stat();
      if (!before.isFile())
        return Object.freeze({ path: relativePath, kind: "other" });
      const bytes = await handle.readFile();
      const after = await handle.stat();
      if (!sameFileState(before, after))
        return Object.freeze({ path: relativePath, kind: "unconfirmable" });
      return Object.freeze({
        path: relativePath,
        kind: "file",
        readable: true,
        digest: createHash("sha256").update(bytes).digest("hex"),
        identity: initFilesystemIdentity(after),
      });
    } finally {
      await handle.close();
    }
  } catch (error: unknown) {
    return (error as { code?: string }).code === "ENOENT"
      ? Object.freeze({ path: relativePath, kind: "missing" })
      : Object.freeze({ path: relativePath, kind: "unconfirmable" });
  }
}

export async function captureInitObservations(
  root: string,
  mode: InitMode,
): Promise<readonly InitPathObservation[]> {
  const scope = getInitObservationScope(mode);
  const paths: InitPathObservation[] = [];
  const blockedPrefixes: string[] = [];
  for (const path of scope.directories) {
    if (blockedPrefixes.some((prefix) => path.startsWith(`${prefix}/`))) {
      paths.push({ path, kind: "unconfirmable" });
      continue;
    }
    const entry = await observeInitPath(resolve(root, path), path);
    paths.push(entry);
    if (
      entry.kind !== "missing" &&
      (entry.kind !== "directory" ||
        entry.readable !== true ||
        entry.searchable !== true)
    )
      blockedPrefixes.push(path);
  }
  for (const path of scope.destinations) {
    if (!paths.some((entry) => entry.path === path))
      paths.push(
        blockedPrefixes.some((prefix) => path.startsWith(`${prefix}/`))
          ? { path, kind: "unconfirmable" }
          : await observeInitPath(resolve(root, path), path),
      );
  }
  return Object.freeze(paths);
}

async function observeKind(path: string): Promise<InitPathKind> {
  try {
    const stats = await lstat(path);
    if (stats.isSymbolicLink()) return "symlink";
    if (stats.isDirectory()) return "directory";
    if (stats.isFile()) return "file";
    return "other";
  } catch (error: unknown) {
    return (error as { code?: string }).code === "ENOENT"
      ? "missing"
      : "unconfirmable";
  }
}

export async function captureInitStageObservations(
  root: string,
  paths: readonly string[],
): Promise<readonly InitStageObservation[]> {
  return Object.freeze(
    await Promise.all(
      paths.map(async (path) =>
        Object.freeze({ path, kind: await observeKind(resolve(root, path)) }),
      ),
    ),
  );
}
