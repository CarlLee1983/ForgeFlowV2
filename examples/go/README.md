# Go verification example

This small project demonstrates the ForgeFlow repository contract with Go 1.25
or later. Download the declared tool dependency, then run the canonical gate:

```sh
go mod download
make verify
```

`make verify` checks `gofmt`, `go vet`,
Staticcheck, and behavioral tests. Staticcheck is declared as a Go tool
dependency so the repository controls its verification version.
