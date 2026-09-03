# Story: FF-211 Doctor Reports Contract Drift

## Goal

Make one Doctor run tell an adopter whether their Stories and handoff still
satisfy the protocol version this checkout implements, instead of reporting
`STRUCTURE_OK` for an adoption whose every Story would fail `story-check`.

## Context

Doctor checks only `AGENTS.md`, `specs/stories/`, and `Makefile`. Against dbcli
it reported `STRUCTURE_OK` while twelve Stories were missing the 0.3.0
`## Classification` and no handoff existed. `story-check` and `handoff-check`
are already read-only and already accept the paths Doctor would pass them;
nothing composes the three checks.

Reporting drift only as a warning line under an unchanged `STRUCTURE_OK` would
leave the misleading headline in place, so the result line itself changes. The
exit status does not: static mode stays advisory and must not become a gate.

## Classification

Both declarations are required. `yes` makes the matching section below
mandatory.

* Security sensitive: no
* Baseline conformance: no

## Scope

### In Scope

* In Doctor static mode, after the structure checks pass, enumerate the target's
  Story directories and invoke `scripts/story-check` with those paths, and
  invoke `scripts/handoff-check` on `specs/handoff.md` when that file exists.
* Read the FF-210 marker at `specs/.forgeflow-adoption` when present and report
  the adopted version next to this checkout's `VERSION`.
* Add three result lines to static output: adopted version, `Story contract`,
  and `Handoff`.
* Report `Result: CONTRACT_DRIFT` instead of `Result: STRUCTURE_OK` when any
  drift signal fires, while keeping the exit status at 0.
* Document the new lines, the new result value, and the unchanged exit semantics
  in `docs/doctor.md` and `docs/contract-checks.md`, and record in
  `protocol/versioning.md` that a consumer matching on Doctor's `Result` line
  can observe the new value.

### Out of Scope

* Any new option or argument on `story-check` and `handoff-check`; Doctor uses
  their existing command forms.
* Changing which structure failures make Doctor exit 1, or making drift change
  any exit status.
* Running `make verify`, CI, or merge-policy checks in static mode.
* Migrating Stories or handoffs automatically.
* Parsing an adopter's hand-written version note; only the FF-210 marker format
  is recognized.

## Inputs

* The existing Doctor arguments and target repository.
* The target's `specs/stories/`, optional `specs/handoff.md`, and optional
  `specs/.forgeflow-adoption` marker.
* This checkout's root `VERSION` file and its `scripts/story-check` and
  `scripts/handoff-check`.

## Outputs

* Doctor static output with three additional lines: adopted version, Story
  contract result, and Handoff result.
* A `Result` line that is `CONTRACT_DRIFT` when a drift signal fires and
  `STRUCTURE_OK` otherwise.

## Rules

* R1: Contract checks run only when the required structure passes; a structure
  failure still exits 1 with both contract lines reported as `NOT_CHECKED`.
* R2: Static mode stays read-only: the composed checks never execute repository
  code, follow symlinks, or write to the target.
* R3: Exactly three signals constitute drift: a marker whose `version` differs
  from this checkout's `VERSION`, a `STORY_CONTRACT_INCOMPLETE` result, and a
  `HANDOFF_CONTRACT_INCOMPLETE` result. Any one of them makes the result line
  `CONTRACT_DRIFT` and prints a `WARN` line naming the signal.
* R4: Drift never changes the exit status, which stays 0 exactly as
  `STRUCTURE_OK` does today.
* R5: A missing marker reports the adopted version as `UNKNOWN` on an `INFO`
  line and is not drift.
* R6: A target with no Story directories other than `_template/` reports
  `Story contract: NO_STORIES`; a target without `specs/handoff.md` reports
  `Handoff: NOT_PRESENT`. Neither is drift and neither is a warning.
* R7: A checker `ERROR` result is reported as `ERROR` and makes Doctor exit 2,
  as an unreadable repository does today.

## Expected Errors

* Doctor reports `ERROR` and exits 2 when a composed checker cannot read a Story
  or handoff file it was told exists, including when `specs/handoff.md` is a
  symlink.
* A marker that is unreadable, is a symlink, or does not hold a `version=` line
  reports `ERROR` and exits 2; a marker that is simply absent follows R5.

## Dependencies

* `scripts/doctor`, `scripts/story-check`, `scripts/handoff-check`, and their
  test scripts.
* FF-210 for the marker path and format; FF-210 lands first.

## Constraints

* All three scripts remain portable POSIX shell and keep their documented exit
  codes; only Doctor changes.
* Doctor's existing result lines, `--run-verify` semantics, and safety boundary
  are unchanged; the addition is Additive under `protocol/versioning.md` and
  this Story does not itself change `VERSION`.
