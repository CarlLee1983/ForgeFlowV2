# Verification Result: TST-015

## Checks

* lint: pass — `make verify`
* static: pass — `make verify`
* unit: pass — `make verify (324 tests passed)`
* integration: pass — `make verify; tests/typescript-tooling.sh passed`
* contract: pass — `make verify; story-check --ready and verification-check plan passed`
* e2e: blocked — `local clean npm, pinned npx, and network-denied direct-bin checks passed; the configured Linux/macOS Node 22/24/26 matrix requires an authorized hosted CI run`
* architecture: pass — `independent Sol/high architecture review plus Standards and Spec reviews against origin/main; all material findings resolved`

## Evidence

* `AC-001`: blocked — `maintainer-authenticated npm scope-control observation is not yet available`
* `AC-002`: pass — `tests/typescript-tooling.sh TST015-AC-002 inspected exact tarball contents, metadata, dependencies, exports, bin mode, engines, copied legal/readme files, and embedded provenance hashes`
* `AC-003`: pass — `tests/typescript-tooling.sh TST015-AC-003 installed both tarballs with npm in an isolated consumer and exercised help, machine checks, verification, and init`
* `AC-004`: pass — `tests/typescript-tooling.sh TST015-AC-004 exercised exact-version npx acquisition through an isolated registry, rejected malformed/integrity-failing acquisition and ambient credentials, then ran the installed local bin with all network entry points denied`

## Authority Used

* modify

## Residual Risks

* `npm scope control has not been observed`
* `the supported Linux/macOS Node 22/24/26 hosted CI matrix is configured but has not run because commit, push, and remote workflow execution were not authorized`
