# Story: FF-225 Codex Project Activation

## Goal

In an adopted repository, let a developer request implementation or continue
work in a fresh Codex session without supplying the ForgeFlow source path or
pasting its workflow prompt.

## Context

Carl already uses ForgeFlow in dbcli and other repositories. The missing link is
activation during normal development. The grilling session on 2026-09-06
approved Codex-first, repository-local installation with a pinned snapshot, an
AGENTS.md entry point, and an explicitly callable forgeflow skill.

Current bootstrap installs agent guidance and Story templates, but no skill.
Existing `bootstrap --upgrade` deliberately leaves adopter AGENTS.md untouched.
This Story adds an opt-in integration; it preserves those existing commands.

This Story restates work Carl approved on 2026-09-06 and implemented on the
unmerged `docs/ff-222-release-completion` branch as `FF-223`. That branch was
written against the `0.4.1` protocol, its Story IDs now collide with the merged
`FF-223` and `FF-224`, and it conflicts with `main` in eight files. The approved
intent, rules, and acceptance criteria are carried forward unchanged; only the
identifiers, the compatibility target, and the FF-224 execution-governance
declarations are new. The prior branch is source material, not a merge base.

## Classification

* Security sensitive: yes
* Baseline conformance: no
* Task mode: execution

## Authority

* plan: yes
* modify: yes
* add_dependency: no
* migration: no
* commit: yes
* push: no
* deploy: no

## Architecture

* Impact: medium
* Boundary: `Bootstrap`
* Boundary: `Activation`
* Contract: `bootstrap and --upgrade command forms, the adoption marker format, Doctor verdicts, and make verify semantics remain unchanged`
* Contract: `--upgrade never reads or writes adopter AGENTS.md`
* Contract: `an adoption without the optional integration stays valid`
* Owner: `Bootstrap = scripts/bootstrap`
* Owner: `Activation = scripts/codex-activate`

## Risk

* Level: high
* Reason: `security`
* Reason: `destructive-operation`

## Scope

### In Scope

* An explicit installation and update path for already-adopted repositories that
  previews changes and installs a self-contained snapshot at
  `.agents/skills/forgeflow/`, plus a bounded ForgeFlow section in AGENTS.md.
* A short startup pointer and a forgeflow skill covering task discovery,
  continuation, Story drafting, approval, and handoff using repository-local
  artifacts. Reuse the existing Story-development workflow as its source.
* Identify the installed integration version and revision; updates are explicit.
* Installation safety tests, a reproducible fresh-session Codex walkthrough,
  compatibility guidance, and integration of the automated tests into
  `make verify`.
* An architecture decision record for choosing a repository-local pinned
  snapshot over a global skill or a fetch-at-runtime integration.

### Out of Scope

* Other agent hosts, personal or global installation, plugin marketplace
  packaging, MCP servers, orchestration runtimes, hooks, or tool interception.
* Automatic requirement approval, Story selection, upgrades, commits, or release.
* Making skills mandatory for existing adoptions, or treating model behavior as
  deterministic enforcement. Automated gates and Human Review keep their roles.
* Merging, rebasing, or reviving the `docs/ff-222-release-completion` branch, and
  the separate review-evidence documentation it also carries.

## Inputs

* An explicitly selected adopted repository and the selected ForgeFlow snapshot.
* Existing AGENTS.md, integration files, adoption marker, handoff, Story files,
  working-tree state, and the developer's current request.

## Outputs

* A preview, or an installed local skill and bounded startup guidance, with an
  identifiable snapshot and no dependency on the original source checkout.
* Task-appropriate continuation, a Story draft awaiting approval, or a concrete
  diagnostic with the smallest relevant decision or repair proposal.

## Rules

* R1: Activation applies to implementation requests and requests to continue
  development inside an opted-in adopted repository. General questions and
  discussion do not create Stories or start implementation. Explicit skill
  invocation remains a fallback; the feature does not promise universal recall.
* R2: Resolve the current repository from the working directory, including a
  nested directory. Load its handoff and relevant Story; a source-checkout path
  in a prompt, a global skill, or a global config change is unnecessary.
* R3: For continuation, reconcile the current Story, its approval and lifecycle
  state, the working tree, and verification freshness. Resume approved
  implementation or repair work without asking for the same approval again.
  REVIEW awaits human judgment; DONE is not reopened. Missing or contradictory
  decisions are exposed rather than resolved.
* R4: A new implementation request without an approved matching Story produces
  the smallest Story draft and concrete acceptance evidence. Inspect available
  code for facts; ask only about decisions that materially affect behavior or
  scope. Human approval precedes implementation.
* R5: Work within the current approved scope continues. An independent request
  may produce a separate draft, but switching the authoritative current Story
  needs the developer's decision. With no current Story, report the state and
  obtain selection; do not infer a next Story from directory order.
* R6: Show the exact managed paths and proposed AGENTS.md changes before the
  user authorizes installation or update. Preserve all content outside the
  bounded section byte-for-byte. Repeat installation is idempotent; explicit
  updates replace only owned content. Conflicting or ambiguous markers, and
  locally edited managed content, reject the operation before any write and
  preserve the entire target tree until explicitly reconciled; partial snapshot
  updates are invalid.
* R7: Pin a complete integration snapshot in the repository. Runtime guidance
  uses local files and does not fetch newer instructions. Reuse existing version
  metadata where it accurately identifies the installed snapshot; do not change
  the adoption marker to claim a template upgrade that did not occur.
* R8: Installation is not permission to execute adopter code. Validate paths
  before writes; preserve unrelated data, including external hard-link aliases
  of a replaced managed file. Detected write failures recover the original
  contents and existence, or identify unresolved paths and recovery copies.
  Document the same concurrent-writer and crash limits as existing bootstrap.
* R9: Missing files, version mismatches, or conflicting guidance produce a
  diagnosis and a proposed repair. Repair or upgrade needs explicit
  authorization; nonblocking problems do not stop unrelated work. A missing
  skill never makes an otherwise valid legacy adoption invalid.

## Expected Errors

* Invalid invocation, an unadopted target, unsafe path types, ambiguous managed
  sections, or unknown ownership fail before changing target files.
* Preview reports conflicts without writes; installation failures exit nonzero
  and never claim a complete snapshot. Failed recovery names retained copies.
* Stale handoff or unresolved product decisions limit only dependent work. They
  do not authorize fabricated approval or automatic lifecycle correction.

## Trust Boundary Fields

* `target.path` — selected repository, managed parent paths, symlinks and leaves.
* `agents.contents` — existing project instructions and managed-section markers.
* `integration.contents` — existing skill files and local user modifications.
* `snapshot.identity` — source and installed version and revision declarations.
* `workflow.inputs` — handoff, Story state, and developer request; file contents
  do not grant human approval or authorization to run repository code.

## Dependencies

* FF-210 snapshot and upgrade boundaries, FF-219 recovery behavior, and FF-222
  acceptance evidence.
* FF-224 execution governance: this Story declares its task mode, authority,
  architecture, and risk, and records a verification result.
* Codex repository AGENTS.md loading and `.agents/skills` discovery, verified
  against official documentation during design and again at implementation.
* Existing repository-owned `make verify` and human-owned lifecycle decisions.
* The unmerged `docs/ff-222-release-completion` branch as read-only source
  material for `scripts/codex-activate`, `tests/codex-activation.sh`, and the
  recorded walkthrough.

## Compatibility

Classification: Additive for `0.5.1` under
[Protocol Versioning](../../../protocol/versioning.md). The integration is
optional; existing bootstrap invocations, marker format, Doctor verdicts, and
verification semantics remain unchanged. In particular, plain `--upgrade` still
does not read or write AGENTS.md. Existing adopters need no migration.

## Guidance

Relevant:

* principle: small-coherent-change
* practice: repair-loop

Not applicable:

* practice: release-runbook

## Constraints

* Implement the smallest explicit installer interface that preserves the old
  command contracts. Final command spelling and managed delimiters are routine
  implementation choices, documented and tested together.
* Portable POSIX `sh` under `set -eu` for scripts; reuse current helpers and
  safety patterns. No new runtime dependency is required for instruction
  discovery.
* Tests use temporary adopted repositories, never this repository's live Stories
  or handoff. A dbcli trial uses an isolated copy unless Carl separately
  authorizes changes to the actual project.
* Carl approved this specification's predecessor on 2026-09-06 and approved this
  restated text on 2026-09-07, so the Story is READY. That approval authorizes
  implementation and isolated acceptance fixtures. It does not authorize writes
  to live adopter projects, and `push` and `deploy` remain `no`.
