# Acceptance Criteria

## Happy Path

- [ ] AC-001: A Story whose directory names a valid Story ID and whose
      classification, governance, risk, and conditional sections are complete
      evaluates to `STORY_CONTRACT_OK` in Core, and the CLI emits the
      documented human output or one valid JSON result with exit `0`.

## Business Rules

- [ ] AC-002: The shared default corpus of valid, malformed-ID, classification,
      matrix, trust-boundary, superseded, authority-chain, evidence-mode,
      architecture, owner, decision, risk-level, risk-signal, and
      risk-contract cases produces equivalent per-subject facts, ordered
      issues, aggregate results, and exits through the retained shell checker
      and the TypeScript implementation.
- [ ] AC-003: The Story ID grammar resolves the shortest leading run of
      segments, so a readable slug is never absorbed; classification defects
      suppress the conditional matrix, trust-boundary, and superseded checks;
      and authority defaults follow task mode with no grant implying the next.
- [ ] AC-004: A referenced decision that is malformed, absent, ambiguous,
      unreadable, statusless, superseded, rejected, or proposed outside
      architecture and mixed task mode is a contract defect, resolved under
      both the default decision root and `FORGEFLOW_DECISIONS_ROOT`.
- [ ] AC-005: Explicit subject order and lexical discovery order are
      deterministic and skip `_template`; fenced examples, hostile Markdown
      boundaries, and path identities do not change any outcome; and static
      checking performs no target write and invokes no child process.

## Regression Requirements

- [ ] AC-006: Readiness behaviour, packed-CLI black-box tests, the retained
      `tests/story-check.sh` suite, and the complete repository verification
      gate pass without modifying or retiring the shell checker.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `packages/cli/test/story-command.test.mjs` | `a complete Story in human and JSON mode` | `documented contract output, valid ok envelope, and exit 0` |
| `AC-002` | test | `packages/cli/test/story-parity.test.mjs` | `shared default corpus over the retained checker` | `equal facts, ordered issues, result, and domain exit` |
| `AC-003` | test | `packages/core/test/story-contract.test.mjs` | `ID grammar, classification, and authority fixtures` | `shortest-run IDs, suppressed conditional checks, and task-mode defaults` |
| `AC-004` | test | `packages/core/test/story-contract.test.mjs` | `decision records in every status and both decision roots` | `distinct decision defects with stable ordered issues` |
| `AC-005` | test | `packages/cli/test/story-command.test.mjs` | `explicit, discovery, fenced, and hostile-boundary fixtures` | `deterministic order and no target mutation or child process` |
| `AC-006` | command | `make verify` | `complete repository checkout` | `all legacy, package, portability, and repository gates exit 0` |

## Verification Notes

Run focused Core, CLI, parity, and packed-package tests while implementing,
then run `pnpm run typecheck`, the retained `./tests/story-check.sh`, and
`make verify`. Test names use the `TST007-AC-*` prefix.
