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

See [the verification contract](protocol/verification.md) for the normative
command behavior.

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

## Verify this repository

Install the example's locked development dependencies, then run ForgeFlow's own
canonical verification command from the repository root:

```sh
pnpm --dir examples/typescript install --frozen-lockfile
make verify
```

The root command checks bootstrap syntax and behavior, then delegates to the
TypeScript example's `make verify`.

## Initial slice

This repository currently contains the first ForgeFlow v0.1 implementation
slice: the core explanation, Story templates, repository agent guide,
Story-development skill, verification contract, TypeScript example, and
non-destructive bootstrap script.

Multi-agent orchestration, workflow services, schedulers, agent runtimes,
dashboards, persistent workflow state, and language-model abstraction layers are
outside this slice.
