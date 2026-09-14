# Story: TST-009 Static Repository Doctor

## Goal

Deliver the static `forgeflow doctor` command so adopters can inspect their
Repository Contract and its composed Story and Handoff observations without
executing target-owned code or changing the inspected repository.

## Context

GitHub issue #34 follows TST-004, TST-007, and TST-008. The retained portable
`scripts/doctor` is the executable compatibility oracle. This slice migrates
only its static inspection behavior; process execution remains TST-010 work.

## Classification

* Security sensitive: no
* Baseline conformance: no
* Task mode: execution

## Authority

* plan: yes
* modify: yes
* add_dependency: no
* migration: no
* commit: no
* push: no
* deploy: no

## Architecture

* Impact: high
* Boundary: `Core Repository Doctor evaluator`
* Boundary: `CLI Repository Doctor filesystem adapter`
* Contract: `Core determines the static Repository Contract outcome from an immutable, repository-relative observation snapshot and composes existing Story and Handoff semantic results without filesystem, process, environment, clock, or Git access`
* Contract: `the CLI acquires only no-follow filesystem observations, never starts a target-owned process in static mode, and maps the Core result to human or one canonical JSON envelope and legacy exit behavior`
* Contract: `the retained shell Doctor and TypeScript command agree on aggregate status, stable diagnostics, exit status, target-process observations, and target mutation manifest for every shared static fixture`
* Owner: `Core Repository Doctor evaluator = ForgeFlow TypeScript Core`
* Owner: `CLI Repository Doctor filesystem adapter = ForgeFlow TypeScript CLI`

## Risk

* Level: high
* Reason: `public-contract`

## Scope

### In Scope

* Add a public pure Core evaluator for required and optional Repository Contract
  capabilities, adoption-marker drift, limited Makefile clues, and composition
  of migrated Story and Handoff observations.
* Add read-only `forgeflow doctor` human and `--json` modes with the retained
  static Doctor aggregate and exit semantics.
* Add deterministic Core, filesystem-adapter, differential-parity, and packed
  CLI coverage for the legacy static Doctor corpus.
* Retain the shell Doctor and its acceptance suites unchanged.

### Out of Scope

* Verification execution, `--run-verify`, repair, bootstrap, mutation,
  dependency installation, remote checks, maturity scoring, architecture
  analysis, shelling out to legacy-checker prose, legacy-Doctor replacement,
  publication, commit, push, deployment, or migration.

## Inputs

* A target repository root plus static no-follow observations for required and
  optional entries, the adoption marker, limited Makefile content, and migrated
  Story and Handoff result inputs.
* Optional `--json` and target-root arguments presented to the CLI.

## Outputs

* An ordered Repository Doctor semantic result containing capability,
  structural-health, drift, Story, and Handoff observations.
* Human output or exactly one newline-terminated versioned JSON result envelope
  with `STRUCTURE_OK`, `CONTRACT_DRIFT`, `STRUCTURE_INCOMPLETE`, or `ERROR` and
  the retained aggregate exit status.

## Rules

* R1: Core evaluation is deterministic from the supplied snapshot and does not
  read the filesystem, start processes, mutate inputs, consult environment,
  clock, Git, lifecycle state, or Human Review.
* R2: Static CLI inspection reads target filesystem facts without following
  untrusted links, performs zero target writes, and starts zero target-owned
  child processes.
* R3: Required Repository Contract capability absence or unsafe/unconfirmable
  acquisition is an error or incomplete outcome exactly where the retained
  Doctor classifies it; optional capability absence is reported as optional.
* R4: Marker and documented Contract drift are advisory: `CONTRACT_DRIFT` exits
  `0`; unsafe or unconfirmable input is `ERROR` and exits `2`.
* R5: The TypeScript result preserves legacy static semantic parity for every
  shared fixture, including diagnostic ordering and observable effects. Human
  wording is presentation, not parity.
* R6: This is an Additive Reference Tooling capability. Protocol and template
  artifacts, the retained shell Doctor, and their default behavior remain
  unchanged.

## Expected Errors

* Invalid CLI arguments, a missing target root, a required missing, unreadable,
  non-directory, or symlinked path, unsafe marker or Makefile acquisition, and
  unconfirmable composed observations produce `ERROR` with exit `2`.
* Missing required Repository Contract capabilities produce the retained
  incomplete result and exit `1`; optional capability absence does not make the
  target incomplete.

## Dependencies

* TST-004 Handoff evaluator and CLI reader.
* TST-007 Story-contract evaluator and CLI reader.
* TST-008 Story-readiness implementation and differential parity harness.
* The retained `scripts/doctor` and `tests/doctor.sh` static behavior as the
  compatibility oracle.
* Node.js built-ins only for production filesystem access and tests.

## Constraints

* Do not add a dependency or edit Protocol, templates, retained shell Doctor,
  or retained Doctor acceptance tests.
* Keep filesystem acquisition and human/JSON rendering out of Core; keep
  repository verdicts out of the CLI adapter.
* Static production behavior must not execute target-owned code, use a process
  adapter, or alter the target manifest.
* Do not commit, push, deploy, publish, or run a migration.

## Guidance

Relevant:

* principle: small coherent changes
* principle: explicit dependencies
* principle: behavior-oriented testing
* principle: deep module interface
* decision: `ADR-008`
* decision: `ADR-009`

Not applicable:

* no mutation, concurrency, or remote-integration guidance applies to this
  static-only slice
