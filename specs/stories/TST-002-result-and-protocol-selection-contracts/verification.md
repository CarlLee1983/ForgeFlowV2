# Verification Result: TST-002

Recorded after focused contract tests, the complete root gate, and independent
Sol/high Standards and Spec reviews of this working tree. The Story declares
high Risk and high Architecture impact, so the required profile is `lint static
unit integration contract e2e architecture`.

## Checks

* lint: pass — `pnpm run lint`
* static: pass — `pnpm run typecheck`
* unit: pass — `54 built-output node:test cases passed, including result-envelope, Protocol-selector, capability, and serializer cases`
* integration: pass — `TST002-AC-005 installed the packed Core and CLI artifacts into an empty offline consumer and exercised their package-root contracts`
* contract: pass — `negative fixtures reject invalid shapes, result combinations, SemVer values, selectors, subjects, paths, and issues with stable typed results`
* e2e: pass — `make verify`
* architecture: pass — `independent Sol/high Standards and Spec reviews found no unresolved material issue after their requested deltas`

## Evidence

* `AC-001`: pass — `packages/core/test/result-envelope.test.mjs validates all six canonical status, outcome, and exit mappings through the built public Core root`
* `AC-002`: pass — `packages/core/test/result-envelope.test.mjs rejects malformed envelopes, including own undefined optional paths, inherited required issue fields, and C0/C1 path controls`
* `AC-003`: pass — `packages/core/test/protocol-selection.test.mjs resolves current, adopted, and explicit 0.9.0 selectors and returns exact typed errors for missing, malformed, unknown, and unsupported selectors`
* `AC-004`: pass — `packages/cli/test/machine-contract.test.mjs proves immutable exact capabilities, canonical newline-terminated serialization, and Core validation errors for invalid input`
* `AC-005`: pass — `TST002-AC-005 proves packed root-only consumption while TST001 regression cases preserve exact dependencies, exports, executable help/version/unavailable behavior; make verify exits 0`

## Authority Used

* plan
* modify

## Residual Risks

* `the contracts are library APIs only; domain commands remain on the legacy shell result surfaces until their separately authorized migration Stories`
* `the exact supported range intentionally contains only Protocol 0.9.0; adding another implemented Protocol version requires an explicit contract and compatibility change rather than automatic fallback`
