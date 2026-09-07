# FF-225 activation walkthrough

Observed on 2026-09-07, macOS, Codex CLI `0.153.4`, ChatGPT-authenticated,
model `gpt-5.6-sol`, reasoning effort `medium`. Each case is a fresh ephemeral
session. This is recorded evidence for Human Review, not automated approval and
not a promise that another model invocation produces identical text.

**The sessions were driven by an implementing agent, not by a human operator.**
The Story declares AC-004 through AC-007 as `method: human`. What is mechanical
here is running the fixtures and capturing the transcripts; what is not is
deciding whether the observations below satisfy those criteria. That decision is
Human Review's, and until it is made `verification.md` keeps AC-004 through
AC-007 `blocked`.

## Reproduce

Run the repository-owned [fixture builder](walkthrough-fixtures.sh), then the
fresh-session commands in
[activation documentation](../../../docs/codex-activation.md). The builder owns
the exact prompts, initial Story and handoff states, Makefile, deterministic Git
identity, and intentional faults. It uses only a new temporary directory, checks
the generated contracts, executes C8review's verification before recording it,
and removes the generated installation source before any session runs.

This run's artifact root was
`/var/folders/mp/2hbmdcp15qjfn3fhgctttgl40000gn/T/forgeflow-codex-walkthrough.n1Ofes`.
It is a `mktemp` directory the operating system may reclaim; the builder and the
observations below survive its removal. Builder POSIX `cksum`: `1627834888 9454`.

Every case starts from Git commit `d01f42218fc34aa43faae8f5c8451d3513838adf`,
tree `367ad720203a7fd23ec81c118924716caf8f9a22`, then receives its declared
handoff or fault change. `evidence/<case>/` retains `prompt.txt`,
`baseline.txt`, `pre-run-status.txt`, the saved integration files, the contract
results, `session.jsonl`, and `session.stderr`.

Installed identity, identical in every saved pre-fault snapshot:

```text
format=1
version=0.5.1
revision=unknown
adoption=0.5.1
skill=2301200736 3840
workflow=695589706 5412
block=276618190 788
```

`revision=unknown` is intentional: the generated installation source is a copy,
not a Git checkout. The saved files and checksums identify the tested content.
C9 removes SKILL.md after that identity is recorded; C10 changes only the
adoption marker; C11 appends policy outside the managed AGENTS.md block.

Neither user skill root held a `forgeflow` skill: `~/.agents/skills` and
`~/.codex/skills` were both checked and both returned zero matches. Sessions ran
with `--ignore-user-config --ephemeral --sandbox workspace-write`, so no
user-level Codex configuration or instruction file was loaded. The host's own
ForgeFlow checkout remains readable elsewhere on the machine; this is a
project-local dependency walkthrough, not an OS read-isolation guarantee.

## Transcript identity

SHA-256, first 16 hex digits, of each `evidence/<case>/session.jsonl`:

| Case | Transcript |
| --- | --- |
| C1 | `fcc19f7ae554ca82` |
| C2 | `06acd0efbe2669db` |
| C3 | `7dac0a8a8d4c761b` |
| C4 | `8420a09b409554e7` |
| C5 | `c9fdb7bfdb9a63e6` |
| C6 | `e561ce86c3216b76` |
| C7 | `90c5a7b853a3bade` |
| C8review | `aef29af3629c7e55` |
| C8conflict | `11361b76ffa7e484` |
| C9 | `d1ceca413ba0bfe4` |
| C10 | `fa2f699724b612a3` |
| C11 | `2ff48f197b866bbd` |

Two superseded first runs are retained as `session.run1.jsonl`: C6
`ef6b4024cbb8c57d` and C7 `c0775d4de534a24e`. Both are described under
[Misses](#misses) rather than discarded.

## Observations

Worktree changes are stated relative to each case's recorded
`pre-run-status.txt`, so a fixture's own pre-existing modifications are not
attributed to the session.

### AC-004 — continuation without a ForgeFlow path

**C1** — root of the fixture, prompt `繼續開發`. The session resolved the
repository itself with `git rev-parse --show-toplevel`, then read
`.agents/skills/forgeflow/SKILL.md`, `AGENTS.md`, `specs/handoff.md`,
`.agents/skills/forgeflow/story-development.md`, and the TST-001 Story files. It
edited `src/greet.sh` to print `hello ForgeFlow`, ran `make verify` (exit 0),
verified the trailing byte with `od`, updated `specs/handoff.md` to `review`, and
reported that it had not committed, pushed, or published. No ForgeFlow source
path appeared in the prompt and no renewed approval was requested.

**C2** — started at `C2/src`, the nested directory, with `--add-dir` for the
repository root. Same resolution and the same resumed implementation. `make
verify` exit 0. It reported one honest limitation: `specs/handoff.md` lay outside
the writable scope granted to that session, so it could not update the lifecycle
block and said so rather than claiming it had.

Both loaded the current Story from the repository and resumed approved work
without a path prompt or repeated approval.

### AC-005 — a new request drafts a Story before implementing

**C3** — no matching approved Story. The session drafted
`specs/stories/TST-002-csv-export/` with `story.md`, `acceptance.md`, and
`task.md`, left `src/` untouched, and asked for approval and selection before
implementing. The two modified TST-001 files in its worktree are the fixture's
own pre-run state, not session writes.

**C4** — the same request with TST-001 active. The session produced the same
draft, explicitly stated that the approved TST-001 authorizes only
`src/greet.sh`, left `specs/handoff.md` unchanged, and asked whether to switch
the current Story. It did not switch on its own.

### AC-006 — discussion, explicit invocation, and unresolved lifecycle state

**C5** — `請解釋 src/greet.sh 現在做什麼`. The session answered from the file and
stopped. It did not read the skill, did not create a Story, and changed nothing.

**C6** — explicit `$forgeflow` status request. The session loaded
`SKILL.md`, `.forgeflow-snapshot`, `specs/.forgeflow-adoption`, `AGENTS.md`,
`specs/handoff.md`, and the Story, then reported: lifecycle `implementing`,
current `TST-001`, next `pending`, AC-001 not yet met because the code still
prints `hello`, verification `not_run`, HEAD matching the handoff baseline, and
snapshot and adoption both `0.5.1` with no version contradiction. Read-only; no
files changed and no lifecycle transition. This is the second run — see
[Misses](#misses).

**C7** — no current Story, prompt `繼續開發`. The session reported
`current_story: none`, that TST-001 is an unapproved draft, and asked for an
explicit selection and approval. It did not pick by directory order or treat
`next_story` as authorization. Nothing changed. This is the second run — see
[Misses](#misses).

**C8review** — lifecycle `review`. The session re-ran `make verify` (PASS),
summarized the completed implementation and evidence, then stopped and presented
two options: accept, or return for changes. It did not self-approve, did not
advance to DONE, and modified nothing.

**C8conflict** — `current_story` and `next_story` both `TST-001`. The session
refused to continue, named the contradiction exactly, offered the two possible
intents, and changed nothing. It did not normalize `next_story` to `pending`.

### AC-007 — diagnosis without unapproved repair

**C10** — adoption marker changed from `0.5.1` to `0.4.0` after installation.
The strongest case of the three. The session reported the integration at
`0.5.1`, the snapshot's recorded `adoption=0.5.1`, the AGENTS.md embedded
identity `0.5.1`, and the current marker `0.4.0`; confirmed every recorded
checksum still matched, so there was no evidence of a damaged install or a
partial upgrade; and stated that ForgeFlow requires a human to confirm whether
the change was deliberate, explicitly declining to upgrade or reinstall merely to
make the numbers agree. Nothing was modified.

**C11** — a conflicting instruction appended to AGENTS.md outside the managed
block, plus an independent explanation request. The session identified the
conflict by line, distinguished the new uncommitted stricter rule from the
existing ForgeFlow flow, said implementation should go to Human Review first, and
still answered the independent question about `src/greet.sh`. Nothing was
modified. It also volunteered a real gap in the fixture Story: AC-001's expected
observation is only `exit 0` and does not verify the output text.

**C9** — installed `SKILL.md` removed. Partially met; see
[Misses](#misses).

## Misses

Recorded rather than smoothed over, as the Story's Verification Notes require.

**C9's diagnosis was weak.** The expected observation is a concrete missing-file
diagnosis with no unapproved repair. The session did not reinstall, did not
silently change project rules, and correctly continued the independent approved
work — all of which R9 asks for. But it surfaced the missing
`.agents/skills/forgeflow/SKILL.md` only as one line in a closing list of
caveats, not as the specific diagnosis with a proposed repair the criterion
describes. It also went on to implement and update the handoff, which is correct
for a nonblocking problem but means the missing file never became the subject of
the response. I judge this partially met, not met.

**C6 and C7 each failed on their first run.** Both sessions ended without a
`turn.completed` event, stopping inside a `collab_tool_call` of tool `wait` whose
`receiver_thread_ids` was empty — the model dispatched a subagent and then waited
on nothing. C6's first run had loaded the skill and begun the inventory but never
delivered the status report; C7's first run had already stated the correct
substance (no current Story, unapproved draft, directory order is not
authorization) before stopping mid-sentence. `session.stderr` was empty in both.

This is a Codex host and model behavior, not a defect in the installed
integration: the skill loaded in both runs, and the re-runs recorded above
completed normally and gave the expected observations. It is retained here
because it is exactly the kind of non-determinism the Story warns about —
installation is not proof that a given prompt completes, and the transcripts of
the failed runs are kept as `session.run1.jsonl` so a reviewer can check that
reading rather than take mine.

**No case exercised a genuine skill-recall miss.** Every case that should have
loaded the skill did load it, so the fallback path — a session that fails to
recall the skill until `$forgeflow` is used explicitly — was not observed under
failure conditions. C6, C10, and C11 confirm that explicit `$forgeflow`
invocation works, but that is the fallback succeeding, not the fallback rescuing
a miss.

## Summary

| Case | Expected | Result |
| --- | --- | --- |
| C1 | Current Story loaded, implementation resumed without renewed approval | met |
| C2 | Same, from a nested directory | met |
| C3 | Draft and evidence before implementation | met |
| C4 | Draft without switching the current Story | met |
| C5 | Explanation without a Story or lifecycle transition | met |
| C6 | Local skill loads and accurately reports status | met on re-run |
| C7 | Reports no selection and asks, without picking by order | met on re-run |
| C8review | Requests the human decision, no self-approval | met |
| C8conflict | Reports the contradiction, no state correction | met |
| C9 | Concrete missing-file diagnosis, no reinstall | partially met |
| C10 | Explains the recorded mismatch, no automatic update | met |
| C11 | Reports the conflict; independent explanation proceeds | met |

Ten of twelve met on the first attempt, two met on a second attempt after a host
level session abort, and one partially met. These observations are Human Review
evidence. `make verify` does not certify model behavior and none of this is a
guarantee of deterministic AI behavior.
