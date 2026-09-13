# ADR-010: Protocol and tooling versions are modeled independently

- Status: proposed
- Date: 2026-09-12

## Context

The root `VERSION` currently identifies the ForgeFlow Protocol snapshot. npm
packages need their own SemVer for implementation fixes, distribution changes,
and Core Interface evolution. Equating these versions would force a protocol
release for a CLI-only fix and obscure which protocol versions a tool can
evaluate.

## Decision

Model `toolingVersion`, resolved `protocolVersion`, and
`supportedProtocolRange` separately. The initial Core and CLI packages release
in lockstep under one tooling version, but that number is never copied from the
Protocol by assumption. Compatibility uses an explicit npm-compatible range;
for pre-1.0 Protocol releases, support does not cross a MINOR boundary unless
tested and declared.

## Boundaries

- `Protocol Version` identifies the repository contract and remains sourced from
  the protocol snapshot.
- `Tooling Version` identifies published Core and CLI behavior.
- `Compatibility Metadata` states which Protocol versions a tooling release has
  fixtures and semantics to support.

## Consequences

A CLI patch can ship without changing Protocol `VERSION`. A Protocol release can
require only a compatibility-metadata update when the tooling already implements
it. Dropping a supported Node.js or Core Interface version is a tooling breaking
change, not automatically a Protocol change.

## Falsified if

Tooling and Protocol releases are permanently required to move together, or the
tool can safely infer compatibility from equal version numbers without explicit
metadata.
