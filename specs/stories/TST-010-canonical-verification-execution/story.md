# Story: TST-010 Canonical Verification Execution

## Goal

Deliver `forgeflow verify` and the compatible `forgeflow doctor --run-verify`
mode so an explicitly trusted repository can run its one canonical `make
verify` target exactly once from its resolved physical root.

## Context

GitHub issue #35 follows TST-009. The retained portable `scripts/doctor
--run-verify` is the behavioral compatibility oracle. TST-009 deliberately
migrated only static inspection; this Story adds the explicitly authorized
execution boundary without changing the retained shell command.

## Classification

* Security sensitive: yes
* Baseline conformance: no
* Task mode: execution

## Authority

* plan: yes
* modify: yes
* add_dependency: no
* migration: no
* commit: no
* push: no
* deploy: no

## Architecture

* Impact: high
* Boundary: `CLI canonical verification execution adapter`
* Boundary: `CLI static Repository Doctor adapter`
* Contract: `the execution adapter resolves a physical repository root, invokes exactly one make verify child with an explicit cwd and environment boundary, retains raw child completion evidence, and never retries, repairs, or chooses an alternative gate`
* Contract: `the static Doctor retains no child-process capability; compatible Doctor execution composes its already-confirmed static outcome with the execution adapter only after explicit --run-verify authorization`
* Contract: `human execution streams preserve child stdout and stderr while JSON mode writes exactly one versioned result envelope to stdout`
* Owner: `CLI canonical verification execution adapter = ForgeFlow TypeScript CLI`
* Owner: `CLI static Repository Doctor adapter = ForgeFlow TypeScript CLI`

## Risk

* Level: high
* Reason: `public-contract`
* Reason: `error-projection`

## Scope

### In Scope

* Add `forgeflow verify [--json] [repository-directory]` with an injectable
  process adapter, explicit physical-root resolution, one canonical `make
  verify` invocation, and human/JSON result mapping.
* Extend Doctor only with its compatible explicit `--run-verify` execution
  mode, retaining static Doctor behavior when that flag is absent.
* Add deterministic fake-process, real temporary-fixture, stream, Doctor
  parity, packed-CLI, and retained-shell coverage for success, nonzero, spawn
  failure, and signal completion.
* Document the additive CLI execution capability without changing the retained
  shell Doctor, Protocol, or templates.

### Out of Scope

* Retry, repair, dependency installation, an alternative gate, sandboxing,
  process execution in static Doctor mode, repository writes by ForgeFlow,
  CI or merge claims, Git or remote operations, release inspection,
  publication, commit, push, deployment, or migration.

## Inputs

* Explicit `verify` or `doctor --run-verify` command arguments, including an
  optional JSON request and repository directory.
* A caller-selected, trusted repository root with required static Doctor
  structure and its repository-owned `make verify` target.
* Child process stdout, stderr, status, signal, and spawn-error observations.

## Outputs

* A human execution report containing the streamed child evidence and one of
  `VERIFIED_LOCAL`, `VERIFICATION_FAILED`, or `ERROR`.
* Exactly one newline-terminated, versioned JSON result envelope on stdout in
  JSON mode, with no child output mixed into that stream.
* A typed execution result retaining the raw child completion observation for
  rendering and tests.

## Rules

* R1: `forgeflow verify` and `forgeflow doctor --run-verify` resolve the same
  physical root and invoke `make verify` exactly once only after the required
  structure is safely confirmed.
* R2: Static Doctor remains process-free and read-only. It imports no process
  adapter and never starts a target-owned child unless `--run-verify` is
  explicitly selected.
* R3: Execution uses the resolved physical root as child cwd and a controlled
  environment; it never evaluates a target shell, retries a child, repairs a
  target, installs dependencies, or selects another command.
* R4: A zero child completion maps to local verification pass and CLI exit 0;
  nonzero status and signal completions map to verification failure and CLI
  exit 1; missing executable or adapter operational failure maps to error and
  CLI exit 2 while retaining the raw observation.
* R5: Human mode preserves child stdout and stderr in their respective streams
  before the ForgeFlow result. JSON mode reserves stdout for one canonical
  result envelope and sends no child output there.
* R6: This is Additive Reference Tooling. The retained shell Doctor, Protocol,
  templates, and default static Doctor behavior remain unchanged.

## Expected Errors

* Invalid, repeated, misplaced, or excess arguments; absent, file, unsafe, or
  structurally incomplete targets; and unavailable `make` produce the
  appropriate typed error or incomplete result without target execution.
* A child nonzero status or signal produces a verification failure result,
  preserves the observed status or signal, and does not retry.
* A child spawn error produces one error result and exit 2 without an invented
  verification result.

## Dependencies

* TST-009's static Repository Doctor evaluator, filesystem adapter, CLI
  command, and retained `scripts/doctor` compatibility oracle.
* The Repository and Verification Contracts and `make verify` owned by each
  target repository.
* Node.js built-ins only for production process access and tests.

## Constraints

* Do not add a dependency, modify retained shell behavior, edit Protocol or
  templates, run a target command during static inspection, publish, push,
  deploy, or run a migration.
* Keep process acquisition and stream handling out of static Doctor and keep
  rendering and argument parsing outside the process adapter.
* Target fixtures must be disposable; tests never run the ForgeFlow checkout's
  own canonical verification as a target fixture.

## Guidance

Relevant:

* principle: small coherent changes
* principle: explicit dependencies
* principle: behavior-oriented testing
* decision: `ADR-007`
* decision: `ADR-008`
* decision: `ADR-009`

Not applicable:

* no persistent-data, remote-integration, or migration guidance applies

## Trust Boundary Fields

* `verify.repository-directory` — caller-provided target-root argument
* `doctor.repository-directory` — caller-provided target-root argument after explicit execution authorization
* `process.stdout` — untrusted target-owned child output streamed only in human mode
* `process.stderr` — untrusted target-owned child output streamed only in human mode
* `process.status` — child completion status used for typed result mapping
* `process.signal` — child termination signal used for typed result mapping
* `process.error` — process-adapter operational failure used for typed result mapping
