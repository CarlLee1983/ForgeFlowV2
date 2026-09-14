# Acceptance Criteria

## Happy Path

- [ ] AC-001: Fresh safe, force, and upgrade apply through the packed CLI and
      return `INIT_APPLIED` with exit `0`; every generated managed artifact is
      byte-equivalent to the retained bootstrap output, force and upgrade keep
      their exact ownership surfaces, all payloads are staged before any target
      rename, the marker is renamed last, and successful cleanup leaves no
      private staging entry.

## Business Rules

- [ ] AC-002: Core produces the same content-addressed plan from identical
      observations, including exact ordered preconditions and effects, and maps
      identical immutable mutation execution observations to identical final
      results. The injected mutation adapter reports facts only and contains no
      Init semantic outcome assignment.
- [ ] AC-003: After planning but before the first staging or destination
      mutation, a changed managed file's content or existence, an unsafe link,
      a wrong path type, or an existing sibling stage returns
      `INIT_OPERATION_REFUSED` with a stable issue including
      `INIT_STALE_PLAN` where applicable, exit `1`, and an unchanged complete
      target mutation manifest.

## Failure Cases

- [ ] AC-004: Injected directory creation, stage creation, original backup,
      packaged payload write, and generated marker write faults return
      `INIT_APPLY_FAILED_RECOVERED` with exit `1`, preserve every target file's
      prior bytes and existence, remove created empty directories and owned
      stages when possible, and never print or serialize success.
- [ ] AC-005: A replacement fault before or after its operating-system effect
      triggers reverse attempted-order recovery for fresh, force, and upgrade.
      Complete recovery returns `INIT_APPLY_FAILED_RECOVERED`; failed restores
      return `INIT_RECOVERY_INCOMPLETE`, continue restoring siblings, name every
      unrecovered managed destination and retained sibling recovery directory,
      preserve original backups, and invalidate an untrustworthy marker.
- [ ] AC-006: Safety refusal, complete recovery, incomplete recovery, and a
      fully committed apply with cleanup residue return respectively
      `INIT_OPERATION_REFUSED`, `INIT_APPLY_FAILED_RECOVERED`,
      `INIT_RECOVERY_INCOMPLETE`, and `INIT_CLEANUP_INCOMPLETE`, all with exit
      `1`. JSON is one valid envelope containing ordered repository-relative
      mutation evidence without raw OS errors, absolute target paths,
      environment values, or payload bytes; human output renders the same Core
      outcome.

## Regression Requirements

- [ ] AC-007: Core mutation, fake-adapter, real-filesystem fault-injection,
      complete bootstrap parity, full retained `tests/bootstrap.sh`, packed CLI
      Init, TypeScript package, and complete repository verification gates pass
      while `scripts/bootstrap`, its accepted behavior, Protocol, and templates
      remain unchanged.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test    | `packages/cli/test/init-apply.test.mjs`            | `fresh, force, and upgrade targets applied by packed CLI and retained bootstrap`                          | `INIT_APPLIED exit 0, byte-equal managed artifacts, exact ownership and order, no staging residue`                  |
| `AC-002` | test    | `packages/core/test/init-mutation.test.mjs`        | `identical immutable plan inputs and execution observation records`                                       | `identical content-addressed plans and final results; adapter observations contain no semantic outcome`             |
| `AC-003` | test    | `packages/cli/test/init-mutation-adapter.test.mjs` | `post-plan content/existence change, symlink, wrong type, and sibling-stage collision before apply`       | `INIT_OPERATION_REFUSED exit 1 with stable issue and unchanged target manifest`                                     |
| `AC-004` | test    | `packages/cli/test/init-mutation-adapter.test.mjs` | `injected preparation faults at directory, stage, backup, payload, and marker preparation`                | `INIT_APPLY_FAILED_RECOVERED exit 1, original bytes/existence, no success, owned residue reported or removed`       |
| `AC-005` | test    | `packages/cli/test/init-mutation-adapter.test.mjs` | `fresh, force, and upgrade rename faults before/after effect plus restore and marker-invalidation faults` | `reverse recovery; recovered or incomplete outcome; all unrecovered and retained paths reported; siblings continue` |
| `AC-006` | test    | `packages/cli/test/init-apply.test.mjs`            | `one fixture for each documented exit-1 mutation result in human and JSON modes`                          | `distinct valid Core results with sanitized ordered evidence and equal human/JSON semantics`                        |
| `AC-007` | command | `make verify`                                      | `complete repository checkout after focused mutation and parity suites pass`                              | `all repository, package, portability, retained shell, TypeScript, and Actions gates exit 0`                        |

## Security Fixture Matrix

| Source field | Payload | Expected result | Persisted locations | Verification |
| --- | --- | --- | --- | --- |
| `init.repository-directory`         | `fixture/missing-target`                                           | reject          | `JSON error.code`                                 | `packages/cli/test/init-apply.test.mjs`            |
| `init.mode`                         | `--force --upgrade`                                                | reject          | `JSON error.code`                                 | `packages/cli/test/init-apply.test.mjs`            |
| `snapshot.payloads[*].bytes`        | `managed payload bytes`                                            | preserve        | `managed destination bytes`                       | `packages/cli/test/init-apply.test.mjs`            |
| `snapshot.payloads[*].digest`       | `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` | preserve        | `mutation plan effects[*].digest`                 | `packages/core/test/init-mutation.test.mjs`        |
| `snapshot.revision`                 | `unknown\ntrusted=true`                                            | reject          | `JSON issues[*].code`                             | `packages/core/test/init-mutation.test.mjs`        |
| `filesystem.root-identity`          | `same target path with replaced inode`                             | reject          | `JSON issues[*].code`                             | `packages/cli/test/init-mutation-adapter.test.mjs` |
| `filesystem.managed-directory-kind` | `symlink`                                                          | reject          | `JSON issues[*].code`                             | `packages/cli/test/init-mutation-adapter.test.mjs` |
| `filesystem.managed-path-kind`      | `directory`                                                        | reject          | `JSON issues[*].code`                             | `packages/cli/test/init-mutation-adapter.test.mjs` |
| `filesystem.managed-path-digest`    | `bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb` | reject          | `JSON issues[*].code`                             | `packages/cli/test/init-mutation-adapter.test.mjs` |
| `filesystem.stage-path-kind`        | `directory`                                                        | reject          | `JSON issues[*].path`                             | `packages/cli/test/init-mutation-adapter.test.mjs` |
| `mutation.plan-id`                  | `cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc` | preserve        | `JSON data.planId`                                | `packages/core/test/init-mutation.test.mjs`        |
| `mutation.execution-observations`   | `unrecovered specs/stories/_template/story.md`                     | preserve        | `JSON data.unrecovered[*]`                        | `packages/cli/test/init-mutation-adapter.test.mjs` |
| `mutation.adapter-error`            | `EACCES /private/target secret-token`                              | omit            | `JSON issues[*].message, error.message, and data` | `packages/cli/test/init-apply.test.mjs`            |

## Verification Notes

Run focused Core plan/execution evaluation, fake mutation adapter, real
filesystem fault injection, packed CLI, and differential bootstrap parity tests.
Then run `pnpm run format:check`, `pnpm run lint`, `pnpm run typecheck`,
`pnpm test`, `./tests/bootstrap.sh`, `./tests/typescript-tooling.sh`, and
`make verify`. Record every high-risk layer and acceptance observation in
`verification.md` only after the final current-tree gate.
