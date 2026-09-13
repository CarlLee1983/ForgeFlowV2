# ADR-006: Reference Tooling is distributed through npm

- Status: proposed
- Date: 2026-09-12

## Context

Users need a zero-install path for adopting and inspecting ForgeFlow
repositories. npm and `npx` are broadly available with supported Node.js
releases. The unscoped `forgeflow` package name is already owned by an unrelated
project, while the logical scoped package names are not currently published;
scope ownership still has to be proven before publication.

## Decision

Publish the logical packages as `@forgeflow/core` and `@forgeflow/cli`, with the
CLI package exposing the `forgeflow` binary. The supported zero-install form is
`npx @forgeflow/cli <command>`. An unscoped `forgeflow` convenience package may
be added only if the name is legitimately acquired and delegates to the same CLI
without creating a second implementation.

The unpinned form is a human convenience. Reproducible automation uses
`npx --yes @forgeflow/cli@<tooling-version> <command>`. Offline claims begin
after acquisition: installed-package tests invoke the local binary with network
unavailable rather than claiming `npx` package resolution is offline.

## Boundaries

- `@forgeflow/core` owns the reusable tooling interface and no terminal adapter.
- `@forgeflow/cli` owns the executable binary, npm package metadata, and its
  dependency on Core.
- `npm Namespace Ownership` is a release prerequisite, not an architecture
  input; no package is published until maintainers control the selected scope.

## Consequences

Consumers need npm or `npx`, not pnpm. The repository may use pnpm for
development. Documentation must not recommend `npx forgeflow` while that name
resolves to the unrelated package.

## Falsified if

The selected npm scope cannot be controlled, npm cannot provide the required
zero-install behavior, or a different distribution channel becomes the primary
supported user path.
