# ADR-005: TypeScript is the official reference tooling implementation

- Status: proposed
- Date: 2026-09-12

## Context

The current executable surface is implemented in portable POSIX shell. That
Implementation has proven the contracts but concentrates large Markdown and
restricted-YAML parsers in scripts that are difficult to reuse from other
tooling. The alternatives are to keep shell as the only official tooling,
replace the Protocol with a TypeScript runtime, or provide TypeScript as an
optional reference implementation.

## Decision

TypeScript becomes the official Reference Tooling for new reusable Core and CLI
capabilities. The existing shell Implementation remains the compatibility
oracle during migration. TypeScript does not replace the Protocol, change
repository-owned `make verify`, or become required for adoption.

## Boundaries

- `Reference Tooling` owns deterministic parsing, evaluation, inspection models,
  mutation planning, and supported command adapters.
- `Protocol` remains the authority for semantics and persistent repository
  formats.
- `Legacy Tooling` remains independently executable until the removal gate and
  any required protocol migration have passed.

## Consequences

New behavior must first be stated in language-independent terms and then
implemented in TypeScript. During migration, duplicated implementations are an
accepted temporary cost controlled by behavioral parity fixtures.

## Falsified if

TypeScript source becomes the only normative description of a ForgeFlow rule, or
the migration cannot retain an independently executable compatibility oracle.
