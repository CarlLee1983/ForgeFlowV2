# Repository Agent Guide

## Development Workflow

This repository follows the ForgeFlow development protocol.

For implementation work:

1. Read the assigned Story.
2. Read its acceptance criteria.
3. Inspect relevant existing code.
4. Implement the smallest coherent change.
5. Add or update tests.
6. Run `make verify`.
7. Repair failures until verification passes.

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
