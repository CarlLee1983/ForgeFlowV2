# Story: FF-207 Repository Doctor

## Goal

Give engineers a safe, actionable way to determine whether an adopting
repository has ForgeFlow's required structure and, only with explicit consent,
whether that repository's canonical `make verify` command succeeds locally.

## Context

Bootstrap installs ForgeFlow's managed guide and Story templates, but adopters
still own their Makefile and verification setup. Engineers need a diagnostic
that separates installed files, statically confirmable structure, an actually
executed local gate, human review, and merge authorization. The requested
FF-206 identifier is already assigned to the completed TypeScript executable
Story, so this incremental Story uses the next unique identifier without
changing that newer work.

## Classification

* Security sensitive: no
* Baseline conformance: no

## Scope

### In Scope

* Add an optional `scripts/doctor` command with static and explicitly authorized
  verification modes.
* Check only non-empty readable `AGENTS.md`, readable `specs/stories/`, and a
  non-empty readable `Makefile` as required structure.
* Report missing, unsafe, unconfirmed, and next-step information with stable
  result and exit-code semantics.
* Treat repository-internal symlinks on required paths as unconfirmed errors
  while allowing the requested repository root to resolve to a physical
  directory.
* Add isolated shell acceptance tests, root verification wiring, and adopter
  documentation.
* Classify Doctor's public command behavior as an additive optional capability.

### Out of Scope

* A global ForgeFlow CLI, installer, plugin system, JSON output, maturity score,
  or agent orchestration runtime.
* Automatic repair, dependency or Skill installation, Makefile creation, Story
  generation, or generalized Story and acceptance linting.
* GitHub API, CI-run, branch-ruleset, merge, tag, release, or deployment
  automation.
* Changing bootstrap arguments, overwrite protection, or safety behavior, or
  making bootstrap invoke Doctor or `make verify`.
* Reimplementing repository-specific lint, test, typecheck, or other gate logic.

## Inputs

* An optional repository directory, defaulting to the current directory.
* An optional leading `--run-verify` authorization flag.
* `AGENTS.md`, `specs/stories/`, and `Makefile` beneath the resolved repository
  root.
* The target repository's own `make verify` result in execution mode.

## Outputs

* Per-check `PASS`, `FAIL`, `WARN`, `INFO`, or `ERROR` diagnostics and actionable
  next steps.
* One result from `STRUCTURE_OK`, `STRUCTURE_INCOMPLETE`, `VERIFIED_LOCAL`,
  `VERIFICATION_FAILED`, or `ERROR`.
* Whether verification ran, its original exit status when it ran, and explicit
  `NOT_CHECKED` status for CI and merge policy.
* Doctor exit status `0`, `1`, or `2` according to the documented contract.

## Rules

* R1: Static mode is read-only and never invokes Make, repository code, shell
  configuration, network requests, dependency installation, or Git mutation.
* R2: Required structure is limited to readable non-blank `AGENTS.md`, a
  readable `specs/stories/` directory, and readable non-blank `Makefile`.
  `_template/`, `task.md`, Skills, and CI configuration remain optional.
* R3: A repository-root symlink may resolve to its physical directory, but a
  symlink at any repository-internal required path is not followed and produces
  `ERROR` because the structure cannot be safely confirmed.
* R4: Static Makefile inspection is deliberately limited. A literal `verify:`
  rule is only a textual clue; comments, `.PHONY`, and documentation text are
  not evidence. Continued text and `define` bodies are conservatively excluded,
  and an unconfirmed result never proves the target is absent.
* R5: Static completion always reports `Verification: NOT_RUN`, even when a
  literal rule clue is found.
* R6: `--run-verify` first requires safely confirmed structure and an available
  `make`, warns that trusted repository code will execute without a sandbox,
  then invokes `make verify` exactly once from the physical repository root.
* R7: Execution mode streams Make's output unchanged, records its actual exit
  status, does not retry or repair, and maps zero to Doctor exit `0` and any
  nonzero verification result to Doctor exit `1`.
* R8: Confirmed structural absence maps to Doctor exit `1`. Invalid invocation,
  invalid root, unreadable or symlink-limited required paths, unavailable Make,
  and Doctor operational failures map to exit `2`; exit `2` takes precedence
  when structural absence and an unconfirmable condition coexist.
* R9: Structural success, local verification success, human review, CI status,
  merge policy, and merge authorization remain distinct. Doctor never emits
  `APPROVED`, `DONE`, or `MERGE_ALLOWED`.
* R10: `make verify` remains the sole canonical automated verification command;
  Doctor only diagnoses structure or invokes that command with explicit consent.

## Expected Errors

* Unknown, repeated, misplaced, or excess arguments print usage and exit `2`.
* A missing path or a file supplied as the repository directory reports
  `ERROR` and exits `2`.
* Missing, empty, or wrong-type required structure reports
  `STRUCTURE_INCOMPLETE` and exits `1` unless an unconfirmable condition also
  requires exit `2`.
* Unreadable or symlinked required paths report `ERROR`, remain unmodified, and
  exit `2` without running repository code.
* Missing Make in execution mode reports `ERROR` and exit `2` without executing
  verification.
* A nonzero `make verify` reports `VERIFICATION_FAILED`, its original status,
  and Doctor exit `1`.

## Dependencies

* The Repository, Story, Verification, and Versioning Contracts.
* Existing bootstrap behavior and the root canonical verification gate.
* POSIX shell and common Unix environments; execution mode additionally needs
  the target environment's `make` command.
* FF-206 TypeScript Executable Story Parity remains unchanged and independently
  verified.

## Constraints

* Extend the repository's current shell style without a CLI framework or shared
  runtime.
* Doctor must not require Node.js, Go, Python, or a new package in the target
  repository.
* Tests use disposable fixtures rather than treating ForgeFlow itself as an
  adopter fixture and ignore access-time changes when proving static immutability.
* No commit, push, merge, tag, release, remote mutation, or automatic upgrade is
  part of this Story.
