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
  status: review

baseline:
  repository: CarlLee1983/ForgeFlowV2
  branch: feat/ff-212-builtin-contract-checks
  commit: 96df251e69232507602aa65dabfa30d1b3b41497
  dirty_worktree: true
  story_owned_paths:
    - scripts/story-check
    - scripts/handoff-check
    - tests/story-check.sh
    - tests/handoff-check.sh
    - tests/doctor.sh
    - docs/contract-checks.md
    - docs/doctor.md
    - specs/handoff.md
  known_unrelated_paths: []

verification:
  last_command: make verify
  result: pass
```

## Notes

* FF-210 and FF-211 shipped in `v0.3.0`, published from
  `7e2299971b07afdc925d141e17d87fb5a0908d15` on `main`, which is this baseline.
* FF-212 is implemented and awaiting human review. Root `make verify` passes on
  this tree; the worktree is dirty only because FF-212 is not yet committed.
* Two behavioral notes the Story's `R2` "exactly" wording does not cover, both
  recorded rather than changed:
  * The replaced `grep` predicates matched if any line of a multi-line value
    matched, so `A-1` followed by a newline was accepted as a Story ID. The
    builtin predicates reject an embedded newline. Both callers receive values
    from `while IFS= read -r` loops, so no such value can reach them; the new
    behavior is strictly narrower and unreachable.
  * `AC-004` lists a leading and a trailing space as must-reject Story ID forms.
    The parser trims both before either predicate is called, so neither is
    reachable at the checker's public seam and no case asserts them.
* A code review found no CRITICAL or HIGH defect. Equivalence was established by
  running 52,281 inputs through the old regular expressions and the new
  predicates under `dash`, `bash`, `zsh`, and `ksh` with no disagreement.
* Still open, not selected: ForgeFlow installs no adoption marker for itself, so
  Doctor reports `Adopted version: UNKNOWN` against this repository. That is
  correct today and is recorded only so the gap is not mistaken for a defect.
