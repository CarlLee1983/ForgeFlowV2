# Acceptance Criteria

## Happy Path

- [ ] AC-001: A Story whose record proves every required layer and every
      checkbox acceptance criterion evaluates to PASS in Core, and the CLI
      emits the documented human record output or one valid JSON result with
      exit `0`.

## Business Rules

- [ ] AC-002: The shared result corpus of passing, partial, failing, silent,
      malformed, missing-evidence, authority, and residual-risk cases produces
      equivalent recorded facts, per-Story status, ordered issues, aggregate
      results, and exits through the retained shell checker and the TypeScript
      implementation.
- [ ] AC-003: An absent required check, a `skipped`, `blocked`, or
      `unsupported` observation, an acceptance criterion with no passing
      evidence, and a record that states nothing never evaluate to PASS.
- [ ] AC-004: A recorded `fail` check, a recorded `fail` acceptance
      observation, and the use of an ungranted authority evaluate to FAIL,
      while a malformed, repeated, unknown, or unreadable record evaluates to
      `VERIFICATION_RESULT_INCOMPLETE`; PASS, PARTIAL, FAIL,
      `VERIFICATION_RESULT_INCOMPLETE`, and operational `ERROR` remain distinct
      with exits `0`, `1`, `1`, `1`, and `2`.
- [ ] AC-005: Core reports the recorded checks, the traced acceptance count,
      the used authority, and the residual risks as declared facts and exposes
      no approval, completion, or current-state claim, and a symlinked
      `verification.md` is an operational error that performs no target write
      and invokes no child process.

## Regression Requirements

- [ ] AC-006: Plan-mode behaviour, packed-CLI black-box tests, the retained
      execution-governance suite, and the complete repository verification gate
      pass without modifying or retiring the shell checker.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `packages/cli/test/verification-command.test.mjs` | `a Story with a complete record in human and JSON result mode` | `documented record output, valid pass envelope, and exit 0` |
| `AC-002` | test | `packages/cli/test/verification-parity.test.mjs` | `shared result corpus over the retained checker` | `equal recorded facts, status, ordered issues, result, and domain exit` |
| `AC-003` | test | `packages/core/test/verification-result.test.mjs` | `absent, non-passing, unproven, and silent record fixtures` | `PARTIAL or record-defect evaluations that are never pass` |
| `AC-004` | test | `packages/core/test/verification-result.test.mjs` | `failing, malformed, repeated, unknown, and missing record fixtures` | `distinct FAIL and record-incomplete evaluations with stable ordered issues` |
| `AC-005` | test | `packages/cli/test/verification-command.test.mjs` | `declared-fact fixtures and a symlinked verification.md` | `recorded facts reported verbatim and one configuration-error envelope with exit 2` |
| `AC-006` | command | `make verify` | `complete repository checkout` | `all legacy, package, portability, and repository gates exit 0` |

## Verification Notes

Run focused Core, CLI, parity, and packed-package tests while implementing,
then run `pnpm run typecheck`, the retained `./tests/execution-governance.sh`,
and `make verify`. Test names use the `TST006-AC-*` prefix.
