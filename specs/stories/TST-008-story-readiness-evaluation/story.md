# Story: TST-008 Story Readiness Evaluation

## Goal

Deliver opt-in `forgeflow story check --ready` through a pure Core evaluator
that extends the default Story-contract result with minimum Goal and Scope
content, acceptance-criterion identity, Acceptance Evidence, placeholder, and
risk-evidence link evaluation, plus read-only CLI acquisition, rendering, and
behavioral parity with the retained portable shell checker.

## Context

GitHub issue #33 follows the completed local TST-007 migration. The retained
`scripts/story-check --ready` adds readiness checks without changing default
Story-contract behavior. This Story migrates only that opt-in capability.

## Classification

* Security sensitive: no
* Baseline conformance: no
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

* Impact: high
* Boundary: `Core Story readiness evaluator`
* Boundary: `CLI Story readiness adapter`
* Contract: `Core evaluates readiness deterministically from the Story directory identity plus Story and acceptance source text, extending the default Story contract without filesystem, process, clock, Git, or lifecycle access`
* Contract: `the CLI reads Story sources only, preserves default checking when --ready is absent, and renders the selected readiness aggregate with the retained exit semantics`
* Contract: `the retained shell checker and TypeScript command agree on readiness facts, ordered diagnostics, aggregate result, and exit status for every shared corpus case`
* Owner: `Core Story readiness evaluator = ForgeFlow TypeScript Core`
* Owner: `CLI Story readiness adapter = ForgeFlow TypeScript CLI`

## Risk

* Level: high
* Reason: `public-contract`

## Scope

### In Scope

* Add a public pure Core readiness evaluator for Goal and Scope content,
  checkbox acceptance-criterion identity, Acceptance Evidence rows, the
  readiness placeholder subset, and activated risk-contract evidence links.
* Add `forgeflow story check --ready` with human and JSON output, extending
  only the selected check mode.
* Add a shared readiness parity corpus and packed-CLI black-box coverage.
* Retain the shell checker and its readiness suites unchanged.

### Out of Scope

* Requirement-quality or language scoring, test-source parsing, evidence
  execution, automatic Story editing, architecture analysis, default readiness
  enforcement, a target-repository write, child process, dependency, Protocol
  or template change, publication, push, deploy, or migration.

## Inputs

* Story directory names plus Story and acceptance Markdown sources presented to
  Core.
* Optional `--ready`, `--json`, and Story directory arguments presented to the
  CLI.

## Outputs

* Ordered readiness diagnostics and a canonical Core result envelope.
* Human or exactly one newline-terminated JSON result with
  `STORY_READINESS_OK`, `STORY_READINESS_INCOMPLETE`, or `ERROR` and the
  selected aggregate exit status.

## Rules

* R1: Readiness is opt-in. Omitting `--ready` evaluates exactly the default
  Story contract already implemented by TST-007.
* R2: Core reuses the existing declaration and default Story-contract model;
  it stays deterministic and independent of location, environment, locale,
  filesystem, process, clock, and Git.
* R3: Readiness recognizes the retained checker's exact finite placeholder and
  literal subsets. It does not score English, non-English, technical, or
  requirement-quality text.
* R4: A `--ready` run evaluates Goal, Scope, checkbox AC, and Acceptance
  Evidence before the default contract checks; it evaluates activated
  risk-contract readiness with its matching contract. It preserves the
  retained diagnostic order and aggregate precedence.
* R5: The CLI is static and read-only: it never writes a target, executes
  evidence, or starts a child process.
* R6: This is an Additive TypeScript-tooling capability. The retained shell
  checker, Protocol artifacts, templates, default Story command behavior, and
  `make verify-story` remain unchanged.

## Expected Errors

* Missing or placeholder Goal or Scope content, no checkbox AC, duplicate or
  empty AC entries, missing, repeated, malformed, incomplete, duplicate, or
  unlinked Acceptance Evidence, placeholders in activated risk contracts, and
  malformed activated risk-evidence links produce an incomplete readiness
  result and exit `1`.
* Invalid arguments, missing or unsafe required Story sources, a missing Story
  root during discovery, and no checked Story produce `ERROR` and exit `2`.

## Dependencies

* TST-007's Core default Story evaluator, CLI reader, renderers, and parity
  harness.
* The retained `scripts/story-check --ready` as the compatibility baseline.
* Node.js built-ins only for CLI filesystem access and tests.

## Constraints

* Do not add a dependency, edit the retained shell checker, change Protocol or
  templates, publish, push, deploy, run a migration, or execute repository
  code from the production command.
* Keep filesystem and rendering concerns out of Core.
* Preserve default-mode outcomes and command behavior byte-for-byte at the
  semantic boundary.

## Guidance

Relevant:

* principle: small coherent changes
* principle: explicit dependencies
* principle: behavior-oriented testing
* principle: deep module interface

Not applicable:

* decision: no existing repository decision governs the Core readiness seam
