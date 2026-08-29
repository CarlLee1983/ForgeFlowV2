# Acceptance Criteria

## Happy Path

* [ ] AC-001: After bootstrap runs against an empty directory, Doctor reports
  the missing Makefile, exits `1`, and does not claim adoption is complete.
* [ ] AC-002: Static mode exits `0` when required structure is complete and does
  not fail because Skills, CI, `_template/`, or `task.md` are absent.
* [ ] AC-006: `--run-verify` against a successful fixture invokes `make verify`
  exactly once from the correct directory, exits `0`, and reports
  `VERIFIED_LOCAL`.

## Business Rules

* [ ] AC-003: Static mode does not invoke Make, recipes, `$(shell ...)`, or a
  target script; marker files inside and outside the fixture remain absent.
* [ ] AC-004: Static mode does not change target file contents, permissions, or
  directory structure; tests exclude access-time metadata from comparison.
* [ ] AC-005: Comments, `.PHONY` declarations, and ordinary text do not produce
  a false claim that verification is available, while include-based or dynamic
  targets remain explicitly unconfirmed by static inspection.
* [ ] AC-008: A valid fixture whose `verify` target is defined through an
  include is not blocked by the limited static scan; explicit `--run-verify`
  reports the actual Make result.

## Failure Cases

* [ ] AC-007: `--run-verify` against a failing fixture makes Doctor exit `1`,
  reports `VERIFICATION_FAILED`, preserves Make's real nonzero exit status as a
  field, and does not swallow the failure.
* [ ] AC-009: Missing required structure prevents `--run-verify` from invoking
  any repository program.
* [ ] AC-010: `--help` exits `0`; unknown options, excess arguments, and invalid
  repository directories exit `2`; relative, absolute, and whitespace-bearing
  paths are handled correctly.
* [ ] AC-011: An unreadable required path or an unsupported symlink on any
  required path reports `ERROR`, exits `2`, and is neither followed nor changed.

## Regression Requirements

* [ ] AC-012: Root `make verify` executes the new Doctor tests while retaining
  existing bootstrap, release, Go, TypeScript, and CI-syntax verification.

## Verification Notes

Each `tests/doctor.sh` case carries its responsible `AC-001` through `AC-012`
identifier. Run `sh -n scripts/doctor tests/doctor.sh`, then
`./tests/doctor.sh`, `./tests/protocol.sh`, and finally root `make verify`.
