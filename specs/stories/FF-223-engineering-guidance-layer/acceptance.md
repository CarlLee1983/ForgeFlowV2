# Acceptance Criteria

Carl accepted all 17 criteria, including the human-review evidence below, on
2026-09-07 and authorized commit and full release. This acceptance does not
substitute for GitHub's required PR review or exact-SHA release verification.

* [x] AC-001: `guidance/ENTRY.md` defines Story-first, selective Guidance loading and Human Review escalation.
* [x] AC-002: `guidance/PRINCIPLES.md` provides a small, conservative durable baseline.
* [x] AC-003: `guidance/DECISIONS.md` provides an intentionally reviewed, lightweight decision-record example.
* [x] AC-004: `guidance/PRACTICES.md` provides reusable workflow and repair practices without redefining protocol authority.
* [x] AC-005: Stories and the Story template support optional human-readable Guidance without invalidating older Stories.
* [x] AC-006: Root and distributed agent guidance plus the Story-development skill load relevant Guidance after Story and acceptance review.
* [x] AC-007: Specific approved repository context takes precedence over generic Guidance, and unresolved conflict goes to Human Review.
* [x] AC-008: Documentation distinguishes Intent, Guidance, Verification, and Approval.
* [x] AC-009: Guidance cannot substitute for executable checks behind `make verify`.
* [x] AC-010: Guidance cannot substitute for Human Review or automatic architecture approval.
* [x] AC-011: Existing Stories remain compatible when `## Guidance` is absent.
* [x] AC-012: Fresh, dry-run, conflict, force, recovery, and upgrade bootstrap behavior safely covers the Guidance baseline.
* [x] AC-013: Static Doctor reports absent, complete, partial, and unsafe Guidance compatibly and without extra execution.
* [x] AC-014: Fixture-based deterministic tests cover the new Guidance behavior with named acceptance cases.
* [x] AC-015: The complete repository `make verify` gate passes.
* [x] AC-016: ForgeFlow remains agent-agnostic and declarative.
* [x] AC-017: No runtime, memory, RAG, remote loading, orchestration, semantic judge, or automatic knowledge mutation is introduced.

## Security Fixture Matrix

| Source field | Payload | Expected result | Persisted locations | Verification |
| --- | --- | --- | --- | --- |
| `bootstrap.target_path` | `guidance/ENTRY.md -> outside-guidance-leaf` | reject | `outside-guidance-leaf bytes` | `tests/bootstrap.sh:FF223-AC-012-ownership` |
| `guidance.path` | `guidance/ENTRY.md -> outside-guidance` | reject | `Doctor output Guidance: ERROR` | `tests/doctor.sh:FF223-AC-013` |
| `guidance.contents` | `empty guidance/PRACTICES.md` | preserve | `guidance/PRACTICES.md bytes` | `tests/doctor.sh:FF223-AC-013` |

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | human | `guidance/ENTRY.md` | `FF-223 diff` | `Human Review confirms Story-first selective loading and escalation` |
| `AC-002` | human | `guidance/PRINCIPLES.md` | `FF-223 diff` | `Human Review confirms conservative durable principles` |
| `AC-003` | human | `guidance/DECISIONS.md` | `FF-223 diff` | `Human Review confirms lightweight decision format` |
| `AC-004` | human | `guidance/PRACTICES.md` | `FF-223 diff` | `Human Review confirms reusable practices preserve protocol authority` |
| `AC-005` | test | `tests/story-check.sh:FF223-AC-005` | `temporary Story fixture` | `absent and present Guidance pass` |
| `AC-006` | human | `AGENTS.md; templates/AGENTS.md; skills/story-development/SKILL.md` | `FF-223 diff` | `Human Review confirms the complete agent flow` |
| `AC-007` | human | `guidance/ENTRY.md; protocol/repository-contract.md` | `FF-223 diff` | `Human Review confirms precedence and escalation guidance` |
| `AC-008` | human | `docs/concepts.md` | `FF-223 diff` | `Human Review confirms the four authority layers are distinguished` |
| `AC-009` | human | `docs/concepts.md; guidance/ENTRY.md` | `FF-223 diff` | `Human Review confirms Guidance does not replace executable checks` |
| `AC-010` | human | `docs/concepts.md; guidance/ENTRY.md` | `FF-223 diff` | `Human Review confirms Guidance does not replace approval` |
| `AC-011` | test | `tests/story-check.sh:FF223-AC-005` | `temporary Story fixture` | `Story without Guidance passes` |
| `AC-012` | test | `tests/bootstrap.sh:AC-001, FF219-AC-003, FF223-AC-012-fresh, FF223-AC-012-ownership` | `temporary bootstrap fixtures` | `fresh/dry-run, recovery, force, and upgrade behavior are safe` |
| `AC-013` | test | `tests/doctor.sh:FF223-AC-013` | `temporary Doctor fixtures` | `optional, drift, and error results are deterministic` |
| `AC-014` | test | `tests/bootstrap.sh:FF223-AC-012-fresh, FF223-AC-012-ownership; tests/doctor.sh:FF223-AC-013` | `fixture-based suites` | `named acceptance cases pass` |
| `AC-015` | command | `make verify` | `repository checkout` | `exit 0` |
| `AC-016` | human | `README.md; docs/concepts.md; FF-223 diff` | `Human Review` | `Human confirms declarative agent-agnostic scope` |
| `AC-017` | human | `FF-223 diff` | `Human Review` | `Human confirms excluded runtime and knowledge systems are absent` |

## Verification Notes

Run `./tests/bootstrap.sh`, `./tests/doctor.sh`, `./tests/story-check.sh`,
`./scripts/story-check --ready specs/stories/FF-223-engineering-guidance-layer`,
and `make verify`. Tests prove deterministic surface behavior only; Human Review
judges whether selected Guidance is relevant or sufficient.

`tests/protocol.sh:FF223-AC-001`, `FF223-AC-005`, and `FF223-AC-008` are
supplementary structural checks for baseline files, agent artifacts, and the
concept title. They do not prove the full semantics claimed by AC-001, AC-006,
or AC-008.
