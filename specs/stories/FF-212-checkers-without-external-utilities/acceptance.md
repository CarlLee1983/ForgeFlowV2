# Acceptance Criteria

## Happy Path

* [ ] AC-001: `scripts/handoff-check` on the repository's own `specs/handoff.md`
  reports `HANDOFF_CONTRACT_OK` and exits 0 under a `PATH` containing no
  external utilities, matching its output under a normal `PATH` byte for byte.
* [ ] AC-002: `scripts/story-check` on every Story under `specs/stories/`
  reports `STORY_CONTRACT_OK` and exits 0 under the same empty `PATH`, matching
  its normal-`PATH` output byte for byte.
* [ ] AC-003: Doctor static mode on a conformant fixture with valid Stories, a
  valid handoff, and a marker equal to `VERSION` reports `Result: STRUCTURE_OK`
  and exits 0 under an empty `PATH`, and never `CONTRACT_DRIFT`.

## Business Rules

* [ ] AC-004: Story ID acceptance is unchanged: `FF-001`, `A-1`, and `DBCLI-004`
  are accepted; `ff-001`, `FF001`, `FF-`, `-1`, `FF-1a`, ` FF-1`, and `FF-1 `
  are rejected.
* [ ] AC-005: Baseline commit acceptance is unchanged: a forty-character
  lowercase hexadecimal value is accepted; thirty-nine characters, forty-one
  characters, an uppercase letter, and a non-hexadecimal letter are each
  rejected.
* [ ] AC-006: Duplicate detection is unchanged: a list with a repeated non-blank
  entry is a duplicate; a list whose only repetition is blank lines is not; an
  empty list is not.
* [ ] AC-007: Matrix separator acceptance is unchanged: `| --- | --- | --- | ---
  | --- |` and a row using `:---:` alignment in any cell are accepted; rows of
  four or six cells, a row with no leading `|`, and a cell containing text are
  each rejected.

## Failure Cases

* [ ] AC-008: A Story missing `## Classification` still reports
  `STORY_CONTRACT_INCOMPLETE` with the same message and exit 1 under both a
  normal and an empty `PATH`.
* [ ] AC-009: A handoff whose `next_story` duplicates `current_story` still
  reports `HANDOFF_CONTRACT_INCOMPLETE` with the same message and exit 1 under
  both a normal and an empty `PATH`.
* [ ] AC-010: Each checker's usage errors keep their exit code 2 and usage text
  under an empty `PATH`.

## Regression Requirements

* [ ] AC-011: Every existing `tests/story-check.sh`, `tests/handoff-check.sh`,
  and `tests/doctor.sh` case passes unchanged.
* [ ] AC-012: Neither `scripts/story-check` nor `scripts/handoff-check` contains
  a call to `grep`, `sed`, `awk`, `sort`, `uniq`, `tr`, `cut`, `head`, `tail`,
  `wc`, or `expr` on any code path, asserted by a check over the script text
  that ignores comments.
* [ ] AC-013: `docs/contract-checks.md` states the builtin-only guarantee beside
  the existing read-only guarantee, and `docs/doctor.md` no longer implies the
  guarantee is Doctor's alone.
* [ ] AC-014: Root `make verify` passes.

## Verification Notes

Each new case carries its responsible `AC-001` through `AC-014` identifier.
Cases in `tests/doctor.sh` reuse the existing `run_doctor_with_path` helper for
the empty-`PATH` invocations; `tests/story-check.sh` and
`tests/handoff-check.sh` need an equivalent helper that sets `PATH` to a
directory holding no executables. Byte-for-byte comparisons capture both
invocations to files and use `cmp`. Run `sh -n` on the two scripts and the three
test scripts, then each test script, then root `make verify`.
