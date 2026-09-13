# Acceptance Criteria

## Happy Path

- [ ] AC-001: Complete Handoff source evaluates in Core to a canonical passing
      result with all six immutable evidence values, and the CLI emits the
      documented human result or one valid JSON result with exit `0`.

## Business Rules

- [ ] AC-002: The shared Story-ID and Handoff lexical corpora produce equivalent
      semantic results, ordered issues, evidence, and exits through the retained
      shell checker and the TypeScript implementation.
- [ ] AC-003: Missing, repeated, unknown, forbidden, malformed, and unsupported
      Handoff syntax returns stable ordered issues in a canonical failing result
      with exit `1`.
- [ ] AC-004: Invalid invocation and symlinked, missing, non-regular, unreadable,
      or empty Handoff sources each emit one valid machine result and exit `2`.
- [ ] AC-005: `forgeflow handoff check` performs no target write and invokes no
      child or external process.

## Regression Requirements

- [ ] AC-006: Packed-CLI black-box tests, all supported Node tooling jobs, the
      retained Handoff suite, and the complete repository verification gate pass
      without modifying or retiring the shell checker or migrating Doctor.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `packages/cli/test/handoff-command.test.mjs` | `complete evidence in human and JSON modes` | `immutable evidence, valid pass envelope, documented output, and exit 0` |
| `AC-002` | test | `packages/cli/test/handoff-parity.test.mjs` | `shared Story-ID and Handoff lexical corpora` | `equal semantic result, ordered issues, evidence, and domain exit` |
| `AC-003` | test | `packages/core/test/handoff.test.mjs` | `incomplete lexical and structural Core fixtures` | `valid fail envelopes with stable ordered issues and exit 1` |
| `AC-004` | test | `packages/cli/test/handoff-command.test.mjs` | `invalid args and symlink, missing, directory, unreadable, and empty sources` | `exactly one valid error envelope in JSON mode and exit 2` |
| `AC-005` | test | `packages/cli/test/handoff-command.test.mjs` | `instrumented filesystem adapter and production-source scan` | `no mutating filesystem call and no child-process import or invocation` |
| `AC-006` | command | `make verify` | `complete repository checkout and supported-Node CI matrix` | `all legacy, package, portability, and repository gates exit 0` |

## Verification Notes

Run focused Core, CLI, parity, and packed-package tests while implementing,
then run `pnpm run typecheck`, the retained `./tests/handoff-check.sh`, and
`make verify`. Test names use the `TST004-AC-*` prefix.
