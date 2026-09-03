# Story: FF-214 Code Quality Guidance

## Goal

Explain how an adopting repository can make its own code-quality rules
enforceable through ForgeFlow's existing canonical verification gate without
adding a language-specific or parallel protocol contract.

## Context

The TypeScript and Go examples already run formatting and static-analysis
tools, but ForgeFlow does not yet distinguish automated quality checks from
design judgment or explain how repository-owned rules gain enforcement.

## Classification

* Security sensitive: no
* Baseline conformance: no

## Scope

### In Scope

* Add repository-owned code-quality guidance covering automated checks and
  Human Review.
* Clarify the Verification Contract without changing its PASS, FAIL, or Repair
  Loop semantics.
* Add concise compatible guidance to the distributed agent template.
* Make TypeScript ESLint warnings fail its existing canonical gate.
* Link the guidance from the README and verify the adopter-facing contract.
* Record the additive classification and advance the protocol version required
  by the versioned-surface policy.

### Out of Scope

* A required `make verify-style` target or any other new adoption artifact.
* A cross-language style standard or arbitrary Clean Code thresholds.
* LLM scoring as a nondeterministic blocking gate.
* Bootstrap, Repository Doctor, or GitHub repository-setting changes.
* New dependencies, agent runtimes, services, or unrelated refactoring.

## Inputs

* The current Verification and Versioning Contracts.
* The distributed agent template and repository README.
* The TypeScript and Go example verification pipelines.

## Outputs

* `docs/code-quality.md` and a README entry point.
* Compatible updates to `protocol/verification.md`,
  `protocol/versioning.md`, and `templates/AGENTS.md`.
* TypeScript lint configuration that rejects warnings.
* Automated FF-214 contract coverage and an updated lifecycle handoff.

## Rules

* R1: Code-quality policy and tool selection remain repository-owned.
* R2: Every adopted automated quality check belongs behind the existing
  deterministic, non-interactive, CI-suitable `make verify` command and returns
  nonzero on failure.
* R3: Verification stays read-only with respect to source formatting; mutating
  format commands remain separate.
* R4: Rules, files, tests, or severity must not be disabled, bypassed, removed,
  or weakened merely to obtain PASS.
* R5: Formatting, static quality, architecture, and design judgment have
  distinct enforcement boundaries; Human Review owns judgment that cannot be
  made deterministic.
* R6: LLM review is advisory unless its result has been converted into a
  reproducible machine rule.
* R7: Numeric quality thresholds are selected by each repository for its risks
  and technology rather than presented as universal Clean Code.
* R8: `make verify` remains the only authoritative completion gate; no required
  adoption command, file, PASS/FAIL meaning, or Repair Loop step is added or
  changed.
* R9: This change is Additive. Existing valid adoptions remain valid, while the
  versioned protocol and template updates advance `VERSION` from `0.3.2` to
  `0.3.3` without creating a tag or release.

## Expected Errors

* TypeScript verification fails when ESLint reports any warning or error.
* Documentation verification fails when the new guidance, canonical-gate
  semantics, template safeguards, example pipeline, or version classification
  drifts from this Story.

## Dependencies

* The existing repository, Verification, Story, Handoff, and Versioning
  Contracts.
* The existing TypeScript and Go example toolchains.

## Constraints

* Keep the protocol agent-, language-, framework-, and CI-provider-agnostic.
* Preserve the root POSIX shell, read-only checker, bootstrap, Doctor, Story,
  handoff, release, example, and Actions gates.
