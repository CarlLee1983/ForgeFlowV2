# ForgeFlow Handoff

This repository's own handoff, validated by `make verify` through
`scripts/handoff-check`. The block below is authoritative; the prose around it
is context only.

## Lifecycle

```yaml
workflow:
  current_story: FF-225
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
    - FF-217
    - FF-218
    - FF-219
    - FF-220
    - FF-221
    - FF-222
    - FF-223
    - FF-224
  status: implementing

baseline:
  repository: CarlLee1983/ForgeFlowV2
  branch: ff-225-codex-project-activation
  commit: a336973b4227384c7c5b2079ddf3ca6f4798cf43
  dirty_worktree: true
  story_owned_paths:
    - specs/handoff.md
    - specs/stories/FF-225-codex-project-activation/verification.md
    - specs/stories/FF-225-codex-project-activation/walkthrough-results.md
  known_unrelated_paths: []

verification:
  last_command: make verify
  result: pass
```

## Notes

* The baseline above is the complete FF-225 implementation commit. This
  handoff-only follow-up records it and is the single remaining dirty path.
* FF-225 is IMPLEMENTED and awaiting Human Review. It is still deliberately
  **not** complete: `./scripts/verification-check --result` reports
  `VERIFICATION_PARTIAL`.
* The C1-C11 walkthrough was recorded on 2026-09-07 against this snapshot and
  Carl accepted it, so AC-004 through AC-007 and the `e2e` layer now pass and
  every acceptance criterion has a passing observation. The sessions were driven
  by an implementing agent using
  `specs/stories/FF-225-codex-project-activation/walkthrough-fixtures.sh`; the
  `human` half of that evidence is Carl's acceptance of the recorded
  transcripts, not the act of running them. Ten of twelve cases met their
  expected observation on the first attempt, C6 and C7 met theirs on a re-run
  after a Codex-side session abort, and C9 was only partially met. All three
  gaps are retained as residual risks rather than smoothed over.
* The one remaining reason the result is PARTIAL is the `unit` layer, recorded
  as `unsupported`. The Story's Verification Notes designate
  `tests/codex-activation.sh` as the `contract` layer, and counting the same
  file again as `unit` would give that layer no independent evidence. Splitting
  the suite — invocation and marker-format validation as `unit`, whole-repository
  installation as `contract` — would be a defensible reading that reaches PASS,
  but re-reading a layer mapping in order to turn a result green is the pressure
  the execution contract exists to resist, so it is left to Carl.
* An independent code review ran over the implementation before the commit and
  found no critical issue. Eight warnings were raised; seven are repaired here.
  The installer no longer claims a restore after a read-only preview refusal;
  the fixture manifest now compares mode and ownership, deliberately not link
  count, because documented recovery restores contents and existence rather than
  the original inode; `tests/codex-activation.sh` now accepts the `FF225-` AC ids
  its Acceptance Evidence names, asserts an external hard-link alias across a
  failed recovery, covers a legacy adoption with no marker, and compares Doctor's
  verdict either side of an install instead of inferring it. The eighth is
  recorded rather than fixed: the Security Fixture Matrix attributes the
  custom-prefix row to AC-001, but a fresh install prepends the block at byte
  zero, so the prefix half is exercised under AC-002. The behavior is covered and
  the attribution is not exact; correcting approved Story text is Carl's call.
* Root `make verify` exits 0 on this tree, as do `make verify-portability`
  under `/bin/sh` and under `/bin/dash`. FF-225's `--result` check is
  intentionally absent from the Makefile: adding a partial Story to the
  canonical gate would turn an honest partial into a red build. Run it by hand.
* FF-225 ports the implementation from the unmerged
  `docs/ff-222-release-completion` branch rather than merging it, exactly as the
  Story requires. The port re-IDs every test case to `FF225-`, copies
  `guidance/` into the installer fixtures for the merged FF-223 Guidance layer,
  and moves the fixture versions to the `0.5.x` line. That branch remains
  read-only source material, and the separate review-evidence documentation
  Story it carries is still unscheduled.
* FF-225 advances `VERSION` to `0.5.1` as an **Additive** change recorded in
  `protocol/versioning.md`, with release notes in `docs/releases/0.5.1.md`. No
  release has been prepared or published: `push` and `deploy` remain `no` in the
  Story's `## Authority`, and `verification.md` records only `plan` and `modify`
  under `## Authority Used`. `make release-check` on this branch will report that
  the expected tag does not resolve to HEAD, which is the normal pre-release
  state, not a defect.
* `specs/decisions/ADR-002-repository-local-pinned-activation-snapshot.md`
  satisfies AC-010 and is referenced from the Story's `## Architecture` as
  `* Decision: \`ADR-002\``. It is written with `Status: accepted` because an
  `execution` Story may only reference an accepted record; whether the decision
  is actually accepted is Carl's judgment at review, and that is recorded as a
  residual risk.

* FF-225 Codex Project Activation is READY. Carl approved the restated text on
  2026-09-07 and authorized committing the draft, so the Story's `## Authority`
  records `commit: yes`; `push` and `deploy` remain `no`.
* FF-225 restates work Carl approved on 2026-09-06 and implemented on the
  unmerged `docs/ff-222-release-completion` branch as `FF-223`. That branch is
  read-only source material, not a merge base: it targets `0.4.1`, its Story IDs
  collide with the merged FF-223 and FF-224, and it conflicts with `main` in
  eight files. Its second commit carries a separate review-evidence
  documentation Story that remains unscheduled.
* FF-225 declares `Risk level: high`, so its profile requires seven layers. This
  repository has no dedicated contract or e2e command; the Story's Verification
  Notes map the installer fixtures to `contract` and the recorded C1-C11 Codex
  walkthrough to `e2e`. A layer without real evidence is recorded as
  `unsupported` with a residual risk, never as a pass.
* AC-004 through AC-007 are `human` evidence requiring fresh Codex sessions.
  They cannot be produced by an implementing agent and gate completion.

* FF-224 implements execution governance and evidence-backed completion as the
  Additive protocol version `0.5.0`. Task mode, authority, architecture
  metadata, and risk are optional Story declarations; `specs/decisions/` holds
  ForgeFlow-native decision records; `scripts/verification-check` resolves the
  execution contract and judges a recorded `verification.md`. Every existing
  Story resolves to the documented defaults and keeps its previous verdict.
* The baseline is the complete FF-224 implementation commit above, on branch
  `ff-224-execution-governance`. This handoff-only follow-up records that
  baseline and is the single remaining dirty path. FF-224 deliberately changes
  one baseline behavior — the canonical `verify` dependency list pinned by
  `tests/portability.sh` FF220-AC-001 — and its `## Superseded Behavior`
  records that.
* Full `make verify` passed on this tree, as did
  `make verify-portability` under `/bin/sh` and `/bin/dash`. Human Review has
  not seen FF-224 yet.
* Carl accepted FF-224 on 2026-09-07 after reviewing the four judgment calls and
  the deliberate baseline replacement, and authorized push and a pull request.
  The Story's `## Authority` was raised from `commit: no` to `commit: yes` and
  then `push: no` to `push: yes` as each authorization was given, and
  `verification.md` records both under `## Authority Used`, so granted and used
  authority agree rather than an operation being performed outside the
  declaration. `deploy` remains `no`.
* FF-224 was merged and published on 2026-09-07. PR #15 merged as
  `d2194315bf17cbf31f8198271624477ddceca0d5`, which is now `main`. Carl then
  authorized the release, so the Story's `## Authority` was raised from
  `deploy: no` to `deploy: yes` and `verification.md` records `deploy` under
  `## Authority Used`.
* Publication evidence observed on 2026-09-07: exact-SHA workflow 34097692347
  completed successfully with `headSha` equal to the released commit; the remote
  annotated tag `e944b352e9913fd1393a428759d6e67715e07f44` peels to that commit;
  and the GitHub Release `v0.5.0` is neither draft nor prerelease:
  https://github.com/CarlLee1983/ForgeFlowV2/releases/tag/v0.5.0. Remote state
  is time-sensitive; query it at decision time rather than trusting this record.
* Ordering note: the authority record was raised after publication rather than
  before it, unlike the `commit` and `push` grants. The tag had to point at the
  exact CI-verified commit, and recording first would have moved `HEAD` and
  invalidated that evidence. This follow-up does not change the released tag.
* The earlier disclosure on FF-224's DONE record is now resolved: the
  merge-policy half is satisfied. It read: Carl's acceptance is the Human Review half
  of REVIEW -> DONE. The merge-policy half is outstanding at the time of
  writing — the pull request is open and unmerged, and `VERSION` is already
  `0.5.0` with `docs/releases/0.5.0.md` written while no `v0.5.0` tag or GitHub
  Release exists. Recording DONE ahead of the merge is Carl's decision, noted
  here so the state is not mistaken for a completed merge.
* FF-223 is DONE. Carl accepted it on 2026-09-07 and confirmed that acceptance
  again on 2026-09-07 after the merge-policy question was raised, which is the
  Human Review decision the lifecycle requires. PR #14 merged at
  `68d4a0b9a7127ed2ae80b82e28ec2ba0ec81da34`, that commit is an ancestor of this
  branch, and remote tag `v0.4.1` peels to it.
* One remote fact is unresolved and is deliberately not being reported as
  resolved: PR #14 still returns `reviewDecision: REVIEW_REQUIRED`. The PR is
  already merged, so this is a stale branch-protection record rather than a
  blocked merge, and no agent can clear it — GitHub refuses a self-approval from
  the PR author. Carl's acceptance is recorded here instead. Verified
  2026-09-07; remote state stays time-sensitive.
* FF-223 implements the additive Engineering Guidance Layer Phase 1 as `0.4.1`.
  Fresh bootstrap and explicit `--force` seed its four files; `--upgrade` never
  reads or writes repository/team-owned Guidance. Doctor reports absent Guidance
  as optional, a present partial baseline as drift, and unsafe paths as errors.
  The baseline is the complete accepted implementation commit
  `b7d6a0174bc84e2e765a46212dd449e1da53b2a1`. This handoff-only follow-up records that baseline;
  the release candidate is clean after committing this record. `make verify` passed after the implementation and
  behavioral corrections; the final declaration-only evidence and handoff
  updates are attributed here and checked narrowly.
* Correction: an earlier note here claimed FF-222 remained in REVIEW and was not
  recorded as completed, which contradicted this handoff's own lifecycle block.
  FF-222 is DONE. PR #11 merged as
  `998c63fd6b530b9b15ced35a4a118b41916c79fa` on 2026-09-05, the remote
  annotated tag `v0.4.0` peels to that exact commit, and it is an ancestor of
  this branch. Verified on 2026-09-07; remote state stays time-sensitive.

## Historical FF-222 and release notes

* Carl authorized commit and release on 2026-09-06. The release candidate
  includes FF-222 and the reviewed optional Agentic Discipline documentation.
  Acceptance review found trailing content accepted after the fifth evidence
  column and a test coupled to the live Story. Both are repaired; the new
  regression failed before the parser fix, and independent re-review confirmed
  both findings resolved. Full `make verify` passed after the fixes.
* Carl merged PR #11 at the baseline above on 2026-09-06 (Asia/Taipei).
  FF-222 is DONE; selection of the next Story is pending. The merged SHA passed
  full local `make release-check` before and after annotated-tag creation.
  Exact-SHA workflow 33980677522 passed Linux canonical verification, macOS
  `/bin/sh`, and Ubuntu `/bin/dash` portability.
* v0.4.0 was published on 2026-09-06 (Asia/Taipei):
  https://github.com/CarlLee1983/ForgeFlowV2/releases/tag/v0.4.0.
  Post-publication inspection confirmed remote annotated tag
  `9065cab4a06697ea63a353da966d3807cbf21bb2` peels to the baseline SHA, and the
  Release is neither draft nor prerelease. These are historical observations.
* This two-file documentation follow-up records completion after publication.
  Its baseline is the released commit; it does not change the released tag.

* Carl accepted FF-217 through FF-220 and explicitly authorized commit and full
  release on 2026-09-05. Carl then merged PR #9 at
  4d6dc963defde7fb93e08009730f40488284b592; FF-217 through FF-221 are DONE.
* The merged SHA passed full `make release-check` both before and after creating
  the annotated tag. Exact-SHA workflow 33933039270 passed Linux canonical,
  macOS /bin/sh and Ubuntu /bin/dash jobs.
* v0.3.6 was published on 2026-09-05. The annotated remote tag peels to the
  baseline commit and the GitHub Release is neither draft nor prerelease:
  https://github.com/CarlLee1983/ForgeFlowV2/releases/tag/v0.3.6.
  These are historical observations, not substitutes for future remote checks.
* This documentation-only follow-up records completion after publication; it
  does not change the released tag or require another release. Its six owned
  paths update the accepted Story records and handoff through the normal PR flow.

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
