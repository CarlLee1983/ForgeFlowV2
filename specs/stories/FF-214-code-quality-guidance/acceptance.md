# Acceptance Criteria

## Happy Path

* [ ] AC-001: `docs/code-quality.md` documents repository ownership; formatting,
  static quality, architecture, and Human Review boundaries; deterministic gate
  requirements; separate mutating format commands; advisory LLM review; and
  repository-selected thresholds.
* [ ] AC-002: The Verification Contract tells repositories to place adopted
  automated code-quality tools behind `make verify`, while remaining tool-
  agnostic and preserving it as the only authoritative completion gate.
* [ ] AC-003: `templates/AGENTS.md` requires repository consistency and existing
  formatter, lint, type, and architecture settings; forbids bypass or weakening;
  keeps automated judgment under `make verify`; and leaves non-automatable
  design judgment to Human Review.

## Business Rules

* [ ] AC-004: The TypeScript `lint` script passes `--max-warnings=0` to ESLint,
  and its `make verify` still runs Prettier check, ESLint, TypeScript typecheck,
  Story traceability, and tests.
* [ ] AC-005: The Go example's `make verify` still runs formatting check,
  `go vet`, Staticcheck, Story traceability, and tests.
* [ ] AC-006: README links the code-quality guide and states that ForgeFlow can
  enforce repository-owned style through `make verify`, CI, and merge policy;
  it also distinguishes a CI workflow from an administrator-configured required
  status check.
* [ ] AC-007: The change is recorded as Additive, advances `VERSION` to `0.3.3`,
  adds no required adoption file or Make target, and changes no existing
  `make verify` PASS, FAIL, or Repair Loop semantics.

## Failure Cases

* [ ] AC-008: Guidance forbids obtaining PASS by disabling or weakening rules,
  lowering severity, ignoring files, or deleting tests, and does not present
  LLM review or arbitrary numeric Clean Code limits as deterministic gates.

## Regression Requirements

* [ ] AC-009: FF-214 contract tests pass and root `make verify` continues to
  compose the protocol, bootstrap, Doctor, Story, handoff, release, TypeScript,
  Go, and Actions gates without a new required command.

## Verification Notes

Each FF-214 case in `tests/code-quality.sh` is dispatched through `run_case`
with its responsible `AC-001` through `AC-009` identifier. Run
`./scripts/story-check specs/stories/FF-214-code-quality-guidance`, then
`sh -n tests/code-quality.sh`, `./tests/code-quality.sh`, and root `make verify`.
