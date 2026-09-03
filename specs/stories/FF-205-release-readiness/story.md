# Story: FF-205 Release Readiness

## Goal

Give a ForgeFlow maintainer one repeatable local release-readiness command and
an explicit manual runbook for publishing the exact verified revision.

## Context

ForgeFlow v0.2.0 defines the version and tag contract, but its first publication
required ad hoc local Git and GitHub checks. Maintainers need one deterministic
local readiness interface without turning publication into automation or
claiming that local evidence proves remote state.

## Classification

* Security sensitive: no
* Baseline conformance: no

## Scope

### In Scope

* Add a zero-argument root `make release-check` interface.
* Compose the existing canonical `make verify` gate before local release checks.
* Validate the release candidate's committed `VERSION`, `HEAD`, clean worktree,
  and local release-tag consistency without changing them.
* Document the ordered human checks and commands for exact-revision CI, remote
  tag, and GitHub Release publication.
* Add isolated temporary-Git regression coverage.
* Classify the optional capability as additive and set `VERSION` to `0.2.1`.

### Out of Scope

* Creating, moving, deleting, or pushing Git tags.
* Fetching remotes or invoking `gh` from the readiness checker.
* Creating, updating, or deleting GitHub Releases.
* Release automation, changelog generation, signing, or deployment.
* Changing the existing `make verify` PASS semantics.
* Requiring adopting repositories to install this maintainer command.

## Inputs

* The repository root `VERSION` file.
* The current local Git `HEAD`, worktree, index, submodule, and tag state.
* The existing root `make verify` result.
* Human-reviewed GitHub Actions, remote tag, and GitHub Release evidence.

## Outputs

* A zero or nonzero local readiness result with a concise diagnostic.
* On success, the candidate version, full commit SHA, expected tag, local tag
  state, and an explicit reminder that remote checks were not performed.
* A manual release runbook that preserves the same version/tag/SHA identity
  through remote verification and publication.

## Rules

* R1: `make release-check` runs the canonical `verify` target before the local
  checker, and verification failure prevents the checker from running.
* R2: The local checker takes no arguments and resolves the repository root from
  its own installed location rather than the caller's working directory.
* R3: `VERSION` remains the single version authority and must contain exactly one
  canonical numeric `MAJOR.MINOR.PATCH` line. The expected tag is exactly
  `v<VERSION>`.
* R4: The candidate has a commit-resolvable `HEAD` and a strictly clean worktree
  after verification, including the index, untracked files, and submodules.
* R5: An absent expected local tag is ready as an untagged candidate. A
  lightweight or annotated expected tag that resolves to `HEAD` is ready as an
  idempotent same-HEAD check.
* R6: Readiness fails when the expected tag does not resolve to a commit at
  `HEAD`, or when another numeric `vMAJOR.MINOR.PATCH` tag points at `HEAD`.
* R7: The checker is read-only and performs no network, remote, GitHub, tag,
  index, worktree, commit, or Git-configuration mutation.
* R8: Local PASS is necessary but insufficient for publication. The runbook
  requires human confirmation of the same candidate version, tag, and SHA,
  successful exact-SHA CI, consistent remote tag/release state, and explicit
  authorization before publication.
* R9: The release-readiness capability is additive, keeps existing adopters and
  `make verify` behavior valid, and advances the protocol version to `0.2.1`.

## Expected Errors

* Invalid invocation exits nonzero without inspecting or changing release state.
* Missing, empty, multiline, prefixed, leading-zero, or otherwise malformed
  `VERSION` fails with a version diagnostic.
* A non-Git directory, unborn or non-commit `HEAD`, dirty repository, conflicting
  expected tag, or mismatched release tag fails closed with a local diagnostic.
* Canonical verification failure remains the original `make` failure and does
  not proceed to the checker.
* Partial, stale, or conflicting remote evidence stops the manual runbook.

## Dependencies

* The FF-201 version and compatibility contract.
* The root canonical verification gate and repository Git history.
* POSIX shell, Make, Git, and authenticated `gh` for the human remote steps.

## Constraints

* The checker must remain POSIX-shell compatible and non-interactive.
* Tests must use isolated temporary repositories and never change real tags,
  remotes, releases, global Git configuration, or user-owned files.
* Stable behavior is the zero/nonzero result and actionable diagnostics; exact
  prose and granular exit-code taxonomy are not machine interfaces.
* Publication remains a human-authorized operation outside `make release-check`.
