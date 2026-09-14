import assert from "node:assert/strict";
import test from "node:test";

import { planMutation, validateResultEnvelope } from "@forgeflow/core";

const directories = [
  "specs",
  "specs/stories",
  "specs/stories/_template",
  "guidance",
];
const payloads = [
  "AGENTS.md",
  "specs/stories/_template/story.md",
  "specs/stories/_template/acceptance.md",
  "specs/stories/_template/task.md",
  "guidance/ENTRY.md",
  "guidance/PRINCIPLES.md",
  "guidance/DECISIONS.md",
  "guidance/PRACTICES.md",
];
const marker = "specs/.forgeflow-adoption";

function snapshot(overrides = {}) {
  return {
    protocolVersion: "0.9.0",
    provenance: "fixture bundled snapshot",
    payloads: payloads.map((path) => ({ path, digest: "a".repeat(64) })),
    ...overrides,
  };
}

function request(mode = "safe", overrides = {}) {
  const entries = new Map([
    ...directories.map((path) => [path, { path, kind: "missing" }]),
    ...[...payloads, marker].map((path) => [path, { path, kind: "missing" }]),
  ]);
  for (const [path, entry] of Object.entries(overrides))
    entries.set(path, entry);
  return { mode, snapshot: snapshot(), paths: [...entries.values()] };
}

test("TST012-AC-001/004: Core produces the ordered fresh preview from immutable observations", () => {
  const first = planMutation(request());
  const second = planMutation(request());

  assert.deepEqual(first, second);
  assert.equal(first.result.outcome, "INIT_PREVIEW");
  assert.equal(first.result.exit, 0);
  assert.deepEqual(
    first.changes.map((change) => [change.kind, change.path]),
    [
      ["install", "AGENTS.md"],
      ["install", "specs/stories/_template/story.md"],
      ["install", "specs/stories/_template/acceptance.md"],
      ["install", "specs/stories/_template/task.md"],
      ["install", "guidance/ENTRY.md"],
      ["install", "guidance/PRINCIPLES.md"],
      ["install", "guidance/DECISIONS.md"],
      ["install", "guidance/PRACTICES.md"],
      ["install", marker],
    ],
  );
  assert.deepEqual(validateResultEnvelope(first.result), {
    ok: true,
    value: first.result,
  });
});

test("TST012-AC-002/005: force replaces exactly the fresh ownership surface", () => {
  const entries = Object.fromEntries([
    ...directories.map((path) => [
      path,
      { path, kind: "directory", readable: true, searchable: true },
    ]),
    ...[...payloads, marker].map((path) => [
      path,
      { path, kind: "file", readable: true },
    ]),
  ]);
  const evaluation = planMutation(request("force", entries));

  assert.equal(evaluation.result.outcome, "INIT_PREVIEW");
  assert.deepEqual(
    evaluation.changes.map((change) => change.kind),
    Array(9).fill("replace"),
  );
});

test("TST012-AC-003/004: markerless adoption upgrades only templates and marker", () => {
  const entries = Object.fromEntries(
    ["specs", "specs/stories", "specs/stories/_template"].map((path) => [
      path,
      { path, kind: "directory", readable: true, searchable: true },
    ]),
  );
  const evaluation = planMutation(request("upgrade", entries));

  assert.equal(evaluation.result.outcome, "INIT_PREVIEW");
  assert.deepEqual(
    evaluation.changes.map((change) => change.path),
    [
      "specs/stories/_template/story.md",
      "specs/stories/_template/acceptance.md",
      "specs/stories/_template/task.md",
      marker,
    ],
  );
});

test("TST012-AC-007/008: conflicts and unsafe paths fail closed", () => {
  const conflict = planMutation(
    request("safe", {
      "AGENTS.md": { path: "AGENTS.md", kind: "file", readable: true },
    }),
  );
  const unsafe = planMutation(
    request("force", {
      "AGENTS.md": { path: "AGENTS.md", kind: "symlink" },
    }),
  );
  const unavailable = planMutation(request("upgrade"));

  assert.equal(conflict.result.outcome, "INIT_CONFLICT");
  assert.equal(conflict.result.exit, 1);
  assert.equal(unsafe.result.outcome, "INIT_OPERATION_REFUSED");
  assert.equal(unsafe.result.exit, 1);
  assert.equal(unavailable.result.outcome, "INIT_CONFLICT");
  assert.equal(unavailable.result.exit, 1);
});

test("TST012-AC-004: unsupported packaged snapshot provenance is refused", () => {
  const evaluation = planMutation({
    ...request(),
    snapshot: snapshot({ protocolVersion: "0.9.1" }),
  });

  assert.equal(evaluation.result.outcome, "INIT_OPERATION_REFUSED");
  assert.equal(evaluation.result.issues[0]?.code, "INIT_SNAPSHOT_INVALID");
});
