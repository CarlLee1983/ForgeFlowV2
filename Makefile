.PHONY: verify verify-protocol verify-bootstrap verify-typescript verify-go

verify: verify-protocol verify-bootstrap verify-typescript verify-go

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
