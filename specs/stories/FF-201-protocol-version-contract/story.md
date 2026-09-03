# Story: FF-201 Protocol Version Contract

## Goal

Give adopters one machine-readable ForgeFlow protocol version and a clear
compatibility policy for deciding whether an upgrade can affect their
repository contract.

## Context

ForgeFlow v0.1 describes its version in prose only. Protocol documents,
templates, and bootstrap behavior form an adopter-facing contract, but the
repository does not yet define which changes are compatible or where tooling
should read the current version.

## Classification

* Security sensitive: no
* Baseline conformance: no

## Scope

### In Scope

* Add a root `VERSION` file as the single version authority.
* Document the versioned surface and compatibility rules.
* Link the version policy from the public documentation.
* Verify the version format and required policy artifact.
* Set the completed Story pack's protocol version to `0.2.0`.

### Out of Scope

* Git tags, release automation, or changelog generation.
* Protocol negotiation or automated repository migration.
* A bootstrap `--version` option.
* Versioning private example packages as protocol releases.
* Multi-agent orchestration or runtime services.

## Inputs

* The repository's protocol documents, templates, bootstrap interface, and
  required repository surface.
* The version string stored in `VERSION`.

## Outputs

* A machine-readable current protocol version.
* A human-readable compatibility and release policy.
* Deterministic verification of version metadata.

## Rules

* R1: `VERSION` is the only authority for the current protocol version and
  contains exactly one `MAJOR.MINOR.PATCH` value without a `v` prefix.
* R2: The versioned surface includes protocol documents, required repository
  artifacts, distributed templates, and the public bootstrap interface.
* R3: Before 1.0, PATCH releases within one MINOR line are backward-compatible;
  a new MINOR line may contain documented breaking changes.
* R4: At and after 1.0, releases follow Semantic Versioning compatibility
  meanings.
* R5: Changes are classified as breaking, additive, or corrective, and breaking
  changes require migration guidance.
* R6: Git release tags use `vMAJOR.MINOR.PATCH` and must match `VERSION`, but the
  presence of `VERSION` alone does not publish a release.
* R7: Bootstrap installs a copy-time snapshot and does not negotiate or upgrade
  existing repositories.

## Expected Errors

* Verification fails when `VERSION` is missing, empty, multiline, or not in the
  required numeric Semantic Versioning form.
* An ambiguous compatibility impact is treated as potentially breaking until a
  human classifies it.

## Dependencies

* The v0.1 Story, verification, lifecycle, and repository contracts.
* Completion of FF-202 through FF-204 before the pack is reported as v0.2.

## Constraints

* Documentation must not create a second current-version authority.
* The policy must remain agent-, language-, and CI-provider-agnostic.
