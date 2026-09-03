# Acceptance Criteria

## Happy Path

* [ ] AC-001: A fresh bootstrap into an empty directory installs
  `specs/.forgeflow-adoption` containing exactly `version=` equal to the root
  `VERSION` and `revision=` equal to the checkout's `HEAD` SHA, and installs no
  `specs/stories/README.md`.
* [ ] AC-002: `--upgrade` against a 0.2.1-shaped fixture (old templates, a
  customized `AGENTS.md`, no marker) replaces the three template files, creates
  the marker, and leaves `AGENTS.md` byte-identical.
* [ ] AC-003: `--upgrade --dry-run` prints the same replacement plan and makes
  no filesystem change, verified by a content and inode comparison of the
  fixture before and after.

## Business Rules

* [ ] AC-004: When the ForgeFlow checkout is not a Git work tree, the marker's
  `revision` is the literal `unknown` and bootstrap still exits 0; when the work
  tree has uncommitted changes, `revision` is the `HEAD` SHA with a `-dirty`
  suffix.
* [ ] AC-005: `--upgrade` against a fixture whose pre-existing marker records
  `version=0.2.1` prints a warning naming `0.2.1`, the current `VERSION`, and
  `docs/upgrading.md`, and still reports `AGENTS.md` as unchanged.
* [ ] AC-006: `--upgrade` against a fixture with no marker, and against a
  fixture whose marker already equals `VERSION`, reports `AGENTS.md` as
  unchanged without the AC-005 warning.
* [ ] AC-007: Plain bootstrap against a directory that already holds the marker
  exits 1 without writing; `--force` replaces it. A pre-existing
  `specs/stories/README.md` causes neither a refusal nor a write in any mode.

## Failure Cases

* [ ] AC-008: `--upgrade --force`, `--upgrade --upgrade`, and an extra
  positional argument each print usage and exit 2 without touching the target.
* [ ] AC-009: `--upgrade` against a directory without `specs/stories/` exits 1,
  writes nothing, and tells the user to run a fresh bootstrap.
* [ ] AC-010: `--upgrade` refuses a symlinked `_template/` directory, a template
  path that is not a regular file, and a marker path that is a symlink or not a
  regular file; each exits 1 and leaves every managed path unchanged.

## Regression Requirements

* [ ] AC-011: Every existing `tests/bootstrap.sh` case passes unchanged apart
  from the marker now appearing in the fresh-install file list.
* [ ] AC-012: `docs/getting-started.md`, `README.md`, and `docs/upgrading.md`
  agree on the flag names and the marker path, and `docs/upgrading.md` links to
  the `0.3.0` migration steps in `protocol/versioning.md` instead of restating
  them.
* [ ] AC-013: Root `make verify` passes.

## Verification Notes

Each `tests/bootstrap.sh` case carries its responsible `AC-001` through
`AC-013` identifier. Fixtures for the pre-marker adoption are built from the
0.2.1 templates checked into the test, not from a live checkout. The non-Git and
dirty-worktree cases in AC-004 run bootstrap from a copied checkout so the
repository's own work tree is never modified. Run
`sh -n scripts/bootstrap tests/bootstrap.sh`, then `./tests/bootstrap.sh`, then
root `make verify`.
