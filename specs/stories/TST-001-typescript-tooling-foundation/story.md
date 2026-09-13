# Story: TST-001 TypeScript Tooling Foundation

## Goal

Provide installable and verifiable public Core and CLI package shells so later
TypeScript migration Stories can build on a stable package and command
foundation without changing existing ForgeFlow behavior.

## Context

GitHub issue #26 is the first unblocked item in the TypeScript migration chain.
ForgeFlow currently has a private TypeScript example but no root package
workspace or public Core and CLI package shells. This Story records the issue's
approved implementation contract in the repository before changing it.

## Classification

* Security sensitive: no
* Baseline conformance: no
* Task mode: execution

## Authority

* plan: yes
* modify: yes
* add_dependency: yes
* migration: no
* commit: no
* push: no
* deploy: no

## Architecture

* Impact: high
* Boundary: `Core package root`
* Boundary: `CLI package root`
* Boundary: `CLI executable`
* Contract: `Core and CLI expose only their documented package roots`
* Contract: `CLI runtime dependencies point inward only to Core`
* Contract: `existing portable shell commands remain unchanged and never delegate to Node`
* Owner: `Core package root = ForgeFlow TypeScript tooling`
* Owner: `CLI package root = ForgeFlow TypeScript tooling`
* Owner: `CLI executable = ForgeFlow TypeScript tooling`

## Risk

* Level: high
* Reason: `public-contract`
* Reason: `dependency-supply-chain`

## Scope

### In Scope

* Add a root pnpm workspace containing `@forgeflow/core` and
  `@forgeflow/cli` package shells.
* Build both packages from TypeScript and expose only each package root.
* Provide built CLI help and tooling-version output.
* Return one documented usage failure for every command that has not yet been
  migrated.
* Add locked formatting, linting, type-checking, testing, build, and pack gates
  for the workspace and compose them into root verification.
* Assert package contents, exports, executable metadata, and runtime dependency
  direction.

### Out of Scope

* Story, Handoff, verification, Doctor, release, init, activation, or other
  ForgeFlow command semantics.
* Delegation from any legacy shell command to Node.
* Publishing a package or acquiring an npm scope.
* Moving or changing a Protocol artifact, changing protocol `VERSION`, or
  replacing the private TypeScript example.

## Inputs

* CLI arguments supplied to the built `forgeflow` executable.
* The CLI package manifest version used by version and help output.
* The root lockfile and existing Node engine policy.

## Outputs

* Packable Core and CLI tarballs containing compiled JavaScript, declarations,
  and package metadata.
* Deterministic help, version, and unavailable-command process results.
* A workspace verification gate composed into root `make verify`.

## Rules

* R1: The package names are `@forgeflow/core` and `@forgeflow/cli`; both begin
  at tooling version `0.1.0`, independently of the ForgeFlow Protocol version.
* R2: Each package manifest exports only `.`. The CLI additionally declares
  the `forgeflow` executable; implementation paths are not public subpaths.
* R3: Core has no runtime dependency. CLI's only runtime dependency is the
  exact workspace Core package. Tooling used only to build or verify remains a
  root development dependency.
* R4: No arguments and `help` / `--help` print help and exit zero. `version` /
  `--version` print the CLI package version and exit zero. Every other argument
  sequence writes the documented unavailable-command result to stderr, writes
  nothing to stdout, and exits two.
* R5: Existing shell entrypoints and the private TypeScript example keep their
  command forms and behavior. The portability gate continues without a Node or
  pnpm prerequisite.
* R6: This is an Additive tooling capability. It changes no artifact under
  `protocol/` or `templates/` and requires no adopter migration.

## Expected Errors

* An unavailable command returns exit two with a stable diagnostic and a
  pointer to `forgeflow --help`.
* A stale lockfile, formatting or lint error, type error, failing test, build
  failure, unexpected package file, public subpath, or runtime dependency fails
  the workspace gate.

## Dependencies

* Node.js `^20.19.0 || ^22.13.0 || >=24` and pnpm `12.0.0`.
* The repository's existing TypeScript, ESLint, Prettier, and Node type tooling
  families; no new third-party runtime library.
* The existing root canonical gate and independent portability gate.

## Constraints

* Do not publish, commit, push, deploy, run a migration, or modify an adopter.
* Do not add migrated command behavior or a general CLI framework.
* Keep the CLI executable as the external seam; package-private parsing and
  rendering details are not exported for tests.
* Preserve the existing private example's standalone lockfile and verification
  flow.

## Guidance

Relevant:

* principle: small coherent changes
* principle: explicit dependencies
* principle: behavior-oriented testing
* principle: deep module interface

Not applicable:

* decision: no existing repository decision selects the TypeScript package seam
