# Acceptance Criteria

* [ ] AC-001: `story-check --ready` rejects a missing or malformed Acceptance
  Evidence map, invalid method, unspecified value, duplicate ID, unknown ID, or
  AC without exactly one evidence row.
* [ ] AC-002: A map with exact rows for every AC accepts `test`, `command`, and
  `human`; default `story-check` remains a structure-only check.
* [ ] AC-003: Fence handling, escaped table parsing, read-only behavior, and an
  empty `PATH` retain deterministic readiness results without test execution or
  source parsing.
* [ ] AC-004: Templates, agent guidance, Human Review, and the `0.4.0` breaking
  migration explain fixture/precondition evidence, bootstrap upgrade behavior,
  and the limit of static checking.
* [ ] AC-005: The complete repository `make verify` gate passes with the new
  Story and handoff contract.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `tests/story-check.sh:FF222-AC-001` | `invalid evidence fixtures` | `STORY_READINESS_INCOMPLETE` |
| `AC-002` | test | `tests/story-check.sh:FF222-AC-002` | `valid test command human rows` | `STORY_READINESS_OK` |
| `AC-003` | test | `tests/story-check.sh:FF222-AC-003` | `fenced and empty PATH fixture` | `same readiness verdict` |
| `AC-004` | test | `tests/story-check.sh:FF222-AC-004` | `protocol documentation` | `required guidance exists` |
| `AC-005` | command | `make verify` | `repository checkout` | `exit 0` |

## Verification Notes

Run `./tests/story-check.sh`, `./scripts/story-check --ready
specs/stories/FF-222-acceptance-evidence`, `./scripts/handoff-check`, and
`make verify`. Static success does not prove that the listed evidence is
sufficient; Human Review judges the fixture and external-invariant choices.
