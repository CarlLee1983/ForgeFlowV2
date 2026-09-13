# ADR-009: Shell to TypeScript migration uses behavioral parity

- Status: proposed
- Date: 2026-09-12

## Context

The shell scripts encode years of edge cases in parsing, path safety, result
precedence, and recovery. A line-by-line rewrite would preserve implementation
shape rather than prove contract behavior. Immediate replacement would remove
the only executable oracle before the new implementation is trustworthy.

## Decision

Migrate one capability at a time. The legacy and TypeScript Implementations run
against isolated copies of the same fixture. A fail-closed normalizer compares
Semantic Result, stable issue identity and location, exit status, target process
invocations, repository mutations, and generated artifact bytes. Human wording
is excluded. A capability cannot become the default or remove its legacy
Implementation until its Behavioral Parity Gate passes.

## Boundaries

- `Parity Harness` owns fixture isolation, legacy normalization, semantic
  comparison, mutation manifests, and unknown-output failure.
- `Capability Migration` owns only one command slice and its parity cases.
- `Legacy Removal` is a separate change after package, CI, adoption, integration,
  documentation, and rollback evidence are complete.

## Consequences

Temporary duplication is explicit and measurable. Fixture gaps are a migration
risk, so every discovered mismatch becomes a regression fixture before it is
resolved. Deliberate contract changes cannot be hidden as parity fixes; they need
their own version classification and migration guidance.

## Falsified if

The legacy Implementation cannot be run safely as an oracle or its observable
behavior cannot be normalized without treating human wording as semantics.
