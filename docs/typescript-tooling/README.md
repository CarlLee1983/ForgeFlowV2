# PraxisBound TypeScript Tooling Migration Plan

Status: planning baseline captured before implementation. Implementation
progress is recorded in the `TST-*` Stories under `specs/stories/`.

Scope: executable tooling modernization inside the existing
`CarlLee1983/PraxisBound` repository. This plan creates no repository, package
publication, protocol-semantic change, or legacy removal.

Detailed artifacts:

- [Existing Tooling Inventory](current-state.md)
- [Protocol / Core / CLI Architecture](architecture.md)
- [CLI and Machine Contract](cli-contract.md)
- [Compatibility, Parity, and Migration Plan](parity-and-migration.md)
- [Ordered Implementation Tickets](implementation-tickets.md)
- [Draft result-envelope v1 JSON Schema](result-envelope-v1.schema.json)

## A. Current State

The executable surface named in the brief is implemented in portable POSIX
shell, not Python:

| Capability           | Current size/shape               | Key semantic role                                        | Migration risk                                          |
| -------------------- | -------------------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| `bootstrap`          | mutating installer with recovery | adoption snapshot, ownership, force/upgrade/dry-run      | very high: files, links, faults, recovery               |
| `codex-activate`     | preview/apply installer          | pinned optional agent integration                        | very high: bounded ownership, checksums, recovery       |
| `doctor`             | composite static/process command | Repository Contract, drift, optional gate execution      | high: composes Story/Handoff and crosses trust boundary |
| `story-check`        | largest static parser/evaluator  | Story, readiness, security, governance, risk, evidence   | very high: broadest Protocol surface                    |
| `verification-check` | static plan/result evaluator     | execution defaults, profiles, result/evidence precedence | high: shared Story grammar and evidence                 |
| `handoff-check`      | bounded static parser            | immutable Handoff evidence                               | medium: hostile lexical cases but no effects            |
| `release-check`      | guarded Git observation          | local release-candidate coherence                        | high: external Git and concurrent-state checks          |

All three contract checkers are deliberately read-only and currently use shell
builtins so external `PATH` cannot change their verdict. Doctor static mode is
non-gating; `CONTRACT_DRIFT` remains exit `0`. `make verify` remains the one
canonical repository gate. Exact inputs, outputs, files, dependencies, exits,
failure modes, side effects, rules, presentation, and tests are recorded in the
inventory.

The current Protocol version is `0.9.0`. The tooling always applies the current
checkout semantics; it has no stable JSON report and no protocol-version
selection. Story and verification duplicate important declaration readers, and
existing tests mostly build fixtures inline and assert human substrings.

## B. Architectural Decisions

Existing decision numbers `ADR-001` through `ADR-003` are occupied, so the seven
requested decisions use the repository's next sequential numbers:

| Requested decision                        | Repository record                                                                     | Status   |
| ----------------------------------------- | ------------------------------------------------------------------------------------- | -------- |
| Protocol remains language agnostic        | [ADR-004](../../specs/decisions/ADR-004-protocol-remains-language-agnostic.md)        | proposed |
| TypeScript is official Reference Tooling  | [ADR-005](../../specs/decisions/ADR-005-typescript-reference-tooling.md)              | proposed |
| Tooling is distributed through npm        | [ADR-006](../../specs/decisions/ADR-006-npm-distribution.md)                          | proposed |
| Core and CLI are separate Modules         | [ADR-007](../../specs/decisions/ADR-007-core-and-cli-are-separate.md)                 | proposed |
| CLI exposes stable JSON                   | [ADR-008](../../specs/decisions/ADR-008-stable-cli-json-contract.md)                  | proposed |
| Migration uses behavioral parity          | [ADR-009](../../specs/decisions/ADR-009-behavioral-parity-migration.md)               | proposed |
| Protocol/tooling versions are independent | [ADR-010](../../specs/decisions/ADR-010-independent-protocol-and-tooling-versions.md) | proposed |

They remain proposed until maintainers explicitly accept or amend them.
Implementation may provide evidence for those decisions without changing their
status. TypeScript stays optional, so these records do not supersede ADR-003.
Making Node required behind an existing portable entrypoint would be a separate
Breaking decision that revisits ADR-003.

## C. Target Architecture

Adopt a two-package pnpm workspace in this repository:

```text
language-independent protocol artifacts
                  |
                  v
@praxisbound/core: evaluate | planMutation | capabilities
                  |
                  v
@praxisbound/cli: argv/filesystem/process/mutation/render/npm adapters
```

Core receives immutable normalized inputs and returns Semantic Results or
mutation plans. It owns parsers, rules, profiles, stable issue/evidence codes,
version dispatch, aggregate precedence, and deterministic effect planning. It
does not read process globals, print, exit, prompt, use the network, execute a
command, or mutate a repository.

CLI owns physical filesystem/Git/Make observation, explicit authorization,
staging/recovery execution, human/JSON rendering, and exit status. This makes
the decision/effect seam testable and prevents I/O failures from masquerading as
deterministic Protocol logic.

Keep the current flat `protocol/*.md` paths during migration. Add subdirectories
or schemas only when a language-independent contract needs them. The CLI result
schema belongs to tooling and must not be placed under `protocol/`.

The full monorepo target is documented in the architecture artifact. This phase
does not create `packages/`, a root package, or TypeScript source.

## D. Compatibility Contract

For every capability, two isolated copies of the same fixture run through the
legacy shell and TypeScript Implementations. A fail-closed test-only normalizer
maps legacy results to the JSON semantic model. The comparator asserts:

- result status/outcome;
- issue code, severity, subject, location, and parameters;
- exit status;
- evidence and external-process observations;
- before/after repository mutation manifest;
- generated artifact bytes and required ordering/recovery facts.

Human wording is deliberately excluded. Unknown legacy diagnostics fail the
harness rather than disappearing.

The golden corpus includes valid, invalid Story, missing metadata, invalid
verification, missing evidence, Handoff failure, release failure, legacy
adoption, and fresh repository fixtures plus path, permission, link, parser,
process, Git, and recovery edge families.

No capability may switch defaults or remove legacy code until its Behavioral
Parity Gate passes. Legacy removal additionally requires installable packages,
version-pinned npx acquisition, offline installed-binary execution, full CI/root
verification, existing adoption and ForgePilot validation, migration/rollback
docs, namespace provenance, and a separate approved removal ticket.

## E. CLI Contract

Recommended hierarchy:

```sh
praxisbound init
praxisbound doctor
praxisbound verify
praxisbound story check
praxisbound verification check
praxisbound handoff check
praxisbound release check [repository]
praxisbound codex activate
```

`verify` executes `make verify`; `verification check` statically evaluates a
Story's plan or recorded result. This removes the most dangerous naming
ambiguity while keeping artifact checkers consistent.

Every applicable command supports `--json` and explicit Protocol selection.
Result envelope v1 contains:

```text
schemaVersion, command, status, outcome, exitCode,
issues, evidence, error, data,
metadata.{toolingVersion, protocolVersion, supportedProtocolRange}
```

Warnings are typed `issues` with severity `warning`; Doctor drift can therefore
be `status: pass`, outcome `CONTRACT_DRIFT`, exit `0`. Human messages are not
stable keys. In JSON mode stdout is exactly one JSON object; child/progress logs
use stderr.

Unified exit contract:

| Exit | Meaning                                                       |
| ---- | ------------------------------------------------------------- |
| `0`  | completed positive result or documented non-gating warning    |
| `1`  | completed negative domain/operation result                    |
| `2`  | invocation/acquisition error prevented trustworthy evaluation |
| `3`  | unexpected internal tooling/envelope failure                  |

Known legacy `0/1/2` cases remain unchanged. Raw child exits are evidence and
are not overloaded as CLI exits. A diagnosed safety refusal during a mutating
preflight remains a negative operation result (`1`); unsafe input that prevents
a static checker from acquiring its subject remains an acquisition error (`2`).

`init` applies a fresh safe installation by default, refuses existing managed
destinations, supports exact no-write `--dry-run`, retains explicit narrow
`--force`, and keeps `--upgrade` mutually exclusive. Force replaces only the
fresh managed set and never unknown content; upgrade replaces only templates and
marker while preserving repository-owned `AGENTS.md` and Guidance. All modes are
offline and non-interactive.

## F. npm Distribution Design

Publish logical packages in lockstep initially:

```text
@praxisbound/core
@praxisbound/cli  -> bin `praxisbound`
```

Supported zero-install form:

```sh
npx @praxisbound/cli init
```

That unpinned spelling is a human convenience and may resolve the latest
dist-tag or prompt during network acquisition. Automation pins the exact
tooling version:

```sh
npx --yes @praxisbound/cli@<tooling-version> init
```

Offline guarantees begin after acquisition: clean fixtures install the tarball,
disable network, and invoke `./node_modules/.bin/praxisbound` directly.

Registry check on 2026-09-12 found unrelated `forgeflow@0.6.0`; public
`@praxisbound/core` and `@praxisbound/cli` lookups returned `E404`, which does not
prove control of the `@praxisbound` scope. Namespace ownership is therefore a
release prerequisite, not an architecture blocker. Do not document
an unscoped `npx praxisbound` acquisition path until the name is legitimately
controlled.

Consumer Node engines are `^22.13.0 || ^24.0.0 || ^26.0.0`; Node 20 is EOL.
Development uses an exact pnpm pin and root lockfile, but consumers require only
npm/npx. Initial runtime dependency policy is zero third-party dependencies in
Core and only Core in CLI; Node builtins cover parsing, filesystem, process, and
plain terminal output. Any runtime dependency needs a dedicated necessity,
maintenance, license, size, transitive-risk, determinism, and parity review.

Protocol version, tooling version, and supported range are explicit and
independent. Initial Core/CLI versions move together only to reduce package
combinations, not because they equal root Protocol `VERSION`.

ForgePilot should first use the Process Boundary:

```text
ForgePilot -> praxisbound --json
```

It may later use public `@praxisbound/core` root exports for in-process evaluation,
accepting Core SemVer as an additional dependency. Neither mode may parse human
output, import internal modules, or give PraxisBound lifecycle authority.

## G. Migration Waves

1. Contracts/foundation and parity harness; no migrated capability.
2. Handoff check.
3. Verification plan, then recorded verification result.
4. Story contract, then opt-in readiness.
5. Static Doctor, then canonical verify/Doctor execution.
6. Local release check.
7. Init planning/dry-run, then apply/recovery.
8. Codex activation preview/apply.
9. Packed npm/npx, supported platform, existing adoption, and ForgePilot
   validation; per-command default decisions.
10. Separate legacy retirement tickets only if explicitly approved.

Doctor intentionally does not go first: it composes Story and Handoff. Handoff
is the smallest pure capability, while init/activation carry the greatest
side-effect and recovery risk.

## H. Risks

The material risks are:

- accidentally making Node a Protocol prerequisite;
- accepting broader Markdown/YAML syntax through generic libraries;
- exposing a shallow/stringly Core Interface;
- publishing incomplete JSON that forces prose parsing;
- losing raw child-process evidence during exit normalization;
- encoding human wording in the parity normalizer;
- under-testing symlink/hard-link/recovery/Git concurrency behavior;
- conflating Protocol, package, and schema versions;
- assuming an npm coordinate is controlled;
- breaking hidden human-output consumers or unsupported OS semantics.

The controlling mitigations are optional distribution, restricted parsers,
discriminated requests, schema/consumer tests, raw observation evidence,
fail-closed normalization, real filesystem/Git fixtures, explicit compatibility
metadata, namespace proof, and one-command default/removal changes.

No current plan includes a plugin system, remote service, daemon, MCP, automatic
repair, architecture analysis, AI-dependent decision, or ForgePilot redesign.

## I. Acceptance Criteria

- **PL-AC-001 — Current surface:** every listed executable has purpose, inputs,
  outputs, reads/writes, environment/process dependencies, exits, failures,
  effects, Protocol rules, presentation behavior, and test coverage recorded.
- **PL-AC-002 — Semantic separation:** each inventoried behavior is classified as
  Protocol/Core semantics, CLI Adapter responsibility, or presentation/test-only
  implementation detail.
- **PL-AC-003 — Language independence:** no target architecture path requires
  Node, npm, TypeScript, network, remote service, LLM, or ForgePilot for Protocol
  adoption/correctness.
- **PL-AC-004 — Module seams:** Core/CLI ownership, public Interface, invariants,
  dependency Adapters, and effect boundary are explicit and independently
  testable.
- **PL-AC-005 — CLI:** the full command hierarchy, legacy mapping, static versus
  executing behavior, global options, and init force/upgrade/dry-run semantics
  are unambiguous.
- **PL-AC-006 — Machine contract:** a draft JSON Schema defines result, issue,
  warning, evidence, error, metadata, ordering, stdout, and compatibility rules.
- **PL-AC-007 — Exit contract:** `0`/`1`/`2`/`3` have one category meaning across
  commands and legacy/current exceptions are mapped.
- **PL-AC-008 — Parity:** fixtures, isolation, legacy normalization, semantic and
  mutation comparison, process observations, and Behavioral Parity Gate are
  specified.
- **PL-AC-009 — Distribution:** package names, bin, registry observations,
  namespace blocker, Node support, npm/npx consumer path, pnpm development
  policy, and dependency review policy are specified.
- **PL-AC-010 — Versioning:** tooling, Protocol, supported range, result-schema
  version, selection, unsupported behavior, and release independence are defined.
- **PL-AC-011 — Init:** detection, no-overwrite default, exact force boundary,
  upgrade ownership, dry-run, staging, recovery, and offline provenance are
  defined.
- **PL-AC-012 — Integration:** ForgePilot process and library modes are separate;
  JSON is the first stable Interface and internals/current lifecycle state remain
  inaccessible.
- **PL-AC-013 — Sequencing/removal:** migration order is justified by actual
  coupling/risk, and removal is blocked by the full independent gate.
- **PL-AC-014 — Tickets:** the ordered backlog starts with foundation and every
  ticket has scope, non-goals, acceptance criteria, verification, and explicit
  dependencies.
- **PL-AC-015 — Planning-only:** no legacy script, Protocol rule/template,
  package source, dependency, publication state, or GitHub repository changed.
- **PL-AC-016 — Repository verification:** planning artifacts pass schema/format
  checks, `git diff --check`, and the repository's complete `make verify` gate.

## J. Ordered Implementation Tickets

The backlog contains eighteen reviewable tickets. The first is exactly:

```text
TST-001 Establish TypeScript tooling foundation
```

It creates the private workspace, Core/CLI skeletons, build gates, and only
help/version behavior. It does not migrate a command.

The remaining order is:

```text
TST-002 result/version-selection contracts
TST-003 differential parity harness
TST-004 Handoff check
TST-005 verification plan
TST-006 recorded verification result
TST-007 Story contract
TST-008 Story readiness
TST-009 static Doctor
TST-010 canonical verification execution
TST-011 local release inspection
TST-012 init planning/dry-run
TST-013 init apply/recovery
TST-014 Codex activation
TST-015 npm/npx consumer validation
TST-016 ForgePilot contract validation
TST-017 release-check compatibility entrypoint switch
TST-018 legacy release-check removal
```

The detailed ticket artifact gives each ticket explicit scope, non-goals,
acceptance criteria, verification method, and dependencies. Default switching,
cleanup, and removal never share a migration ticket.

## Definition-of-Done answers

| Question                        | Concrete answer                                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What is language independent?   | Repository/Story/execution/verification/lifecycle/Handoff/evidence/version contracts, persistent formats, result meanings, and adoption invariants.       |
| What does each current tool do? | The per-command inventory above and `current-state.md` record every capability and effect.                                                                |
| What moves to Core?             | Deterministic parsing/evaluation, models, stable codes, version dispatch, profiles/precedence, inspection evaluation, and mutation planning.              |
| What stays CLI-only?            | argv, filesystem/Git/Make observation, authorization, mutation/recovery execution, terminal/JSON serialization, and exit.                                 |
| How is equivalence proved?      | Same isolated fixtures, fail-closed legacy normalizer, expected manifest, semantic/effect comparator, and full parity gate.                               |
| What is the CLI hierarchy?      | `init`, `doctor`, `verify`, plus `story/verification/handoff/release check` and late `codex activate`.                                                    |
| What is the machine contract?   | Versioned v1 envelope/schema with typed issues, evidence, error, data, and version metadata; one JSON object on stdout.                                   |
| What is the exit contract?      | `0` positive/advisory, `1` negative result, `2` cannot evaluate safely, `3` internal failure.                                                             |
| How are npm packages composed?  | Scoped Core + CLI, CLI exposes `praxisbound`; npm/npx consumers, pnpm workspace development.                                                                |
| What does init do?              | Offline detection/preflight, deterministic plan, safe apply; dry-run no-write; force exact managed set; upgrade templates/marker only; recovery evidence. |
| What is migration order?        | Handoff -> verification -> Story -> Doctor/verify -> release -> init -> activation -> rollout/removal.                                                    |
| When can shell be removed?      | Only after parity plus package/npx/CI/adoption/ForgePilot/docs/version/runtime/removal gates, in its own ticket.                                          |
| How does ForgePilot integrate?  | Prefer CLI JSON Process Boundary; optional public Core Library Boundary; never internal imports or human parsing.                                         |
| How do versions coexist?        | Exact independent `toolingVersion`, `protocolVersion`, `supportedProtocolRange`, and result `schemaVersion`, with no silent negotiation.                  |

Until every implementing Story satisfies its own acceptance and parity gate, the
legacy shell Implementation remains authoritative for current executable
behavior. Full TypeScript migration is explicitly outside this planning phase.
