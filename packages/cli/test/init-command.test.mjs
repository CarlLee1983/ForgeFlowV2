import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath, URL } from "node:url";
import test from "node:test";

import { validateResultEnvelope } from "@forgeflow/core";

const bin = fileURLToPath(new URL("../dist/bin.js", import.meta.url));
const bootstrap = fileURLToPath(
  new URL("../../../scripts/bootstrap", import.meta.url),
);

function run(args, cwd) {
  return spawnSync(globalThis.process.execPath, [bin, "init", ...args], {
    cwd,
    encoding: "utf8",
  });
}

async function manifest(root) {
  const entries = [];
  async function visit(directory) {
    const names = await readdir(directory);
    for (const name of names.sort()) {
      const path = join(directory, name);
      const stats = await lstat(path);
      const entry = relative(root, path);
      if (stats.isDirectory()) {
        entries.push([entry, "directory"]);
        await visit(path);
      } else if (stats.isSymbolicLink()) entries.push([entry, "symlink"]);
      else entries.push([entry, "file", await readFile(path, "utf8")]);
    }
  }
  await visit(root);
  return entries;
}

async function temporaryTarget(name) {
  return mkdtemp(join(tmpdir(), `forgeflow-init-${name}-`));
}

test("TST012-AC-001/006: fresh packed CLI preview is deterministic and writes nothing", async () => {
  const root = await temporaryTarget("fresh");
  try {
    const before = await manifest(root);
    const first = run(["--dry-run", "--json", root]);
    const second = run(["--json", "--dry-run", root]);
    const after = await manifest(root);

    assert.equal(first.status, 0);
    assert.equal(first.stderr, "");
    assert.equal(first.stdout, second.stdout);
    assert.deepEqual(after, before);
    const result = JSON.parse(first.stdout);
    assert.deepEqual(validateResultEnvelope(result), {
      ok: true,
      value: result,
    });
    assert.equal(result.outcome, "INIT_PREVIEW");
    assert.equal(
      result.data.provenance,
      "@forgeflow/cli bundled Protocol snapshot",
    );
    const plannedPaths = [
      "AGENTS.md",
      "specs/stories/_template/story.md",
      "specs/stories/_template/acceptance.md",
      "specs/stories/_template/task.md",
      "guidance/ENTRY.md",
      "guidance/PRINCIPLES.md",
      "guidance/DECISIONS.md",
      "guidance/PRACTICES.md",
      "specs/.forgeflow-adoption",
    ];
    assert.deepEqual(
      result.data.changes.map((change) => change.path),
      plannedPaths,
    );
    const retained = spawnSync(bootstrap, ["--dry-run", root], {
      encoding: "utf8",
    });
    assert.equal(retained.status, 0, retained.stderr);
    const physicalRoot = await realpath(root);
    assert.deepEqual(
      retained.stdout
        .split("\n")
        .filter((line) => line.startsWith("Would install "))
        .map((line) =>
          relative(physicalRoot, line.slice("Would install ".length)),
        ),
      plannedPaths,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST012-AC-002/003/005/007: force and markerless upgrade preserve exact ownership", async () => {
  const root = await temporaryTarget("ownership");
  try {
    await writeFile(join(root, "AGENTS.md"), "adopter guide\n");
    const conflict = run(["--dry-run", "--json", root]);
    const force = run(["--dry-run", "--force", "--json", root]);
    assert.equal(JSON.parse(conflict.stdout).outcome, "INIT_CONFLICT");
    assert.equal(JSON.parse(force.stdout).outcome, "INIT_PREVIEW");
    assert.equal(JSON.parse(force.stdout).data.changes[0].kind, "replace");

    await mkdir(join(root, "specs", "stories", "_template"), {
      recursive: true,
    });
    const upgrade = run(["--upgrade", "--dry-run", "--json", root]);
    const result = JSON.parse(upgrade.stdout);
    assert.equal(upgrade.status, 0);
    assert.deepEqual(
      result.data.changes.map((change) => change.path),
      [
        "specs/stories/_template/story.md",
        "specs/stories/_template/acceptance.md",
        "specs/stories/_template/task.md",
        "specs/.forgeflow-adoption",
      ],
    );
    assert.equal(
      await readFile(join(root, "AGENTS.md"), "utf8"),
      "adopter guide\n",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST012-AC-008/009: unsafe paths and invalid arguments fail without target writes", async () => {
  const root = await temporaryTarget("refusal");
  const outside = join(root, "outside");
  try {
    await writeFile(outside, "outside\n");
    await symlink(outside, join(root, "AGENTS.md"));
    const before = await manifest(root);
    const unsafe = run(["--force", "--dry-run", "--json", root]);
    const invalid = run(["--force", "--upgrade", "--dry-run", "--json", root]);

    assert.equal(unsafe.status, 1);
    assert.equal(JSON.parse(unsafe.stdout).outcome, "INIT_OPERATION_REFUSED");
    assert.equal(invalid.status, 2);
    assert.equal(JSON.parse(invalid.stdout).error.code, "INIT_USAGE");
    assert.deepEqual(await manifest(root), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TST012-AC-006: npm package content includes the complete bundled snapshot", () => {
  const packed = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
  });
  assert.equal(packed.status, 0, packed.stderr);
  const files = JSON.parse(packed.stdout)[0].files.map((entry) => entry.path);
  for (const path of [
    "dist/snapshot/provenance.json",
    "dist/snapshot/VERSION",
    "dist/snapshot/AGENTS.md",
    "dist/snapshot/templates/story/story.md",
    "dist/snapshot/templates/story/acceptance.md",
    "dist/snapshot/templates/story/task.md",
    "dist/snapshot/guidance/ENTRY.md",
    "dist/snapshot/guidance/PRINCIPLES.md",
    "dist/snapshot/guidance/DECISIONS.md",
    "dist/snapshot/guidance/PRACTICES.md",
  ])
    assert.ok(files.includes(path), `missing packed snapshot asset: ${path}`);
});
