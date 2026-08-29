#!/bin/sh

set -eu

test_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
example_dir=$(CDPATH='' cd -- "$test_dir/.." && pwd)
checker="$example_dir/scripts/check-traceability.sh"
acceptance_file="$example_dir/specs/stories/ORD-001-order-total/acceptance.md"
test_file="$example_dir/order_total_test.go"
fixture_dir=$(mktemp -d "${TMPDIR:-/tmp}/forgeflow-traceability-test.XXXXXX")
trap 'rm -rf "$fixture_dir"' EXIT HUP INT TERM

expect_success() {
	description=$1
	shift
	if ! "$@" >/dev/null 2>&1; then
		printf 'expected success: %s\n' "$description" >&2
		exit 1
	fi
}

expect_failure() {
	description=$1
	shift
	if "$@" >/dev/null 2>&1; then
		printf 'expected failure: %s\n' "$description" >&2
		exit 1
	fi
}

expect_success "the real order-total mapping" "$checker" "$acceptance_file" "$test_file"
expect_failure "a missing acceptance input" "$checker" "$fixture_dir/missing.md" "$test_file"

: >"$fixture_dir/empty-acceptance.md"
expect_failure "an acceptance document with no identifiers" \
	"$checker" "$fixture_dir/empty-acceptance.md" "$test_file"

: >"$fixture_dir/empty-test.go"
expect_failure "a test source with no identifiers" \
	"$checker" "$acceptance_file" "$fixture_dir/empty-test.go"

cp "$acceptance_file" "$fixture_dir/duplicate-acceptance.md"
printf '\n* [ ] AC-01: Duplicate fixture identifier.\n' >>"$fixture_dir/duplicate-acceptance.md"
expect_failure "a duplicate acceptance identifier" \
	"$checker" "$fixture_dir/duplicate-acceptance.md" "$test_file"

cp "$test_file" "$fixture_dir/duplicate-test.go"
printf '\nfunc TestTraceabilityDuplicateID(t *testing.T) {\n\tt.Run("AC-01: duplicate", func(t *testing.T) {})\n}\n' >>"$fixture_dir/duplicate-test.go"
expect_failure "a duplicate executable test identifier" \
	"$checker" "$acceptance_file" "$fixture_dir/duplicate-test.go"

sed 's/AC-06:/AC-09:/' "$test_file" >"$fixture_dir/mismatched-test.go"
expect_failure "mismatched acceptance and test identifier sets" \
	"$checker" "$acceptance_file" "$fixture_dir/mismatched-test.go"

printf 'traceability regression tests passed\n'
