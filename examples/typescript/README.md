# TypeScript verification example

This small project demonstrates the ForgeFlow repository contract. Use pnpm 12
with Node.js 20.19+, 22.13+, or 24+, install its development dependencies once,
then run the canonical command:

```sh
pnpm install --frozen-lockfile
make verify
```

`make verify` checks formatting, linting, TypeScript types, order-total Story
traceability, and behavioral tests. The example domain is intentionally small;
the verification interface is the part intended for reuse.

TypeScript is an illustrative adapter: ForgeFlow does not require this
language, `node:test`, this directory layout, or this script implementation. The
portable pattern is to give each automated acceptance criterion a stable
identifier and put that identifier in its executable test.

The complete example Story is in
[`specs/stories/TYP-001-order-total`](specs/stories/TYP-001-order-total/).
Run its focused mapping check with:

```sh
make traceability
```

The check compares the acceptance IDs with the IDs at the start of single-line
`node:test` names. It rejects missing, duplicate, and unmapped IDs; it
intentionally uses only the narrow acceptance-list and TypeScript test-name
formats used by this example, not a general Markdown or TypeScript parser.
