# Verification Result: TST-017

Observed in the pre-commit worktree after the owner approved the
TypeScript default with the old six-line success output and explicit shell
rollback. The Story's high Risk and Architecture impact require `lint static
unit integration contract e2e architecture` evidence.

## Checks

* lint: pass — `make verify`
* static: pass — `make verify`
* unit: pass — `pnpm test`
* integration: pass — `./tests/release-check-switch.sh`
* contract: pass — `./tests/release-check-switch.sh`
* e2e: pass — `make verify`
* architecture: pass — `independent Sol/high public-contract and security review found no remaining material TST-017 finding`

The full gate completed successfully at 2026-09-15T08:22:20Z. It included
formatting, lint, typecheck, shell/Node syntax, Story readiness, retained shell
release cases, TypeScript parity, packed npm consumer and adoption, Go,
Actions, execution, and PraxisBound checks. The independent reviewer examined
the Story, acceptance, source, docs, and affected callers after the selector
and fixture delta.

## Evidence

* `AC-001`: pass — `TST017-AC-001 observed one verify, one TypeScript selection, six exact legacy stdout records, same-HEAD tag projection, and unchanged candidate HEAD, refs, index, config, and manifest in disposable Git fixtures.`
* `AC-002`: pass — `TST017-AC-002 observed exact unchanged shell output on legacy selection, no TypeScript selection, unknown selector invocation of neither checker, direct unknown-selector process exit 2, and no data transition.`
* `AC-003`: pass — `TST017-AC-003 rejected bad versions, streams, exits, typed combinations, issue codes, and ready fields without success or child Git stderr; real dirty and non-root candidates returned typed failures; direct selected-checker release failure exited 1.`
* `AC-004`: pass — `TST017-AC-004 observed verification failure after stdout output and no TypeScript or shell inspection, retry, or release output.`
* `AC-005`: pass — `The fixed pre-switch parity checkpoint passed, final make verify covered selector, JSON, packed consumer, adoption, retained shell, TypeScript parity, and root gates, and docs/releasing.md records classification, Node runtime, deprecation, and the legacy rollback command.`

## Fixed Pre-Switch Checkpoint

At 2026-09-15T08:01:53Z, before the Make selection changed,
`node --test packages/cli/test/release-parity.test.mjs
packages/cli/test/release-command.test.mjs` passed all 19 release cases and
`./tests/release-check.sh` passed. The observed source checkpoint was fixed by
these `git hash-object` values in order:

| Source | Blob hash |
| --- | --- |
| `Makefile` | `cede7d74558682b3729a9ba5836f975ccf9849ff` |
| `scripts/release-check` | `975950033dafb2178e8cdef32a251ed2032abfc3` |
| `packages/cli/src/release.ts` | `1ebd499b7cc4588fe4e1f3a07e9931e0ba44608a` |
| `packages/core/src/release.ts` | `529119f1145cabb439faf21adbf2121ccceb458e` |
| `packages/cli/test/release-parity.test.mjs` | `ec66394058d20d0f8d6ef30ea24632bc08b00f5d` |
| `packages/cli/test/release-command.test.mjs` | `a362f6db695d6f6105ea3608b4fd3f7511dbf336` |

This was a dirty-worktree source checkpoint. It is not evidence attached to
an unchanged HEAD revision or an external ForgePilot run.

## Authority Used

* plan
* modify

## Residual Risks

* `Remote GitHub Actions have not run for the locally verified TST-017 source because TST-017 grants no push authority; local make verify passed in the pre-commit worktree.`
* `GitHub issue #42 retains older ForgePilot dependency wording; no mutable lifecycle rewrite or ForgePilot-owned check is claimed in this repository result.`
