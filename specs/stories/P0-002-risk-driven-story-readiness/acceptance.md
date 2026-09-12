# Acceptance Criteria

## Happy Path

* [ ] AC-001: A Story with no Risk Signal keeps its existing default and
  `--ready` verdicts and requires no risk-contract section.
* [ ] AC-002: Each of `error-projection`, `concurrency`, `bounded-capacity`, and
  `retention-overflow` passes structure and readiness checks when its required
  contract fields name concrete values and its Evidence AC has an Acceptance
  Evidence row; multiple different Signals work together.

## Business Rules

* [ ] AC-003: `Signal` is optional and repeatable but an unknown or duplicate
  value fails, while existing Risk `Level` and `Reason` behavior is unchanged.
* [ ] AC-004: Each declared Signal requires only its corresponding section and
  exact field set: Error Projection, Concurrency, Capacity, or Retention and
  Overflow; a missing section or required field fails the normal contract check.
* [ ] AC-005: `--ready` rejects placeholder risk-contract values and requires
  each Evidence AC to use the exact `AC-<digits>` form and reference a checkbox
  AC that exists in the same Story.
* [ ] AC-006: `--ready` requires every risk-contract Evidence AC to have a row
  in the existing Acceptance Evidence table and introduces no second evidence
  map.

## Failure Cases

* [ ] AC-007: Fenced examples never declare Signals, contract sections, fields,
  ACs, or evidence, and the checker performs no keyword-based risk inference.

## Regression Requirements

* [ ] AC-008: `story-check` and `verification-check` both accept the four
  standard Signal declarations, preserve shell-builtin-only and empty-PATH
  behavior, and keep existing command forms, results, and exit statuses.
* [ ] AC-009: Protocol, template, checker docs, execution-governance guidance,
  README, and versioning describe the opt-in conditional contract and its
  Additive compatibility classification without shipping four active empty
  sections in the Story template.
* [ ] AC-010: All existing historical Stories and the complete `make verify`
  gate continue to pass.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `tests/story-check.sh P0002-AC-001` | `a valid Story fixture with no Signal` | `default and readiness verdicts remain successful without risk sections` |
| `AC-002` | test | `tests/story-check.sh P0002-AC-002` | `one fixture per standard Signal plus one multi-Signal fixture` | `every declared contract reports STORY_READINESS_OK` |
| `AC-003` | test | `tests/story-check.sh P0002-AC-003` | `unknown, duplicate, and existing Level / Reason fixtures` | `invalid Signals fail and prior Risk behavior is unchanged` |
| `AC-004` | test | `tests/story-check.sh P0002-AC-004` | `declared Signals with missing sections and fields` | `the normal check reports STORY_CONTRACT_INCOMPLETE` |
| `AC-005` | test | `tests/story-check.sh P0002-AC-005` | `placeholder, malformed, missing, and unknown Evidence AC fixtures` | `readiness reports each incomplete contract` |
| `AC-006` | test | `tests/story-check.sh P0002-AC-006` | `an Evidence AC whose Acceptance Evidence row is absent` | `readiness reports the missing mapped evidence` |
| `AC-007` | test | `tests/story-check.sh P0002-AC-007` | `fenced Signal examples and risk-like prose without declarations` | `examples are ignored and prose activates no contract` |
| `AC-008` | test | `tests/story-check.sh and tests/execution-governance.sh` | `standard Signal fixtures under normal and empty PATH` | `both checkers agree without external utilities` |
| `AC-009` | test | `tests/protocol.sh P0002-AC-009` | `versioned contracts, template, and user documentation` | `the opt-in contract and Additive classification are consistent` |
| `AC-010` | command | `make verify` | `the complete P0-002 checkout` | `all repository gates exit 0` |

## Verification Notes

Root `make verify` is authoritative. Run focused Story and execution-governance
checks while implementing. P0-002 cases use `P0002-AC-*` identifiers.
