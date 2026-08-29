# Acceptance Criteria: TYP-001 Order Total

## Happy Path

- [ ] AC-01: Line-item totals are summed in cents.
- [ ] AC-02: An empty order returns a zero total.

## Business Rules

- [ ] AC-03: An invalid unit price throws the documented `RangeError`.
- [ ] AC-04: An invalid quantity throws the documented `RangeError`.

## Failure Cases

- [ ] AC-05: An unsafe line total throws the documented `RangeError`.
- [ ] AC-06: An unsafe accumulated total throws the documented `RangeError`.

## Regression Requirements

The focused traceability check continues to require the acceptance and
executable TypeScript test identifier sets to be equal, with no duplicates.
The TypeScript verification gate continues to run that check along with
formatting, linting, type checking, and behavior tests.

## Verification Notes

Run `make -C examples/typescript traceability` to compare the identifier sets.
The focused check fails for a missing, duplicate, or unmapped identifier on
either side. Then run `make -C examples/typescript verify`; the TypeScript gate
includes formatting, linting, type checking, traceability, and behavior tests.
Finally, run root `make verify` as the repository-wide authority.
