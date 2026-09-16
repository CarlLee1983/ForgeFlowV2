# ADR-011: PraxisBound is the canonical project identity

* Status: accepted
* Date: 2026-09-15

## Context

The project was designed and implemented as ForgeFlow, but the maintainers do
not control the selected `@forgeflow` npm scope and the unscoped `forgeflow`
package belongs to an unrelated project. The first public Core and CLI release
therefore needs an identity that the maintainers control. The maintainer chose
PraxisBound and controls the npm organization scope `@praxisbound` through the
`praxisbound` organization. The first public packages are organization-owned;
the earlier user-scope observation remains historical evidence.

The identity is already embedded in adopter-owned paths, activation snapshots,
environment variables, package coordinates, a CLI binary, source provenance,
and draft schema identifiers. A blind text replacement would corrupt historical
evidence and could leave existing adopters in ambiguous dual-identity states.

## Decision

PraxisBound is the only canonical current identity. Its identity tuple is:

* product and Protocol: `PraxisBound` and `PraxisBound Protocol`;
* npm packages: `@praxisbound/core` and `@praxisbound/cli`;
* npm package owner: `praxisbound` organization;
* CLI executable: `praxisbound`;
* adoption marker: `specs/.praxisbound-adoption`;
* activation directory and snapshot: `.agents/skills/praxisbound/` and
  `.praxisbound-snapshot`;
* managed `AGENTS.md` delimiters: `PraxisBound Codex`;
* decision-root environment variable: `PRAXISBOUND_DECISIONS_ROOT`;
* CLI result-schema identifier: `urn:praxisbound:cli-result:1`;
* source repository: `CarlLee1983/PraxisBound`.

This is a Breaking Protocol identity change from `0.9.0` to `0.10.0`. Tooling
versions remain independent and the new npm coordinates begin at `0.1.0`.

Current commands and generated artifacts write only the PraxisBound identity.
Compatibility is limited to explicit, one-way migration adapters:

* Bootstrap `--upgrade` may recognize a valid legacy adoption marker and
  transactionally replace it with the current marker.
* Activation may recognize a checksum-owned legacy activation and
  transactionally replace it with the current activation tuple.
* Legacy and current artifacts present together are ambiguous and fail before
  mutation. Migration never creates or restores a mixed tuple.
* A non-empty `FORGEFLOW_DECISIONS_ROOT` fails closed with a migration
  diagnostic. It is not an alias for `PRAXISBOUND_DECISIONS_ROOT`.

There are no permanent legacy package, binary, path, marker, delimiter,
environment-variable, or schema aliases. In particular, no release depends on
the uncontrolled `@forgeflow` scope or the unrelated unscoped package.

Completed Stories, verification records, release records, handoffs, and the
original text of older ADRs remain immutable historical evidence. Active code,
templates, examples, guidance, package metadata, and maintained documentation
use PraxisBound. A reviewed allowlist distinguishes retained history from an
accidental live ForgeFlow surface.

The old draft result schema is not mechanically renamed. The PraxisBound schema
describes the already implemented `1.0.0` result envelope. The incompatible
planning draft is archived as superseded design evidence rather than presented
as a current contract.

This decision supersedes only the ForgeFlow identity clauses in ADR-002,
ADR-005, ADR-006, ADR-007, ADR-008, and ADR-010. Their remaining architecture
and separation-of-version concerns continue to apply.

## Boundaries

* `Protocol identity` owns the Protocol version, adopter marker, environment
  variable, templates, Doctor identity classification, and migration guide.
* `Bootstrap` owns adoption-marker migration and does not modify Codex
  activation artifacts.
* `Activation` owns the skill directory, snapshot, and managed `AGENTS.md`
  section and does not modify the adoption marker.
* `Reference Tooling Distribution` owns package coordinates, the CLI binary,
  result schema, tarball provenance, registry publication, and consumer checks.
* `Historical Evidence` retains the literal identity that was observed when a
  completed record was created; it is never treated as a current interface.
* `Human Review` owns approval of the external GitHub repository rename and the
  final irreversible publication action.

## Consequences

New adopters and consumers see one coherent identity, and the packages can be
published under a controlled namespace. Existing adopters receive an explicit,
reviewable migration instead of silently becoming markerless or holding two
authorities. The cost is a Breaking Protocol release and more migration and
recovery coverage than a mechanical rename.

The first registry publication is a bootstrap exception because npm staged
publishing cannot create a brand-new package and a Trusted Publisher cannot be
configured until that package exists. A short-lived, scope-limited granular
token issued by an organization-authorized account with direct-publish
package-and-scope rights and bootstrap-only 2FA bypass, when organization
policy permits it, is stored only as a protected GitHub Actions secret. It
publishes each new package from a public, exact-revision workflow with provenance to the
non-default `next` tag. A first-created package may also receive `latest`
immediately, so that default-tag visibility is recorded rather than treated as
a later promotion. Core is published and verified before CLI. After both
packages exist, their workflow becomes an OIDC Trusted Publisher, traditional
token publishing is disabled, and every bootstrap token, including replaced or
exposed tokens, is revoked. Final public
smoke verifies both `next` and `latest` resolve to the immutable versions;
already-correct tags are not rewritten.

If organization policy forbids 2FA bypass, the first-publication token path
blocks for Human Review; it does not relax the organization policy.

Before npm publication, rollback restores the complete old adopter tuple:
Protocol/templates/checkers, adoption marker, decision-root variable,
activation directory/snapshot/block, packages, and binary. After npm
publication, versions are immutable; a bad version is deprecated and its
dist-tag moved before a fixed patch is published.

## Falsified if

Any maintained surface still requires a ForgeFlow identity, a migration can
produce or accept an ambiguous dual-identity repository, the published package
provenance points at a different repository, or the current JSON Schema does
not validate the bytes emitted by the CLI.
