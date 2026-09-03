# ForgeFlow Handoff

This repository's own handoff, validated by `make verify` through
`scripts/handoff-check`. The block below is authoritative; the prose around it
is context only.

## Lifecycle

```yaml
workflow:
  current_story: none
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
    - FF-212
    - FF-213
    - FF-214
    - FF-215
  status: done

baseline:
  repository: CarlLee1983/ForgeFlowV2
  branch: main
  commit: e7021f37cb4945a2a2bf34918e5f833cc474ed04
  dirty_worktree: true
  story_owned_paths:
    - specs/handoff.md
  known_unrelated_paths: []

verification:
  last_command: make verify
  result: pass
```

## Notes

* FF-212 was merged in PR #5 as
  `94e7de17d753d3fd718314d604ccfcd808c95a47`.
* The corrective `v0.3.1` release was published from
  `1096ef5125f1e2d7c304f65d5c7405b76aadf335` after PR #6 merged its release
  preparation. The tag and GitHub Release both resolve to that baseline.
* FF-213 was merged in PR #7 and published as the documentation-only Corrective
  release `v0.3.2` from
  `7bbdf443ead484780e23df9abf055095d4c629e2`.
* The README hero image was added at
  `2e7677d25d3177410a38d446b4f9eebdd0d61d91` after that release.
* FF-214 adds repository-owned Code Quality Guidance, keeps `make verify` as the
  sole canonical gate, and hardens the TypeScript example against ESLint
  warnings. The Additive protocol version is now `0.3.3`; it has not been
  tagged or published.
* FF-215 adds optional Human Review Guidance and review-return transitions
  through existing lifecycle states. The Additive protocol version is now
  `0.3.4`; it has not been tagged or published. Automated verification has
  passed, and Human Review accepted the committed implementation on `main`, so
  the Story is DONE.
* Two behavioral narrowings from FF-212 that the callers cannot reach: the
  replaced `grep` predicates matched if any line of a multi-line value matched,
  and `AC-004` listed leading and trailing spaces the parser trims before either
  predicate is called.
* Still open, not selected: ForgeFlow installs no adoption marker for itself, so
  Doctor reports `Adopted version: UNKNOWN` against this repository. That is
  correct today and is recorded only so the gap is not mistaken for a defect.
