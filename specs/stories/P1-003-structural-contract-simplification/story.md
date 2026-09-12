# Story: P1-003 Structural Contract Simplification

## Goal

Define ForgeFlow adoption by its small required capability surface and durable
structural invariants, rather than by the complete inventory installed by
bootstrap.

## Classification

* Security sensitive: no
* Baseline conformance: yes
* Task mode: execution

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
* Boundary: `Repository adoption contract`
* Contract: `ForgeFlow conformance names entrypoints and invariants, never the bootstrap file inventory`
* Contract: `Bootstrap manages only its installation manifest; repository-owned optional capabilities remain independently owned`
* Owner: `Repository adoption contract = ForgeFlow protocol`

## Risk

* Level: high
* Reason: `public-contract`

## Scope

### In Scope

* Define `AGENTS.md`, `Makefile` exposing `make verify`, and
  `specs/stories/` as the only required adoption surface.
* Define a ready Story structurally as a directory below `specs/stories/`
  containing `story.md` and `acceptance.md`; retain `task.md` and additional
  Story-owned artifacts as optional.
* Make Guidance an optional capability with `guidance/ENTRY.md` as its
  structural entrypoint, while keeping the four-file layout as bootstrap's
  opinionated starter layout.
* Keep bootstrap's source-to-destination manifest internal to installation and
  make upgrades manage only their owned template and marker artifacts.
* Make Doctor report detected optional capabilities without treating their
  absence as incomplete core adoption.
* Update protocol, Doctor, bootstrap, upgrade, README, and acceptance tests;
  classify the adopter-facing change.

### Out of Scope

* Risk-driven readiness, mutable lifecycle work, ForgePilot integration, a
  plugin system, a generic manifest DSL, a repository schema language, or
  automatic adopter migration.

## Rules

* R1: The core required surface is exactly `AGENTS.md`, `Makefile`, and
  `specs/stories/`; optional features never expand it implicitly.
* R2: Bootstrap's installation manifest is not the repository conformance
  contract.
* R3: A detected Guidance capability requires its readable, non-blank
  `guidance/ENTRY.md`; the starter's remaining Guidance documents are not a
  protocol inventory requirement.
* R4: Handoff, Skills, CI, and repository-specific extensions are optional;
  their absence cannot produce `STRUCTURE_INCOMPLETE`.
* R5: This is Breaking because Doctor's public `Guidance:` capability status
  values change. Existing repository adoptions keep working and need no file
  migration, but consumers that parse those Doctor values must update.

## Expected Errors

* A missing, unreadable, malformed, or symlinked core entrypoint remains an
  incomplete or operational Doctor result according to the established safety
  boundary.
* A present Guidance capability with a missing or blank `ENTRY.md` is reported
  as capability contract drift, not missing core structure; an unsafe,
  unreadable, or symlinked capability path remains an operational `ERROR`.

## Constraints

* Production shell remains portable POSIX `sh` under `set -eu`; Doctor static
  mode stays builtin-only and read-only.
* Preserve Doctor command forms, result/exit semantics for core failures, and
  bootstrap safety/recovery guarantees.
* Do not add dependencies, run migrations, push, or deploy. A local commit
  requires explicit human follow-up authorization.

## Superseded Behavior

* `protocol/repository-contract.md`, `docs/doctor.md`, and
  `scripts/doctor` no longer describe the four bootstrap Guidance documents as
  adoption inventory.
* `README.md`, `docs/getting-started.md`, `docs/upgrading.md`, and
  `scripts/bootstrap` no longer infer protocol-required files from the
  installer's internal managed-file list.
