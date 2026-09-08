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
    - FF-216
    - FF-217
    - FF-218
    - FF-219
    - FF-220
    - FF-221
    - FF-222
    - FF-223
    - FF-224
    - FF-225
    - FF-226
    - FF-227
  status: done

baseline:
  repository: CarlLee1983/ForgeFlowV2
  branch: ff-227-release-record
  commit: 51ab1f20defffc9477c02989989dcda244df791e
  dirty_worktree: true
  story_owned_paths:
    - specs/handoff.md
  known_unrelated_paths: []

verification:
  last_command: make verify
  result: pass
```

## Notes

* FF-227 is **implemented and awaiting Human Review**. Carl approved the Story
  on 2026-09-08 and directed implementation; that approval was recorded as
  `ready_for_implementation` in commit `5a8562d` before any code changed,
  following this branch's convention of recording authority before the
  operation. Carl authorized `push` and a pull request on 2026-09-08, recorded
  here and in the Story's `## Authority` before the branch was pushed, and then
  authorized merging and publishing `0.6.0`, recorded the same way before either
  operation. Authority used is `plan`, `modify`, `commit`, `push`, and
  `deploy`.
* `./scripts/verification-check --result specs/stories/FF-227-story-id-grammar`
  reports `VERIFICATION_PASS` with 7 of 7 criteria traced and all five required
  checks passing. Root `make verify` exits 0 on this tree, as do
  `make verify-portability` under `/bin/sh` and under `/bin/dash`. That is
  declared evidence only; Human Review still owns acceptance and the Story is
  not DONE.
* FF-227 gives ForgeFlow one Story ID grammar. `scripts/handoff-check` now
  accepts a subsystem segment, so `DBCLI-PLAT-001` is recordable;
  `scripts/story-check` now validates the Story ID its directory names, so a
  non-conforming ID is reported when the Story is written rather than when the
  handoff records it. The grammar is stated identically in `protocol/story.md`
  and `protocol/handoff.md`, and `tests/story-check.sh` `FF227-AC-005` feeds one
  shared corpus to both checkers and fails if they disagree. The pinned corpus
  in `tests/handoff-check.sh` `FF212-AC-004` was not edited and keeps every
  verdict, `FF-1-2` rejected included.
* The change is **Breaking** and advances `VERSION` to `0.6.0`, with migration
  guidance in `docs/releases/0.6.0.md` and `docs/upgrading.md`. The grammar
  itself only widens; the Breaking part is that `story-check` newly validates
  IDs. The 2026-09-07 survey found no non-conforming ID among the three
  adopters, so the guidance names the check to run rather than a known repair
  and does not present three repositories as a verified population.
* AC-004 was **amended on 2026-09-08 with Carl's decision**. As approved it
  required the directory `FF-1-2-x` to fail, which forces the Story ID to be the
  longest leading run of uppercase-and-digit segments. An independent code
  review found that rule absorbs a slug: `FF-232-API-limits` read as
  `FF-232-API` and `FF-115-3-way-merge` as `FF-115-3`, and both failed although
  `FF-232` and `FF-115` conform — a new class of false rejection inside a
  Breaking release. `FF-1-2-x` is structurally identical to
  `FF-115-3-way-merge`, so no rule rejects one and accepts the others. Carl
  chose the shortest-valid-prefix rule: the ID stops as soon as it is complete,
  so `FF-232-API-limits` names `FF-232` and `FF-1-2-x` names `FF-1` with the
  slug `2-x`. The amendment and its reasoning are recorded in the Story's
  `acceptance.md`. The ID grammar itself did not move: `FF-1-2` is still not a
  Story ID anywhere one is required.
* `scripts/story-check` now prints an `INFO` line naming the Story ID for every
  Story it checks. That is what makes an ambiguously named directory visible
  under the amended rule, and it is new output for every adopter.
* Two further corrections to the approved Story text, both decided by Carl on
  2026-09-08. AC-001's acceptance evidence named a single handoff carrying
  `DBCLI-PLAT-001` as current, next, and completed, which the Handoff Contract's
  own uniqueness rule forbids; the row now names three distinct `DBCLI-PLAT`
  IDs, one per position, which is what the test builds. And the Scope and R3
  statements described a middle segment only as one that "contains at least one
  uppercase letter", while the checkers also restrict it to uppercase letters
  and digits. Relaxing the checkers to the literal wording was tried and the
  whole suite stayed green, so the restriction was a free choice rather than a
  forced one; Carl kept it, because widening later is Additive and narrowing
  later is Breaking, and because a middle segment accepting arbitrary characters
  while the first and last segments do not is not one grammar. `FF-Plat-001` is
  rejected as a result. No code changed for either correction, and the Story now
  says what the implementation does.
* Ordering note: the `deploy` authority record precedes publication, as it did
  for FF-226 and unlike FF-224 and FF-225. Those Stories recorded it afterwards
  because the authority commit would have moved `main` and left the tag naming a
  commit CI had not verified. That constraint does not apply here either: this
  record lives on the Story branch, so the tag will name the CI-verified merge
  commit on `main`, not this one.
* FF-227 is **DONE and published as `0.6.0`**. Carl reviewed the work, directed
  the merge, and authorized publication on 2026-09-08. PR #21 was merged with
  `--admin`, which bypasses `main`'s one-approving-review requirement; that is
  how PRs #17, #19, and #20 also landed, and Carl's direction to merge is the
  Human Review the lifecycle requires.
* Publication evidence observed on 2026-09-08: PR #21 merged as
  `51ab1f20defffc9477c02989989dcda244df791e`, which is `main`; exact-SHA
  workflow 34185677376 completed successfully with a matching `headSha`; the
  remote annotated tag `b62669114b6a54edca4e25a7ea1fff3f7381060e` peels to that
  commit; and the GitHub Release `v0.6.0` is neither draft nor prerelease:
  https://github.com/CarlLee1983/ForgeFlowV2/releases/tag/v0.6.0. Remote state
  is time-sensitive; query it at decision time rather than trusting this record.
* Selection of the next Story is pending and is not implied by ordering. The
  adopter-migration problem is still the largest open lead and still has no
  Story: all three adopters sit at `0.3.x`, and an upgrade trial on an isolated
  copy of `Dbcli` produced `CONTRACT_DRIFT` with 23 Story-contract failures from
  the `0.4.0` acceptance-evidence change. `0.6.0` removes one obstacle on that
  path — the eight `DBCLI-PLAT-*` IDs are now recordable — and does not address
  the rest.
* FF-227 exists because a read-only survey on 2026-09-07 found that
  `scripts/story-check` and `scripts/handoff-check` disagree about what a Story
  ID is. `story-check` does not validate IDs at all; `handoff-check` requires
  `PREFIX-DIGITS`. A Story whose ID carries a subsystem segment therefore passes
  the Story Contract and can never appear in a conforming handoff. `Dbcli` holds
  eight such Stories, `DBCLI-PLAT-001` through `DBCLI-PLAT-013`.
* The same survey found the wider problem this Story deliberately does not
  solve. All three adopters are stale — `Dbcli` at `0.3.2`, `loop-apidoc` at
  `0.3.5`, `CMGMcp` at `0.3.6`, against ForgeFlow's `0.5.2` — and none has the
  FF-225 activation integration installed. An upgrade trial on an isolated copy
  of `Dbcli` produced `CONTRACT_DRIFT`: 23 Story-contract failures from the
  `0.4.0` Breaking acceptance-evidence change, plus an unrecognized
  `verification.detail` handoff key. That work is real, unaddressed, and out of
  FF-227's scope.
* The survey and the upgrade trial were read-only against the real repositories;
  the trial ran on a copy in a temporary directory. No adopter repository was
  modified.

* The baseline above is the complete FF-225 implementation commit. This
  handoff-only follow-up records it and is the single remaining dirty path.
* FF-226 is DONE. Carl reviewed PR #19 and merged it as
  `dddb698c0a415e532f4c01e00e7a2b0adf02042b`, which is now `main`, and accepted
  `ADR-003` separately. `./scripts/verification-check --result` reports
  `VERIFICATION_PASS`, 7 of 7 criteria traced. Selection of the next Story is
  pending and is not implied by ordering.
* FF-226 is published as `0.5.2`. Publication evidence observed on 2026-09-07:
  PR #19 merged as `dddb698c0a415e532f4c01e00e7a2b0adf02042b`, which is `main`;
  exact-SHA workflow 34139091680 completed successfully with a matching
  `headSha`; the remote annotated tag `126fe0c168196701513da16c07a2b92a8454f525`
  peels to that commit; and the GitHub Release `v0.5.2` is neither draft nor
  prerelease: https://github.com/CarlLee1983/ForgeFlowV2/releases/tag/v0.5.2.
  Remote state is time-sensitive; query it at decision time rather than trusting
  this record.
* Ordering note: unlike FF-224 and FF-225, the `deploy` authority record
  precedes publication here rather than following it. Those Stories recorded it
  afterwards because the authority commit would have moved `main` and left the
  tag naming a commit CI had not verified. That constraint did not apply this
  time: the record lives on this follow-up branch, so `main` stayed at the
  CI-verified merge commit the tag names. Authority used is `plan`, `modify`,
  `commit`, `push`, and `deploy`.
* FF-226 states that the five source-analysis checks are a scope boundary rather
  than deferred work, gives them one vocabulary and one complete list, renames
  the architectural sense of contract drift to `public interface drift` to end a
  collision with Doctor's unrelated `CONTRACT_DRIFT`, replaces an assertion that
  did not pin the paragraph it protected, and removes unread architecture
  accumulation from `scripts/verification-check`. Corrective for `0.5.2`.
* The Story exists because a request to "implement those four checks" could not
  be answered from any record. `ADR-003` now carries that decision. It was
  drafted `proposed` on purpose — the Story records a decision and does not
  accept it — and Carl accepted it on 2026-09-07 after reviewing the record in
  PR #19, which is the separate human act the Story argued for. The `mixed` task
  mode is what allowed the Story to reference the record while it was still
  proposed.
* `docs/releases/0.5.0.md` is deliberately unedited and pinned by `cksum` in
  `tests/protocol.sh`. Published release notes record what was said at the time;
  the correction is stated in `docs/releases/0.5.2.md` so both remain readable.
* FF-225 is DONE and published as `0.5.1`. Carl reviewed PR #17, merged it, and
  then directed the release, which is the Human Review decision the lifecycle
  requires; the merge-policy half is satisfied by the merge itself. Selection of
  the next Story is pending — it is not implied by ordering.
* `./scripts/verification-check --result` reports `VERIFICATION_PASS`.
* Publication evidence observed on 2026-09-07: PR #17 merged as
  `fe133421c15965935ff215827c24d3078b531f85`, which is now `main`; exact-SHA
  workflow 34130934115 completed successfully with `headSha` equal to that
  commit; the remote annotated tag `90cc6798f2c6f0e1a8a9b16e4caa6a828e72f1bb`
  peels to it; and the GitHub Release `v0.5.1` is neither draft nor prerelease:
  https://github.com/CarlLee1983/ForgeFlowV2/releases/tag/v0.5.1. Remote state is
  time-sensitive; query it at decision time rather than trusting this record.
* Ordering note: the `deploy` authority record was raised after publication
  rather than before it, unlike the `commit` and `push` grants on this Story.
  Carl chose the FF-224 precedent explicitly, for the same reason it was set:
  the tag has to point at the exact CI-verified commit, and recording first
  would have moved `HEAD` and invalidated that evidence. This follow-up does not
  change the released tag.
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
* Carl decided on 2026-09-07 to split the `unit` layer out of the fixture
  suite, and the split is structural rather than a relabel: a new
  `invocation_and_marker_validation` case decides the argument vector and the
  adoption marker's format before the installer looks at a repository, while the
  five remaining cases install into and refuse against whole temporary adopter
  repositories. Each layer now cites evidence the other does not, so the
  recorded result is `VERIFICATION_PASS` with all seven required checks passing
  and 10 of 10 criteria traced. That is declared evidence only; Human Review
  still owns product, design, and architecture acceptance, and the Story is not
  DONE.
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
