# Contract Checks

ForgeFlow ships two static, read-only checkers for the artifacts humans write:
`scripts/story-check` for Stories and `scripts/handoff-check` for handoffs.
Both report structure only by default; Story readiness is opt-in. Neither executes repository code, replaces
`make verify`, nor authorizes a merge.

Both are written with shell builtins alone and invoke no external command. A
checker's verdict therefore depends on the file it was given and nothing else:
an unusual or empty `PATH` cannot turn a conformant artifact into an
`INCOMPLETE` result, which matters because Repository Doctor composes both
verdicts into its own.

## Story contract check

```sh
./scripts/story-check [story-directory ...]
```

With no argument, every directory under `specs/stories/` except `_template/` is
checked relative to the current directory.

The check enforces the [Story Contract](../protocol/story.md):

* every Story declares `Security sensitive` and `Baseline conformance` exactly
  once under `## Classification`, each as `yes` or `no`;
* `Security sensitive: yes` requires `## Trust Boundary Fields` in `story.md`
  and a `## Security Fixture Matrix` with at least one fixture row in
  `acceptance.md`;
* every fixture row declares five columns under a five-column separator, carries
  non-blank backticked values for the source field, payload, persisted
  locations, and verification, and states the expected result as `preserve`,
  `redact`, `reject`, or `omit`;
* `Baseline conformance: yes` requires `## Superseded Behavior` in `story.md`,
  naming each superseded test or behavior exactly; and
* a section that contradicts its declaration fails in both directions.

A quoted payload may contain markup, so `<script>alert(1)</script>` is an exact
value; only a whole-cell placeholder or an empty quotation is rejected. A pipe
after an odd consecutive run of backslashes is payload; an even run leaves it a
column delimiter, and the checker preserves those payload characters. Fenced
examples inside a Story are documentation and are never parsed as declarations:
after surrounding spaces, tabs, and CR are trimmed, three or more matching
backticks or tildes open a fence; only the same character and at least the
opening length, with no non-whitespace suffix, closes it. Unclosed fences ignore
through EOF.

This is a documented subset, not a general Markdown parser: the checker reads
exact Classification bullets, Trust Boundary Fields and Superseded Behavior
bullets, and the exact matrix header with outer table pipes. Inline backticks do
not shield a raw pipe; use the documented backslash escape.

| Result | Exit | Meaning |
| --- | --- | --- |
| `STORY_CONTRACT_OK` | `0` | Every checked Story declares what the contract requires. |
| `STORY_CONTRACT_INCOMPLETE` | `1` | A declaration is missing, prose-only, or contradictory. |
| `ERROR` | `2` | Invalid invocation, or a missing, unreadable, or symlinked Story file. |

The Story template ships both conditional sections filled with an example row,
because most Stories need one of them. Delete the section that the Story's
Classification does not require; keeping it while declaring `no` is reported as
a contradiction.

The check checks declared structure, not Classification truthfulness. A Story
that claims `Security sensitive: no` for work that handles credentials passes
the checker and fails Human Review. Human Review compares the real trust
boundaries, baseline changes, and conditional evidence, and confirms that the
Story, Acceptance Criteria, Classification, implementation, and tests agree.

## Optional minimum-content readiness

```sh
./scripts/story-check --ready [story-directory ...]
```

The flag appears once before directories. With none, discovery is unchanged.
Default invocations and Doctor still check structure only; historical Stories
need no migration. This opt-in mode adds these exact minimum-content rules:

* `## Goal` and `## Scope` each contain a non-placeholder line. Nested headings
  are ignored as content and remain within that section; the next level-one or
  level-two heading ends it. Surrounding spaces, tabs and CR and one optional
  `* ` or `- ` bullet prefix are stripped.
* `acceptance.md` has at least one checkbox bullet, `* ` or `- ` followed by
  `[ ] `, `[x] ` or `[X] `, then `AC-`, one or more ASCII digits, a colon, and
  non-placeholder text on the same line. IDs are compared exactly and may not
  repeat anywhere in the same file. Other line formats do not supply an AC.
* `acceptance.md` has exactly one `## Acceptance Evidence` section with the
  exact five-column header `AC`, `Method`, `Evidence`, `Fixture / precondition`,
  and `Expected observation`. It has one row for every checkbox AC and no
  unknown or duplicate IDs. `Method` is exactly `test`, `command`, or `human`;
  the remaining cells are each one non-placeholder backticked value.
  Evidence placeholders are the finite values empty, `*`, `-`, `TBD`, `tbd`,
  `TODO`, `todo`, `N/A`, `n/a`, `...`, `<evidence>`, `<fixture>`,
  `<fixture / precondition>`, and `<expected observation>`. Technical values
  such as `<T>` remain valid when backticked.
* All these readers use the fence rules above; examples do not supply content.

The finite placeholder list is: empty text, bare `*` or `-`, `TBD`, `tbd`,
`TODO`, `todo`, `N/A`, `n/a`, `...`, `<goal>`, `<scope>`,
`<acceptance criterion>`, and `Describe the user or business outcome.`
Matching is exact after trimming and optional bullet removal; `<T>`, Chinese
requirements, and technical strings are not rejected by language or scoring.

For example, an actual criterion outside a fence can be:

```markdown
* [ ] AC-001: An empty order returns a total of zero cents.
```

In this mode `Structure: STORY_CONTRACT_OK` or `STORY_CONTRACT_INCOMPLETE`
reports the original checks separately. `Result: STORY_READINESS_OK` (exit 0)
means both structure and minimum content passed; `STORY_READINESS_INCOMPLETE`
(exit 1) means either failed. Operational errors remain `ERROR` (exit 2).
Neither result means human-approved READY, sound requirements, correct
implementation, or Human Review acceptance. The map declares a planned proof;
the checker never runs it or parses test sources. No AC must be automated.

## Handoff contract check

```sh
./scripts/handoff-check [handoff-file]
```

The handoff file defaults to `specs/handoff.md`. The check enforces the
[Handoff Contract](../protocol/handoff.md): exactly one lifecycle block, exactly
one current Story or `none`, exactly one next Story or `pending`, separately
recorded completed Story IDs, a full baseline commit SHA, dirty-worktree path
attribution with at least one Story-owned path, and the last authoritative
verification command and result.
Contradictory statements — the same Story as current and next, a current or next
Story also recorded as completed, an active status with no current Story, or a
`review` or `done` status whose last verification did not pass — are rejected
rather than repaired.

| Result | Exit | Meaning |
| --- | --- | --- |
| `HANDOFF_CONTRACT_OK` | `0` | The lifecycle block is complete and self-consistent. |
| `HANDOFF_CONTRACT_INCOMPLETE` | `1` | A statement is missing, malformed, or contradictory. |
| `ERROR` | `2` | Invalid invocation, or a missing, unreadable, or symlinked handoff. |

`verification.result` records what the last run claimed. The checker does not
re-run it and does not prove that the recorded command ran. Human Review checks
that the PASS is genuine and fresh for the implementation under review. A
stale `pass` is a review concern, not a checker failure. Prose outside the
block, and comments inside it, are ignored.

## Composed by Doctor

[Repository Doctor](doctor.md) runs both checks in static mode once the
required structure is confirmed, using their documented command forms and
adding no options to either. An `INCOMPLETE` result from either check is
reported as drift: Doctor prints a `WARN` line and reports
`Result: CONTRACT_DRIFT` instead of `STRUCTURE_OK`, while its exit status stays
`0`. An `ERROR` from either check is reported as `ERROR` and exits `2`.

Running either check directly stays exactly as documented above; Doctor is a
convenience that composes them, not a replacement for them.
