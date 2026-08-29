# Go verification example

This small project demonstrates the ForgeFlow repository contract with Go 1.25
or later. Download the declared tool dependency, then run the canonical gate:

```sh
go mod download
make verify
```

`make verify` checks `gofmt`, `go vet`,
Staticcheck, the order-total Story traceability check, and behavioral tests.
Staticcheck and the repository's Actionlint command are declared as Go tool
dependencies so the repository controls their verification versions.

Go is an illustrative adapter: ForgeFlow does not require this language, this
directory layout, or this script implementation. The portable pattern is to
give each automated acceptance criterion a stable identifier and put that
identifier in its executable test.

The complete example Story is in
[`specs/stories/ORD-001-order-total`](specs/stories/ORD-001-order-total/).
Run its focused mapping check with:

```sh
make traceability
```

The check compares the acceptance IDs with the IDs in Go test and subtest
names. It rejects missing, duplicate, and unmapped IDs; it intentionally uses
only the narrow acceptance-list and Go-test-name formats used by this example,
not a general Markdown parser.
