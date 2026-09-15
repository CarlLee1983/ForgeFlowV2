# Acceptance Criteria

## Fresh Activation

* [ ] AC-001: Fresh preview and apply use only the PraxisBound skill directory,
  snapshot, managed block, and source identity.

## Owned Migration

* [ ] AC-002: A checksum-valid supported legacy activation previews and applies
  as a one-way migration that preserves unrelated `AGENTS.md` bytes.

## Safety and Recovery

* [ ] AC-003: Edited, unknown, malformed, unsafe, and dual-identity fixtures
  fail before mutation, and every injected apply failure restores one coherent
  tuple or reports exact retained recovery artifacts.

## Regression Requirements

* [ ] AC-004: Portable and TypeScript activation behavior remain semantically
  equivalent and the full repository verification gate passes.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | test | `tests/praxisbound-activation.sh PB002-AC-001` | `fresh target and packaged activation source` | `preview and apply contain only the PraxisBound tuple` |
| `AC-002` | test | `tests/praxisbound-activation.sh PB002-AC-002` | `checksum-valid supported legacy tuple with unrelated AGENTS.md bytes` | `legacy artifacts are removed and unrelated bytes are preserved` |
| `AC-003` | test | `tests/praxisbound-activation.sh PB002-AC-003` | `ownership, path, block, mixed-state, and injected-failure matrix` | `preflight refuses or recovery yields one coherent identity with named artifacts` |
| `AC-004` | command | `make verify` | `repository checkout after PB-002 implementation` | `exit 0` |

## Security Fixture Matrix

| Source field | Payload | Expected result | Persisted locations | Verification |
| --- | --- | --- | --- | --- |
| `legacy-skill.path` | `.agents/skills/forgeflow symlink` | reject | `target repository` | `tests/praxisbound-activation.sh PB002-AC-003` |
| `legacy-snapshot.bytes` | `checksum mismatch` | reject | `activation result` | `tests/praxisbound-activation.sh PB002-AC-003` |
| `legacy-owned-file.bytes` | `locally edited SKILL.md` | preserve | `.agents/skills/forgeflow/SKILL.md` | `tests/praxisbound-activation.sh PB002-AC-003` |
| `AGENTS.md.bytes` | `prefix and suffix outside managed block` | preserve | `AGENTS.md` | `tests/praxisbound-activation.sh PB002-AC-002` |
| `managed-block.bytes` | `two ForgeFlow Codex blocks` | reject | `AGENTS.md` | `tests/praxisbound-activation.sh PB002-AC-003` |
| `activation.target-paths` | `both forgeflow and praxisbound skill directories` | reject | `target repository` | `tests/praxisbound-activation.sh PB002-AC-003` |
| `activation.recovery-artifact` | `.praxisbound-activate.*` stage at the affected skill destination | preserve | `target repository after incomplete recovery` | `tests/praxisbound-activation.sh PB002-AC-003` |

## Verification Notes

Run the focused migration and fault-injection suite, retained TST-014 coverage,
package-consumer activation checks, and `make verify`.
