# Verification Result: FF-228

Recorded after a complete root `make verify` on this working tree. This Story
declares medium risk and medium architecture impact, so its profile requires
`lint static unit integration architecture`.

## Checks

* lint: pass — `make verify-protocol`
* static: pass — `./tests/protocol.sh`
* unit: pass — `./tests/execution-governance.sh`
* integration: pass — `FORGEFLOW_DECISIONS_ROOT=<temporary docs/adr> ./scripts/story-check <temporary Story>`
* architecture: pass — `./scripts/story-check --ready specs/stories/FF-228-configurable-decision-root`

## Evidence

* `AC-001`: pass — `FF228-AC-001 configured external-only ADR-907 without copying it into specs/decisions`
* `AC-002`: pass — `FF228-AC-001 kept default lookup for unset and empty values and rejected fallback from the configured root`
* `AC-003`: pass — `FF224-AC-005 retained decision validation and FF228-AC-001 resolved ADR-909-existing-slug in the configured root`
* `AC-004`: pass — `FF228-AC-002 rejected prose and line-spanning reasons with the same-line signal diagnostic in both checkers`
* `AC-005`: pass — `FF228-AC-005 verified VERSION 0.7.0, Additive classification, and configuration documentation`
* `AC-006`: pass — `make verify and make verify-portability under /bin/sh and /bin/dash exited 0`

## Authority Used

* plan
* modify
* commit

## Residual Risks

* `FORGEFLOW_DECISIONS_ROOT is invocation-scoped, so an adopter with external ADRs must set it in every local or CI Story-check command`
