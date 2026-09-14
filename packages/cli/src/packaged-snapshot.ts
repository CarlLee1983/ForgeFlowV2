import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open } from "node:fs/promises";

export interface PackagedSnapshotManifestEntry {
  readonly source: string;
  readonly destination: string;
  readonly sha256: string;
}

export interface PackagedSnapshotProvenance {
  readonly protocolVersion: string;
  readonly provenance: string;
  readonly revision: string;
  readonly snapshotDigest: string;
  readonly payloads: readonly PackagedSnapshotManifestEntry[];
}

export interface PackagedSnapshotAsset {
  readonly bytes: Uint8Array;
  readonly digest: string;
  readonly mode: number;
}

function isManifestEntry(
  value: unknown,
): value is PackagedSnapshotManifestEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { source?: unknown }).source === "string" &&
    typeof (value as { destination?: unknown }).destination === "string" &&
    typeof (value as { sha256?: unknown }).sha256 === "string"
  );
}

function isProvenance(value: unknown): value is PackagedSnapshotProvenance {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { protocolVersion?: unknown }).protocolVersion ===
      "string" &&
    typeof (value as { provenance?: unknown }).provenance === "string" &&
    typeof (value as { revision?: unknown }).revision === "string" &&
    typeof (value as { snapshotDigest?: unknown }).snapshotDigest ===
      "string" &&
    Array.isArray((value as { payloads?: unknown }).payloads) &&
    (value as { payloads: readonly unknown[] }).payloads.every(isManifestEntry)
  );
}

async function readPackagedFile(path: URL): Promise<Buffer> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!(await handle.stat()).isFile())
      throw new Error(
        "A bundled package snapshot asset is not a regular file.",
      );
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

export async function readPackagedSnapshotAsset(
  root: URL,
  path: string,
): Promise<PackagedSnapshotAsset> {
  const handle = await open(
    new URL(path, root),
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const stats = await handle.stat();
    if (!stats.isFile())
      throw new Error(
        "A bundled package snapshot asset is not a regular file.",
      );
    const bytes = new Uint8Array(await handle.readFile());
    return Object.freeze({
      bytes,
      digest: createHash("sha256").update(bytes).digest("hex"),
      mode: stats.mode & 0o777,
    });
  } finally {
    await handle.close();
  }
}

export async function loadPackagedSnapshotProvenance(
  root: URL,
): Promise<PackagedSnapshotProvenance> {
  const [provenanceBytes, versionBytes] = await Promise.all([
    readPackagedFile(new URL("provenance.json", root)),
    readPackagedFile(new URL("VERSION", root)),
  ]);
  const parsed: unknown = JSON.parse(provenanceBytes.toString("utf8"));
  if (!isProvenance(parsed))
    throw new Error("The bundled package snapshot provenance is invalid.");
  if (versionBytes.toString("utf8").trim() !== parsed.protocolVersion)
    throw new Error(
      "The bundled package snapshot version does not match provenance.",
    );
  const manifestDigest = createHash("sha256")
    .update(JSON.stringify(parsed.payloads))
    .digest("hex");
  if (manifestDigest !== parsed.snapshotDigest)
    throw new Error("The bundled package snapshot manifest digest is invalid.");
  return Object.freeze({
    protocolVersion: parsed.protocolVersion,
    provenance: parsed.provenance,
    revision: parsed.revision,
    snapshotDigest: parsed.snapshotDigest,
    payloads: Object.freeze(
      parsed.payloads.map((entry) => Object.freeze({ ...entry })),
    ),
  });
}
