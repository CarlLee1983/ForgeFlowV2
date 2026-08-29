.PHONY: verify format-check vet staticcheck test

verify: format-check vet staticcheck test

format-check:
	@unformatted="$$(gofmt -l *.go)"; \
	if [ -n "$$unformatted" ]; then \
		printf 'Go files require formatting:\n%s\n' "$$unformatted" >&2; \
		exit 1; \
	fi

vet:
	go vet ./...

staticcheck:
	go tool staticcheck ./...

test:
	go test ./...
