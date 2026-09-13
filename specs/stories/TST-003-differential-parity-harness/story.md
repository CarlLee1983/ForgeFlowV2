# Story: TST-003 Differential Parity Harness

## Goal

Provide a test-only differential harness that runs a legacy implementation and
a TypeScript implementation against isolated copies of the same fixture, then
compares their semantic results and observable effects before a migration can
rely on it.

## Context

GitHub issue #28 follows TST-002's result and Protocol-selection contracts.
The repository has no migrated command yet, so this Story proves the parity
boundary with self-contained fixture runners rather than adding a production
parser or capability.

## Classification

- Security sensitive: no
- Baseline conformance: no
- Task mode: execution

## Authority

- plan: yes
- modify: yes
- add_dependency: no
- migration: no
- commit: yes
- push: no
- deploy: no

## Architecture

- Impact: medium
- Boundary: `test-only differential parity harness`
- Contract: `each implementation receives a private fixture copy and parity compares result, issue, exit, evidence, process, mutation, and artifact observations exactly`
- Contract: `legacy diagnostic normalization is an allow-listed test helper and unknown diagnostics are parity failures`
- Owner: `test-only differential parity harness = ForgeFlow TypeScript tooling tests`

## Scope

### In Scope

- Add a test-only harness and its self-tests.
- Add nine named baseline fixture families for result, issue, exit, evidence,
  process, mutation, artifact, unknown-diagnostic, and source-cleanliness
  observations.
- Prove isolated execution and source-fixture byte cleanliness.

### Out of Scope

- A production parser, a migrated capability, a public package export, or a
  change to any legacy shell command.
- An expected-difference or comparison-waiver mechanism.
- A dependency, publication, push, deploy, or Protocol/template change.

## Rules

- R1: Legacy and TypeScript runners receive different temporary copies of an
  immutable fixture source; neither runner receives the source path.
- R2: Parity fails for every unequal result, issue, exit, evidence, process,
  mutation, or artifact observation.
- R3: Legacy human diagnostic normalization is explicit and allow-listed in
  test support; unknown diagnostics fail closed.
- R4: The fixture source snapshot before and after every run is identical,
  including file bytes, symlink destinations, and directory entries.
- R5: The harness remains test-only and uses Node built-ins; no production
  parser, capability, public export, or waiver is introduced.

## Expected Errors

- A runner returning an unknown legacy diagnostic, an invalid runner outcome,
  or a changed source fixture produces a non-passing harness observation.

## Dependencies

- TST-001 workspace test tooling.
- TST-002's completed TypeScript contract foundation.

## Constraints

- Keep the harness under package test support and use only Node built-ins.
- Do not modify a legacy command or migration capability.

## Guidance

Relevant:

- principle: small coherent changes
- principle: explicit dependencies
- principle: behavior-oriented testing

Not applicable:

- decision: no existing repository decision governs migration-parity fixtures
