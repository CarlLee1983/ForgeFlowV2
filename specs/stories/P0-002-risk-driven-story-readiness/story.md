# Story: P0-002 Risk-Driven Story Readiness

## Goal

Move declared error-projection, concurrency, bounded-capacity, and
retention-overflow risks into explicit, verifiable Story contracts before
implementation, without adding fields to Stories that do not carry those
risks.

## Context

Risk `Level` and `Reason` select verification depth but do not currently state
the engineering decision a risky implementation must preserve. As a result,
error projection, linearization, saturation behavior, and retention policy can
remain undecided until implementation or review. ForgeFlow needs an opt-in seam:
the Story author declares an applicable standard Signal, that Signal activates
one corresponding contract, and an Acceptance Criterion plus the existing
Acceptance Evidence map proves it.

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

* Impact: medium
* Boundary: `Story readiness contract`
* Contract: `declared risk signals activate only their corresponding Story contract`
* Contract: `Stories without risk signals retain their existing contract and readiness verdicts`
* Owner: `Story readiness contract = ForgeFlow protocol`

## Risk

* Level: high
* Reason: `public-contract`

## Scope

### In Scope

* Add optional, repeatable, unique `Signal` declarations under `## Risk` for
  `error-projection`, `concurrency`, `bounded-capacity`, and
  `retention-overflow`.
* Require only the contract section corresponding to each declared Signal.
* Validate contract structure in the normal Story check and validate concrete
  content, a real `Evidence AC`, and an Acceptance Evidence row in `--ready`.
* Keep `story-check` and `verification-check` consistent when reading Risk.
* Update the Story protocol, template UX, checker documentation, execution
  governance guidance, README, versioning classification, and tests.

### Out of Scope

* Automatic risk inference, language-based risk scoring, or mandatory risk
  classification for every Story.
* ForgePilot Gate creation or integration, mutable lifecycle state,
  required-file simplification, or runtime detection.
* A second risk-evidence table or execution of declared evidence.

## Inputs

* `story.md` Risk Signals and their conditional contract sections.
* `acceptance.md` checkbox ACs and existing Acceptance Evidence rows.
* `scripts/story-check [--ready]` and `scripts/verification-check`.

## Outputs

* Deterministic structure and readiness verdicts for declared risk contracts.
* No new ceremony or verdict change for a Story that declares no Signal.

## Rules

* R1: `Signal` is optional, repeatable, limited to the four standard values,
  and may not repeat. It does not replace or change `Level` or `Reason`.
* R2: Each Signal activates exactly one named contract section with its
  documented required fields. Undeclared risks activate no section.
* R3: A normal Story check validates declared Signal names, uniqueness, section
  presence, and required field structure.
* R4: `--ready` additionally rejects placeholder contract values and requires
  each `Evidence AC` to name a checkbox AC that has an Acceptance Evidence row.
* R5: The existing Acceptance Evidence table remains the only evidence map.
* R6: Checkers validate declared contracts only and never infer risk from Story
  prose, implementation vocabulary, or dependencies.
* R7: This change is Additive under `protocol/versioning.md`; existing valid
  Stories and adoptions need no migration.

## Expected Errors

* An unknown or duplicate Signal makes the Story contract incomplete.
* A declared Signal with a missing contract section or required field makes the
  Story contract incomplete.
* A placeholder contract value, malformed or unknown `Evidence AC`, or an
  `Evidence AC` without an Acceptance Evidence row makes readiness incomplete.
* Invalid invocation and missing, unreadable, empty, or symlinked Story files
  remain operational errors.

## Dependencies

* Existing Risk `Level` and `Reason` parsing in both Story and verification
  checkers.
* Existing fenced-Markdown rules, checkbox AC parsing, and Acceptance Evidence
  validation in `scripts/story-check`.

## Constraints

* Portable POSIX `sh` under `set -eu`, using shell builtins only in production
  checkers.
* Static, deterministic, read-only checks; no evidence execution or natural
  language risk inference.
* Existing Risk `Level` / `Reason`, Doctor, command forms, result names, exit
  statuses, and historical Story verdicts remain unchanged.
* No new dependency, migration, push, or deployment.

## Guidance

Relevant:

* principle: deep-module authority seam
* principle: one-source-of-truth
* principle: behavior-oriented-testing

Not applicable:

* decision: no workflow engine
