#!/bin/sh

set -eu

fail() {
  printf 'bootstrap test failed: %s\n' "$1" >&2
  exit 1
}

expect_exit_status() {
  forgeflow_expected_status=$1
  shift

  if "$@" >/dev/null 2>&1; then
    forgeflow_actual_status=0
  else
    forgeflow_actual_status=$?
  fi

  if [ "$forgeflow_actual_status" -ne "$forgeflow_expected_status" ]; then
    fail "expected exit $forgeflow_expected_status, got $forgeflow_actual_status: $*"
  fi
}

inode() {
  # POSIX does not provide an inode query utility; test paths are controlled.
  # shellcheck disable=SC2012
  ls -di "$1" | awk '{ print $1 }'
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
forgeflow_fresh_canonical=$(cd -P "$forgeflow_fresh" >/dev/null 2>&1 && pwd)

forgeflow_dry_output=$("$forgeflow_repo/scripts/bootstrap" --dry-run "$forgeflow_fresh")

for forgeflow_relative_path in \
  AGENTS.md \
  specs/stories/_template/story.md \
  specs/stories/_template/acceptance.md \
  specs/stories/_template/task.md
do
  printf '%s\n' "$forgeflow_dry_output" | grep "Would install $forgeflow_fresh_canonical/$forgeflow_relative_path" \
    >/dev/null || fail "dry run did not report $forgeflow_relative_path"
done

forgeflow_fresh_directory_count=$(find "$forgeflow_fresh" -type d | wc -l | tr -d ' ')
if [ "$forgeflow_fresh_directory_count" -ne 1 ]; then
  fail "dry run created directories in an empty target"
fi

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

forgeflow_force_dry_output=$("$forgeflow_repo/scripts/bootstrap" --force --dry-run "$forgeflow_fresh")
forgeflow_reverse_force_dry_output=$("$forgeflow_repo/scripts/bootstrap" --dry-run --force "$forgeflow_fresh")

for forgeflow_relative_path in \
  AGENTS.md \
  specs/stories/_template/story.md \
  specs/stories/_template/acceptance.md \
  specs/stories/_template/task.md
do
  printf '%s\n' "$forgeflow_force_dry_output" | grep "Would replace $forgeflow_fresh_canonical/$forgeflow_relative_path" \
    >/dev/null || fail "--force --dry-run did not preview replacement of $forgeflow_relative_path"
  printf '%s\n' "$forgeflow_reverse_force_dry_output" | grep "Would replace $forgeflow_fresh_canonical/$forgeflow_relative_path" \
    >/dev/null || fail "--dry-run --force did not preview replacement of $forgeflow_relative_path"
done

cmp "$forgeflow_repo/templates/AGENTS.md" "$forgeflow_fresh/AGENTS.md" >/dev/null ||
  fail "force dry run changed AGENTS.md"

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

  expect_exit_status 1 "$forgeflow_repo/scripts/bootstrap" --dry-run "$forgeflow_conflict"

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

expect_exit_status 1 "$forgeflow_repo/scripts/bootstrap" --dry-run --force "$forgeflow_symlink"

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

expect_exit_status 1 "$forgeflow_repo/scripts/bootstrap" --force --dry-run "$forgeflow_parent_symlink"

if [ -e "$forgeflow_outside/stories" ]; then
  fail "bootstrap wrote through a managed parent symlink"
fi

if [ ! -L "$forgeflow_parent_symlink/specs" ]; then
  fail "dry run changed a managed parent symlink"
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

expect_exit_status 1 "$forgeflow_repo/scripts/bootstrap" --dry-run --force "$forgeflow_leaf_symlink"

if [ "$(sed -n '1p' "$forgeflow_outside_guide")" != "outside guide" ]; then
  fail "dry run changed a file outside the target through a symlink"
fi

forgeflow_outside_hardlink="$forgeflow_test_dir/outside-hardlink"
forgeflow_hardlink="$forgeflow_test_dir/hardlink"
mkdir -p "$forgeflow_hardlink"
printf 'outside hard link\n' >"$forgeflow_outside_hardlink"
ln "$forgeflow_outside_hardlink" "$forgeflow_hardlink/AGENTS.md"
forgeflow_hardlink_outside_inode_before=$(inode "$forgeflow_outside_hardlink")
forgeflow_hardlink_target_inode_before=$(inode "$forgeflow_hardlink/AGENTS.md")

if [ "$forgeflow_hardlink_outside_inode_before" != \
  "$forgeflow_hardlink_target_inode_before" ]; then
  fail "hard-link fixture did not share an inode before dry run"
fi

"$forgeflow_repo/scripts/bootstrap" --dry-run --force "$forgeflow_hardlink" >/dev/null

forgeflow_hardlink_outside_inode_after=$(inode "$forgeflow_outside_hardlink")
forgeflow_hardlink_target_inode_after=$(inode "$forgeflow_hardlink/AGENTS.md")

if [ "$forgeflow_hardlink_outside_inode_after" != \
  "$forgeflow_hardlink_outside_inode_before" ] || \
  [ "$forgeflow_hardlink_target_inode_after" != \
  "$forgeflow_hardlink_target_inode_before" ] || \
  [ "$forgeflow_hardlink_outside_inode_after" != \
  "$forgeflow_hardlink_target_inode_after" ]; then
  fail "dry run changed the hard-link inode relationship"
fi

if [ "$(sed -n '1p' "$forgeflow_outside_hardlink")" != \
  "outside hard link" ]; then
  fail "dry run changed data outside the target through a hard link"
fi

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

forgeflow_wrong_type="$forgeflow_test_dir/wrong-type"
mkdir -p "$forgeflow_wrong_type/AGENTS.md"
expect_exit_status 1 "$forgeflow_repo/scripts/bootstrap" "$forgeflow_wrong_type"
expect_exit_status 1 "$forgeflow_repo/scripts/bootstrap" --dry-run --force "$forgeflow_wrong_type"

if [ ! -d "$forgeflow_wrong_type/AGENTS.md" ]; then
  fail "dry run changed a managed path with the wrong file type"
fi

expect_exit_status 2 "$forgeflow_repo/scripts/bootstrap" --unknown "$forgeflow_fresh"
expect_exit_status 2 "$forgeflow_repo/scripts/bootstrap" -x "$forgeflow_fresh"
expect_exit_status 2 "$forgeflow_repo/scripts/bootstrap" --dry-run --dry-run "$forgeflow_fresh"
expect_exit_status 2 "$forgeflow_repo/scripts/bootstrap" --force --force "$forgeflow_fresh"
expect_exit_status 2 "$forgeflow_repo/scripts/bootstrap" "$forgeflow_fresh" --dry-run
expect_exit_status 2 "$forgeflow_repo/scripts/bootstrap" "$forgeflow_fresh" "$forgeflow_conflict"
expect_exit_status 2 "$forgeflow_repo/scripts/bootstrap" --dry-run "$forgeflow_test_dir/missing"

printf 'bootstrap tests passed\n'
