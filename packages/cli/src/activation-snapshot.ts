import type {
  ActivationSourceAsset,
  ActivationSourceSnapshot,
} from "@forgeflow/core";

import {
  loadPackagedSnapshotProvenance,
  readPackagedSnapshotAsset,
} from "./packaged-snapshot.js";

/** Reads only activation assets bundled beside the compiled CLI. */
export async function loadPackagedActivationSource(): Promise<ActivationSourceSnapshot> {
  const root = new URL("./snapshot/", import.meta.url);
  const parsed = await loadPackagedSnapshotProvenance(root);

  const specifications = [
    ["skills/forgeflow/SKILL.md", "skill"],
    ["skills/story-development/SKILL.md", "workflow"],
    ["skills/forgeflow/agents-block.md", "agentBlock"],
  ] as const;
  const assets = await Promise.all(
    specifications.map(async ([path, name]) => {
      const asset = await readPackagedSnapshotAsset(root, path);
      const manifest = parsed.payloads.find(
        (entry) => entry.source === path && entry.destination === path,
      );
      if (manifest === undefined || manifest.sha256 !== asset.digest)
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
