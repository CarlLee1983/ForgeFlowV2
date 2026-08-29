# Repository Doctor

ForgeFlow Repository Doctor is an optional diagnostic command for a repository
that adopts ForgeFlow. It checks the small required repository surface without
changing the target, and can run the repository's canonical gate only when the
caller explicitly authorizes that execution.

Doctor is not an installer, repair tool, global CLI framework, or merge gate.
Existing ForgeFlow adopters do not need to install or run it.

## Command forms

Run Doctor from a ForgeFlow checkout in one of these three forms:

```sh
./scripts/doctor [repository-directory]
./scripts/doctor --run-verify [repository-directory]
./scripts/doctor --help
```

The repository directory defaults to the current directory. `--run-verify` is
an optional leading flag; other option placements, unknown options, and excess
arguments are invalid. `--help` prints usage and exits successfully.

## Static structure check

Without `--run-verify`, Doctor performs a static, read-only check. It does not
run `make`, Make targets, repository code, shell configuration, network
requests, dependency or Skill installation, or Git mutations. It does not
create, replace, or repair repository files.

The only required paths are:

```text
AGENTS.md             # readable and non-blank regular file
specs/stories/        # readable directory
Makefile              # readable and non-blank regular file
```

`specs/stories/_template/`, a Story's `task.md`, Skills, and CI configuration
are optional, and `specs/stories/` may be empty immediately after bootstrap.
Bootstrap can install the guide and Story template, but each repository still
owns its `Makefile` and its verification implementation. Bootstrap success
means only that its managed files were installed; it is not Doctor success or
verification success.

Doctor resolves a requested repository-root symlink to its physical directory.
It does not follow a symlink at a required path inside that root: `AGENTS.md`,
`specs/`, `specs/stories/`, or `Makefile` produces `ERROR`, because that
required structure cannot be safely confirmed.

This refusal is a local diagnostic boundary, not protection against an
actively hostile process replacing paths concurrently. Run Doctor while you
control the target repository and its paths are stable.

Doctor performs only a deliberately limited Makefile text scan. A literal
`verify:` rule is a clue, not proof that verification is available or would
succeed. Comments, `.PHONY` declarations, and documentation text mentioning
`verify` do not count as a rule; neither do continued assignment text or
`define` bodies. `include` directives, continuations, definitions, and dynamic
target syntax remain `UNCONFIRMED`; an unconfirmed result never proves that
`make verify` is absent. Static mode always reports
`Verification: NOT_RUN`.

## Explicit local verification

Use execution mode only for a repository you trust:

```sh
./scripts/doctor --run-verify /path/to/repository
```

After Doctor safely confirms the required structure and finds `make`, it calls
the repository-owned canonical command exactly once from the physical
repository root:

```sh
make verify
```

This mode executes repository-owned code. It is neither read-only nor sandboxed
and may write files, start services, or use the network. Doctor streams the
command's output, does not retry or repair it, and reports the original Make
exit status.

## Results and decision boundaries

Doctor uses these process exit codes:

| Exit | Meaning |
| --- | --- |
| `0` | Help completed, required structure is complete in static mode, or explicitly run local verification passed. |
| `1` | Required structure is confirmed incomplete, or explicitly run local verification failed. |
| `2` | Invocation or repository-root error, a required path is unreadable or symlinked, `make` is unavailable in execution mode, or Doctor cannot safely confirm required structure. |

When both incomplete structure and an unconfirmable error are found, `2` takes
precedence over `1`.

The result labels distinguish `STRUCTURE_OK`, `STRUCTURE_INCOMPLETE`,
`VERIFIED_LOCAL`, `VERIFICATION_FAILED`, and `ERROR`. In all Doctor outcomes,
CI and merge policy remain `NOT_CHECKED`.

| Evidence | What it means | What it does not mean |
| --- | --- | --- |
| Bootstrap success | The managed guide and Story-template files were installed. | The adopter-owned gate exists or adoption is complete. |
| `STRUCTURE_OK` | Doctor could confirm the three required structural paths. | `make verify`, CI, or human review passed. |
| `VERIFIED_LOCAL` | The repository-configured automated gate returned zero in that local execution. | CI passed, the tests are sufficient, or the change may merge. |
| Human review | A person evaluates requirements, design, and test sufficiency. | Repository merge policy has automatically been satisfied. |
| Merge decision | The repository's own policy permits the reviewed change to merge. | Doctor made or automated that decision. |

Human review is always still required, and Doctor never authorizes a merge.

For the canonical verification and repair-loop contract, see the
[Verification Contract](../protocol/verification.md). For the adoption surface,
see the [Repository Contract](../protocol/repository-contract.md).
