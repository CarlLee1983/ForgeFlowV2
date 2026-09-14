# Acceptance Criteria

## Happy Path

* [ ] AC-001: `forgeflow verify` and `forgeflow doctor --run-verify` execute
      exactly one `make verify` from the same resolved physical target root;
      a zero exit reports local verification success and exit 0.

## Business Rules

* [ ] AC-002: Static `forgeflow doctor` remains process-free and target
      read-only, while only explicit Doctor execution may invoke the process
      adapter after confirmed structure.
* [ ] AC-003: Human execution preserves child stdout and stderr in their
      corresponding streams; JSON execution emits exactly one valid result
      envelope on stdout and never mixes child output into it.

## Failure Cases

* [ ] AC-004: Nonzero child status and signal completion produce verification
      failure with exit 1, retain raw completion evidence, and never retry.
* [ ] AC-005: Missing executable, process-adapter failure, invalid arguments,
      unsafe roots, and incomplete structure produce the documented exit 2 or
      1 outcome without executing a target verification command.

## Regression Requirements

* [ ] AC-006: Fake-process, real temporary-fixture, Doctor execution parity,
      packed CLI, retained Doctor shell, and complete repository gates pass
      without changing the retained shell Doctor.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `packages/cli/test/verify-command.test.mjs` | `successful disposable Make fixture` | `one invocation from physical root and exit 0` |
| `AC-002` | test | `packages/cli/test/doctor-command.test.mjs` | `static Doctor fixture` | `no child-process capability or target execution` |
| `AC-003` | test | `packages/cli/test/verify-command.test.mjs` | `stdout and stderr fixture` | `human streams preserved and JSON stdout is one envelope` |
| `AC-004` | test | `packages/cli/test/verify-command.test.mjs` | `fake nonzero and signal process completions` | `exit 1, raw evidence, and one invocation` |
| `AC-005` | test | `packages/cli/test/verify-command.test.mjs` | `fake spawn error and unsafe or incomplete fixture` | `typed non-execution outcome` |
| `AC-006` | command | `make verify` | `complete repository checkout` | `all gates exit 0` |

## Security Fixture Matrix

| Source field | Payload | Expected result | Persisted locations | Verification |
| --- | --- | --- | --- | --- |
| `verify.repository-directory` | `symlinked required path` | reject | `none` | `packages/cli/test/verify-command.test.mjs` |
| `process.stdout` | `target supplied output` | omit | `JSON stdout` | `packages/cli/test/verify-command.test.mjs` |
| `process.stderr` | `target supplied output` | omit | `JSON stdout` | `packages/cli/test/verify-command.test.mjs` |
| `process.status` | `23` | preserve | `typed execution result` | `packages/cli/test/verify-command.test.mjs` |
| `process.signal` | `SIGTERM` | preserve | `typed execution result` | `packages/cli/test/verify-command.test.mjs` |
| `process.error` | `ENOENT` | redact | `machine issue message` | `packages/cli/test/verify-command.test.mjs` |

## Verification Notes

Run focused process-adapter, real fixture, stream, Doctor parity, and packed
CLI tests during implementation. Then run `pnpm run format:check`, `pnpm run
lint`, `pnpm run typecheck`, `pnpm test`, `./tests/typescript-tooling.sh`, and
`make verify`; record every required high-risk layer and each acceptance
criterion in `verification.md` after the final current-tree run.
