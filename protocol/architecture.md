# Architecture Contract

A Story may state which architecture its change is answerable to. ForgeFlow
records and resolves those statements; it does not analyze the architecture.

## Architecture metadata

The optional `## Architecture` section uses progressive disclosure. A Story that
carries no architecture weight declares nothing, or at most an impact:

```markdown
## Architecture

* Impact: low
```

A Story that touches load-bearing structure names what must survive it:

```markdown
## Architecture

* Impact: medium
* Decision: `ADR-003`
* Boundary: `PaymentGateway`
* Contract: `PaymentGateway public interface remains compatible`
* Owner: `PaymentGateway = payment-domain`
```

`Impact` is `low`, `medium`, or `high` and defaults to `low`. `Decision`,
`Boundary`, `Contract`, and `Owner` are repeatable and each states one exact
backticked value. An `Owner` is written as `<boundary> = <owner>` and must name
a boundary the same Story declares.

`Impact: medium` or `Impact: high` names at least one decision or contract:
declaring that a change is architecturally significant without saying what it is
answerable to records nothing.

The concerns this metadata is meant to carry are ownership, boundary,
dependency direction, public contract, state authority, recovery, migration, and
retirement. ForgeFlow does not require a Story to address all of them.

## Architecture decisions

A decision record defaults to a directory beside the Story collection:

```text
specs/
├── decisions/
│   └── ADR-007-dba-behavior-outside-dbcli-core.md
└── stories/
```

A record normally lives at `specs/decisions/ADR-<digits>-<slug>.md`, resolved
relative to the Story collection so an example repository keeps its own
decisions. A repository that already has an ADR collection may set
`FORGEFLOW_DECISIONS_ROOT` to its directory for a `scripts/story-check`
invocation; for example, from its repository root:

```sh
FORGEFLOW_DECISIONS_ROOT=docs/adr ./scripts/story-check
```

The value is used as supplied and is the only decision root for that
invocation. An unset or empty value keeps the default `specs/decisions/` root.
The file name is `ADR-<digits>` optionally followed by `-<slug>`, and the record
declares its status once:

```markdown
# ADR-007: DBA behavior belongs outside dbcli core

* Status: accepted

## Context
...
## Decision
...
## Boundaries
...
```

Status is `proposed`, `accepted`, `superseded`, or `rejected`. Use
[the decision template](../templates/decision.md).

An undecided question is a state worth storing: a `proposed` record is a
legitimate artifact, not an incomplete one.

## Architecture verification

`scripts/story-check` performs the low-cost architecture checks that need no
analysis of source code:

* every referenced decision resolves to exactly one existing, readable record;
* that record's status is usable — `accepted`, or `proposed` when the Story's
  task mode is `architecture` or `mixed`, because deciding an open question is
  what that work is for;
* a `superseded` or `rejected` record is rejected as a dependency;
* the same decision is not referenced twice;
* every declared owner resolves to a declared boundary; and
* required architecture metadata is well formed.

These reuse the existing checker vocabulary — a rule, a static check over a
declared artifact, and a reported result composed into the same
`STORY_CONTRACT_OK` or `STORY_CONTRACT_INCOMPLETE` verdict. ForgeFlow adds no
parallel rule engine.

The `architecture` layer in a [verification profile](verification.md#verification-profiles)
is the extension point for the five checks that require analysing source code:

* dependency direction validation
* forbidden imports
* layer boundaries
* public interface drift
* architecture drift

ForgeFlow does not implement them, and it does not intend to.
This is a scope boundary, not a schedule: they belong to the adopting
repository, which places its own checker behind `make verify` like any other
check and records the `architecture` layer as `unsupported` with a residual
risk when it has none.
[ADR-003](../specs/decisions/ADR-003-forgeflow-does-not-analyze-architecture.md)
records that decision, what it costs, and the condition that would overturn it.

`public interface drift` above means an exported interface changing between
versions. It is unrelated to Doctor's `CONTRACT_DRIFT` result, which reports
adoption marker, Story, handoff, and Guidance drift and is described in
[Repository Doctor](../docs/doctor.md). The two share no vocabulary beyond the
word.

Whether a declared boundary is the right boundary remains Human Review's
judgment.
