# Story: FF-222 Acceptance Evidence

## Goal

Prevent an agent from treating a Story as ready when an Acceptance Criterion
lacks a concrete plan to produce distinguishable evidence.

## Context

FF-218 verifies that a Story has concrete AC text, but does not require a
fixture with the condition that proves the AC. A query can therefore compile
correctly while no representative data demonstrates its intended outcome.

## Classification

* Security sensitive: no
* Baseline conformance: yes

## Scope

### In Scope

* Require an Acceptance Evidence row for every AC only in `story-check --ready`.
* Statically validate the AC mapping, method, exact evidence, fixture or
  precondition, and expected observation.
* Update templates, agent guidance, migration documentation, tests, and the
  pre-1.0 breaking protocol version.

### Out of Scope

* Execute evidence, parse arbitrary test sources, infer sufficiency, replace
  Human Review, change default `story-check`, change Doctor, or add a Make target.

## Inputs

* A Story's `acceptance.md` checkbox ACs and `## Acceptance Evidence` table.
* Existing `scripts/story-check --ready` and bootstrap upgrade behavior.

## Outputs

* Readiness passes only when each AC has one exact evidence declaration.
* Templates and migration guidance explain how adopters provide the map.

## Rules

* R1: The map has exactly one row for every checkbox AC and no unknown or
  duplicate IDs.
* R2: `Method` is exactly `test`, `command`, or `human`; evidence, fixture or
  precondition, and observation are exact non-placeholder backticked values.
* R3: `--ready` remains static, read-only, POSIX-shell portable, and independent
  of external utilities. Fenced examples do not count.
* R4: A `human` method may cover an external invariant, but names its
  precondition and review observation. It does not turn an unsupported fact into
  an automated PASS.
* R5: The change is Breaking for `0.4.0`; default checks, Doctor, bootstrap
  command forms, and `make verify` semantics remain unchanged.

## Expected Errors

* Missing or malformed tables, unspecified cells, invalid methods, and missing,
  duplicate, or unknown AC IDs return `STORY_READINESS_INCOMPLETE`.
* Missing Story files and invalid command forms retain operational exit `2`.

## Dependencies

* FF-217 fence and table parsing rules.
* FF-218 optional readiness contract.
* FF-210 bootstrap template upgrades.

## Constraints

* Use shell builtins only in `scripts/story-check`; no new dependencies.
* Do not commit, tag, publish, or perform remote writes.

## Superseded Behavior

* `scripts/story-check --ready` accepts concrete, unique AC IDs without a
  declared evidence method, fixture or precondition, and expected observation.
