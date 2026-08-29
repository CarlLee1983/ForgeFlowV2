# Acceptance Criteria

## Happy Path

* [ ] AC-01: The TypeScript example contains a complete local Story and
  acceptance document with no template placeholders.
* [ ] AC-02: Every automated local criterion maps visibly to one `node:test`
  name carrying the same stable identifier.

## Business Rules

* [ ] AC-03: The local criteria and tests cover summation, an empty order,
  invalid price, invalid quantity, unsafe line total, and unsafe accumulated
  total behavior without changing the production implementation.
* [ ] AC-04: The acceptance identifier set exactly equals the executable-test
  identifier set, with no duplicates on either side.
* [ ] AC-05: Documentation identifies TypeScript as an illustrative adapter and
  the checker as example-specific rather than protocol-required.

## Failure Cases

* [ ] AC-06: Missing inputs, inputs with no recognized identifiers, duplicate
  identifiers, and mismatched identifier sets make the focused check fail.

## Regression Requirements

* [ ] AC-07: `make -C examples/typescript traceability` checks shell syntax,
  the real mapping, and disposable failure fixtures.
* [ ] AC-08: `make -C examples/typescript verify` runs formatting, linting,
  type checking, traceability, and behavior tests successfully.
* [ ] AC-09: Root `make verify` validates FF-206 artifacts and remains
  successful without changing `VERSION`, protocol contracts, bootstrap, or CI.

## Verification Notes

Run `make -C examples/typescript traceability`, then
`make -C examples/typescript verify`, and finally root `make verify`.
