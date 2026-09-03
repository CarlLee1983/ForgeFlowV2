# Acceptance Criteria

## Happy Path

* [ ] AC-001: README lists the adoption marker and every check run by each
  example's canonical verification gate.
* [ ] AC-002: Doctor's current-version sample and the Repository Contract match
  the existing implementation.
* [ ] AC-003: The handoff records the published `v0.3.1` release and current
  baseline without treating historical evidence as current state.

## Business Rules

* [ ] AC-004: The documentation correction is classified as Corrective and the
  single authoritative `VERSION` advances to `0.3.2`.

## Failure Cases

* [ ] AC-005: Historical Story and migration references are not rewritten as
  current-state claims.

## Regression Requirements

* [ ] AC-006: Root `make verify` passes without executable behavior changes.

## Verification Notes

Run root `make verify`.
