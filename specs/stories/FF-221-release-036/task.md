# Release preparation

Carl accepted FF-217 through FF-220 and authorized commit and full publication
on 2026-09-05. Version 0.3.6 is compatible under the pre-1.0 release policy.

Release metadata and FF221-AC-001/002 are verified. Full `make verify` passed
after replacing the historical unreleased-text assertion with the exact 0.3.6
Corrective classification. No prior gate or historical classification check
was removed. `git diff --check` passed.

Implementation commit: 23218d90375c57f9122187263bb0c631904c3e44.
Its clean `make release-check` passed: version=0.3.6, expected_tag=v0.3.6,
local_tag=absent. PR: https://github.com/CarlLee1983/ForgeFlowV2/pull/9.

At this checkpoint CI is running and GitHub reports REVIEW_REQUIRED / BLOCKED.
The protected main branch requires a GitHub approving review; chat acceptance
does not supply that API state. This bookkeeping follow-up also needs fresh
committed readiness and exact-SHA CI before publication. Merge, annotated tag
and GitHub publication remain pending until policy and docs/releasing.md are
satisfied. Do not report this Story as DONE yet.
