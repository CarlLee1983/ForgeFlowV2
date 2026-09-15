import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, lstat, open, readdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

import {
  activationSkillDirectory,
  legacyActivationSkillDirectory,
  getActivationObservationScope,
  type ActivationPathObservation,
  type MutationPathKind,
  type MutationStageObservation,
} from "@praxisbound/core";

import { initFilesystemIdentity } from "./init-observation.js";

function digest(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function membersDigest(members: readonly string[]): string {
  return digest(`${members.join("\n")}\n`);
}

async function canAccess(path: string, mode: number): Promise<boolean> {
  try {
    await access(path, mode);
    return true;
  } catch {
    return false;
  }
}

function sameFileState(
  before: {
    readonly dev: number;
    readonly ino: number;
    readonly size: number;
    readonly mtimeMs: number;
    readonly mode: number;
  },
  after: {
    readonly dev: number;
    readonly ino: number;
    readonly size: number;
    readonly mtimeMs: number;
    readonly mode: number;
  },
): boolean {
  return (
    before.dev === after.dev &&
    before.ino === after.ino &&
    before.size === after.size &&
    before.mtimeMs === after.mtimeMs &&
    before.mode === after.mode
  );
}

function lexicalNames(names: readonly string[]): readonly string[] {
  return Object.freeze(
    [...names].sort((left, right) =>
      Buffer.compare(Buffer.from(left), Buffer.from(right)),
    ),
  );
}

export async function observeActivationPath(
  path: string,
  relativePath: string,
  ignoredMembers: ReadonlySet<string> = new Set(),
): Promise<ActivationPathObservation> {
  try {
    const stats = await lstat(path);
    if (stats.isSymbolicLink())
      return Object.freeze({ path: relativePath, kind: "symlink" });
    if (stats.isDirectory()) {
      const readable = await canAccess(path, constants.R_OK);
      const searchable = await canAccess(path, constants.X_OK);
      if (
        relativePath !== activationSkillDirectory &&
        relativePath !== legacyActivationSkillDirectory
      )
        return Object.freeze({
          path: relativePath,
          kind: "directory",
          readable,
          searchable,
          identity: initFilesystemIdentity(stats),
        });
      if (!readable || !searchable)
        return Object.freeze({
          path: relativePath,
          kind: "directory",
          readable,
          searchable,
          identity: initFilesystemIdentity(stats),
        });
      const members = lexicalNames(
        (await readdir(path)).filter((member) => !ignoredMembers.has(member)),
      );
      const after = await lstat(path);
      if (!after.isDirectory() || !sameFileState(stats, after))
        return Object.freeze({ path: relativePath, kind: "unconfirmable" });
      return Object.freeze({
        path: relativePath,
        kind: "directory",
        readable,
        searchable,
        identity: initFilesystemIdentity(after),
        members,
        digest: membersDigest(members),
      });
    }
    if (!stats.isFile())
      return Object.freeze({ path: relativePath, kind: "other" });

    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const before = await handle.stat();
      if (!before.isFile())
        return Object.freeze({ path: relativePath, kind: "other" });
      const bytes = new Uint8Array(await handle.readFile());
      const after = await handle.stat();
      if (!sameFileState(before, after))
        return Object.freeze({ path: relativePath, kind: "unconfirmable" });
      return Object.freeze({
        path: relativePath,
        kind: "file",
        readable: true,
        digest: digest(bytes),
        identity: initFilesystemIdentity(after),
        mode: after.mode & 0o777,
        bytes,
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

function ignoredByDirectory(
  ignoredPaths: readonly string[],
): ReadonlyMap<string, ReadonlySet<string>> {
  const entries = new Map<string, Set<string>>();
  for (const path of ignoredPaths) {
    const parent = dirname(path) === "." ? "" : dirname(path);
    const names = entries.get(parent) ?? new Set<string>();
    names.add(basename(path));
    entries.set(parent, names);
  }
  return entries;
}

export async function captureActivationObservations(
  root: string,
  ignoredPaths: readonly string[] = Object.freeze([]),
): Promise<readonly ActivationPathObservation[]> {
  const scope = getActivationObservationScope();
  const paths: ActivationPathObservation[] = [];
  const unavailablePrefixes: string[] = [];
  const ignored = ignoredByDirectory(ignoredPaths);
  for (const path of scope.directories) {
    if (
      unavailablePrefixes.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      )
    ) {
      paths.push({ path, kind: "missing" });
      continue;
    }
    const entry = await observeActivationPath(
      resolve(root, path),
      path,
      ignored.get(path),
    );
    paths.push(entry);
    if (entry.kind === "missing") unavailablePrefixes.push(path);
    else if (
      entry.kind !== "directory" ||
      entry.readable !== true ||
      entry.searchable !== true
    )
      unavailablePrefixes.push(path);
  }
  for (const path of scope.destinations) {
    paths.push(
      unavailablePrefixes.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      )
        ? { path, kind: "missing" }
        : await observeActivationPath(resolve(root, path), path),
    );
  }
  return Object.freeze(paths);
}

async function observeKind(path: string): Promise<MutationPathKind> {
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

export async function captureActivationStageObservations(
  root: string,
  paths: readonly string[],
): Promise<readonly MutationStageObservation[]> {
  return Object.freeze(
    await Promise.all(
      paths.map(async (path) =>
        Object.freeze({ path, kind: await observeKind(resolve(root, path)) }),
      ),
    ),
  );
}
