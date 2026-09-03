# Story: FF-212 Contract Checks Without External Utilities

## Goal

Make `scripts/story-check` and `scripts/handoff-check` reach the same verdict
whatever the caller's `PATH` contains, so that Doctor cannot report drift that
does not exist.

## Context

FF-211 made Doctor's static path use shell builtins only, and Doctor now
composes both checkers to decide whether to report `CONTRACT_DRIFT`. The
checkers were left byte-identical by that Story's `AC-012`, and they call
`grep`, `sort`, and `uniq`.

Verified on `main` at `7e2299971b07afdc925d141e17d87fb5a0908d15`: with an empty
`PATH`, `scripts/handoff-check` reports `HANDOFF_CONTRACT_INCOMPLETE` for a
handoff that the same command reports `HANDOFF_CONTRACT_OK` for with a normal
`PATH`. Composed by Doctor, that becomes `Result: CONTRACT_DRIFT` for a
conformant repository. Nothing fails loudly: the missing utility makes a
condition false, and a false condition reads as a contract violation.

There are four external call sites:

* `scripts/story-check` line 354, `grep -Eq '^\|( *:?-+:? *\|){5}$'`, the
  five-column security fixture matrix separator row.
* `scripts/handoff-check` line 47, `grep -Eq '^[A-Z][A-Z0-9]*-[0-9]+$'`, the
  Story ID form.
* `scripts/handoff-check` line 68,
  `grep -v '^$' | sort | uniq -d | grep -q .`, duplicate detection over a
  newline-separated list.
* `scripts/handoff-check` line 425, `grep -Eq '^[0-9a-f]{40}$'`, the baseline
  commit form.

Every one is a pure text decision with a shell-builtin equivalent, and both
scripts already read files with `while IFS= read -r` loops.

## Classification

Both declarations are required. `yes` makes the matching section below
mandatory.

* Security sensitive: no
* Baseline conformance: no

## Scope

### In Scope

* Replace the four external call sites with shell-builtin equivalents that
  preserve the documented acceptance set of each pattern exactly.
* State the builtin-only guarantee in `docs/contract-checks.md` alongside the
  existing read-only guarantee.
* Extend `tests/story-check.sh` and `tests/handoff-check.sh` with cases that run
  each command under a `PATH` holding no external utilities.
* Extend `tests/doctor.sh` so a conformant repository under an empty `PATH`
  reports `STRUCTURE_OK`, not `CONTRACT_DRIFT`.

### Out of Scope

* Any change to the results, exit codes, command forms, or output text of either
  checker for an input they judge correctly today.
* `scripts/bootstrap` and Doctor's `--run-verify` mode, which write files or run
  `make` and legitimately require external commands.
* Factoring the adoption-marker parse shared by `scripts/bootstrap` and
  `scripts/doctor` into one place.
* Making either checker fail loudly on a missing utility instead of not needing
  one.

## Inputs

* The existing Story directories and handoff files both checkers already accept.
* The caller's `PATH`, including one that resolves no external utility.

## Outputs

* Identical checker output and exit status for a given input regardless of
  `PATH`.
* Doctor's composed result reflecting the repository's real state under any
  `PATH`.

## Rules

* R1: Neither checker invokes an external command on any code path.
* R2: Each replaced pattern accepts and rejects exactly what its regular
  expression accepted and rejected, including the anchors.
* R3: The Story ID form remains one uppercase letter, then zero or more
  uppercase letters or digits, then `-`, then one or more digits, with nothing
  before or after.
* R4: The baseline commit form remains exactly forty lowercase hexadecimal
  characters.
* R5: Duplicate detection ignores blank entries and reports a duplicate when the
  same non-blank entry appears more than once, as the previous pipeline did.
* R6: The matrix separator row remains a leading `|` followed by exactly five
  cells of optional spaces, an optional leading `:`, one or more `-`, an
  optional trailing `:`, optional spaces, and a closing `|`.
* R7: Both checkers remain static and read-only and keep their documented
  results, exit codes, and command forms.

## Expected Errors

* No new error is introduced. An input that reports `STORY_CONTRACT_INCOMPLETE`
  or `HANDOFF_CONTRACT_INCOMPLETE` today reports the same result afterwards, for
  the same reason and with the same message.

## Dependencies

* `scripts/story-check`, `scripts/handoff-check`, `tests/story-check.sh`,
  `tests/handoff-check.sh`, and `tests/doctor.sh`.
* FF-211 for the Doctor composition this defect is visible through.

## Constraints

* Both scripts remain portable POSIX shell run under `set -eu`; the replacements
  use `case` patterns and `read` loops, not shell features outside POSIX.
* The change is **Corrective** under `protocol/versioning.md`: it repairs
  documented behavior without changing the supported interface, so it does not
  change `VERSION` or require migration guidance.
