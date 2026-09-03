# Story: FF-216 Review Integrity and State Consistency

## Goal

Keep review and handoff state internally consistent, and make Human Review
responsible for checking Story Classification truthfulness and verification
evidence freshness.

## Context

The committed FF-215 progress note says Human Review is pending while the
handoff records FF-215 as accepted and DONE. The same handoff preserves a
time-sensitive claim that `v0.3.4` is unpublished even though its tag and
GitHub Release now resolve to the committed FF-215 completion baseline.

Static contract checks can validate declared structure but cannot judge
whether Classification matches real behavior or whether a recorded PASS still
applies to the implementation under review. Those judgments belong explicitly
to Human Review.

## Classification

* Security sensitive: no
* Baseline conformance: yes

## Scope

### In Scope

* Reconcile the FF-215 progress note with its accepted DONE state.
* Record the published `v0.3.4` history without treating mutable remote state
  as durable handoff truth.
* Add Classification truthfulness, cross-artifact consistency, and verification
  freshness to Human Review.
* Align the distributed agent template and Story Development Skill with that
  review preparation boundary.
* Explain manual `AGENTS.md` guidance reconciliation during template upgrades.
* Add focused contract coverage and advance the corrective protocol version.

### Out of Scope

* A required `review.md`, reviewer, review timestamp, verified commit, PR URL,
  or other review attestation.
* Automated or LLM Classification inference, scoring, approval, or merge
  authorization.
* A lifecycle state, adopter Make target, dependency, Story checker heuristic,
  GitHub repository-setting change, tag, Release, or other remote mutation.
* Reclassifying historical Stories or unrelated refactoring.

## Inputs

* The accepted FF-215 task and repository handoff at baseline
  `8e0eb8c10bbd3d6d4d654de42ff7eee115d8c8a4`.
* Existing Story, Verification, Lifecycle, Handoff, and Versioning contracts.
* Existing Human Review, contract-check, release, and upgrade guidance.

## Outputs

* Consistent FF-215 progress and handoff history.
* Review guidance covering Classification truthfulness, artifact consistency,
  and current verification evidence.
* Upgrade guidance for manually reconciling repository-owned `AGENTS.md`.
* FF-216 contract tests, protocol version `0.3.5`, and a REVIEW-state handoff.

## Rules

* R1: Human Review checks actual trust boundaries, authorization, confidential
  data, external input, persistence, and replaced baseline behavior against the
  Story's Classification and conditional evidence.
* R2: Story, Acceptance Criteria, Classification, implementation, and tests
  remain mutually consistent; `no` is not a shortcut around conditional Story
  sections.
* R3: Review evidence includes a complete `make verify` PASS for the current
  implementation. Later behavior-affecting code, test, or configuration changes
  invalidate it and require another complete run.
* R4: A final handoff-only documentation update is attributed explicitly and a
  human judges whether it affects behavior and requires re-verification.
* R5: Static checkers validate declarations only. They do not prove
  Classification truth, PASS authenticity, or PASS freshness.
* R6: Remote tag, Release, and CI state is queried when needed under the release
  runbook rather than preserved as current truth in a handoff.
* R7: `bootstrap --upgrade` continues to leave repository-owned `AGENTS.md`
  untouched; adopters manually compare guidance introduced in 0.3.3 through
  0.3.5.
* R8: The change adds no lifecycle state, mandatory review artifact, automated
  judgment, or adopter Make target and changes no existing PASS or lifecycle
  semantics.
* R9: This change is Corrective and advances `VERSION` from `0.3.4` to `0.3.5`
  without creating or publishing a tag or Release.

## Expected Errors

* Contract tests fail when review guidance omits Classification truthfulness,
  cross-artifact consistency, or verification freshness.
* Contract tests fail when stale FF-215 or release-state claims remain.
* Contract tests fail when versioned guidance drifts or any FF-216 Acceptance
  Criterion lacks one `run_case` mapping.

## Dependencies

* FF-208 Story Classification and security fixture contracts.
* FF-209 Handoff Contract and path-attribution rules.
* FF-214 Code Quality and FF-215 Human Review guidance.
* Existing POSIX shell tests and the root canonical verification gate.

## Superseded Behavior

* `specs/stories/FF-215-human-review-guidance/task.md` says Human Review remains
  pending and FF-215 is not DONE.
* `specs/handoff.md` says the 0.3.3 and 0.3.4 work has not been tagged or
  published, preserving mutable remote state as handoff truth.
* `tests/human-review.sh` requires protocol version `0.3.4` and Doctor's
  `Adopted version: 0.3.4` example.

## Constraints

* Preserve every existing verification gate and checker interface.
* Keep documentation authoritative without creating natural-language
  Classification heuristics.
* Use POSIX `sh` with `set -eu`; every FF-216 case is dispatched through
  `run_case '<AC-ID>' <function>`.
* Do not commit, push, merge, tag, publish, or modify GitHub settings.
