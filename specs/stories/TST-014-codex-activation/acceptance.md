# Acceptance Criteria

## Happy Path

- [ ] AC-001: Preview through the packed CLI returns `ACTIVATION_PREVIEW` with
      exit `0` and the exact ordered four-file plan while leaving the complete
      target unchanged. Apply returns `ACTIVATION_APPLIED`, generates bytes
      equivalent to the retained activator, preserves every byte and mode
      outside the bounded AGENTS section, prepares all effects before any
      destination rename, applies `.forgeflow-snapshot` last, and leaves no
      owned stage or scratch residue.
- [ ] AC-002: Repeating the same packaged snapshot returns
      `ACTIVATION_UNCHANGED` with exit `0` and zero target mutation; a later
      packaged snapshot updates only the four owned destinations and records
      its version, revision, unchanged adoption identity, and exact POSIX
      checksum/byte-count values.

## Business Rules

- [ ] AC-003: Core creates the same content-addressed activation plan from
      identical immutable inputs, including exact ordered preconditions and
      effects, and maps identical mutation and cleanup observations to
      identical results. The CLI adapter reports observations only and contains
      no activation semantic outcome assignment.
- [ ] AC-004: An unknown integration member, missing installed member, locally
      edited owned file or block, snapshot identity mismatch, ambiguous marker,
      or invalid adoption marker returns `ACTIVATION_CONFLICT` with exit `1`
      before target mutation. No conflict overwrites or removes unknown or
      locally edited content, and there is no force option.
- [ ] AC-005: An unsafe link or wrong path type, changed root, managed content,
      membership, or stage state after planning, or invalid packaged source
      returns `ACTIVATION_OPERATION_REFUSED` with exit `1`, including
      `ACTIVATION_STALE_PLAN` where applicable, and leaves the complete target
      mutation manifest unchanged. External hard-link aliases retain their
      prior bytes.

## Failure Cases

- [ ] AC-006: Preparation and replacement faults return the documented
      activation exit-1 outcome without success. Recovery runs in reverse
      attempted order and continues after a failed restore; complete recovery
      returns `ACTIVATION_APPLY_FAILED_RECOVERED`, while failed restoration or
      snapshot invalidation returns `ACTIVATION_RECOVERY_INCOMPLETE` and names
      every unrecovered destination and retained sibling recovery directory.
      One canonical JSON envelope contains only ordered repository-relative or
      sanitized retained evidence, never raw OS errors, absolute paths,
      environment values, or payload bytes; human output renders the same Core
      outcome.
- [ ] AC-007: Injected external scratch cleanup failure in preview and unchanged
      modes and owned stage cleanup failure after committed apply return
      `ACTIVATION_CLEANUP_INCOMPLETE` with exit `1`, retain and identify the
      exact recoverable evidence, perform zero target mutation in preview and
      unchanged modes, and never claim clean success.

## Regression Requirements

- [ ] AC-008: Core plan/evaluation, fake-adapter, real-filesystem fault,
      differential activation parity, packed CLI, full retained
      `tests/codex-activation.sh`, TypeScript package, and complete repository
      verification gates pass. Production activation code performs no network
      access or target-owned process execution, and the retained script,
      bootstrap, Doctor, Protocol, templates, and adoption marker remain
      unchanged.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test    | `packages/cli/test/activation-command.test.mjs`          | `fresh adopted target previewed and applied by packed CLI and retained script`                         | `ordered four-file preview; applied bytes and modes match; snapshot last; no target or staging residue`              |
| `AC-002` | test    | `packages/core/test/activation.test.mjs`                 | `same snapshot followed by a later packaged snapshot with unchanged adoption marker`                   | `unchanged result has zero target mutation; update changes only owned bytes and exact snapshot identities`           |
| `AC-003` | test    | `packages/core/test/activation.test.mjs`                 | `identical immutable planning inputs and execution observation records`                                | `identical content-addressed plans and final results; adapter owns no semantic result assignment`                    |
| `AC-004` | test    | `packages/cli/test/activation-command.test.mjs`          | `unknown, incomplete, edited, mismatched, ambiguous, and invalid-adoption fixtures`                    | `ACTIVATION_CONFLICT exit 1 before target mutation; owned and unknown bytes preserved`                               |
| `AC-005` | test    | `packages/cli/test/activation-mutation-adapter.test.mjs` | `unsafe path, post-plan root/content/membership/stage changes, invalid source, and hard-link fixtures` | `ACTIVATION_OPERATION_REFUSED exit 1 with stable issue and unchanged target/outside manifests`                       |
| `AC-006` | test    | `packages/cli/test/activation-mutation-adapter.test.mjs` | `preparation and rename faults before/after effect plus restore and snapshot-invalidation faults`      | `reverse recovery; recovered or incomplete outcome; every unrecovered and retained path reported; siblings continue` |
| `AC-007` | test    | `packages/cli/test/activation-command.test.mjs`          | `scratch cleanup faults in preview/unchanged and stage cleanup fault after committed apply`            | `ACTIVATION_CLEANUP_INCOMPLETE exit 1 with retained evidence and mode-appropriate zero target mutation`              |
| `AC-008` | command | `make verify`                                            | `complete repository checkout after focused activation and retained-shell suites pass`                 | `all repository, package, portability, retained shell, TypeScript, and Actions gates exit 0`                         |

## Security Fixture Matrix

| Source field | Payload | Expected result | Persisted locations | Verification |
| --- | --- | --- | --- | --- |
| `activation.repository-directory`      | `fixture/missing-target`                                           | reject          | `JSON error.code`                                             | `packages/cli/test/activation-command.test.mjs`          |
| `snapshot.version`                     | `0.9.x`                                                            | reject          | `JSON issues[*].code`                                         | `packages/core/test/activation.test.mjs`                 |
| `snapshot.revision`                    | `unknown\ntrusted=true`                                            | reject          | `JSON issues[*].code`                                         | `packages/core/test/activation.test.mjs`                 |
| `snapshot.skill-bytes`                 | `../story-development/SKILL.md`                                    | preserve        | `.agents/skills/forgeflow/SKILL.md rewritten local reference` | `packages/cli/test/activation-command.test.mjs`          |
| `adoption.version`                     | `0.9.0\nversion=0.8.0`                                             | reject          | `JSON issues[*].code`                                         | `packages/cli/test/activation-command.test.mjs`          |
| `filesystem.managed-directory-kind`    | `symlink`                                                          | reject          | `JSON issues[*].path`                                         | `packages/cli/test/activation-mutation-adapter.test.mjs` |
| `filesystem.managed-directory-members` | `SKILL.md, local-note.md`                                          | preserve        | `.agents/skills/forgeflow/local-note.md`                      | `packages/cli/test/activation-command.test.mjs`          |
| `filesystem.managed-path-kind`         | `directory or FIFO at owned leaf`                                  | reject          | `JSON issues[*].path`                                         | `packages/cli/test/activation-mutation-adapter.test.mjs` |
| `filesystem.managed-path-bytes`        | `locally edited installed SKILL.md`                                | preserve        | `.agents/skills/forgeflow/SKILL.md`                           | `packages/cli/test/activation-command.test.mjs`          |
| `filesystem.managed-path-digest`       | `post-plan changed AGENTS bytes`                                   | reject          | `JSON issues[*].code`                                         | `packages/cli/test/activation-mutation-adapter.test.mjs` |
| `filesystem.stage-path-kind`           | `directory`                                                        | reject          | `JSON issues[*].path`                                         | `packages/cli/test/activation-mutation-adapter.test.mjs` |
| `mutation.plan-id`                     | `cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc` | preserve        | `JSON data.planId`                                            | `packages/core/test/activation.test.mjs`                 |
| `mutation.execution-observations`      | `unrecovered AGENTS.md`                                            | preserve        | `JSON data.unrecovered[*]`                                    | `packages/cli/test/activation-mutation-adapter.test.mjs` |
| `mutation.adapter-error`               | `EACCES /private/target secret-token`                              | omit            | `JSON issues[*].message, error.message, and data`             | `packages/cli/test/activation-command.test.mjs`          |
| `scratch.cleanup-observation`          | `retained private scratch`                                         | preserve        | `JSON data.cleanupResidue[*]`                                 | `packages/cli/test/activation-command.test.mjs`          |

## Verification Notes

Run focused Core planning/evaluation, fake adapter, real-filesystem fault,
packed CLI, and differential retained-activation parity tests. Then run
`pnpm run format:check`, `pnpm run lint`, `pnpm run typecheck`, `pnpm test`,
`./tests/codex-activation.sh`, `./tests/typescript-tooling.sh`, and
`make verify`. Record every high-risk layer and acceptance observation in
`verification.md` only after the final current-tree gate.
