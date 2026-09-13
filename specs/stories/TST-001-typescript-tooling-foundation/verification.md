# Verification Result: TST-001

Recorded after a clean-install checkout, focused package and portability gates,
the complete root gate, Node runtime checks, and independent Sol/high review of
this working tree. The Story declares high Risk and high Architecture impact,
so the required profile is `lint static unit integration contract e2e
architecture`.

## Checks

* lint: pass — `make verify ran the root Prettier and zero-warning ESLint gates`
* static: pass — `make verify ran the offline frozen-lockfile check, TypeScript type checking, shell syntax checks, Story discovery, execution-plan resolution, and Action syntax validation`
* unit: pass — `the 12 built-output node:test cases passed under local Node 22.17.1, and again under Node 20.19.0 and Node 24.0.0`
* integration: pass — `a fresh temporary checkout with no node_modules passed pnpm install --frozen-lockfile and make verify-tooling; TST001-AC-003 installed both packed artifacts into an empty offline consumer`
* contract: pass — `tests/typescript-tooling.sh asserted stale lockfiles fail closed, exact packed contents, root-only exports, bin metadata, runtime dependencies, help, version, and unavailable-command results`
* e2e: pass — `make verify`
* architecture: pass — `independent Sol/high public-contract review found no unresolved material issue; the stale-lock finding was resolved with an offline frozen-lockfile gate and regression fixture, the pnpm 12 scanner-visibility finding was resolved with a single-document lockfile and an exact-version gate, and packed export targets are asserted in full`

## Evidence

* `AC-001`: pass — `a temporary checkout excluding .git, node_modules, dist, and .tsbuildinfo passed pnpm install --frozen-lockfile followed by make verify-tooling; make verify performs an offline frozen-lockfile check, and TST001-AC-001 proves both the single-document lockfile shape and stale-manifest rejection`
* `AC-002`: pass — `TST001-AC-002 and built-output node:test cases proved no-argument, help, --help, version, and --version output and exits`
* `AC-003`: pass — `TST001-AC-003 proved the exact Core and CLI tarball surfaces, root-only exports, executable mode, manifest dependency direction, empty-consumer imports, and installed bin`
* `AC-004`: pass — `TST001-AC-004 and built-output node:test cases proved command, option, multi-token, and trailing-argument sequences return only the documented exit-2 usage result`
* `AC-005`: pass — `make verify and make verify-portability PORTABILITY_SHELL=/bin/sh both exited zero; the legacy command scan found no Node delegation and the private TypeScript example passed unchanged`

## Authority Used

* plan
* modify
* add_dependency

## Residual Risks

* `a developer who invokes pnpm install directly with the wrong pnpm version reaches the exact-version rejection at make verify-tooling only after the frozen install; CI installs the manifest-pinned pnpm first, and neither path can produce a false PASS or rewrite the frozen lockfile`
* `the configured Node 20.19.0, 22.13.0, and 24 GitHub Actions matrix has not run remotely in this unpushed working tree; local built-output tests covered all three runtime lines and local Node 22.17.1 covered the complete tooling gate`
* `npm scope control, publication, provenance, network acquisition, and the supported operating-system clean-consumer matrix remain explicitly deferred to TST-015 / GitHub issue #40`
