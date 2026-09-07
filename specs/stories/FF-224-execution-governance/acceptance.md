# Acceptance Criteria

## Happy Path

* [ ] AC-001: A Story that declares no task mode, authority, architecture, or risk resolves to the documented defaults and keeps the contract verdict it had before.
* [ ] AC-002: A Story can declare a task mode, an authority set, architecture metadata, and a risk level, and the checker reports the resolved execution contract.

## Business Rules

* [ ] AC-003: An `evidence` task mode is rejected when it authorizes modify, add_dependency, migration, commit, push, or deploy.
* [ ] AC-004: Authority escalation is explicit: deploy requires push, push requires commit, and commit requires modify.
* [ ] AC-005: Architecture impact `medium` or `high` must name a decision or contract, a referenced decision must resolve to exactly one usable record, and an owner must name a declared boundary.
* [ ] AC-006: Risk level `medium` or `high` must name a reason, and a recognized high-risk signal may not be filed below `high`.
* [ ] AC-007: The required verification profile is selected from the declared risk level, with an architecture layer added for medium or high architecture impact.

## Failure Cases

* [ ] AC-008: A recorded result whose required check is missing, skipped, blocked, or unsupported, or whose acceptance criterion has no passing observation, reports PARTIAL rather than PASS.
* [ ] AC-009: An operation recorded as used but not granted by the Story is reported as an authority conflict and the result is FAIL.
* [ ] AC-010: An incomplete result that retains no residual risk is reported as VERIFICATION_RESULT_INCOMPLETE.

## Regression Requirements

* [ ] AC-011: Root `make verify` runs the new checks, and both checkers still decide without any external utility.
* [ ] AC-012: The protocol contracts, contract-check documentation, templates, and versioning record the new model and its compatibility classification.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `tests/execution-governance.sh` | `a Story fixture with no governance declarations` | `VERIFICATION_PLAN_OK with the documented defaults` |
| `AC-002` | test | `tests/execution-governance.sh` | `a Story fixture declaring every governance section` | `the resolved contract is printed` |
| `AC-003` | test | `tests/execution-governance.sh` | `an evidence-mode Story granting modify` | `STORY_CONTRACT_INCOMPLETE` |
| `AC-004` | test | `tests/execution-governance.sh` | `a Story granting push without commit` | `STORY_CONTRACT_INCOMPLETE` |
| `AC-005` | test | `tests/execution-governance.sh` | `a Story referencing a missing, proposed, and unowned boundary` | `STORY_CONTRACT_INCOMPLETE` |
| `AC-006` | test | `tests/execution-governance.sh` | `a Story filing a payment reason as medium risk` | `STORY_CONTRACT_INCOMPLETE` |
| `AC-007` | test | `tests/execution-governance.sh` | `Story fixtures at low, medium, and high risk` | `the printed required checks match the documented profile` |
| `AC-008` | test | `tests/execution-governance.sh` | `a result record missing a required check` | `VERIFICATION_PARTIAL` |
| `AC-009` | test | `tests/execution-governance.sh` | `a result record using ungranted commit authority` | `VERIFICATION_FAIL` |
| `AC-010` | test | `tests/execution-governance.sh` | `an incomplete result with no residual risk` | `VERIFICATION_RESULT_INCOMPLETE` |
| `AC-011` | test | `tests/execution-governance.sh` | `this repository checkout` | `the Makefile composes verify-execution and the utility scan is empty` |
| `AC-012` | test | `tests/execution-governance.sh` | `this repository checkout` | `each document states the new model` |

## Verification Notes

Root `make verify` is authoritative. `make verify-execution` runs this Story's
own checks; `./scripts/verification-check --result specs/stories/FF-224-execution-governance`
reports the recorded result for this Story.
