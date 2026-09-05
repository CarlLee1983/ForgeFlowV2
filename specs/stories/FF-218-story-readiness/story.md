# Story: FF-218 Optional Story Readiness

## Goal

Offer a deterministic minimum-content check before starting a Story, while
keeping existing structure checks and Human Review authority unchanged.

## Context

The 0.3.5 checker accepts Classification-only story.md and heading-only
acceptance.md. This is valid structure checking but insufficient as a content
check. The human request authorizes this optional addition and these criteria.

## Classification

* Security sensitive: no
* Baseline conformance: no

## Scope

### In Scope

* Prefix option --ready, Goal/Scope content, acceptance identifiers, docs/templates.

### Out of Scope

* Default Doctor changes, historical migration, quality scoring, automation
  requirements per AC, human approval, lifecycle transitions, release version.

## Inputs

* story-check [--ready] [story-directory ...], story.md and acceptance.md.

## Outputs

* Default results remain unchanged. Opt-in output distinguishes structure from
  minimum-content readiness, with exit 0/1/2 for success/incomplete/error.

## Rules

* R1: --ready appears once before directories; no directory means existing
  specs/stories discovery. Invalid options remain usage errors.
* R2: Exact ## Goal and ## Scope sections need at least one non-placeholder
  content line. Subheadings do not count as content but stay within the section;
  a level-one or level-two heading ends it. Trim whitespace and optional bullet
  prefixes. Use FF-217 fence rules, including EOF handling.
* R3: Acceptance lines are * or - checkbox bullets ([ ], [x], or [X]) followed
  by AC-, one or more ASCII digits, a colon, and non-placeholder same-line text.
  IDs are exact strings and unique per Story; fenced examples do not count.
* R4: Reject only blank/bare bullets and these exact placeholder values:
  TBD, tbd, TODO, todo, N/A, n/a, ..., <goal>, <scope>,
  <acceptance criterion>, Describe the user or business outcome.
  Do not reject arbitrary angle-bracket strings or non-English content.
* R5: Readiness also requires the existing structure check. Neither result
  represents approved READY, implementation correctness, or human acceptance.

## Expected Errors

* Missing content, empty or duplicate ACs fail only the opt-in content check.
* Missing files and usage errors keep operational exit 2.

## Dependencies

* FF-217 shared Markdown fence rules and existing Story acceptance harness.

## Compatibility

Additive: --ready is optional; defaults, Doctor and historical Stories remain
valid without migration. No VERSION bump pending a separate release decision.

## Constraints

* POSIX sh, shell builtins, read-only, deterministic, works with empty PATH.
* No parser dependency, automatic approval, commit, merge or publication.
