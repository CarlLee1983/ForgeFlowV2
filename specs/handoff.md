# ForgeFlow Handoff

This repository's own handoff, validated by `make verify` through
`scripts/handoff-check`. The block below is authoritative; the prose around it
is context only.

## Lifecycle

```yaml
workflow:
  current_story: FF-211
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
    - FF-209
    - FF-210
  status: review

baseline:
  repository: CarlLee1983/ForgeFlowV2
  branch: feat/ff-210-adoption-marker
  commit: 730a7828a3cca52770c58a145f43863cd98c02da
  dirty_worktree: true
  story_owned_paths:
    - scripts/doctor
    - tests/doctor.sh
    - docs/doctor.md
    - docs/contract-checks.md
    - protocol/versioning.md
    - specs/handoff.md
  known_unrelated_paths: []

verification:
  last_command: make verify
  result: pass
```

## Notes

* FF-210 is delivered on this branch and FF-211 continues on the same branch
  because it reads the adoption marker FF-210 installs.
* FF-211 is implemented and awaiting human review. Root `make verify` passes on
  this tree; the worktree is dirty only because FF-211 is not yet committed.
* A code review raised one CRITICAL and three HIGH findings, all fixed: static
  mode used `sed` and so aborted with no `Result` line under an empty `PATH`;
  an incomplete ForgeFlow checkout was reported as a target failure; the marker
  version was compared without the normalization `scripts/bootstrap` applies
  when it writes the file; and a refused Story path reported `NOT_CHECKED`
  instead of `ERROR`.
* Open, not in FF-211's scope: `scripts/story-check` and `scripts/handoff-check`
  use `grep`, `sort`, and `uniq`, so under an empty `PATH` `handoff-check`
  returns `HANDOFF_CONTRACT_INCOMPLETE` for a valid handoff. Composed by Doctor,
  that surfaces as a false `CONTRACT_DRIFT`. FF-211 cannot fix it because its
  `AC-012` requires both checkers to stay byte-identical.
