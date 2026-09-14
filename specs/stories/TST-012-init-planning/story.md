# Story: TST-012 Deterministic Init Planning and Dry Run

## Goal

Let an adopter safely inspect the exact offline ForgeFlow initialization plan
without writing to the target repository.

## Context

GitHub issue #37 introduces the first TypeScript `forgeflow init` slice after
the static Repository Doctor. The retained `scripts/bootstrap` remains the
compatibility oracle. This slice packages an exact Protocol snapshot, observes
an existing target without following unsafe managed paths, and returns a
deterministic plan only. Applying a plan, staging, recovery, prompts, and
network acquisition are deferred to TST-013.

## Classification

- Security sensitive: no
- Baseline conformance: no
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
- Boundary: `Core Init planner`
- Boundary: `CLI Init observation and packaged-snapshot adapter`
- Contract: `Core derives deterministic init preview, conflict, and refusal results from immutable repository and packaged-snapshot observations without filesystem, process, environment, clock, or network access`
- Contract: `CLI resolves one physical existing target, acquires no-follow managed-path observations and bundled snapshot provenance, invokes the Core planner, and renders the result without writing to the target`
- Contract: `the published CLI package contains every template, guidance file, version, and provenance value that its init preview requires; runtime planning never depends on a source-checkout path`
- Owner: `Core Init planner = ForgeFlow TypeScript Core`
- Owner: `CLI Init observation and packaged-snapshot adapter = ForgeFlow TypeScript CLI`

## Risk

- Level: high
- Reason: `public-contract`

## Scope

### In Scope

- Add pure Core planning for fresh safe, force, and upgrade init previews.
- Package the exact current Protocol templates, guidance, version, and source
  provenance with the CLI.
- Add read-only `forgeflow init --dry-run` human and JSON modes.
- Detect target, marker, markerless adoption, managed parent and leaf path
  types, conflicts, and unsafe paths before planning.
- Cover fresh, conflict, force, upgrade, markerless, unsafe-path, version, and
  packaged-provenance fixtures.

### Out of Scope

- Target writes, staging, recovery, apply mode, prompts, network fetches,
  automatic upgrades, package publication, commits, pushes, and deployment.
- Changing retained shell bootstrap behavior or its acceptance suite.

## Inputs

- `forgeflow init --dry-run [--force | --upgrade] [--json] [repository-directory]`.
- An existing target directory and immutable no-follow observations of the
  documented managed surfaces.
- The packaged Protocol snapshot and its provenance.

## Outputs

- A deterministic `INIT_PREVIEW`, `INIT_CONFLICT`, `INIT_OPERATION_REFUSED`,
  or typed `ERROR` result.
- Human output or one canonical JSON result envelope whose `data.changes`
  names the ordered exact intended destination operations.

## Rules

- R1: Core planning is deterministic from immutable input and never performs
  I/O or mutates its input.
- R2: Dry-run does not create, write, remove, stage, execute, or otherwise
  alter anything beneath the target.
- R3: Fresh safe mode refuses an existing managed destination; force replaces
  only the exact fresh-install managed surface; upgrade requires adoption and
  affects only Story templates and the adoption marker.
- R4: Force and upgrade are mutually exclusive and unsafe parent or leaf
  paths are refused in every mode.
- R5: The CLI derives snapshot content and provenance exclusively from packaged
  artifacts, never from this source checkout or the network.

## Expected Errors

- Invalid, repeated, or incompatible options and a missing/non-directory target
  return a typed usage/configuration error with exit `2`.
- An existing safe managed destination returns `INIT_CONFLICT` with exit `1`.
- An unsafe managed parent, leaf, or packaged source returns
  `INIT_OPERATION_REFUSED` with exit `1`.
- An upgrade target without the required adoption structure returns
  `INIT_CONFLICT` with exit `1`.

## Dependencies

- TST-003 differential-parity harness.
- TST-009 static Repository Doctor.
- The retained `scripts/bootstrap` and `tests/bootstrap.sh` compatibility
  oracle.

## Constraints

- This is an Additive optional TypeScript Reference Tooling capability; the
  Protocol/templates and retained shell bootstrap behavior remain unchanged.
- Production implementation uses existing Node and workspace dependencies only.
- Core owns planning; CLI owns no-follow observation, packaged content, CLI
  parsing, and rendering.
- Do not commit, push, deploy, publish, or run a migration.

## Guidance

Relevant:

- principle: small coherent changes
- principle: explicit dependencies
- principle: behavior-oriented testing
- principle: deep module interface

Not applicable:

- no persistent-data, payment, authentication, or remote-integration guidance
  applies to this no-write planning slice
