import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open } from "node:fs/promises";

import type { InitSnapshot } from "@forgeflow/core";

const payloads = [
  ["AGENTS.md", "AGENTS.md"],
  ["templates/story/story.md", "specs/stories/_template/story.md"],
  ["templates/story/acceptance.md", "specs/stories/_template/acceptance.md"],
  ["templates/story/task.md", "specs/stories/_template/task.md"],
  ["guidance/ENTRY.md", "guidance/ENTRY.md"],
  ["guidance/PRINCIPLES.md", "guidance/PRINCIPLES.md"],
  ["guidance/PRACTICES.md", "guidance/PRACTICES.md"],
  ["guidance/DECISIONS.md", "guidance/DECISIONS.md"],
] as const;

interface SnapshotProvenance {
  readonly protocolVersion: unknown;
  readonly provenance: unknown;
  readonly revision: unknown;
  readonly snapshotDigest: unknown;
  readonly payloads: unknown;
}

export interface PackagedInitPayload {
  readonly path: string;
  readonly digest: string;
  readonly bytes: Uint8Array;
  readonly mode: number;
}

export interface PackagedInitBundle {
  readonly snapshot: InitSnapshot;
  readonly payloads: readonly PackagedInitPayload[];
}

let validatedBundle: Promise<PackagedInitBundle> | undefined;

function isProvenance(value: unknown): value is SnapshotProvenance {
  return (
    typeof value === "object" &&
    value !== null &&
    "protocolVersion" in value &&
    "provenance" in value &&
    "revision" in value &&
    "snapshotDigest" in value &&
    "payloads" in value
  );
}

async function readBundledFile(path: URL): Promise<Buffer> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!(await handle.stat()).isFile())
      throw new Error(
        "A bundled Protocol snapshot asset is not a regular file.",
      );
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

async function readBundledPayload(
  path: URL,
): Promise<{ readonly bytes: Buffer; readonly mode: number }> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stats = await handle.stat();
    if (!stats.isFile())
      throw new Error(
        "A bundled Protocol snapshot asset is not a regular file.",
      );
    return Object.freeze({
      bytes: await handle.readFile(),
      mode: stats.mode & 0o777,
    });
  } finally {
    await handle.close();
  }
}

async function readBundledText(path: URL): Promise<string> {
  return (await readBundledFile(path)).toString("utf8");
}

function copyBundle(bundle: PackagedInitBundle): PackagedInitBundle {
  return Object.freeze({
    snapshot: bundle.snapshot,
    payloads: Object.freeze(
      bundle.payloads.map((payload) =>
        Object.freeze({ ...payload, bytes: new Uint8Array(payload.bytes) }),
      ),
    ),
  });
}

/** Reads only assets bundled beside the compiled CLI entrypoint. */
async function readPackagedInitBundle(): Promise<PackagedInitBundle> {
  const root = new URL("./snapshot/", import.meta.url);
  const [provenanceText, versionText] = await Promise.all([
    readBundledText(new URL("provenance.json", root)),
    readBundledText(new URL("VERSION", root)),
  ]);
  const parsed: unknown = JSON.parse(provenanceText);
  if (
    !isProvenance(parsed) ||
    typeof parsed.protocolVersion !== "string" ||
    typeof parsed.provenance !== "string" ||
    typeof parsed.revision !== "string" ||
    typeof parsed.snapshotDigest !== "string" ||
    !Array.isArray(parsed.payloads)
  ) {
    throw new Error("The bundled Protocol snapshot provenance is invalid.");
  }
  if (versionText.trim() !== parsed.protocolVersion)
    throw new Error(
      "The bundled Protocol snapshot version does not match provenance.",
    );
  const manifestDigest = createHash("sha256")
    .update(JSON.stringify(parsed.payloads))
    .digest("hex");
  if (manifestDigest !== parsed.snapshotDigest)
    throw new Error(
      "The bundled Protocol snapshot manifest digest is invalid.",
    );
  const contents = await Promise.all(
    payloads.map(async ([source, destination]) => {
      const { bytes, mode } = await readBundledPayload(new URL(source, root));
      const digest = createHash("sha256").update(bytes).digest("hex");
      const entry = (parsed.payloads as readonly unknown[]).find(
        (value: unknown) =>
          typeof value === "object" &&
          value !== null &&
          (value as { source?: unknown }).source ===
            (source === "AGENTS.md" ? "templates/AGENTS.md" : source) &&
          (value as { sha256?: unknown }).sha256 === digest,
      );
      if (entry === undefined)
        throw new Error(
          "A bundled Protocol snapshot payload does not match its manifest.",
        );
      return Object.freeze({
        path: destination,
        digest,
        bytes: new Uint8Array(bytes),
        mode,
      });
    }),
  );
  const snapshot = Object.freeze({
    protocolVersion: parsed.protocolVersion,
    provenance: parsed.provenance,
    revision: parsed.revision,
    snapshotDigest: parsed.snapshotDigest,
    payloads: Object.freeze(
      contents.map(({ path, digest }) => Object.freeze({ path, digest })),
    ),
  });
  return Object.freeze({
    snapshot,
    payloads: Object.freeze(contents),
  });
}

export function loadPackagedInitBundle(): Promise<PackagedInitBundle> {
  if (validatedBundle === undefined) {
    const pending = readPackagedInitBundle();
    validatedBundle = pending;
    void pending.catch(() => {
      if (validatedBundle === pending) validatedBundle = undefined;
    });
  }
  return validatedBundle.then(copyBundle);
}

/** Reads and validates the packaged snapshot without exposing payload bytes. */
export async function loadPackagedInitSnapshot(): Promise<InitSnapshot> {
  return (await loadPackagedInitBundle()).snapshot;
}
