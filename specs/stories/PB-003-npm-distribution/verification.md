# Verification Result: PB-003

## Checks

* lint: pass — `make verify`
* static: pass — `make verify; package metadata, schema, TypeScript, and Actions workflow checks passed`
* unit: pass — `make verify; 330 TypeScript tests including real CLI envelope validation passed`
* integration: pass — `make verify; npm-created tarballs and isolated clean-consumer suites passed`
* contract: pass — `make verify; PB-003 verification plan and packed Core and CLI contracts passed`
* e2e: blocked — `the final main-branch publication candidate has no recorded exact-SHA Node/Linux/macOS matrix result; public registry acquisition and publication remain pending`
* architecture: pass — `independent Sol/high identity, package, and publication-boundary review found no remaining material implementation finding`

## Evidence

* `AC-001`: pass — `tests/typescript-tooling.sh PB003-AC-001 inspected npm-created Core and CLI tarballs, approved exports, dependency, bin, source, and legal files`
* `AC-002`: pass — `packages/cli/test/result-schema.test.mjs PB003-AC-002 validated synthetic failures and real canonical JSON from CLI command families against the current schema`
* `AC-003`: pass — `tests/typescript-tooling.sh PB003-AC-003 passed npm-only clean consumers, exact-version fixture acquisition, and installed offline execution locally; the exact-SHA push Actions run for 2949b3cf0d084cef69284496b823621b38a46f10 passed every supported Node/Linux/macOS tooling matrix entry. Public registry acquisition after publication remains AC-005 evidence`
* `AC-004`: blocked — `the human owner selected the @praxisbound organization scope, and an authenticated organization-owner view proves control and creation authority; package-level registry lookups returned E404 for both coordinates on 2026-09-15. The final source repository is CarlLee1983/PraxisBound, but no clean main-branch publication candidate with matching local and exact-SHA remote verification has been recorded; coordinate absence must be rechecked before publication`
* `AC-005`: blocked — `Core and CLI have not been published to next; provenance, public consumer behavior, OIDC trust, and bootstrap token revocation remain unobserved`
* `AC-006`: blocked — `neither immutable package has been promoted to latest or passed public smoke tests`

## Publication Preflight Observations

* Organization authority: `Chrome npmjs.com/settings/praxisbound/members showed the authenticated carlllee1983 account as the owner of the praxisbound organization, with one member and 2FA enabled, on 2026-09-15T13:15Z. Its Packages view showed 0 packages. No credential material was inspected.`
* Ownership decision: `the human owner selected the praxisbound npm organization to own @praxisbound/core and @praxisbound/cli on 2026-09-15. PB-003 story.md and ADR-011 now record organization ownership; TST-016's earlier user-scope observation is historical, not current organization authority.`
* Registry coordinates: `npm view @praxisbound/core versions and npm view @praxisbound/cli versions both returned E404, as did exact-0.1.0 lookups, on 2026-09-15. These observations are time-limited and do not authorize publication.`
* Local npm session: `npm whoami returned praxisbound, while npm org ls praxisbound returned E401. The CLI session differs from the authenticated browser owner view and was not used as organization-authority evidence or for publication.`
* Source identity: `git remote get-url origin and gh repo view identified CarlLee1983/PraxisBound. Local commit ca88bf860762c7901815853268d68575426da0a4 passed post-commit make release-check, including make verify, before this record was edited; at the pre-push review GitHub had no commit or CI run for that SHA. The publish workflow requires a verified candidate on main.`
* Remote branch matrix: `GitHub Actions push run 34975048232 checked out exact HEAD 2949b3cf0d084cef69284496b823621b38a46f10 and completed successfully on 2026-09-15 with 15 successful jobs: make verify, two portability jobs, and all 12 tooling-compatibility entries across Node 22.13.0/22.x, 24.0.0/24.x, and 26.0.0/26.x on Ubuntu and macOS. Pull-request run 34975084648 also had 15 successful jobs, but its checkout used GitHub's synthetic merge ref, so it is separate merge validation, not exact-head evidence. Neither result establishes a clean main publication candidate.`

## Authority Used

* modify

## Residual Risks

* `The exact-SHA branch matrix passed, but a clean main-branch publication candidate and its matching local and remote gates are unavailable; a branch run alone cannot satisfy the main-only publication workflow.`
* `The organization owner is selected, but the local npm CLI session does not prove organization authority; keep credential isolation and use only the protected publication path after the remote gates pass.`
* `The one-time protected direct-publish credential and permitted bootstrap 2FA setting, ordered next publication, public provenance and consumer checks, OIDC configuration, credential revocation, and 2FA latest promotion remain pending.`
