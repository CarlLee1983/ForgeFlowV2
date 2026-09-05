# Release preparation

Carl accepted FF-217 through FF-220 and authorized commit and full publication
on 2026-09-05. Version 0.3.6 is compatible under the pre-1.0 release policy.

Release metadata and FF221-AC-001/002 are verified. Full `make verify` passed
after replacing the historical unreleased-text assertion with the exact 0.3.6
Corrective classification. No prior gate or historical classification check
was removed. `git diff --check` passed.

The protected main branch requires a GitHub approving review. Chat acceptance
does not supply that API state. Commit/PR and exact-SHA CI are the next release
steps; merge, annotated tag and GitHub publication remain pending until policy
and docs/releasing.md are satisfied. Do not report this Story as DONE yet.
