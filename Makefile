.PHONY: verify verify-protocol verify-bootstrap verify-typescript verify-go verify-actions

verify: verify-protocol verify-bootstrap verify-typescript verify-go verify-actions

verify-protocol:
	sh -n tests/protocol.sh
	./tests/protocol.sh

verify-bootstrap:
	sh -n scripts/bootstrap tests/bootstrap.sh
	./tests/bootstrap.sh

verify-typescript:
	$(MAKE) -C examples/typescript verify

verify-go:
	$(MAKE) -C examples/go verify

verify-actions:
	go -C examples/go tool actionlint \
		../../templates/ci/github-actions.yml ../../.github/workflows/verify.yml
