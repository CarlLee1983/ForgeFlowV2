#!/bin/sh

set -eu

fail() {
  printf 'bootstrap test failed: %s\n' "$1" >&2
  exit 1
}

forgeflow_test_dir=$(mktemp -d "${TMPDIR:-/tmp}/forgeflow-bootstrap.XXXXXX")

cleanup() {
  rm -rf "$forgeflow_test_dir"
}

trap cleanup EXIT HUP INT TERM

forgeflow_repo=$(
  cd -P "$(dirname "$0")/.." >/dev/null 2>&1
  pwd
)
forgeflow_fresh="$forgeflow_test_dir/fresh"
forgeflow_conflict="$forgeflow_test_dir/conflict"

mkdir -p "$forgeflow_fresh" "$forgeflow_conflict"

"$forgeflow_repo/scripts/bootstrap" "$forgeflow_fresh"

cmp "$forgeflow_repo/templates/AGENTS.md" \
  "$forgeflow_fresh/AGENTS.md" >/dev/null ||
  fail "AGENTS.md was not installed from the template"
cmp "$forgeflow_repo/templates/story/story.md" \
  "$forgeflow_fresh/specs/stories/_template/story.md" >/dev/null ||
  fail "story.md was not installed from the template"
cmp "$forgeflow_repo/templates/story/acceptance.md" \
  "$forgeflow_fresh/specs/stories/_template/acceptance.md" >/dev/null ||
  fail "acceptance.md was not installed from the template"
cmp "$forgeflow_repo/templates/story/task.md" \
  "$forgeflow_fresh/specs/stories/_template/task.md" >/dev/null ||
  fail "task.md was not installed from the template"

if "$forgeflow_repo/scripts/bootstrap" "$forgeflow_fresh" >/dev/null 2>&1; then
  fail "a second install overwrote managed files without --force"
fi

printf 'preserve existing guide\n' >"$forgeflow_conflict/AGENTS.md"

if "$forgeflow_repo/scripts/bootstrap" "$forgeflow_conflict" >/dev/null 2>&1; then
  fail "an existing AGENTS.md did not block installation"
fi

if [ -e "$forgeflow_conflict/specs" ]; then
  fail "a refused install made partial changes"
fi

if [ "$(sed -n '1p' "$forgeflow_conflict/AGENTS.md")" != \
  "preserve existing guide" ]; then
  fail "a refused install changed AGENTS.md"
fi

"$forgeflow_repo/scripts/bootstrap" --force "$forgeflow_conflict"

cmp "$forgeflow_repo/templates/AGENTS.md" \
  "$forgeflow_conflict/AGENTS.md" >/dev/null ||
  fail "--force did not replace AGENTS.md"
cmp "$forgeflow_repo/templates/story/story.md" \
  "$forgeflow_conflict/specs/stories/_template/story.md" >/dev/null ||
  fail "--force did not install Story templates"

printf 'bootstrap tests passed\n'
