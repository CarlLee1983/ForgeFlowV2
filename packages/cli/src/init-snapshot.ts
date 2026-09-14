import { createHash } from "node:crypto";

import type { InitSnapshot } from "@forgeflow/core";

import {
  loadPackagedSnapshotProvenance,
  readPackagedSnapshotAsset,
} from "./packaged-snapshot.js";

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
  const parsed = await loadPackagedSnapshotProvenance(root);
  const contents = await Promise.all(
    payloads.map(async ([source, destination]) => {
      const { bytes, digest, mode } = await readPackagedSnapshotAsset(
        root,
        source,
      );
      const manifestSource =
        source === "AGENTS.md" ? "templates/AGENTS.md" : source;
      const entry = parsed.payloads.find(
        (value) =>
          value.source === manifestSource &&
          value.destination === source &&
          value.sha256 === digest,
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
  const initDestinations: ReadonlySet<string> = new Set(
    payloads.map(([source]) => source),
  );
  const initManifest = parsed.payloads.filter(({ destination }) =>
    initDestinations.has(destination),
  );
  if (initManifest.length !== payloads.length)
    throw new Error("The bundled Protocol snapshot manifest is ambiguous.");
  const initSnapshotDigest = createHash("sha256")
    .update(JSON.stringify(initManifest))
    .digest("hex");
  const snapshot = Object.freeze({
    protocolVersion: parsed.protocolVersion,
    provenance: parsed.provenance,
    revision: parsed.revision,
    snapshotDigest: initSnapshotDigest,
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
