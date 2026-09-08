# Story: FF-227 One Story ID grammar, enforced where a Story is created

## Goal

Stop ForgeFlow from accepting a Story it can never record. One Story ID grammar,
stated in the protocol, agreed on by both checkers, and enforced when the Story
is written rather than when the handoff is.

## Context

`scripts/story-check` and `scripts/handoff-check` disagree about what a Story ID
is. `story-check` does not validate Story IDs at all — it checks a Story
directory's contents and never looks at its name. `handoff-check` enforces
`PREFIX-DIGITS`, where `${1#*-}` takes everything after the first hyphen and
requires it to be digits.

A Story whose ID has more than one hyphen therefore passes the Story Contract
and can never appear in a conforming handoff. The failure surfaces at the moment
the Story is recorded as complete, which is the point where the ID is most
expensive to change.

This is not hypothetical. A read-only survey of the three adopting repositories
on 2026-09-07 found `Dbcli` carrying eight such Stories — `DBCLI-PLAT-001`
through `DBCLI-PLAT-013`. Each one passes `./scripts/story-check`; each one is
rejected by `./scripts/handoff-check` with `completed Story is not a Story ID`.
`DBCLI-PLAT` is a subsystem name, which is the reason the second segment exists.

The grammar is documented in one place only, `protocol/handoff.md`, as part of
the handoff contract. `protocol/story.md` says to "use a stable, unique Story ID
followed by an optional readable slug" and states no constraint, so the document
that tells an author how to name a Story is silent about the rule that will
later reject it.

Three adopters are at protocol `0.3.2`, `0.3.5`, and `0.3.6` while ForgeFlow is
at `0.5.2`. This Story does not address that gap; it removes one ForgeFlow-side
inconsistency that any upgrade path would otherwise have to carry forward.

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
* Boundary: `Story`
* Boundary: `Handoff`
* Contract: `one Story ID grammar is stated in protocol/story.md and protocol/handoff.md and both documents agree`
* Contract: `scripts/story-check and scripts/handoff-check reach the same verdict for every Story ID`
* Contract: `every Story ID valid under the previous grammar stays valid`
* Owner: `Story = scripts/story-check`
* Owner: `Handoff = scripts/handoff-check`

## Risk

* Level: medium
* Reason: `breaking-change`

## Scope

### In Scope

* One Story ID grammar: a first segment starting with an uppercase letter and
  continuing with uppercase letters or digits, optional middle segments that
  each contain at least one uppercase letter, and a final segment of digits.
* Stating that grammar in `protocol/story.md`, where a Story is named, as well
  as in `protocol/handoff.md`, where it is currently the only statement.
* Loosening `scripts/handoff-check` to accept the middle segments.
* Adding Story ID validation to `scripts/story-check`, which fails a Story whose
  ID does not conform. A directory name is a Story ID followed by an optional
  slug, and the ID is the shortest leading run of segments that is itself a
  Story ID, so a slug is never read as part of it.
* A shared ID corpus that both checkers are tested against, asserting that they
  agree rather than that each is separately correct.
* A Breaking version advance to `0.6.0` with migration guidance.

### Out of Scope

* The `0.4.0` acceptance-evidence migration. The same survey found 23 contract
  failures in `Dbcli` from that Breaking change, in security fixture matrices
  and trust-boundary fields. That is real and unaddressed, and it is separate
  work with a different shape.
* `Dbcli`'s `verification.detail` handoff key, which the current lifecycle
  contract does not recognize.
* Any change to an adopting repository. The survey was read-only and the upgrade
  trial ran against an isolated copy.
* Renaming any existing Story, in this repository or an adopter's.
* Tightening the grammar. The chosen direction is to accept the form adopters
  already use, not to make their existing Stories permanently invalid.

## Inputs

* `scripts/handoff-check` `forgeflow_is_story_id` and its pinned corpus in
  `tests/handoff-check.sh` FF212-AC-004.
* `scripts/story-check`, which today performs no ID validation.
* `protocol/story.md` and `protocol/handoff.md` as the two statements that must
  agree.

## Outputs

* Two checkers that reach the same verdict for any Story ID.
* A protocol that states the grammar where a Story is named.
* `VERSION` `0.6.0`, `docs/releases/0.6.0.md`, and migration guidance.

## Rules

* R1: There is one grammar. `protocol/story.md` and `protocol/handoff.md` state
  it, and neither states a constraint the other omits.
* R2: Every Story ID accepted under the previous grammar is still accepted. The
  change is a loosening; the existing pinned corpus keeps every verdict it has.
* R3: A middle segment contains at least one uppercase letter. `DBCLI-PLAT-001`
  conforms; `FF-1-2` does not, and stays rejected as it is today.
* R4: `scripts/story-check` fails a Story whose ID does not conform, so a
  non-conforming ID is reported when the Story is written rather than when it is
  recorded. This is the Breaking part of the change: a Story that passed before
  can fail now.
* R5: The two checkers agree. A test feeds one shared corpus to both and fails
  if either accepts what the other rejects.
* R6: Checkers stay portable POSIX `sh` using shell builtins only, with no
  dependency on the caller's `PATH`.

## Expected Errors

* A non-conforming Story ID is a `story-check` failure naming the ID and the
  grammar, not a silent pass deferred to the handoff.
* A corpus entry the two checkers judge differently is a test failure, not a
  reason to record two grammars.

## Dependencies

* FF-212, which introduced the pinned ID corpus as `FF212-AC-004`.
* `protocol/versioning.md`, which classifies this as Breaking and therefore
  requires migration guidance and a `0.MINOR.0` release.

## Compatibility

Classification: **Breaking** for `0.6.0` under
[Protocol Versioning](../../../protocol/versioning.md). The grammar itself is
loosened, so no previously valid ID becomes invalid. The Breaking part is that
`scripts/story-check` now validates Story IDs: a repository holding a Story
whose ID never conformed sees a new failure where it previously saw a pass.

Migration guidance must identify affected adopters and the required change. A
read-only survey on 2026-09-07 found no such ID among the three current
adopters, so the guidance names the check to run rather than a known repair,
and the classification follows the policy rather than the observed population.

## Guidance

Relevant:

* principle: small-coherent-change
* practice: repair-loop

Not applicable:

* practice: release-runbook

## Constraints

* Portable POSIX `sh` under `set -eu`; the checkers stay builtin-only and the
  tripwire scans in `tests/execution-governance.sh` and `tests/story-check.sh`
  continue to hold.
* `protocol/` is the versioned surface. This Story changes it and classifies the
  change as Breaking.
* Tests build fixtures in temporary directories and never make this
  repository's live Stories, handoff, or work tree the subject under test.
* No adopter repository is modified. Any trial uses an isolated copy, as the
  2026-09-07 upgrade trial did.
