# ForgeFlow Handoff

Prose context for the next human or agent belongs outside the block. The block
below is the authoritative, machine-readable lifecycle statement; a consumer
must never infer the next Story from list order or narrative text.

## Lifecycle

```yaml
workflow:
  current_story: ABC-001
  next_story: pending
  completed_stories: []
  status: ready_for_implementation

baseline:
  repository: owner/repository
  branch: main
  commit: 0000000000000000000000000000000000000000
  dirty_worktree: false
  story_owned_paths: []
  known_unrelated_paths: []

verification:
  last_command: make verify
  result: not_run
```

## Notes

* Use `none` for `current_story` when no Story is active and `pending` for
  `next_story` when selection has not been made.
* Record candidate Stories, if any, as prose here — never as `next_story`.
* Remote tag, Release, and CI state is time-sensitive evidence. Record only
  historical facts here and query the remote rather than treating this handoff
  as the long-term source of truth for current state.
