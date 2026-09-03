# ForgeFlow Handoff

This repository's own handoff, validated by `make verify` through
`scripts/handoff-check`. The block below is authoritative; the prose around it
is context only.

## Lifecycle

```yaml
workflow:
  current_story: FF-212
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
    - FF-211
  status: ready_for_implementation

baseline:
  repository: CarlLee1983/ForgeFlowV2
  branch: feat/ff-212-builtin-contract-checks
  commit: 96df251e69232507602aa65dabfa30d1b3b41497
  dirty_worktree: true
  story_owned_paths:
    - specs/stories/FF-212-checkers-without-external-utilities/
    - specs/handoff.md
  known_unrelated_paths: []

verification:
  last_command: make verify
  result: not_run
```

## Notes

* FF-210 and FF-211 shipped in `v0.3.0`, published from
  `7e2299971b07afdc925d141e17d87fb5a0908d15` on `main`, which is this baseline.
* FF-212 was approved from the first candidate recorded after that release: both
  contract checkers call external utilities, so under an empty `PATH`
  `handoff-check` reports `HANDOFF_CONTRACT_INCOMPLETE` for a valid handoff and
  Doctor composes that into a false `CONTRACT_DRIFT`.
* The worktree is dirty because the approved Story and this handoff are not yet
  committed; both paths are Story-owned.
* `verification.result` is `not_run` for the FF-212 implementation. Root
  `make verify` passed on the baseline commit.
* Still open, not selected: ForgeFlow installs no adoption marker for itself, so
  Doctor reports `Adopted version: UNKNOWN` against this repository. That is
  correct today and is recorded only so the gap is not mistaken for a defect.
