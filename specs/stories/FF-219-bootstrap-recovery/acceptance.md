# Acceptance Criteria

* [ ] AC-001: Inject second and third replacement failures plus marker failure,
  before/after the real operation; normal recovery restores the original tree
  and no success message is emitted. Record baseline reproduction first.
* [ ] AC-002: Second/third source copy and original-backup preparation failures
  leave managed file bytes/existence unchanged and remove temporary staging.
* [ ] AC-003: Fresh and --force failures restore originally absent files as
  absent and existing originals as their old contents, preserving unrelated files.
* [ ] AC-004: Recovery failure exits nonzero, names unresolved paths and retained
  backups, gives manual recovery steps, and continues restoring other paths.
  Marker restore failure attempts invalidation and reports invalidation failure.
* [ ] AC-005: Normal bootstrap, --force, --upgrade and --dry-run remain compatible;
  upgrade excludes AGENTS.md even when linked, missing or a directory. Existing
  symlink, hard-link, conflict and type safety tests remain passing.
* [ ] AC-006: Documents distinguish single-file atomic rename, cross-file recovery,
  recovery-copy limitations, and lack of power-loss/SIGKILL/concurrency guarantees.

## Security Fixture Matrix

| Source field | Payload | Expected result | Persisted locations | Verification |
| --- | --- | --- | --- | --- |
| `managed.contents` | `old template` | preserve | `target managed files; private staging original` | `tests/bootstrap.sh FF219-AC-001` |
| `snapshot.marker` | `version=0.2.1` | preserve | `specs/.forgeflow-adoption` | `tests/bootstrap.sh FF219-AC-001` |
| `target.path` | `managed parent symlink` | reject | `outside target remains unchanged` | `tests/bootstrap.sh AC-010` |
| `managed.links` | `AGENTS.md symlink` | preserve | `upgrade target and external guide` | `tests/bootstrap.sh AC-002` |

## Verification Notes

tests/bootstrap.sh maps run_case FF219-AC-001 through FF219-AC-006;
AC-005 also retains the existing full safety suite. Run make verify-bootstrap
and full make verify. Recovery copies are private and are retained on failure
only when manual recovery or cleanup remains necessary.
