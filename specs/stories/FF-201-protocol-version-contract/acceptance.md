# Acceptance Criteria

## Happy Path

* [ ] AC-01: Root `VERSION` contains exactly `0.2.0` on one line.
* [ ] AC-02: Public documentation links to a protocol versioning policy.

## Business Rules

* [ ] AC-03: The policy defines the versioned surface and the single source of
  truth.
* [ ] AC-04: The policy defines breaking, additive, and corrective changes plus
  the compatibility guarantees before and after 1.0.
* [ ] AC-05: The policy distinguishes a repository version from a published Git
  release and excludes private example package versions.

## Failure Cases

* [ ] AC-06: Protocol verification rejects missing, malformed, or multiline
  version metadata.

## Regression Requirements

* [ ] AC-07: Existing protocol, bootstrap, TypeScript, and Go verification
  remains successful.

## Verification Notes

Run `./tests/protocol.sh`, then run `make verify` from the repository root.
