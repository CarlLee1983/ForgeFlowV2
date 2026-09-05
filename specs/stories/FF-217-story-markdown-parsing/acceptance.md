# Acceptance Criteria

* [ ] AC-001: A five-column matrix containing `a\|b` passes; an unescaped extra
  pipe fails. Odd and even runs of backslashes behave as documented without
  dropping payload characters.
* [ ] AC-002: Tilde examples do not contribute Classification declarations;
  four-backtick examples containing triples remain ignored; mismatched closing
  characters and closing runs with text do not terminate the fence.
* [ ] AC-003: Classification, Trust Boundary Fields, Superseded Behavior and
  Security Fixture Matrix all ignore fenced examples using the same rules.
* [ ] AC-004: Duplicate declarations outside fences still fail. An unclosed
  fence ignores through EOF; required fields only inside it still fail.
* [ ] AC-005: Existing legal Stories and exit statuses remain compatible;
  new success and failure fixtures have identical verdicts with empty PATH.
* [ ] AC-006: Protocol and command documentation define the supported subset,
  escape parity, fence character/length, and unclosed-fence handling consistently.

## Verification Notes

tests/story-check.sh maps FF217-AC-001 through FF217-AC-006 using run_case.
Run make verify-story and full make verify before waiting for Human Review.
