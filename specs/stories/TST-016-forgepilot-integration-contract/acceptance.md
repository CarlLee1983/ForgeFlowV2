# Acceptance Criteria

## Happy Path

- [ ] AC-001: A disposable consumer invokes all eight published command paths
      through the npm-packed, installed CLI with `--json`. Each handled completion
      emits exactly one schema-versioned JSON object on stdout; the consumer uses
      typed fields and issue codes and confirms envelope `exit` equals the actual
      process exit without matching human wording.

## Business Rules

- [ ] AC-002: Consumer guidance selects the version-pinned CLI process
      boundary by default and describes optional Core library mode using only
      public package-root exports and a declared supported tooling SemVer. It states
      schema/version compatibility failure behavior without granting PraxisBound
      external consumer lifecycle authority.
- [ ] AC-003: Neither PraxisBound production code nor consumer fixtures read or
      mutate ForgePilot-owned lifecycle state. Any agreed ForgePilot-owned check,
      when available, is recorded separately as live-integration evidence and does
      not transfer lifecycle authority.

## Failure Cases

- [ ] AC-004: The consumer distinguishes pass, warning, fail, and error; it
      rejects an unsupported schema version, malformed or missing JSON, multiple
      stdout values, and a process/envelope exit mismatch before interpreting a
      result. No failure case relies on human output wording.

## Regression Requirements

- [ ] AC-005: Packed-artifact process consumer contracts and the complete
      repository `make verify` gate pass. TST-015 package and clean-consumer
      observations and current `@praxisbound` scope authority are prerequisites.
      An unavailable optional ForgePilot-owned check is retained as blocked
      live-integration evidence without blocking this generic process contract.
      Any unresolved prerequisite remains partial evidence.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `tests/typescript-tooling.sh` | `packed npm-only consumer and disposable command subjects` | `all eight paths emit one JSON envelope with matching actual exit and stable fields` |
| `AC-002` | human | `docs/typescript-tooling/forgepilot-integration.md` | `process/library selection and package manifests` | `versioned process default, optional root-only library choice, compatibility failures and consumer lifecycle ownership documented` |
| `AC-003` | human | `specs/stories/TST-016-forgepilot-integration-contract/verification.md` | `independent boundary review and disposable subjects` | `no production ForgePilot state access; no fixture .forgepilot creation; optional live check outcome recorded separately` |
| `AC-004` | test | `tests/typescript-tooling.sh` | `real command categories and malformed synthetic envelope fixtures` | `typed category handling and fail-closed schema/JSON/exit mismatch behavior` |
| `AC-005` | command | `make verify` | `current repository checkout after focused packed consumer checks; TST-015 package results and authenticated @praxisbound scope view` | `all required gates pass; optional live-integration absence remains blocked separately` |

## Verification Notes

Run the packed CLI process consumer suite, any available agreed ForgePilot-owned
check as separate live evidence, then `make verify`. The packed npm-only
consumer exercising the installed CLI is the required end-to-end process
observation. Record every required layer and AC observation in
`verification.md`; an unavailable optional live check stays blocked separately,
while an unavailable prerequisite remains partial.
