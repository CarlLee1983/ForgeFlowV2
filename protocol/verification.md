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

Repository-adopted formatters, linters, type checkers, static analyzers, and
architecture checkers should be placed behind this same command when their
results are required for review readiness. Each check must be deterministic,
non-interactive, suitable for CI, and return a nonzero status on failure.
Mutating commands such as automatic formatting remain separate so verification
does not rewrite source files to obtain PASS.

ForgeFlow constrains the verification interface and its PASS/FAIL semantics,
not the tools behind it. It does not require a language, framework, formatter,
linter, type checker, architecture checker, test runner, CI provider, or an
additional Make target. Project-specific commands and setup remain in
repository tooling and documentation rather than in the ForgeFlow protocol.
`make verify` remains the only authoritative completion gate.

## Optional Doctor invocation

[Repository Doctor](../docs/doctor.md) does not define another verification
gate. Its default inspection is static and always reports verification as not
run. When a caller explicitly uses `--run-verify` for a trusted repository,
Doctor runs this same `make verify` command exactly once from the physical
repository root and reports its original exit status. That execution is not
read-only or sandboxed and can run repository code, write files, start
services, or use the network.

## Result

- Exit status `0` means **PASS**. The implementation is eligible for
  human product and architecture review.
- Any nonzero exit status means **FAIL**. Verification output must identify the
  failing check well enough to begin diagnosis.

PASS does not approve the product intent, waive human review, or merge the
change. FAIL cannot be reclassified by an agent.

Doctor's `STRUCTURE_OK` result is only a static structure result, while
`VERIFIED_LOCAL` is local automated evidence. Neither checks CI or merge policy
(both remain `NOT_CHECKED`), and neither replaces required human review or the
repository's own merge decision.

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
