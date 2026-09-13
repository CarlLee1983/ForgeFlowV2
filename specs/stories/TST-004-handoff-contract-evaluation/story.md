# Story: TST-004 Handoff Contract Evaluation

## Goal

Deliver `forgeflow handoff check` through pure Core evaluation, a read-only CLI
filesystem adapter, human and JSON rendering, canonical exit mapping, and
differential parity with the retained portable shell checker.

## Context

GitHub issue #29 follows the completed local TST-003 differential parity
harness. ForgeFlow has a portable `scripts/handoff-check` and a public machine
result contract, but the TypeScript Core and CLI do not yet evaluate or expose a
domain command.

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
- Boundary: `Core Handoff evaluator`
- Boundary: `CLI Handoff filesystem adapter and renderers`
- Boundary: `Handoff differential parity corpus`
- Contract: `Core evaluates source text deterministically and returns canonical machine results plus immutable parsed evidence without filesystem, process, clock, Git, or lifecycle access`
- Contract: `the CLI acquires at most one regular non-symlink Handoff file, performs no target write or child-process execution, and maps every command result to documented human or JSON output and exit status`
- Contract: `the retained shell checker and TypeScript command consume one test corpus and agree on semantic result, ordered issues, evidence, and exit status`
- Owner: `Core Handoff evaluator = ForgeFlow TypeScript Core`
- Owner: `CLI Handoff filesystem adapter and renderers = ForgeFlow TypeScript CLI`
- Owner: `Handoff differential parity corpus = ForgeFlow TypeScript tooling tests`

## Risk

- Level: high
- Reason: `public-contract`

## Scope

### In Scope

- Add the public pure Core Handoff evaluator and its typed evaluation result.
- Add `forgeflow handoff check [--json] [handoff-file]`, defaulting to
  `specs/handoff.md`.
- Add filesystem acquisition, human rendering, machine serialization, and exit
  mapping for complete, incomplete, usage-error, and acquisition-error results.
- Add shared Story-ID and Handoff lexical parity corpora and packed-CLI
  black-box coverage.
- Retain the shell checker and its acceptance tests unchanged.

### Out of Scope

- A general YAML parser, current lifecycle model, signature, clock-truth check,
  Git revision proof, command execution, Doctor migration, or shell-checker
  modification or retirement.
- A target-repository write, child process, new runtime dependency, Protocol or
  template change, publication, commit, push, deploy, or migration.

## Inputs

- Handoff Markdown source text presented to Core.
- An optional Handoff file path and optional `--json` mode presented to the CLI.

## Outputs

- A canonical Core result envelope and, on success, immutable parsed Handoff
  evidence.
- Human contract-check output or exactly one newline-terminated JSON result on
  standard output, plus the result envelope's exit status.

## Rules

- R1: Core recognizes exactly the line-oriented restricted YAML subset and
  field grammars documented by `protocol/handoff.md`; it is location,
  environment, locale, clock, Git, filesystem, and process independent.
- R2: Complete evidence returns `pass/success/0` with no issues and the six
  immutable evidence values. Contract defects return `fail/failure/1` with
  stable ordered issues. Invocation defects return `error/usage-error/2` and
  filesystem acquisition defects return `error/configuration-error/2`.
- R3: JSON mode writes exactly one valid canonical result envelope to standard
  output and no human diagnostic to either stream for complete, incomplete,
  usage-error, and acquisition-error outcomes.
- R4: Human mode preserves the documented Handoff result names and historical-
  evidence boundary without making approval, merge, current-state, or
  completion claims.
- R5: The CLI rejects symlinks, non-regular files, missing, unreadable, and
  empty sources without writing the target or invoking an external process.
- R6: Differential parity uses isolated fixture copies and an allow-listed
  legacy diagnostic normalizer. Every shared Story-ID and Handoff lexical case
  compares semantic result, ordered issues, evidence, and domain exit exactly.
- R7: This is an Additive TypeScript tooling capability. The portable shell
  checker, Doctor, Protocol artifacts, templates, and their current behavior
  remain unchanged.

## Expected Errors

- Missing, repeated, unknown, forbidden, malformed, or unsupported Handoff
  syntax produces a failing result with stable ordered issues and exit `1`.
- Invalid arguments produce a usage-error result and exit `2`.
- A symlink, missing path, non-regular file, unreadable file, or empty file
  produces a configuration-error result and exit `2`.

## Dependencies

- TST-002's canonical result envelope and CLI serializer.
- TST-003's isolated differential parity harness and fail-closed legacy
  diagnostic normalization seam.
- The existing Handoff Evidence Contract and retained shell checker as the
  compatibility baseline.
- Node.js built-ins only for CLI filesystem access and tests.

## Constraints

- Do not add a dependency, edit or delegate from a shell command, migrate
  Doctor, change the Protocol or templates, publish, commit, push, deploy, or
  run a migration.
- Keep filesystem and rendering concerns out of Core and keep the production
  command free of child-process APIs.

## Guidance

Relevant:

- principle: small coherent changes
- principle: explicit dependencies
- principle: behavior-oriented testing
- principle: deep module interface

Not applicable:

- decision: no existing repository decision governs the TypeScript Handoff seam
