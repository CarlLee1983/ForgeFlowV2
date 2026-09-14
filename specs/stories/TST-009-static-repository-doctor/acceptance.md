# Acceptance Criteria

## Happy Path

* [ ] AC-001: A conformant repository evaluates to `STRUCTURE_OK` through the
      pure Core evaluator and through `forgeflow doctor` in human and JSON
      modes, with the documented semantic result and exit `0`.

## Business Rules

* [ ] AC-002: Every retained static Doctor fixture covering required and
      optional capabilities, limited Makefile clues, marker versions, advisory
      documented drift, and composed Story and Handoff observations produces
      equivalent ordered facts, aggregate result, and exit through the shell
      Doctor and TypeScript implementation.
* [ ] AC-003: Static inspection starts zero target-owned processes and leaves
      the target manifest unchanged; it reports absent optional capabilities
      without turning them into required failures.

## Failure Cases

* [ ] AC-004: Missing required capabilities retain the legacy incomplete exit
      behavior, while unsafe, symlinked, unreadable, permission-denied, or
      otherwise unconfirmable target inputs produce one `ERROR` envelope and
      exit `2` without mutation.

## Regression Requirements

* [ ] AC-005: Core inspection, fake and real filesystem-adapter, differential
      parity, packed CLI, and retained `tests/doctor.sh` static coverage pass;
      the complete repository verification gate passes without modifying or
      replacing the retained shell Doctor.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `packages/cli/test/doctor-command.test.mjs` | `conformant fixture in human and JSON modes` | `Core facts, canonical result, and exit 0` |
| `AC-002` | test | `packages/cli/test/doctor-parity.test.mjs` | `shared static Doctor corpus` | `equal ordered facts, result, and exit` |
| `AC-003` | test | `packages/cli/test/doctor-command.test.mjs` | `instrumented copied fixture` | `no target process and unchanged target manifest` |
| `AC-004` | test | `packages/cli/test/doctor-command.test.mjs` | `missing, symlinked, unreadable, and unconfirmable fixtures` | `legacy incomplete or one error envelope with documented exit` |
| `AC-005` | command | `make verify` | `complete repository checkout` | `all repository, package, portability, and retained shell gates exit 0` |

## Verification Notes

Run focused Core inspection, CLI adapter, parity, packed-package, and retained
Doctor static tests while implementing. Then run `pnpm run typecheck`, the
relevant `tests/doctor.sh` cases, and `make verify`. Test names use the
`TST009-AC-*` prefix. Record every required verification layer and acceptance
observation in `verification.md` after the final current-tree run.
