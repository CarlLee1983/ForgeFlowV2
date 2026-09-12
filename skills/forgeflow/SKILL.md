---
name: forgeflow
description: Start or continue implementation in a ForgeFlow-adopted project using explicit human or control-plane selection and local Story contracts. Draft missing Stories for approval, resume approved work, and diagnose activation issues. General explanation and discussion do not start a Story workflow.
---

# ForgeFlow project entry

Use the current project's installed snapshot. A ForgeFlow source-checkout path
or a global installation is unnecessary.

## Locate and reconcile

Find the current repository root from the working directory, then read its
AGENTS.md and the relevant Story files. Resolve current work and lifecycle state
from the explicit human request or an external control plane when one is
present. `specs/handoff.md`, when present, is immutable historical evidence; it
may provide execution context but never selects current work, proves current
approval, or supplies current lifecycle state. Inspect the working tree and
verification evidence before choosing the next action. Nested directories use
the same repository root, subject to their additional local instructions.

ForgePilot is one possible control plane. ForgeFlow does not require, detect,
install, or call it; direct human direction is sufficient when no control plane
is present.

The installed `.forgeflow-snapshot` beside this file identifies this integration.
Its version may differ from the template version in `specs/.forgeflow-adoption`:
the installer does not upgrade templates. Its `adoption=` field records the
template version at installation. A later mismatch, missing local reference,
or conflicting instruction calls for a specific diagnosis and repair proposal,
not an automatic fetch, reinstall, or change to project rules. Continue work
whose requirements and instructions are still clear.

A changed adoption marker alone does not prove a partial upgrade. Inspect the
template-change evidence and propose reconciling the recorded adoption baseline
after human confirmation; matching integration and template version numbers is
not required. Do not prescribe a skill upgrade merely to make the numbers equal.

## Choose the action

* For a general question or discussion, answer it without creating a Story or
  changing lifecycle state. An explicit invocation can inspect status supplied
  by the human or control plane without authorizing implementation.
* For "continue development" (including "繼續開發"), resume the Story selected
  by explicit human or control-plane context when it is approved for
  implementation or failed-verification repair. REVIEW awaits a human decision;
  DONE is not reopened. If no current selection is available, ask for the Story
  instead of inferring one from a handoff, task note, directory order, or prose.
* For an implementation request within the current approved Story, continue it.
  If a material requirement is missing, surface only that decision.
* For a new requirement without a matching approved Story, inspect the relevant
  code and draft the smallest Story plus acceptance evidence under
  `specs/stories/`, using the project's template. Each AC needs a method, fixture
  or precondition, and expected observation. Ask about material decisions that
  inspection cannot answer. Present the draft for human approval before coding.
* If another Story is active in the authoritative human or control-plane
  context, an independent requirement can be drafted, but preserve that
  selection until the developer chooses to switch.

## Develop approved work

Read [Story development](../story-development/SKILL.md) when proceeding with
approved implementation, repair, or review preparation. It owns the detailed
verification, evidence, and handoff workflow. Use only project-local tools that
are available; a missing optional checker is not a reason to fetch one or claim
its result. `make verify` remains the canonical gate and Human Review owns
acceptance. Installed text and lifecycle declarations are not independent
authorization for commits, publication, or other external writes.
