# Acceptance Criteria

## Happy Path

* [ ] AC-001: From a checkout without root `node_modules`, the frozen root
  install succeeds and the workspace format, lint, type-check, test, build, and
  pack gates all pass for both packages.
* [ ] AC-002: The built CLI prints the documented help for no arguments,
  `help`, and `--help`, prints the CLI package version for `version` and
  `--version`, and exits zero for those forms.

## Business Rules

* [ ] AC-003: Packed Core and CLI artifacts expose only `.`, contain the
  declared compiled roots and metadata, declare the `forgeflow` bin, and have
  no runtime dependencies except the CLI's exact dependency on Core.

## Failure Cases

* [ ] AC-004: Every other built CLI argument sequence returns the documented
  unavailable-command diagnostic on stderr, no stdout, and exit two.

## Regression Requirements

* [ ] AC-005: The existing private TypeScript example, portable shell suites,
  complete root `make verify` gate, and no-Node portability gate retain their
  behavior; no legacy shell command delegates to Node.

## Acceptance Evidence

| AC | Method | Evidence | Fixture / precondition | Expected observation |
| --- | --- | --- | --- | --- |
| `AC-001` | command | `pnpm install --frozen-lockfile and make verify-tooling` | `checkout with no root node_modules` | `locked install and every workspace package gate exit 0` |
| `AC-002` | test | `tests/typescript-tooling.sh TST001-AC-002` | `built CLI invoked through its emitted executable` | `all help and version forms emit exact documented stdout and exit 0` |
| `AC-003` | test | `tests/typescript-tooling.sh TST001-AC-003` | `fresh Core and CLI tarballs` | `contents, root-only exports, bin metadata, and dependency direction match the contract` |
| `AC-004` | test | `tests/typescript-tooling.sh TST001-AC-004` | `built CLI receives representative command, option, and multi-token arguments` | `each invocation emits only the unavailable diagnostic and exits 2` |
| `AC-005` | command | `make verify and make verify-portability` | `complete working tree with existing example and shell fixtures` | `both commands exit 0 and legacy shell sources contain no Node delegation` |

## Verification Notes

Root `make verify` remains authoritative. Run the root frozen install before
the workspace gate, then run the independent portability target because it is
intentionally not part of the canonical gate. TST-001 cases use
`TST001-AC-*` identifiers.
