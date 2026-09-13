# ADR-008: CLI exposes a stable machine-readable JSON contract

- Status: proposed
- Date: 2026-09-12

## Context

Human output is useful for direct use but is not a safe integration Interface.
Parsing banners, wording, or line order would couple ForgePilot and automation to
presentation changes. The alternatives are human output only, command-specific
ad hoc JSON, or one versioned result envelope.

## Decision

Every CLI command supports `--json` and emits exactly one versioned result
envelope on stdout. The envelope carries the command, semantic status,
command-specific outcome, exit code, stable issue codes, evidence, data, and
tooling/protocol compatibility metadata. Human wording is not part of semantic
parity. Breaking changes to the envelope require a new envelope schema version.

## Boundaries

- `Core` produces the semantic values represented by the envelope.
- `CLI JSON Adapter` serializes the envelope and maps it to the documented exit
  status.
- `Human Renderer` may change wording without changing the JSON contract or
  Semantic Result.

## Consequences

Expected validation failures still produce valid JSON. Warnings are typed
issues, not text prefixes. Timestamps, durations, absolute temporary paths, and
stack traces are excluded from the deterministic contract.

## Falsified if

A supported automation use case requires parsing human output or importing an
internal TypeScript module to recover information omitted from JSON.
