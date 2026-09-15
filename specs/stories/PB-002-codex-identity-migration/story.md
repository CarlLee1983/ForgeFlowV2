# Story: PB-002 PraxisBound Codex Activation Migration

## Goal

Make PraxisBound the single current repository-local Codex activation identity
without overwriting locally changed or ambiguously owned legacy integrations.

## Context

ADR-002 assigns Codex activation ownership to Activation rather than Bootstrap.
ADR-011 changes the activation tuple from the ForgeFlow skill directory,
snapshot, and managed block to PraxisBound. Existing snapshots are persisted
ownership evidence, so migration must validate them before any replacement.

## Classification

* Security sensitive: yes
* Baseline conformance: yes
* Task mode: execution

## Authority

* plan: yes
* modify: yes
* add_dependency: no
* migration: yes
* commit: yes
* push: yes
* deploy: no

## Architecture

* Impact: high
* Decision: `ADR-002`
* Decision: `ADR-011`
* Boundary: `Codex activation identity`
* Contract: `Activation alone owns migration from a checksum-valid legacy tuple to the PraxisBound tuple`
* Contract: `preview is target-read-only and apply preserves unrelated AGENTS.md bytes with the snapshot committed last`
* Owner: `Codex activation identity = PraxisBound Activation`

## Risk

* Level: high
* Reason: `checksum-owned-filesystem-migration`
* Reason: `instruction-boundary`

## Scope

### In Scope

* Rename the installed skill to `.agents/skills/praxisbound/`, the snapshot to
  `.praxisbound-snapshot`, and the managed `AGENTS.md` block to PraxisBound.
* Add explicit preview/apply migration from a checksum-valid, known legacy
  activation tuple in both portable and TypeScript activation paths.
* Rename the maintained source skill, documentation, generated snapshot
  provenance, fixtures, and tests.

### Out of Scope

* Adoption marker migration, npm coordinates, CLI binary rename, package
  publication, unrelated Codex instruction changes, or automatic network
  updates.

## Inputs

* Current or legacy activation directory, snapshot bytes and checksums, managed
  `AGENTS.md` block, target path types, and packaged activation source.

## Outputs

* PraxisBound-only activation previews and applied repositories.
* Stable refusal or recovery results for edited, unknown, malformed, mixed, and
  injected-failure states.

## Rules

* R1: Fresh activation writes only the PraxisBound activation tuple.
* R2: A legacy tuple is migratable only when its snapshot is safe, complete,
  supported, and proves the exact owned bytes and managed block.
* R3: Both skill directories or snapshots, unknown directory members, locally
  edited owned files, malformed or repeated blocks, and unsafe path types fail
  before mutation.
* R4: Preview writes nothing. Apply preserves unrelated `AGENTS.md` bytes,
  stages all owned changes, commits the new snapshot last, and removes every
  old owned artifact.
* R5: Every injected failure fully restores the old tuple or reports exact
  retained recovery artifacts; no result accepts a mixed identity.

## Expected Errors

* Unproven ownership, dual identity, unsafe filesystem entries, malformed
  snapshots or blocks, and unsupported legacy activation versions return stable
  conflict or refusal outcomes before mutation.
* Incomplete rollback returns a recovery-incomplete outcome naming retained
  artifacts instead of claiming the old or new activation is valid.

## Dependencies

* PB-001 current PraxisBound Protocol identity.
* ADR-002 activation ownership and TST-014 activation behavior.

## Constraints

* Keep Bootstrap and Activation ownership separate.
* Preserve offline, explicit, repository-local activation and POSIX portability.
* No dependency, deployment, or publication. Commit and push only the exact
  integrated verification candidate after explicit human authorization.

## Guidance

Relevant:

* principle: explicit dependencies
* principle: behavior-oriented testing
* practice: repair loop

Not applicable:

* no network delivery or global skill installation applies

## Trust Boundary Fields

* `legacy-skill.path` — filesystem directory proposed as migration input
* `legacy-snapshot.bytes` — persisted ownership and checksum metadata
* `legacy-owned-file.bytes` — installed instruction content under checksum
* `AGENTS.md.bytes` — repository-owned file containing the managed block
* `managed-block.bytes` — delimited instruction block proposed for replacement
* `activation.target-paths` — current activation filesystem destinations
* `activation.recovery-artifact` — retained data after incomplete rollback

## Superseded Behavior

* `.agents/skills/forgeflow and .forgeflow-snapshot current activation tuple` — replaced by the PraxisBound tuple and retained only as validated migration input.
* `ForgeFlow Codex managed AGENTS.md delimiters` — replaced by PraxisBound delimiters during owned activation migration.
* `maintained forgeflow activation source and generated provenance labels` — replaced by the current PraxisBound identity.
