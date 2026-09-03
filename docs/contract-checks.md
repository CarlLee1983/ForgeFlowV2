# Contract Checks

ForgeFlow ships two static, read-only checkers for the artifacts humans write:
`scripts/story-check` for Stories and `scripts/handoff-check` for handoffs.
Both report structure only. Neither executes repository code, replaces
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
value; only a whole-cell placeholder or an empty quotation is rejected. Because a
row is split on `|`, a cell cannot contain an unescaped pipe. Fenced examples
inside a Story are documentation and are never parsed as declarations.

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
