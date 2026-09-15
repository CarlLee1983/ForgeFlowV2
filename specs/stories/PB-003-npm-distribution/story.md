# Story: PB-003 PraxisBound npm Distribution

## Goal

Publish verified `@praxisbound/core` and `@praxisbound/cli` packages whose
public contracts, provenance, and clean-consumer behavior match the completed
PraxisBound implementation.

## Context

The maintainer controls the npm organization scope `@praxisbound` and selected
the new coordinates before the first public package release. TST-015 proved
the package and consumer mechanisms under the old proposed identity but correctly retained
the uncontrolled namespace as blocked historical evidence. ADR-011 supersedes
those identity clauses. The existing draft result schema also diverges from the
implemented CLI envelope and must be replaced before publication.

## Classification

* Security sensitive: yes
* Baseline conformance: yes
* Task mode: mixed

## Authority

* plan: yes
* modify: yes
* add_dependency: no
* migration: no
* commit: yes
* push: yes
* deploy: yes

## Architecture

* Impact: high
* Decision: `ADR-005`
* Decision: `ADR-007`
* Decision: `ADR-008`
* Decision: `ADR-010`
* Decision: `ADR-011`
* Boundary: `Core npm package`
* Boundary: `CLI npm package and praxisbound executable`
* Boundary: `CLI result schema`
* Boundary: `npm publication sequence`
* Contract: `Core exposes only its package root with no runtime dependency; CLI exposes only its package root and praxisbound bin and depends on the exact Core version`
* Contract: `the current JSON Schema validates the canonical bytes emitted by every CLI JSON command`
* Contract: `publication proves the controlled scope, exact source revision, registry provenance, and clean-consumer behavior before latest promotion`
* Owner: `Core npm package = PraxisBound Reference Tooling`
* Owner: `CLI npm package and praxisbound executable = PraxisBound Reference Tooling`
* Owner: `CLI result schema = PraxisBound CLI JSON Adapter`
* Owner: `npm publication sequence = Human Review and package maintainer`

## Risk

* Level: high
* Reason: `public-contract`
* Reason: `dependency-supply-chain`
* Reason: `irreversible-publication`

## Scope

### In Scope

* Rename workspace/package metadata, imports, lockfile, package READMEs,
  executable, help/errors, packed snapshots, exact dependency, and source
  provenance to PraxisBound.
* Replace the mismatched draft result schema with a PraxisBound schema for the
  implemented `1.0.0` envelope and retain the old draft only as superseded
  design evidence.
* Prove exact tarball allowlists, npm-only clean consumers, pinned acquisition,
  offline installed-binary execution, supported Node/Linux/macOS matrix, npm
  scope control, and final source identity.
* Bootstrap each brand-new package through an exact-revision GitHub Actions
  provenance publish to the non-default `next` tag, validate public consumers,
  establish Trusted Publishing, then promote Core and CLI to `latest` in order.

### Out of Scope

* GitHub repository rename, tag, or GitHub release without separate explicit
  authorization. Branch commit and push are limited to the exact verified
  publication candidate required by this Story.
* Protocol/adoption or Codex activation migration, permanent legacy npm or
  binary aliases, new dependencies, Windows support, or unrelated command
  semantics.

## Inputs

* Completed PB-001/PB-002 tree, exact package version, packed tarballs, final
  GitHub repository slug and exact committed revision, authenticated npm scope
  observation, registry metadata, and supported CI results.

## Outputs

* `@praxisbound/core@0.1.0`, `@praxisbound/cli@0.1.0`, and the `praxisbound`
  executable with verified public metadata and provenance.
* A current JSON Schema matching the canonical CLI envelope.
* Retained pre-promotion and post-promotion consumer evidence for both packages.

## Rules

* R1: The selected coordinates are `@praxisbound/core` and
  `@praxisbound/cli`; the CLI exposes only `praxisbound`, and both packages use
  one exact tooling version independently of Protocol `VERSION`.
* R2: Core has no runtime dependency. CLI's only runtime dependency is the
  exact Core version. Each package exports only `.`, contains only its
  allowlisted surface, and declares public scoped publication with provenance
  and the exact final source repository directory.
* R3: The schema identifier is `urn:praxisbound:cli-result:1`, its declared
  version is `1.0.0`, and it validates the canonical envelope produced by all
  supported `--json` commands without changing that envelope's semantics.
* R4: Automated acquisition uses exact
  `@praxisbound/cli@<tooling-version>` coordinates. Offline guarantees begin
  only after acquisition and invoke the installed `praxisbound` binary.
* R5: Publication starts only from one clean committed revision for which full
  local verification, exact-SHA remote CI, scope-control review, tarball checks,
  and final repository identity all pass.
* R6: Because npm cannot stage a brand-new package or preconfigure its Trusted
  Publisher, an organization-authorized account issues a short-lived granular
  token limited to `@praxisbound` with Packages and scopes `Read and write
  (publish and stage)` and bootstrap-only `Bypass 2FA` for unattended direct
  publication, when organization policy permits it. It exists only as a
  protected GitHub Actions secret for the first Core and CLI provenance
  publishes to `next`. It is never printed, copied into the repository, or used
  from the local worktree. If organization policy forbids 2FA bypass, first
  publication blocks for Human Review rather than weakening that policy.
* R7: Core is published to `next` and publicly smoke-tested before CLI. After
  both packages exist, configure the exact public workflow as each package's
  OIDC Trusted Publisher, disallow traditional token publishing, revoke the
  bootstrap token, and only then promote `latest` Core first and CLI second.
* R8: A failed public version is not overwritten or silently unpublished. Move
  its dist-tag, deprecate it with a reason, and publish a fixed patch.

## Expected Errors

* Any occupied coordinate, manifest/tarball/schema mismatch, failed provenance,
  source-identity mismatch, package or consumer failure, missing matrix result,
  or unclean/uncommitted source blocks publication.
* Failure after the Core `next` publication blocks CLI publication and
  `latest`; failure after the CLI `next` publication blocks both promotions and retains the
  observed registry state for Human Review.

## Dependencies

* PB-001 and PB-002 complete with full verification.
* Controlled npm organization scope `@praxisbound`, final GitHub source identity, and
  exact-SHA supported CI.
* TST-015 package, acquisition, offline, and consumer fixtures.

## Constraints

* Never expose, copy, persist in repository artifacts, or weaken isolation for
  npm credentials. The one-time bootstrap token is entered directly into the
  protected GitHub secret surface and revoked after OIDC setup.
* No dependency addition. npm artifacts are immutable once published.
* Publication does not imply authorization for GitHub or git writes.

## Guidance

Relevant:

* principle: explicit dependencies
* principle: behavior-oriented testing
* practice: non-trivial business workflow

Not applicable:

* no persistent adopter migration belongs to this Story

## Trust Boundary Fields

* `npm.scope` — external registry namespace selected for publication
* `npm.package-name` — public Core or CLI coordinate
* `npm.package-version` — immutable registry version
* `npm.registry-url` — acquisition and publication service
* `npm.packument` — registry-supplied metadata
* `npm.tarball-bytes` — built or acquired package bytes
* `npm.dist.integrity` — registry-supplied integrity
* `npm.provenance` — registry and build provenance statement
* `npm.authorization` — bootstrap credential-bearing publication request
* `source.repository` — public GitHub repository identity
* `source.revision` — exact committed publication candidate
* `package.manifest` — packed package metadata
* `package.bin` — acquired CLI executable path and bytes

## Superseded Behavior

* `TST-015 R1 @forgeflow/core, @forgeflow/cli, and forgeflow executable` — superseded by the maintainer-controlled PraxisBound package and binary identity.
* `packages/* source repository ForgeFlowV2 identity` — replaced by the final PraxisBound repository provenance.
* `docs/typescript-tooling/result-envelope-v1.schema.json planning-draft shape` — replaced by a schema for the implemented 1.0.0 envelope; the draft remains only as superseded design evidence.
* `tests and docs that acquire @forgeflow/cli or invoke forgeflow` — replaced by exact PraxisBound coordinates and executable with no compatibility alias.
