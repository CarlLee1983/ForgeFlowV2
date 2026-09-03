# Story: FF-208 Executable Security Fixture Matrix

## Goal

Make security-sensitive Story requirements verifiable when they are written, so
that an implementing agent discovers the required redaction, rejection, and
persistence cases from the Story instead of from repeated review loops.

## Context

A downstream Story required persisted artifacts to exclude raw query bodies,
expectation literals, returned rows, credentials, and user paths. The intent was
correct, but the wording was prose only. Reviewers discovered POSIX, Windows
drive, UNC, relative, and file URI paths, password-style pairs, quoted Bearer
and Basic authorization values, and secrets inside terminated and unterminated
SQL comments one loop at a time. The same Story also required four guards to run
and report while an existing regression test required short-circuiting after the
first failure, without saying that the older behavior was intentionally
superseded.

## Classification

* Security sensitive: no
* Baseline conformance: no

## Scope

### In Scope

* Add a required `## Classification` declaration to the Story contract and
  template.
* Add an optional `## Security Fixture Matrix` acceptance section with fixed
  columns and machine-checkable cells.
* Add optional `## Trust Boundary Fields` and `## Superseded Behavior` Story
  sections that become mandatory through the classification.
* Add `scripts/story-check`, a static read-only validator that reports a missing
  matrix, missing trust-boundary enumeration, or missing superseded-behavior
  declaration.
* Wire the validator into root `make verify` over this repository's own Stories
  and add isolated acceptance tests.

### Out of Scope

* Judging whether a Story's declared classification is truthful, or inferring
  security sensitivity from natural-language heuristics.
* Executing the fixtures, running the referenced tests, or checking that a named
  test path exists in a target repository.
* Generalized Markdown linting, Story generation, or acceptance rewriting.
* Changing bootstrap arguments, Doctor behavior, release checking, or the
  canonical verification command.

## Inputs

* Zero or more Story directories; with no argument, every directory under
  `specs/stories/` except `_template/`.
* `story.md` and `acceptance.md` inside each checked Story directory.

## Outputs

* Per-Story `PASS` or `FAIL` diagnostics naming the missing or prose-only
  declaration.
* One result from `STORY_CONTRACT_OK`, `STORY_CONTRACT_INCOMPLETE`, or `ERROR`,
  with the number of Stories checked.
* Exit status `0`, `1`, or `2` according to the documented contract.

## Rules

* R1: Every Story declares `Security sensitive` and `Baseline conformance`
  exactly once under `## Classification`, each as `yes` or `no`.
* R2: `Security sensitive: yes` requires a `## Security Fixture Matrix` in
  `acceptance.md` with at least one fixture row.
* R3: A fixture row declares exactly five columns: source field, payload,
  expected result, persisted locations, and verification.
* R4: The source field, payload, persisted locations, and verification cells
  must each carry a non-blank exact value in backticks. Prose such as
  `no credentials`, empty quotations, and whole-cell placeholders such as
  `<value>`, `TBD`, or `n/a` are rejected. A quoted value containing markup,
  such as a script payload, is an exact value and is accepted.
* R5: The expected result is exactly one of `preserve`, `redact`, `reject`, or
  `omit`.
* R6: `Security sensitive: yes` also requires `## Trust Boundary Fields` in
  `story.md`, with every entry naming an exact field.
* R7: `Baseline conformance: yes` requires `## Superseded Behavior` in
  `story.md`, with every entry naming an exact test path or behavior.
* R8: A section that contradicts its declaration is a failure in both
  directions; a Story declaring `no` must not carry the matching section.
* R9: The check is static and read-only. It never executes repository code and
  never replaces `make verify` or human review.
* R10: A fenced example inside a Story is documentation. Its contents are never
  read as declarations, headings, or fixture rows.
* R11: Contract violations map to exit `1`. Invalid invocation, a missing or
  unreadable Story file, a symlinked Story file, and an empty check set map to
  exit `2`.

## Expected Errors

* Unknown options or a missing Story directory print the reason and exit `2`.
* A missing, empty, unreadable, or symlinked `story.md` or `acceptance.md`
  reports `ERROR` and exits `2` without judging the Story.
* A missing, empty, or malformed declaration reports
  `STORY_CONTRACT_INCOMPLETE` and exits `1`.

## Dependencies

* The Story Contract and the existing Story and acceptance templates.
* The root canonical verification gate and its shell style.
* POSIX shell; no new runtime or package in an adopting repository.

## Constraints

* Extend the repository's current POSIX shell style without a CLI framework.
* The declaration must stay human-writable in Markdown; no new file format.
* Existing Stories in this repository and its examples are updated to carry the
  new declaration rather than being exempted.
* No commit, push, merge, tag, release, or remote mutation is part of this
  Story.
