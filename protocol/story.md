# Story Contract

A ForgeFlow Story is the approved intent boundary for one independently
verifiable change. It describes the outcome and constraints without prescribing
an implementation unless the implementation itself is a required constraint.

## Location

Store each Story under:

```text
specs/stories/<story-id>/
├── story.md
├── acceptance.md
└── task.md
```

Use a stable, unique Story ID followed by an optional readable slug, for example
`ORD-123-refund-order`.

`story.md` and `acceptance.md` are required once a Story
enters READY. `task.md` is optional progress metadata and never
overrides product requirements.

## Story fields

The Story records:

- **Goal** — the user or business outcome
- **Context** — background needed to interpret the change
- **Scope** — explicit in-scope and out-of-scope boundaries
- **Inputs** — data, events, or commands consumed
- **Outputs** — observable results produced
- **Rules** — numbered business invariants
- **Expected Errors** — required failure behavior
- **Dependencies** — systems or prior work the Story relies on
- **Constraints** — non-negotiable technical, operational, or policy limits

Use [the Story template](../templates/story/story.md) as the canonical field
layout.

## Acceptance

`acceptance.md` translates intent into observable checks across the
happy path, business rules, failure cases, and regression requirements. Each
criterion should have one unambiguous outcome that a test, command, or human
review can evaluate.

Story-specific setup or focused commands belong under Verification Notes, but
they supplement rather than replace repository-level `make verify`.
Use [the Acceptance template](../templates/story/acceptance.md).

## Sizing and readiness

A Story is small enough when one coherent implementation can satisfy all of its
acceptance criteria and be verified without partially delivering a second
outcome. Split Stories whose rules, dependencies, or rollout can be completed
and reviewed independently.

A Story can enter READY when:

- the Goal and scope are approved by a human;
- business rules and expected errors are explicit;
- acceptance criteria cover the required behavior;
- unresolved decisions do not materially change the implementation.

## Change control

Humans own Story intent and approve requirement changes. Agents may identify
ambiguity, conflicts, or missing decisions, but do not silently revise the Story
or weaken acceptance criteria. Record an approved change in the Story files
before implementation resumes.
