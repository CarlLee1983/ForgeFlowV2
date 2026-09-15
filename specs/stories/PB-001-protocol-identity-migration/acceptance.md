# Acceptance Criteria

## Current Identity

* [ ] AC-001: Fresh adoption and all current Protocol validation use only the
  PraxisBound `0.10.0` identity and `specs/.praxisbound-adoption` marker.

## Legacy Upgrade

* [ ] AC-002: A valid legacy ForgeFlow `0.9.0` adoption upgrades
  transactionally to the current marker while preserving its source revision.

## Failure and Recovery

* [ ] AC-003: Dual markers, unsafe paths, malformed or unsupported legacy data,
  and injected failures fail closed without an ambiguous or partially current
  adoption.

## Decision Root and Doctor

* [ ] AC-004: Shell and TypeScript preserve decision-root semantics under
  `PRAXISBOUND_DECISIONS_ROOT`, reject a non-empty legacy variable, and Doctor
  distinguishes legacy-migration-required from current adoption.

## Migration and Corpus

* [ ] AC-005: Migration and rollback documentation is complete, maintained
  surfaces use PraxisBound, historical evidence remains unchanged, and every
  permitted ForgeFlow occurrence is covered by a reviewed allowlist.

## Regression Requirements

* [ ] AC-006: Bootstrap, Doctor, Story, Protocol, shell/TypeScript parity, POSIX
  portability, and the full repository gate pass with no unrelated semantic
  change.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `tests/praxisbound-identity.sh PB001-AC-001` | `fresh repository and current adopted repository` | `only Protocol 0.10.0 and specs/.praxisbound-adoption are emitted and accepted` |
| `AC-002` | test | `tests/praxisbound-identity.sh PB001-AC-002` | `valid ForgeFlow 0.9.0 adoption with recorded revision` | `upgrade preserves revision and ends with only the current marker` |
| `AC-003` | test | `tests/praxisbound-identity.sh PB001-AC-003` | `dual marker, unsafe, malformed, unsupported, and injected-failure fixtures` | `preflight refuses or recovery restores one coherent identity` |
| `AC-004` | test | `tests/praxisbound-identity.sh PB001-AC-004` | `decision-root environment and Doctor identity matrix` | `shell and TypeScript results agree and legacy input is diagnosed` |
| `AC-005` | test | `tests/praxisbound-identity.sh PB001-AC-005` | `tracked maintained and historical corpus` | `migration docs exist and residual ForgeFlow identities match the reviewed allowlist` |
| `AC-006` | command | `make verify` | `repository checkout after PB-001 implementation` | `exit 0` |

## Security Fixture Matrix

| Source field | Payload | Expected result | Persisted locations | Verification |
| --- | --- | --- | --- | --- |
| `legacy-marker.path` | `specs/.forgeflow-adoption symlink` | reject | `target repository` | `tests/praxisbound-identity.sh PB001-AC-003` |
| `legacy-marker.version` | `0.8.0` | reject | `migration result` | `tests/praxisbound-identity.sh PB001-AC-003` |
| `legacy-marker.revision` | `0123456789abcdef0123456789abcdef01234567-dirty` | preserve | `specs/.praxisbound-adoption` | `tests/praxisbound-identity.sh PB001-AC-002` |
| `current-marker.path` | `specs/.praxisbound-adoption plus specs/.forgeflow-adoption` | reject | `target repository` | `tests/praxisbound-identity.sh PB001-AC-003` |
| `PRAXISBOUND_DECISIONS_ROOT` | `fixture/decisions` | preserve | `Story decision resolution` | `tests/praxisbound-identity.sh PB001-AC-004` |
| `FORGEFLOW_DECISIONS_ROOT` | `fixture/legacy-decisions` | reject | `Story result diagnostic` | `tests/praxisbound-identity.sh PB001-AC-004` |
| `upgrade.target-paths` | `templates/story/story.md symlink` | reject | `target repository` | `tests/praxisbound-identity.sh PB001-AC-003` |
| `upgrade.recovery-artifact` | `.praxisbound-install.*` stage at the affected destination | preserve | `target repository after incomplete recovery` | `tests/bootstrap.sh FF219-AC-004`, `tests/praxisbound-identity.sh PB001-AC-003` |

## Verification Notes

Run the focused identity suite, the retained Bootstrap/Doctor/Story suites, the
TypeScript package tests, and `make verify`. Record every AC observation in
`verification.md`; no partial recovery or unreviewed live ForgeFlow occurrence
may be rounded up to complete.
