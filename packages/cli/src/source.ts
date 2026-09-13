import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";

/** One guarded read of a required Markdown source file. */
export type SafeSourceRead =
  | { readonly ok: true; readonly source: string }
  | { readonly ok: false; readonly reason: "symlink" | "unavailable" };

export interface PathStats {
  readonly size: number;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

interface OpenedFile {
  stat(): Promise<PathStats>;
  readFile(options: { readonly encoding: "utf8" }): Promise<string>;
  close(): Promise<void>;
}

export interface FileAccess {
  lstat(path: string): Promise<PathStats>;
  open(path: string, flags: number): Promise<OpenedFile>;
}

export const nodeFileAccess: FileAccess = { lstat, open };

/**
 * Reads one regular, non-empty file without following a symlink and without
 * ever writing to the target. The opened handle is revalidated before the
 * read, so a path replaced between acquisition and use is refused.
 */
export async function readSafeSource(
  fileAccess: FileAccess,
  path: string,
): Promise<SafeSourceRead> {
  let pathStats;
  try {
    pathStats = await fileAccess.lstat(path);
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  if (pathStats.isSymbolicLink()) {
    return { ok: false, reason: "symlink" };
  }
  if (!pathStats.isFile()) {
    return { ok: false, reason: "unavailable" };
  }

  let handle;
  try {
    handle = await fileAccess.open(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  try {
    const openedStats = await handle.stat();
    if (!openedStats.isFile() || openedStats.size === 0) {
      return { ok: false, reason: "unavailable" };
    }
    const source = await handle.readFile({ encoding: "utf8" });
    return source.length === 0
      ? { ok: false, reason: "unavailable" }
      : { ok: true, source };
  } catch {
    return { ok: false, reason: "unavailable" };
  } finally {
    await handle.close().catch(() => undefined);
  }
}
