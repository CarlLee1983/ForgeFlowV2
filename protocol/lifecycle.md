# Story Lifecycle

ForgeFlow uses lifecycle states as a shared vocabulary. They are conceptual
only: repositories do not need a workflow engine, state database, or agent
orchestrator. The current protocol version is recorded in
[`VERSION`](../VERSION).

```text
DRAFT → READY → IMPLEMENTING → VERIFYING → REVIEW → DONE
                    ↑              │
                    └──── FAIL ────┘
                    ↑                         │
                    └── CHANGES REQUESTED ────┘

IMPLEMENTING ─┐
              ├→ SPEC_BLOCKED → READY
REVIEW ────────┘
```

## States

| State | Meaning | Exit condition |
| --- | --- | --- |
| DRAFT | Human intent is still being written or discussed. | Goal, scope, rules, and acceptance criteria are approved. |
| READY | The Story is approved and implementable. | An agent or engineer begins the bounded change. |
| IMPLEMENTING | Code, tests, and related repository artifacts are changing. | The implementation is ready for canonical verification, or a specification blocker is proven. |
| VERIFYING | The repository is executing `make verify`. | PASS advances to REVIEW; FAIL returns to IMPLEMENTING. |
| REVIEW | Automated verification passed and a human reviews product intent, design, and architecture. | The human accepts the work, requests implementation changes, or identifies a specification blocker. |
| DONE | Human review is complete and the repository's merge policy has been satisfied. | Terminal for this Story. |
| SPEC_BLOCKED | A missing or conflicting human decision prevents safe implementation. | The human resolves the blocker and approves the revised Story as READY. |

## Required transitions

- **DRAFT → READY** — a human approves the Story and acceptance criteria.
- **READY → IMPLEMENTING** — implementation begins.
- **IMPLEMENTING → VERIFYING** — the coherent change and tests are ready for the
  canonical gate.
- **VERIFYING → IMPLEMENTING** — `make verify` fails; diagnose and
  repair without weakening requirements.
- **VERIFYING → REVIEW** — `make verify` passes.
- **REVIEW → DONE** — only a human may accept the verified work, after the
  repository merge policy is satisfied.
- **REVIEW → IMPLEMENTING** — Human Review requests an implementation, test,
  readability, or architecture change. The changed work must complete full
  `make verify` again before a new PASS returns it to REVIEW.
- **REVIEW → SPEC_BLOCKED** — Human Review identifies a missing or conflicting
  product, policy, or architecture decision.
- **IMPLEMENTING → SPEC_BLOCKED** — a genuine intent decision is required.
- **SPEC_BLOCKED → READY** — the human resolves and approves the specification.

Verification failure alone is not a specification blocker. It remains part of
the implementation repair loop. These review outcomes do not change existing
PASS, FAIL, or Repair Loop semantics. See [Human Review](../docs/human-review.md)
for the contextual review dimensions and authority boundary.

## Handing work over

When work changes hands, the state is recorded in a handoff whose lifecycle
block states the current Story, the next Story, the repository baseline, and the
last verification result. See the [Handoff Contract](handoff.md).
