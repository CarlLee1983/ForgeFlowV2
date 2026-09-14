# @forgeflow/core

Dependency-free ForgeFlow contracts for machine results and Protocol selection.
Only the package root is public.

## Repository Doctor evaluation

`evaluateRepositoryDoctor(snapshot)` is a pure interpretation of an immutable
static repository observation. The CLI owns no-follow filesystem acquisition;
Core owns required-capability outcomes, marker and guidance drift, Makefile
clues, composed Story/Handoff states, ordered facts, and the result envelope.
It never reads the filesystem, starts a process, or mutates a target.

## Handoff evaluation

`evaluateHandoff(source)` evaluates Handoff Markdown source using the
line-oriented restricted YAML contract. It is pure and dependency-free: it does
not inspect files, environment, time, Git, or processes. It returns a canonical
`ResultEnvelope`; successful evaluations also include frozen historical
`evidence` (`story`, `recordedAt`, `repository`, `revision`,
`verificationCommand`, and `verificationResult`). Contract defects return `fail` / `failure` / `1` with stable ordered
issues. Non-string runtime input is a typed failing result, not an exception.

## Result envelope

`validateResultEnvelope(value)` returns either `{ ok: true, value }` or
`{ ok: false, issues }`. `assertResultEnvelope(value)` returns the validated
value or throws `ResultEnvelopeValidationError` with the same issues.

```json
{
  "schemaVersion": "1.0.0",
  "protocolVersion": "0.9.0",
  "status": "fail",
  "outcome": "failure",
  "exit": 1,
  "subject": "story:TST-002",
  "path": "specs/stories/TST-002/story.md",
  "issues": [
    {
      "code": "MISSING_FIELD",
      "message": "The Goal section is missing.",
      "path": "specs/stories/TST-002/story.md",
      "subject": "story:TST-002"
    }
  ]
}
```

The valid status, outcome, and exit combinations are:

| Status    | Outcome               | Exit |
| --------- | --------------------- | ---- |
| `pass`    | `success`             | `0`  |
| `fail`    | `failure`             | `1`  |
| `warning` | `warning`             | `0`  |
| `error`   | `usage-error`         | `2`  |
| `error`   | `configuration-error` | `2`  |
| `error`   | `internal-error`      | `2`  |

Subjects use a lowercase kind and optional ASCII identifier, such as
`repository` or `story:TST-002`. Paths are normalized relative POSIX paths;
absolute paths, backslashes, empty segments, `.` segments, and `..` segments
are rejected. Unknown envelope and issue properties are rejected.

## Protocol selection

`resolveProtocolSelector(selector)` accepts:

```js
{ kind: "current" }
{ kind: "adopted", version: "0.9.0" }
{ kind: "explicit", version: "0.9.0" }
```

It returns a discriminated success or typed error. Selection is exact: there is
no nearest-version fallback or automatic upgrade. Callers obtain an adoption
version themselves and pass it to the `adopted` selector; Core performs no
filesystem or repository inspection.

`getToolingCapabilities()` returns immutable metadata for result schema
`1.0.0`, implemented Protocol `0.9.0`, and the inclusive supported range
`0.9.0` through `0.9.0`.
