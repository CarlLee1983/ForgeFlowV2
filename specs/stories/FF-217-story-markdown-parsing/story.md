# Story: FF-217 Story Markdown Parsing

## Goal

Parse documented escaped table pipes and fenced examples consistently without
mistaking fixture payloads or examples for contract structure.

## Context

Confirmed on main at 9ac8eb3b08ab41733afb96c2d9e6258d0421b370 (0.3.5):
story-check counts every pipe and toggles fences on any triple backtick prefix.
The human request authorizes this Story and its acceptance criteria.

## Classification

* Security sensitive: no
* Baseline conformance: yes

## Scope

### In Scope

* One shared fence rule for declarations, literal bullets, and fixture matrices.
* Escaped-pipe table parsing, documented Markdown subset, fixture regressions.

### Out of Scope

* General Markdown parsing, readiness checks, external parsers, release changes.

## Inputs

* Story Markdown and acceptance fixture matrices.

## Outputs

* Existing deterministic structure verdicts and exit codes.

## Rules

* R1: Preserve payload characters. A pipe preceded by an odd consecutive run
  of backslashes is escaped; an even run leaves the pipe a delimiter.
* R2: After trimming surrounding spaces, tabs and CR, a run of at least three
  backticks or tildes opens a fence. Only the same character, at least the
  opening length, with no non-whitespace suffix closes it.
* R3: Unclosed fences ignore everything through EOF, matching example semantics.
* R4: All contract readers use the same fence rule; outside duplicates fail.

## Expected Errors

* Unescaped extra columns and missing real declarations remain incomplete.

## Dependencies

* Existing FF-208 and FF-212 Story checker and acceptance harness.

## Superseded Behavior

* `scripts/story-check` counts escaped pipes as delimiters and allows shorter
  backtick runs to close longer fences; tilde examples are parsed as structure.

## Compatibility

Corrective under protocol/versioning.md: repair documented escaped-pipe and
fenced-example behavior. No new mandatory fields, changed default invocation,
exit codes, or migration. VERSION stays 0.3.5 pending a separate release decision.

## Constraints

* POSIX sh, set -eu, shell builtins only, static read-only, empty PATH support.
* Tests use temporary fixtures and run_case AC mappings; run make verify.
* No commit, publication, merge, or automated Human Review acceptance.
