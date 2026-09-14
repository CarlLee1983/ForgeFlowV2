# Story: TST-013 Init Apply and Recovery

## Goal

Let an adopter safely apply a planned offline ForgeFlow initialization, force
replacement, or template upgrade with deterministic stale-plan refusal and
actionable recovery evidence when filesystem mutation fails.

## Context

GitHub issue #38 follows TST-012's deterministic `forgeflow init --dry-run`
planner and packaged snapshot. The retained `scripts/bootstrap` remains the
behavioral compatibility oracle. This slice crosses the explicit CLI effect
boundary: it applies the existing Core plan through sibling staging and
best-effort cross-file recovery, then asks Core to evaluate immutable execution
observations. The documented CLI contract already names the success and four
distinct exit-1 mutation outcomes.

## Classification

- Security sensitive: yes
- Baseline conformance: yes
- Task mode: execution

## Authority

- plan: yes
- modify: yes
- add_dependency: no
- migration: no
- commit: no
- push: no
- deploy: no

## Architecture

- Impact: high
- Boundary: `Core Init mutation planner and execution evaluator`
- Boundary: `CLI Init filesystem mutation adapter`
- Contract: `Core creates a content-addressed plan with ordered repository-relative preconditions and effects, and deterministically maps immutable execution observations to the documented Init result without filesystem, process, environment, clock, or network access`
- Contract: `CLI re-observes every plan precondition before the first target mutation, prepares private sibling staging for every effect, applies the adoption marker last, reverse-recovers every attempted effect after detected failure, and reports facts rather than assigning pass or fail`
- Contract: `human and JSON rendering consume one Core result whose mutation evidence names attempted, applied, restored, unrecovered, retained, and cleanup-residue paths without exposing arbitrary filesystem diagnostics`
- Owner: `Core Init mutation planner and execution evaluator = ForgeFlow TypeScript Core`
- Owner: `CLI Init filesystem mutation adapter = ForgeFlow TypeScript CLI`

## Risk

- Level: high
- Reason: `security`
- Reason: `data-loss`
- Reason: `public-contract`
- Reason: `destructive-operation`
- Signal: `error-projection`
- Signal: `concurrency`

## Error Projection

- Source failure: `target precondition, staging, replacement, recovery, marker invalidation, or cleanup operation failure`
- Public projection: `INIT_OPERATION_REFUSED, INIT_APPLY_FAILED_RECOVERED, INIT_RECOVERY_INCOMPLETE, INIT_CLEANUP_INCOMPLETE, or sanitized ERROR with stable issues and documented exit`
- Detail policy: `JSON contains repository-relative managed paths and retained sibling-stage paths only; raw operating-system messages, absolute target paths, environment values, and payload bytes are not emitted`
- Evidence AC: `AC-006`

## Concurrency

- Contended resource: `managed target directory and leaf path type, content, existence, and staging namespace between planning and application`
- Linearization point: `successful resolved-root identity check followed by full equality recapture of every plan precondition before the first staging or target mutation`
- Conflict outcome: `INIT_OPERATION_REFUSED with INIT_STALE_PLAN, exit 1, and an unchanged target mutation manifest`
- Evidence AC: `AC-003`

## Scope

### In Scope

- Enable `forgeflow init [repository]`, `--force`, and `--upgrade` apply modes
  using the exact plan and packaged payload snapshot introduced by TST-012.
- Make the Core plan content-addressed and carry the exact path preconditions
  needed for an apply-time stale-plan check.
- Add an injectable CLI mutation adapter that stages each replacement beside
  its destination, commits the marker last, reverse-recovers detected failure,
  invalidates an untrustworthy marker, and reports cleanup or recovery residue.
- Add pure Core evaluation of immutable mutation execution observations and
  produce the documented Init outcomes and machine-readable mutation evidence.
- Cover successful parity, fault injection, stale plans, unsafe paths, recovery,
  cleanup residue, packed-package execution, and retained-bootstrap behavior.

### Out of Scope

- Changing the managed manifest, automatic merge or upgrade, prompts, network
  acquisition, crash atomicity, durable journaling, Codex activation, package
  publication, compatibility-entrypoint switching, or legacy removal.
- Changing `scripts/bootstrap`, its existing acceptance expectations, Protocol,
  templates, the adoption marker format, or repository-owned upgrade surfaces.

## Inputs

- `forgeflow init [--force | --upgrade] [--dry-run] [--json] [repository-directory]`.
- One content-addressed Core mutation plan derived from immutable packaged
  snapshot and target observations.
- Packaged payload bytes and generated marker bytes matching the plan digests.
- Immutable adapter observations for precondition recapture, staging, apply,
  recovery, marker invalidation, retained evidence, and cleanup.

## Outputs

- `INIT_APPLIED`, `INIT_PREVIEW`, `INIT_CONFLICT`,
  `INIT_OPERATION_REFUSED`, `INIT_APPLY_FAILED_RECOVERED`,
  `INIT_RECOVERY_INCOMPLETE`, `INIT_CLEANUP_INCOMPLETE`, or typed `ERROR` with
  its documented exit.
- Human output or one canonical JSON result envelope containing ordered exact
  planned changes and mutation evidence appropriate to the outcome.
- On incomplete recovery, every unrecovered destination and retained recovery
  directory required for manual restoration.

## Rules

- R1: Core remains pure. It owns stable planning identity, precondition and
  effect ordering, outcome precedence, stable issues, and execution evidence;
  the mutation adapter performs effects and reports observations only.
- R2: Apply revalidates every path precondition before creating directories or
  stages. A stale plan, unsafe link, wrong type, or existing private stage is
  refused with zero target mutation.
- R3: Every payload and original is prepared before the first destination
  rename, every stage is private and beside its destination, and the adoption
  marker is applied last.
- R4: A detected replacement failure attempts recovery in reverse attempted
  order, continues after a failed restore, restores prior bytes or absence, and
  attempts to remove a marker that cannot be trusted.
- R5: Preparation failure leaves the target's managed contents and existence
  unchanged. Complete recovery, incomplete recovery, and committed cleanup
  residue remain distinct exit-1 results; no failure renders success.
- R6: Fresh and force write exactly the eight packaged payloads plus marker;
  upgrade writes exactly the three Story templates plus marker and neither
  reads nor writes repository-owned `AGENTS.md` or `guidance/`.
- R7: Successful artifact bytes, ownership surface, mode semantics, marker
  bytes, mutation order, recovery result, and exit category match the retained
  bootstrap oracle; human wording is presentation-only.
- R8: Recovery is best effort, not a crash-atomic transaction. SIGKILL, power
  loss, unavailable filesystems, and hostile changes after precondition
  recapture remain documented operational risks.

## Expected Errors

- Invalid arguments and a missing or non-directory target return typed `ERROR`
  and exit `2` without mutation.
- Conflict, unavailable upgrade, invalid packaged source, unsafe managed path,
  staging collision, or stale plan returns the applicable conflict or refusal
  result and exit `1` without target mutation.
- A preparation failure or a replacement failure whose originals are fully
  restored returns `INIT_APPLY_FAILED_RECOVERED` and exit `1` with no retained
  recovery directory.
- A failed restore returns `INIT_RECOVERY_INCOMPLETE` and exit `1`, names every
  unrecovered destination and retained recovery directory, and does not stop
  recovery of later siblings.
- A fully applied plan with incomplete stage cleanup returns
  `INIT_CLEANUP_INCOMPLETE` and exit `1`, retains and names exact residue, and
  never claims clean success.
- An unexpected failure outside a handled mutation observation returns a
  sanitized `ERROR` and exit `3` without raw operating-system diagnostics.

## Dependencies

- TST-012 deterministic Init planning, packaged snapshot, CLI parsing, and
  dry-run result.
- ADR-007 Core/CLI ownership and ADR-009 behavioral parity boundaries.
- The retained `scripts/bootstrap`, `tests/bootstrap.sh`, and documented Init
  result/recovery contracts as compatibility oracles.
- Existing Node.js and workspace dependencies only.

## Constraints

- Do not add a dependency, edit Protocol/templates, change retained shell
  behavior, or broaden the managed ownership surface.
- Keep filesystem acquisition/effects and signal handling in CLI; keep stable
  mutation planning and final semantic evaluation in Core.
- Tests use disposable target directories and injected adapters; no test may
  apply init to this ForgeFlow checkout.
- Do not commit, push, deploy, publish, or run a migration.

## Guidance

Relevant:

- principle: small coherent changes
- principle: explicit dependencies
- principle: behavior-oriented testing
- principle: deep module interface
- decision: `ADR-007`
- decision: `ADR-009`

Not applicable:

- no payment, authentication, remote-integration, database, or schema-migration
  guidance applies

## Trust Boundary Fields

- `init.repository-directory` — caller-selected target directory
- `init.current-directory` — implicit target when the argument is omitted
- `init.mode` — caller-selected safe, force, or upgrade authority
- `snapshot.protocolVersion` — packaged version input to planning
- `snapshot.provenance` — packaged provenance projected in results
- `snapshot.payloads[*].bytes` — packaged bytes written to managed destinations
- `snapshot.payloads[*].digest` — packaged payload identity used by the plan
- `filesystem.managed-directory-kind` — externally derived no-follow directory type
- `filesystem.root-identity` — externally derived resolved target device/inode identity bound into the plan
- `filesystem.managed-directory-readable` — externally derived access observation
- `filesystem.managed-directory-searchable` — externally derived traversal observation
- `filesystem.managed-path-kind` — externally derived no-follow leaf type
- `filesystem.managed-path-digest` — externally derived existing-file identity
- `filesystem.stage-path-kind` — externally derived sibling staging namespace state
- `mutation.plan-id` — derived content identity of preconditions and effects
- `mutation.execution-observations` — adapter-reported attempted, applied, restored, unrecovered, retained, and cleanup facts
- `mutation.adapter-error` — operating-system failure observed by the adapter

## Superseded Behavior

- `packages/cli/test/root-and-bin.test.mjs:TST012-AC-009` — non-dry-run Init no longer returns INIT_APPLY_UNAVAILABLE because TST-013 enables the documented effect boundary
- `packages/cli/src/init.ts:initHelp` — Init help no longer says apply mode is unavailable
- `packages/cli/src/bin.ts:help` — root help no longer describes Init as preview-only or says Init apply is unavailable
