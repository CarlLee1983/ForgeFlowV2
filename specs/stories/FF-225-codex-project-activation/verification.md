# Verification Result: FF-225

Recorded after a complete root `make verify` on this working tree. The Story
declares `Risk level: high` and `Architecture impact: medium`, so the required
profile is `lint static unit integration contract e2e architecture`.

This repository has no dedicated contract or end-to-end command, so the Story's
own Verification Notes fix the honest mapping: the installer fixtures in
`tests/codex-activation.sh` are the `contract` layer against an adopter
repository, and the recorded C1-C11 Codex walkthrough is the `e2e` layer. The
walkthrough was recorded against this snapshot on 2026-09-07 and Carl accepted
it, so `e2e` passes and the four `human` criteria it carries pass with it.

`unit` and `contract` are separate cases rather than the same file counted
twice. Carl decided the split on 2026-09-07, and it is structural, not a
relabel: `invocation_and_marker_validation` decides the argument vector and the
adoption marker's format before the installer looks at a repository at all,
while the remaining cases install into and refuse against whole temporary
adopter repositories. Each layer therefore cites evidence the other does not.

## Checks

* lint: pass — `make verify-typescript`
* static: pass — `make verify-protocol`
* unit: pass — `./tests/codex-activation.sh FF225-AC-003 invocation_and_marker_validation`
* integration: pass — `make verify`
* contract: pass — `./tests/codex-activation.sh preview_and_install snapshot_updates unsafe_inputs failures_and_hardlinks legacy_compatibility against temporary adopted repositories`
* e2e: pass — `the C1-C11 fresh-session Codex walkthrough recorded in walkthrough-results.md against this snapshot`
* architecture: pass — `./scripts/story-check specs/stories/FF-225-codex-project-activation`

## Evidence

* `AC-001`: pass — `FF225-AC-001 preview_and_install`
* `AC-002`: pass — `FF225-AC-002 snapshot_updates`
* `AC-003`: pass — `FF225-AC-003 unsafe_inputs and FF225-AC-003 failures_and_hardlinks`
* `AC-004`: pass — `walkthrough-results.md C1-C2`
* `AC-005`: pass — `walkthrough-results.md C3-C4`
* `AC-006`: pass — `walkthrough-results.md C5-C8`
* `AC-007`: pass — `walkthrough-results.md C9-C11`
* `AC-008`: pass — `FF225-AC-008 legacy_compatibility`
* `AC-009`: pass — `make verify exited 0 on this tree; the human walkthrough half remains outstanding`
* `AC-010`: pass — `./scripts/story-check specs/stories/FF-225-codex-project-activation resolves ADR-002`

## Authority Used

* plan
* modify
* commit
* push

## Residual Risks

* `AC-007 passes on Carl's acceptance, but C9 was only partially met: the session did not reinstall and correctly continued unrelated work, yet surfaced the missing SKILL.md as one closing caveat rather than as a specific diagnosis with a proposed repair`
* `C6 and C7 each failed on their first attempt, ending inside a Codex collab_tool_call wait with no receiver and no turn.completed; both passed on re-run and the failed transcripts are retained, but session completion is not deterministic`
* `no case exercised a genuine skill-recall miss, so the explicit $forgeflow fallback was observed succeeding rather than rescuing a failure`
* `the walkthrough sessions were driven by an implementing agent; the human half of this evidence is Carl's acceptance of the recorded transcripts on 2026-09-07, not the act of running them`
* `make verify does not certify model behavior: installation is not proof that a given Codex prompt loads the local skill, and $forgeflow remains the explicit fallback`
* `the Security Fixture Matrix attributes the custom-prefix-and-suffix row to FF225-AC-001, but a fresh install prepends the managed block at byte zero, so the prefix half of that row is actually exercised by FF225-AC-002 snapshot_updates; the behavior is covered, the attribution is not exact`
* `the recorded snapshot checksums detect accidental drift only; someone with write access can edit an owned file and its recorded checksum together`
* `like bootstrap, the installer assumes a quiet target: it is not a sandbox against hostile concurrent writers and not a cross-file atomic transaction under power loss or SIGKILL`
* `ADR-002 is written as accepted but has not yet been through Human Review; its acceptance is Carl's decision at review time`
