# Domain Docs

These engineering skills consume this repository's domain documentation as a
single context.

## Before exploring

- Read `CONTEXT.md` at the repository root.
- Read relevant ADRs under `specs/decisions/`.
- Read only the Protocol guidance selected through `guidance/ENTRY.md`.
- If an artifact is absent, proceed silently.

## Vocabulary

Use terms exactly as defined in `CONTEXT.md`. Do not replace terms with synonyms
listed under `_Avoid_`.

## Architecture decisions

Surface conflicts with existing ADRs explicitly. Do not silently override an
accepted or proposed decision.

## Layout

```text
/
├── CONTEXT.md
├── specs/
│   └── decisions/
└── guidance/
```

A future workspace with `packages/` does not by itself require multi-context
documentation. Introduce `CONTEXT-MAP.md` only if distinct domain contexts
actually emerge.
