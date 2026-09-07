# Acceptance Criteria

## Happy Path

* [ ] AC-001: Every live document that lists the analysis checks names the same five entries in the same words, including `architecture drift`, and none of them describes the checks as planned, deferred, or forthcoming.
* [ ] AC-002: `specs/decisions/ADR-003-forgeflow-does-not-analyze-architecture.md` states the boundary, what it costs, and a falsification condition naming the files the decision depends on, and this Story's `## Architecture` resolves it.

## Business Rules

* [ ] AC-003: The architectural sense is named `public interface drift` and is explicitly distinguished from Doctor's `CONTRACT_DRIFT` where it is defined; Doctor's result value, meaning, and documentation are unchanged.
* [ ] AC-006: `VERSION` is `0.5.2`, `protocol/versioning.md` classifies the change as Corrective, and `docs/releases/0.5.2.md` states what was corrected without editing `docs/releases/0.5.0.md`.

## Failure Cases

* [ ] AC-004: Removing or emptying the extension-point paragraph in `protocol/architecture.md` fails `make verify`; the assertion does not pass on a substring shared with the unrelated architecture-metadata sentence.

## Regression Requirements

* [ ] AC-005: Removing the unread architecture accumulation from `scripts/verification-check` changes no observable behavior: command forms, result names, exit statuses, and every existing diagnostic are unchanged, and the builtin-only tripwire still holds.
* [ ] AC-007: Full `make verify` passes, and `make verify-portability` passes under `/bin/sh` and under `/bin/dash`.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `tests/protocol.sh` | `the live documents naming the analysis checks` | `every list names the same five entries; no live document calls them future extensions` |
| `AC-002` | command | `./scripts/story-check specs/stories/FF-226-architecture-analysis-non-goal` | `ADR-003 present under specs/decisions/ and referenced by this Story` | `STORY_CONTRACT_OK with the reference resolved` |
| `AC-003` | test | `tests/protocol.sh` | `protocol/architecture.md and docs/doctor.md` | `public interface drift defined and distinguished; Doctor CONTRACT_DRIFT text unchanged` |
| `AC-004` | test | `tests/execution-governance.sh` | `a temporary copy of protocol/architecture.md with the extension-point paragraph removed, and one with only the unrelated sentence retained` | `the assertion fails for both; it passes only for the complete paragraph` |
| `AC-005` | test | `tests/execution-governance.sh with the existing verification-check suites` | `the recorded-result and plan fixtures already covering architecture declarations` | `identical output and exit statuses; builtin-only tripwire still passes` |
| `AC-006` | test | `tests/protocol.sh and tests/human-review.sh` | `VERSION, protocol/versioning.md, docs/releases/0.5.2.md, docs/releases/0.5.0.md` | `0.5.2 recorded and classified Corrective; 0.5.0 notes byte-identical` |
| `AC-007` | command | `make verify` | `complete implementation checkout` | `exit 0` |

## Verification Notes

Root `make verify` is authoritative. Dispatch new cases through
`run_case '<AC id>' <function>` with `FF226` ids so a failure names the
criterion it violates.

AC-004 is the criterion that makes this Story worth more than a wording pass.
Prove it the way the defect was found: build a temporary copy of
`protocol/architecture.md` with the extension-point paragraph deleted and
confirm the assertion fails, and a second copy retaining only the unrelated
`dependency direction` sentence and confirm it fails there too. An assertion
that passes either fixture has not satisfied R5. Fixtures live in the test's
temporary directory; never make this repository's live `protocol/` the subject
under test.

AC-006 requires `docs/releases/0.5.0.md` to be unchanged. Compare it against its
committed bytes rather than reading it, so an accidental edit is caught.

This Story declares `Risk level: low` and `Architecture impact: medium`, so its
profile requires `lint static unit` plus `architecture`. Map them honestly when
recording `verification.md`. A layer with no real evidence is recorded as
`unsupported` with a residual risk, never as a pass.

`ADR-003` is `proposed`. It is accepted by a human or it is not; this Story's
completion does not accept it, and `verification.md` records that as a residual
risk until the status changes.
