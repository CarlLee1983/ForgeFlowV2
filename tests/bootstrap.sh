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

trap cleanup EXIT
trap 'exit 1' HUP INT TERM

forgeflow_repo=$(
  cd -P "$(dirname "$0")/.." >/dev/null 2>&1
  pwd
)
forgeflow_fresh="$forgeflow_test_dir/fresh"

mkdir -p "$forgeflow_fresh"

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

forgeflow_conflict_number=0

for forgeflow_relative_path in \
  AGENTS.md \
  specs/stories/_template/story.md \
  specs/stories/_template/acceptance.md \
  specs/stories/_template/task.md
do
  forgeflow_conflict_number=$((forgeflow_conflict_number + 1))
  forgeflow_conflict="$forgeflow_test_dir/conflict-$forgeflow_conflict_number"
  forgeflow_existing="$forgeflow_conflict/$forgeflow_relative_path"

  mkdir -p "$(dirname "$forgeflow_existing")"
  printf 'preserve existing file\n' >"$forgeflow_existing"

  if "$forgeflow_repo/scripts/bootstrap" "$forgeflow_conflict" >/dev/null 2>&1; then
    fail "existing $forgeflow_relative_path did not block installation"
  fi

  if [ "$(sed -n '1p' "$forgeflow_existing")" != \
    "preserve existing file" ]; then
    fail "a refused install changed $forgeflow_relative_path"
  fi

  forgeflow_file_count=$(find "$forgeflow_conflict" -type f | wc -l | tr -d ' ')
  if [ "$forgeflow_file_count" -ne 1 ]; then
    fail "a conflict at $forgeflow_relative_path allowed partial writes"
  fi
done

forgeflow_symlink="$forgeflow_test_dir/symlink-conflict"
mkdir -p "$forgeflow_symlink"
ln -s "$forgeflow_test_dir/missing-guide" "$forgeflow_symlink/AGENTS.md"

if "$forgeflow_repo/scripts/bootstrap" "$forgeflow_symlink" >/dev/null 2>&1; then
  fail "a dangling AGENTS.md symlink did not block installation"
fi

if "$forgeflow_repo/scripts/bootstrap" --force "$forgeflow_symlink" \
  >/dev/null 2>&1; then
  fail "--force followed a dangling AGENTS.md symlink"
fi

if [ ! -L "$forgeflow_symlink/AGENTS.md" ]; then
  fail "a refused install changed a dangling AGENTS.md symlink"
fi

forgeflow_outside="$forgeflow_test_dir/outside"
forgeflow_parent_symlink="$forgeflow_test_dir/parent-symlink"
mkdir -p "$forgeflow_outside" "$forgeflow_parent_symlink"
ln -s "$forgeflow_outside" "$forgeflow_parent_symlink/specs"

if "$forgeflow_repo/scripts/bootstrap" "$forgeflow_parent_symlink" \
  >/dev/null 2>&1; then
  fail "a managed parent symlink did not block installation"
fi

if "$forgeflow_repo/scripts/bootstrap" --force "$forgeflow_parent_symlink" \
  >/dev/null 2>&1; then
  fail "--force followed a managed parent symlink"
fi

if [ -e "$forgeflow_outside/stories" ]; then
  fail "bootstrap wrote through a managed parent symlink"
fi

forgeflow_outside_guide="$forgeflow_test_dir/outside-guide"
forgeflow_leaf_symlink="$forgeflow_test_dir/leaf-symlink"
mkdir -p "$forgeflow_leaf_symlink"
printf 'outside guide\n' >"$forgeflow_outside_guide"
ln -s "$forgeflow_outside_guide" "$forgeflow_leaf_symlink/AGENTS.md"

if "$forgeflow_repo/scripts/bootstrap" --force "$forgeflow_leaf_symlink" \
  >/dev/null 2>&1; then
  fail "--force followed a managed file symlink"
fi

if [ "$(sed -n '1p' "$forgeflow_outside_guide")" != "outside guide" ]; then
  fail "bootstrap changed a file outside the target through a symlink"
fi

forgeflow_outside_hardlink="$forgeflow_test_dir/outside-hardlink"
forgeflow_hardlink="$forgeflow_test_dir/hardlink"
mkdir -p "$forgeflow_hardlink"
printf 'outside hard link\n' >"$forgeflow_outside_hardlink"
ln "$forgeflow_outside_hardlink" "$forgeflow_hardlink/AGENTS.md"

"$forgeflow_repo/scripts/bootstrap" --force "$forgeflow_hardlink"

if [ "$(sed -n '1p' "$forgeflow_outside_hardlink")" != \
  "outside hard link" ]; then
  fail "--force changed data outside the target through a hard link"
fi

cmp "$forgeflow_repo/templates/AGENTS.md" \
  "$forgeflow_hardlink/AGENTS.md" >/dev/null ||
  fail "--force did not replace the target-side hard link"

"$forgeflow_repo/scripts/bootstrap" --force "$forgeflow_conflict"

cmp "$forgeflow_repo/templates/AGENTS.md" \
  "$forgeflow_conflict/AGENTS.md" >/dev/null ||
  fail "--force did not replace AGENTS.md"
cmp "$forgeflow_repo/templates/story/story.md" \
  "$forgeflow_conflict/specs/stories/_template/story.md" >/dev/null ||
  fail "--force did not install Story templates"

printf 'bootstrap tests passed\n'
