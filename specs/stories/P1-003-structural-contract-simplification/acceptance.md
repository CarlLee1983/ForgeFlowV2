# Acceptance Criteria

## Happy Path

* [ ] AC-001: A repository containing only a non-blank `AGENTS.md`, a
  non-blank `Makefile`, and `specs/stories/` is a valid adoption; absent
  Guidance, handoff, Skills, and CI are reported as optional capabilities, not
  `STRUCTURE_INCOMPLETE`.
* [ ] AC-002: A ready Story contains `story.md` and `acceptance.md`; it may
  omit `task.md` and contain additional Story-owned files.
* [ ] AC-003: Bootstrap's starter layout, including its four Guidance files and
  Story template, remains valid while its installation manifest is explicitly
  distinct from the protocol conformance contract.

## Business Rules

* [ ] AC-004: When `guidance/` is absent Doctor reports `NOT_PRESENT`; when it
  is present Doctor validates the readable, non-blank `guidance/ENTRY.md` entry
  contract, and customized additional Guidance layout does not produce core
  adoption failure.
* [ ] AC-005: Upgrade leaves optional repository-owned Guidance untouched and
  does not restore a customized optional layout to the bootstrap inventory.

## Failure Cases

* [ ] AC-006: Missing `AGENTS.md`, `Makefile`, or `specs/stories/` remains an
  invalid adoption, and a detected Guidance directory whose entrypoint is
  missing, blank, unreadable, or unsafe is reported without weakening core
  path safety.

## Regression Requirements

* [ ] AC-007: Adding a newly detected optional ForgeFlow capability does not
  implicitly add a core required path or make its absence structural failure.
* [ ] AC-008: Documentation consistently distinguishes required entrypoints,
  structural invariants, optional capability files, bootstrap-installed files,
  and bootstrap-managed files.
* [ ] AC-009: Root `make verify` passes.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `tests/doctor.sh P1003-AC-001` | minimal fixture | `STRUCTURE_OK` with optional capabilities `NOT_PRESENT` |
| `AC-002` | test | `tests/doctor.sh P1003-AC-002` | Story structural fixtures | required files pass; optional and additional artifacts are accepted |
| `AC-003` | test | `tests/bootstrap.sh P1003-AC-003` | fresh bootstrap target | opinionated layout installs without defining adoption inventory |
| `AC-004` | test | `tests/doctor.sh P1003-AC-004` | absent, entry-only, and customized Guidance fixtures | only the entrypoint governs detected Guidance validity |
| `AC-005` | test | `tests/bootstrap.sh P1003-AC-005` | customized Guidance followed by upgrade | optional owned layout remains unchanged |
| `AC-006` | test | `tests/doctor.sh P1003-AC-006` | missing core and unsafe Guidance fixtures | core remains invalid; optional capability failure is non-structural drift/error |
| `AC-007` | test | `tests/doctor.sh P1003-AC-007` | absent Skills and CI fixtures | no optional capability expands core required surface |
| `AC-008` | test | `tests/protocol.sh P1003-AC-008` | versioned docs and scripts | responsibilities are explicitly separated |
| `AC-009` | command | `make verify` | complete P1-003 checkout | exit 0 |
