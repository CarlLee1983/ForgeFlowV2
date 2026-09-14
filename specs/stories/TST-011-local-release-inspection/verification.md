# Verification Result: TST-011

Recorded after focused Core, CLI, real Git fixture, packed CLI, retained-shell,
package-content, and complete repository checks. The Story declares high Risk
and high Architecture impact, so the required profile is `lint static unit
integration contract e2e architecture`.

## Checks

* lint: pass — `pnpm run format:check && pnpm run lint`
* static: pass — `pnpm run typecheck && ./scripts/story-check --ready specs/stories/TST-011-local-release-inspection`
* unit: pass — `pnpm test`
* integration: pass — `node --test packages/cli/test/release-command.test.mjs packages/cli/test/release-parity.test.mjs`
* contract: fail — `node --test packages/cli/test/release-parity.test.mjs`
* e2e: pass — `make verify`
* architecture: fail — `independent Sol/high Standards and Spec reviews`

## Evidence

* `AC-001`: pass — `node --test packages/cli/test/release-command.test.mjs`
* `AC-002`: fail — `node --test packages/cli/test/release-parity.test.mjs`
* `AC-003`: fail — `node --test packages/cli/test/release-command.test.mjs`
* `AC-004`: pass — `node --test packages/cli/test/release-command.test.mjs`
* `AC-005`: fail — `make verify`

## Authority Used

* plan
* modify

## Residual Risks

* `the TypeScript differential corpus does not yet cover every retained release-check fixture, especially promisor/lazy-fetch, full fsmonitor/hooks, mutation-manifest, and concurrency families; TST-011 must not be marked complete until that corpus is implemented`
