# Handoff Contract

A handoff is what one human or agent leaves for the next one. It is optional
until work actually changes hands; once it exists, its lifecycle statement is
machine-readable so that no consumer has to infer the next Story from list
order, ordering conventions, or narrative text.

## Location

Store the handoff at `specs/handoff.md`, or pass another path to the checker.
Prose context belongs in the file around the block and is ignored by the
contract check.

## Lifecycle block

The file contains exactly one fenced `yaml` block holding three sections:

```yaml
workflow:
  current_story: ABC-005
  next_story: ABC-006
  completed_stories:
    - ABC-004
  status: ready_for_implementation

baseline:
  repository: owner/repository
  branch: main
  commit: 0000000000000000000000000000000000000000
  dirty_worktree: true
  story_owned_paths:
    - src/guard.ts
  known_unrelated_paths:
    - docs/notes.md

verification:
  last_command: make verify
  result: pass
```

| Field | Meaning |
| --- | --- |
| `workflow.current_story` | One Story ID, or `none` when no Story is active |
| `workflow.next_story` | One Story ID, or `pending` when selection has not been made |
| `workflow.completed_stories` | Completed Story IDs, recorded separately from candidates |
| `workflow.status` | One lowercase [lifecycle state](lifecycle.md) |
| `baseline.repository` | The target repository |
| `baseline.branch` | The baseline branch |
| `baseline.commit` | The full 40-character baseline commit SHA |
| `baseline.dirty_worktree` | `true` or `false` |
| `baseline.story_owned_paths` | Working-tree paths the Story owns |
| `baseline.known_unrelated_paths` | Working-tree paths the Story does not own |
| `verification.last_command` | The last authoritative verification command |
| `verification.result` | `pass`, `fail`, or `not_run` |

A Story ID is uppercase letters or digits, a hyphen, and digits, such as
`FF-209`. An empty list is written as `[]`.

## Rules

- Exactly one current Story is stated, or `none`. Exactly one next Story is
  stated, or `pending`. Candidates are recorded as prose, never as `next_story`.
- Completed Story IDs are unique and never overlap the current or next Story.
- A dirty worktree declares both path lists, attributes at least one path to the
  Story, and records no path as both Story-owned and unrelated.
- A `review` or `done` status requires a last verification result of `pass`.
- Contradictory lifecycle statements are rejected rather than repaired.

## Checking the contract

```sh
./scripts/handoff-check [handoff-file]
```

The check is static and read-only. It exits `0` for `HANDOFF_CONTRACT_OK`, `1`
for `HANDOFF_CONTRACT_INCOMPLETE`, and `2` for an operational error. It records
what the last verification claimed; it never runs verification, edits the
handoff, or authorizes a merge. Use
[the handoff template](../templates/handoff.md) as the canonical layout.

Remote tag, Release, and CI state is time-sensitive evidence. A handoff may
record a historical fact, but it is not the long-term source of truth for
current remote state; query the remote when that evidence is needed.
