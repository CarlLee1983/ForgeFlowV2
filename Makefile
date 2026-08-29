.PHONY: verify verify-bootstrap verify-typescript

verify: verify-bootstrap verify-typescript

verify-bootstrap:
	sh -n scripts/bootstrap tests/bootstrap.sh
	./tests/bootstrap.sh

verify-typescript:
	$(MAKE) -C examples/typescript verify
