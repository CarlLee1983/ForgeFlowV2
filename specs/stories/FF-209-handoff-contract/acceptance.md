# Acceptance Criteria

## Happy Path

* [ ] AC-001: A handoff whose lifecycle block satisfies the contract exits `0`,
  reports `HANDOFF_CONTRACT_OK`, and echoes the current Story, next Story,
  completed count, baseline, and last verification.
* [ ] AC-002: `current_story: none` with `status: draft` and
  `next_story: pending` is accepted, so an inactive handoff needs no invented
  Story.

## Business Rules

* [ ] AC-003: Exactly one `current_story` and one `next_story` are required; a
  missing or repeated declaration fails, and a value that is neither a Story ID
  nor the documented sentinel fails.
* [ ] AC-004: Completed Story IDs are recorded separately from candidates,
  rejected when duplicated, and rejected when not Story IDs.
* [ ] AC-005: `repository`, `branch`, a full 40-character `commit`, and a
  boolean `dirty_worktree` are required; a short or non-hexadecimal commit
  fails.
* [ ] AC-006: `dirty_worktree: true` requires both path lists and at least one
  Story-owned path; a repeated list key fails, and a path recorded as both
  Story-owned and unrelated fails.
* [ ] AC-007: `last_command` is required and `result` must be `pass`, `fail`, or
  `not_run`.

## Failure Cases

* [ ] AC-008: Contradictory lifecycle states are rejected, including the same
  Story as current and next, a current or next Story also listed as completed,
  an active status with `current_story: none`, and a `review` or `done` status
  whose last verification did not pass.
* [ ] AC-009: A file with no lifecycle block, with two blocks, or with an
  unclosed block fails with `HANDOFF_CONTRACT_INCOMPLETE`, while unknown options, excess arguments, and a
  missing or unreadable handoff exit `2`.

## Regression Requirements

* [ ] AC-010: Root `make verify` validates this repository's own
  `specs/handoff.md` while retaining protocol, bootstrap, Doctor, release, Story
  contract, Go, TypeScript, and CI-syntax verification.

## Verification Notes

Each `tests/handoff-check.sh` case carries its responsible `AC-001` through
`AC-010` identifier. Run `sh -n scripts/handoff-check tests/handoff-check.sh`,
then `./tests/handoff-check.sh`, `./tests/protocol.sh`, and finally root
`make verify`.
