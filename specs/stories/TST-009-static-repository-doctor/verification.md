# Verification Result: TST-009

Recorded after focused Core, CLI adapter, fake-adapter, differential-parity,
retained-shell, packed-package, and whole-repository checks of this working
tree. The Story declares high Risk and high Architecture impact, so the
required profile is `lint static unit integration contract e2e architecture`.

## Checks

* lint: pass — `pnpm run format:check && pnpm run lint`
* static: pass — `pnpm run typecheck`
* unit: pass — `packages/core/test/repository-inspection.test.mjs and packages/cli/test/doctor-command.test.mjs passed`
* integration: pass — `TST009-AC-001 through TST009-AC-004 focused fixtures passed`
* contract: pass — `packages/cli/test/doctor-parity.test.mjs passed`
* e2e: pass — `make verify`
* architecture: pass — `Sol/high review checked Core ownership, static adapter boundaries, and no-follow acquisition`

## Evidence

* `AC-001`: pass — `Core and CLI human/JSON conformant fixture returned STRUCTURE_OK with exit 0`
* `AC-002`: pass — `shared retained Doctor corpus agreed on ordered stable facts, normalized diagnostics, outcome, exit, target-process observation, and target manifest`
* `AC-003`: pass — `static production source contains no child-process or target-write API and copied-fixture manifests remained unchanged`
* `AC-004`: pass — `missing, direct and ancestor symlink, blank composed source, and fake unreadable-path fixtures returned retained incomplete or one ERROR envelope`
* `AC-005`: pass — `make verify exited 0 with retained shell Doctor and packed TypeScript checks passing`

## Authority Used

* plan
* modify

## Residual Risks

* `Node's portable pathname APIs cannot atomically traverse arbitrary descendant paths relative to an opened directory descriptor; the adapter rejects direct symlinks and fails closed when observed ancestor or Story-directory identities change before or after inspection, but an active attacker could theoretically replace and restore an ancestor between those checks`
