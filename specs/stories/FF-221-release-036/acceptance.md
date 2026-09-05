# Acceptance Criteria

* [ ] AC-001: VERSION is 0.3.6, the Doctor sample agrees, and release notes state
  the Additive/Corrective compatibility and remaining operational limits.
* [ ] AC-002: FF-216 historical classification remains tested; a separately
  identified FF221 regression asserts the new release metadata without removing
  the original test case or any canonical gate.
* [ ] AC-003: Human acceptance is recorded accurately, without claiming merge
  or publication before the required external evidence exists.
* [ ] AC-004: The committed candidate passes make release-check; a PR satisfies
  branch policy and the final release SHA has successful Linux and portability CI.
* [ ] AC-005: An annotated v0.3.6 tag and published GitHub Release resolve to the
  verified SHA; existing conflicting objects or missing approval stop publication.

## Verification

FF221-AC-001 and FF221-AC-002 use run_case in tests/review-integrity.sh.
AC-003 uses handoff/Story checks plus human evidence. AC-004/005 use the release
runbook and authenticated gh checks; unavailable approval is reported, not forged.
