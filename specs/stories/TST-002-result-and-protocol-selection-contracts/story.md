# Story: TST-002 Result and Protocol Selection Contracts

## Goal

Provide a consumable Core result model and deterministic Protocol selection so
later TypeScript command migrations share one validated machine contract.

## Context

GitHub issue #27 follows the completed local TST-001 package foundation. The
legacy shell tools expose stable human-readable results and exit statuses but no
shared JSON envelope, Protocol selector, or tooling-capability interface. This
Story introduces those contracts without migrating a domain command or changing
the legacy tools.

## Classification

* Security sensitive: no
* Baseline conformance: no
* Task mode: execution

## Authority

* plan: yes
* modify: yes
* add_dependency: no
* migration: no
* commit: yes
* push: no
* deploy: no

## Architecture

* Impact: high
* Boundary: `Core result envelope`
* Boundary: `Core Protocol selection`
* Boundary: `CLI machine serialization`
* Contract: `Core validates one versioned result envelope and rejects unknown or inconsistent values without coercion`
* Contract: `Protocol selectors resolve only an exact supported version and never inspect or upgrade a repository`
* Contract: `CLI serializes validated Core envelopes deterministically through its package root`
* Owner: `Core result envelope = ForgeFlow TypeScript Core`
* Owner: `Core Protocol selection = ForgeFlow TypeScript Core`
* Owner: `CLI machine serialization = ForgeFlow TypeScript CLI`

## Risk

* Level: high
* Reason: `public-contract`

## Scope

### In Scope

* Add the public Core types and validator for the canonical result envelope.
* Add exact Protocol selection for current, adopted, and explicit selectors.
* Add immutable tooling capabilities for the implemented Protocol and result
  schema versions and supported Protocol range.
* Add deterministic CLI package-root JSON serialization for valid envelopes.
* Publish the new Core and CLI interfaces in their package READMEs.
* Add positive, negative, selector, serialization, and packed-export tests.

### Out of Scope

* Story, Handoff, Doctor, verification, release, init, activation, or other
  domain-command behavior.
* A new executable command, JSON argument parser, human renderer, filesystem
  adapter, or repository inspection.
* Automatic Protocol upgrade, nearest-version fallback, or a second supported
  Protocol implementation.
* A third-party runtime dependency, ForgePilot change, package publication, or
  change under `protocol/` or `templates/`.

## Inputs

* Unknown JavaScript values presented for result-envelope validation.
* Current, adopted, or explicit Protocol selector values supplied by a caller.
* Validated result envelopes presented to the CLI serializer.

## Outputs

* A validated canonical result envelope or structured validation issues.
* A resolved exact Protocol version or a typed selection error.
* Immutable tooling capability metadata.
* One deterministic newline-terminated JSON object for a valid envelope.

## Rules

* R1: Result schema version `1.0.0` and implemented Protocol version `0.9.0`
  are independent strict numeric `MAJOR.MINOR.PATCH` values without prefixes,
  prerelease identifiers, build metadata, or leading zeroes.
* R2: A result envelope contains exactly `schemaVersion`, `protocolVersion`,
  `status`, `outcome`, `exit`, `subject`, optional `path`, and `issues`. Each
  issue contains exactly `code`, `message`, optional `path`, and optional
  `subject`; unknown properties fail validation.
* R3: The only valid status, outcome, and exit combinations are
  `pass/success/0`, `fail/failure/1`, `warning/warning/0`,
  `error/usage-error/2`, `error/configuration-error/2`, and
  `error/internal-error/2`.
* R4: A subject is a lowercase kind optionally followed by one colon and a
  non-empty ASCII identifier. A path is a normalized non-empty relative POSIX
  path with no empty, dot, or parent segment, backslash, control character, or
  leading slash. The same rules apply to envelope and issue fields.
* R5: Issue codes are uppercase underscore-separated identifiers and messages
  are non-empty single-line strings. Issues retain caller order.
* R6: The supported Protocol range is inclusive and exact: minimum `0.9.0` and
  maximum `0.9.0`. Envelope Protocol versions and adopted or explicit selector
  versions must be strict SemVer within that range.
* R7: `current` resolves the implemented Protocol version. `adopted` and
  `explicit` require a supplied version. Missing, malformed, unknown, or
  unsupported selectors return a discriminated typed error and never throw,
  coerce, read a repository, or choose a nearby version.
* R8: Tooling capabilities report result schema `1.0.0`, implemented Protocol
  `0.9.0`, and the exact supported range from one immutable Core source of
  truth without accepting a repository path.
* R9: CLI serialization validates through Core, emits properties in contract
  order with issue properties in contract order, preserves issue order, and
  returns one compact JSON object followed by exactly one newline. Invalid
  envelopes fail with the Core validation error and produce no serialization.
* R10: This is an Additive TypeScript tooling contract. Existing shell tools,
  executable help/version/unavailable behavior, package names and versions,
  Protocol artifacts, templates, and `VERSION` remain unchanged.

## Expected Errors

* A non-object, array, missing or unknown field, invalid primitive, unsupported
  schema or Protocol version, invalid status/outcome/exit combination, invalid
  subject or path, malformed issue, or duplicate semantic mismatch returns a
  validation failure with stable issue codes.
* A missing selector, unknown selector kind, missing selected version, malformed
  SemVer, or version outside the supported range returns the matching typed
  Protocol-selection error.
* CLI serialization throws the typed Core envelope-validation error before
  emitting JSON when a JavaScript caller bypasses TypeScript types.

## Dependencies

* TST-001 public Core and CLI package roots and canonical tooling gate.
* Root `VERSION` value `0.9.0` as the approved implemented Protocol constant.
* Node.js built-ins for tests only; Core retains no runtime dependency and CLI
  retains only its exact dependency on Core.

## Constraints

* Do not add a dependency, migrate a domain command, edit a legacy shell tool,
  publish, push, deploy, or run a migration.
* Keep parsing, comparison, normalization, and serialization helpers internal;
  export only the result, selector, capability, and serializer interfaces.
* Keep all validation deterministic and independent of locale, filesystem,
  process environment, network, current working directory, and system clock.

## Guidance

Relevant:

* principle: small coherent changes
* principle: explicit dependencies
* principle: behavior-oriented testing
* principle: deep module interface

Not applicable:

* decision: no existing repository decision selects a machine-result schema
