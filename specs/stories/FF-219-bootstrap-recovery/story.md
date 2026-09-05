# Story: FF-219 Bootstrap Failure Recovery

## Goal

Recover the pre-run managed file contents and existence state when bootstrap
detects a preparation or replacement failure, including an adoption-marker failure.

## Context

The current bootstrap commits each file before staging the next and writes the
marker last. This is a suspected partial-update risk to demonstrate in isolated
fixtures before changing implementation. The human request authorizes this Story.

## Classification

* Security sensitive: yes
* Baseline conformance: yes

## Scope

### In Scope

* Fresh, --force and --upgrade recovery using their existing active file lists.
* Complete staging, original backups, caught-failure recovery, actionable
  incomplete-recovery diagnostics, and fault-injection acceptance tests.

### Out of Scope

* Power-loss/SIGKILL guarantees, hostile concurrent writers, durable journals,
  services, Git commits, automatic recovery on later invocations, release changes.

## Inputs

* Existing bootstrap arguments, source templates and target managed paths.

## Outputs

* Successful complete installation, or nonzero failure with restored originals
  or exact unresolved paths, retained backups and recovery instructions.

## Rules

* R1: Reproduce second/third copy or replacement failures and marker failure in
  temporary fixtures before implementing. Test shims must not enter production.
* R2: Stage all replacement content and originals before any managed-file
  replacement. Use private staging beside destinations for same-filesystem rename.
* R3: Restore bytes and file existence on detected failure, including failures
  reported after a command changed its destination. Preserve unrelated files.
* R4: Commit the marker last. Do not print installation success on failure.
  If marker restoration fails, attempt removal to avoid a false new snapshot;
  report any inability to invalidate it as an unresolved path requiring action.
* R5: Attempt recovery for all attempted paths even when one restoration fails;
  retain recovery copies and list exact paths and actionable manual steps.
* R6: --upgrade never reads/writes AGENTS.md, --dry-run writes nothing, and
  existing symlink/type/conflict refusals remain. No recursive target deletion.
* R7: Document single-file atomic replacement separately from cross-file
  recovery. Power loss/SIGKILL and concurrent mutation are not atomic transactions.

## Trust Boundary Fields

* `target.path` — caller-selected repository and managed parent/leaf paths.
* `managed.contents` — adopter file contents retained in private recovery copies.
* `managed.links` — symlink or hard-link relationships on target paths.
* `snapshot.marker` — adoption claim changed only with the managed snapshot.

## Expected Errors

* Copy, backup, marker or rename failure exits nonzero and attempts recovery.
* Incomplete recovery identifies every unresolved managed path and retained copy.

## Dependencies

* Existing FF-202/FF-210 bootstrap safety contracts and temporary test harness.

## Superseded Behavior

* `scripts/bootstrap` immediately replaces each template and can leave earlier
  files replaced after a later copy/rename or marker operation fails.

## Compatibility

Corrective safety repair under protocol/versioning.md. CLI, marker format and
successful installation remain compatible; no migration or VERSION change.
Backups may require readable originals and extra disk space; fail before
replacement if preparation cannot complete. Restored bytes/existence are
guaranteed for handled failures, not inode identity or hard-link reconstruction.

## Constraints

* POSIX sh, set -eu, native portable tools, no production fault switches.
* Every fault injection uses a temporary fixture. Run full make verify.
* Wait for Human Review; no human acceptance, merge or publication.
