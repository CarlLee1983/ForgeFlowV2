# Story: FF-209 Machine-Readable Handoff Contract

## Goal

Let the consumer of a ForgeFlow handoff know exactly which Story is current,
which Story is next, and which repository baseline the work starts from, without
inferring any of it from list order or narrative text.

## Context

A handoff listed several candidate Stories but named no single next Story, so
the consumer inferred the selection from ordering. The same handoff did not
record the baseline commit or the state of the working tree, even though the
target repository already carried modified and untracked files that the selected
Story also had to touch. That left scope, attribution, verification failures,
and partial baseline conformance ambiguous.

## Classification

* Security sensitive: no
* Baseline conformance: no

## Scope

### In Scope

* Define a Handoff Contract with one machine-readable lifecycle block covering
  workflow, baseline, and verification.
* Add `templates/handoff.md` as the canonical block layout.
* Add `scripts/handoff-check`, a static read-only validator for the block.
* Reject contradictory lifecycle statements rather than repairing them.
* Wire the validator into root `make verify` over this repository's own handoff
  and add isolated acceptance tests.

### Out of Scope

* A workflow engine, state database, issue-tracker integration, or agent
  orchestration runtime.
* Reading Git, computing the baseline commit, or discovering dirty paths on the
  consumer's behalf.
* A general YAML implementation; only the documented restricted subset is
  parsed.
* Changing bootstrap arguments, Doctor behavior, release checking, or the
  canonical verification command.

## Inputs

* An optional handoff file path, defaulting to `specs/handoff.md`.
* Exactly one fenced `yaml` lifecycle block inside that file.

## Outputs

* `PASS` lines summarizing the current Story, next Story, completed count,
  baseline, and last verification, or `FAIL` lines naming each violated
  statement.
* One result from `HANDOFF_CONTRACT_OK`, `HANDOFF_CONTRACT_INCOMPLETE`, or
  `ERROR`.
* Exit status `0`, `1`, or `2` according to the documented contract.

## Rules

* R1: A handoff contains exactly one machine-readable lifecycle block, holding
  the `workflow`, `baseline`, and `verification` sections exactly once each.
* R2: `workflow.current_story` appears exactly once as one Story ID or `none`.
* R3: `workflow.next_story` appears exactly once as one Story ID or `pending`;
  candidates are recorded as prose and never as `next_story`.
* R4: `workflow.completed_stories` is recorded separately, holds only Story IDs,
  and holds no duplicates.
* R5: `baseline.repository`, `baseline.branch`, and a full 40-character
  `baseline.commit` are required, as is `baseline.dirty_worktree` as `true` or
  `false`.
* R6: A dirty worktree additionally requires `baseline.story_owned_paths` with
  at least one entry and `baseline.known_unrelated_paths`, and no path appears
  in both. Either list key may be declared at most once.
* R7: `verification.last_command` and `verification.result` are required, and
  the result is exactly one of `pass`, `fail`, or `not_run`.
* R8: Contradictory statements are rejected: the same Story as both current and
  next, a current or next Story also recorded as completed, an active status
  with `current_story: none`, and a `review` or `done` status whose last
  verification result is not `pass`.
* R9: A Story ID is uppercase letters or digits, a hyphen, and digits, such as
  `FF-209`.
* R10: The check is static and read-only. It never runs verification, never
  edits the handoff, and never authorizes a merge.
* R11: Contract violations map to exit `1`. Invalid invocation and a missing,
  empty, unreadable, or symlinked handoff file map to exit `2`.

## Expected Errors

* Unknown options or more than one path print usage and exit `2`.
* A missing, empty, unreadable, or symlinked handoff reports `ERROR` and exits
  `2`.
* A missing block, more than one block, an unclosed block, an unknown key or
  section, or an unsupported line reports `HANDOFF_CONTRACT_INCOMPLETE` and exits `1`.

## Dependencies

* The Story and Lifecycle Contracts and their state vocabulary.
* The root canonical verification gate and its shell style.
* POSIX shell; no new runtime or package in an adopting repository.

## Constraints

* Parse only the documented restricted subset: two-space keys, four-space list
  items, and `[]` for an empty list.
* The handoff stays a human-readable Markdown file; prose context is allowed
  outside the block and ignored by the validator.
* No commit, push, merge, tag, release, or remote mutation is part of this
  Story.
