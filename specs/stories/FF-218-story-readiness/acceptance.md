# Acceptance Criteria

* [ ] AC-001: Classification-only Story with heading-only acceptance keeps
  STORY_CONTRACT_OK by default but fails --ready. Existing default tests pass.
* [ ] AC-002: Missing/placeholder Goal, empty/bare-bullet Scope, and heading-only
  acceptance each fail readiness with specific diagnostics.
* [ ] AC-003: Empty or placeholder AC text and duplicate AC IDs fail; one or
  more unique concrete checkbox ACs pass, including checked boxes.
* [ ] AC-004: ACs and Goal/Scope examples inside both fence types do not count;
  nested Scope headings do not themselves satisfy content requirements.
* [ ] AC-005: Chinese requirements, <T>, and reasonable technical strings pass;
  finite placeholders fail without language or quality scoring.
* [ ] AC-006: Success/incomplete/error output and exit codes are deterministic
  with empty PATH, --ready discovery works, invalid invocation exits 2, and
  fixture contents/existence remain unchanged.
* [ ] AC-007: Documentation and templates give usable AC ID syntax and concrete
  examples, define placeholders, distinguish structural/readiness results from
  human READY, and explicitly keep Doctor defaults and historical Stories.

## Verification Notes

tests/story-check.sh uses run_case FF218-AC-001 through FF218-AC-007.
Run make verify-story, make verify-doctor, and full make verify.
