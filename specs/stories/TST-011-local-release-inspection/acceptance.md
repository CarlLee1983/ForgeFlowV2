# Acceptance Criteria

## Happy Path

- [ ] AC-001: For every disposable release fixture, explicit-root and
      current-directory invocation produce the same outcome, issues, evidence,
      and exit. A conformant worktree produces `RELEASE_READY` and exit `0`
      through `forgeflow release check` in human and JSON modes.

## Business Rules

- [ ] AC-002: The TypeScript Core evaluator and CLI preserve the retained local
      release semantics for every case dispatched by `tests/release-check.sh`,
      mirrored in the differential corpus, including result, stable issue, exit,
      and `data.remoteChecks` exactly `not-performed`.
- [ ] AC-003: Guarded Git acquisition clears `GIT_DIR`, `GIT_WORK_TREE`, and
      `GIT_INDEX_FILE`, forces the required lock, lazy-fetch, and
      replacement-ref settings, and prevents fsmonitor and hooks from changing
      an observation; before/after changes to required Git facts yield
      `RELEASE_INCOMPLETE`, exit `1`, and no retry. Every fixture outcome leaves
      no checker-caused change to the candidate's HEAD, refs, index,
      configuration, or worktree manifest; a concurrency fixture retains only
      its exact externally injected change. A fake adapter or PATH trap proves
      that no remote Git, GitHub, CI, or publication command is invoked.

## Failure Cases

- [ ] AC-004: Invalid arguments; unsafe, missing, unreadable, or non-directory
      candidates; and a candidate whose resolved physical directory is not its
      Git worktree root produce one typed `ERROR` result and exit `2`; safely
      acquired non-Git candidates and diagnosed local release-readiness or
      guarded Git-inspection failures produce
      `RELEASE_INCOMPLETE` and exit `1`; unexpected internal failures produce
      `ERROR` and exit `3`. In `--json` mode stdout is exactly one
      newline-terminated envelope; human mode renders the same typed result.

## Regression Requirements

- [ ] AC-005: Core evaluator, fake and real Git-adapter, differential-parity,
      packed-CLI, retained `tests/release-check.sh`, and complete repository
      gates pass while `scripts/release-check` and `make release-check` remain
      unchanged.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `packages/cli/test/release-command.test.mjs` | `every disposable release fixture invoked by root and current directory` | `equal outcome, issues, evidence, and exit; conformant fixture is RELEASE_READY exit 0` |
| `AC-002` | test | `packages/cli/test/release-parity.test.mjs` | `every tests/release-check.sh case mirrored in the differential corpus` | `equal result, stable issue, exit, and data.remoteChecks=not-performed` |
| `AC-003` | test | `packages/cli/test/release-command.test.mjs` | `hostile environment, remote-command trap, and changing-observation fixtures` | `sanitized observation, no remote invocation, no checker mutation, and retained injected change only` |
| `AC-004` | test    | `packages/cli/test/release-command.test.mjs` | `invalid argv, unsafe target, diagnosed Git failure, and internal-failure fixtures` | `JSON has one envelope; exits are 2, 1, or 3 by typed outcome; human and JSON share that outcome` |
| `AC-005` | command | `make verify`                                | `complete repository checkout after focused release suites pass`                    | `all repository, package, portability, retained shell, and TypeScript gates exit 0`               |

## Security Fixture Matrix

| Source field | Payload | Expected result | Persisted locations | Verification |
| --- | --- | --- | --- | --- |
| `release.repository-directory` | `fixture/non-root/subdirectory` | reject | `JSON error.code` | `packages/cli/test/release-command.test.mjs` |
| `process.env.GIT_DIR` | `hostile/.git` | omit | `Git adapter child environment` | `packages/cli/test/release-command.test.mjs` |
| `process.env.GIT_WORK_TREE` | `hostile/worktree` | omit | `Git adapter child environment` | `packages/cli/test/release-command.test.mjs` |
| `process.env.GIT_INDEX_FILE` | `hostile/index` | omit | `Git adapter child environment` | `packages/cli/test/release-command.test.mjs` |
| `process.env.GIT_OPTIONAL_LOCKS` | `1` | omit | `Git adapter child environment` | `packages/cli/test/release-command.test.mjs` |
| `process.env.GIT_NO_LAZY_FETCH` | `0` | omit | `Git adapter child environment` | `packages/cli/test/release-command.test.mjs` |
| `process.env.GIT_NO_REPLACE_OBJECTS` | `0` | omit | `Git adapter child environment` | `packages/cli/test/release-command.test.mjs` |
| `git.stdout` | `hostile observation output` | omit | `JSON issues[*].message, issues[*].data, error.message, error.data, evidence[*].observation, and data` | `packages/cli/test/release-command.test.mjs` |
| `git.stderr` | `fatal: hostile diagnostic` | omit | `JSON issues[*].message, issues[*].data, error.message, error.data, evidence[*].observation, and data` | `packages/cli/test/release-command.test.mjs` |
| `git.exit-status` | `23` | preserve | `typed Git observation.exitStatus` | `packages/cli/test/release-command.test.mjs` |
| `git.worktree-root` | `fixture/other-root` | reject | `JSON error.code` | `packages/cli/test/release-command.test.mjs` |
| `git.head` | `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` | preserve | `typed release result.commit` | `packages/cli/test/release-command.test.mjs` |
| `git.index-flags` | `S VERSION` | preserve | `typed Git observation.indexFlags` | `packages/cli/test/release-command.test.mjs` |
| `git.head-version-object` | `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` | preserve | `typed Git observation.headVersionObject` | `packages/cli/test/release-command.test.mjs` |
| `git.working-version-object` | `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` | preserve | `typed Git observation.workingVersionObject` | `packages/cli/test/release-command.test.mjs` |
| `git.version-content` | `0.2.1` | preserve | `JSON data.version` | `packages/cli/test/release-command.test.mjs` |
| `git.tag-refs` | `refs/tags/v0.2.1 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` | omit | `JSON data` | `packages/cli/test/release-command.test.mjs` |
| `git.worktree-status` | ` M tracked.txt` | preserve | `typed Git observation.worktreeStatus` | `packages/cli/test/release-command.test.mjs` |

## Verification Notes

During implementation, run focused Core release-evaluation, fake and real
Git-adapter, CLI rendering, differential-parity, packed-package, and retained
release-shell suites. Then run `pnpm run format:check`, `pnpm run lint`,
`pnpm run typecheck`, `pnpm test`, `./tests/release-check.sh`,
`./tests/typescript-tooling.sh`, and `make verify`. Record every required
high-risk verification layer and every acceptance observation in
`verification.md` after the final current-tree run.
