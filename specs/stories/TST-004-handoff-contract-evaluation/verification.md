# Verification Result: TST-004

Recorded after focused Core, CLI, parity, retained-shell, packed-package, and
supported-runtime checks, the complete root gate, and independent Sol/high
review of this working tree. The Story declares high Risk and high Architecture
impact, so the required profile is `lint static unit integration contract e2e
architecture`.

## Checks

* lint: pass — `make verify ran the root Prettier and zero-warning ESLint gates`
* static: pass — `make verify ran TypeScript type checking, shell syntax checks, Story discovery, execution-plan resolution, and Action syntax validation; git diff --check also passed`
* unit: pass — `the complete make verify Node suite passed 89 tests, including pure Core evaluation, stable ordered diagnostics, immutable evidence, acquisition mapping, renderer, and argument cases`
* integration: pass — `TST004-AC-001 through TST004-AC-005 exercised the built CLI command, filesystem adapter, retained shell checker, isolated differential harness, and packed consumer; built parity tests also passed on Node 20.19, local Node 22.17.1, and Node 24`
* contract: pass — `the exact 16-case shared Story-ID corpus, nine fixed Handoff lexical families, and the generated Handoff lexical corpus agreed on semantic results, ordered issues, evidence, and exits; the legacy normalizer rejected every unrecognized diagnostic`
* e2e: pass — `make verify`
* architecture: pass — `independent Sol/high review found no unresolved material issue after preserving parse diagnostics on structural failures, using one no-follow nonblocking revalidated file handle, routing parity through the CLI command seam, pinning fixture expectations, and keeping the intentionally unclosed fixture outside Markdown formatting`

## Evidence

* `AC-001`: pass — `Core and CLI tests proved complete LF and CRLF evidence returns pass/success/0 with six frozen evidence values, exact human output, and one canonical newline-terminated JSON result`
* `AC-002`: pass — `TST004-AC-002 compared the retained checker with runHandoffCheck across the exact shared Story-ID corpus, fixed lexical fixtures, and generated restricted-YAML cases, including combined syntax and structural failures`
* `AC-003`: pass — `Core tests proved missing, repeated, unknown, forbidden, malformed, unsupported, embedded-break, and structural inputs return fail/failure/1 with stable encounter-ordered issues`
* `AC-004`: pass — `CLI black-box tests proved invalid arguments and symlinked, missing, directory, unreadable, empty, and read-failure sources each produce one valid usage- or configuration-error envelope with exit 2`
* `AC-005`: pass — `instrumented adapter tests proved one read from a no-follow nonblocking handle revalidated as regular before use, and production-source checks found no target-write or child-process API`
* `AC-006`: pass — `make verify exited zero; ./tests/handoff-check.sh and ./tests/typescript-tooling.sh passed; packed Core and CLI artifacts exposed and executed the new command; supported Node 20.19, 22.17.1, and 24 runtime parity checks passed; git diff confirmed scripts/handoff-check, tests/handoff-check.sh, scripts/doctor, protocol/, and templates/ are unchanged`

## Authority Used

* plan
* modify

## Residual Risks

* `the configured Node 20.19.0, 22.13.0, and 24 GitHub Actions tooling matrix has not run remotely because this working tree was not committed or pushed; local built parity tests covered all three supported runtime lines, and local Node 22.17.1 covered the complete tooling and repository gates`
