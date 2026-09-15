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
* `AC-003`: blocked — `tests/typescript-tooling.sh PB003-AC-003 passed local clean-consumer, pinned fixture acquisition and offline execution; exact-SHA remote matrix remains pending`
* `AC-004`: blocked — `an authenticated npm organization-owner view proves control and creation authority for the @praxisbound organization scope, and package-level registry lookups returned E404 for both coordinates on 2026-09-15. PB-003 and ADR-011 still specify a user scope, so package ownership requires Human Review. The final source repository is CarlLee1983/PraxisBound, but no clean main-branch publication candidate with matching local and exact-SHA remote verification has been recorded; coordinate absence must be rechecked before publication`
* `AC-005`: blocked — `Core and CLI have not been published to next; provenance, public consumer behavior, OIDC trust, and bootstrap token revocation remain unobserved`
* `AC-006`: blocked — `neither immutable package has been promoted to latest or passed public smoke tests`

## Publication Preflight Observations

* Organization authority: `Chrome npmjs.com/settings/praxisbound/members showed the authenticated carlllee1983 account as the owner of the praxisbound organization, with one member and 2FA enabled, on 2026-09-15T13:15Z. Its Packages view showed 0 packages. No credential material was inspected.`
* Ownership decision: `PB-003 story.md and ADR-011 specify the @praxisbound user scope; the new organization view does not change that approved intent by itself. Human Review must select the intended package owner before publication.`
* Registry coordinates: `npm view @praxisbound/core versions and npm view @praxisbound/cli versions both returned E404, as did exact-0.1.0 lookups, on 2026-09-15. These observations are time-limited and do not authorize publication.`
* Local npm session: `npm whoami returned praxisbound, while npm org ls praxisbound returned E401. The CLI session differs from the authenticated browser owner view and was not used as organization-authority evidence or for publication.`
* Source identity: `git remote get-url origin and gh repo view identified CarlLee1983/PraxisBound. Local commit ca88bf860762c7901815853268d68575426da0a4 passed post-commit make release-check, including make verify, before this record was edited; at the pre-push review GitHub had no commit or CI run for that SHA. The publish workflow requires a verified candidate on main.`

## Authority Used

* modify

## Residual Risks

* `Exact-SHA remote Node/Linux/macOS evidence and a clean main-branch publication candidate are unavailable; a branch run alone cannot satisfy the main-only publication workflow.`
* `The selected package-owner boundary is unresolved between the Story's user scope and the observed organization scope; no publication credential or package owner was substituted.`
* `The local npm CLI session does not prove organization access; keep credential isolation and use only the protected publication path after the authenticated organization review and remote gates pass.`
* `The one-time protected credential, ordered next publication, public provenance and consumer checks, OIDC configuration, credential revocation, and 2FA latest promotion remain pending.`
