# Repository Agent Guide

This repository is ForgeFlow itself: the protocol, the portable shell commands
that check it, and the templates adopters copy. It follows its own protocol, so
this guide is both the local instruction set and a worked example of what
`templates/AGENTS.md` describes.

## Development Workflow

For implementation work:

1. Read the assigned Story in `specs/stories/<id>/`, including its
   `## Classification` and, when present, its Task mode, Authority,
   Architecture, Risk, Trust Boundary Fields, Security Fixture Matrix, and
   Superseded Behavior.
2. Read its acceptance criteria.
3. Read `guidance/ENTRY.md` when it exists, then load only the guidance relevant
   to the Story.
4. Read `specs/handoff.md` for the current lifecycle state and baseline.
5. Inspect relevant existing code.
6. Implement the smallest coherent change.
7. Add or update tests, mapping each case to the acceptance criterion it covers.
8. Run `make verify`.
9. Repair failures until verification passes.
10. Record the result in `specs/stories/<id>/verification.md` when the Story
    keeps one, tracing every acceptance criterion to the observation that proves
    it and retaining every skipped, blocked, or unsupported check.

Story intent remains canonical. Specific, approved repository context beats
generic guidance; unresolved conflicts go to Human Review. Guidance is advisory
and never adds hidden acceptance criteria, substitutes for executable checks, or
proves design quality from a passing gate.

## Execution contract

[`protocol/execution.md`](protocol/execution.md) is binding here, not advisory.
Resolve the Story's execution contract before implementing:

```sh
./scripts/verification-check specs/stories/<id>
```

Perform only the operations the Story grants. An approved execution Story
authorizes implementation; it never authorizes committing, pushing, deploying,
adding a dependency, or running a migration. An `evidence` Story authorizes no
repository change at all. A required check that was skipped, blocked, or
unsupported, or an acceptance criterion with no passing observation, leaves the
work partial: report it, do not round it up to Done.

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
* perform an operation the Story does not grant
* report partial verification as complete, or drop a residual risk

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
