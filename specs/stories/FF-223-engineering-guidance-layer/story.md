# Story: FF-223 Engineering Guidance Layer Phase 1

## Goal

Give ForgeFlow repositories a lightweight, reviewable way to reuse relevant
engineering judgment without changing Story intent, deterministic verification,
or Human Review authority.

## Context

ForgeFlow already documents process, code quality, and Human Review, but has no
selectively loaded repository-readable home for durable principles, decisions,
and practices. This additive layer must remain declarative and agent-agnostic.

## Classification

* Security sensitive: yes
* Baseline conformance: no

## Scope

### In Scope

* Add four baseline Guidance files, optional Story references, agent flow,
  documentation, bootstrap ownership, Doctor reporting, and deterministic tests.
* Prepare the compatible `0.4.1` versioned snapshot with documented upgrade
  behavior. Carl accepted the work and authorized commit and full release on
  2026-09-07, subject to the repository release and merge policy.

### Out of Scope

* Runtimes, memory, RAG, remote loading, orchestration, semantic scoring,
  automatic guidance mutation, or replacing Human Review.

## Inputs

* Approved Story and acceptance criteria.
* Repository-local `guidance/` files and existing bootstrap and Doctor contracts.

## Outputs

* Optional, selective Guidance use with safe installation and static reporting.

## Rules

* R1: Story intent is canonical; specific approved context beats generic
  Guidance, and a real conflict is surfaced to Human Review.
* R2: Guidance is advisory unless a repository deliberately makes a rule
  executable behind `make verify`.
* R3: Fresh bootstrap and explicit `--force` seed the baseline; `--upgrade`
  never reads or writes repository/team-owned `guidance/`.
* R4: Doctor reports absent Guidance as optional, a present partial baseline as
  non-blocking drift, and unsafe paths as an error without extra execution.
* R5: Guidance references stay human-readable; no parser judges relevance,
  quality, or compliance.

## Expected Errors

* Fresh bootstrap refuses existing managed Guidance files; explicit `--force`
  replaces only existing regular files.
* Fresh and `--force` bootstrap refuse unsafe managed Guidance symlinks and
  wrong path types, including their `--dry-run` previews. `--upgrade` does not
  inspect Guidance and leaves it unchanged.
* Doctor returns `ERROR` for unsafe Guidance paths and `CONTRACT_DRIFT` for a
  present incomplete baseline.

## Trust Boundary Fields

* `bootstrap.target_path` — caller-selected repository root and managed
  `guidance/` parent and leaf paths.
* `guidance.path` — repository-controlled directory and file entries Doctor
  reads without following symlinks.
* `guidance.contents` — repository/team guidance retained during explicit
  bootstrap replacement and inspected only for basic static completeness.

## Dependencies

* FF-210 bootstrap ownership and upgrade safety.
* FF-211 Doctor static contract drift.
* FF-222 optional readiness evidence.

## Constraints

* Shell scripts remain POSIX and Doctor static mode remains builtin-only under
  an empty `PATH`, read-only, and free of repository-code execution.
* This is Additive for `0.4.1`; absent Guidance remains legacy-compatible.
* Commit and release are authorized by Carl on 2026-09-07. Follow the repository
  release runbook and normal PR policy; do not bypass required review or checks.

## Guidance

Relevant:

* principle: small-coherent-change
* principle: root-cause-over-symptom-suppression
* practice: repair-loop

Not applicable:

* decision: no repository-specific architecture mandate is needed
