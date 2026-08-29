# Repository Contract

A repository adopts ForgeFlow by exposing stable places for intent, agent
guidance, and deterministic verification. The contract is independent of
language, framework, AI vendor, and CI provider.

## Required surface

An adopting repository provides:

```text
AGENTS.md
Makefile                  # exposes: make verify
specs/
└── stories/
    └── <story-id>/
        ├── story.md
        ├── acceptance.md
        └── task.md        # optional
```

- `AGENTS.md` tells coding agents to follow the Story, preserve scope,
  test changed behavior, and use the canonical gate.
- `specs/stories/` stores approved intent and acceptance criteria.
- `make verify` runs every automated check required before human review.

The [bootstrap script](../scripts/bootstrap) installs the agent guide and Story
templates. Each repository still owns its Makefile and technology-specific
setup.

## Optional Repository Doctor

[Repository Doctor](../docs/doctor.md) is an optional ForgeFlow command for
inspecting an adoption. In its default static mode, it performs read-only checks
of only a readable non-blank `AGENTS.md`, readable `specs/stories/`, and
readable non-blank `Makefile`; it does not run `make`, target code, network
operations, dependency installation, or Git mutations. It does not require a
first Story, `_template/`, `task.md`, Skills, or CI configuration.

With explicit `--run-verify` authorization and only for a trusted repository,
Doctor invokes the repository-owned `make verify` once from the resolved
physical root. That mode is not read-only or sandboxed. Doctor does not change
this adoption contract, create an alternative verification command, or become
mandatory for existing adopters.

## Verification ownership

The repository decides which checks belong behind `make verify` and
keeps that command authoritative as the codebase evolves. Local development and
CI call the same command. Story-specific commands may accelerate feedback, but
cannot redefine PASS.

See [the Verification Contract](verification.md) for exit status and repair-loop
semantics.

## Requirement precedence

For implementation work:

1. approved `story.md` and `acceptance.md` define product
   intent;
2. repository guidance and architecture define local engineering constraints;
3. repository tooling determines automated PASS or FAIL;
4. human review decides whether verified work satisfies intent and may merge.

When these sources conflict, stop at the smallest unresolved intent decision
instead of silently changing requirements or bypassing verification.

## Portability boundary

ForgeFlow does not require an agent runtime, workflow service, task scheduler,
database, dashboard, prompt format, or LLM abstraction. Repositories may add
their own tools, but adoption depends only on files, Make, and existing
development and CI systems.
