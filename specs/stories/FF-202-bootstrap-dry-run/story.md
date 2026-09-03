# Story: FF-202 Non-Mutating Bootstrap Dry Run

## Goal

Let adopters preview whether and how bootstrap would install ForgeFlow-managed
files without changing the target repository.

## Context

Bootstrap currently either installs files or refuses the operation. Users need
a safe preview that exercises the same static safety and conflict decisions as
the real installer while preserving all target state.

## Classification

* Security sensitive: no
* Baseline conformance: no

## Scope

### In Scope

* Add `--dry-run` to the bootstrap command.
* Allow `--force` and `--dry-run` in either order before the optional target.
* Report a human-readable installation or replacement plan.
* Cover fresh, conflict, force, symlink, file-type, and hard-link scenarios.
* Document dry-run semantics and limitations.

### Out of Scope

* Repository conformance checks for Makefiles, CI, or Stories.
* JSON output, file diffs, migration, or upgrade behavior.
* Eliminating check/use races on a concurrently hostile filesystem.
* Guaranteeing that a later real write cannot fail.

## Inputs

* Optional `--force` and `--dry-run` flags.
* An optional existing repository directory, defaulting to the current
  directory.
* ForgeFlow's four managed templates.

## Outputs

* A human-readable plan on successful dry run.
* Exit status indicating whether static preflight permits the corresponding
  real operation.
* No filesystem changes in dry-run mode.

## Rules

* R1: Dry run and real installation share target, template, path-type, symlink,
  and conflict decisions.
* R2: Dry run never creates a directory, staging path, file, or inode and never
  changes existing content or links.
* R3: Plain dry run refuses existing managed files exactly as plain install
  does.
* R4: `--dry-run --force` previews replacement but cannot bypass symlink or
  wrong-file-type protections.
* R5: Exit 0 means static preflight permits the operation, exit 1 means an
  operational or safety refusal, and exit 2 means invalid usage or target.
* R6: Human-readable wording is informative; exit status and the no-write
  guarantee are the normative interface.
* R7: Each supported flag may appear at most once and options must precede the
  optional target argument.

## Expected Errors

* Unknown or repeated options and excess positional arguments print usage and
  exit 2.
* Missing templates and unsafe managed paths exit 1.
* A missing or non-directory target exits 2 without changing it.
* Conflicts without `--force` exit 1 without partial writes.

## Dependencies

* The existing non-destructive bootstrap behavior and security regression
  tests.

## Constraints

* The script remains portable POSIX shell.
* Existing invocations and `--force` semantics remain valid.
* The documented concurrent hostile-filesystem limitation remains explicit.
