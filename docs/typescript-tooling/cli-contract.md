# CLI and Machine Contract

## Recommended command hierarchy

```text
praxisbound init [repository]
praxisbound doctor [repository]
praxisbound verify [repository]

praxisbound story check [story ...]
praxisbound verification check [story ...]
praxisbound handoff check [handoff-file]
praxisbound release check [repository]

praxisbound codex activate <repository>
```

This hierarchy uses short top-level verbs for the three common repository
workflows and `<noun> check` for artifact-specific static evaluation.
`praxisbound verify` means exactly “run the repository-owned `make verify` once.”
It does not mean `verification check`, which evaluates declared execution plans
and recorded results without executing them.

### Why this hierarchy

- Consistency: artifact validators use `noun check`; actual gate execution uses
  the existing Protocol verb `verify`.
- Discoverability: `praxisbound --help` exposes common workflows; noun help exposes
  related artifact operations without dashed historical names.
- Backward compatibility: legacy `./scripts/*` forms remain unchanged during
  coexistence. The npm CLI does not need confusing top-level `story-check`
  aliases to preserve a different executable path.
- Automation friendliness: every command has the same global `--json`, version,
  issue, evidence, and exit contract.
- Agent friendliness: commands are explicit about static checking versus running
  repository-owned code, and structured issue codes remove prose parsing.

`praxisbound verification check` is retained rather than shortening it to another
`verify` form because both meanings must remain visible:

```text
verification check = inspect Story declarations / verification.md
verify             = execute make verify
```

## Command mapping and options

| New command                                | Legacy capability                     | Contract                                                                                         |
| ------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `praxisbound init [repo]`                    | `scripts/bootstrap`                   | Apply fresh adoption by default; supports `--dry-run`, mutually exclusive `--force`/`--upgrade`. |
| `praxisbound doctor [repo]`                  | `scripts/doctor`                      | Static, read-only by default; retains `--run-verify` during compatibility period.                |
| `praxisbound verify [repo]`                  | Doctor execution mode / `make verify` | Explicitly runs target-owned `make verify` once from physical root.                              |
| `praxisbound story check [story ...]`        | `scripts/story-check`                 | Discovers Stories when omitted; supports `--ready`.                                              |
| `praxisbound verification check [story ...]` | `scripts/verification-check`          | Resolves plans by default; supports `--result`.                                                  |
| `praxisbound handoff check [file]`           | `scripts/handoff-check`               | Defaults to `specs/handoff.md`.                                                                  |
| `praxisbound release check [repo]`           | `scripts/release-check`               | Local, read-only release inspection; target defaults to `.`; never performs remote checks.       |
| `praxisbound codex activate <repo>`          | `scripts/codex-activate`              | Preview by default; supports `--apply`; stays a late migration wave.                             |

Global options may appear after the selected command path and before or among
that command's options. They may appear once; `--` ends option parsing.

```text
--json
--protocol <current|adopted|X.Y.Z>
--help
--version
```

`--protocol` is valid only for commands that evaluate or install Protocol
artifacts. Omission selects the package-bundled current Protocol, matching the
legacy checkout behavior. `adopted` requires a readable marker. Unsupported
exact versions fail closed with exit `2`; no network fetch or fallback occurs.

Human output remains the default. `--json` changes presentation only, never the
operation, authorization, result, or exit status.

`release check` is a PraxisBound-maintainer command. The npm executable cannot use
the legacy script's own installation directory as the candidate, so it accepts
one optional repository directory and defaults to the current directory. It
resolves that target physically and requires it to be the Git worktree root.
Parity invokes both Implementations with the fixture's PraxisBound checkout as
their candidate; calling the new npm command from an unrelated directory is new
additive behavior, not a reinterpretation of the legacy script path.

## `praxisbound init` contract

### Repository and version detection

1. Resolve the target as an existing physical directory; a Git repository is not
   required.
2. Inspect all managed parent and leaf path types before any target write.
3. Detect `specs/.praxisbound-adoption`, required adoption entrypoints, and legacy
   markerless adoption separately. Do not infer current lifecycle state.
4. Resolve the selected bundled Protocol snapshot and its source provenance.
   Never fetch templates or versions from the network.
5. Build one deterministic mutation plan, then either report it or apply it.

### Modes

| Invocation                                  | Meaning                                                                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `praxisbound init [repo]`                     | Fresh safe mode. Refuse if any managed destination exists.                                                                               |
| `praxisbound init --dry-run [repo]`           | Run the same preflight and emit the exact intended install/replace set; no target write.                                                 |
| `praxisbound init --force [repo]`             | Explicitly replace only the exact fresh-install managed destinations, including repository-owned `AGENTS.md` and Guidance starter files. |
| `praxisbound init --upgrade [repo]`           | Require an existing adoption; replace only Story templates and marker; preserve repository-owned `AGENTS.md` and Guidance.               |
| `praxisbound init --upgrade --dry-run [repo]` | Preview that upgrade without writing.                                                                                                    |

`--force` is allowed because it is existing explicit behavior and is useful for
deliberate reset/recovery. Its semantics are narrow:

- It is mutually exclusive with `--upgrade` and may appear only once.
- It never deletes unknown files or directories and never expands the managed
  manifest based on target contents.
- It does not bypass symlink, wrong-type, unreadable-source, staging, or recovery
  safety checks.
- It is non-interactive; the flag itself is explicit authorization. Human and
  JSON output identify every replaced destination.
- It is not an automatic upgrade and does not reconcile repository-owned edits.

All payloads are prepared before the first destination rename. Application
orders the adoption/snapshot marker last. Detected failure attempts reverse
recovery and reports every unrecovered destination plus retained recovery path.
Crash atomicity under `SIGKILL` or power loss is not promised.

### Init results

| Outcome                       | Status  | Exit       | Meaning                                                                        |
| ----------------------------- | ------- | ---------- | ------------------------------------------------------------------------------ |
| `INIT_APPLIED`                | `pass`  | `0`        | Requested files were applied and cleanup completed.                            |
| `INIT_PREVIEW`                | `pass`  | `0`        | Preflight passed and `data.changes` is the exact plan; target unchanged.       |
| `INIT_CONFLICT`               | `fail`  | `1`        | Safe mode found an existing managed destination or upgrade was not applicable. |
| `INIT_OPERATION_REFUSED`      | `fail`  | `1`        | A diagnosed source or managed-path safety condition refused the operation.     |
| `INIT_APPLY_FAILED_RECOVERED` | `fail`  | `1`        | Apply failed and every original was restored.                                  |
| `INIT_RECOVERY_INCOMPLETE`    | `fail`  | `1`        | Apply failed and at least one original could not be restored.                  |
| `INIT_CLEANUP_INCOMPLETE`     | `fail`  | `1`        | New state committed, but cleanup left explicitly reported recovery material.   |
| `ERROR`                       | `error` | `2` or `3` | Invocation/environment prevented evaluation, or an internal invariant failed.  |

Activation uses the same mutation taxonomy:

| Outcome                             | Status | Exit | Meaning                                                                                 |
| ----------------------------------- | ------ | ---- | --------------------------------------------------------------------------------------- |
| `ACTIVATION_CONFLICT`               | `fail` | `1`  | Adoption state or locally edited owned content conflicts with the request.              |
| `ACTIVATION_OPERATION_REFUSED`      | `fail` | `1`  | A diagnosed source or managed-path safety condition refused the operation.              |
| `ACTIVATION_APPLY_FAILED_RECOVERED` | `fail` | `1`  | Apply failed and every original was restored.                                           |
| `ACTIVATION_RECOVERY_INCOMPLETE`    | `fail` | `1`  | Apply failed and at least one original could not be restored.                           |
| `ACTIVATION_CLEANUP_INCOMPLETE`     | `fail` | `1`  | Preview, no-op, or apply cleanup left explicitly reported scratch or recovery material. |

## Static and execution trust boundary

These commands are always static and target-read-only:

```text
story check
verification check
handoff check
doctor              # without --run-verify
release check
codex activate       # without --apply; external scratch is allowed
```

These invocations cross an explicit effect boundary:

```text
init                 # unless --dry-run
codex activate --apply
verify
doctor --run-verify
```

`verify` and `doctor --run-verify` resolve the physical root, warn in human
mode, and run `make verify` exactly once without retry, repair, installation, or
fallback. The child exit is recorded as evidence. CLI exit is normalized to `0`
on child zero and `1` on child nonzero, preserving Doctor semantics.

In JSON mode, the child process cannot write to stdout because stdout is
reserved for the result envelope. Child stdout/stderr is forwarded to CLI
stderr in observed order; the stable envelope records command, cwd identity,
child exit/signal, and outcome, not arbitrary log text.

## Machine-readable result envelope v1

The draft JSON Schema is
[`result-envelope-v1.schema.json`](result-envelope-v1.schema.json).

Example:

```json
{
  "schemaVersion": "1",
  "command": "story.check",
  "status": "fail",
  "outcome": "STORY_READINESS_INCOMPLETE",
  "exitCode": 1,
  "issues": [
    {
      "code": "story.acceptance-evidence.missing",
      "severity": "error",
      "category": "evidence",
      "message": "Acceptance Evidence has no row for AC-003.",
      "rule": "protocol/story.md#acceptance-evidence",
      "location": {
        "path": "specs/stories/FF-300-example/acceptance.md"
      },
      "data": { "acceptanceId": "AC-003" }
    }
  ],
  "evidence": [],
  "error": null,
  "data": {
    "subjects": ["specs/stories/FF-300-example"]
  },
  "metadata": {
    "toolingVersion": "0.1.0",
    "protocolVersion": "0.9.0",
    "supportedProtocolRange": ">=0.9.0 <0.10.0"
  }
}
```

### Envelope rules

- `schemaVersion` versions the JSON shape and meaning; it is independent of
  Protocol and tooling versions.
- `command` is a stable dotted identifier such as `story.check` or
  `release.check`, independent of argv aliases.
- `status` is only `pass`, `fail`, or `error`.
- `outcome` is the command-specific stable result code. Existing shell result
  names remain outcomes where they exist.
- `exitCode` must equal the process exit code for every handled completion.
- `issues` contains typed validation, warning, safety, compatibility, or
  configuration diagnostics. `message` is human-readable and not stable.
- A warning is an issue with `severity: warning`; warnings may accompany
  `status: pass`. Doctor `CONTRACT_DRIFT` is the primary example.
- `evidence` contains observations, never approvals or inferred current state.
- `error` is `null` for pass/fail domain outcomes. For `status: error` it holds
  the one evaluation-stopping error; secondary facts may remain in `issues`.
- `data` contains command-specific structured values. Consumers must ignore
  unknown keys within `data` and `issue.data` for forward compatibility.
- `metadata` always distinguishes tooling, resolved Protocol, and supported
  range. `protocolVersion` may be `null` only when resolution itself failed.

### Issue contract

Stable fields:

```text
code
severity
category
rule (when the issue implements a protocol rule)
location.path / line / column (when known)
data keys documented for that code
```

Unstable presentation field:

```text
message
```

Paths are repository-relative POSIX paths. No temporary absolute path, locale-
specific OS error text, stack trace, random identifier, duration, or implicit
timestamp enters a stable issue.

Issue codes are lowercase namespaced identifiers, for example:

```text
story.classification.missing
handoff.recorded-at.invalid
verification.layer.required-missing
doctor.protocol-version.drift
init.path.symlink-refused
cli.arguments.invalid
internal.unexpected
```

New issue codes are additive. Removing a code, changing when it fires, changing
its severity/category, or changing documented `data` meaning is a machine-
contract change.

### Evidence contract

Each evidence item contains:

```text
code       stable evidence type
kind       file | declaration | command | git | mutation | version
subject    repository-relative subject or stable logical subject
location   optional repository-relative path plus one-based line/column
status     pass | fail | partial | not_run | not_checked | unsupported | unknown
observation structured facts
```

Path-bearing evidence uses `location.path`; `subject` remains a stable logical
identifier and never carries an absolute temporary path. Repository paths use
POSIX separators and reject absolute paths, drive prefixes, backslashes, empty
segments, and `.`/`..` segments.

Examples include the selected Protocol version, a required file observation,
the `make verify` child exit, a Git tag-to-commit observation, or an applied
mutation. Evidence never means Human Review passed unless the Protocol artifact
explicitly records such an observation, and even then it does not authorize a
merge.

### Error contract

```json
{
  "code": "cli.arguments.invalid",
  "category": "usage",
  "message": "--force and --upgrade are mutually exclusive.",
  "retryable": false,
  "data": {}
}
```

Error categories are `usage`, `configuration`, `environment`, or `internal`.
Expected invalid Protocol documents are not tooling errors: they produce
`status: fail`, typed issues, and exit `1`.

### JSON stream contract

- For every handled completion, stdout is exactly one UTF-8 JSON object followed
  by one newline; no banner, ANSI escape, progress, or child output appears.
- Expected failures still emit a schema-valid envelope.
- stderr is empty for ordinary static evaluations. Effect progress and child
  output may use stderr and are not part of the machine contract.
- Serialization uses a fixed top-level key order and deterministic array order.
  JSON object key order is not semantic, but canonical output makes golden
  fixtures reviewable.
- If the process cannot initialize or serialize any envelope, it writes a
  sanitized diagnostic to stderr and exits `3`. Consumers must treat missing
  JSON with exit `3` as an internal tooling failure.

## Exit-code contract

| Exit | Category                     | Meaning                                                                                                                                                   |
| ---- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | completed positive/advisory  | The requested operation completed successfully. A documented non-gating warning such as Doctor drift may be present.                                      |
| `1`  | completed negative           | The subject is invalid/incomplete/partial, verification failed, or a command-defined safety/readiness precondition produced a diagnosed negative outcome. |
| `2`  | invocation/acquisition error | Invalid argv/configuration or a static checker could not acquire trustworthy input or its required executable.                                            |
| `3`  | internal tooling failure     | Unexpected exception, violated internal invariant, or failure to produce the machine envelope.                                                            |

Rules:

- Known legacy outcomes retain exact `0`/`1`/`2`; `3` adds only unexpected
  internal failures that do not have a diagnosed legacy outcome.
- Safety findings are not all one category. A mutating command can complete its
  preflight with `operation_refused` (exit `1`), while a static checker can be
  unable to acquire its subject safely (`acquisition_error`, exit `2`). Stable
  issue/error codes state which occurred.
- Error dominates fail; explicit fail dominates partial/incomplete; all safe
  requested subjects are still reported when the command supports aggregation.
- A child command's raw exit is evidence and never silently reused as the CLI
  exit. For example, child `make verify` exit `17` produces CLI exit `1` and
  records `childExitCode: 17`.

### Legacy exit mapping

| Command family                        | Exit `1`                                                                                                | Exit `2`                                                                                    | Exit `3` in new CLI only                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Story / verification / Handoff checks | Protocol-negative or incomplete subject                                                                 | Invalid argv or unsafe/missing/unreadable subject prevents evaluation                       | Unexpected internal failure                           |
| Doctor / verify                       | Incomplete structure or nonzero child verification                                                      | Invalid argv, unsafe/unreadable root, composed-checker acquisition error, or missing `make` | Unexpected internal failure                           |
| Init                                  | Conflict, diagnosed unsafe managed path/source snapshot, unavailable upgrade, or apply/recovery failure | Invalid argv or target argument is not a directory                                          | Unexpected failure outside a handled recovery outcome |
| Codex activation                      | Diagnosed adoption/content/path safety refusal or apply/recovery failure                                | Invalid argv                                                                                | Unexpected failure outside a handled recovery outcome |
| Release check                         | Any diagnosed local release-readiness or guarded Git inspection failure                                 | Invalid argv, unsafe/missing/unreadable/non-directory target, or physical non-root target | Unexpected internal failure                           |

This table is part of parity. It avoids silently reclassifying current init,
activation, or release failures as exit `2` merely to make the new taxonomy look
uniform. A future exit change requires an explicit tooling/Protocol
classification and fixture rebaseline outside a migration ticket.

## Command outcomes

| Command              | Stable outcomes                                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `doctor`             | `STRUCTURE_OK`, `CONTRACT_DRIFT`, `STRUCTURE_INCOMPLETE`, `VERIFIED_LOCAL`, `VERIFICATION_FAILED`, `ERROR`                                                                                                                                 |
| `story.check`        | `STORY_CONTRACT_OK`, `STORY_CONTRACT_INCOMPLETE`, `STORY_READINESS_OK`, `STORY_READINESS_INCOMPLETE`, `ERROR`                                                                                                                              |
| `verification.check` | `VERIFICATION_PLAN_OK`, `VERIFICATION_PLAN_INCOMPLETE`, `VERIFICATION_PASS`, `VERIFICATION_PARTIAL`, `VERIFICATION_FAIL`, `VERIFICATION_RESULT_INCOMPLETE`, `ERROR`                                                                        |
| `handoff.check`      | `HANDOFF_CONTRACT_OK`, `HANDOFF_CONTRACT_INCOMPLETE`, `ERROR`                                                                                                                                                                              |
| `verify`             | `VERIFIED_LOCAL`, `VERIFICATION_FAILED`, `ERROR`                                                                                                                                                                                           |
| `release.check`      | `RELEASE_READY`, `RELEASE_INCOMPLETE`, `ERROR`                                                                                                                                                                                             |
| `init`               | `INIT_APPLIED`, `INIT_PREVIEW`, `INIT_CONFLICT`, `INIT_OPERATION_REFUSED`, `INIT_APPLY_FAILED_RECOVERED`, `INIT_RECOVERY_INCOMPLETE`, `INIT_CLEANUP_INCOMPLETE`, `ERROR`                                                                   |
| `codex.activate`     | `ACTIVATION_PREVIEW`, `ACTIVATION_APPLIED`, `ACTIVATION_UNCHANGED`, `ACTIVATION_CONFLICT`, `ACTIVATION_OPERATION_REFUSED`, `ACTIVATION_APPLY_FAILED_RECOVERED`, `ACTIVATION_RECOVERY_INCOMPLETE`, `ACTIVATION_CLEANUP_INCOMPLETE`, `ERROR` |

Adding an outcome is additive only when existing inputs keep their current
outcome. Renaming/removing one or changing its exit mapping is breaking for the
machine contract and must be versioned accordingly.

`toolingVersion` and non-null `protocolVersion` are SemVer values.
`supportedProtocolRange` uses the documented npm-compatible range grammar. Its
schema declares the required custom format `praxisbound-npm-semver-range`; CLI
serialization and conforming schema consumers must register a semantic range
validator rather than treating the lexical pattern alone as sufficient.

## Backward-compatibility policy

- During migration, all current shell scripts, command forms, result labels,
  safety guarantees, and exit codes stay unchanged.
- The new npm hierarchy is additive. Human text need not match legacy output,
  but every old behavior has a documented new command mapping.
- The parity harness, not production code, may parse legacy human output.
- A later default switch may turn a shell path into a compatibility wrapper only
  after its own parity and runtime decision. Requiring Node behind an existing
  portable path is Breaking and is not authorized by this plan.
- Legacy Implementation removal is never bundled into a capability migration or
  package release ticket.
