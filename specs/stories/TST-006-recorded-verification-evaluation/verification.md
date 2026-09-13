# Verification Result: TST-006

Recorded after focused Core, CLI, parity, retained-shell, packed-package, and
whole-repository checks of this working tree. The Story declares high Risk and
medium Architecture impact, so the required profile is
`lint static unit integration contract e2e architecture`.

## Checks

* lint: pass — `make verify ran the root Prettier and zero-warning ESLint gates`
* static: pass — `make verify ran TypeScript type checking, shell syntax checks, Story discovery, execution-plan resolution, and Action syntax validation`
* unit: pass — `the complete make verify Node suite passed 161 tests, including the pure Core recorded-result evaluator, ordered diagnostics, status decision, declared-fact reporting, and acceptance-identity reading`
* integration: pass — `TST006-AC-001 through TST006-AC-005 exercised the built CLI --result command, record acquisition, discovery, the retained shell checker, the isolated differential harness, and the packed consumer; the package suites also passed on Node 20.19.5, 22.17.1, and 24.21.0`
* contract: pass — `the shared result corpus of passing, partial, failing, silent, malformed, missing-evidence, authority, and residual-risk cases agreed with the retained checker on recorded facts, per-Story status, ordered issues, aggregate result, and exit; the record normalizer rejected every unrecognized diagnostic and the harness self-check proved it detects a divergent record`
* e2e: pass — `make verify`
* architecture: pass — `independent Standards and Spec review of this working tree found two real parity defects, each fixed and covered by a new corpus case: the recorded status was trimmed with the JavaScript Unicode trim instead of the checker's carriage-return, tab, and space trim, and a symlinked verification.md suppressed the Story's resolved plan block and its plan issues; the reviewed duplication of the authority operations and verification layers was consolidated onto the plan module`

## Evidence

* `AC-001`: pass — `Core and CLI tests proved a complete record evaluates to PASS and that the CLI emits the exact documented human record block or one canonical newline-terminated JSON result with exit 0`
* `AC-002`: pass — `packages/cli/test/verification-parity.test.mjs compared the retained checker with runVerificationCheck across the result corpus; ./scripts/verification-check --result and the built CLI also produced byte-identical output and exits for this repository's own 37 Stories, both example Stories, and ten hand-built boundary records covering CRLF, repeated separators, empty labels, repeated sections, fenced examples, and sub-headings`
* `AC-003`: pass — `Core tests proved an unrecorded required check, a skipped, blocked, or unsupported observation, an acceptance criterion without passing evidence, and a wholly silent record each evaluate to PARTIAL or a record defect and never to PASS`
* `AC-004`: pass — `Core and CLI tests proved a recorded fail check, a recorded fail acceptance observation, and an ungranted used authority evaluate to FAIL, that malformed, repeated, unknown, and unreadable records evaluate to VERIFICATION_RESULT_INCOMPLETE, and that the five outcomes keep exits 0, 1, 1, 1, and 2`
* `AC-005`: pass — `an instrumented adapter test proved exactly three no-follow reads and no target mutation, the evaluator reported the recorded checks, traced count, used authority, and residual risks verbatim as observations, and a symlinked verification.md produced one configuration-error envelope with exit 2`
* `AC-006`: pass — `make verify exited zero; ./tests/execution-governance.sh and ./tests/typescript-tooling.sh passed; packed Core and CLI artifacts exposed and executed the new mode; git diff confirmed scripts/, protocol/, templates/, and tests/execution-governance.sh are unchanged`

## Authority Used

* plan
* modify
* commit

## Residual Risks

* `the configured GitHub Actions tooling matrix has not run remotely because this Story grants no push authority; all three supported runtime lines were covered locally by running the package suites on Node 20.19.5, 22.17.1, and 24.21.0`
* `the machine result envelope distinguishes PASS from the negative outcomes but cannot distinguish PARTIAL, FAIL, and VERIFICATION_RESULT_INCOMPLETE by status alone; those four names stay distinct in the command's reported outcome, its human output, and its issue codes, exactly as the retained checker reports them`
