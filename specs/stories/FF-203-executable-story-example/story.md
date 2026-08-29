# Story: FF-203 Executable Story Example

## Goal

Provide one complete ForgeFlow Story whose acceptance criteria map visibly and
deterministically to executable tests.

## Context

The Go order-total example already has a compact set of business behaviors and
tests, but it does not show the complete path from approved Story to acceptance
IDs to executable verification.

## Scope

### In Scope

* Add a READY-quality order-total Story under the Go example repository.
* Give every automated acceptance criterion a stable `AC-NN` identifier.
* Put the matching identifier in the responsible Go test or subtest.
* Add a focused traceability check comparing acceptance and test identifier
  sets.
* Document focused and canonical verification commands.

### Out of Scope

* New order-total business behavior.
* A cross-language Story shared by the Go and TypeScript examples.
* A general Markdown parser, Story schema, or lifecycle database.
* Treating Go file layout or tooling as a protocol requirement.

## Inputs

* Order line items with integer unit prices in cents and integer quantities.
* The example Story's acceptance identifiers.

## Outputs

* A complete example Story and acceptance document.
* Go tests visibly mapped to every automated criterion.
* A deterministic traceability check inside the Go verification gate.

## Rules

* R1: The example covers summation, an empty order, invalid unit price, invalid
  quantity, line multiplication overflow, and accumulated-total overflow.
* R2: Each automated acceptance criterion has exactly one unique identifier in
  the acceptance document and at least one matching executable test identifier.
* R3: Acceptance and executable-test identifier sets must be equal.
* R4: The Story contains no template placeholders and satisfies the Story
  Contract readiness fields.
* R5: The Go example's `make verify` runs the traceability check and all behavior
  tests; root `make verify` remains the final authority.

## Expected Errors

* Invalid unit prices return `ErrInvalidUnitPrice`.
* Non-positive quantities return `ErrInvalidQuantity`.
* Line or accumulated-total overflow returns `ErrTotalOverflow`.
* Missing, duplicate, or unmapped acceptance identifiers fail verification.

## Dependencies

* The existing Go order-total implementation and tests.
* The ForgeFlow Story and Verification Contracts.

## Constraints

* Traceability verifies observable mapping without parsing general Markdown.
* The example must make clear that the mapping pattern is portable while Go is
  illustrative only.
