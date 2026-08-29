# Story: ORD-001 Order Total

## Goal

Demonstrate a complete, executable ForgeFlow Story using the existing Go
order-total example.

## Context

The Go example calculates an order total from cent-denominated line items and
already has focused behavior tests. This Story makes the link from approved
requirements to acceptance criteria to executable tests visible.

## Scope

### In Scope

* Document the existing order-total behavior and error contract.
* Map every automated acceptance criterion to a stable identifier in a Go test
  or subtest.
* Verify the acceptance and test identifier sets with the focused Go check.

### Out of Scope

* Changing order-total behavior, errors, or data types.
* Requiring Go, a particular test framework, or this directory layout for
  ForgeFlow users.
* Parsing arbitrary Markdown or defining a cross-language Story schema.

## Inputs

* Order line items containing an integer unit price in cents and an integer
  quantity.

## Outputs

* The order total in cents, or the documented validation or overflow error.
* A deterministic mapping from this Story's automated acceptance IDs to Go
  executable test IDs.

## Rules

1. Sum each line's unit price multiplied by its quantity.
2. An empty order has a zero total.
3. Unit prices must be non-negative and quantities must be positive.
4. Line multiplication and accumulated totals must not overflow `int64`.
5. Every automated behavioral acceptance ID appears exactly once in this
   acceptance document and exactly once in the executable Go test identifiers.

## Expected Errors

* A negative unit price returns `ErrInvalidUnitPrice`.
* A non-positive quantity returns `ErrInvalidQuantity`.
* A line or accumulated-total overflow returns `ErrTotalOverflow`.
* Missing, duplicate, or unmapped acceptance IDs make the focused
  traceability check fail.

## Dependencies

* The existing `CalculateOrderTotal` implementation and Go test suite.
* The ForgeFlow Story Contract.

## Constraints

* This is a Go-specific illustration of a portable traceability pattern.
* The focused check recognizes only this example's acceptance-list and Go test
  name formats; it is not a general Markdown parser.
