# Acceptance Criteria

## Happy Path

* [ ] AC-001: Human Review Guidance defines required contextual review,
  distinguishes automated PASS from human acceptance, permits agents to prepare
  evidence, and reserves REVIEW approval and DONE for a human.
* [ ] AC-002: The guide covers intent and behavior, naming and readability,
  responsibility and cohesion, abstraction and duplication, dependencies and
  architecture, error handling and side effects, tests, and scope and
  maintainability.
* [ ] AC-003: SOLID is expressed as contextual SRP, OCP, LSP, ISP, and DIP review
  questions rather than mandatory cross-language class structure, LLM scoring,
  or arbitrary numeric thresholds.

## Business Rules

* [ ] AC-004: Only a human can choose Accepted and authorize
  `REVIEW → DONE` after accepting product intent, design, and architecture and
  after repository merge policy is satisfied.
* [ ] AC-005: Lifecycle and guidance support Changes requested through
  `REVIEW → IMPLEMENTING → VERIFYING → REVIEW`; any implementation change
  invalidates the previous PASS for review and requires a new full
  `make verify` PASS.
* [ ] AC-006: Lifecycle and guidance support Specification blocked through
  `REVIEW → SPEC_BLOCKED → READY`; a human must resolve, revise, and reapprove
  the Story before implementation continues.
* [ ] AC-007: `templates/AGENTS.md` and `skills/story-development/SKILL.md`
  require Review Preparation with Story and acceptance mapping, design and
  boundary impacts, test and verification evidence, assumptions, unresolved
  risks, and suggested attention points; they forbid agent self-approval and
  route requirement-changing feedback to SPEC_BLOCKED.
* [ ] AC-008: README, Concepts, Code Quality, and Getting Started link to the
  Human Review guide and concisely distinguish automated checks, contextual
  judgment, re-verification after requested changes, and human-only approval.

## Failure Cases

* [ ] AC-009: The change remains backward compatible: it adds no lifecycle
  state, required adopter artifact, Story field, Make target, approval
  automation, universal architecture mandate, or automated Human Review score,
  and it preserves existing PASS, FAIL, and Repair Loop semantics.
* [ ] AC-010: Protocol Versioning records Human Review Guidance as Additive and
  advances `VERSION` and required protocol-version examples from `0.3.3` to
  `0.3.4` without changing unrelated package or dependency versions.

## Regression Requirements

* [ ] AC-011: Every FF-215 contract case is dispatched through `run_case` in
  `tests/human-review.sh`, that test is composed into the existing root gate,
  and complete root `make verify` passes without removing or replacing any
  existing verification gate.

## Verification Notes

Run `./scripts/story-check specs/stories/FF-215-human-review-guidance`, then
`sh -n tests/human-review.sh`, `./tests/human-review.sh`, and root `make verify`.
Each FF-215 case in `tests/human-review.sh` maps to exactly one `AC-001` through
`AC-011` identifier.
