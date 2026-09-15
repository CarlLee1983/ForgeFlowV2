# Story: PB-001 PraxisBound Protocol Identity Migration

## Goal

Make PraxisBound the single current Protocol identity while safely upgrading
repositories adopted under the ForgeFlow 0.9.0 identity.

## Context

The maintainer selected PraxisBound before the first npm publication. The old
identity is already persisted in the Protocol version, adoption marker,
templates, Doctor observations, shell and TypeScript checkers, examples, and a
decision-root environment variable. ADR-011 defines a clean canonical break
with narrow one-way migration rather than permanent aliases.

## Classification

* Security sensitive: yes
* Baseline conformance: yes
* Task mode: mixed

## Authority

* plan: yes
* modify: yes
* add_dependency: no
* migration: yes
* commit: yes
* push: yes
* deploy: no

## Architecture

* Impact: high
* Decision: `ADR-011`
* Boundary: `Protocol identity`
* Boundary: `Bootstrap adoption migration`
* Contract: `PraxisBound 0.10.0 is the sole current Protocol identity and fresh adoption writes only the current marker`
* Contract: `legacy adoption is accepted only as explicit one-way upgrade input and ambiguous identity fails before mutation`
* Owner: `Protocol identity = PraxisBound Protocol`
* Owner: `Bootstrap adoption migration = PraxisBound Reference Tooling`

## Risk

* Level: high
* Reason: `versioned-surface`
* Reason: `filesystem-migration`
* Reason: `shell-typescript-parity`

## Scope

### In Scope

* Change the current product and Protocol name to PraxisBound and increment
  Protocol `VERSION` from `0.9.0` to `0.10.0`.
* Change fresh adoption, current validation, templates, Doctor, shell tooling,
  TypeScript Core/CLI semantics, examples, and maintained documentation to
  `specs/.praxisbound-adoption` and `PRAXISBOUND_DECISIONS_ROOT`.
* Add a one-way Bootstrap upgrade from a safe valid legacy marker and document
  adopter migration and rollback.
* Retain completed historical evidence under its observed identity and enforce
  a reviewed residual-identity allowlist.

### Out of Scope

* Codex activation-directory, snapshot, and managed-block migration.
* npm package names, the CLI executable, registry publication, GitHub repository
  rename, or GitHub release creation.
* Permanent aliases, dual-marker current adoption, semantic changes unrelated
  to identity, or rewriting completed Story and verification evidence.

## Inputs

* A fresh target repository, a current PraxisBound adoption, or a valid legacy
  ForgeFlow 0.9.0 adoption.
* Adoption marker bytes, target path types, packaged Protocol snapshot, and
  decision-root environment variables.

## Outputs

* Protocol `0.10.0`, current PraxisBound templates and tooling behavior, and a
  migration guide.
* Transactional upgrade plans and results that end in exactly one current
  adoption marker while preserving the adopted revision.
* Deterministic diagnostics for legacy, mixed, malformed, and unsafe states.

## Rules

* R1: Fresh adoption and current validation use only
  `specs/.praxisbound-adoption`; the old marker is never written.
* R2: Bootstrap `--upgrade` recognizes a legacy marker only when the current
  marker is absent, its path and bytes are safe, and its recorded Protocol is
  the supported legacy `0.9.0` identity.
* R3: Legacy upgrade preserves the recorded source revision, stages owned
  updates, commits the current marker last, removes the old marker, and provides
  the same exact recovery guarantees as current marker upgrade.
* R4: Both markers, unsafe types or symlinks, malformed legacy data, and an
  unsupported legacy version fail before mutation.
* R5: Doctor reports a legacy-only marker as migration-required rather than a
  current adoption; a dual-marker state is a structural defect.
* R6: `PRAXISBOUND_DECISIONS_ROOT` preserves the prior unset, empty, relative,
  absolute, and invalid-path semantics in shell and TypeScript. A non-empty
  `FORGEFLOW_DECISIONS_ROOT` fails closed with an explicit migration diagnostic.
* R7: Completed Stories, verification records, releases, handoffs, and older ADR
  text retain their literal historical identity. Maintained surfaces outside a
  reviewed allowlist contain no live ForgeFlow contract.
* R8: The change is Breaking and ships migration guidance for Protocol
  `0.9.0` to `0.10.0`; no unrelated Protocol behavior changes.

## Expected Errors

* Ambiguous markers, unsafe paths, malformed or unsupported legacy data, and
  conflicting decision-root variables produce a stable refusal before writes.
* An injected apply failure restores the complete pre-upgrade marker/template
  state or returns a named recovery artifact and a non-success result.

## Dependencies

* ADR-011 and Protocol versioning policy.
* Existing Bootstrap recovery behavior from FF-219, TypeScript init planning and
  apply behavior from TST-012/TST-013, and Doctor parity from TST-009.

## Constraints

* Portable scripts remain POSIX `sh`; Doctor static mode continues to work with
  shell builtins only and always emits its documented complete result block.
* No dependency or publication. Commit and push only the exact integrated
  verification candidate after explicit human authorization; neither grants
  GitHub repository rename or npm publication by itself.
* Migration never reads or writes Codex activation artifacts.

## Guidance

Relevant:

* principle: small coherent changes
* principle: root cause over symptom suppression
* principle: behavior-oriented testing
* practice: non-trivial business workflow

Not applicable:

* no concurrency, capacity, or retention contract applies

## Trust Boundary Fields

* `legacy-marker.path` — filesystem entry selected as migration input
* `legacy-marker.version` — externally persisted Protocol identity
* `legacy-marker.revision` — externally persisted source revision
* `current-marker.path` — filesystem destination owned by Bootstrap
* `PRAXISBOUND_DECISIONS_ROOT` — process environment path selector
* `FORGEFLOW_DECISIONS_ROOT` — legacy process environment input
* `upgrade.target-paths` — adopter filesystem paths inspected or mutated
* `upgrade.recovery-artifact` — retained data used after incomplete recovery

## Superseded Behavior

* `VERSION and protocol/versioning.md current 0.9.0 identity` — replaced by the Breaking PraxisBound 0.10.0 Protocol identity.
* `specs/.forgeflow-adoption in protocol, templates, Bootstrap, Doctor, Core, CLI, and tests` — replaced as the current marker and retained only as explicit legacy migration input.
* `FORGEFLOW_DECISIONS_ROOT in shell and TypeScript Story evaluation` — replaced by `PRAXISBOUND_DECISIONS_ROOT`; a non-empty legacy variable now fails closed.
* `live ForgeFlow product wording in maintained Protocol, templates, examples, and docs` — replaced by PraxisBound while immutable historical evidence is preserved.
