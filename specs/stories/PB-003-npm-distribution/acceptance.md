# Acceptance Criteria

## Package Contract

* [ ] AC-001: npm-created Core and CLI tarballs expose only the approved
  PraxisBound files, exports, exact dependency, executable, engines, license,
  readme, source, and provenance policy.

## Machine Contract

* [ ] AC-002: The PraxisBound result-envelope schema validates canonical JSON
  from every supported CLI command and rejects contract-breaking fixtures.

## Consumers and Matrix

* [ ] AC-003: npm-only clean consumers, pinned acquisition, installed offline
  execution, and every supported Node/Linux/macOS matrix entry pass.

## Publication Preconditions

* [ ] AC-004: An authenticated maintainer review proves control and creation
  authority for `@praxisbound`, both coordinates are unoccupied, the final
  GitHub identity exists, and one clean committed exact revision passes local
  and remote verification.

## First Publication

* [ ] AC-005: Core then CLI are published under the `next` tag, with any
  immediate `latest` assignment recorded, and their public integrity,
  provenance, import, executable, JSON, init, Doctor, verification, pinned
  acquisition, and offline behavior pass; OIDC Trusted Publishing is then
  established and every bootstrap token, including replaced or exposed tokens,
  is revoked.

## Final Tag and Consumer Validation

* [ ] AC-006: After OIDC and credential revocation, `next` and `latest` resolve
  to the verified immutable Core and CLI versions and the public smoke suite
  passes again. An already-correct `latest` needs no dist-tag write; an absent
  or unexpected tag requires Human Review before any write.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `tests/typescript-tooling.sh PB003-AC-001` | `fresh npm Core and CLI tarballs` | `exact package contract for @praxisbound/core, @praxisbound/cli, and praxisbound passes` |
| `AC-002` | test | `packages/cli/test/result-schema.test.mjs PB003-AC-002` | `canonical command envelopes and invalid contract fixtures` | `current schema accepts emitted envelopes and rejects invalid ones` |
| `AC-003` | test | `tests/typescript-tooling.sh PB003-AC-003` | `npm-only tarball and exact-version registry consumers on supported matrix` | `acquisition and commands pass; installed offline phase makes no network attempt` |
| `AC-004` | human | `PraxisBound publication preflight review` | `authenticated npm scope view, final GitHub repository, clean exact revision, local and remote checks` | `all publication prerequisites are recorded as passing without credential material` |
| `AC-005` | command | `PraxisBound first-publication workflow` | `verified committed candidate, protected bootstrap token, public GitHub runner, and next dist-tag` | `Core and CLI publish in order; any immediate latest assignment is recorded; valid provenance, consumer results, OIDC trust, and revocation of every bootstrap token are observed` |
| `AC-006` | command | `npm publication smoke workflow latest` | `both published packages, saved OIDC trust, revoked bootstrap credential, and passing first-publication smoke record` | `Core and CLI next and latest tags resolve to the immutable verified versions and final smoke tests pass without an unnecessary dist-tag write` |

## Security Fixture Matrix

| Source field | Payload | Expected result | Persisted locations | Verification |
| --- | --- | --- | --- | --- |
| `npm.scope` | `@forgeflow` | reject | `publication preflight` | `tests/typescript-tooling.sh PB003-AC-001` |
| `npm.package-name` | `forgeflow` | reject | `automation coordinate validator` | `tests/typescript-tooling.sh PB003-AC-003` |
| `npm.package-version` | `latest` | reject | `automation acquisition validator` | `tests/typescript-tooling.sh PB003-AC-003` |
| `npm.registry-url` | `http://127.0.0.1:<fixture-port>` | preserve | `isolated npm process configuration` | `tests/typescript-tooling.sh PB003-AC-003` |
| `npm.packument` | `@praxisbound/cli exact-version fixture metadata` | preserve | `isolated npm cache only` | `tests/typescript-tooling.sh PB003-AC-003` |
| `npm.tarball-bytes` | `corrupted packed CLI bytes` | reject | `npm cache and executable path` | `tests/typescript-tooling.sh PB003-AC-003` |
| `npm.dist.integrity` | `sha512-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=` | reject | `npm acquisition result` | `tests/typescript-tooling.sh PB003-AC-003` |
| `npm.provenance` | `repository CarlLee1983/ForgeFlowV2` | reject | `registry provenance statement` | `PraxisBound publication preflight review` |
| `npm.authorization` | `Bearer one-time-bootstrap-secret` | omit | `workflow logs, fixture registry log, test output, and verification record` | `tests/typescript-tooling.sh PB003-AC-003` |
| `source.repository` | `CarlLee1983/PraxisBound` | preserve | `packed manifests and registry provenance` | `PraxisBound publication preflight review` |
| `source.revision` | `dirty-worktree` | reject | `publication preflight` | `PraxisBound publication preflight review` |
| `package.manifest` | `unexpected install lifecycle script` | reject | `packed manifest and clean consumer` | `tests/typescript-tooling.sh PB003-AC-001` |
| `package.bin` | `#!/usr/bin/env node followed by packed CLI bytes` | preserve | `node_modules/.bin/praxisbound` | `tests/typescript-tooling.sh PB003-AC-001` |

## Verification Notes

Run package creation and schema validation, npm-only clean consumers, exact
version acquisition, network-denied local-bin execution, the supported remote
matrix, and `make verify`. Publication ACs remain partial until their external
observations are actually recorded.
