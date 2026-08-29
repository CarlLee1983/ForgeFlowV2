.PHONY: verify verify-protocol verify-bootstrap verify-release verify-typescript verify-go verify-actions release-check

verify: verify-protocol verify-bootstrap verify-release verify-typescript verify-go verify-actions

release-check: verify
	./scripts/release-check

verify-protocol:
	sh -n tests/protocol.sh
	./tests/protocol.sh

verify-bootstrap:
	sh -n scripts/bootstrap tests/bootstrap.sh
	./tests/bootstrap.sh

verify-release:
	sh -n scripts/release-check tests/release-check.sh
	./tests/release-check.sh

verify-typescript:
	$(MAKE) -C examples/typescript verify

verify-go:
	$(MAKE) -C examples/go verify

verify-actions:
	go -C examples/go tool actionlint \
		../../templates/ci/github-actions.yml ../../.github/workflows/verify.yml
