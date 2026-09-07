# Verification Result: FF-225

Recorded after a complete root `make verify` on this working tree. The Story
declares `Risk level: high` and `Architecture impact: medium`, so the required
profile is `lint static unit integration contract e2e architecture`.

This repository has no dedicated contract or end-to-end command, so the Story's
own Verification Notes fix the honest mapping: the installer fixtures in
`tests/codex-activation.sh` are the `contract` layer against an adopter
repository, and the recorded C1-C11 Codex walkthrough is the `e2e` layer. The
walkthrough has not been run against this snapshot, so `e2e` is `unsupported`
and the four `human` criteria it carries are `blocked`. `unit` is `unsupported`
for the same reason in reverse: the one fixture suite is already claimed as the
`contract` layer and is not counted twice. The result is therefore partial, not
a pass.

## Checks

* lint: pass — `make verify-typescript`
* static: pass — `make verify-protocol`
* unit: unsupported — `tests/codex-activation.sh is designated the contract layer by this Story, so counting it again as unit would give that layer no independent evidence; this repository has no level below the fixture suites`
* integration: pass — `make verify`
* contract: pass — `./tests/codex-activation.sh against temporary adopted repositories`
* e2e: unsupported — `the C1-C11 fresh-session Codex walkthrough requires a human operator and has not been run against this snapshot`
* architecture: pass — `./scripts/story-check specs/stories/FF-225-codex-project-activation`

## Evidence

* `AC-001`: pass — `FF225-AC-001 preview_and_install`
* `AC-002`: pass — `FF225-AC-002 snapshot_updates`
* `AC-003`: pass — `FF225-AC-003 unsafe_inputs and FF225-AC-003 failures_and_hardlinks`
* `AC-004`: blocked — `human walkthrough C1-C2 not yet recorded in walkthrough-results.md`
* `AC-005`: blocked — `human walkthrough C3-C4 not yet recorded in walkthrough-results.md`
* `AC-006`: blocked — `human walkthrough C5-C8 not yet recorded in walkthrough-results.md`
* `AC-007`: blocked — `human walkthrough C9-C11 not yet recorded in walkthrough-results.md`
* `AC-008`: pass — `FF225-AC-008 legacy_compatibility`
* `AC-009`: pass — `make verify exited 0 on this tree; the human walkthrough half remains outstanding`
* `AC-010`: pass — `./scripts/story-check specs/stories/FF-225-codex-project-activation resolves ADR-002`

## Authority Used

* plan
* modify
* commit

## Residual Risks

* `AC-004 through AC-007 are human evidence and are blocked until Carl records the C1-C11 walkthrough against this snapshot; the Story is not complete and must not be reported as passing`
* `the e2e layer is unsupported by this repository's automated commands, so the high-risk profile is not fully satisfied by make verify alone`
* `make verify does not certify model behavior: installation is not proof that a given Codex prompt loads the local skill, and $forgeflow remains the explicit fallback`
* `the Security Fixture Matrix attributes the custom-prefix-and-suffix row to FF225-AC-001, but a fresh install prepends the managed block at byte zero, so the prefix half of that row is actually exercised by FF225-AC-002 snapshot_updates; the behavior is covered, the attribution is not exact`
* `the recorded snapshot checksums detect accidental drift only; someone with write access can edit an owned file and its recorded checksum together`
* `like bootstrap, the installer assumes a quiet target: it is not a sandbox against hostile concurrent writers and not a cross-file atomic transaction under power loss or SIGKILL`
* `ADR-002 is written as accepted but has not yet been through Human Review; its acceptance is Carl's decision at review time`
