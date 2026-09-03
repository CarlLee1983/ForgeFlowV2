# Story: TYP-001 Order Total

## Goal

Demonstrate a complete, executable ForgeFlow Story using the existing
TypeScript order-total example.

## Context

The TypeScript example calculates an order total from cent-denominated line
items and already has focused behavior tests. This Story makes the path from
approved requirements to acceptance criteria to `node:test` cases visible.

## Classification

- Security sensitive: no
- Baseline conformance: no

## Scope

### In Scope

- Document the existing order-total behavior and `RangeError` contract.
- Map every automated acceptance criterion to one stable identifier in a
  TypeScript test name.
- Verify exact acceptance and test identifier-set equality with a focused
  TypeScript-example check.

### Out of Scope

- Changing order-total behavior, errors, or data types.
- Requiring TypeScript, `node:test`, or this directory layout for ForgeFlow
  users.
- Sharing this Story with the Go example or defining a cross-language schema.
- Parsing arbitrary Markdown or TypeScript source.

## Inputs

- Order line items containing numeric unit prices in cents and quantities.

## Outputs

- The order total in cents, or the documented validation or safe-integer
  `RangeError`.
- A deterministic mapping from this Story's acceptance IDs to executable
  TypeScript test IDs.

## Rules

- R1: Sum each line's unit price multiplied by its quantity.
- R2: An empty order has a zero total.
- R3: Unit prices must be non-negative safe integers and quantities must be
  positive safe integers.
- R4: Line totals and accumulated totals must stay within JavaScript's safe
  integer range.
- R5: Every automated acceptance ID appears exactly once in this acceptance
  document and exactly once in the executable TypeScript test identifiers.

## Expected Errors

- An invalid unit price throws `RangeError` with the unit-price diagnostic.
- An invalid quantity throws `RangeError` with the quantity diagnostic.
- An unsafe line or accumulated total throws `RangeError` with the safe-integer
  diagnostic.
- Missing, duplicate, or unmapped acceptance IDs make the focused traceability
  check fail.

## Dependencies

- The existing `calculateOrderTotal` implementation and `node:test` suite.
- The ForgeFlow Story Contract.

## Constraints

- This is a TypeScript-specific illustration of a portable traceability pattern.
- The focused check recognizes only this example's checklist and single-line
  `test("AC-NN: ...")` formats; it is not a general parser.
