# Verification Result: TST-012

Recorded after focused Core planner, CLI no-write and unsafe-path fixtures,
installed packed-package preview, retained bootstrap dry-run coverage, and the
complete repository gate on this working tree.

## Checks

* lint: pass — `make verify`
* static: pass — `make verify`
* unit: pass — `packages/core/test/init-planning.test.mjs passed`
* integration: pass — `packages/cli/test/init-command.test.mjs passed`
* contract: pass — `tests/typescript-tooling.sh passed`
* e2e: pass — `make verify`
* architecture: pass — `independent delta review checked Core planning ownership, bundled snapshot handling, and no-write CLI boundaries`

## Evidence

* `AC-001`: pass — `fresh Core and CLI fixtures returned the ordered INIT_PREVIEW and exit 0`
* `AC-002`: pass — `force fixtures returned only the exact fresh managed replacement plan`
* `AC-003`: pass — `markerless upgrade returned only templates and the marker`
* `AC-004`: pass — `pure immutable Core observation fixtures covered deterministic ownership and invalid source version refusal`
* `AC-005`: pass — `option parsing and Core ownership fixtures enforced force/upgrade exclusivity`
* `AC-006`: pass — `an installed CLI from packed tarballs produced an embedded-snapshot preview with no target writes; a process-local validated snapshot cache retained byte-isolated payload copies after its source asset became unavailable`
* `AC-007`: pass — `conflict and unavailable adoption fixtures returned INIT_CONFLICT exit 1 without mutation`
* `AC-008`: pass — `unsafe leaf and parent observation paths returned INIT_OPERATION_REFUSED without mutation`
* `AC-009`: pass — `invalid arguments and apply-mode fixtures returned typed ERROR exit 2`
* `AC-010`: pass — `make verify exited 0, retaining bootstrap dry-run and packed-package checks`

## Authority Used

* plan
* modify

## Residual Risks

* `Node pathname APIs cannot make arbitrary descendant inspection fully atomic without directory-descriptor traversal; the adapter rejects unsafe paths and blocks descendant inspection after unreadable or unsearchable managed parents, but a hostile concurrent filesystem actor can still race pathname observations.`
