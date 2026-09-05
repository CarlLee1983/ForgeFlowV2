# ForgeFlow Handoff

This repository's own handoff, validated by `make verify` through
`scripts/handoff-check`. The block below is authoritative; the prose around it
is context only.

## Lifecycle

```yaml
workflow:
  current_story: FF-221
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
    - FF-216
  status: review

baseline:
  repository: CarlLee1983/ForgeFlowV2
  branch: ff-217-221-contract-reliability-release
  commit: 23218d90375c57f9122187263bb0c631904c3e44
  dirty_worktree: true
  story_owned_paths:
    - specs/handoff.md
    - specs/stories/FF-221-release-036/task.md
  known_unrelated_paths: []

verification:
  last_command: make verify
  result: pass
```

## Notes

* Carl accepted FF-217 through FF-220 and explicitly authorized commit and full
  release on 2026-09-05. Their implementation passed full `make verify`, including
  local macOS /bin/sh and /bin/dash portability runs. They await GitHub merge
  policy, not Human Review acceptance, and are not marked DONE before merging.
* FF-221 prepares compatible 0.3.6 publication under docs/releasing.md. Full
  `make verify` and committed `make release-check` passed for baseline 23218d9.
  PR #9 is open: https://github.com/CarlLee1983/ForgeFlowV2/pull/9.
  At this checkpoint GitHub reports REVIEW_REQUIRED / BLOCKED and CI is running.
  This handoff update is a follow-up candidate; repeat release-check and inspect
  its exact-SHA CI before publication. No merge, tag or GitHub Release was made.
  Required GitHub PR approval must not be replaced by chat acceptance or bypassed.

* Authorized sequence: FF-217 Markdown parsing, FF-218 optional readiness,
  FF-219 bootstrap recovery, FF-220 shell portability, FF-221 release preparation.
* The starting worktree was clean; local and GitHub main both resolved to
  9ac8eb3b08ab41733afb96c2d9e6258d0421b370, VERSION 0.3.5. The baseline above
  now records the implementation commit; these paths record its handoff follow-up.
  This accepted release advances VERSION to 0.3.6.

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
* FF-214 delivered repository-owned Code Quality Guidance as protocol version
  `0.3.3`, kept `make verify` as the sole canonical gate, and hardened the
  TypeScript example against ESLint warnings.
* FF-215 delivered optional Human Review Guidance and review-return transitions
  through existing lifecycle states as protocol version `0.3.4`. The `v0.3.4`
  tag and GitHub Release were published from
  `8e0eb8c10bbd3d6d4d654de42ff7eee115d8c8a4` after Human Review accepted the
  committed implementation on `main`, so the Story is DONE.
* FF-216 corrects review-integrity and state-consistency guidance as protocol
  version `0.3.5`. Human Review accepted the Story, and PR #8 merged it into
  `main` as `473104a21a535c0739e01b6c47a48fef7ff13ec1`, so it is DONE.
* Release, tag, and CI state is remote and time-sensitive. Query it at decision
  time under `docs/releasing.md`; this handoff is not its long-term source of
  truth.
* Two behavioral narrowings from FF-212 that the callers cannot reach: the
  replaced `grep` predicates matched if any line of a multi-line value matched,
  and `AC-004` listed leading and trailing spaces the parser trims before either
  predicate is called.
* Still open, not selected: ForgeFlow installs no adoption marker for itself, so
  Doctor reports `Adopted version: UNKNOWN` against this repository. That is
  correct today and is recorded only so the gap is not mistaken for a defect.
