# ForgeFlow

ForgeFlow is an agent-agnostic development protocol for AI-assisted engineering.
It turns approved human intent into a bounded Story, makes repository tooling the
authority on completion, and sends only verified work to human review.

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
- `task.md` may track implementation progress, but it is not a source of
  product requirements.

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

The protocol is split into four small contracts:

- [Story](protocol/story.md)
- [Verification](protocol/verification.md)
- [Lifecycle](protocol/lifecycle.md)
- [Repository adoption](protocol/repository-contract.md)

## Adopt ForgeFlow in a repository

Run the bootstrap script with the repository directory:

```sh
./scripts/bootstrap /path/to/repository
```

It installs:

```text
AGENTS.md
specs/
└── stories/
    └── _template/
        ├── story.md
        ├── acceptance.md
        └── task.md
```

The script refuses to overwrite any managed file. If replacing those exact
files is intentional, pass `--force` explicitly:

```sh
./scripts/bootstrap --force /path/to/repository
```

Copy `specs/stories/_template` to a directory named for the Story, fill
in the requirements, and ask an agent to implement that Story ID.

The full manual flow is documented in
[Getting Started](docs/getting-started.md), with rationale in
[ForgeFlow Concepts](docs/concepts.md).

## TypeScript example

The example in `examples/typescript` uses pnpm 12 and demonstrates a
repository-owned verification pipeline:

```sh
cd examples/typescript
pnpm install --frozen-lockfile
make verify
```

Its `make verify` runs formatting, linting, static type checking, and
tests through one deterministic entry point.

## Go example

The example in `examples/go` demonstrates the same contract with Go:

```sh
go -C examples/go mod download
make -C examples/go verify
```

Its gate checks formatting, `go vet`, Staticcheck, and tests.

## Verify this repository

Install the example's locked development dependencies, then run ForgeFlow's own
canonical verification command from the repository root:

```sh
pnpm --dir examples/typescript install --frozen-lockfile
make verify
```

The root command checks required protocol artifacts and bootstrap behavior,
then delegates to both example repositories.

## Version 0.1

ForgeFlow v0.1 is a declarative, manual protocol: Story and acceptance formats,
repository guidance, verification and lifecycle contracts, a reusable
Story-development skill, TypeScript and Go examples, a CI template, and a
non-destructive bootstrap script.

Multi-agent orchestration, workflow services, schedulers, agent runtimes,
dashboards, persistent workflow state, and language-model abstraction layers are
outside this slice.

## License

ForgeFlow is available under the [MIT License](LICENSE).
