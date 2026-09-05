# Optional Agentic Discipline Adoption Pattern

This document records an optional way to apply Robert C. Martin's public
"Agentic Discipline" ideas to a ForgeFlow repository. It is guidance, not a
protocol change: ForgeFlow still defines a Small Story, runs the repository's
canonical `make verify` gate, and requires Human Review before merge. It does
not add an orchestration runtime, new handoff fields, or a required agent
vendor.

## The idea in one sentence

Keep product intent and the high-level source document with humans, then let
specialized agents produce and challenge the implementation through explicit,
machine-checkable gates. Martin describes the implementation code as the AI's
domain; the human-owned source and constraints are the control surface.

The primary descriptions are in [Clean Coders Agentic Discipline,
Part 2](https://cleancoders.com/episode/agentic-discipline-2) and [Part
6](https://cleancoders.com/episode/agentic-discipline-6). The six-agent
sequence below is a practical summary of Part 6, not a ForgeFlow requirement.

## Six roles and their evidence

| Role | Responsibility | Handoff evidence |
| --- | --- | --- |
| Specifier | Turn the approved outcome into detailed acceptance tests (Gherkin in Martin's example) and a manual UI QA procedure. | Updated acceptance examples and a reproducible QA checklist |
| Coder | Implement the behavior, unit tests, and an acceptance harness. | A worktree in which all acceptance tests pass |
| Cleaner | Enforce DRY and code-quality thresholds by refactoring production code and tests. | Before/after quality report plus passing tests |
| Architect | Inspect module boundaries and the dependency graph; add property-based tests where they expose a useful invariant. | Boundary/dependency review and new invariant tests |
| Hardener | Run language-level and Gherkin-level mutation testing. | Mutation report, including surviving mutants and the decision for each |
| QA | Convert the original QA procedure into automated UI-driving checks and verify the final system behavior. | UI run output tied back to the acceptance procedure |

Martin's videos describe each role working in an isolated Git worktree. Use
that isolation only when the repository and team benefit from parallel work;
the worktree is an implementation detail, not a new protocol state.

## Mapping the pattern to ForgeFlow

| Agentic Discipline concept | ForgeFlow artifact or gate |
| --- | --- |
| Human-owned source | An approved Story with business rules, constraints, and acceptance criteria |
| Specifier output | The Story's acceptance section and, when needed, a checked-in QA procedure |
| Coder output | The implementation and tests required by the Story |
| Cleaner / Architect / Hardener evidence | Repository-supported checks and review artifacts; add none when the repository cannot run them deterministically |
| QA result | Acceptance evidence and Human Review of product behavior |
| Final deterministic gate | `make verify` (the only canonical ForgeFlow completion command) |

The mapping deliberately leaves the existing [handoff
contract](../protocol/handoff.md) unchanged. A role may be recorded in a
branch name, worktree note, or delivery report, but adopters should not invent
protocol fields just to imitate a six-agent diagram.

## A small adoption loop

1. Pick one small, reversible Story and make its acceptance criteria executable
   or otherwise reproducible.
2. Start with one implementation agent. Add a specialist only when a
   deterministic check or a repeated review failure justifies it.
3. Keep every report tied to the Story: changed paths, command, result, and
   unresolved risk. Run `make verify` after each repair loop.
4. Stop for a human decision when product intent, security, performance,
   architecture, or an ambiguous failure is at stake. Human Review remains the
   authority to accept and merge.

This gives teams the useful part of the pattern—small sources and evidence
gates—without requiring an agent swarm on every change.

## Boundaries and limitations

Coverage, mutation scores, CRAP-style thresholds, and UI automation are
signals, not proof that a system satisfies its users. They can miss domain
meaning, security posture, operational behavior, accessibility, and
performance trade-offs. Community discussion has raised the same concern;
see the [Hacker News discussion](https://news.ycombinator.com/item?id=47998601)
and the secondary summary of the [Grady Booch critique](https://cctest.ai/blog/uncle-bob-ai-code-review/).

Treat any numeric threshold as a repository-owned policy with a documented
reason and rollback path. Do not weaken `make verify`, acceptance criteria, or
Human Review to make an agent pipeline appear green.

## Further reading

- [Clean Coders: Agentic Discipline, Part 2](https://cleancoders.com/episode/agentic-discipline-2)
- [Clean Coders: Agentic Discipline, Part 6](https://cleancoders.com/episode/agentic-discipline-6)
- [Clean AI Agentic](https://www.oreilly.com/videos/clean-ai-agentic/9780135968819/), the six-part Robert and Justin Martin series
- [Quid Pro Quo's reconstruction and transcript notes](https://quidproquo.cc/posts/ai/2026-07-25-uncle-bob-agent-code-review-en/), a secondary source
