# ForgeFlow Handoff

This repository's own handoff, validated by `make verify` through
`scripts/handoff-check`. The block below is authoritative; the prose around it
is context only.

## Lifecycle

```yaml
workflow:
  current_story: FF-209
  next_story: pending
  completed_stories:
    - FF-201
    - FF-202
    - FF-203
    - FF-204
    - FF-205
    - FF-206
    - FF-207
    - FF-208
  status: review

baseline:
  repository: CarlLee1983/ForgeFlowV2
  branch: main
  commit: a5e061a995640c7e1d6b33c53a526d79c9bc794f
  dirty_worktree: true
  story_owned_paths:
    - Makefile
    - README.md
    - VERSION
    - docs/contract-checks.md
    - docs/getting-started.md
    - protocol/handoff.md
    - protocol/lifecycle.md
    - protocol/story.md
    - protocol/versioning.md
    - scripts/handoff-check
    - scripts/story-check
    - skills/story-development/SKILL.md
    - specs/handoff.md
    - specs/stories
    - templates
    - tests/handoff-check.sh
    - tests/protocol.sh
    - tests/story-check.sh
    - examples/go/specs/stories/ORD-001-order-total/story.md
    - examples/typescript/specs/stories/TYP-001-order-total/story.md
  known_unrelated_paths: []

verification:
  last_command: make verify
  result: pass
```

## Notes

* FF-208 and FF-209 were implemented together because the Story contract check
  and the handoff contract check share verification wiring; FF-208 is complete
  and FF-209 is awaiting human review.
* The baseline commit is the last commit on `main`; every listed Story-owned
  path is still uncommitted working-tree work for FF-208 and FF-209.
* No next Story has been selected. Candidates are recorded here as prose, never
  as `next_story`.
