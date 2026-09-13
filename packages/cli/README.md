# @forgeflow/cli

The ForgeFlow command-line interface shell. Invoke it through `forgeflow`.

```text
forgeflow [command]
```

`forgeflow`, `forgeflow help`, and `forgeflow --help` print help and exit zero.
`forgeflow version` and `forgeflow --version` print the package version and exit
zero. Migration commands are unavailable; every other argument sequence prints
the following one-line diagnostic to standard error and exits two:

```text
forgeflow: command unavailable; migration commands are not yet available. Run forgeflow --help.
```

## Machine results

The package root exports `serializeResultEnvelope(value)`. It validates through
`@forgeflow/core` and returns one compact JSON object followed by one newline,
with envelope and issue properties in the published contract order. Invalid
values throw Core's `ResultEnvelopeValidationError` before serialization.

This programmatic serializer does not add an executable command. Existing help,
version, and unavailable-command behavior remains unchanged.
