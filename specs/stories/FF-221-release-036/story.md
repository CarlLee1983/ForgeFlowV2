# Story: FF-221 Release 0.3.6

## Goal

Commit and publish the human-accepted FF-217 through FF-220 changes using the
repository release runbook and exact-revision verification.

## Classification

* Security sensitive: no
* Baseline conformance: yes

## Scope

* Prepare VERSION 0.3.6, current-version documentation, release notes and
  acceptance/handoff records; preserve all existing verification coverage.
* Commit, submit a PR, satisfy merge policy, verify the final SHA in CI, and
  publish an annotated tag and GitHub Release only after all gates pass.

## Superseded Behavior

* `tests/review-integrity.sh:versioning_records_the_corrective_patch` pins the
  current VERSION and Doctor example to 0.3.5 forever. Preserve its historical
  FF-216 classification checks, but validate current release metadata separately.
* `tests/human-review.sh:versioning_keeps_human_review_history_and_current_version`
  also pins 0.3.5; advance its current-version assertions while retaining history.
* `tests/story-check.sh:markdown_parsing_subset_is_documented` requires the
  FF-217 classification to say unreleased; assert its 0.3.6 Corrective record.

## Compatibility

The combined release is Additive with Corrective repairs. Under the pre-1.0
policy, compatible additions remain in 0.3.x, so the next release is 0.3.6.
No migration, default Doctor change, or required readiness mode is introduced.

## Constraints

* User explicitly accepted FF-217 through FF-220 and authorized commit and full
  publication. GitHub approval requirements are not replaced by chat acceptance.
* Never bypass branch protection or move existing release tags. If required
  external approval is absent, stop before merge/publication and report the PR.
* Follow docs/releasing.md, retaining one verified version/tag/SHA tuple.
