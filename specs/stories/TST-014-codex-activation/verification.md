# Verification Result: TST-014

Recorded after focused Core planning and evaluation, CLI real-filesystem fault
injection, packed-package and retained-activator parity, independent high-risk
delta review, and the complete repository gate on this working tree.

## Checks

* lint: pass — `make verify`
* static: pass — `make verify`
* unit: pass — `packages/core/test/activation.test.mjs passed`
* integration: pass — `packages/cli/test/activation-command.test.mjs and packages/cli/test/activation-mutation-adapter.test.mjs passed`
* contract: pass — `tests/typescript-tooling.sh and tests/codex-activation.sh passed`
* e2e: pass — `make verify`
* architecture: pass — `independent Sol/high delta review found no remaining correctness or security issue after checking Core/CLI outcome ownership, no-follow acquisition, stale-plan recapture, all-destination preparation and replacement faults, reverse recovery, backup identity, snapshot invalidation, cleanup evidence, and diagnostic sanitization`

## Evidence

* `AC-001`: pass — `packed preview and apply produced the ordered four-file plan and retained-activator-equivalent bytes and modes; all effects were prepared before rename, the snapshot was applied last, surrounding AGENTS bytes were preserved, and no owned residue remained`
* `AC-002`: pass — `repeated activation returned ACTIVATION_UNCHANGED without target mutation; a later packaged snapshot changed only the owned surface and recorded the new version, revision, unchanged adoption identity, and exact POSIX checksum and byte-count identities`
* `AC-003`: pass — `Core fixtures produced identical content-addressed plans and results from identical immutable observations; adapter source guards confirmed that the CLI reports facts without assigning activation outcomes`
* `AC-004`: pass — `unknown, incomplete, edited, mismatched, ambiguous-marker, and invalid-adoption fixtures returned ACTIVATION_CONFLICT before mutation and preserved owned and unknown content without a force path`
* `AC-005`: pass — `unsafe links and wrong types, invalid packaged provenance, root, content, membership, and staging races, stage collisions, and external hard-link fixtures returned ACTIVATION_OPERATION_REFUSED with an unchanged complete target and outside manifest`
* `AC-006`: pass — `preparation and every destination's before/after replacement faults proved reverse recovery; restore and snapshot-invalidation failures retained and reported exact recovery evidence, while human and canonical sanitized JSON output preserved the same Core outcomes`
* `AC-007`: pass — `preview and unchanged scratch-cleanup faults performed zero target mutation, and committed stage-cleanup residue returned ACTIVATION_CLEANUP_INCOMPLETE with exact recoverable evidence instead of clean success`
* `AC-008`: pass — `make verify exited 0 with 318 package tests, retained Codex activation, packed activation consumption, TypeScript tooling, examples, portability, and all repository gates passing; production activation source guards found no network or process execution`

## Authority Used

* plan
* modify
* commit

## Residual Risks

* `Node pathname APIs cannot make arbitrary descendant inspection and rename sequences atomic against a hostile concurrent filesystem actor; resolved-root, directory, leaf, and backup identities narrow the race, but changes after final recapture remain possible without directory-descriptor traversal.`
* `The multi-file operation is best-effort rather than crash-atomic; SIGKILL, power loss, or an unavailable filesystem can leave the exact retained recovery paths reported for manual repair.`
* `One post-authorization repository run observed a non-reproducing exit-1 result while preparing the conflict fixture; the focused case, twelve-way parallel case, six concurrent activation/init groups, and the full CLI suite did not reproduce it. The assertion now retains the CLI output if it recurs.`
