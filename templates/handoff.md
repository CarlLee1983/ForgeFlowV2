# ForgeFlow Handoff Evidence

Prose may explain the historical execution context. The block records one
point-in-time observation; it is not current workflow state.

## Evidence

```yaml
handoff:
  story: <story-id>
  recorded_at: <YYYY-MM-DDTHH:MM:SSZ>
  repository: <owner/repository>
  revision: <full-commit-sha>

verification:
  command: make verify
  result: not_run
```

## Notes

* Replace every placeholder with facts observed at the recorded UTC time and
  exact commit revision.
* Once versioned, do not update this record to report newer state. Create a new
  evidence record for a later observation.
* Do not add current or next work, lifecycle status, completed work, Gate state,
  review state, or completion state. Those facts belong to the external control
  plane when one is present.
* ForgePilot is one possible control plane, not a ForgeFlow dependency.
