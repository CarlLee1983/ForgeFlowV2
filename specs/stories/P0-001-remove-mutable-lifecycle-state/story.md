# Story: P0-001 Remove Mutable Lifecycle State

## Goal

Make ForgeFlow define what work means and what proves it without persisting
what state the work is currently in.

## Context

ForgeFlow currently makes `specs/handoff.md` an authoritative lifecycle
statement containing the current Story, next Story, completed Stories, status,
working-tree state, and latest verification. That duplicates the mutable state
owned by ForgePilot or another control plane and forces repository documents to
behave like a workflow database.

ForgeFlow still needs shared lifecycle vocabulary and portable evidence. The
seam is ownership: ForgeFlow owns approved engineering contracts and immutable
point-in-time evidence; an external control plane, when present, owns mutable
lifecycle state. ForgeFlow remains independently usable and never requires a
control plane installation.

## Classification

* Security sensitive: no
* Baseline conformance: yes
* Task mode: mixed

## Authority

* plan: yes
* modify: yes
* add_dependency: no
* migration: no
* commit: yes
* push: no
* deploy: no

## Architecture

* Impact: high
* Boundary: `Lifecycle state authority seam`
* Contract: `ForgeFlow owns Story intent, acceptance, architecture, execution, verification contracts, and immutable evidence`
* Contract: `an external control plane, when present, owns mutable lifecycle, Gate, next-action, review, verification-current, and completion state`
* Contract: `ForgeFlow checkers and bootstrap remain usable without ForgePilot or another control plane`
* Owner: `Lifecycle state authority seam = ForgeFlow protocol`

## Risk

* Level: high
* Reason: `public-contract`

## Scope

### In Scope

* Replace the Handoff Contract's mutable workflow snapshot with one immutable,
  point-in-time evidence record.
* Update `scripts/handoff-check` and its tests to validate evidence structure
  and reject lifecycle/current-state fields.
* Preserve lifecycle states and transitions as shared protocol vocabulary while
  removing repository persistence requirements.
* State that Story and acceptance files contain approved intent and contract,
  while mutable fields in optional human notes are not authoritative and must
  not be consumed by ForgeFlow tooling.
* Update repository and distributed guidance, Doctor fixtures, documentation,
  protocol versioning, release notes, and upgrade instructions at the same
  authority seam.

### Out of Scope

* Risk-driven Story readiness or required-file simplification.
* ForgePilot CLI changes, snapshots, or runtime detection.
* A new workflow engine or a required control-plane integration.
* Changing lifecycle state names or transition semantics.

## Inputs

* Approved Story and acceptance contracts.
* A handoff evidence document and its point-in-time repository revision.
* An optional external control plane such as ForgePilot.

## Outputs

* A portable immutable handoff evidence contract and checker.
* One explicit authority seam between ForgeFlow contracts/evidence and mutable
  control-plane state.
* Breaking-change migration guidance for adopters of the prior handoff schema.

## Rules

* R1: ForgeFlow persists Story intent, acceptance, architecture/execution and
  verification contracts, plus immutable evidence; it does not persist current
  workflow state.
* R2: A handoff evidence record identifies one Story, recording time,
  repository, exact revision, verification command, and observed result.
  `recorded_at` uses UTC seconds in `YYYY-MM-DDTHH:MM:SSZ` form, and the result
  is `pass`, `fail`, or `not_run`.
* R3: A handoff record never declares current or next work, current lifecycle
  status, completed work, Gate state, current revision, or latest verification.
* R4: Lifecycle states and transitions remain vocabulary only and require no
  synchronized field in `story.md`, `acceptance.md`, `task.md`, or a handoff.
* R5: When an external control plane is present it is authoritative for mutable
  lifecycle state; its absence does not invalidate or disable ForgeFlow.
* R6: ForgeFlow tooling never reads mutable lifecycle fields from optional human
  notes as authority.

## Expected Errors

* A handoff missing or repeating a required evidence field is incomplete.
* A malformed Story ID, UTC recording timestamp, revision, or verification
  result is incomplete.
* A lifecycle/current-state section or field in the machine-readable evidence
  block is rejected rather than interpreted.
* Invalid invocation, a missing file, symlink, unreadable file, or empty file
  remains an operational error.

## Dependencies

* Existing Story, lifecycle, verification, Handoff, Doctor, bootstrap, and
  contract-check interfaces.
* Existing portable POSIX shell parsing used by `scripts/handoff-check`.

## Constraints

* `scripts/handoff-check` remains static, read-only, portable POSIX `sh`, and
  independent of external utilities.
* Existing command forms, result names, and exit statuses remain unchanged.
* The checker validates timestamp syntax and component ranges, not clock truth;
  it does not prove that a revision exists or that a recorded command ran.
* `story-check`, `make verify`, Doctor, and bootstrap must not require ForgePilot
  or another control plane.
* The implementation does not push, deploy, add dependencies, or run a
  migration. A local commit is authorized by the human's follow-up instruction.

## Guidance

Relevant:

* principle: deep-module authority seam
* principle: one-source-of-truth
* principle: behavior-oriented-testing

Not applicable:

* decision: no new workflow engine

## Superseded Behavior

* `protocol/handoff.md` and `templates/handoff.md` — replace the authoritative
  mutable lifecycle statement with historical point-in-time evidence.
* `scripts/handoff-check` and `tests/handoff-check.sh` — replace validation of
  `workflow`, mutable baseline, and latest verification state with immutable
  evidence validation.
* `tests/protocol.sh` — stop requiring current, next, completed, worktree, and
  latest-command fields in distributed handoff documents.
* `tests/review-integrity.sh` — preserve old review evidence in its owning
  historical Story instead of requiring a mutable current handoff to repeat it.
* `AGENTS.md`, `templates/AGENTS.md`, `skills/forgeflow/SKILL.md`, and
  `skills/story-development/SKILL.md` — stop selecting or advancing work from a
  repository handoff lifecycle block.
* `tests/doctor.sh` and Story-check fixtures — replace prior handoff schema
  fixtures while preserving Doctor composition and Story ID grammar coverage.
