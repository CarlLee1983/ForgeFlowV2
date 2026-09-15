# Issue tracker: GitHub

Issues and implementation tickets for this repository live in GitHub Issues for
`CarlLee1983/PraxisBound`. Use the authenticated `gh` CLI for all operations.

## Conventions

- Create, read, comment on, label, and close issues with `gh issue`.
- Infer the repository from the configured GitHub remote.
- Publish approved tickets in dependency order so blocker references use real
  issue numbers.
- Use GitHub native issue dependencies when available.
- If native dependencies are unavailable, include `Blocked by: #<issue>` in the
  issue body.
- Apply `ready-for-agent` only when the ticket is independently actionable.
- Do not close or modify a parent issue while publishing child tickets.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## When a skill says “publish to the issue tracker”

Create a GitHub issue in `CarlLee1983/PraxisBound`.

## When a skill says “fetch the relevant ticket”

Run `gh issue view <number> --comments` and include labels in the retrieved
metadata.
