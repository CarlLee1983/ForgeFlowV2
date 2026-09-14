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

async function readBundledText(path: URL): Promise<string> {
  return (await readBundledFile(path)).toString("utf8");
}

/** Reads only assets bundled beside the compiled CLI entrypoint. */
export async function loadPackagedInitSnapshot(): Promise<InitSnapshot> {
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
      const bytes = await readBundledFile(new URL(source, root));
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
      });
    }),
  );
  return Object.freeze({
    protocolVersion: parsed.protocolVersion,
    provenance: parsed.provenance,
    payloads: Object.freeze(contents),
  });
}
