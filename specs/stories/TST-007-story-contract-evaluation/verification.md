# Verification Result: TST-007

Recorded after focused Core, CLI, parity, retained-shell, packed-package, and
whole-repository checks of this working tree. The Story declares high Risk and
medium Architecture impact, so the required profile is
`lint static unit integration contract e2e architecture`.

## Checks

* lint: pass — `make verify ran the root Prettier and zero-warning ESLint gates`
* static: pass — `make verify ran TypeScript type checking, shell syntax checks, Story discovery, execution-plan resolution, and Action syntax validation`
* unit: pass — `the complete make verify Node suite passed 195 tests, including the pure Core Story contract evaluator, the Story ID grammar, the governance, risk, and risk-contract readers, the security fixture matrix reader, decision resolution, and ordered diagnostics`
* integration: pass — `TST007-AC-001 through TST007-AC-005 exercised the built CLI story check command, read-only Story acquisition, lexical discovery, configurable decision roots, the retained shell checker, the isolated differential harness, and the packed consumer; the package suites also passed on Node 20.19.5, 22.17.1, and 24.21.0`
* contract: pass — `the shared default corpus of identity, classification, task-mode, authority, architecture, decision, risk, risk-contract, matrix, conditional-section, list-expansion, and hostile-boundary cases agreed with the retained checker on resolved facts, ordered issues, aggregate result, and exit; ./scripts/story-check and the built CLI also produced byte-identical stdout, stderr, and exit status for this repository's 38 Stories, both example Stories, discovery mode, and 21 hand-built operational-error and discovery boundaries; the diagnostic normalizer rejected every unrecognized message and the harness self-check proved it detects a divergent Story`
* e2e: pass — `make verify`
* architecture: pass — `an independent review of this working tree found four real divergences, each fixed and each covered by a new parity case: exactness was tested with the Unicode /\S/ class rather than the C-locale [:space:] subset the comparison pins the checker to, so a non-breaking space inverted every literal judgement; a repeated risk-contract section returned before its bullets were scanned and swallowed their diagnostics; a usage error rendered no diagnostic and wrongly printed the banner; and a decision record's Status was read with the forgiving section scanner instead of the strict declaration reader. The strict reader is now shared by Classification and decision status rather than duplicated, and the Story ID grammar duplicated in handoff.ts was consolidated onto one module`

## Evidence

* `AC-001`: pass — `Core and CLI tests proved a complete Story evaluates to STORY_CONTRACT_OK and that the CLI emits the exact documented human block or one canonical newline-terminated JSON result with exit 0`
* `AC-002`: pass — `packages/cli/test/story-parity.test.mjs compared the retained checker with runStoryCheck across the default corpus; a generated sweep of 99 malformed fixtures and the repository's own 40 Stories also agreed on every ordered issue`
* `AC-003`: pass — `Core tests proved the Story ID is the shortest leading run of segments so a slug is never absorbed, that an invalid classification suppresses the matrix, trust-boundary, and superseded checks, and that authority defaults follow task mode with no grant implying the next`
* `AC-004`: pass — `Core tests proved every decision status outcome across both task-mode gates, that missing, ambiguous, unreadable, and statusless records are distinct defects, that a malformed ID is never resolved, and that the reported decisions equal what readStoryDecisions hands the caller; CLI tests proved resolution under both the default decision root and FORGEFLOW_DECISIONS_ROOT`
* `AC-005`: pass — `explicit and lexical order were asserted directly, fenced examples and hostile boundaries were compared against the retained checker, an instrumented adapter proved the lstat, open, stat, close sequence with O_NOFOLLOW and no write flag, a directory snapshot proved no target entry, content, or mtime changed, and a source check proved the production modules name no child-process or write API and that Core names no ambient filesystem, process, clock, or randomness`
* `AC-006`: pass — `make verify exited zero; ./tests/story-check.sh and ./tests/typescript-tooling.sh passed; packed Core and CLI artifacts exposed and executed the new command; git diff confirmed scripts/, protocol/, templates/, and the retained acceptance suites are unchanged`

## Authority Used

* plan
* modify
* commit

## Residual Risks

* `the configured GitHub Actions tooling matrix has not run remotely because this Story grants no push authority; all three supported runtime lines were covered locally by running the package suites on Node 20.19.5, 22.17.1, and 24.21.0`
* `the retained checker expands its decision and risk-reason lists through unquoted shell word splitting, which also applies pathname expansion. The word splitting is reproduced exactly; the pathname expansion is not, because it would make a pure evaluation depend on the working directory. The two diverge only for a declared value that happens to match a real path relative to the invocation directory`
* `discovery order is the retained checker's glob collation, which is byte order only under LC_ALL=C. The comparison pins that locale and the Story requires determinism rather than a specific collation, so a non-C locale can order the two differently without either being wrong`
