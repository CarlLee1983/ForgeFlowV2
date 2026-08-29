# Acceptance Criteria

## Happy Path

* [ ] AC-01: Dry run against an empty target exits 0 and reports all four
  managed files without creating anything.
* [ ] AC-02: `--force --dry-run` and `--dry-run --force` produce an allowed
  replacement preview for safe existing regular files.

## Business Rules

* [ ] AC-03: Dry-run and real invocations agree on allow/refuse decisions for
  the same static preflight fixtures.
* [ ] AC-04: Dry run preserves existing file contents, link relationships, and
  directory entries in fresh, conflict, force, symlink, and hard-link cases.
* [ ] AC-05: Existing normal and force installations keep their behavior.

## Failure Cases

* [ ] AC-06: Plain dry run refuses a managed-file conflict without changing the
  target.
* [ ] AC-07: Force dry run still refuses managed directory/file symlinks and
  wrong file types without changing the target or linked data.
* [ ] AC-08: Unknown options, repeated flags, and invalid argument counts exit 2.

## Regression Requirements

* [ ] AC-09: Existing partial-write, symlink, hard-link, and force regression
  tests remain successful.

## Verification Notes

Run `sh -n scripts/bootstrap tests/bootstrap.sh`, then
`./tests/bootstrap.sh`, and finally `make verify`.
