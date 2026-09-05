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

Carl merged PR #9 on 2026-09-05 at
4d6dc963defde7fb93e08009730f40488284b592. The agent did not bypass branch policy.
That exact SHA passed workflow 33933039270 (Linux canonical, macOS sh, Ubuntu
dash) and full local `make release-check` before and after annotated-tag creation.

Published on 2026-09-05:
https://github.com/CarlLee1983/ForgeFlowV2/releases/tag/v0.3.6.
Post-publication checks confirmed a non-draft, non-prerelease Release and remote
annotated tag 9c8f9832487a5a9674927d41df60d27100487258 peeling to the same SHA.
FF221-AC-003 through AC-005 are satisfied. Status: DONE.

This documentation-only follow-up records observed completion; it does not move
the released tag. Remote evidence must be queried again for future decisions.
