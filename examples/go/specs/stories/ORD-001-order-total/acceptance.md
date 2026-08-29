# Acceptance Criteria: ORD-001 Order Total

## Happy Path

* [ ] AC-01: Line-item totals are summed in cents.
* [ ] AC-02: An empty order returns a zero total.

## Business Rules

* [ ] AC-03: A negative unit price returns `ErrInvalidUnitPrice`.
* [ ] AC-04: A non-positive quantity returns `ErrInvalidQuantity`.

## Failure Cases

* [ ] AC-05: Line multiplication overflow returns `ErrTotalOverflow`.
* [ ] AC-06: Accumulated-total overflow returns `ErrTotalOverflow`.

## Regression Requirements

The focused traceability check continues to require the acceptance and
executable Go test identifier sets to be equal, with no duplicates. The Go
verification gate continues to run that check along with formatting, vet,
Staticcheck, and the behavior tests.

## Verification Notes

Run `make -C examples/go traceability` to compare the identifier sets. The
focused check fails for a missing, duplicate, or unmapped identifier on either
side. Then run `make -C examples/go verify`; the Go gate includes formatting,
vet, Staticcheck, traceability, and behavior tests. Finally, run root
`make verify` as the repository-wide authority.
