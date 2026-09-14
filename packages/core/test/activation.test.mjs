import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { TextDecoder, TextEncoder } from "node:util";

import {
  activationDestinations,
  evaluateActivationAcquisition,
  evaluateActivationMutation,
  evaluateActivationScratchCleanup,
  planActivation,
  posixCksum,
  validateResultEnvelope,
} from "@forgeflow/core";

const encode = (value) => new TextEncoder().encode(value);
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const memberDigest = (members) => digest(encode(`${members.join("\n")}\n`));

function asset(value, mode = 0o644) {
  const bytes = encode(value);
  return { bytes, digest: digest(bytes), mode };
}

function source(overrides = {}) {
  return {
    version: "0.9.0",
    revision: "unknown",
    provenance: "fixture activation snapshot",
    skill: asset("See ../story-development/SKILL.md\n"),
    workflow: asset("# Story development\n"),
    agentBlock: asset("Use the local ForgeFlow skill.\n"),
    ...overrides,
  };
}

function directory(path, members) {
  return {
    path,
    kind: "directory",
    readable: true,
    searchable: true,
    identity: `fixture:${path}`,
    ...(members === undefined
      ? {}
      : { members, digest: memberDigest(members) }),
  };
}

function file(path, value, mode = 0o644) {
  const bytes = typeof value === "string" ? encode(value) : value;
  return {
    path,
    kind: "file",
    readable: true,
    identity: `fixture:${path}`,
    mode,
    bytes,
    digest: digest(bytes),
  };
}

function freshRequest(overrides = {}) {
  const paths = [
    directory("specs"),
    directory("specs/stories"),
    { path: ".agents", kind: "missing" },
    { path: ".agents/skills", kind: "missing" },
    { path: ".agents/skills/forgeflow", kind: "missing" },
    file("AGENTS.md", "custom policy\r\nno final newline", 0o600),
    file("specs/.forgeflow-adoption", "version=0.9.0\nrevision=unknown\n"),
    ...activationDestinations
      .slice(1)
      .map((path) => ({ path, kind: "missing" })),
  ];
  return {
    rootIdentity: "fixture-root:1",
    source: source(),
    paths,
    ...overrides,
  };
}

function trace(plan, overrides = {}) {
  return {
    planId: plan.planId,
    committed: false,
    prepared: [],
    attempted: [],
    applied: [],
    recoveryAttempted: [],
    restored: [],
    unrecovered: [],
    invalidated: [],
    invalidationFailed: [],
    retained: [],
    cleanupResidue: [],
    preconditionMismatches: [],
    ...overrides,
  };
}

test("TST014-AC-005: Core owns sanitized target and packaged-source acquisition outcomes", () => {
  const target = evaluateActivationAcquisition({ kind: "target-unavailable" });
  assert.equal(target.result.outcome, "ACTIVATION_OPERATION_REFUSED");
  assert.equal(target.result.issues[0].code, "ACTIVATION_TARGET_UNAVAILABLE");
  const source = evaluateActivationAcquisition({ kind: "source-unavailable" });
  assert.equal(source.result.outcome, "ACTIVATION_OPERATION_REFUSED");
  assert.equal(source.result.issues[0].code, "ACTIVATION_SNAPSHOT_UNAVAILABLE");
});

test("TST014-AC-001/003: Core creates deterministic marker-last activation bytes and plan", () => {
  const first = planActivation(freshRequest());
  const second = planActivation(freshRequest());

  assert.deepEqual(first, second);
  assert.equal(first.result.outcome, "ACTIVATION_PREVIEW");
  assert.equal(first.result.exit, 0);
  assert.ok(first.plan);
  assert.equal(first.plan.commitMarker, activationDestinations.at(-1));
  assert.deepEqual(
    first.plan.effects.map(({ path }) => path),
    activationDestinations,
  );
  assert.equal(first.plan.effects.at(-1).path, first.plan.commitMarker);
  assert.equal(first.payloads[0].mode, 0o600);
  assert.match(
    new TextDecoder().decode(first.payloads[0].bytes),
    /^<!-- ForgeFlow Codex: begin -->\n<!-- snapshot version=0\.9\.0 revision=unknown adoption=0\.9\.0 -->\n/,
  );
  assert.equal(
    new TextDecoder().decode(first.payloads[1].bytes),
    "See story-development.md\n",
  );
  assert.deepEqual(validateResultEnvelope(first.result), {
    ok: true,
    value: first.result,
  });
});

test("TST014-AC-002/004: installed bytes validate, remain unchanged, and drift fails closed", () => {
  const preview = planActivation(freshRequest());
  const members = [".forgeflow-snapshot", "SKILL.md", "story-development.md"];
  const installedPaths = freshRequest().paths.map((entry) => {
    if (entry.path === ".agents") return directory(".agents");
    if (entry.path === ".agents/skills") return directory(".agents/skills");
    if (entry.path === ".agents/skills/forgeflow")
      return directory(".agents/skills/forgeflow", members);
    const payload = preview.payloads.find(({ path }) => path === entry.path);
    return payload === undefined
      ? entry
      : file(entry.path, payload.bytes, payload.mode);
  });
  const unchanged = planActivation({
    ...freshRequest(),
    paths: installedPaths,
  });
  assert.equal(unchanged.result.outcome, "ACTIVATION_UNCHANGED");

  const drifted = installedPaths.map((entry) =>
    entry.path === ".agents/skills/forgeflow/SKILL.md"
      ? file(entry.path, "local edit\n")
      : entry,
  );
  const conflict = planActivation({ ...freshRequest(), paths: drifted });
  assert.equal(conflict.result.outcome, "ACTIVATION_CONFLICT");
  assert.equal(conflict.result.exit, 1);

  const editedBlock = installedPaths.map((entry) =>
    entry.path === "AGENTS.md"
      ? file(
          entry.path,
          new TextDecoder()
            .decode(entry.bytes)
            .replace(
              "Use the local ForgeFlow skill.",
              "Locally edited ForgeFlow block.",
            ),
          entry.mode,
        )
      : entry,
  );
  assert.equal(
    planActivation({ ...freshRequest(), paths: editedBlock }).result.outcome,
    "ACTIVATION_CONFLICT",
  );

  const invalidSource = planActivation({
    ...freshRequest(),
    source: source({ version: "0.9.x" }),
  });
  assert.equal(invalidSource.result.outcome, "ACTIVATION_OPERATION_REFUSED");
  assert.equal(
    invalidSource.result.issues[0].code,
    "ACTIVATION_SNAPSHOT_INVALID",
  );
});

test("TST014-AC-002: a later source updates only owned destinations and preserves adoption and surrounding AGENTS bytes", () => {
  const installed = planActivation(freshRequest());
  const members = [".forgeflow-snapshot", "SKILL.md", "story-development.md"];
  const installedPaths = freshRequest().paths.map((entry) => {
    if (entry.path === ".agents") return directory(".agents");
    if (entry.path === ".agents/skills") return directory(".agents/skills");
    if (entry.path === ".agents/skills/forgeflow")
      return directory(".agents/skills/forgeflow", members);
    const payload = installed.payloads.find(({ path }) => path === entry.path);
    return payload === undefined
      ? entry
      : file(entry.path, payload.bytes, payload.mode);
  });
  const updated = planActivation({
    ...freshRequest(),
    source: source({
      version: "0.9.1",
      revision: "0123456789abcdef0123456789abcdef01234567",
      skill: asset("Updated. See ../story-development/SKILL.md\n"),
      workflow: asset("# Updated Story development\n"),
      agentBlock: asset("Use the updated local ForgeFlow skill.\n"),
    }),
    paths: installedPaths,
  });

  assert.equal(updated.result.outcome, "ACTIVATION_PREVIEW");
  assert.deepEqual(
    updated.changes.map(({ path }) => path),
    activationDestinations,
  );
  assert.equal(updated.plan.adoption, "0.9.0");
  const agents = new TextDecoder().decode(updated.payloads[0].bytes);
  assert.match(
    agents,
    /snapshot version=0\.9\.1 revision=0123456789abcdef0123456789abcdef01234567 adoption=0\.9\.0/,
  );
  assert.ok(agents.endsWith("custom policy\r\nno final newline"));
  const snapshot = new TextDecoder().decode(updated.payloads.at(-1).bytes);
  assert.match(snapshot, /^format=1\nversion=0\.9\.1\n/);
  assert.match(snapshot, /\nadoption=0\.9\.0\n/);
  assert.match(snapshot, /\nskill=\d+ \d+\nworkflow=\d+ \d+\nblock=\d+ \d+\n$/);
});

test("TST014-AC-003/006: one observation contract maps activation mutation outcomes", () => {
  const plan = planActivation(freshRequest()).plan;
  assert.ok(plan);
  const paths = plan.effects.map(({ path }) => path);
  const stage = plan.stagePreconditions[0].path;
  const cases = [
    [
      "ACTIVATION_APPLIED",
      trace(plan, {
        committed: true,
        prepared: paths,
        attempted: paths,
        applied: paths,
      }),
    ],
    [
      "ACTIVATION_OPERATION_REFUSED",
      trace(plan, {
        preconditionMismatches: ["AGENTS.md"],
        failure: {
          stage: "precondition",
          code: "ACTIVATION_STALE_PLAN",
          path: "AGENTS.md",
        },
      }),
    ],
    [
      "ACTIVATION_APPLY_FAILED_RECOVERED",
      trace(plan, {
        prepared: paths,
        attempted: [paths[0]],
        applied: [paths[0]],
        recoveryAttempted: [paths[0]],
        restored: [paths[0]],
        failure: {
          stage: "apply",
          code: "ACTIVATION_REPLACEMENT_FAILED",
          path: paths[0],
        },
      }),
    ],
    [
      "ACTIVATION_CLEANUP_INCOMPLETE",
      trace(plan, {
        prepared: paths,
        attempted: [paths[0]],
        applied: [paths[0]],
        recoveryAttempted: [paths[0]],
        restored: [paths[0]],
        cleanupResidue: [stage],
        failure: {
          stage: "apply",
          code: "ACTIVATION_REPLACEMENT_FAILED",
          path: paths[0],
        },
      }),
    ],
    [
      "ACTIVATION_CLEANUP_INCOMPLETE",
      trace(plan, {
        committed: true,
        prepared: paths,
        attempted: paths,
        applied: paths,
        cleanupResidue: [stage],
        failure: {
          stage: "cleanup",
          code: "ACTIVATION_CLEANUP_FAILED",
          path: stage,
        },
      }),
    ],
    [
      "ACTIVATION_CLEANUP_INCOMPLETE",
      trace(plan, {
        cleanupResidue: [".agents/skills"],
        failure: {
          stage: "prepare",
          code: "ACTIVATION_CLEANUP_FAILED",
          path: ".agents/skills",
        },
      }),
    ],
  ];
  for (const [outcome, observation] of cases) {
    const evaluation = evaluateActivationMutation(plan, observation);
    assert.equal(evaluation.result.outcome, outcome);
    assert.equal(validateResultEnvelope(evaluation.result).ok, true);
  }
});

test("TST014-AC-007: preview and unchanged scratch cleanup faults are Core outcomes", () => {
  const preview = planActivation(freshRequest());
  const failed = evaluateActivationScratchCleanup(preview, {
    cleaned: false,
    retained: ["scratch/activation-1"],
  });
  assert.equal(failed.result.outcome, "ACTIVATION_CLEANUP_INCOMPLETE");
  assert.equal(failed.result.exit, 1);
  assert.deepEqual(failed.result.data.cleanupResidue, ["scratch/activation-1"]);

  const committedPlan = planActivation(freshRequest()).plan;
  const committedPaths = committedPlan.effects.map(({ path }) => path);
  const stage = committedPlan.stagePreconditions[0].path;
  const committedStageCleanup = evaluateActivationMutation(
    committedPlan,
    trace(committedPlan, {
      committed: true,
      prepared: committedPaths,
      attempted: committedPaths,
      applied: committedPaths,
      cleanupResidue: [stage],
      failure: {
        stage: "cleanup",
        code: "ACTIVATION_CLEANUP_FAILED",
        path: stage,
      },
    }),
  );
  const committedWithScratch = evaluateActivationScratchCleanup(
    committedStageCleanup,
    {
      cleaned: false,
      retained: ["scratch/activation-committed"],
    },
  );
  assert.equal(
    committedWithScratch.result.outcome,
    "ACTIVATION_CLEANUP_INCOMPLETE",
  );
  assert.equal(committedWithScratch.result.exit, 1);
  assert.deepEqual(
    committedWithScratch.result.issues.slice(
      0,
      committedStageCleanup.result.issues.length,
    ),
    committedStageCleanup.result.issues,
  );
  assert.deepEqual(
    committedWithScratch.result.issues.map(({ path }) => path),
    [stage, "scratch/activation-committed"],
  );
  assert.deepEqual(committedWithScratch.result.data.cleanupResidue, [
    stage,
    "scratch/activation-committed",
  ]);
  assert.equal(validateResultEnvelope(committedWithScratch.result).ok, true);

  const plan = planActivation(freshRequest()).plan;
  const paths = plan.effects.map(({ path }) => path);
  const recovery = evaluateActivationMutation(
    plan,
    trace(plan, {
      prepared: paths,
      attempted: [paths[0]],
      applied: [paths[0]],
      recoveryAttempted: [paths[0]],
      unrecovered: [paths[0]],
      invalidated: [plan.commitMarker],
      retained: plan.stagePreconditions.map(({ path }) => path),
      failure: {
        stage: "recovery",
        code: "ACTIVATION_RESTORE_FAILED",
        path: paths[0],
      },
    }),
  );
  const recoveryWithScratch = evaluateActivationScratchCleanup(recovery, {
    cleaned: false,
    retained: ["scratch/activation-2"],
  });
  assert.equal(
    recoveryWithScratch.result.outcome,
    "ACTIVATION_RECOVERY_INCOMPLETE",
  );
  assert.deepEqual(recoveryWithScratch.result.data.cleanupResidue, [
    "scratch/activation-2",
  ]);
});

test("TST014-AC-001: POSIX checksum compatibility covers empty and binary-safe bytes", () => {
  assert.equal(posixCksum(new Uint8Array()), "4294967295 0");
  assert.equal(posixCksum(encode("abc")), "1219131554 3");
  assert.equal(posixCksum(encode("hello\n")), "3015617425 6");
});
