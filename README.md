# ForgeFlow

![ForgeFlow turns human intent into verified engineering work](docs/assets/forgeflow-hero.png)

ForgeFlow is an agent-agnostic development protocol for AI-assisted engineering.
It turns approved human intent into a bounded Story, makes repository tooling the
source of deterministic verification evidence, and sends verified work to human
review.

```text
Human → Story → Agent implementation → Verify → Repair → PASS → Human review → Merge
```

ForgeFlow does not teach an agent how to code and does not require a particular
AI vendor. It defines the repository-level contract that Codex, Claude Code,
Cursor, OpenCode, Gemini CLI, and future coding agents can follow.

## Protocol

Each change starts as a Story under
`specs/stories/<story-id>/`:

- `story.md` records the approved goal, scope, inputs, outputs, rules,
  expected errors, dependencies, and constraints.
- `acceptance.md` turns the required behavior into checkable acceptance
  criteria.
- `task.md` may contain human working notes, but it is not a source of product
  requirements or authoritative lifecycle state.

The agent implements the smallest coherent change, adds or updates tests, and
runs the repository's canonical verification command:

```sh
make verify
```

The repository decides which format, lint, type, unit, integration, and
acceptance checks belong behind that command. A nonzero exit means the agent
returns to implementation, repairs the root cause without weakening the Story,
and verifies again. A zero exit makes the work eligible for human review; it
does not replace product or architecture judgment.

The protocol contracts include:

- [Story](protocol/story.md)
- [Verification](protocol/verification.md)
- [Execution](protocol/execution.md)
- [Architecture](protocol/architecture.md)
- [Lifecycle](protocol/lifecycle.md)
- [Handoff](protocol/handoff.md)
- [Repository adoption](protocol/repository-contract.md)
- [Versioning and compatibility](protocol/versioning.md)

ForgeFlow defines what the work means and what proves it; it does not store what state the work is currently in.
Lifecycle names remain shared vocabulary. When
an external control plane is present, it owns current work, lifecycle and Gate
state, next action, review state, verification-current state, and completion
state. ForgePilot is one example, not a dependency: Story checks, Doctor,
bootstrap, and `make verify` work without it.

## Optional engineering guidance

ForgeFlow may provide lightweight repository-readable engineering guidance that
helps agents reuse durable repository or team decisions. Guidance remains
advisory unless the adopting repository deliberately converts it into an
executable rule behind `make verify`; it never replaces the Story, verification,
or Human Review. The baseline is [selectively loaded](guidance/ENTRY.md), not a
knowledge-base platform or agent runtime.

## Execution governance

A Story may also declare the kind of work it is, the operations it authorizes,
the architecture it must not break, and its risk. These declarations are
optional and defaulted, so an existing Story keeps its meaning. The declared
risk selects a verification profile, and an optional per-Story result record
traces every acceptance criterion to the observation that proves it, so a
verified Story carries evidence rather than a claim.

```sh
./scripts/verification-check specs/stories/<story-id>
./scripts/verification-check --result specs/stories/<story-id>
```

See [Execution Governance](docs/execution-governance.md) for the mental model
and a worked example.

## Code quality

ForgeFlow can enforce Code Style without defining a cross-language style. The
adopting repository owns its formatter, lint, type, static-analysis, and
architecture rules and places the automated checks it requires behind
`make verify`. The resulting enforcement comes from that canonical command,
CI, and the repository's merge policy; design judgment remains with Human
Review. See [Code Quality](docs/code-quality.md) and
[Human Review](docs/human-review.md). A requested implementation change returns
to implementation and requires a new complete `make verify` PASS; Human Review
is neither an LLM score nor automated approval.

A CI workflow alone does not prevent a GitHub merge from bypassing failed
checks. A repository administrator must configure the corresponding required
status check or ruleset separately.

## Adopt ForgeFlow in a repository

Run the bootstrap script with the repository directory:

```sh
./scripts/bootstrap /path/to/repository
```

It installs:

```text
AGENTS.md
guidance/
├── ENTRY.md
├── PRINCIPLES.md
├── DECISIONS.md
└── PRACTICES.md
specs/
├── .forgeflow-adoption
└── stories/
    └── _template/
        ├── story.md
        ├── acceptance.md
        └── task.md
```

The adoption marker records the installed protocol version and source revision
for later template upgrades.

The script refuses to overwrite any managed file. If replacing those exact
files is intentional, pass `--force` explicitly:

```sh
./scripts/bootstrap --force /path/to/repository
```

Preview the same static preflight without writing to the target:

```sh
./scripts/bootstrap --dry-run /path/to/repository
./scripts/bootstrap --force --dry-run /path/to/repository
```

A successful bootstrap means only that these managed protocol files were
installed. It does not create the adopter-owned `Makefile`, run Doctor, execute
`make verify`, perform human review, or authorize a merge.

Copy `specs/stories/_template` to a directory named for the Story, fill
in the requirements, and ask an agent to implement that Story ID.

The full manual flow is documented in
[Getting Started](docs/getting-started.md), with rationale in
[ForgeFlow Concepts](docs/concepts.md). Moving an existing adoption to newer
Story templates is covered in
[Upgrading an adopting repository](docs/upgrading.md).

## Check Story and handoff contracts

For Codex users who want project-local activation without a repeated source-path
prompt, preview the optional integration with
`./scripts/codex-activate /path/to/repository`. Review it before using `--apply`.
See [Codex project activation](docs/codex-activation.md) for setup and updates.

Two static, read-only checkers report contract gaps before an agent starts
implementing:

```sh
./scripts/story-check [story-directory ...]
./scripts/handoff-check [handoff-file]
```

`story-check` reports a missing Classification, a security-sensitive Story
without an executable [security fixture matrix](protocol/story.md), or a
baseline-conformance Story that does not name the behavior it supersedes.
`handoff-check` reports a handoff whose [evidence block](protocol/handoff.md)
does not identify one Story, UTC recording time, repository, exact revision,
verification command, and observed result. Handoff evidence is historical; it
does not select work or persist lifecycle state. Neither checker replaces
`make verify` or human review. See [Contract checks](docs/contract-checks.md).

## Diagnose an adoption (optional)

Repository Doctor can statically inspect an adoption without changing it:

```sh
./scripts/doctor /path/to/repository
```

It requires only the `AGENTS.md`, `specs/stories/`, and `Makefile` surface. When
`guidance/` is present, its optional four-file baseline is also scanned without
making an absent directory invalid. Static success does not run `make verify`,
check CI or merge policy, or replace human review. For a repository you trust, explicit execution mode
runs its canonical gate once:

```sh
./scripts/doctor --run-verify /path/to/repository
```

This executes repository-owned code and is not read-only or sandboxed. See
[Repository Doctor](docs/doctor.md) for the command forms, safety boundary, and
result semantics.

## TypeScript example

The example in `examples/typescript` uses pnpm 12 and demonstrates a
repository-owned verification pipeline:

```sh
cd examples/typescript
pnpm install --frozen-lockfile
make verify
```

Its `make verify` runs formatting, linting, static type checking, Story
traceability, and tests through one deterministic entry point.

## Go example

The example in `examples/go` demonstrates the same contract with Go:

```sh
go -C examples/go mod download
make -C examples/go verify
```

Its gate checks formatting, `go vet`, Staticcheck, Story traceability, and tests.

## Verify this repository

Install the example's locked development dependencies, then run ForgeFlow's own
canonical verification command from the repository root:

```sh
pnpm --dir examples/typescript install --frozen-lockfile
go -C examples/go mod download
make verify
```

The root command checks required protocol artifacts, bootstrap and Doctor
behavior, release-check behavior, and GitHub Actions syntax, then delegates to
both example repositories. The
repository workflow in [`.github/workflows/verify.yml`](.github/workflows/verify.yml)
sets up its Linux toolchains and locked dependencies before invoking this same
gate.

An auxiliary portability check runs the existing shell behavior suites from an
isolated, clean Git fixture without changing the canonical gate:

```sh
make verify-portability PORTABILITY_SHELL=/bin/sh
make verify-portability PORTABILITY_SHELL=/bin/dash
```

CI configures this check on macOS with `/bin/sh` and Ubuntu with `/bin/dash`.
Remote CI results remain unverified until those jobs execute; this does not
claim coverage for other shells or platforms.

## Prepare a ForgeFlow release

From a clean committed release candidate, run the local-only readiness gate:

```sh
make release-check
```

It composes `make verify` with deterministic local version, Git, worktree, and
tag checks. It does not inspect remotes, CI, or GitHub Releases, and it never
changes local tags or other repository state. Follow the human-authorized
[release runbook](docs/releasing.md) for exact-SHA remote verification and
publication.

## Current protocol scope

The current protocol version is recorded in the root [`VERSION`](VERSION) file.
Its compatibility guarantees and versioned surface are defined by the
[Protocol Versioning policy](protocol/versioning.md).

ForgeFlow is a declarative, manual protocol: Story and acceptance formats,
repository guidance, verification, lifecycle, and versioning contracts, a
reusable Story-development skill, executable TypeScript and Go examples, CI
support, a non-destructive bootstrap script, and a local release-readiness
check with a manual publication runbook. Repository Doctor is an optional
static diagnostic with explicitly authorized local verification. Optional
handoffs preserve immutable historical evidence, never current workflow state.

Multi-agent orchestration, workflow services, schedulers, agent runtimes,
dashboards, persistent workflow state, and language-model abstraction layers are
outside the current protocol scope.

## License

ForgeFlow is available under the [MIT License](LICENSE).
