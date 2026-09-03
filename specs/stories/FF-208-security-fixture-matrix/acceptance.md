# Acceptance Criteria

## Happy Path

* [ ] AC-001: A Story declaring `Security sensitive: yes` with a complete
  fixture matrix and trust-boundary enumeration passes, exits `0`, and reports
  `STORY_CONTRACT_OK`.
* [ ] AC-002: A Story declaring both classifications as `no` passes without a
  fixture matrix, trust-boundary section, or superseded-behavior section.

## Business Rules

* [ ] AC-003: A fixture row whose payload, persisted locations, or verification
  cell is prose or an empty quotation rather than an exact backticked value
  fails and names the offending column, while a quoted markup payload such as
  `<script>alert(1)</script>` is accepted as an exact value.
* [ ] AC-004: A fixture row whose expected result is not `preserve`, `redact`,
  `reject`, or `omit`, or that does not declare five columns, fails.
* [ ] AC-005: A security-sensitive Story that omits `## Trust Boundary Fields`,
  or lists an entry without an exact field name, fails.

## Failure Cases

* [ ] AC-006: `Security sensitive: yes` without `## Security Fixture Matrix`, or
  with a matrix carrying no fixture rows, exits `1` and names the missing
  section.
* [ ] AC-007: `Baseline conformance: yes` without `## Superseded Behavior`
  exits `1` and names the missing declaration.
* [ ] AC-008: A missing, duplicated, or non-`yes`/`no` classification fails, and
  a Story declaring `no` while carrying the matching section fails as a
  contradiction.
* [ ] AC-009: Unknown options, a missing Story directory, and a missing or
  unreadable Story file exit `2` without reporting a contract verdict.

## Regression Requirements

* [ ] AC-010: Root `make verify` runs the new Story contract check across this
  repository's own Stories while retaining protocol, bootstrap, Doctor, release,
  Go, TypeScript, and CI-syntax verification.

* [ ] AC-011: Every checked Story receives its own verdict: a failing Story is
  never reported as `PASS` because an earlier Story failed, and a compliant
  Story keeps its `PASS` when checked after a failing one.
* [ ] AC-012: A fenced example inside a Story is documentation, not a
  declaration, so it neither satisfies nor duplicates the Classification.

## Verification Notes

Each `tests/story-check.sh` case carries its responsible `AC-001` through
`AC-012` identifier. Run `sh -n scripts/story-check tests/story-check.sh`, then
`./tests/story-check.sh`, `./tests/protocol.sh`, and finally root
`make verify`.
