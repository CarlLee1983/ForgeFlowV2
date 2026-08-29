# Getting Started

ForgeFlow can be added to an existing repository without installing an agent
runtime or changing its programming language.

## 1. Bootstrap the repository

From a ForgeFlow checkout, run:

```sh
./scripts/bootstrap /path/to/repository
```

This creates:

```text
AGENTS.md
specs/
└── stories/
    └── _template/
        ├── story.md
        ├── acceptance.md
        └── task.md
```

The script refuses to replace any managed file. Review conflicts manually; use
`--force` only when replacing those exact files is intentional.

Preview the same static safety and conflict checks without changing the target:

```sh
./scripts/bootstrap --dry-run /path/to/repository
./scripts/bootstrap --force --dry-run /path/to/repository
```

`--force` and `--dry-run` may appear in either order before the optional target,
but each flag may appear only once. A dry run reports the files it would install
or replace and exits nonzero for the same static refusals as a real install. It
does not create directories, staging paths, files, or links; a later real run
can still fail if the filesystem changes concurrently.

Run bootstrap only while you control the target repository and no other process
is concurrently replacing its paths. The portable shell script rejects managed
directory and file symlinks and replaces files atomically, but it is not a
sandbox for an actively hostile, concurrently mutated filesystem.

Bootstrap success means only that the managed guide and Story-template files
were installed. Bootstrap intentionally does not create a repository-owned
`Makefile`, call Doctor, run `make verify`, review the result, or authorize a
merge.

## 2. Inspect the adopted structure (optional)

From a ForgeFlow checkout, Doctor can confirm the static required structure
without changing the target:

```sh
./scripts/doctor /path/to/repository
```

Immediately after a fresh bootstrap into an otherwise empty directory, this
command is expected to report the missing `Makefile` and exit `1`. Define the
repository gate in the next step, then run Doctor again.

It requires only a readable non-blank `AGENTS.md`, readable `specs/stories/`,
and readable non-blank `Makefile`. Story templates, `task.md`, Skills, and CI
are optional. A static success does not execute `make verify`, check CI or
merge policy, or replace human review.

For a repository you trust, explicitly run its canonical gate once:

```sh
./scripts/doctor --run-verify /path/to/repository
```

This mode executes repository-owned code and is neither read-only nor
sandboxed; it may write files, start services, or use the network. Read
[Repository Doctor](doctor.md) for all command forms and result semantics.

## 3. Define the repository gate

At the target repository root, provide a Makefile target named
`verify`:

```make
.PHONY: verify

verify:
	./repository-specific-verification
```

Replace the example command with the repository's format, lint, type,
architecture, unit, integration, and acceptance checks. Keep
`make verify` as the single review-readiness interface.

## 4. Create and approve a Story

Copy the template to a Story directory:

```sh
cp -R specs/stories/_template specs/stories/ORD-123-refund-order
```

Complete `story.md` and `acceptance.md`. A human approves
the Goal, scope, rules, expected errors, and acceptance criteria before the Story
enters READY.

## 5. Implement with an agent

Give any coding agent a bounded request:

```text
Implement Story ORD-123. Follow AGENTS.md and run make verify.
```

The agent reads the Story, inspects the repository, implements the smallest
coherent change, adds tests, and runs the canonical gate.

## 6. Verify and repair

```sh
make verify
```

On FAIL, diagnose the output, repair the root cause, and run the same command
again. Preserve the Story and acceptance criteria. On PASS, produce the delivery
report required by `AGENTS.md`.

## 7. Review and merge

A human reviews the verified implementation for product intent and architecture,
then follows the repository's normal merge policy. Automated PASS makes work
eligible for review; it does not approve or merge it.

## CI

Copy [the GitHub Actions template](../templates/ci/github-actions.yml) into the
target repository and add its toolchain/dependency setup steps. Keep the final
verification step as `make verify` so local and CI completion use the
same contract.

## Validate the included examples

TypeScript with pnpm 12:

```sh
pnpm --dir examples/typescript install --frozen-lockfile
make -C examples/typescript verify
```

Go:

```sh
go -C examples/go mod download
make -C examples/go verify
```

To validate the ForgeFlow repository itself after dependencies are installed,
run `make verify` from its root.
