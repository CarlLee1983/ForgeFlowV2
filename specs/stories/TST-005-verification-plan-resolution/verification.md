# Verification Result: TST-005

Recorded after focused Core, CLI, parity, retained-shell, packed-package, and
whole-repository checks plus independent Standards and Spec review of this
working tree. The Story declares high Risk and high Architecture impact, so the
required profile is `lint static unit integration contract e2e architecture`.

## Checks

* lint: pass — `make verify ran the root Prettier and zero-warning ESLint gates`
* static: pass — `make verify ran TypeScript type checking, shell syntax checks, Story discovery, execution-plan resolution, and Action syntax validation`
* unit: pass — `the complete make verify Node suite passed 132 tests, including pure Core plan resolution, ordered diagnostics, default fallbacks, acquisition mapping, renderer, and argument cases`
* integration: pass — `TST005-AC-001 through TST005-AC-005 exercised the built CLI command, Story acquisition adapter, discovery, retained shell checker, isolated differential harness, and the packed consumer`
* contract: pass — `the shared plan corpus of default, task-mode, authority, architecture, risk, profile, and layout cases agreed with the retained checker on resolved plan, ordered issues, result, and exit; the legacy normalizer rejected every unrecognized diagnostic and the harness self-check proved it detects a divergent plan`
* e2e: pass — `make verify`
* architecture: pass — `independent Standards and Spec review of this working tree found three real defects, each fixed and covered by a new test: the machine result dropped plan issues whenever any Story failed acquisition, human output emitted every FAIL line before every plan block instead of interleaving per Story, and discovery admitted dot-directories the retained glob never matches; the reviewed consolidation of Handoff acquisition onto the shared read-only reader was kept deliberately and is behaviour-neutral`

## Evidence

* `AC-001`: pass — `Core and CLI tests proved an undeclared Story resolves execution/plan+modify/low/low/lint static unit and a fully declared Story resolves its declarations, with exact human output and one canonical newline-terminated JSON result`
* `AC-002`: pass — `packages/cli/test/verification-parity.test.mjs compared the retained checker with runVerificationCheck across the plan corpus; ./scripts/verification-check and the built CLI also produced byte-identical output for this repository's own 34 Stories and both example Stories`
* `AC-003`: pass — `Core tests proved malformed, repeated, and unknown task mode, authority, architecture, and risk declarations return fail/failure/1 with stable encounter-ordered issues, and that a non-string source is a typed failure rather than a thrown exception`
* `AC-004`: pass — `CLI black-box tests proved invalid arguments and missing directories, missing, symlinked, empty, and unreadable required Story files, and a run that checks no Story each produce one valid usage- or configuration-error envelope with exit 2`
* `AC-005`: pass — `instrumented adapter tests proved one no-follow nonblocking handle revalidated as regular before use and exactly the two required Story reads; production-source checks found no target-write or child-process API; package-root tests pinned the public surface and proved the declaration reader is not exported`
* `AC-006`: pass — `make verify exited zero; ./tests/execution-governance.sh and ./tests/typescript-tooling.sh passed; packed Core and CLI artifacts exposed and executed the new command; git diff confirmed scripts/, protocol/, templates/, and tests/execution-governance.sh are unchanged`

## Authority Used

* plan
* modify
* commit

## Residual Risks

* `the configured Node 20.19.0, 22.13.0, and 24 GitHub Actions tooling matrix has not run remotely for this change; local Node 22.17.1 covered the complete tooling and repository gates`
* `--result mode remains unimplemented in the TypeScript CLI by design, so verification.md evaluation is still available only through the retained shell checker until TST-006`
* `Story discovery orders by byte value, matching a C-locale glob; the retained checker follows the caller's LC_COLLATE, so a repository whose Story directory names differ only by case or punctuation could order the two implementations' output differently without changing any resolved value, issue, or exit`
