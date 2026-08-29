# Story: FF-204 Repository Linux CI Coverage

## Goal

Run ForgeFlow's canonical verification gate on a clean Linux GitHub Actions
runner for pull requests and pushes.

## Context

ForgeFlow distributes a generic Ubuntu CI template, but this repository has no
workflow of its own and the v0.1 gate has only been exercised locally on macOS.
The repository-specific workflow must install its real toolchains and locked
dependencies before invoking the same root gate used locally.

## Scope

### In Scope

* Add `.github/workflows/verify.yml` for the ForgeFlow repository.
* Use an Ubuntu runner with minimal permissions and a bounded timeout.
* Set up supported Node, exact pnpm, and Go toolchains from repository metadata.
* Install locked TypeScript and Go dependencies.
* Invoke root `make verify` without duplicating its checks in workflow YAML.
* Add deterministic static validation for the repository workflow.

### Out of Scope

* macOS or Windows matrices.
* Deployment, release, secrets, or branch-protection changes.
* Removing the adopter-facing generic CI template.
* CI-provider abstraction or a hosted ForgeFlow service.

## Inputs

* Pull-request and push events.
* Toolchain and dependency metadata committed in the repository.

## Outputs

* A repository-specific Ubuntu verification job.
* A GitHub check whose success means root `make verify` exited successfully.

## Rules

* R1: The job has only `contents: read` permission and a finite timeout.
* R2: Third-party actions are pinned to immutable commit SHAs.
* R3: TypeScript dependencies use the frozen lockfile and the exact declared
  pnpm version; Go setup uses `go.mod`.
* R4: The workflow calls root `make verify` as the review-readiness interface
  and does not duplicate its constituent test commands.
* R5: Setup, dependency installation, or verification failure fails the job;
  no fallback or `continue-on-error` may hide a failure.
* R6: The generic template remains language- and repository-agnostic rather
  than mirroring this repository's setup steps.

## Expected Errors

* Toolchain setup, dependency download, or any canonical gate failure produces
  a failed Actions job.
* Static workflow validation fails for invalid Actions syntax or a missing root
  verification invocation.

## Dependencies

* FF-201 through FF-203 repository artifacts and gates.
* GitHub-hosted Actions for a real remote Linux execution.

## Constraints

* Adding or validating the workflow does not authorize creating a remote,
  pushing, or changing GitHub settings.
* A local static PASS is not reported as a real GitHub Actions run.
