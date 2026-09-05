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
├── .forgeflow-adoption
└── stories/
    └── _template/
        ├── story.md
        ├── acceptance.md
        └── task.md
```

`specs/.forgeflow-adoption` records the protocol version and ForgeFlow revision
this snapshot came from. It is what a later `--upgrade` reads; see
[Upgrading an adopting repository](upgrading.md).

The script refuses to replace any managed file. Review conflicts manually; use
`--force` only when replacing those exact files is intentional.

Preview the same static safety and conflict checks without changing the target:

```sh
./scripts/bootstrap --dry-run /path/to/repository
./scripts/bootstrap --force --dry-run /path/to/repository
```

`--upgrade` moves an existing adoption to newer Story templates without writing
`AGENTS.md`; it is documented in
[Upgrading an adopting repository](upgrading.md) and is mutually exclusive with
`--force`.

`--force` and `--dry-run` may appear in either order before the optional target,
but each flag may appear only once. A dry run reports the files it would install
or replace and exits nonzero for the same static refusals as a real install. It
does not create directories, staging paths, files, or links; a later real run
can still fail if the filesystem changes concurrently.

Run bootstrap only while you control the target repository and no other process
is concurrently replacing its paths. The portable shell script rejects managed
directory and file symlinks and uses single-file atomic replacement plus
[cross-file failure recovery](upgrading.md#failure-recovery). This is not an
atomic installation transaction or a sandbox for an actively hostile,
concurrently mutated filesystem.

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

The repository owns its tools and rule severity. Verification should use
non-mutating check modes; keep commands that rewrite files, such as `format`,
separate from `make verify`. Repair a failing check rather than disabling or
weakening it merely to obtain PASS. See [Code Quality](code-quality.md) for the
automated and Human Review boundaries.

## 4. Create and approve a Story

Copy the template to a Story directory:

```sh
cp -R specs/stories/_template specs/stories/ORD-123-refund-order
```

Complete `story.md` and `acceptance.md`. A human approves
the Goal, scope, rules, expected errors, and acceptance criteria before the Story
enters READY.

Declare the Story's `## Classification`. When it is security sensitive, state the
required redaction, rejection, and persistence cases as a
[security fixture matrix](../protocol/story.md) with exact payloads instead of
prose; when it changes baseline behavior, name the tests it supersedes. Check the
declaration before implementation starts:

```sh
./scripts/story-check specs/stories/ORD-123-refund-order
```

See [Contract checks](contract-checks.md) for the result and exit semantics.

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

## 7. Hand the work over

When the work changes hands, record the state in a handoff so the next human or
agent does not have to infer it:

```sh
cp /path/to/forgeflow/templates/handoff.md specs/handoff.md
./scripts/handoff-check specs/handoff.md
```

The [Handoff Contract](../protocol/handoff.md) requires exactly one current
Story, exactly one next Story, the repository baseline, and the last
verification result.

## 8. Review and merge

A human reviews the verified implementation for product intent and architecture,
then follows the repository's normal merge policy. Automated PASS makes work
eligible for review; it does not approve or merge it.

Use the [Human Review guidance](human-review.md) for contextual review questions
and outcomes. If review requests an implementation change, run the complete
`make verify` again before returning to review. An agent or LLM may prepare
evidence, but only a human can accept the review. Review also checks that Story
Classification matches the real implementation and that the PASS still applies
to the exact implementation under review.

## CI

Copy [the GitHub Actions template](../templates/ci/github-actions.yml) into the
target repository and add its toolchain/dependency setup steps. Keep the final
verification step as `make verify` so local and CI completion use the
same contract.

The workflow runs the check but does not make it mandatory for merging. A
repository administrator must separately configure the matching required
status check or ruleset in GitHub.

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
