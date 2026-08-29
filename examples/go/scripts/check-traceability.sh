#!/bin/sh

set -eu

example_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
acceptance_file=${1:-"$example_dir/specs/stories/ORD-001-order-total/acceptance.md"}
test_file=${2:-"$example_dir/order_total_test.go"}

if [ ! -f "$acceptance_file" ] || [ ! -f "$test_file" ]; then
	printf 'traceability inputs must exist: %s %s\n' "$acceptance_file" "$test_file" >&2
	exit 1
fi

work_dir=$(mktemp -d "${TMPDIR:-/tmp}/forgeflow-traceability.XXXXXX")
trap 'rm -rf "$work_dir"' EXIT HUP INT TERM

acceptance_ids="$work_dir/acceptance-ids"
test_ids="$work_dir/test-ids"

# This deliberately recognizes only the example's checklist format.
sed -n 's/^[[:space:]]*\* \[ \] \(AC-[0-9][0-9]*\):.*/\1/p' "$acceptance_file" | sort >"$acceptance_ids"
# Test and subtest identifiers are intentionally the first text in their names.
sed -n \
	-e 's/^[[:space:]]*t\.Run("\(AC-[0-9][0-9]*\):.*/\1/p' \
	-e 's/^[[:space:]]*name:[[:space:]]*"\(AC-[0-9][0-9]*\):.*/\1/p' \
	"$test_file" | sort >"$test_ids"

if [ ! -s "$acceptance_ids" ]; then
	printf 'no acceptance identifiers found in %s\n' "$acceptance_file" >&2
	exit 1
fi

if [ ! -s "$test_ids" ]; then
	printf 'no executable test identifiers found in %s\n' "$test_file" >&2
	exit 1
fi

duplicate_acceptance_ids=$(uniq -d "$acceptance_ids")
if [ -n "$duplicate_acceptance_ids" ]; then
	printf 'duplicate acceptance identifiers:\n%s\n' "$duplicate_acceptance_ids" >&2
	exit 1
fi

duplicate_test_ids=$(uniq -d "$test_ids")
if [ -n "$duplicate_test_ids" ]; then
	printf 'duplicate executable test identifiers:\n%s\n' "$duplicate_test_ids" >&2
	exit 1
fi

if ! diff -u "$acceptance_ids" "$test_ids"; then
	printf 'acceptance and executable test identifier sets differ\n' >&2
	exit 1
fi

printf 'traceability passed: %s identifiers\n' "$(wc -l <"$acceptance_ids" | tr -d ' ')"
