# Handoff Evidence Contract

A handoff records what was true at one point in time so another human or agent
can understand the execution context later. It is optional historical evidence,
not an authoritative source for current work, lifecycle state, blockers, next
actions, review state, or completion state.

ForgeFlow owns this evidence interface. When an external control plane is
present, that system is authoritative for mutable lifecycle state. ForgePilot is
one example; ForgeFlow does not require, detect, or call it.

## Location and immutability

`scripts/handoff-check` defaults to `specs/handoff.md` and accepts another path.
A repository may instead keep separately named records under `specs/handoffs/`.
Prose context belongs around the block and is ignored by the checker.

One file carries one point-in-time record. Once versioned, the record is not
edited to describe newer state; a later event gets another record and revision.
VCS history preserves earlier versions of a conventional `specs/handoff.md`
during migration. Immutability is a property of the recorded facts and
repository history, not something the static checker can prove.

## Evidence block

The file contains exactly one fenced `yaml` block with two sections:

```yaml
handoff:
  story: ABC-005
  recorded_at: 2026-09-12T02:30:00Z
  repository: owner/repository
  revision: 0123456789abcdef0123456789abcdef01234567

verification:
  command: make verify
  result: pass
```

| Field | Meaning |
| --- | --- |
| `handoff.story` | The Story whose execution context was recorded |
| `handoff.recorded_at` | Recording time in UTC seconds as `YYYY-MM-DDTHH:MM:SSZ` |
| `handoff.repository` | The repository in which the observation was made |
| `handoff.revision` | The exact full 40-character lowercase commit SHA observed |
| `verification.command` | The command whose point-in-time result is recorded |
| `verification.result` | The observed result: `pass`, `fail`, or `not_run` |

A Story ID is hyphen-separated segments of uppercase letters and digits:
the first segment starts with an uppercase letter,
each middle segment has an uppercase letter,
and the last segment is digits. `FF-209` and
`DBCLI-PLAT-001` conform; `FF-1-2` does not, because a bare number is not a
subsystem name. `scripts/story-check` and `scripts/handoff-check` enforce this
same grammar.

## Authority rules

- Each section and field above appears exactly once; unknown sections, keys,
  and lists are rejected.
- This is a line-oriented restricted YAML subset. Each field is one single-line
  lexical value, introduced by exactly one ASCII space after `:`; `story`,
  `recorded_at`, `revision`, and `result` use their exact grammars above.
  `repository` and `command` use one unquoted, non-null string-like plain
  scalar. YAML null, boolean, numeric, and special
  floating-point forms; flow collections; quoted scalars; tags; anchors;
  aliases; block scalars; and inline comments are rejected for those generic
  fields. Embedded YAML line breaks (CR, NEL, line separator, or paragraph
  separator) are rejected on every source line before Markdown fences,
  comments, or fields are interpreted; a line-ending carriage return in CRLF
  input is normalized.
  Whole-line comments are ignored.
- The evidence block never contains `workflow`, `current_story`, `next_story`,
  `completed_stories`, lifecycle `status`, Gate state, current revision, latest
  verification, or another mutable-state projection.
- A record states only what was observed at its `recorded_at` time and exact
  `revision`. It does not say that the Story or verification has that state now.
- An uncommitted worktree cannot be represented by a commit SHA. Do not attach
  its verification result to the unchanged HEAD revision; keep current
  verification in the control plane or wait for an exact immutable revision.
- ForgeFlow tooling never infers current work or a lifecycle transition from a
  handoff record or its prose.

## Checking the contract

```sh
./scripts/handoff-check [handoff-file]
```

The check is static and read-only. It exits `0` for `HANDOFF_CONTRACT_OK`, `1`
for `HANDOFF_CONTRACT_INCOMPLETE`, and `2` for an operational error. It
validates timestamp syntax and component ranges, not clock truth, and it does
not prove that the revision exists or that the command ran. It never edits the
record, runs verification, advances a lifecycle state, or authorizes a merge.
Use [the handoff template](../templates/handoff.md) as the canonical layout.

Remote tags, releases, CI, and control-plane state are time-sensitive. Record a
historical observation when it matters and query the owning system whenever the
current fact is needed.
