# Acceptance Criteria

## Happy Path

- [ ] AC-001: An empty existing target returns a deterministic `INIT_PREVIEW`
      through the pure Core planner and `forgeflow init --dry-run`, with every
      fresh-install managed destination in the exact documented order and exit
      `0`.
- [ ] AC-002: Safe existing fresh-install destinations return an exact
      replacement plan when `--force --dry-run` or `--dry-run --force` is used.
- [ ] AC-003: An adopted target returns an exact upgrade plan containing only
      the three Story templates and adoption marker when `--upgrade --dry-run`
      or `--dry-run --upgrade` is used.

## Business Rules

- [ ] AC-004: The Core planner has no filesystem/process dependency and
      deterministically distinguishes fresh, conflict, force, adoption,
      markerless, and source-version/provenance observations.
- [ ] AC-005: `--force` and `--upgrade` are mutually exclusive; safe, force,
      and upgrade plans use exactly the documented ownership surfaces.
- [ ] AC-006: The CLI plans entirely from artifacts embedded in the packed
      package; an installed package can produce the same plan without a source
      checkout adjacent to it.

## Failure Cases

- [ ] AC-007: Safe-mode managed conflicts and unavailable upgrade adoption
      return the deterministic `INIT_CONFLICT` result and exit `1` without
      writing the target.
- [ ] AC-008: Symlinked, wrong-type, unreadable, or otherwise unconfirmable
      managed parent and leaf paths return `INIT_OPERATION_REFUSED` and exit
      `1` without following or altering those paths.
- [ ] AC-009: Invalid argument forms, repeated options, and absent or
      non-directory targets return a typed `ERROR` with exit `2` without target
      mutation.

## Regression Requirements

- [ ] AC-010: Core planning, CLI adapter, package provenance, dry-run parity,
      no-write manifest, retained bootstrap dry-run, and complete repository
      verification pass.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `packages/cli/test/init-command.test.mjs` | `empty target fixture` | `INIT_PREVIEW with ordered fresh plan and exit 0` |
| `AC-002` | test | `packages/cli/test/init-command.test.mjs` | `safe existing fresh managed files` | `force replacement plan in both option orders` |
| `AC-003` | test | `packages/cli/test/init-command.test.mjs` | `adopted target fixture` | `upgrade plan excludes AGENTS.md and guidance` |
| `AC-004` | test | `packages/core/test/init-planning.test.mjs` | `immutable planning snapshots` | `deterministic ownership and adoption decisions` |
| `AC-005` | test | `packages/core/test/init-planning.test.mjs` | `force and upgrade boundary matrix` | `mutual-exclusion and exact managed surfaces` |
| `AC-006` | test | `tests/typescript-tooling.sh:TST001-AC-003` | `installed packed CLI fixture` | `embedded snapshot provenance and plan` |
| `AC-007` | test | `packages/cli/test/init-command.test.mjs` | `conflict and markerless fixtures` | `INIT_CONFLICT exit 1 and unchanged manifest` |
| `AC-008` | test | `packages/cli/test/init-command.test.mjs` | `unsafe parent and leaf fixtures` | `INIT_OPERATION_REFUSED exit 1 and unchanged manifest` |
| `AC-009` | test | `packages/cli/test/init-command.test.mjs` | `invalid invocation fixtures` | `typed ERROR exit 2 and unchanged manifest` |
| `AC-010` | command | `make verify` | `complete repository checkout` | `all repository and package gates exit 0` |

## Verification Notes

Run focused Core planner and CLI/published-package tests, retained
`tests/bootstrap.sh` dry-run cases, then `make verify`. Record each current-tree
observation in `verification.md` after the final successful gate.
