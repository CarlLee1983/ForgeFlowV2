# ADR-001: Execution governance belongs in the Story contract

* Status: accepted
* Date: 2026-09-07

## Context

ForgeFlow already answers "is the implementation verified" through the Story
contract and `make verify`. It did not answer four adjacent questions that an
implementing agent must answer before and after that gate:

* what kind of work is this;
* what is the agent allowed to do;
* which architecture decisions and contracts must survive the change; and
* how much verification depth does the change deserve.

The available alternatives were a second artifact type outside `specs/stories/`,
a runtime that resolves these questions dynamically, or an extension of the
existing Story contract.

## Decision

Task mode, authority, architecture metadata, and risk are optional declarations
inside the existing `story.md`, checked by the existing static checkers. The
verification profile is derived from the declared risk and architecture impact
rather than configured separately. The recorded verification result lives beside
the Story in `verification.md`.

ForgeFlow adds no workflow engine, state database, or agent runtime to carry
this information.

## Boundaries

* `Story` owns intent, classification, authority, architecture metadata, and
  risk. It does not own the verification commands a repository runs.
* `Verification` owns profile resolution, the recorded result model, and the
  acceptance-to-evidence trace. It does not own product or architecture
  judgment.
* `Human Review` owns whether a declaration is truthful and whether the declared
  evidence actually proves the acceptance criterion.

## Consequences

Every new declaration is optional and defaulted, so a Story written against an
earlier snapshot keeps its verdict. The cost is that ForgeFlow now checks
declarations it cannot prove: a Story may declare `Risk level: low` for
genuinely risky work and still pass. That truthfulness check stays with Human
Review, exactly as `## Classification` already does.

## Falsified if

A repository needs execution governance that the Story cannot carry — per-agent
authority that changes during one Story, or a verification profile that depends
on runtime state rather than on the declared risk. If that happens,
`scripts/verification-check` and `protocol/execution.md` stop being the right
home and the resolution must move to a repository-owned configuration.
