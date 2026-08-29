# Acceptance Criteria

## Happy Path

* [ ] AC-01: The Go example contains a complete Story and acceptance document
  with no template placeholders.
* [ ] AC-02: A reader can map every automated acceptance criterion to a Go test
  carrying the same stable identifier.

## Business Rules

* [ ] AC-03: The example criteria and tests cover summation, an empty order,
  invalid price, invalid quantity, line overflow, and accumulated overflow.
* [ ] AC-04: The acceptance identifier set exactly equals the executable test
  identifier set and duplicate identifiers fail the focused check.
* [ ] AC-05: Documentation identifies Go as an example adapter rather than a
  required ForgeFlow language or layout.

## Failure Cases

* [ ] AC-06: Removing, duplicating, or changing an identifier on either side
  makes the traceability check fail.

## Regression Requirements

* [ ] AC-07: `make -C examples/go verify` runs formatting, vet, Staticcheck,
  traceability, and behavior tests successfully.
* [ ] AC-08: Root `make verify` remains successful.

## Verification Notes

Run the focused traceability command documented in the Go example, then
`make -C examples/go verify`, and finally root `make verify`.
