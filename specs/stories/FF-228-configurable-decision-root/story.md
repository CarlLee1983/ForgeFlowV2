# Story: FF-228 Configurable architecture decision root

## Goal

Allow a repository that already keeps accepted ADRs outside `specs/decisions/`
to use `## Architecture` without relocating its decision records.

## Context

`scripts/story-check` resolves every `Decision:` relative to
`specs/decisions/`, even when an adopting repository keeps its established ADR
collection in `docs/adr/`. Issue #23 reproduced this in dbcli: a valid
`ADR-0028` was reported missing solely because the checker's root was fixed.

The default location remains useful for new repositories. Existing repositories
need one explicit, invocation-scoped way to select their own root. The risk
declaration error also needs to say that a reason is a single, same-line
backticked signal.

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
* push: yes
* deploy: no

## Architecture

* Impact: medium
* Boundary: `Story check configuration`
* Contract: `an unset decision-root override resolves decisions from specs/decisions/`
* Contract: `a configured decision root is the only root used for a Story check invocation`
* Owner: `Story check configuration = scripts/story-check`

## Risk

* Level: medium
* Reason: `versioned-surface`

## Scope

### In Scope

* An optional `FORGEFLOW_DECISIONS_ROOT` environment variable for
  `scripts/story-check`.
* Preservation of the default `specs/decisions/` lookup when the variable is
  unset or empty.
* Documentation, Story template guidance, an Additive `0.7.0` version record,
  and a focused fixture regression.
* A diagnostic that states the same-line shape required for a risk reason.

### Out of Scope

* Moving any adopting repository's ADR files.
* Changing the adoption marker, bootstrap, Doctor, decision filename grammar,
  status rules, checker result names, or exit statuses.
* Reading decisions from more than one root during one invocation.

## Inputs

* A Story directory containing `## Architecture` `Decision:` declarations.
* An optional `FORGEFLOW_DECISIONS_ROOT` directory path.

## Outputs

* A Story Contract verdict that resolves decisions from the selected root.
* Clear configuration and risk-reason-shape documentation for adopters.

## Rules

* R1: A non-empty `FORGEFLOW_DECISIONS_ROOT` is used as supplied; an unset or
  empty value uses the existing root relative to the Story collection.
* R2: One invocation resolves each decision from exactly one root and retains
  the existing exact-or-slugged filename, duplicate, readability, and status
  checks.
* R3: The override is optional and does not require an adoption-marker or
  bootstrap change.
* R4: A risk reason is one non-empty backticked signal on the declaration line;
  prose or a line-spanning value is invalid.

## Expected Errors

* A configured root without the referenced ADR reports the existing missing
  decision diagnostic.
* A risk reason that is prose or whose closing backtick is on another line
  reports the shape requirement.

## Dependencies

* Issue #23.
* The existing Architecture Contract decision resolution rules.

## Constraints

* Portable POSIX `sh` under `set -eu`; `scripts/story-check` remains
  builtin-only.
* Existing adoptions that do not set the override keep the same root and
  verdicts.
* No external repository is modified.

## Guidance

Relevant:

* principle: root-cause-over-symptom-suppression
* principle: behavior-oriented-testing

Not applicable:

* decision: none
