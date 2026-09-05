# Acceptance Criteria

## Happy Path

* [ ] AC-001: <acceptance criterion>

## Business Rules

* [ ] AC-002: <acceptance criterion>

## Failure Cases

* [ ] AC-003: <acceptance criterion>

## Regression Requirements

* [ ] AC-004: <acceptance criterion>

## Security Fixture Matrix

Required when the Story declares `Security sensitive: yes`; otherwise delete
this section. Every cell except the expected result must carry an exact value in
backticks. The expected result is one of `preserve`, `redact`, `reject`, or
`omit`.

| Source field | Payload | Expected result | Persisted locations | Verification |
| --- | --- | --- | --- | --- |
| `field.name` | `literal payload value` | redact | `artifact.field` | `tests/example.sh` |

## Verification Notes

Any Story-specific verification instructions.

Replace placeholders with observable criteria; keep each AC ID unique. Optional
`scripts/story-check --ready <story-directory>` checks minimum content, not
human-approved READY. Criteria may be checked manually or automatically.

Example (fenced examples do not count as acceptance criteria):

```markdown
* [ ] AC-001: An empty order returns a total of zero cents.
* [ ] AC-002: A negative quantity is rejected with an invalid-quantity error.
```
