# @forgeflow/core

Dependency-free ForgeFlow contracts for machine results and Protocol selection.
Only the package root is public.

## Init planning and execution evaluation

`planMutation(request)` creates an immutable content-addressed Init plan from a
packaged snapshot, a resolved-root identity, and no-follow path observations.
Plans carry ordered target and sibling-stage preconditions, exact effects, and
the marker-last boundary.
`evaluateInitMutation(plan, observation)` validates an adapter's immutable
execution trace and assigns `INIT_APPLIED`, stale/refusal, recovered failure,
incomplete recovery, cleanup residue, or internal-error semantics. Core never
performs the filesystem effects; the CLI mutation adapter reports facts only.

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

| Status    | Outcome                       | Exit |
| --------- | ----------------------------- | ---- |
| `pass`    | `success`                     | `0`  |
| `fail`    | `failure`                     | `1`  |
| `warning` | `warning`                     | `0`  |
| `error`   | `usage-error`                 | `2`  |
| `error`   | `configuration-error`         | `2`  |
| `error`   | `internal-error`              | `2`  |
| `pass`    | `RELEASE_READY`               | `0`  |
| `fail`    | `RELEASE_INCOMPLETE`          | `1`  |
| `pass`    | `INIT_APPLIED`                | `0`  |
| `pass`    | `INIT_PREVIEW`                | `0`  |
| `fail`    | `INIT_CONFLICT`               | `1`  |
| `fail`    | `INIT_OPERATION_REFUSED`      | `1`  |
| `fail`    | `INIT_APPLY_FAILED_RECOVERED` | `1`  |
| `fail`    | `INIT_RECOVERY_INCOMPLETE`    | `1`  |
| `fail`    | `INIT_CLEANUP_INCOMPLETE`     | `1`  |
| `error`   | `ERROR`                       | `2`  |
| `error`   | `ERROR`                       | `3`  |

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
