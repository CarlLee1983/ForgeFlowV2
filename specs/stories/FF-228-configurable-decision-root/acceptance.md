# Acceptance Criteria

## Happy Path

* [ ] AC-001: A Story referencing an accepted ADR in a configured external
  decision root passes `scripts/story-check` without duplicating or moving that
  ADR into `specs/decisions/`.

## Business Rules

* [ ] AC-002: An unset or empty override keeps resolving only from the existing
  `specs/decisions/` root, and a configured root does not fall back to that
  default root.
* [ ] AC-003: The selected root retains exact-or-slugged filename lookup and
  rejects missing, duplicate, unreadable, and unusable decision records exactly
  as before.

## Failure Cases

* [ ] AC-004: A prose or line-spanning `Reason:` declaration fails with a
  message saying it needs one same-line backticked signal.

## Regression Requirements

* [ ] AC-005: `protocol/architecture.md`, the Story template, contract-check
  documentation, upgrade guidance, and `docs/releases/0.7.0.md` describe the
  optional override; `VERSION` is `0.7.0` and the change is classified Additive.
* [ ] AC-006: `make verify` and `make verify-portability` pass after the
  implementation.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `tests/execution-governance.sh FF228-AC-001` | `a temporary Story with ADR-907 only in a temporary docs/adr root` | `STORY_CONTRACT_OK when FORGEFLOW_DECISIONS_ROOT names that root` |
| `AC-002` | test | `tests/execution-governance.sh FF228-AC-001` | `the same fixture without, with empty, and with configured override` | `default root remains exclusive; configured root has no fallback` |
| `AC-003` | test | `tests/execution-governance.sh FF224-AC-005 and FF228-AC-001` | `existing decision-resolution matrix plus configured-root fixture` | `existing record validation is unchanged in the selected root` |
| `AC-004` | test | `tests/execution-governance.sh FF228-AC-002` | `temporary Stories with prose and line-spanning risk reasons` | `both fail with the same-line backticked-signal diagnostic` |
| `AC-005` | test | `tests/protocol.sh and tests/human-review.sh` | `versioned documents and release record` | `0.7.0 Additive configuration documentation is present` |
| `AC-006` | command | `make verify` | `complete implementation checkout` | `exit 0` |

## Verification Notes

Root `make verify` is authoritative. Dispatch the new acceptance cases with
`FF228-` IDs. The decision-root fixture must use a temporary path outside
`specs/decisions/` and prove the default remains exclusive before proving the
configured path passes.
