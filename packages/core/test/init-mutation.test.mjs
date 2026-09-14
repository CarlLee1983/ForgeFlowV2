import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  createAdoptionMarker,
  evaluateInitMutation,
  planMutation,
  validateResultEnvelope,
} from "@forgeflow/core";

const directories = [
  "specs",
  "specs/stories",
  "specs/stories/_template",
  "guidance",
];
const payloadPaths = [
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

function snapshot() {
  return {
    protocolVersion: "0.9.0",
    provenance: "fixture bundle",
    revision: "unknown",
    snapshotDigest: "b".repeat(64),
    payloads: payloadPaths.map((path) => ({
      path,
      digest: createHash("sha256").update(path).digest("hex"),
    })),
  };
}

function freshRequest() {
  return {
    mode: "safe",
    rootIdentity: "fixture-root:1",
    snapshot: snapshot(),
    paths: [
      ...directories.map((path) => ({ path, kind: "missing" })),
      ...[...payloadPaths, marker].map((path) => ({ path, kind: "missing" })),
    ],
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

test("TST013-AC-002: identical inputs produce one content-addressed plan with a real marker digest", () => {
  const first = planMutation(freshRequest());
  const second = planMutation(freshRequest());

  assert.deepEqual(first, second);
  assert.ok(first.plan);
  assert.match(first.plan.planId, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    first.plan.preconditions.map(({ path, kind }) => [path, kind]),
    [
      ...directories.map((path) => [path, "missing"]),
      ...[...payloadPaths, marker].map((path) => [path, "missing"]),
    ],
  );
  assert.equal(first.plan.effects.at(-1).path, marker);
  assert.equal(first.plan.commitMarker, marker);
  assert.equal(
    first.plan.effects.at(-1).digest,
    createHash("sha256").update(createAdoptionMarker(snapshot())).digest("hex"),
  );
  assert.equal(
    new Set(first.plan.stagePreconditions.map(({ path }) => path)).size,
    9,
  );
});

test("TST013-AC-002/006: Core deterministically maps every documented execution outcome", () => {
  const plan = planMutation(freshRequest()).plan;
  assert.ok(plan);
  const paths = plan.effects.map(({ path }) => path);
  const stage = plan.stagePreconditions[0].path;
  const cases = [
    [
      "INIT_APPLIED",
      trace(plan, {
        committed: true,
        prepared: paths,
        attempted: paths,
        applied: paths,
      }),
    ],
    [
      "INIT_OPERATION_REFUSED",
      trace(plan, {
        preconditionMismatches: ["AGENTS.md"],
        failure: {
          stage: "precondition",
          code: "INIT_STALE_PLAN",
          path: "AGENTS.md",
        },
      }),
    ],
    [
      "INIT_APPLY_FAILED_RECOVERED",
      trace(plan, {
        prepared: paths,
        attempted: ["AGENTS.md"],
        recoveryAttempted: ["AGENTS.md"],
        restored: ["AGENTS.md"],
        failure: {
          stage: "apply",
          code: "INIT_REPLACEMENT_FAILED",
          path: "AGENTS.md",
        },
      }),
    ],
    [
      "INIT_RECOVERY_INCOMPLETE",
      trace(plan, {
        prepared: paths,
        attempted: ["AGENTS.md"],
        recoveryAttempted: ["AGENTS.md"],
        unrecovered: ["AGENTS.md"],
        invalidated: [marker],
        retained: plan.stagePreconditions.map(({ path }) => path),
        failure: {
          stage: "recovery",
          code: "INIT_RESTORE_FAILED",
          path: "AGENTS.md",
        },
      }),
    ],
    [
      "INIT_CLEANUP_INCOMPLETE",
      trace(plan, {
        committed: true,
        prepared: paths,
        attempted: paths,
        applied: paths,
        cleanupResidue: [stage],
        failure: {
          stage: "cleanup",
          code: "INIT_CLEANUP_FAILED",
          path: stage,
        },
      }),
    ],
  ];

  for (const [outcome, observation] of cases) {
    const first = evaluateInitMutation(plan, observation);
    const second = evaluateInitMutation(plan, observation);
    assert.deepEqual(first, second);
    assert.equal(first.result.outcome, outcome);
    assert.equal(first.result.exit, outcome === "INIT_APPLIED" ? 0 : 1);
    assert.deepEqual(validateResultEnvelope(first.result), {
      ok: true,
      value: first.result,
    });
  }
});

test("TST013-AC-002: inconsistent adapter observations fail closed as internal errors", () => {
  const plan = planMutation(freshRequest()).plan;
  assert.ok(plan);
  const evaluation = evaluateInitMutation(
    plan,
    trace(plan, { planId: "0".repeat(64) }),
  );

  assert.equal(evaluation.result.outcome, "ERROR");
  assert.equal(evaluation.result.exit, 3);
  assert.equal(
    evaluation.result.error.code,
    "INIT_EXECUTION_OBSERVATION_INVALID",
  );
});

test("TST013-AC-002/006: contradictory committed and failure traces fail closed", () => {
  const plan = planMutation(freshRequest()).plan;
  assert.ok(plan);
  const paths = plan.effects.map(({ path }) => path);
  for (const observation of [
    trace(plan, {
      committed: true,
      prepared: paths,
      attempted: paths,
      applied: paths,
      failure: {
        stage: "apply",
        code: "INIT_REPLACEMENT_FAILED",
        path: paths.at(-1),
      },
    }),
    trace(plan, {
      committed: true,
      prepared: paths.slice(0, -1),
      attempted: paths,
      applied: paths,
    }),
    trace(plan, {
      attempted: [paths[0]],
      applied: [paths[0]],
      failure: {
        stage: "precondition",
        code: "INIT_STALE_PLAN",
        path: paths[0],
      },
    }),
    trace(plan, {
      attempted: [paths[0]],
      applied: [paths[0]],
      preconditionMismatches: [paths[0]],
    }),
    trace(plan, {
      failure: {
        stage: "apply",
        code: "INIT_REPLACEMENT_FAILED",
        path: paths[0],
      },
    }),
    trace(plan, {
      prepared: [paths[0]],
      attempted: [paths[0]],
      recoveryAttempted: [paths[0]],
      restored: [paths[0]],
      failure: {
        stage: "apply",
        code: "INIT_REPLACEMENT_FAILED",
        path: paths[0],
      },
    }),
    trace(plan, {
      prepared: paths,
      attempted: [paths[0]],
      recoveryAttempted: [paths[0]],
      restored: [paths[0]],
      retained: [plan.stagePreconditions[0].path],
      failure: {
        stage: "apply",
        code: "INIT_REPLACEMENT_FAILED",
        path: paths[0],
      },
    }),
    trace(plan, {
      prepared: paths,
      attempted: [paths[0]],
      recoveryAttempted: [paths[0]],
      restored: [paths[0]],
      unrecovered: [paths[0]],
      invalidated: [marker],
      retained: plan.stagePreconditions.map(({ path }) => path),
      failure: {
        stage: "recovery",
        code: "INIT_RESTORE_FAILED",
        path: paths[0],
      },
    }),
    trace(plan, {
      prepared: paths,
      attempted: [paths[0]],
      recoveryAttempted: [paths[0]],
      unrecovered: [paths[0]],
      retained: plan.stagePreconditions.map(({ path }) => path),
      failure: {
        stage: "recovery",
        code: "INIT_RESTORE_FAILED",
        path: paths[0],
      },
    }),
    trace(plan, {
      prepared: paths,
      attempted: [paths[0]],
      recoveryAttempted: [paths[0]],
      unrecovered: [paths[0]],
      invalidated: [paths[0]],
      retained: plan.stagePreconditions.map(({ path }) => path),
      failure: {
        stage: "recovery",
        code: "INIT_RESTORE_FAILED",
        path: paths[0],
      },
    }),
    trace(plan, {
      attempted: [paths[0]],
      applied: [paths[0]],
      failure: {
        stage: "prepare",
        code: "INIT_PREPARATION_FAILED",
        path: paths[0],
      },
    }),
  ]) {
    const evaluation = evaluateInitMutation(plan, observation);
    assert.equal(evaluation.result.outcome, "ERROR");
    assert.equal(evaluation.result.exit, 3);
  }
});

test("TST013-AC-006: stale recapture with cleanup residue is recovery-incomplete, not a refusal", () => {
  const plan = planMutation(freshRequest()).plan;
  assert.ok(plan);
  const stage = plan.stagePreconditions[0].path;
  const evaluation = evaluateInitMutation(
    plan,
    trace(plan, {
      prepared: [plan.effects[0].path],
      preconditionMismatches: [plan.effects[0].path],
      cleanupResidue: [stage],
      failure: {
        stage: "precondition",
        code: "INIT_STALE_PLAN",
        path: plan.effects[0].path,
      },
    }),
  );

  assert.equal(evaluation.result.outcome, "INIT_RECOVERY_INCOMPLETE");
  assert.deepEqual(evaluation.result.data.cleanupResidue, [stage]);
});

test("TST013-AC-003: malformed snapshot revisions are refused before planning", () => {
  const request = freshRequest();
  const evaluation = planMutation({
    ...request,
    snapshot: { ...request.snapshot, revision: "unknown\ntrusted=true" },
  });

  assert.equal(evaluation.result.outcome, "INIT_OPERATION_REFUSED");
  assert.equal(evaluation.result.issues[0].code, "INIT_SNAPSHOT_INVALID");
});
