# Acceptance Criteria

## Happy Path

- [ ] AC-001: The harness runs legacy and TypeScript runners against isolated
      copies of the same source fixture and reports parity for equal observations.

## Business Rules

- [ ] AC-002: The harness detects intentionally mismatched result, issue,
      exit, evidence, process, mutation, and artifact observations.
- [ ] AC-003: Unknown legacy diagnostics fail closed.
- [ ] AC-004: Every harness run preserves the source fixture byte-for-byte.
- [ ] AC-005: Nine baseline fixture families are present before a TypeScript
      capability is migrated: result, issue, exit, evidence, process, mutation,
      artifact, unknown-diagnostic, and source-cleanliness.

## Regression Requirements

- [ ] AC-006: Retained legacy suites and the complete repository verification
      gate pass without a production parser or migrated capability.

## Acceptance Evidence

| AC       | Method  | Evidence                                                 | Fixture / precondition                                 | Expected observation                                            |
| -------- | ------- | -------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| `AC-001` | test    | `packages/cli/test/differential-parity-harness.test.mjs` | matching test runners and each baseline fixture source | `both sides receive distinct copies and compare equal`          |
| `AC-002` | test    | `packages/cli/test/differential-parity-harness.test.mjs` | one mismatch per compared observation class            | `each run reports its exact differing observation`              |
| `AC-003` | test    | `packages/cli/test/differential-parity-harness.test.mjs` | unmatched legacy diagnostic text                       | `the run fails with LEGACY_DIAGNOSTIC_UNKNOWN`                  |
| `AC-004` | test    | `packages/cli/test/differential-parity-harness.test.mjs` | all baseline fixture sources                           | `before and after source manifests are byte-identical`          |
| `AC-005` | test    | `packages/cli/test/differential-parity-harness.test.mjs` | `packages/cli/test/fixtures/differential-parity/`      | `exactly the nine named fixture-family directories are present` |
| `AC-006` | command | `make verify`                                            | complete repository checkout                           | `all legacy, tooling, and repository gates exit 0`              |

## Verification Notes

Run the harness test file after each TDD slice, run `pnpm run typecheck` before
the final gate, then run `make verify`. Harness test names use `TST003-AC-*`.
