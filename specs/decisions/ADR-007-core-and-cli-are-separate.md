# ADR-007: Core and CLI are separate Modules

- Status: proposed
- Date: 2026-09-12

## Context

ForgeFlow needs both an agent-friendly process interface and reusable logic for
callers such as ForgePilot. A single CLI-shaped package would force library
callers to depend on argument parsing, console output, and process exits. A
maximally granular package graph would expose parser internals and duplicate
policy across callers.

## Decision

Use two public Modules. `@forgeflow/core` accepts normalized observations and
returns Semantic Results or mutation plans without reading `process.argv`,
printing, exiting, prompting, using the network, or applying repository
mutations. `@forgeflow/cli` adapts arguments, the local filesystem, Git and Make
process observations, mutation execution, and human or JSON presentation to the
Core Interface.

## Boundaries

- `Core` owns protocol parsing and evaluation, stable issue codes, result
  precedence, version compatibility, and deterministic mutation planning.
- `CLI` owns operating-system observation and effects, explicit authorization,
  transactional file application and recovery, child processes, rendering, and
  exit status.
- `ForgePilot` may use the public Core Interface or the CLI JSON contract. It
  never imports package-internal paths.

## Consequences

The external Core Seam stays small while filesystem and process Adapters remain
replaceable inside the CLI Implementation. Effect execution is deliberately not
presented as deterministic Core logic; Core plans effects and evaluates
observations, while CLI performs them.

## Falsified if

Core needs terminal or process-global state to decide a result, or library
callers routinely need CLI internals to perform supported workflows.
