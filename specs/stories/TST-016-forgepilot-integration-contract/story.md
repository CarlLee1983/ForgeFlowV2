# Story: TST-016 Packed CLI Process Consumer Contract

## Goal

Prove that an external process consumer can use every published npm-packed
PraxisBound CLI command through the versioned JSON boundary without parsing
human output or transferring consumer lifecycle authority to PraxisBound.

## Context

GitHub issue #41 originally described ForgePilot integration after TST-015's npm
package and clean-consumer validation.
The CLI has eight published command paths and an npm-packed JSON result schema,
but no independent process consumer contract had been exercised against the
packed artifacts. ADR-011 and PB-003 replaced the old `@forgeflow` package identity
with `@praxisbound`. TST-015's original `@forgeflow` authority observation
remains historical partial evidence; this Story does not turn it into PASS.
The human owner selected the PraxisBound-local packed CLI consumer contract as
the validation boundary, then explicitly made a ForgePilot-owned check optional
because ForgePilot integration is not the PraxisBound project's focus. Such a
check remains separate evidence for live integration; the packed consumer does
not prove that integration.
The human owner explicitly changed this Story's scope-authority prerequisite to
the current `@praxisbound` user scope after an authenticated npm account view
proved control of that scope. TST-015's package and clean-consumer observations
remain prerequisites.

## Classification

- Security sensitive: no
- Baseline conformance: no
- Task mode: execution

## Authority

- plan: yes
- modify: yes
- add_dependency: no
- migration: no
- commit: no
- push: no
- deploy: no

## Architecture

- Impact: high
- Boundary: `PraxisBound CLI JSON process interface`
- Boundary: `optional Core package-root library interface`
- Boundary: `external consumer lifecycle authority`
- Contract: `process consumers validate schema version and process exit before interpreting typed status, outcome, issue codes, and documented data; human wording is outside the interface`
- Contract: `library mode is optional and imports only the versioned Core package root when explicitly selected`
- Contract: `PraxisBound consumes no ForgePilot mutable lifecycle state; live ForgePilot checks are optional external evidence`
- Owner: `PraxisBound CLI JSON process interface = PraxisBound tooling`
- Owner: `optional Core package-root library interface = PraxisBound tooling`
- Owner: `external consumer lifecycle authority = external consumer`

## Risk

- Level: high
- Reason: `public-contract`

## Scope

### In Scope

- Exercise all eight published CLI command paths through the npm-packed,
  locally installed binary and consume their JSON envelopes as an external
  process would.
- Test pass, warning, fail, error, schema-version mismatch, and process-exit
  mismatch handling using stable fields rather than human messages.
- Document when to select the process or optional Core-root library boundary,
  version dependencies, and compatibility failure behavior.
- Run and record an agreed ForgePilot-owned consumer check when available as
  separate live-integration evidence. Its absence does not block the packed
  process consumer contract.

### Out of Scope

- Required live ForgePilot integration, ForgePilot redesign, lifecycle-state
  import, internal PraxisBound imports, remote service, MCP, AI-dependent
  verification, package publication, or legacy entrypoint switching.

## Inputs

- npm-created Core and CLI tarballs, a disposable npm-only consumer, and the
  installed `praxisbound` binary.
- Authenticated maintainer observation of the selected `@praxisbound` npm user
  scope and its package-creation authority.
- The published JSON result schema and supported tooling versions.
- Optional agreed ForgePilot-owned consumer contract commands, if provided.

## Outputs

- Consumer observations for every published command and each result category.
- Process/library integration guidance with explicit compatibility handling.
- A retained verification result distinguishing packed consumer observations
  from any unavailable optional live-integration check.

## Rules

- R1: A process consumer reads exactly one JSON object from CLI stdout, checks
  the schema version and actual child exit, and uses typed status, outcome,
  issue codes, and documented data. It never matches human text.
- R2: The process boundary requires the exact CLI tooling version. Optional
  library mode requires the separately declared supported Core SemVer and uses
  only package-root exports.
- R3: PraxisBound does not read, change, or infer ForgePilot's current lifecycle
  state. Disposable contract fixtures contain no ForgePilot state snapshot;
  an optional live ForgePilot check never transfers that authority.
- R4: This is additive tooling validation; no versioned `protocol/` or
  `templates/` artifact and no legacy entrypoint changes.

## Expected Errors

- An unknown schema version, malformed or missing JSON, multiple stdout values,
  or envelope/process exit mismatch is a consumer compatibility failure, never
  a success inferred from human output.
- A missing optional ForgePilot-owned check remains a separately recorded
  blocked live-integration observation, never a passing integration claim. An
  unproven current `@praxisbound` scope authority blocks this packed contract.

## Dependencies

- TST-015 npm package and clean-consumer observations for tarballs, installed
  commands, pinned acquisition, and offline execution. Its original
  `@forgeflow` scope-authority result is superseded for this Story by ADR-011
  and PB-003, not retroactively passed.
- Authenticated control and package-creation authority for the current
  `@praxisbound` npm user scope.
- The public Core/CLI boundaries and result schema established by TST-001 and
  TST-002.

## Constraints

- Add no dependency and do not publish packages, modify ForgePilot state, or
  commit, push, deploy, or migrate.
- Keep consumer fixtures disposable and outside this repository's own Stories,
  handoff, and work tree as the subject under test.

## Guidance

Relevant:

- principle: small coherent changes
- principle: explicit dependencies
- principle: behavior-oriented testing
- principle: deep module interface

Not applicable:

- no persistent-data or migration guidance applies
