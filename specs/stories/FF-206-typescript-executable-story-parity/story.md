# Story: FF-206 TypeScript Executable Story Parity

## Goal

Demonstrate that ForgeFlow's acceptance-ID-to-test traceability pattern is
portable by adding a complete executable Story to the TypeScript example.

## Context

FF-203 proves visible and deterministic Story traceability in the Go example.
The TypeScript example already exercises the same order-total domain, but it
does not include a Story, stable acceptance identifiers, or a focused mapping
check. A second language-specific adapter makes the portable pattern credible
without defining a shared parser or schema.

## Scope

### In Scope

* Add a READY-quality TypeScript-local order-total Story and acceptance file.
* Put one stable `AC-NN` identifier in each responsible `node:test` name.
* Add a focused TypeScript-example traceability checker and disposable
  regression fixtures.
* Run traceability from the TypeScript example's canonical `make verify` gate.
* Document the focused command and the example-only portability boundary.
* Add behavior coverage for the implementation's existing safe-integer error
  contract without changing production behavior.

### Out of Scope

* A Story or parser shared by the Go and TypeScript examples.
* A general Markdown, TypeScript, or test-source parser.
* Moving traceability tooling into the protocol, templates, or bootstrap.
* Requiring acceptance-ID traceability from adopting repositories.
* New order-total behavior, dependencies, lifecycle state, conformance
  certification, or CI workflow changes.

## Inputs

* The TypeScript order-total acceptance checklist.
* The TypeScript `node:test` source containing acceptance identifiers.
* Order line items containing numeric unit prices in cents and quantities.

## Outputs

* A complete TypeScript example Story with visibly mapped executable tests.
* A deterministic zero or nonzero traceability result.
* Existing order-total results or documented `RangeError` failures.

## Rules

* R1: The TypeScript Story covers summation, an empty order, invalid unit
  prices, invalid quantities, unsafe line totals, and unsafe accumulated totals.
* R2: Every automated criterion has exactly one unique identifier in the
  acceptance document and exactly one matching executable test identifier.
* R3: The acceptance and executable-test identifier sets must be equal.
* R4: Root `make -C examples/typescript traceability` is the focused interface;
  the checker behind it recognizes only this example's documented formats.
* R5: TypeScript `make verify` runs formatting, linting, type checking,
  traceability, and behavior tests; root `make verify` remains final authority.
* R6: Traceability is an illustrative example adapter, not a protocol or adopter
  requirement.
* R7: The production order-total implementation and repository protocol version
  remain unchanged because this Story only strengthens an optional example.

## Expected Errors

* Missing inputs or an input with no recognized identifiers fails locally.
* Duplicate acceptance or executable-test identifiers fail locally.
* Missing or unmapped identifiers on either side fail with a set difference.
* Invalid line-item inputs and unsafe totals preserve the existing `RangeError`
  contract.

## Dependencies

* FF-203 and its Go-specific traceability pattern.
* The existing TypeScript order-total implementation and `node:test` suite.
* POSIX shell, Make, pnpm, and the ForgeFlow Story and Verification Contracts.

## Constraints

* The checker must be POSIX-shell compatible, local-only, and non-interactive.
* Regression fixtures must use isolated temporary storage and leave source files
  unchanged.
* Identifier equality proves visible mapping, not behavioral correctness;
  executable assertions remain authoritative.
* No production dependency or generalized cross-language abstraction is added.
