# Story: TST-005 Verification Plan Resolution

## Goal

Deliver default `forgeflow verification check` plan resolution through a pure
Core resolver over Story declarations, a read-only CLI Story acquisition
adapter, human and JSON rendering, canonical exit mapping, and differential
parity with the retained portable shell checker.

## Context

GitHub issue #30 follows the completed TST-004 Handoff migration. ForgeFlow has
a portable `scripts/verification-check` whose default mode resolves the task
mode, authority, risk level, architecture impact, and required verification
profile a Story declares. The TypeScript Core and CLI do not yet resolve that
plan.

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

- Impact: high
- Boundary: `Core Story declaration reader`
- Boundary: `Core verification plan resolver`
- Boundary: `CLI Story acquisition adapter and renderers`
- Contract: `the shared Story declaration reader stays internal to Core and is never exposed by a package export`
- Contract: `Core resolves declarations deterministically from source text and returns a canonical machine result plus the resolved plan without filesystem, process, clock, Git, or lifecycle access`
- Contract: `the CLI discovers and reads Story files read-only, performs no target write or child-process execution, and maps every aggregate result to documented human or JSON output and exit status`
- Contract: `the retained shell checker and the TypeScript command agree on resolved plan values, ordered issues, result, and exit status for every shared plan corpus case`
- Owner: `Core Story declaration reader = ForgeFlow TypeScript Core`
- Owner: `Core verification plan resolver = ForgeFlow TypeScript Core`
- Owner: `CLI Story acquisition adapter and renderers = ForgeFlow TypeScript CLI`

## Risk

- Level: high
- Reason: `public-contract`

## Scope

### In Scope

- Add an internal shared Markdown declaration reader to Core covering the
  documented fence subset, heading scope, and `* label: value` bullet grammar.
- Add the public pure Core verification plan resolver, its typed plan, and its
  canonical result.
- Add `forgeflow verification check [--json] [story-directory ...]`, defaulting
  to discovery under `specs/stories/`.
- Add Story acquisition, human rendering, machine serialization, and exit
  mapping for resolved, incomplete, usage-error, and acquisition-error results.
- Add a shared plan parity corpus over the retained shell checker and
  packed-CLI black-box coverage.
- Retain the shell checker and its acceptance tests unchanged.

### Out of Scope

- `verification.md` result evaluation, `--result` mode, Story readiness, ADR
  resolution, risk-contract content validation, decision-record lookup, and
  acceptance-criteria reading.
- A target-repository write, child process, new runtime dependency, Protocol or
  template change, publication, push, deploy, or migration.

## Inputs

- Story Markdown source text presented to Core.
- Optional Story directory paths and an optional `--json` mode presented to the
  CLI.

## Outputs

- A resolved plan value plus a canonical Core result envelope.
- Human verification-check output or exactly one newline-terminated JSON result
  on standard output, plus the aggregate result envelope's exit status.

## Rules

- R1: Core recognizes exactly the line-oriented Markdown declaration subset
  documented by `protocol/execution.md` and implemented by the retained
  checker; it is location, environment, locale, clock, Git, filesystem, and
  process independent.
- R2: A Story that declares nothing resolves to task mode `execution`,
  authority `plan` and `modify`, risk `low`, architecture impact `low`, and the
  `lint static unit` profile. An `evidence` or `architecture` task mode never
  resolves `modify`, and no default ever grants dependency, migration, commit,
  push, or deploy authority.
- R3: A resolved plan with no issue returns `pass/success/0`. Any malformed,
  repeated, or unknown declaration returns `fail/failure/1` with stable
  encounter-ordered issues. Invocation defects return `error/usage-error/2` and
  Story acquisition defects return `error/configuration-error/2`.
- R4: JSON mode writes exactly one valid canonical result envelope to standard
  output and no human diagnostic to either stream for every outcome.
- R5: Human mode preserves the documented plan result names and the static
  read-only boundary without making approval, completion, or current-state
  claims.
- R6: The CLI rejects symlinked and non-regular required Story files, missing
  directories, and unreadable or empty sources without writing the target or
  invoking an external process.
- R7: Differential parity uses isolated fixture copies and an allow-listed
  legacy diagnostic normalizer. Every shared corpus case compares resolved plan
  values, ordered issues, result, and domain exit exactly.
- R8: The declaration reader is internal. Public Core exports remain the agreed
  deep interface.
- R9: This is an Additive TypeScript tooling capability. The portable shell
  checker, Doctor, Protocol artifacts, templates, and their current behavior
  remain unchanged.

## Expected Errors

- Malformed, repeated, or unknown task mode, authority, architecture, or risk
  declarations produce a failing result with stable ordered issues and exit `1`.
- Invalid arguments produce a usage-error result and exit `2`.
- A missing Story directory, a symlinked or non-regular required Story file, an
  unreadable or empty required Story file, and a run that checks no Story at
  all produce a configuration-error result and exit `2`.

## Dependencies

- TST-002's canonical result envelope and CLI serializer.
- TST-003's isolated differential parity harness and fail-closed legacy
  diagnostic normalization seam.
- TST-004's CLI acquisition and rendering precedent.
- The retained `scripts/verification-check` default mode as the compatibility
  baseline.
- Node.js built-ins only for CLI filesystem access and tests.

## Constraints

- Do not add a dependency, edit or delegate from a shell command, change the
  Protocol or templates, publish, push, deploy, or run a migration.
- Keep filesystem and rendering concerns out of Core and keep the production
  command free of child-process APIs.

## Guidance

Relevant:

- principle: small coherent changes
- principle: explicit dependencies
- principle: behavior-oriented testing
- principle: deep module interface

Not applicable:

- decision: no existing repository decision governs the TypeScript verification
  plan seam
