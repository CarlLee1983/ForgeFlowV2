# Story: FF-220 Shell Portability Verification

## Goal

Exercise the five portable shell tools under macOS default utilities and an
additional POSIX shell without duplicating the full language pipelines.

## Classification

* Security sensitive: no
* Baseline conformance: no

## Scope

* Keep Linux make verify as the unchanged canonical gate.
* Add an auxiliary behavior-test runner for bootstrap, doctor, story-check,
  handoff-check and release-check, macOS sh and Ubuntu dash CI jobs, and docs.
* Use an isolated source copy with selected-interpreter shebangs so direct
  children and copied fixtures execute the chosen shell too. Keep script bodies
  unchanged; never mutate the real repository or introduce production hooks.

## Rules

* Run existing behavior suites, not merely syntax checks or wrapper shells.
* Preserve SHA-pinned Actions and give jobs reasonable timeouts.
* Auxiliary jobs do not rerun TypeScript or Go pipelines.
* Document configured CI coverage separately from locally observed results.

## Compatibility

Repository-only Corrective verification improvement under protocol/versioning.md.
No adopter contract, mandatory gate coverage, VERSION or migration changes.

## Constraints

* POSIX sh and native portable tools; isolated fixtures and run_case AC mapping.
* Complete make verify and wait for Human Review; no remote writes or acceptance.
