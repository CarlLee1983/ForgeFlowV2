# Acceptance Criteria

## Happy Path

* [ ] AC-001: `make release-check` runs canonical `verify` exactly once before
  one TypeScript local release inspection. A disposable clean release candidate
  produces the shell checker's exact six stdout records in order, with a
  matching version, HEAD commit, expected tag, local-tag state, and
  `remote_checks=not-performed`. The candidate remains unchanged.

## Business Rules

* [ ] AC-002: An explicit `legacy` implementation selection invokes the
  unchanged shell checker after the same canonical verification. Rollback
  requires no data migration; an unknown selector invokes neither checker and
  fails closed. Direct `scripts/release-check` behavior remains unchanged
  during the deprecation period.
* [ ] AC-003: The TypeScript compatibility adapter checks one JSON envelope,
  supported schema and Protocol versions, release subject, typed result, and
  actual child exit before interpreting data. Unsupported, malformed, missing,
  multiple, or exit-mismatched results and invalid ready fields emit no success
  record. Diagnosed negative and error results preserve the selected checker's
  release-failure process exit `1` with sanitized code-based diagnostics; the child
  envelope's distinct exit remains validated internally, without matching or
  forwarding human wording or child Git stderr.

## Failure Cases

* [ ] AC-004: Failed canonical verification stops before TypeScript or legacy
  inspection, including a verification command that returns nonzero after
  writing output. The Make target never invokes either checker twice, retries,
  repairs, or performs a remote release action.

## Regression Requirements

* [ ] AC-005: A fixed pre-switch checkpoint passes TypeScript release parity
  and retained shell cases. After the switch, focused Make selection, JSON
  compatibility, packed consumer, existing adoption, release parity, and the
  complete repository `make verify` gate pass. Documentation classifies the
  compatible Make selection, explains TypeScript runtime, deprecation period,
  and exact legacy rollback command.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `tests/release-check-switch.sh` | `disposable clean Git candidate and actual Make recipe` | `one verify then one TypeScript process; exact six stdout fields; no candidate mutation` |
| `AC-002` | test | `tests/release-check-switch.sh` | `legacy and unknown selector fixtures` | `unchanged shell selected once; unknown selector selects none; no data transition` |
| `AC-003` | test | `tests/release-check-switch.sh` | `synthetic child envelopes and real negative release subjects` | `schema/JSON/exit/data failures refuse success; typed negative exits and sanitized codes only` |
| `AC-004` | test | `tests/release-check-switch.sh` | `verification failure and invocation counter fixtures` | `failed verify suppresses all inspection; no retry or remote invocation` |
| `AC-005` | command | `make verify` | `fixed pre-switch parity observations and final current checkout` | `all focused and root gates pass; selection/rollback/version guidance exists` |

## Security Fixture Matrix

| Source field | Payload | Expected result | Persisted locations | Verification |
| --- | --- | --- | --- | --- |
| `release.implementation-selector` | `unknown` | reject | `Make stderr` | `tests/release-check-switch.sh` |
| `release.repository-root` | `fixture/non-root` | reject | `CLI result issue code` | `tests/release-check-switch.sh` |
| `release.child-stdout` | `two JSON objects` | reject | `adapter stderr` | `tests/release-check-switch.sh` |
| `release.child-stderr` | `fatal: hostile Git diagnostic` | omit | `adapter stdout and stderr` | `tests/release-check-switch.sh` |
| `release.child-exit` | `17` | reject | `adapter result` | `tests/release-check-switch.sh` |
| `release.schema-version` | `9.0.0` | reject | `adapter result` | `tests/release-check-switch.sh` |
| `release.protocol-version` | `9.0.0` | reject | `adapter result` | `tests/release-check-switch.sh` |
| `release.status-outcome-issues` | `RELEASE_INCOMPLETE with exit 0` | reject | `adapter result` | `tests/release-check-switch.sh` |
| `release.data` | `version containing a newline` | reject | `adapter stdout` | `tests/release-check-switch.sh` |

## Verification Notes

Run `./scripts/verification-check specs/stories/TST-017-release-check-entrypoint-switch`
before implementation. Keep fixture repositories inside the test's temporary
directory. Dispatch each shell acceptance case through
`run_case 'TST017-AC-<id>' <function>`. Run focused compatibility and release
parity checks, then `make verify`, and record every required high-risk layer
and AC observation in `verification.md`. The pre-switch checkpoint was observed
at 2026-09-15T08:01:53Z with 19 TypeScript release cases and the retained
`./tests/release-check.sh` passing; it is a dirty-worktree source checkpoint,
not an unchanged-HEAD or live ForgePilot observation.
