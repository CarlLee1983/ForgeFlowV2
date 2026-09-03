# Repository Agent Guide

This repository is ForgeFlow itself: the protocol, the portable shell commands
that check it, and the templates adopters copy. It follows its own protocol, so
this guide is both the local instruction set and a worked example of what
`templates/AGENTS.md` describes.

## Development Workflow

For implementation work:

1. Read the assigned Story in `specs/stories/<id>/`, including its
   `## Classification` and, when present, its Trust Boundary Fields, Security
   Fixture Matrix, and Superseded Behavior.
2. Read its acceptance criteria.
3. Read `specs/handoff.md` for the current lifecycle state and baseline.
4. Inspect relevant existing code.
5. Implement the smallest coherent change.
6. Add or update tests, mapping each case to the acceptance criterion it covers.
7. Run `make verify`.
8. Repair failures until verification passes.

## Local engineering constraints

* `scripts/` is portable POSIX shell run under `set -eu`. It targets `sh`, not
  Bash, and must not depend on GNU-only options.
* `scripts/doctor` static mode uses shell builtins only. It must print a
  complete result block and a documented exit status even when the caller's
  `PATH` holds no external utilities.
* Every check is read-only against the target repository unless the human
  explicitly authorized execution with `--run-verify`.
* `tests/*.sh` are the acceptance tests. Each case is dispatched through
  `run_case '<AC id>' <function>` so a failure names the criterion it violates.
* Fixtures are built inside the test's temporary directory. A test must never
  make this repository's own Stories, handoff, or work tree the subject under
  test.

## The versioned surface

`protocol/` and `templates/` are what adopters copy and rely on. Before changing
either, classify the change in `protocol/versioning.md` as Breaking, Additive,
or Corrective, and record that classification in the Story. A Breaking change
requires migration guidance naming the required repository changes.

`templates/AGENTS.md` is a distributed artifact, not this guide. Editing it
changes what every future adopter receives.

## Completion

A task is not complete until:

```sh
make verify
```

passes successfully. That target is authoritative: it composes the protocol,
bootstrap, Doctor, Story, handoff, release, TypeScript, Go, and Actions gates.
No Story-specific command redefines PASS.

## Never

* change Story requirements without explicit human instruction
* weaken acceptance criteria to make tests pass
* remove failing tests simply to obtain PASS
* bypass repository verification
* expand scope unnecessarily
* state that a check passed without having run it in the current tree

## Completion Report

Report:

* changed files
* implementation summary
* tests added or changed
* verification result
* assumptions
* remaining risks

When work changes hands, update `specs/handoff.md`: exactly one current Story,
exactly one next Story or `pending`, completed Story IDs, the repository
baseline, and the last verification command and result. A dirty work tree must
attribute every dirty path. Never leave the next Story to be inferred from list
order.
