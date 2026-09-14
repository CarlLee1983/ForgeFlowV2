# Story: TST-011 Local Release Inspection

## Goal

Deliver `forgeflow release check [repository]` so a ForgeFlow maintainer can
deterministically inspect one local Git worktree's release readiness without
changing that worktree or consulting any remote service.

## Context

GitHub issue #36 follows completed TST-003 and TST-010. The retained portable
`scripts/release-check` is the compatibility oracle for local release
inspection. This slice adds the TypeScript command and its Core and Git-adapter
boundaries; TST-017 alone may change the repository's `make release-check`
compatibility entrypoint, and TST-018 alone may remove the shell implementation.

## Classification

- Security sensitive: yes
- Baseline conformance: no
- Task mode: execution

## Authority

- plan: yes
- modify: yes
- add_dependency: no
- migration: no
- commit: yes
- push: no
- deploy: no

## Architecture

- Impact: high
- Boundary: `Core release-readiness evaluator`
- Boundary: `CLI guarded Git observation adapter`
- Boundary: `CLI release check command and renderer`
- Contract: `Core evaluates one immutable normalized local Git observation snapshot into RELEASE_READY, RELEASE_INCOMPLETE, or ERROR without filesystem, process, environment, clock, network, or mutable lifecycle access`
- Contract: `the CLI resolves an explicit or current candidate to its physical Git worktree root, gathers guarded local Git observations through a sanitized adapter, compares required before and after observations, and never mutates the candidate`
- Contract: `human and JSON rendering consume the same typed result; JSON stdout contains one versioned envelope and raw Git diagnostics are not projected as machine detail`
- Owner: `Core release-readiness evaluator = ForgeFlow TypeScript Core`
- Owner: `CLI guarded Git observation adapter = ForgeFlow TypeScript CLI`
- Owner: `CLI release check command and renderer = ForgeFlow TypeScript CLI`

## Risk

- Level: high
- Reason: `public-contract`
- Signal: `error-projection`
- Signal: `concurrency`

## Error Projection

- Source failure: `guarded Git command failure or unsafe candidate acquisition`
- Public projection: `RELEASE_INCOMPLETE or ERROR with one stable issue code and documented CLI exit`
- Detail policy: `raw Git stderr, inherited environment values, and filesystem paths beyond the requested candidate are not emitted in JSON`
- Evidence AC: `AC-004`

## Concurrency

- Contended resource: `candidate Git HEAD, tag refs, index flags, worktree status, and VERSION content`
- Linearization point: `equality of the required before and after guarded observation snapshots`
- Conflict outcome: `RELEASE_INCOMPLETE with exit 1 and no retry or mutation`
- Evidence AC: `AC-003`

## Scope

### In Scope

- Add `forgeflow release check [repository]` in human and `--json` modes,
  defaulting the candidate to `.` and requiring its resolved physical directory
  to be the Git worktree root.
- Add a pure Core release-readiness evaluator, a guarded injectable Git
  observation adapter, typed result mapping, and renderer support for
  `RELEASE_READY`, `RELEASE_INCOMPLETE`, and `ERROR`.
- Preserve semantic parity with every retained release fixture covering Git
  worktree, index, committed and working `VERSION`, local tag, hostile Git
  configuration, and before/after consistency behavior.
- Add fake-adapter, real disposable-Git-fixture, differential-parity, packed
  CLI, retained-shell, and complete repository verification coverage.

### Out of Scope

- Remote fetch, remote-ref inspection, GitHub query or write, CI query, tag
  creation, publication, release authorization, commit, push, deployment, or
  implicit execution of the target's canonical verification by the direct CLI
  command.
- Changing `scripts/release-check`, `tests/release-check.sh`, Protocol,
  templates, or the root `make release-check` compatibility entrypoint.
- Retrying, repairing, staging, installing dependencies, writing to the target,
  shelling out to retained checker prose, migration, or adding a dependency.

## Inputs

- An optional caller-provided repository directory, or the current directory
  when omitted.
- Local Git observations for the resolved candidate: worktree root, `HEAD`,
  index flags, committed and working `VERSION`, status, and local tag refs.
- The target process environment and Git command stdout, stderr, status, and
  operational failure observations.
- Optional `--json` command selection.

## Outputs

- A typed local-release result with `RELEASE_READY`, `RELEASE_INCOMPLETE`, or
  `ERROR`, stable issue mapping, and documented CLI exit status.
- Human output compatible with the retained release-inspection semantics.
- Exactly one newline-terminated versioned JSON result envelope on stdout in
  JSON mode, with `data.remoteChecks` exactly `not-performed` on every handled
  result.

## Rules

- R1: The command resolves the candidate physically, requires it to equal the
  Git worktree root, and gives the same semantic result for explicit-root and
  current-directory invocation of the same checkout.
- R2: Core evaluation is deterministic from normalized observations and never
  reads Git, filesystems, environment, lifecycle state, or time, and never
  performs process or network operations.
- R3: The Git adapter clears `GIT_DIR`, `GIT_WORK_TREE`, and `GIT_INDEX_FILE`,
  forces guarded lock, lazy-fetch, and replacement-ref settings, and prevents
  fsmonitor and hooks from affecting an observation; it does not execute a
  target-owned shell command or mutate Git state.
- R4: The adapter compares required before and after observations of HEAD, tag
  refs, index flags, working `VERSION`, and worktree status. Any detected change
  is `RELEASE_INCOMPLETE`, exits `1`, and is neither retried nor repaired.
- R5: Invalid arguments, unsafe or unconfirmable physical-target acquisition,
  and a candidate whose resolved physical directory does not equal its Git
  worktree root return `ERROR` and exit `2`; a safely acquired non-Git candidate
  and every diagnosed local-readiness or guarded Git-inspection failure return
  `RELEASE_INCOMPLETE` and exit `1`; an unexpected internal failure returns
  `ERROR` and exit `3`.
- R6: Every handled result has `data.remoteChecks` exactly `not-performed`; the
  adapter never invokes a remote Git operation, GitHub client, CI client, or
  publication command.
- R7: This is Additive Reference Tooling. The retained shell checker and every
  existing entrypoint keep their behavior; no remote release assertion is made.

## Expected Errors

- Repeated, unknown, or excess command arguments; a missing, unreadable, or
  non-directory candidate; and a candidate whose safely resolved physical
  directory is not the Git worktree root return one typed `ERROR` result and
  exit `2` without a target mutation.
- A safely acquired non-Git candidate, unborn HEAD, hidden index entries,
  missing, malformed, uncommitted, or mismatched `VERSION`, a dirty worktree,
  an invalid or conflicting local tag, changed before/after observations, or a
  guarded Git query failure return `RELEASE_INCOMPLETE` and exit `1`.
- An unexpected exception, violated internal invariant, or failure to produce
  the machine envelope returns a sanitized `ERROR` diagnostic and exit `3`.
- Remote state is never acquired; a result always states that remote checks
  were not performed rather than implying local readiness authorizes release.

## Dependencies

- TST-003's differential parity harness and isolated fixture-copy contract.
- TST-010's typed CLI result, JSON-envelope, physical-root, and process-adapter
  patterns where they are applicable to Git observation.
- The retained `scripts/release-check`, `tests/release-check.sh`, release
  contract documentation, and Node.js built-ins.

## Constraints

- Do not add a dependency, modify retained shell behavior or its fixtures,
  edit Protocol or templates, or change the root Make compatibility path.
- Keep Git/environment/process acquisition in the CLI adapter, deterministic
  release policy in Core, and argument parsing and human/JSON rendering outside
  the adapter.
- Fixtures must be disposable Git repositories; no test may inspect, alter, or
  use this ForgeFlow checkout as its release candidate.
- Do not push, deploy, publish, add a tag, invoke a remote operation,
  or run a migration.

## Guidance

Relevant:

- principle: small coherent changes
- principle: explicit dependencies
- principle: behavior-oriented testing
- principle: deep module interface

Not applicable:

- no persistent-data or migration guidance applies; remote release operations
  are expressly outside this Story

## Trust Boundary Fields

- `release.repository-directory` — caller-selected candidate directory
- `release.current-directory` — implicit candidate when the argument is omitted
- `process.env.GIT_DIR` — inherited Git routing state that the adapter clears
- `process.env.GIT_WORK_TREE` — inherited Git routing state that the adapter clears
- `process.env.GIT_INDEX_FILE` — inherited Git routing state that the adapter clears
- `process.env.GIT_OPTIONAL_LOCKS` — inherited lock policy that the adapter overrides
- `process.env.GIT_NO_LAZY_FETCH` — inherited lazy-fetch policy that the adapter overrides
- `process.env.GIT_NO_REPLACE_OBJECTS` — inherited replacement-ref policy that the adapter overrides
- `git.stdout` — externally produced Git observation output
- `git.stderr` — externally produced Git diagnostic output
- `git.exit-status` — externally produced Git command completion status
- `git.worktree-root` — externally derived physical Git worktree root
- `git.head` — externally derived candidate commit identifier
- `git.index-flags` — externally derived assume-unchanged and skip-worktree flags
- `git.head-version-object` — externally derived committed VERSION object identifier
- `git.working-version-object` — externally derived working VERSION object identifier
- `git.version-content` — externally derived committed VERSION content
- `git.tag-refs` — externally derived candidate tag-ref snapshot
- `git.worktree-status` — externally derived candidate worktree observation
