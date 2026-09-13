# Acceptance Criteria

## Happy Path

- [ ] AC-001: A Story that declares nothing and a Story that declares its full
      execution contract each resolve in Core to the documented task mode,
      authority, risk level, architecture impact, and required profile, and the
      CLI emits the documented human plan or one valid JSON result with exit
      `0`.

## Business Rules

- [ ] AC-002: The shared plan corpus of default, declaration, authority, risk,
      architecture, and profile cases produces equivalent resolved values,
      ordered issues, results, and exits through the retained shell checker and
      the TypeScript implementation.
- [ ] AC-003: Malformed, repeated, and unknown task mode, authority,
      architecture, and risk declarations return stable ordered issues in a
      canonical failing result with exit `1` and never throw a user-facing
      exception.
- [ ] AC-004: Invalid invocation, a missing Story directory, a symlinked,
      non-regular, unreadable, or empty required Story file, and a run that
      checks no Story each emit one valid machine result and exit `2`.
- [ ] AC-005: `forgeflow verification check` performs no target write, invokes
      no child or external process, and exposes no declaration reader from the
      Core or CLI package root.

## Regression Requirements

- [ ] AC-006: Packed-CLI black-box tests, the retained execution-governance
      suite, and the complete repository verification gate pass without
      modifying or retiring the shell checker or implementing `--result` mode.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `packages/cli/test/verification-command.test.mjs` | `undeclared and fully declared Story in human and JSON modes` | `documented plan values, valid pass envelope, and exit 0` |
| `AC-002` | test | `packages/cli/test/verification-parity.test.mjs` | `shared plan corpus over the retained checker` | `equal resolved plan, ordered issues, result, and domain exit` |
| `AC-003` | test | `packages/core/test/verification-plan.test.mjs` | `malformed, repeated, and unknown declaration fixtures` | `valid fail envelopes with stable ordered issues and exit 1` |
| `AC-004` | test | `packages/cli/test/verification-command.test.mjs` | `invalid args and missing, symlinked, directory, unreadable, and empty Story files` | `exactly one valid error envelope in JSON mode and exit 2` |
| `AC-005` | test | `packages/cli/test/verification-command.test.mjs` | `instrumented filesystem adapter, production-source scan, and package root imports` | `no mutating filesystem call, no child-process API, and a bounded public surface` |
| `AC-006` | command | `make verify` | `complete repository checkout` | `all legacy, package, portability, and repository gates exit 0` |

## Verification Notes

Run focused Core, CLI, parity, and packed-package tests while implementing,
then run `pnpm run typecheck`, the retained `./tests/execution-governance.sh`,
and `make verify`. Test names use the `TST005-AC-*` prefix.
