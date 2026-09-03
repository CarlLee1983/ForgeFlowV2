# Story: FF-210 Adoption Snapshot and Template Upgrade

## Goal

Let an adopting repository know which ForgeFlow protocol version it installed
and move its managed Story templates to a newer version without touching the
repository-owned `AGENTS.md`.

## Context

Bootstrap installs a copy-time snapshot but records nothing about it. The first
real upgrade (dbcli, 0.2.1 to 0.3.0) showed the gap: the adopter had
hand-written a version note in `specs/stories/README.md`, the only upgrade path
was `--force`, which would also overwrite a heavily customized `AGENTS.md`, and
the template files had to be copied by hand. FF-202 explicitly left migration
and upgrade behavior out of scope; this Story closes that deferral.

The marker is a machine-readable file at a path no adopter owns, not the
`specs/stories/README.md` prose file that dbcli had already claimed. Keeping the
two apart is what lets FF-211 read an exact version instead of guessing at
hand-written prose.

## Classification

Both declarations are required. `yes` makes the matching section below
mandatory.

* Security sensitive: no
* Baseline conformance: no

## Scope

### In Scope

* Install a managed adoption marker at `specs/.forgeflow-adoption`, holding one
  `key=value` pair per line: `version` and `revision`.
* Add `--upgrade` to bootstrap: replace only the `specs/stories/_template/`
  files and the marker, and never write `AGENTS.md`.
* Report, on upgrade, that `AGENTS.md` was left unchanged, and additionally warn
  that it dates from an older protocol version when the pre-upgrade marker
  records a `version` different from the current `VERSION`.
* Support `--upgrade --dry-run` with the same preview semantics as FF-202.
* Add `docs/upgrading.md` describing the upgrade flow and the marker, linking to
  the per-version migration steps in `protocol/versioning.md` rather than
  restating them, and link the page from `README.md` and
  `docs/getting-started.md`.

### Out of Scope

* Merging, diffing, or byte-comparing a customized `AGENTS.md` against any
  template.
* Retaining historical template snapshots to support a three-way comparison.
* Rewriting existing Story files to satisfy a newer Story Contract; that remains
  the adopter's migration step, checked by `story-check`.
* Managing `specs/stories/README.md`, Skills, CI templates, or the handoff
  template.
* Version negotiation, automatic upgrades, network access, and any change to
  `VERSION` itself.

## Inputs

* The `--upgrade` flag, optionally combined with `--dry-run`, before the
  optional target directory.
* The root `VERSION` file and, when the ForgeFlow checkout is a Git work tree,
  its `HEAD` revision and worktree cleanliness.
* An existing target repository, with or without a prior adoption marker.

## Outputs

* A fresh bootstrap that additionally installs `specs/.forgeflow-adoption`.
* An upgrade that replaces the three template files and the marker, leaves every
  other target path untouched, and reports the `AGENTS.md` status.
* Exit status following the existing bootstrap contract.

## Rules

* R1: The marker holds exactly two lines, `version=<value>` and
  `revision=<value>`, with no timestamp or other field.
* R2: `version` is the root `VERSION` value verbatim. `revision` is the full
  40-character `HEAD` SHA for a clean Git work tree, that SHA with a `-dirty`
  suffix when the work tree has uncommitted changes, and the literal `unknown`
  when the checkout is not a Git work tree or Git is unavailable.
* R3: `--upgrade` never creates, replaces, or removes `AGENTS.md`, and never
  inspects its contents.
* R4: `--upgrade` warns that `AGENTS.md` may be outdated only when a marker
  existed before the upgrade and its `version` differs from `VERSION`; the
  warning names both values and points at `docs/upgrading.md`.
* R5: `--upgrade` shares the FF-202 path-type, symlink, and staging protections
  with fresh installation; it replaces files atomically and refuses unsafe
  paths.
* R6: `--upgrade` succeeds on a target whose adoption predates the marker; a
  missing marker is created, not treated as a refusal, and produces no R4
  warning.
* R7: `--upgrade` and `--force` are mutually exclusive; each flag may appear at
  most once and options precede the optional target.
* R8: A plain bootstrap refuses an existing marker exactly as it refuses any
  other existing managed file; only `--force` or `--upgrade` replaces it.

## Expected Errors

* `--upgrade --force`, a repeated flag, or excess positional arguments print
  usage and exit 2.
* A target with no `specs/stories/` directory exits 1 under `--upgrade` with a
  message that a fresh bootstrap is required.
* A marker that exists but is not a regular file, or is a symlink, exits 1
  without partial writes, as in FF-202.
* An unsafe managed template path exits 1 without partial writes, as in FF-202.

## Dependencies

* The existing bootstrap script, its managed-file list, and `tests/bootstrap.sh`.
* The root `VERSION` file and the FF-201 versioning contract.

## Constraints

* The script remains portable POSIX shell; Git is optional at run time.
* Existing bootstrap invocations, `--force`, and `--dry-run` keep their
  documented semantics.
* Adding the marker and `--upgrade` to the managed surface is an Additive change
  under `protocol/versioning.md`; the Story records that classification and does
  not itself change `VERSION`.
