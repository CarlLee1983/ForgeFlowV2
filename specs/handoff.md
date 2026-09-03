# ForgeFlow Handoff

This repository's own handoff, validated by `make verify` through
`scripts/handoff-check`. The block below is authoritative; the prose around it
is context only.

## Lifecycle

```yaml
workflow:
  current_story: FF-210
  next_story: FF-211
  completed_stories:
    - FF-201
    - FF-202
    - FF-203
    - FF-204
    - FF-205
    - FF-206
    - FF-207
    - FF-208
    - FF-209
  status: ready_for_implementation

baseline:
  repository: CarlLee1983/ForgeFlowV2
  branch: feat/ff-210-adoption-marker
  commit: f14da0095cf04d42df3d7a82822e072639beba9e
  dirty_worktree: true
  story_owned_paths:
    - specs/stories/FF-210-adoption-snapshot-and-template-upgrade/
    - specs/stories/FF-211-doctor-contract-drift/
    - specs/handoff.md
  known_unrelated_paths: []

verification:
  last_command: make verify
  result: not_run
```

## Notes

* FF-209 completed with FF-208; PR #3 merged both into `main` as
  `f14da0095cf04d42df3d7a82822e072639beba9e`, which is this branch's baseline.
* FF-210 and FF-211 were approved together after a scope review. FF-210 lands
  first because FF-211 reads the adoption marker FF-210 installs.
* The worktree is dirty because the two approved Stories and this handoff are
  not yet committed; all three paths are Story-owned.
* `verification.result` is `not_run` for the FF-210 implementation. The last
  full `make verify` on this tree passed before implementation started.
