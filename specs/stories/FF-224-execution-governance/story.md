# Story: FF-224 Execution governance and evidence-backed completion

## Goal

ForgeFlow can state what an agent is working on, what it is allowed to do, which
architecture must survive the change, how much verification the change deserves,
and what evidence proves the Story is finished — without becoming a coding agent
or a workflow engine.

## Context

ForgeFlow answers "is this implementation verified" through the Story contract
and `make verify`. It does not answer the questions surrounding that gate: the
kind of work, the granted authority, the load-bearing architecture, the risk,
and whether a PASS actually proves the acceptance criteria. A green
`make verify` is currently treated as Story completion even when no evidence
ties a criterion to an observation.

## Classification

Both declarations are required. `yes` makes the matching section below
mandatory.

* Security sensitive: no
* Baseline conformance: yes
* Task mode: execution

## Superseded Behavior

* `tests/portability.sh` FF220-AC-001 asserted the exact canonical `verify`
  dependency list. This Story deliberately appends `verify-execution` to it, so
  the pinned list is replaced rather than the assertion being a defect.
* `tests/portability.sh` FF220-AC-002 covered five production scripts and five
  behavior suites. `scripts/verification-check` and
  `tests/execution-governance.sh` join that coverage.

## Authority

* plan: yes
* modify: yes
* add_dependency: no
* migration: no
* commit: yes
* push: no
* deploy: no

## Architecture

* Impact: medium
* Decision: `ADR-001`
* Boundary: `Story`
* Boundary: `Verification`
* Contract: `story-check and handoff-check keep their command forms, result names, and exit statuses`
* Contract: `make verify remains the only canonical completion gate`
* Owner: `Story = protocol/story.md`
* Owner: `Verification = protocol/verification.md`

## Risk

* Level: medium
* Reason: `versioned-surface`
* Reason: `adopter-migration`

## Scope

### In Scope

* Optional Task mode, Authority, Architecture, and Risk declarations in
  `story.md`, validated by `scripts/story-check`.
* ForgeFlow-native architecture decision records under `specs/decisions/`, with
  reference resolution and status usability checked statically.
* `scripts/verification-check`, which resolves the execution contract and the
  risk-aware verification profile, and judges a recorded result.
* An optional `verification.md` result record per Story, tracing every
  acceptance criterion to an observation and reporting PASS, PARTIAL, or FAIL.
* Execution invariants, documented as a protocol contract.
* Documentation, templates, and one end-to-end example.

### Out of Scope

* A workflow engine, state database, agent runtime, or scheduler.
* Executing, re-running, or inferring any verification command.
* A semantic architecture engine: dependency-direction, forbidden-import,
  layer-boundary, and contract-drift analysis are named as future extensions
  only.
* Vendoring or depending on any external skill collection.
* Changing `make verify` PASS or FAIL semantics for an existing adopter.

## Inputs

* `specs/stories/<id>/story.md` optional governance declarations.
* `specs/stories/<id>/acceptance.md` checkbox acceptance criteria.
* `specs/stories/<id>/verification.md` recorded verification result.
* `specs/decisions/ADR-<digits>-<slug>.md` decision records.

## Outputs

* A resolved execution contract and required verification profile per Story.
* A `VERIFICATION_PASS`, `VERIFICATION_PARTIAL`, or `VERIFICATION_FAIL` verdict
  with per-check and per-criterion detail.
* Reported authority conflicts and retained residual risks.

## Rules

* R1: Every new declaration is optional. A Story that declares none of them
  resolves to the documented defaults and keeps the verdict it had before.
* R2: Authority is least-privilege. `plan`, `modify`, `add_dependency`,
  `migration`, `commit`, `push`, and `deploy` are separate grants, and no grant
  implies the next one along the chain.
* R3: An `evidence` task mode never authorizes repository mutation.
* R4: The verification profile is derived from the declared risk level, with an
  architecture layer added for medium or high architecture impact.
* R5: A required check that is absent, skipped, blocked, or unsupported is not a
  pass, and an acceptance criterion without a passing observation is not proven.
* R6: An incomplete result is `PARTIAL`, never `PASS`, and must retain at least
  one residual risk.
* R7: The checkers are static and read-only. They never execute a verification
  command and never replace `make verify` or Human Review.

## Expected Errors

* An unknown or repeated governance declaration is reported as
  `VERIFICATION_PLAN_INCOMPLETE` and as a Story contract failure.
* A referenced decision that does not exist, resolves to more than one record,
  or is not usable is reported as a Story contract failure.
* A malformed or missing `verification.md` under `--result` is reported as
  `VERIFICATION_RESULT_INCOMPLETE`.
* An invalid invocation, or a missing, unreadable, or symlinked Story file,
  exits `2` as `ERROR`.

## Dependencies

* FF-217 Markdown parsing subset, FF-218 readiness, and FF-222 Acceptance
  Evidence: the new readers reuse the same documented fence and literal rules.
* `ADR-001` records why this model extends the Story contract instead of adding
  a second artifact type.

## Constraints

* Portable POSIX shell under `set -eu`, using shell builtins only, so a verdict
  never depends on the caller's `PATH`.
* No new runtime dependency and no vendored third-party skill.
* `make verify` stays the single canonical gate; the new target composes into
  it rather than redefining PASS.

## Guidance

Relevant:

* principle: small-coherent-change
* decision: `ADR-001`

Not applicable:

* practice: security-fixture-matrix
