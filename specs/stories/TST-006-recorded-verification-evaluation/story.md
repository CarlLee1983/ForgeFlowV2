# Story: TST-006 Recorded Verification Result Evaluation

## Goal

Deliver `forgeflow verification check --result` through a pure Core evaluator
over a Story's declared plan, its acceptance criteria, and its recorded
`verification.md`, plus read-only CLI acquisition, human and JSON rendering,
aggregate precedence, and differential parity with the retained portable shell
checker.

## Context

GitHub issue #31 follows the completed TST-005 plan migration. The portable
`scripts/verification-check --result` reads a Story's `verification.md`,
evaluates required layers, acceptance evidence completeness, used authority,
and residual risks, and reports PASS, PARTIAL, FAIL, or
VERIFICATION_RESULT_INCOMPLETE. The TypeScript Core and CLI resolve the plan
only, so recorded evidence is still evaluated by the shell checker alone.

## Classification

- Security sensitive: no
- Baseline conformance: no
- Task mode: execution

## Authority

- plan: yes
- modify: yes
- add_dependency: no
- migration: no
- commit: yes
- push: no
- deploy: no

## Architecture

- Impact: medium
- Boundary: `Core recorded verification result evaluator`
- Boundary: `CLI Story acquisition adapter and renderers`
- Contract: `Core evaluates a recorded result deterministically from Story, acceptance, and record source text and returns the resolved plan, the recorded facts, ordered diagnostics, and a canonical machine result without filesystem, process, clock, Git, or lifecycle access`
- Contract: `the CLI reads verification.md read-only alongside the required Story files, performs no target write or child-process execution, and maps every aggregate result to documented human or JSON output and exit status`
- Contract: `the retained shell checker and the TypeScript command agree on recorded checks, traced evidence, per-Story status, ordered diagnostics, aggregate result, and exit status for every shared result corpus case`
- Owner: `Core recorded verification result evaluator = ForgeFlow TypeScript Core`
- Owner: `CLI Story acquisition adapter and renderers = ForgeFlow TypeScript CLI`

## Risk

- Level: high
- Reason: `public-contract`

## Scope

### In Scope

- Add a public pure Core evaluator for a recorded `verification.md` covering
  `## Checks`, `## Evidence`, `## Authority Used`, and `## Residual Risks`,
  reusing the internal declaration reader and the resolved plan.
- Add checkbox acceptance-criterion identity reading over `acceptance.md`.
- Add required-layer completeness, acceptance-evidence completeness, used
  authority checking, the residual-risk rule for an incomplete record, and the
  per-Story PASS, PARTIAL, and FAIL status decision.
- Add `--result` to `forgeflow verification check`, its read-only record
  acquisition, human and JSON rendering, aggregate precedence, and exit
  mapping.
- Add a shared result-mode parity corpus over the retained shell checker and
  packed-CLI black-box coverage.
- Retain the shell checker and its acceptance tests unchanged.

### Out of Scope

- Executing a recorded command, re-running a recorded check, automatic repair,
  Story readiness, ADR resolution, verification profile redesign, and any
  change to plan-mode semantics.
- A target-repository write, child process, new runtime dependency, Protocol or
  template change, publication, push, deploy, or migration.

## Inputs

- Story, acceptance, and recorded verification Markdown source text presented
  to Core.
- Optional Story directory paths, an optional `--result` mode, and an optional
  `--json` mode presented to the CLI.

## Outputs

- The resolved plan, the recorded checks, the traced acceptance count, the
  per-Story status, ordered diagnostics, and a canonical Core result envelope.
- Human verification-check output or exactly one newline-terminated JSON result
  on standard output, plus the aggregate result envelope's exit status.

## Rules

- R1: Core recognizes exactly the recorded-result subset the retained checker
  implements. It is location, environment, locale, clock, Git, filesystem, and
  process independent, and it never executes a recorded command.
- R2: A recorded result is PASS only when every required layer is recorded as
  `pass` and every checkbox acceptance criterion has passing evidence. Silence,
  an absent required check, and a `skipped`, `blocked`, or `unsupported`
  observation never become PASS.
- R3: A recorded `fail` check, a recorded `fail` acceptance observation, or the
  use of an authority the Story does not grant makes the Story FAIL. An
  otherwise incomplete record is PARTIAL, and an incomplete record that states
  no residual risk is additionally a record defect.
- R4: A malformed, unknown, repeated, or unreadable record is a record defect,
  which takes precedence over FAIL and PARTIAL in the aggregate and reports
  `VERIFICATION_RESULT_INCOMPLETE`.
- R5: Aggregate precedence is operational error, then record or plan defect,
  then FAIL, then PARTIAL, then PASS. Operational errors exit `2`; every
  negative recorded outcome exits `1`.
- R6: Core reports recorded checks, traced evidence, used authority, and
  residual risks as declared facts. It never treats a declared fact as human
  approval, completion, or current lifecycle state.
- R7: JSON mode writes exactly one valid canonical result envelope to standard
  output and no human diagnostic to either stream for every outcome.
- R8: The CLI rejects a symlinked `verification.md` as an operational error and
  treats a missing, unreadable, or empty record as a record defect, without
  writing the target or invoking an external process.
- R9: Differential parity uses isolated fixture copies and an allow-listed
  legacy diagnostic normalizer. Every shared corpus case compares recorded
  facts, per-Story status, ordered issues, aggregate result, and domain exit
  exactly.
- R10: This is an Additive TypeScript tooling capability. The portable shell
  checker, Doctor, Protocol artifacts, templates, and their current behavior
  remain unchanged.

## Expected Errors

- A missing, unreadable, or empty `verification.md`, a repeated or absent
  `## Checks` or `## Evidence` section, an acceptance file with no checkbox
  criterion, a malformed, unknown, or repeated recorded check or evidence
  entry, an unknown used authority, a non-literal residual risk, and an
  incomplete record with no residual risk each produce a record defect and
  exit `1`.
- A symlinked `verification.md` produces a configuration-error result and
  exit `2`.

## Dependencies

- TST-005's plan resolver, declaration reader, CLI acquisition adapter, and
  renderers.
- TST-003's isolated differential parity harness and fail-closed legacy
  diagnostic normalization seam.
- TST-002's canonical result envelope and CLI serializer.
- The retained `scripts/verification-check --result` mode as the compatibility
  baseline.
- Node.js built-ins only for CLI filesystem access and tests.

## Constraints

- Do not add a dependency, edit or delegate from a shell command, change the
  Protocol or templates, publish, push, deploy, or run a migration.
- Keep filesystem and rendering concerns out of Core and keep the production
  command free of child-process APIs.

## Guidance

Relevant:

- principle: small coherent changes
- principle: explicit dependencies
- principle: behavior-oriented testing
- principle: deep module interface

Not applicable:

- decision: no existing repository decision governs the TypeScript recorded
  verification seam
