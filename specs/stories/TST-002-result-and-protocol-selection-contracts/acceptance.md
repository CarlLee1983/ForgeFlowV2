# Acceptance Criteria

## Happy Path

* [ ] AC-001: Canonical success, failure, warning, usage error, configuration
  error, and internal error examples validate through the public Core package
  root with their documented status, outcome, and exit mappings.

## Business Rules

* [ ] AC-002: The public validator fails closed with stable validation issues
  for invalid object shape, status, outcome, exit, subject, path, issue,
  SemVer, schema-version, Protocol-version, and supported-range combinations.
* [ ] AC-003: Current, adopted, and explicit supported selectors resolve
  deterministically through the public Core package root; missing, malformed,
  unknown, and unsupported selectors return the documented typed errors with no
  repository inspection or fallback.
* [ ] AC-004: Immutable capability metadata reports exact implemented Protocol
  and result-schema versions and the supported Protocol range without input;
  the public CLI package root serializes valid envelopes to canonical one-line
  JSON and rejects invalid envelopes through the Core validation error.

## Failure Cases

Covered by AC-002 through AC-004.

## Regression Requirements

* [ ] AC-005: Core retains no runtime dependency, CLI retains only its exact
  Core dependency, both packages expose only `.`, existing executable
  help/version/unavailable behavior stays unchanged, and the full repository
  verification gate passes.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `packages/core/test/result-envelope.test.mjs` | `six canonical envelope fixtures imported from built Core output` | `every fixture validates and preserves the documented mapping` |
| `AC-002` | test | `packages/core/test/result-envelope.test.mjs` | `table of malformed and inconsistent envelope fixtures` | `every fixture returns the documented stable validation issue and no value` |
| `AC-003` | test | `packages/core/test/protocol-selection.test.mjs` | `current, adopted, explicit, missing, malformed, unknown, and unsupported selectors` | `supported selectors resolve 0.9.0 and all other cases return exact typed errors without throwing` |
| `AC-004` | test | `packages/cli/test/machine-contract.test.mjs` | `built public Core and CLI package roots` | `capabilities are exact and immutable; canonical JSON is stable; invalid input throws the Core validation error` |
| `AC-005` | command | `make verify` | `complete working tree with packed-package assertions and legacy CLI tests` | `all repository gates exit 0 and dependency, export, package, and executable contracts remain bounded` |

## Verification Notes

Run each new built-output test file during TDD, run `pnpm run typecheck` after
each public interface slice, then run `make verify`. TST-002 cases use
`TST002-AC-*` identifiers when exercised by shell acceptance tests.
