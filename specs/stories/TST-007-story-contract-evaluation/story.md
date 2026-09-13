# Story: TST-007 Story Contract Evaluation

## Goal

Deliver default `forgeflow story check` through a pure Core evaluator over a
Story's directory identity, classification, governance declarations, decision
resolution, risk signals and contracts, security fixture matrix, trust
boundaries, and superseded behavior, plus read-only CLI acquisition, discovery,
human and JSON rendering, aggregate precedence, and differential parity with
the retained portable shell checker.

## Context

GitHub issue #32 follows the completed TST-006 recorded-verification
migration. The portable `scripts/story-check` evaluates a Story's static
contract and reports `STORY_CONTRACT_OK` or `STORY_CONTRACT_INCOMPLETE`. The
TypeScript Core and CLI cover the Handoff contract and both verification modes,
so the Story contract is still evaluated by the shell checker alone. Readiness
(`--ready`) is the next Story and is out of scope here.

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
- Boundary: `Core Story contract evaluator`
- Boundary: `CLI Story discovery and acquisition adapter`
- Contract: `Core evaluates a Story contract deterministically from the Story directory name plus Story and acceptance source text and returns the resolved facts, ordered diagnostics, and a canonical machine result without filesystem, process, clock, Git, or lifecycle access`
- Contract: `the CLI discovers and reads Story and acceptance files read-only, resolves referenced decision records under a configurable decision root, performs no target write or child-process execution, and maps every aggregate result to documented human or JSON output and exit status`
- Contract: `the retained shell checker and the TypeScript command agree on per-subject facts, ordered issues, aggregate result, and exit status for every shared Story corpus case, in explicit-subject and discovery order`
- Owner: `Core Story contract evaluator = ForgeFlow TypeScript Core`
- Owner: `CLI Story discovery and acquisition adapter = ForgeFlow TypeScript CLI`

## Risk

- Level: high
- Reason: `public-contract`

## Scope

### In Scope

- Add a public pure Core evaluator for the default Story contract covering the
  Story ID grammar, `## Classification`, `## Authority`, `## Architecture`,
  `## Risk`, the four risk contracts, `## Trust Boundary Fields`,
  `## Superseded Behavior`, and the acceptance `## Security Fixture Matrix`.
- Reuse the declaration reader introduced for verification rather than adding a
  second Markdown parser.
- Add default `forgeflow story check` with explicit subjects, lexical
  discovery, a configurable decision root, human and JSON rendering, aggregate
  precedence, and exit mapping.
- Add a shared default-mode parity corpus over the retained shell checker and
  packed-CLI black-box coverage.
- Retain the shell checker, its acceptance tests, and `make verify-story`
  unchanged.

### Out of Scope

- `--ready` readiness evaluation, Goal and Scope content rules, checkbox
  acceptance-criterion identity, Acceptance Evidence rows, placeholder
  detection, and risk-evidence link evaluation, which belong to TST-008.
- Architecture truth judgment, current lifecycle state, Guidance validation, a
  general Markdown parser, and switching any shell command onto the TypeScript
  implementation.
- A target-repository write, child process, new runtime dependency, Protocol or
  template change, publication, push, deploy, or migration.

## Inputs

- The Story directory name, and Story and acceptance Markdown source text,
  presented to Core.
- Referenced decision record source text, resolved by the CLI under the Story
  collection's decision root or `FORGEFLOW_DECISIONS_ROOT`.
- Optional Story directory paths and an optional `--json` mode presented to the
  CLI.

## Outputs

- The resolved Story ID, classification, task mode, effective authority,
  architecture impact, declared boundaries, owners, risk level, risk signals,
  ordered diagnostics, and a canonical Core result envelope.
- Human Story-check output or exactly one newline-terminated JSON result on
  standard output, plus the aggregate result envelope's exit status.

## Rules

- R1: Core recognizes exactly the default contract subset the retained checker
  implements. It is location, environment, locale, clock, Git, filesystem, and
  process independent, and it never executes repository code.
- R2: A Story directory names a Story ID when the shortest leading run of its
  hyphen-separated segments is itself a valid ID: the first segment starts with
  an uppercase letter, every middle segment contains an uppercase letter, the
  last segment is digits, and every segment is uppercase letters and digits. A
  readable slug is never absorbed into the ID.
- R3: `Security sensitive` and `Baseline conformance` must each be declared
  exactly once as `yes` or `no`. An invalid classification suppresses the
  matrix, trust-boundary, and superseded checks for that Story, exactly as the
  retained checker does.
- R4: A security-sensitive Story requires a non-empty `## Security Fixture
  Matrix` and literal trust-boundary fields; a non-security Story that provides
  a matrix is a defect. A baseline-conformance Story requires literal
  superseded entries; a non-baseline Story that declares them is a defect.
- R5: Authority defaults are `plan` granted, `modify` granted only in execution
  or mixed task mode, and every other operation withheld. One grant never
  implies the next: `deploy` requires `push`, `push` requires `commit`, and
  `commit` requires `modify`. Evidence task mode authorizes no mutating
  operation.
- R6: Architecture impact `medium` or `high` must name at least one decision or
  contract. An owner is stated as `<boundary> = <owner>`, names a non-empty
  owning domain, and names a boundary the Story declares.
- R7: A referenced decision is `ADR-<digits>`, resolves to exactly one
  non-symlinked readable record under the decision root, and declares `Status`
  exactly once. `accepted` is usable; `proposed` is usable only in architecture
  or mixed task mode; `superseded` and `rejected` are not.
- R8: Risk level `medium` or `high` must name at least one reason. A recognized
  high-risk signal may not be filed below `high`. Each of the four standard
  risk signals requires its contract section exactly once with every required
  field present and literal.
- R9: Aggregate precedence is operational error, then contract defect, then OK.
  An operational error exits `2`, a contract defect exits `1`, and a clean run
  exits `0`. Checking no Story at all is an operational error.
- R10: Explicit subject order is the given order and discovery order is lexical
  over `specs/stories/*`, skipping `_template`. Both are deterministic and
  independent of filesystem enumeration order.
- R11: Core reports classification, authority, architecture, and risk as
  declared facts. It never treats a declared fact as human approval,
  completion, architecture truth, or current lifecycle state.
- R12: JSON mode writes exactly one valid canonical result envelope to standard
  output and no human diagnostic to either stream for every outcome.
- R13: Differential parity uses isolated fixture copies and an allow-listed
  legacy diagnostic normalizer. Every shared corpus case compares resolved
  facts, ordered issues, aggregate result, and domain exit exactly.
- R14: This is an Additive TypeScript tooling capability. The portable shell
  checker, Doctor, Protocol artifacts, templates, `make verify-story`, and
  their current behavior remain unchanged.

## Expected Errors

- A Story directory whose name contains no Story ID, a classification that is
  absent, repeated, or not `yes` or `no`, a missing or empty required security
  fixture matrix, a prose trust-boundary field or superseded entry, a matrix or
  superseded section that contradicts its classification, an authority chain
  gap, a mutating authority under evidence task mode, a medium or high impact
  that names neither decision nor contract, a malformed or unowned architecture
  owner, an unresolvable, ambiguous, unreadable, statusless, or unusable
  referenced decision, a medium or high risk level with no reason, a high-risk
  signal filed below high, and a declared risk signal whose contract section or
  required field is absent, repeated, or non-literal each produce a contract
  defect and exit `1`.
- A symlinked or missing `story.md` or `acceptance.md`, a missing Story
  directory, a missing `specs/stories/` during discovery, invalid arguments,
  and checking no Story at all each produce an operational-error result and
  exit `2`.

## Dependencies

- TST-005's declaration reader, CLI acquisition adapter, and renderers.
- TST-003's isolated differential parity harness and fail-closed legacy
  diagnostic normalization seam.
- TST-002's canonical result envelope and CLI serializer.
- The retained `scripts/story-check` default mode as the compatibility
  baseline.
- Node.js built-ins only for CLI filesystem access and tests.

## Constraints

- Do not add a dependency, edit or delegate from a shell command, change the
  Protocol or templates, publish, push, deploy, or run a migration.
- Keep filesystem and rendering concerns out of Core and keep the production
  command free of child-process APIs.
- Express the four risk contracts as one table-driven definition rather than
  four copied implementations.

## Guidance

Relevant:

- principle: small coherent changes
- principle: explicit dependencies
- principle: behavior-oriented testing
- principle: deep module interface

Not applicable:

- decision: no existing repository decision governs the TypeScript Story
  contract seam
