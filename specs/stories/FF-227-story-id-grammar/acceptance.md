# Acceptance Criteria

## Happy Path

* [x] AC-001: `scripts/handoff-check` accepts a multi-segment Story ID whose middle segments each contain an uppercase letter, so the eight `DBCLI-PLAT-*` forms the survey found are recordable.
* [x] AC-002: `protocol/story.md` and `protocol/handoff.md` state the same grammar, and neither states a constraint the other omits.

## Business Rules

* [x] AC-003: Every Story ID accepted under the previous grammar is still accepted, and every ID rejected under it that does not gain a valid middle segment is still rejected. The `FF212-AC-004` corpus keeps every verdict it has, including `FF-1-2` rejected.
* [x] AC-005: One shared corpus is fed to both checkers and they reach the same verdict for every entry; a disagreement fails the build.

## Failure Cases

* [x] AC-004: `scripts/story-check` fails a Story whose directory names no conforming ID, reporting the directory and the grammar, and it does so with shell builtins alone under an empty `PATH`. The ID is the shortest leading run of segments that is itself a Story ID, so a slug is never absorbed into it.

## Regression Requirements

* [x] AC-006: `VERSION` is `0.6.0`, `protocol/versioning.md` classifies the change as Breaking, and `docs/releases/0.6.0.md` carries migration guidance naming the check an adopter runs and the change a non-conforming repository must make.
* [x] AC-007: Full `make verify` passes, and `make verify-portability` passes under `/bin/sh` and under `/bin/dash`.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `tests/handoff-check.sh FF227-AC-001` | `a temporary handoff naming DBCLI-PLAT-001 as current, next, and completed` | `HANDOFF_CONTRACT_OK; no "is not a Story ID" diagnostic` |
| `AC-002` | test | `tests/protocol.sh` | `protocol/story.md and protocol/handoff.md` | `both state the grammar; neither omits a constraint the other names` |
| `AC-003` | test | `tests/handoff-check.sh FF212-AC-004` | `the existing pinned corpus, unchanged` | `four accepted and eight rejected exactly as before, FF-1-2 among the rejected` |
| `AC-004` | test | `tests/story-check.sh FF227-AC-004` | `temporary Story directories named DBCLI-PLAT-001-x, FF-232-API-limits, FF-115-3-way-merge, FF-1-2-x, ff-001-x, FF001-x and 1F-1a, each with valid contents` | `each directory naming a conforming ID passes, with FF-1-2-x reading as FF-1; each remaining directory fails naming the directory and the grammar; identical verdicts under an empty PATH` |
| `AC-005` | test | `tests/story-check.sh FF227-AC-005` | `the shared corpus, each entry built as both a Story directory and a handoff` | `every ID story-check reads is one handoff-check accepts, and every ID handoff-check accepts is one story-check reads unchanged; a seeded grammar drift fails` |
| `AC-006` | test | `tests/protocol.sh and tests/human-review.sh` | `VERSION, protocol/versioning.md, docs/releases/0.6.0.md` | `0.6.0 recorded and classified Breaking with migration guidance present` |
| `AC-007` | command | `make verify` | `complete implementation checkout` | `exit 0` |

## Verification Notes

Root `make verify` is authoritative. Dispatch new cases through
`run_case '<AC id>' <function>` with `FF227` ids so a failure names the
criterion it violates.

AC-005 is the criterion that keeps this fixed. One grammar with two
implementations drifts unless something asserts the agreement itself, which is
how the defect this Story repairs came to exist: `tests/handoff-check.sh` proved
`handoff-check` correct in isolation and nothing compared it to `story-check`.
Prove the corpus test can fail — seed a disagreement and confirm the case
reports it — rather than only observing it pass.

AC-003 is a guard against over-correction. The loosening must not quietly widen
the grammar beyond its purpose: `FF-1-2` has no subsystem segment and stays
rejected, and the existing corpus is evidence that nothing else moved. Do not
edit `FF212-AC-004`; if it needs editing, the grammar is wrong.

**Amendment, 2026-09-08.** AC-004 originally required the directory `FF-1-2-x`
to fail. Implementation and review showed that requirement forces the ID to be
the longest leading run of uppercase-and-digit segments, which absorbs a slug:
`FF-232-API-limits` reads as `FF-232-API` and `FF-115-3-way-merge` reads as
`FF-115-3`, and both fail although `FF-232` and `FF-115` conform. `FF-1-2-x` is
structurally identical to `FF-115-3-way-merge`, so no rule rejects one and
accepts the others. Carl chose to drop `FF-1-2-x` from the rejected fixtures
and take the shortest-valid-prefix rule, which has no false rejections;
`FF-1-2-x` now names `FF-1` with the slug `2-x`. The ID grammar is untouched:
`FF-1-2` is still not a Story ID anywhere it is one, which `FF212-AC-004`
continues to pin.

AC-004 must hold under an empty `PATH`, like the other checker guarantees. A new
validation that reaches for `grep` would break the builtin-only property that
`tests/story-check.sh` and `tests/execution-governance.sh` both scan for.

This Story declares `Risk level: medium` and `Architecture impact: medium`, so
its profile requires `lint static unit integration` plus `architecture`. Map
them honestly when recording `verification.md`. A layer with no real evidence is
recorded as `unsupported` with a residual risk, never as a pass.

The migration guidance required by AC-006 is thin by necessity: the 2026-09-07
survey found no non-conforming ID among the three adopters. Say that, name the
command an adopter runs to check, and state the repair. Do not imply a
population was verified beyond those three, and do not present the empty result
as a guarantee for an adopter this repository has never seen.
