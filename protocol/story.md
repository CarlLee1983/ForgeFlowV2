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
- **Classification** — whether the Story is security sensitive and whether it
  changes baseline behavior, each declared as `yes` or `no`
- **Constraints** — non-negotiable technical, operational, or policy limits

Two sections are conditional on the Classification:

- **Trust Boundary Fields** — required when `Security sensitive: yes`. Name every
  user-controlled or externally derived field the requirement covers, including
  custom metadata, derived summaries, evidence labels, error details, and
  external references.
- **Superseded Behavior** — required when `Baseline conformance: yes`. Name each
  existing test or documented behavior the Story intentionally replaces, so a
  conflicting regression test is recognized as superseded rather than as a
  defect.

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

### Security fixture matrix

A Story declaring `Security sensitive: yes` states its secrecy, redaction,
authorization, or persistence requirements as an executable fixture matrix in
`acceptance.md` rather than as prose such as "no credentials". Each row is one
fixture:

| Column | Purpose |
| --- | --- |
| Source field | The untrusted input or derived field |
| Payload | The exact representative value |
| Expected result | `preserve`, `redact`, `reject`, or `omit` |
| Persisted locations | Every artifact field that must be checked |
| Verification | The test path or command that proves the result |

Every column except the expected result carries a non-blank exact value in
backticks, so that an implementing agent finds the required cases in the Story
instead of discovering them one review loop at a time. A quoted payload may
contain markup; only a whole-cell placeholder such as `<value>`, `TBD`, or an
empty quotation is rejected. A pipe after an odd consecutive run of backslashes
is part of the cell payload; an even run leaves it a delimiter. Payload
characters are preserved.

## Checking the contract

`scripts/story-check` statically reports a missing classification, a missing or
prose-only fixture matrix, a missing trust-boundary enumeration, or a missing
superseded-behavior declaration:

```sh
./scripts/story-check [story-directory ...]
```

A fenced example inside a Story is documentation: its contents are never read as
headings, declarations, or fixture rows. After surrounding spaces, tabs, and CR
are trimmed, a run of at least three backticks or tildes opens a fence. Only the
same character, at least the opening length, with no non-whitespace suffix
closes it. Unclosed fences ignore through EOF.

The checker supports this contract subset only, not general Markdown parsing:
exact Classification bullets, conditional-section bullets, and the exact matrix
header with outer table pipes. Inline backticks do not shield a raw pipe; use
the documented backslash escape.

It is read-only, exits `0` for `STORY_CONTRACT_OK`, `1` for
`STORY_CONTRACT_INCOMPLETE`, and `2` for an operational error. It judges the
declared structure only; it never decides whether a classification is truthful
and never replaces `make verify` or human review.

## Sizing and readiness

Optional `scripts/story-check --ready [story-directory ...]` checks minimum
content as well as structure; defaults and Doctor do not change. It requires
non-placeholder content under exact `## Goal` and `## Scope` headings and at
least one unique checkbox `AC-<digits>:` with same-line content, for example
`* [ ] AC-001: An empty order returns zero cents.` Subheadings do not count as
content; fenced examples are ignored. The finite placeholders include
`<acceptance criterion>` and the shipped Goal sentence. The complete supported
syntax and exact placeholder list are in [Contract Checks](../docs/contract-checks.md#optional-minimum-content-readiness).
`STORY_READINESS_OK` distinguishes minimum-content success from structural
`STORY_CONTRACT_OK`; neither grants human-approved READY. This mode does not
score language, require automation per AC, or migrate historical Stories.

A Story is small enough when one coherent implementation can satisfy all of its
acceptance criteria and be verified without partially delivering a second
outcome. Split Stories whose rules, dependencies, or rollout can be completed
and reviewed independently.

A Story can enter READY when:

- the Goal and scope are approved by a human;
- business rules and expected errors are explicit;
- acceptance criteria cover the required behavior;
- the Classification is declared and its required sections are present;
- unresolved decisions do not materially change the implementation.

## Change control

Humans own Story intent and approve requirement changes. Agents may identify
ambiguity, conflicts, or missing decisions, but do not silently revise the Story
or weaken acceptance criteria. Record an approved change in the Story files
before implementation resumes.
