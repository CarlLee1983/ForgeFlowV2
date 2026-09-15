# Story: TST-017 Release-Check Compatibility Entrypoint Switch

## Goal

Make the repository's `make release-check` select the TypeScript local release
inspector by default while preserving its existing six-line success output,
verification ordering, exit and safety contract, and a reversible shell
selection path.

## Context

GitHub issue #42 follows TST-011's completed TypeScript release inspection and
the revised TST-016 packed process consumer contract. The root Make target
currently runs canonical `verify` before `./scripts/release-check`; direct
shell callers remain portable. The TypeScript CLI has passing local release
parity but its human success output is one line rather than the shell checker's
six fields. On 2026-09-15 the human owner explicitly approved a default
TypeScript switch with the old output preserved and a legacy rollback
selection. A Make-owned JSON process adapter provides that compatibility
without changing the TypeScript package's public human renderer.

## Classification

* Security sensitive: yes
* Baseline conformance: yes
* Task mode: execution

## Authority

* plan: yes
* modify: yes
* add_dependency: no
* migration: no
* commit: no
* push: no
* deploy: no

## Architecture

* Impact: high
* Boundary: `root make release-check entrypoint`
* Boundary: `TypeScript CLI JSON process adapter`
* Boundary: `retained shell release checker`
* Contract: `canonical verify completes exactly once before one selected local inspection; failed verification prevents inspection`
* Contract: `the adapter validates the versioned JSON envelope and actual child exit before projecting typed release data into the legacy six-line success output`
* Contract: `an explicit legacy selector invokes the unchanged shell checker; no automatic fallback or target mutation occurs`
* Owner: `root make release-check entrypoint = PraxisBound maintainers`
* Owner: `TypeScript CLI JSON process adapter = PraxisBound tooling`
* Owner: `retained shell release checker = PraxisBound maintainers`

## Risk

* Level: high
* Reason: `public-contract`
* Signal: `error-projection`

## Error Projection

* Source failure: `unsupported or malformed child JSON, child exit mismatch, invalid typed release data, unknown implementation selector, or diagnosed local release failure`
* Public projection: `no success record; a sanitized release-check failure on stderr with selected-process exit 1, except unknown selector process exit 2; Make reports a failed recipe`
* Detail policy: `never parse or forward child human stdout, raw Git diagnostics, hostile JSON data, or child stderr as a machine result`
* Evidence AC: `AC-003`

## Scope

### In Scope

* Select the built TypeScript `praxisbound release check --json` process from
  the root Make target after its unchanged `verify` prerequisite, passing the
  physical PraxisBound worktree root explicitly.
* Project a validated `RELEASE_READY` envelope into the shell checker's exact
  six success lines. Project typed negative results to safe nonzero diagnostics;
  reject malformed, unsupported, or exit-mismatched child results.
* Keep an explicit `legacy` selection that invokes the unchanged
  `./scripts/release-check` throughout the TST-017 deprecation period.
* Prove selection, verification ordering, failure short-circuit, success output,
  error projection, parity, disposable adoption, and full repository gates.
* Document classification, TypeScript selection, legacy rollback, and the
  deprecation period ending only when a separately approved TST-018 satisfies
  the Legacy Removal Gate.

### Out of Scope

* Changing `scripts/release-check`, the public TypeScript CLI command or
  renderer, Protocol or templates, another command default, npm publication,
  remote release checks, or legacy implementation removal.
* A silent Node requirement for direct shell callers, dependency addition,
  repository mutation, commit, push, deployment, or migration.

## Inputs

* The canonical `make verify` result, one implementation selector, and the
  physical PraxisBound repository root.
* The built TypeScript CLI, its published schema version, child process exit,
  and one typed JSON release result.
* The retained shell checker for explicit rollback and parity fixtures.

## Outputs

* On a valid ready result, the existing `release check passed`, `version=`,
  `commit=`, `expected_tag=`, `local_tag=`, and
  `remote_checks=not-performed` stdout records in their current order.
* On a failure, a sanitized diagnostic without a success record; the selected
  checker's release failure process exit remains `1`.
* A recorded fixed parity checkpoint and selection/rollback guidance.

## Rules

* R1: `release-check: verify` remains the only Make ordering seam. Exactly one
  inspection runs after successful verification; none runs after failure.
* R2: The default selects the TypeScript JSON process. `legacy` selects the
  unchanged shell checker. Unknown selectors fail closed; no automatic fallback
  occurs.
* R3: The adapter requires exactly one JSON envelope, supported schema and
  Protocol versions, a release subject and valid typed outcome, and envelope
  exit equal to the actual child exit before using any release data.
* R4: Success requires exact typed version, commit, expected tag, local tag,
  and `remoteChecks=not-performed` values. The six emitted lines come only from
  those fields, never from presentation messages.
* R5: Negative release outcomes never emit success fields. The adapter exposes
  stable issue/error codes only and does not perform Git, network, publication,
  or target mutation itself.
* R6: The Make target's supported command, success output, normalized exit, and
  safety behavior remain compatible. This is a Corrective implementation
  selection with an Additive rollback selector, not a change to versioned
  `protocol/` or `templates/` artifacts.

## Expected Errors

* A failed canonical verification stops before either checker.
* An unknown selector exits nonzero before inspection. Missing, malformed, or
  multiple JSON values; an unsupported version; invalid ready data; a missing
  process exit; or a child/envelope exit mismatch fails closed without invoking
  the shell fallback.
* A diagnosed `RELEASE_INCOMPLETE`, typed child error, or compatibility failure
  returns selected-process exit `1`, preserving the old checker's release-failure
  category. The child envelope and actual exit retain their distinct `1`,
  `2`, or `3` categories internally. Raw child wording is not used for
  decisions or echoed as evidence.

## Dependencies

* TST-011's guarded TypeScript local release inspection and retained shell
  parity fixtures.
* TST-015's packed CLI and clean-consumer observations.
* TST-016's revised packed process contract; its optional ForgePilot live check
  is not a prerequisite.
* A fixed, passing pre-switch release-parity checkpoint and the owner's explicit
  2026-09-15 approval of output compatibility and rollback.

## Constraints

* Add no dependency and do not commit, push, deploy, migrate, publish, or run a
  remote release check.
* Keep all candidate subjects disposable in tests; never use this repository's
  own Stories, handoff, or dirty worktree as a release fixture.
* Preserve the retained shell checker and unrelated uncommitted TST-016 work.

## Guidance

Relevant:

* principle: small coherent changes
* principle: explicit dependencies
* principle: behavior-oriented testing

Not applicable:

* no persistent-data migration applies; rollback selects the existing shell
  checker without data conversion

## Trust Boundary Fields

* `release.implementation-selector` — caller-selected Make implementation
* `release.repository-root` — physical path supplied to the child CLI
* `release.child-stdout` — process-produced JSON or malformed output
* `release.child-stderr` — process-produced presentation or Git diagnostic
* `release.child-exit` — actual process completion status or signal
* `release.schema-version` — externally read envelope compatibility value
* `release.protocol-version` — externally read envelope compatibility value
* `release.status-outcome-issues` — externally read typed result category
* `release.data` — externally read version, commit, tag, and remote-check fields

## Superseded Behavior

* `Makefile release-check recipe invoking ./scripts/release-check by default`
  — TypeScript becomes the default after canonical verification; explicit
  `legacy` selection and direct shell invocation retain the old checker.
