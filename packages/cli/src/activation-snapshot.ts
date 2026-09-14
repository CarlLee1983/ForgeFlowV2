import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { open } from "node:fs/promises";

import type {
  ActivationSourceAsset,
  ActivationSourceSnapshot,
} from "@forgeflow/core";

interface SnapshotManifestEntry {
  readonly source: unknown;
  readonly destination: unknown;
  readonly sha256: unknown;
}

interface SnapshotProvenance {
  readonly protocolVersion: unknown;
  readonly provenance: unknown;
  readonly revision: unknown;
  readonly payloads: unknown;
}

async function readBundledAsset(path: URL): Promise<ActivationSourceAsset> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stats = await handle.stat();
    if (!stats.isFile())
      throw new Error("A bundled activation asset is not a regular file.");
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

function isProvenance(value: unknown): value is SnapshotProvenance {
  return (
    typeof value === "object" &&
    value !== null &&
    "protocolVersion" in value &&
    "provenance" in value &&
    "revision" in value &&
    "payloads" in value
  );
}

function isManifestEntry(value: unknown): value is SnapshotManifestEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "source" in value &&
    "destination" in value &&
    "sha256" in value
  );
}

/** Reads only activation assets bundled beside the compiled CLI. */
export async function loadPackagedActivationSource(): Promise<ActivationSourceSnapshot> {
  const root = new URL("./snapshot/", import.meta.url);
  const provenanceHandle = await open(
    new URL("provenance.json", root),
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(await provenanceHandle.readFile("utf8"));
  } finally {
    await provenanceHandle.close();
  }
  if (
    !isProvenance(parsed) ||
    typeof parsed.protocolVersion !== "string" ||
    typeof parsed.provenance !== "string" ||
    typeof parsed.revision !== "string" ||
    !Array.isArray(parsed.payloads) ||
    !parsed.payloads.every(isManifestEntry)
  )
    throw new Error("The bundled activation provenance is invalid.");
  const manifestEntries = parsed.payloads as readonly SnapshotManifestEntry[];

  const specifications = [
    ["skills/forgeflow/SKILL.md", "skill"],
    ["skills/story-development/SKILL.md", "workflow"],
    ["skills/forgeflow/agents-block.md", "agentBlock"],
  ] as const;
  const assets = await Promise.all(
    specifications.map(async ([path, name]) => {
      const asset = await readBundledAsset(new URL(path, root));
      const manifest = manifestEntries.find(
        (entry) => entry.destination === path,
      );
      if (
        manifest === undefined ||
        manifest.source !== path ||
        manifest.sha256 !== asset.digest
      )
        throw new Error(
          "A bundled activation asset does not match its provenance.",
        );
      return [name, asset] as const;
    }),
  );
  const byName = Object.fromEntries(assets) as Record<
    (typeof specifications)[number][1],
    ActivationSourceAsset
  >;
  return Object.freeze({
    version: parsed.protocolVersion,
    revision: parsed.revision,
    provenance: parsed.provenance,
    skill: byName.skill,
    workflow: byName.workflow,
    agentBlock: byName.agentBlock,
  });
}
