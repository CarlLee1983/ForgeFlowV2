# Acceptance Criteria

## Happy Path

* [ ] AC-001: Doctor static mode on a complete fixture with valid Stories, a
  valid handoff, and a marker equal to `VERSION` prints the adopted version,
  `Story contract: STORY_CONTRACT_OK`, `Handoff: HANDOFF_CONTRACT_OK`,
  `Result: STRUCTURE_OK`, and exits 0.
* [ ] AC-002: Doctor enumerates the target's Story directories, excludes
  `_template/`, and reaches the same `story-check` result as invoking
  `scripts/story-check` on those directories directly, with no new option added
  to `story-check`.

## Business Rules

* [ ] AC-003: A fixture whose Stories lack `## Classification` prints a `WARN`
  line, `Story contract: STORY_CONTRACT_INCOMPLETE`, and
  `Result: CONTRACT_DRIFT`, and exits 0.
* [ ] AC-004: A fixture with a valid handoff replaced by one failing
  `handoff-check` prints `Handoff: HANDOFF_CONTRACT_INCOMPLETE`,
  `Result: CONTRACT_DRIFT`, and exits 0.
* [ ] AC-005: A fixture with a marker recording `version=0.2.1` against a
  `VERSION` of `0.3.0` prints a `WARN` line naming both values and
  `Result: CONTRACT_DRIFT`, and exits 0.
* [ ] AC-006: A fixture with no marker prints the adopted version as `UNKNOWN`
  on an `INFO` line and, with valid Stories and handoff, still reports
  `Result: STRUCTURE_OK`.
* [ ] AC-007: A fixture with only `_template/` reports
  `Story contract: NO_STORIES` and a fixture without `specs/handoff.md` reports
  `Handoff: NOT_PRESENT`; neither prints `WARN` nor changes the result line.
* [ ] AC-008: A fixture missing `Makefile` exits 1 and reports both contract
  lines as `NOT_CHECKED`, proving the checks did not run.
* [ ] AC-009: Static mode leaves the fixture's contents, permissions, and
  directory structure unchanged and creates no marker file inside or outside it,
  extending the FF-207 no-write test, including on a fixture that reports
  `CONTRACT_DRIFT`.

## Failure Cases

* [ ] AC-010: A fixture whose `specs/handoff.md` is a symlink makes Doctor
  report `ERROR` and exit 2 without following the link.
* [ ] AC-011: A fixture whose marker is a symlink, is unreadable, or holds no
  `version=` line makes Doctor report `ERROR` and exit 2.

## Regression Requirements

* [ ] AC-012: Every existing `tests/doctor.sh`, `tests/story-check.sh`, and
  `tests/handoff-check.sh` case passes unchanged, and `scripts/story-check` and
  `scripts/handoff-check` are byte-identical to their pre-Story versions.
* [ ] AC-013: `docs/doctor.md` and `docs/contract-checks.md` document the three
  new lines, the `CONTRACT_DRIFT` result, and the unchanged exit semantics, and
  `protocol/versioning.md` records the effect of the new result value on a
  consumer matching Doctor's `Result` line.
* [ ] AC-014: Root `make verify` passes.

## Verification Notes

Each new `tests/doctor.sh` case carries its responsible `AC-001` through
`AC-014` identifier. Fixtures are built inside the test's temporary directory so
the repository's own Stories and handoff are never the subject under test. Run
`sh -n scripts/doctor tests/doctor.sh`, then `./tests/doctor.sh`,
`./tests/story-check.sh`, `./tests/handoff-check.sh`, then root `make verify`.
