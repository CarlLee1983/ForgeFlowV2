# Implementation Progress

## Plan

* [x] Define the optional Guidance baseline and its authority boundaries.
* [x] Extend Story/template, agent-facing instructions, concepts, README, and upgrade documentation.
* [x] Seed fresh/force bootstrap safely while preserving repository-owned Guidance on upgrade.
* [x] Add builtin-only static Doctor reporting and fixture-based tests.
* [x] Rerun complete verification after behavioral review corrections, inspect the diff, and hand off for Human Review.

## Notes

Guidance references intentionally have no parser: presence, relevance, and
quality are judgment-oriented. The only deterministic baseline check is whether
a present `guidance/` has the four readable non-blank files. Absent Guidance is
legacy-compatible regardless of adoption marker version.

`make verify` passed after behavioral review corrections. The final evidence and
handoff declarations are checked narrowly. Carl accepted the implementation and
Guidance selection on 2026-09-07 and authorized commit and full release. Required
GitHub review and merge policy must still be satisfied before DONE; local
readiness, exact-SHA CI, tag, and Release inspection remain publication gates.
