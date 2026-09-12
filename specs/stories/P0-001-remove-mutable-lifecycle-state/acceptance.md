# Acceptance Criteria

## Happy Path

* [ ] AC-001: The Handoff Contract and template define one point-in-time record
  containing `handoff.story`, `handoff.recorded_at`, `handoff.repository`,
  `handoff.revision`, `verification.command`, and `verification.result`, and
  describe the record as immutable historical evidence rather than current
  lifecycle state.
* [ ] AC-002: `scripts/handoff-check` accepts a conforming evidence record and
  reports its Story, recording time, repository, revision, command, and result
  without claiming current, next, completed, lifecycle, Gate, review, or
  completion state.

## Business Rules

* [ ] AC-003: Lifecycle states and transitions remain shared vocabulary, and
  the protocol explicitly says they are not persisted ForgeFlow repository
  state and require no synchronized status field in Story, acceptance, task, or
  handoff files.
* [ ] AC-004: Story and acceptance files remain approved intent/contract;
  `task.md` remains optional human context, and ForgeFlow tooling is forbidden
  from treating mutable lifecycle notes as an authoritative source.
* [ ] AC-005: Documentation and distributed agent guidance define the
  control-plane authority seam, use ForgePilot only as an example, and leave
  Story checks, Doctor, bootstrap, and `make verify` independent of any control
  plane.

## Failure Cases

* [ ] AC-006: `scripts/handoff-check` rejects missing, repeated, unknown, or
  malformed evidence sections and fields, including any legacy `workflow`
  lifecycle database, while preserving operational-error separation and its
  external-utility-free verdict.

## Regression Requirements

* [ ] AC-007: The adopter-facing change is classified Breaking at `0.8.0`, with
  migration guidance that replaces legacy mutable handoffs rather than keeping
  two authoritative current-state sources.
* [ ] AC-008: Root `make verify` and portability verification pass with updated
  Handoff, Doctor, protocol, Story-ID, and documentation fixtures.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `tests/protocol.sh P0001-AC-001` | `versioned handoff contract and template` | `only immutable evidence fields and historical semantics are required` |
| `AC-002` | test | `tests/handoff-check.sh P0001-AC-002` | `a complete point-in-time evidence fixture` | `HANDOFF_CONTRACT_OK reports recorded evidence without current-state claims` |
| `AC-003` | test | `tests/protocol.sh P0001-AC-003` | `lifecycle protocol and distributed guidance` | `state vocabulary remains while repository status persistence is disclaimed` |
| `AC-004` | test | `tests/protocol.sh P0001-AC-004` | `Story contract and task guidance` | `intent remains authoritative and mutable task notes are non-authoritative` |
| `AC-005` | test | `tests/protocol.sh P0001-AC-005` | `README, Doctor, bootstrap, and agent guidance` | `control-plane authority is optional and no ForgePilot dependency is introduced` |
| `AC-006` | test | `tests/handoff-check.sh P0001-AC-006 and FF212 regressions` | `invalid evidence corpus and empty PATH` | `structure failures exit 1, operational errors exit 2, and verdicts match without utilities` |
| `AC-007` | test | `tests/protocol.sh P0001-AC-007` | `VERSION, versioning, upgrade, and release documents` | `Breaking 0.8.0 migration removes legacy mutable handoff fields` |
| `AC-008` | command | `make verify` | `complete P0-001 implementation checkout` | `exit 0 after all repository gates` |

## Verification Notes

Root `make verify` is authoritative. Run `make verify-portability` with the
default shell and `/bin/dash` when available. Dispatch new cases through
`run_case` with `P0001-` identifiers. Historical Stories may continue to state
what their former contract required; executable fixtures and current guidance
must use the new contract.
