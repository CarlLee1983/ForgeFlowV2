# ADR-004: ForgeFlow Protocol remains language agnostic

- Status: proposed
- Date: 2026-09-12

## Context

ForgeFlow currently defines repository contracts in Markdown, templates, and
portable checks. Distributing official tooling through npm creates a risk that
Node.js, TypeScript types, or package installation becomes an implicit adoption
requirement. The alternatives are to make the npm implementation normative, to
keep protocol and tooling deliberately separate, or to maintain unrelated
language-specific contracts.

## Decision

The ForgeFlow Protocol remains a language-independent contract expressed in
versioned specifications, language-neutral schemas when appropriate, examples,
and observable rules. Node.js and TypeScript are never required to read,
implement, or adopt the Protocol. A TypeScript package may implement the
Protocol, but generated TypeScript types and CLI behavior do not define protocol
semantics.

## Boundaries

- `Protocol` owns adopter-facing rules, persistent formats, compatibility, and
  semantic outcomes.
- `Reference Tooling` implements those rules and may require its own runtime.
  It does not make that runtime an adoption requirement.
- `Repository` continues to own `make verify` and may implement ForgeFlow rules
  with any language or toolchain.

## Consequences

Protocol artifacts cannot be generated solely from TypeScript source. A
repository may adopt ForgeFlow without installing npm packages. Changes to
tooling must be classified separately from changes to the Protocol, even when
they ship in the same repository release.

## Falsified if

A conforming adoption requires Node.js, npm, a TypeScript package, or a generated
TypeScript artifact to interpret or satisfy the ForgeFlow Protocol.
