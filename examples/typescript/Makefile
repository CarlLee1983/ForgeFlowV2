.PHONY: verify traceability

verify:
	pnpm run format:check
	pnpm run lint
	pnpm run typecheck
	$(MAKE) traceability
	pnpm test

traceability:
	sh -n scripts/check-traceability.sh tests/traceability.sh
	./scripts/check-traceability.sh
	./tests/traceability.sh
