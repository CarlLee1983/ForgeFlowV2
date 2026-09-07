# ForgeFlow Concepts

ForgeFlow separates intent, guidance, implementation, verification, and approval so an AI
agent can be replaced without replacing the development process.

## Protocol first

Prompts guide judgment, while repository tools enforce repeatable constraints.
Rules that can be evaluated mechanically belong in formatters, linters, type
checkers, architecture checks, tests, or other commands behind
`make verify`.

The repository owns those tools and rules; ForgeFlow standardizes only the
verification interface. Naming, abstraction quality, and other contextual
design judgments remain with Human Review. See [Code Quality](code-quality.md)
and [Human Review](human-review.md).

The protocol does not assume that an agent will remember every instruction or
declare its own work complete.

## Small Stories

A Story packages one approved outcome with scope, inputs, outputs, business
rules, expected errors, constraints, and acceptance criteria. Small Stories
reduce ambiguity and make failure diagnosis local.

See [the Story Contract](../protocol/story.md).

## Intent != Guidance != Verification != Approval

These boundaries are intentionally separate:

| Layer | Purpose | Authority limit |
| --- | --- | --- |
| Story | Defines the approved product outcome. | It is the product-intent authority. |
| Guidance | Captures reusable engineering judgment. | It is selective and advisory, never hidden ACs. |
| Verification | Produces deterministic mechanical evidence through `make verify`. | PASS does not prove design quality. |
| Human Review | Evaluates product, design, and architecture fit. | It is the final judgment. |

Agents read an approved Story first, then load only relevant guidance. Specific,
explicitly approved repository context takes precedence over generic principles.
An unresolved conflict belongs in Human Review, not in an automatic override.
ForgeFlow does not use a runtime, memory service, RAG, or semantic judge to make
that judgment.

## Deterministic completion

Implementation is eligible for review only when the repository's canonical
`make verify` command exits successfully. PASS is evidence that
automated requirements hold; it is not product approval and does not merge the
change.

See [the Verification Contract](../protocol/verification.md).

Human Review then evaluates product intent, design, and architecture. Only a
human accepts the work; requested implementation changes require a new complete
`make verify` PASS. Human Review is not an LLM score or automated approval.

## Repair loop

When verification fails, the agent uses the output to diagnose the root cause,
repairs the implementation or a valid test defect, and runs the same gate again.
The loop preserves the approved Story and acceptance criteria.

## Responsibilities

| Participant | Owns |
| --- | --- |
| Human | product intent, Story approval, ambiguous business decisions, architecture judgment, final review, merge |
| Agent | implementation, tests, mechanical refactoring, verification, repair, delivery report |
| Repository tools | deterministic PASS or FAIL |

## Capability != Authority

An agent being able to perform an operation is not authorization to perform it.
A Story grants `plan`, `modify`, `add_dependency`, `migration`, `commit`,
`push`, and `deploy` separately, and one grant never implies the next:

```text
review != fix
plan != implement
implement != commit
commit != push
push != deploy
```

## Green command != Verified Story

`make verify` passing proves that the checks behind it passed. It does not prove
that a required verification layer existed, or that any acceptance criterion was
actually observed. A Story is verified when the required profile passed and
every criterion has a passing observation; anything less is partial. See
[Execution Governance](execution-governance.md).

## Agent agnosticism

ForgeFlow stores the process in ordinary repository artifacts rather than a
vendor-specific agent runtime. Codex, Claude Code, Cursor, OpenCode, Gemini CLI,
future agents, and human engineers can all follow the same Story and gate.

Teams that want multiple specialist agents can use the [optional Agentic
Discipline adoption pattern](agentic-discipline.md). It adds no protocol state
or required runtime; the Story, `make verify`, and Human Review remain
canonical.

## Conceptual lifecycle

The shared state vocabulary makes handoffs understandable without requiring
state persistence or orchestration. See [the Story Lifecycle](../protocol/lifecycle.md).
