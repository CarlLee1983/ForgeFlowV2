# @forgeflow/cli

The ForgeFlow command-line interface shell. Invoke it through `forgeflow`.

```text
forgeflow [command]
```

`forgeflow`, `forgeflow help`, and `forgeflow --help` print help and exit zero.
`forgeflow version` and `forgeflow --version` print the package version and exit
zero. The first migrated domain command checks immutable Handoff evidence:

`forgeflow init [--force | --upgrade] [--dry-run] [--json] [repository-directory]`
plans or applies an offline initialization from the Protocol snapshot bundled
in the CLI package. Safe mode refuses managed conflicts; force covers the exact
fresh managed surface; upgrade covers templates and the marker only. Apply
revalidates its content-addressed plan, prepares private sibling stages, writes
the marker last, and reverse-recovers detected failures. `--dry-run` performs
no target writes, staging, or recovery. Init never uses the network or prompts.

The Handoff command checks immutable evidence:

```text
forgeflow handoff check [--json] [handoff-file]
```

The path defaults to `specs/handoff.md`. Human mode preserves the Handoff
contract result names and exits `0` for complete evidence, `1` for an incomplete
contract, and `2` for invalid arguments or an unavailable source. `--json`
reserves standard output for exactly one canonical result envelope and emits no
human diagnostic. The command reads one regular non-symlink file and performs
no target write, verification command, Git lookup, clock check, or lifecycle
inference.

The static Repository Doctor is available through:

```text
forgeflow doctor [--json] [repository-directory]
```

It observes required Repository Contract paths, optional capabilities, marker
drift, limited Makefile clues, and static Story/Handoff results. It never
executes target-owned code or writes a target. `STRUCTURE_OK` and advisory
`CONTRACT_DRIFT` exit `0`; structural incompleteness exits `1`; unsafe or
unconfirmable acquisition exits `2`.

Canonical verification is available through:

```text
forgeflow verify [--json] [repository-directory]
```

It resolves a trusted target's physical root and invokes its `make verify`
target exactly once. This command and `forgeflow doctor --run-verify` execute
repository-owned code, are not read-only or sandboxed, and may write files,
start services, or use the network. JSON mode reserves stdout for one result
envelope; child output is forwarded to standard error.

The second migrated domain command resolves declared verification plans:

```text
forgeflow verification check [--json] [story-directory ...]
```

Without a Story directory it checks every directory under `specs/stories/`
except `_template/`, relative to the current directory. It resolves the task
mode, authority, risk level, architecture impact, and required verification
profile each Story declares, applying the documented defaults for a Story that
declares nothing. It exits `0` for a resolved plan, `1` for a malformed,
repeated, or unknown declaration, and `2` for invalid arguments or a Story it
cannot acquire safely. It reads only `story.md` and `acceptance.md` from each
Story, never evaluates a recorded result, and never executes a declared
verification command.

Local release readiness is available through:

```text
forgeflow release check [--json] [repository-directory]
```

It resolves the selected directory physically and accepts only a Git worktree
root. The command observes local `HEAD`, index, committed and working
`VERSION`, worktree status, and local tags twice, then reports `RELEASE_READY`
or `RELEASE_INCOMPLETE`. It never fetches, contacts a remote, runs hooks, or
changes the candidate. Every handled result records
`data.remoteChecks: "not-performed"`; JSON writes one canonical envelope to
stdout and human mode renders the same typed result.

Unavailable commands print the following one-line diagnostic to standard error
and exit two:

```text
forgeflow: command unavailable; this command is not available. Run forgeflow --help.
```

## Machine results

The package root exports `serializeResultEnvelope(value)`. It validates through
`@forgeflow/core` and returns one compact JSON object followed by one newline,
with envelope and issue properties in the published contract order. Invalid
values throw Core's `ResultEnvelopeValidationError` before serialization.

Both domain commands use this serializer for `--json`. The package root remains
limited to this programmatic serializer; filesystem adaptation and human
rendering are executable internals.
