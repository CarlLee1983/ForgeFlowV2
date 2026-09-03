# Story: FF-213 Documentation Refresh

## Goal

Make ForgeFlow's maintained documentation accurately describe the current
bootstrap output, Doctor example, example verification gates, and release state.

## Context

The `0.3.1` release is published, bootstrap writes an adoption marker, and both
example gates run Story traceability checks. Several summaries still described
the preceding state or omitted those checks.

## Classification

* Security sensitive: no
* Baseline conformance: no

## Scope

### In Scope

* Correct stale or incomplete maintained documentation using repository and
  release evidence.
* Record the corrective protocol classification and version.
* Refresh this repository's handoff.

### Out of Scope

* Changing executable behavior, historical Story requirements, or migration
  history.
* Publishing another release.

## Inputs

* Current scripts, Makefiles, `VERSION`, Git history, tag, and GitHub Release.

## Outputs

* Consistent maintained documentation and lifecycle handoff.

## Rules

* R1: Historical version references remain unchanged when they describe actual
  migrations, defects, or completed work.
* R2: Versioned documentation changes are classified under
  `protocol/versioning.md`.

## Expected Errors

* If repository or release evidence conflicts, do not invent a current state.

## Dependencies

* Published `v0.3.1` tag and GitHub Release.

## Constraints

* Documentation-only changes except for the protocol `VERSION` required by the
  versioning policy.
