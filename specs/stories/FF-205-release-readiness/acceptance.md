# Acceptance Criteria

## Happy Path

* [ ] AC-01: Root `make release-check` first runs canonical `make verify`, then
  runs one zero-argument local checker.
* [ ] AC-02: A clean committed repository with valid `VERSION` and no expected
  local tag passes and reports version, full HEAD SHA, expected tag,
  `local_tag=absent`, and that remote checks were not performed.
* [ ] AC-03: A lightweight or annotated expected tag resolving to HEAD passes
  idempotently and reports `local_tag=same-head`.

## Business Rules

* [ ] AC-04: `VERSION` is the only tag-name input, and the additive release
  change sets it to exactly `0.2.1` without changing existing `make verify` PASS
  semantics.
* [ ] AC-05: The checker derives its repository from its installed location,
  rejects arguments, and behaves consistently when invoked from another current
  working directory.
* [ ] AC-06: The checker performs no filesystem, index, ref, configuration,
  network, remote, GitHub, or release mutation.
* [ ] AC-07: The runbook preserves one candidate version/tag/SHA tuple through
  local PASS, exact-SHA CI, remote-state checks, explicitly authorized annotated
  tag publication, `gh release create --verify-tag`, and post-publication
  verification.

## Failure Cases

* [ ] AC-08: Missing or malformed `VERSION`, a non-Git directory, and an unborn
  repository fail with actionable diagnostics.
* [ ] AC-09: Staged, unstaged, untracked, deleted, renamed, conflicted, or dirty
  submodule state fails the strict clean-worktree check.
* [ ] AC-10: The expected tag resolving elsewhere or to a non-commit, and a
  different numeric release tag resolving to HEAD, fail without moving tags.
* [ ] AC-11: A failing `verify` prerequisite prevents the checker recipe from
  running.
* [ ] AC-12: Missing, partial, stale, or SHA-conflicting remote evidence is a
  documented stop condition and is never converted into local PASS.

## Regression Requirements

* [ ] AC-13: Focused tests use disposable Git fixtures and leave the ForgeFlow
  worktree, local refs, remotes, global Git configuration, and GitHub state
  unchanged.
* [ ] AC-14: Root `make verify` checks shell syntax, release-check behavior,
  Makefile wiring, required documentation, Story traceability, and all existing
  protocol, bootstrap, TypeScript, Go, and Actions behavior.

## Verification Notes

Run `sh -n scripts/release-check tests/release-check.sh`, then
`./tests/release-check.sh`, and finally root `make verify`. Run the live
`make release-check` only from a clean committed release candidate.
