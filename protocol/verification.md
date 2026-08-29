# Verification Contract

ForgeFlow repositories expose one canonical command at the repository root:

```sh
make verify
```

This command is the deterministic authority on whether implementation is ready
for human review.

## Repository responsibility

Each repository owns the contents of `make verify`. It must execute
every automated check the repository requires for review readiness, in a
repeatable and non-interactive way. Depending on the technology and risk, those
checks can include:

- formatting checks
- linting
- static type or architecture checks
- unit, integration, and acceptance tests
- generated-file or schema consistency checks

ForgeFlow does not require a language, framework, test runner, or CI provider.
Project-specific commands and setup remain in repository tooling and
documentation rather than in the ForgeFlow protocol.

## Result

- Exit status `0` means **PASS**. The implementation is eligible for
  human product and architecture review.
- Any nonzero exit status means **FAIL**. Verification output must identify the
  failing check well enough to begin diagnosis.

PASS does not approve the product intent, waive human review, or merge the
change. FAIL cannot be reclassified by an agent.

## Repair loop

On FAIL, the implementing agent:

1. reads the failing check and diagnoses its root cause;
2. returns to implementation and repairs the code or tests;
3. preserves the approved Story and acceptance criteria;
4. runs `make verify` again.

The loop ends only with PASS or a genuine specification blocker that requires a
human decision. Story-specific verification notes may describe setup or useful
focused checks, but they do not replace the canonical command.

## Continuous integration

CI should call `make verify` rather than maintain a second definition
of review readiness. Local agents and CI then evaluate the same contract, while
the repository remains free to evolve the checks behind it.
