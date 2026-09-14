import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath, URL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const snapshotRoot = join(packageRoot, "dist", "snapshot");
const version = readFileSync(join(repositoryRoot, "VERSION"), "utf8").trim();
const payloads = [
  ["templates/AGENTS.md", "AGENTS.md"],
  ["templates/story/story.md", "templates/story/story.md"],
  ["templates/story/acceptance.md", "templates/story/acceptance.md"],
  ["templates/story/task.md", "templates/story/task.md"],
  ["guidance/ENTRY.md", "guidance/ENTRY.md"],
  ["guidance/PRINCIPLES.md", "guidance/PRINCIPLES.md"],
  ["guidance/DECISIONS.md", "guidance/DECISIONS.md"],
  ["guidance/PRACTICES.md", "guidance/PRACTICES.md"],
];

rmSync(snapshotRoot, { recursive: true, force: true });
mkdirSync(snapshotRoot, { recursive: true });
cpSync(join(repositoryRoot, "VERSION"), join(snapshotRoot, "VERSION"));
for (const [source, destination] of payloads) {
  const output = join(snapshotRoot, destination);
  mkdirSync(dirname(output), { recursive: true });
  cpSync(join(repositoryRoot, source), output);
}
const manifestPayloads = payloads.map(([source, destination]) => {
  const bytes = readFileSync(join(snapshotRoot, destination));
  return {
    source,
    destination,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
});
const snapshotDigest = createHash("sha256")
  .update(JSON.stringify(manifestPayloads))
  .digest("hex");
writeFileSync(
  join(snapshotRoot, "provenance.json"),
  `${JSON.stringify({
    protocolVersion: version,
    provenance: "@forgeflow/cli bundled Protocol snapshot",
    revision: "unknown",
    snapshotDigest,
    payloads: manifestPayloads,
  })}\n`,
);
