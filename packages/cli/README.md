# @forgeflow/cli

The ForgeFlow command-line interface shell. Invoke it through `forgeflow`.

```text
forgeflow [command]
```

`forgeflow`, `forgeflow help`, and `forgeflow --help` print help and exit zero.
`forgeflow version` and `forgeflow --version` print the package version and exit
zero. The first migrated domain command checks immutable Handoff evidence:

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

Other migration commands are unavailable; every other argument sequence prints
the following one-line diagnostic to standard error and exits two:

```text
forgeflow: command unavailable; migration commands are not yet available. Run forgeflow --help.
```

## Machine results

The package root exports `serializeResultEnvelope(value)`. It validates through
`@forgeflow/core` and returns one compact JSON object followed by one newline,
with envelope and issue properties in the published contract order. Invalid
values throw Core's `ResultEnvelopeValidationError` before serialization.

The Handoff command uses this serializer for `--json`. The package root remains
limited to this programmatic serializer; filesystem adaptation and human
rendering are executable internals.
