# Acceptance Criteria

* [ ] AC-001: Existing Linux canonical make verify dependencies and invocation
  remain intact. New portability checks do not replace any existing gate.
* [ ] AC-002: An isolated runner executes bootstrap, doctor, story-check,
  handoff-check and release-check behavior suites with an explicitly selected
  executable shell; invalid interpreters fail rather than producing false PASS.
* [ ] AC-003: Each copied production script uses the selected shebang with its
  body unchanged, covering Doctor children and scripts copied into fixtures;
  source repository contents remain unchanged.
* [ ] AC-004: CI includes macOS default tools with /bin/sh and Ubuntu /bin/dash,
  pinned checkout and timeouts, without additional TypeScript/Go pipelines.
* [ ] AC-005: Local macOS behavior runs pass under /bin/sh and /bin/dash;
  actionlint and full make verify pass. Docs state actual CI coverage and do not
  promise untested platforms. Remote runs remain unverified until CI executes.

## Verification

Use run_case FF220-AC identifiers for harness assertions and behavior invocations.
Run make verify-portability with both interpreters, make verify-actions, then
the unchanged canonical make verify. No human approval is implied by PASS.
