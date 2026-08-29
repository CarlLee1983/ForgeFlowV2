# TypeScript verification example

This small project demonstrates the ForgeFlow repository contract. Use pnpm 12
with Node.js 20.19+, 22.13+, or 24+, install its development dependencies once,
then run the canonical command:

```sh
pnpm install --frozen-lockfile
make verify
```

`make verify` checks formatting, linting, TypeScript types, and
behavioral tests. The example domain is intentionally small; the verification
interface is the part intended for reuse.
