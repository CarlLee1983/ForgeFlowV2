# Repository Agent Guide

## Development Workflow

This repository follows the ForgeFlow development protocol.

For implementation work:

1. Read the assigned Story, including its Classification and, when present, its
   Task mode, Authority, Architecture, Risk, security fixture matrix, and
   superseded behavior.
2. Read its acceptance criteria and Acceptance Evidence map. Confirm every AC
   names a method, fixture or precondition, and expected observation before
   implementation; a `human` row remains a required review case.
3. Read `guidance/ENTRY.md` when it exists, then load only the guidance relevant
   to the Story.
4. Inspect relevant existing code.
5. Implement the smallest coherent change.
6. Add or update tests.
7. Run `make verify`.
8. Repair failures until verification passes.
9. When the Story keeps a `verification.md`, record what each check did and
   trace every acceptance criterion to the observation that proves it. Retain
   every skipped, blocked, or unsupported check as a residual risk.

Story intent remains canonical. Specific, approved repository context beats
generic guidance; unresolved conflicts go to Human Review. Guidance is advisory
and never adds hidden acceptance criteria, substitutes for executable checks, or
proves design quality from a passing gate.

## Authority

Perform only the operations the Story grants. An approved execution Story
authorizes implementation. It never authorizes committing, pushing, deploying,
adding a dependency, or running a migration, and a Story whose task mode is
`evidence` authorizes no repository change at all. Being able to perform an
operation is not authorization to perform it.

## Review Preparation

After PASS, prepare Human Review with:

* a Story and acceptance criteria mapping summary
* the acceptance-evidence row used for each criterion
* important design and boundary decisions or architecture impacts
* test and verification evidence
* assumptions, unresolved risks, and suggested attention points

Check Classification truthfulness against the actual trust boundaries and
baseline behavior, including the required conditional evidence. Confirm
verification freshness: the complete PASS must cover the current
implementation. A source, test, configuration, or other behavior-affecting
change after PASS requires a new full `make verify`; attribute a final
handoff-only documentation change so the human can judge its impact.

This report supports review without self-approval. Only a human may accept
REVIEW and advance the Story to DONE. If review requests an implementation
change, return to implementation and run full `make verify` again before
REVIEW. If feedback changes or exposes missing requirements, move the Story to
SPEC_BLOCKED for human revision and approval instead of changing Story intent.

## Code Quality

* Follow the repository's existing formatter, lint, type, and architecture
  settings.
* Do not disable, bypass, or weaken existing rules merely to obtain PASS.
* Keep new code consistent with neighboring code and the existing architecture.
* Treat `make verify` as the authority for every automated judgment.
* Leave design judgments that cannot be automated to Human Review.

## Completion

A task is not complete until:

```sh
make verify
```

passes successfully, the required verification profile passed, and every
required acceptance criterion has a passing observation. A skipped, blocked, or
unsupported required check, or an untraced criterion, leaves the work partial.
Partial work is reported as partial.

## Never

* change Story requirements without explicit human instruction
* weaken acceptance criteria to make tests pass
* remove failing tests simply to obtain PASS
* bypass repository verification
* expand scope unnecessarily
* perform an operation the Story does not grant
* state that a check passed without having run it in the current tree
* report partial verification as complete, or drop a residual risk

## Completion Report

Report:

* changed files
* implementation summary
* tests added or changed
* verification result
* assumptions
* remaining risks

When work changes hands, record the handoff lifecycle block: exactly one current
Story, exactly one next Story or `pending`, completed Story IDs, the repository
baseline, and the last verification command and result. Never leave the next
Story to be inferred from list order.
