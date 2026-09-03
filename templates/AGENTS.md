# Repository Agent Guide

## Development Workflow

This repository follows the ForgeFlow development protocol.

For implementation work:

1. Read the assigned Story, including its Classification and, when present, its
   security fixture matrix and superseded behavior.
2. Read its acceptance criteria.
3. Inspect relevant existing code.
4. Implement the smallest coherent change.
5. Add or update tests.
6. Run `make verify`.
7. Repair failures until verification passes.

## Review Preparation

After PASS, prepare Human Review with:

* a Story and acceptance criteria mapping summary
* important design and boundary decisions or architecture impacts
* test and verification evidence
* assumptions, unresolved risks, and suggested attention points

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

passes successfully.

## Never

* change Story requirements without explicit human instruction
* weaken acceptance criteria to make tests pass
* remove failing tests simply to obtain PASS
* bypass repository verification
* expand scope unnecessarily

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
