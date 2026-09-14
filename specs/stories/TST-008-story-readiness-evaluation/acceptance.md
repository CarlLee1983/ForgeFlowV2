# Acceptance Criteria

## Happy Path

- [ ] AC-001: A complete Story evaluates to `STORY_READINESS_OK` through Core
      and through `forgeflow story check --ready`, with the documented human or
      canonical JSON result and exit `0`.

## Business Rules

- [ ] AC-002: Every retained readiness case for Goal and Scope content,
      checkbox AC identity, fenced content, pipes, placeholder subsets,
      Acceptance Evidence, and activated risk-evidence links produces
      equivalent ordered issues, aggregate result, and exit through the shell
      checker and TypeScript implementation.
- [ ] AC-003: Omitting `--ready` preserves the default Story-contract result;
      identical Story bytes produce the same selected result at independent
      temporary locations, and static checking writes no target file or starts
      no child process.

## Regression Requirements

- [ ] AC-004: Packed CLI tests, retained `tests/story-check.sh` readiness
      coverage, and the complete repository verification gate pass without
      modifying or retiring the shell checker.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `packages/cli/test/story-command.test.mjs` | `complete Story in human and JSON ready modes` | `Core readiness facts, documented ready output, and exit 0` |
| `AC-002` | test | `packages/cli/test/story-parity.test.mjs` | `shared retained readiness corpus` | `equal facts, ordered issues, aggregate result, and exit` |
| `AC-003` | test | `packages/cli/test/story-command.test.mjs` | `default and ready invocations over copied fixtures` | `unchanged default result, path-independent ready result, no mutation or process` |
| `AC-004` | command | `make verify` | `complete repository checkout` | `all repository, package, portability, and retained shell gates exit 0` |

## Verification Notes

Run focused Core, CLI, parity, packed-package, and retained readiness tests
while implementing, then run `pnpm run typecheck`, `./tests/story-check.sh`,
and `make verify`. Test names use the `TST008-AC-*` prefix.
