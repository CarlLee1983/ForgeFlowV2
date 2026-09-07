# Story: FF-226 Architecture analysis is a stated non-goal

## Goal

Make ForgeFlow's position on architecture analysis readable off the record
instead of re-derived: one vocabulary, one list, a decision record that says it
is a scope boundary rather than a schedule, and a regression that actually
protects the sentence carrying it.

## Context

`protocol/architecture.md` states that ForgeFlow "records and resolves those
statements; it does not analyze the architecture", and names five checks that
would require analysis as an extension point for the adopting repository.

Three things undermine that statement today. `protocol/versioning.md` and
`docs/releases/0.5.0.md` restate the list as "future extensions", which reads as
deferred work rather than declined work, and both drop `architecture drift`, so
the canonical list has five entries and the restatements have four.
`docs/code-quality.md` names the same territory with a third vocabulary. And
the only test pinning any of it, `tests/execution-governance.sh` FF224-AC-011,
asserts the substring `dependency direction`, which also occurs earlier in the
same file at a sentence about the concerns architecture metadata carries — so
the extension-point paragraph can be deleted entirely with the suite still
green.

On 2026-09-07 a reader took the list as a gap and asked for the checks to be
implemented. Nothing distinguished "not built yet" from "deliberately not
ours", so the position had to be reconstructed from the protocol rather than
read from a record. That is the failure this Story repairs.

Separately, `scripts/verification-check` parses and accumulates `Decision`,
`Boundary`, and `Owner` values into three variables it never reads again; only
`scripts/story-check` consumes those declarations. The dead accumulation
suggests a semantic architecture check that does not exist.

## Classification

* Security sensitive: no
* Baseline conformance: yes
* Task mode: mixed

## Superseded Behavior

* `tests/execution-governance.sh` FF224-AC-011 asserts the substring
  `dependency direction` in `protocol/architecture.md`. That substring also
  occurs at the unrelated sentence listing the concerns architecture metadata
  carries, so the assertion does not pin the extension-point paragraph it exists
  to protect. This Story deliberately replaces that assertion with one that
  identifies the paragraph, rather than treating the weak assertion as a defect
  to fix silently.

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
* Decision: `ADR-003`
* Boundary: `Story`
* Boundary: `Verification`
* Boundary: `Repository`
* Contract: `the architecture verification layer stays a resolution check; ForgeFlow adds no source analysis`
* Contract: `Doctor's CONTRACT_DRIFT result value and its meaning are unchanged`
* Contract: `checker command forms, result names, and exit statuses are unchanged`
* Owner: `Story = scripts/story-check`
* Owner: `Verification = scripts/verification-check`
* Owner: `Repository = the adopting repository's own make verify`

## Risk

* Level: low

## Scope

### In Scope

* One vocabulary and one complete five-entry list for the analysis checks across
  the live documents, replacing the "future extensions" framing with a stated
  scope boundary.
* Renaming the architectural sense of contract drift to `public interface drift`
  and distinguishing it from Doctor's existing `CONTRACT_DRIFT`.
* A decision record for the non-goal, referenced by this Story.
* Replacing the FF224-AC-011 assertion with one that identifies the
  extension-point paragraph, so deleting it fails the build.
* Removing the unread architecture accumulation from
  `scripts/verification-check`.
* A Corrective version advance to `0.5.2` with release notes.

### Out of Scope

* Implementing any of the five analysis checks, in ForgeFlow or in an example
  project. That is the decision this Story records, not work it performs.
* Editing `docs/releases/0.5.0.md`. Published release notes are a record of what
  was said at that time; the correction is stated in the new release notes so
  both remain readable.
* Changing Doctor's `CONTRACT_DRIFT` result value, its meaning, or any documented
  Doctor verdict.
* Introducing a root `CONTEXT.md`. `protocol/` is this repository's vocabulary
  and a second glossary would be a second source of truth.
* Any change to checker command forms, result names, exit statuses, the Story or
  handoff contracts, or `make verify` semantics.

## Inputs

* The live documents naming the analysis checks: `protocol/architecture.md`,
  `protocol/versioning.md`, `docs/code-quality.md`, `docs/human-review.md`.
* `docs/doctor.md` as the established, unchanged meaning of `CONTRACT_DRIFT`.
* `tests/execution-governance.sh` FF224-AC-011 as the existing pinned assertion.
* `scripts/verification-check` architecture parsing.

## Outputs

* Documents that name the same five checks with the same words and state the
  position as a boundary.
* `specs/decisions/ADR-003-forgeflow-does-not-analyze-architecture.md`.
* A regression that fails when the extension-point paragraph is removed.
* `VERSION` `0.5.2` and `docs/releases/0.5.2.md`.

## Rules

* R1: The analysis checks are named identically wherever they are listed, and
  every list is complete. `architecture drift` is not dropped from a
  restatement.
* R2: The live documents state the position as a deliberate scope boundary. No
  live document describes these checks as planned, deferred, or forthcoming.
* R3: The architectural sense is `public interface drift`. Doctor's
  `CONTRACT_DRIFT` value, meaning, and documentation are unchanged, and the two
  are explicitly distinguished where the architectural sense is defined.
* R4: The decision record states the boundary, its cost, and a falsification
  condition naming the files the decision depends on.
* R5: Removing or emptying the extension-point paragraph fails `make verify`.
  The assertion identifies that paragraph specifically, not a substring shared
  with unrelated prose.
* R6: `scripts/verification-check` keeps its command forms, result names, exit
  statuses, and every existing diagnostic. Removing the unread accumulation
  changes no observable behavior.
* R7: The version advance is Corrective and requires no adopter migration.

## Expected Errors

* A restatement that omits an entry, or names one differently from
  `protocol/architecture.md`, is a documentation defect this Story fixes rather
  than a new checker requirement.
* An assertion that still passes with the extension-point paragraph removed has
  not satisfied R5.

## Dependencies

* FF-224 execution governance, which introduced the `architecture` layer,
  `specs/decisions/`, and the FF224-AC-011 assertion being replaced.
* `protocol/repository-contract.md` portability boundary and the builtin-only
  checker constraint in `AGENTS.md`, which are the reasons the decision is cheap.

## Compatibility

Classification: Corrective for `0.5.2` under
[Protocol Versioning](../../../protocol/versioning.md). The changes are
documentation, one decision record, one strengthened assertion, and removal of
unread code. No command form, result name, exit status, or verdict changes, and
no adopter migration is required.

## Guidance

Relevant:

* principle: small-coherent-change
* practice: repair-loop

Not applicable:

* practice: release-runbook

## Constraints

* Portable POSIX `sh` under `set -eu`; the checkers stay builtin-only. The
  tripwire scans in `tests/execution-governance.sh` and `tests/story-check.sh`
  continue to hold.
* `protocol/` and `templates/` are the versioned surface. This Story changes
  `protocol/` prose and classifies the change as Corrective.
* Tests build fixtures in temporary directories and never make this
  repository's live Stories, handoff, or work tree the subject under test.
* `ADR-003` is `proposed` until a human accepts it. A `mixed` Story may
  reference a proposed record, which is what makes the decision reviewable
  rather than pre-approved by its own author.
