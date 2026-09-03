# Story: FF-215 Human Review Guidance

## Goal

Define structured Human Review guidance for contextual product, design, and
architecture judgment without turning subjective review into an automated gate
or allowing an agent or LLM to approve its own work.

## Context

ForgeFlow `0.3.3` places reproducible code-quality checks behind canonical
`make verify`, but it does not yet define the dimensions Human Review should
consider or the lifecycle path when review requests implementation changes or
finds a specification blocker.

## Classification

* Security sensitive: no
* Baseline conformance: no

## Scope

### In Scope

* Add a single Human Review guide covering intent, naming, responsibility,
  abstraction, dependencies, error handling, tests, scope, and maintainability.
* Express Clean Code, SOLID, and Clean Architecture as contextual review
  questions rather than universal structures or numeric thresholds.
* Define Accepted, Changes requested, and Specification blocked outcomes.
* Add `REVIEW → IMPLEMENTING` and `REVIEW → SPEC_BLOCKED` to the existing
  lifecycle without adding a state or changing PASS, FAIL, or Repair Loop
  semantics.
* Add concise Review Preparation guidance to the distributed agent template
  and Story Development Skill.
* Link the guide from existing documentation and add automated contract tests.
* Record the additive classification and advance the protocol version required
  by the versioned-surface policy.

### Out of Scope

* Automated or LLM approval, scoring, or a blocking Human Review gate.
* Universal function length, parameter count, complexity, class, SOLID, or
  Clean Architecture requirements.
* A required `review.md`, Story field, adoption artifact, Make target, lifecycle
  state, service, runtime, database, dependency, or repository setting.
* A complete Refactoring Discipline, Test Quality Contract, or Architecture
  Impact Story field.
* Merge, tag, release, publication, or unrelated refactoring.

## Inputs

* The Code Quality, Verification, Lifecycle, Handoff, and Versioning guidance.
* The repository and distributed agent guides and Story Development Skill.
* The existing documentation navigation, Story contracts, tests, and root
  verification composition.

## Outputs

* `docs/human-review.md` and concise links from existing documentation.
* Compatible updates to `protocol/lifecycle.md`, `protocol/versioning.md`,
  `templates/AGENTS.md`, and `skills/story-development/SKILL.md`.
* `tests/human-review.sh` integrated into the existing root `make verify`.
* An updated protocol version and lifecycle handoff.

## Rules

* R1: Human Review is required contextual judgment, not an automated gate;
  automated PASS only makes implementation eligible for review.
* R2: Agents may prepare evidence, summaries, assumptions, risks, and attention
  points, but only a human may accept REVIEW and advance a Story to DONE.
* R3: Review feedback ties to the Story, acceptance criteria, repository policy,
  architecture, or a concrete maintenance risk rather than personal taste.
* R4: Review must not silently change approved product requirements. A missing,
  conflicting, or changed decision moves the Story through SPEC_BLOCKED for
  human revision and approval before it becomes READY again.
* R5: Human-requested implementation, test, readability, or architecture changes
  return REVIEW to IMPLEMENTING. The changed work must complete full
  `make verify` again before returning through VERIFYING to REVIEW.
* R6: Review guidance covers every dimension named in Scope and treats SOLID as
  contextual questions, not mandatory class structure across languages.
* R7: Architecture constraints that become deterministically enforceable should
  later become architecture tests behind `make verify`.
* R8: Test review stays limited to observable behavior, important success,
  failure, and regression evidence, protection of the current change, and the
  prohibition on deleting, weakening, or skipping tests to obtain acceptance.
* R9: Existing lifecycle states and transitions remain valid. No required
  adopter artifact, command, state, or approval automation is added, and
  existing PASS, FAIL, and Repair Loop meanings do not change.
* R10: This change is Additive. Existing valid adoptions remain valid, while the
  versioned protocol and template updates advance `VERSION` from `0.3.3` to
  `0.3.4` without creating a tag or release.

## Expected Errors

* Contract tests fail when required review dimensions, authority boundaries,
  lifecycle transitions, re-verification, navigation, or Review Preparation
  guidance is absent.
* Contract tests fail if the change adds a lifecycle state, required adopter
  artifact, Make target, automated approval, or inconsistent version record.
* Review enters SPEC_BLOCKED when safe implementation requires a missing or
  conflicting human decision; modifying tests or guessing intent is not a
  valid resolution.

## Dependencies

* The existing Story, Verification, Lifecycle, Handoff, Repository, and
  Versioning Contracts.
* Existing POSIX shell acceptance-test helpers and root verification targets.

## Constraints

* Keep the protocol agent-, language-, framework-, architecture-, and
  CI-provider-agnostic.
* Keep `docs/human-review.md` authoritative and link to it instead of copying
  its checklist across navigation documents.
* Preserve all existing root verification gates and repository-owned changes.
* Use POSIX `sh` with `set -eu`, and map every FF-215 test case through
  `run_case '<AC-ID>' <function>`.
