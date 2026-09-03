# Acceptance Criteria

## Happy Path

* [ ] AC-001: The FF-215 task and repository handoff consistently record that
  Human Review accepted FF-215 and the Story is DONE.
* [ ] AC-002: The handoff records `v0.3.4` as published from
  `8e0eb8c10bbd3d6d4d654de42ff7eee115d8c8a4`, removes stale unpublished
  assertions, and directs consumers to query remote Release, tag, and CI state
  under `docs/releasing.md` instead of treating the handoff as its long-term
  source of truth.
* [ ] AC-003: Human Review explicitly checks whether `Security sensitive` and
  `Baseline conformance` truthfully match the actual implementation and whether
  required conditional evidence is complete.

## Business Rules

* [ ] AC-004: Human Review confirms that the complete `make verify` PASS applies
  to the implementation currently under review and that a handoff declaration
  alone does not prove the PASS is genuine or fresh.
* [ ] AC-005: A code, test, configuration, or other behavior-affecting change
  after PASS invalidates that evidence and requires another complete
  `make verify` before REVIEW; a final handoff-only change is attributed and
  left to human impact judgment.
* [ ] AC-006: Contract-check documentation clearly separates static declaration
  validation from Human Review responsibility for Classification truthfulness,
  consistency across the Story, Acceptance Criteria, Classification,
  implementation, and tests, and verification freshness.
* [ ] AC-007: `templates/AGENTS.md` and `skills/story-development/SKILL.md`
  contain compatible Review Preparation guidance for Classification
  truthfulness and verification freshness.
* [ ] AC-008: Upgrade documentation explains that an updated adoption marker
  does not update repository-owned `AGENTS.md` and identifies the 0.3.3 through
  0.3.5 guidance that adopters reconcile manually.

## Failure Cases

* [ ] AC-009: The change adds no lifecycle state, mandatory review artifact,
  reviewer metadata, LLM score, approval automation, Classification inference,
  or adopter Make target.
* [ ] AC-010: The change is recorded as Corrective, `VERSION` is `0.3.5`, the
  Doctor example matches, and Protocol Versioning explains why existing valid
  adoptions remain valid.

## Regression Requirements

* [ ] AC-011: Every FF-216 test case is dispatched exactly once through
  `run_case '<AC-ID>' <function>` in `tests/review-integrity.sh`.
* [ ] AC-012: Root `make verify` retains and passes every existing gate while
  composing the FF-216 contract tests.

## Verification Notes

Run
`./scripts/story-check specs/stories/FF-216-review-integrity-and-state-consistency`,
`sh -n tests/human-review.sh tests/review-integrity.sh`,
`./tests/human-review.sh`, `./tests/review-integrity.sh`,
`./scripts/handoff-check`, and root `make verify`. Each FF-216 case in
`tests/review-integrity.sh` maps to exactly one `AC-001` through `AC-012`.
