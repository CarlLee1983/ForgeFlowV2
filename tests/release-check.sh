#!/bin/sh

set -eu

fail() {
  printf 'release-check test failed: %s\n' "$1" >&2
  exit 1
}

forgeflow_repo=$(
  cd -P "$(dirname "$0")/.." >/dev/null 2>&1
  pwd
)
release_script="$forgeflow_repo/scripts/release-check"
release_test_dir=$(mktemp -d "${TMPDIR:-/tmp}/forgeflow-release.XXXXXX")
outside_directory="$release_test_dir/outside"
fixture_global_config="$release_test_dir/global.gitconfig"
disabled_hooks_directory="$release_test_dir/disabled-hooks"
hostile_hooks_directory="$release_test_dir/hostile-hooks"
hostile_hook_marker="$release_test_dir/hostile-hook-ran"
mkdir "$outside_directory" "$disabled_hooks_directory" "$hostile_hooks_directory"

cat >"$hostile_hooks_directory/pre-commit" <<EOF
#!/bin/sh

printf 'hostile hook ran\n' >'$hostile_hook_marker'
exit 1
EOF
chmod +x "$hostile_hooks_directory/pre-commit"

git config --file "$fixture_global_config" core.hooksPath "$hostile_hooks_directory"
git config --file "$fixture_global_config" commit.gpgSign true

GIT_CONFIG_GLOBAL="$fixture_global_config"
GIT_CONFIG_NOSYSTEM=1
GIT_CONFIG_COUNT=3
GIT_CONFIG_KEY_0='core.hooksPath'
GIT_CONFIG_VALUE_0="$disabled_hooks_directory"
GIT_CONFIG_KEY_1='commit.gpgSign'
GIT_CONFIG_VALUE_1='false'
GIT_CONFIG_KEY_2='tag.gpgSign'
GIT_CONFIG_VALUE_2='false'
export GIT_CONFIG_GLOBAL GIT_CONFIG_NOSYSTEM GIT_CONFIG_COUNT
export GIT_CONFIG_KEY_0 GIT_CONFIG_VALUE_0
export GIT_CONFIG_KEY_1 GIT_CONFIG_VALUE_1
export GIT_CONFIG_KEY_2 GIT_CONFIG_VALUE_2

forgeflow_head_before=$(git -C "$forgeflow_repo" rev-parse HEAD)
forgeflow_refs_before=$(git -C "$forgeflow_repo" for-each-ref --format='%(refname) %(objectname)')
forgeflow_status_before=$(git -C "$forgeflow_repo" status --porcelain=v1 --untracked-files=all --ignore-submodules=none)
forgeflow_remotes_before=$(git -C "$forgeflow_repo" remote -v)

cleanup_release_tests() {
  rm -rf "$release_test_dir"
}

trap cleanup_release_tests EXIT
trap 'exit 1' HUP INT TERM

commit_fixture() {
  fixture_repo=$1
  fixture_message=$2

  git -C "$fixture_repo" \
    -c user.name='ForgeFlow Tests' \
    -c user.email='forgeflow-tests@example.invalid' \
    commit -q -m "$fixture_message"
}

new_fixture() {
  fixture_name=$1
  fixture="$release_test_dir/$fixture_name"

  mkdir -p "$fixture/scripts"
  cp "$release_script" "$fixture/scripts/release-check"
  chmod +x "$fixture/scripts/release-check"
  printf '0.2.1\n' >"$fixture/VERSION"
  printf 'tracked fixture\n' >"$fixture/tracked.txt"
  cat >"$fixture/Makefile" <<'EOF'
.PHONY: verify release-check

verify:
	@:

release-check: verify
	@./scripts/release-check
EOF

  git -C "$fixture" init -q
  git -C "$fixture" add Makefile VERSION scripts/release-check tracked.txt
  commit_fixture "$fixture" 'fixture baseline'
}

run_checker() {
  checked_repo=$1
  shift
  command_status=0

  (
    cd "$outside_directory"
    "$checked_repo/scripts/release-check" "$@"
  ) >"$release_test_dir/stdout" 2>"$release_test_dir/stderr" ||
    command_status=$?
}

run_make_check() {
  checked_repo=$1
  command_status=0

  make -C "$checked_repo" release-check \
    >"$release_test_dir/stdout" 2>"$release_test_dir/stderr" ||
    command_status=$?
}

expect_success() {
  fixture_label=$1

  if [ "$command_status" -ne 0 ]; then
    sed -n '1,80p' "$release_test_dir/stderr" >&2
    fail "$fixture_label unexpectedly failed"
  fi
}

expect_failure() {
  fixture_label=$1
  expected_diagnostic=$2

  if [ "$command_status" -eq 0 ]; then
    fail "$fixture_label unexpectedly passed"
  fi

  if ! grep -Fq "$expected_diagnostic" \
    "$release_test_dir/stdout" "$release_test_dir/stderr"; then
    sed -n '1,80p' "$release_test_dir/stdout" >&2
    sed -n '1,80p' "$release_test_dir/stderr" >&2
    fail "$fixture_label did not report: $expected_diagnostic"
  fi
}

expect_output() {
  fixture_label=$1
  expected_output=$2

  grep -Fq "$expected_output" "$release_test_dir/stdout" ||
    fail "$fixture_label did not output: $expected_output"
}

expect_dirty_failure() {
  fixture_label=$1
  dirty_repo=$2

  run_checker "$dirty_repo"
  expect_failure "$fixture_label" 'worktree is not clean'
}

new_fixture 'clean-untagged'
clean_fixture=$fixture
clean_head=$(git -C "$clean_fixture" rev-parse HEAD)
clean_refs_before=$(git -C "$clean_fixture" for-each-ref --format='%(refname) %(objectname)')
clean_status_before=$(git -C "$clean_fixture" status --porcelain=v1 --untracked-files=all --ignore-submodules=none)
clean_index_before=$(cksum <"$clean_fixture/.git/index")
clean_config_before=$(cksum <"$clean_fixture/.git/config")

run_checker "$clean_fixture"
expect_success 'clean untagged candidate'
expect_output 'clean untagged candidate' 'version=0.2.1'
expect_output 'clean untagged candidate' "commit=$clean_head"
expect_output 'clean untagged candidate' 'expected_tag=v0.2.1'
expect_output 'clean untagged candidate' 'local_tag=absent'
expect_output 'clean untagged candidate' 'remote_checks=not-performed'

[ "$clean_head" = "$(git -C "$clean_fixture" rev-parse HEAD)" ] ||
  fail 'checker changed HEAD'
[ "$clean_refs_before" = "$(git -C "$clean_fixture" for-each-ref --format='%(refname) %(objectname)')" ] ||
  fail 'checker changed refs'
[ "$clean_status_before" = "$(git -C "$clean_fixture" status --porcelain=v1 --untracked-files=all --ignore-submodules=none)" ] ||
  fail 'checker changed worktree state'
[ "$clean_index_before" = "$(cksum <"$clean_fixture/.git/index")" ] ||
  fail 'checker changed the index'
[ "$clean_config_before" = "$(cksum <"$clean_fixture/.git/config")" ] ||
  fail 'checker changed repository configuration'

run_checker "$clean_fixture" '--help'
[ "$command_status" -eq 2 ] || fail 'invalid invocation did not exit 2'
expect_failure 'invalid invocation' 'takes no arguments'

run_make_check "$clean_fixture"
expect_success 'Make release-check interface'
expect_output 'Make release-check interface' 'local_tag=absent'

new_fixture 'lightweight-tag'
lightweight_fixture=$fixture
git -C "$lightweight_fixture" tag v0.2.1
run_checker "$lightweight_fixture"
expect_success 'same-HEAD lightweight tag'
expect_output 'same-HEAD lightweight tag' 'local_tag=same-head'

new_fixture 'annotated-tag'
annotated_fixture=$fixture
git -C "$annotated_fixture" \
  -c user.name='ForgeFlow Tests' \
  -c user.email='forgeflow-tests@example.invalid' \
  tag -a v0.2.1 -m 'fixture release'
run_checker "$annotated_fixture"
expect_success 'same-HEAD annotated tag'
expect_output 'same-HEAD annotated tag' 'local_tag=same-head'

new_fixture 'wrong-target-tag'
wrong_target_fixture=$fixture
git -C "$wrong_target_fixture" tag v0.2.1
printf 'second commit\n' >>"$wrong_target_fixture/tracked.txt"
git -C "$wrong_target_fixture" add tracked.txt
commit_fixture "$wrong_target_fixture" 'advance fixture'
run_checker "$wrong_target_fixture"
expect_failure 'expected tag on another commit' 'expected tag does not resolve to HEAD'

new_fixture 'non-commit-tag'
non_commit_fixture=$fixture
non_commit_object=$(printf 'not a commit\n' | git -C "$non_commit_fixture" hash-object -w --stdin)
git -C "$non_commit_fixture" update-ref refs/tags/v0.2.1 "$non_commit_object"
run_checker "$non_commit_fixture"
expect_failure 'expected tag on non-commit object' 'expected tag does not resolve to a commit'

new_fixture 'mismatched-tag'
mismatched_fixture=$fixture
git -C "$mismatched_fixture" tag v0.2.0
run_checker "$mismatched_fixture"
expect_failure 'mismatched release tag' 'different release tag points to HEAD: v0.2.0'

new_fixture 'ambiguous-branch-and-tag'
ambiguous_ref_fixture=$fixture
git -C "$ambiguous_ref_fixture" branch v0.2.0
git -C "$ambiguous_ref_fixture" tag v0.2.0
run_checker "$ambiguous_ref_fixture"
expect_failure 'same-name branch and mismatched tag' 'different release tag points to HEAD: v0.2.0'

for version_fixture in missing empty multiline unterminated-extra prefixed leading-zero
do
  new_fixture "version-$version_fixture"
  invalid_version_fixture=$fixture

  case "$version_fixture" in
    missing)
      rm "$invalid_version_fixture/VERSION"
      ;;
    empty)
      : >"$invalid_version_fixture/VERSION"
      ;;
    multiline)
      printf '0.2.1\nextra\n' >"$invalid_version_fixture/VERSION"
      ;;
    unterminated-extra)
      printf '0.2.1\nextra' >"$invalid_version_fixture/VERSION"
      ;;
    prefixed)
      printf 'v0.2.1\n' >"$invalid_version_fixture/VERSION"
      ;;
    leading-zero)
      printf '0.02.1\n' >"$invalid_version_fixture/VERSION"
      ;;
  esac

  git -C "$invalid_version_fixture" add -A
  commit_fixture "$invalid_version_fixture" "invalid VERSION: $version_fixture"
  run_checker "$invalid_version_fixture"
  expect_failure "invalid VERSION: $version_fixture" 'VERSION'
done

non_git_fixture="$release_test_dir/non-git"
mkdir -p "$non_git_fixture/scripts"
cp "$release_script" "$non_git_fixture/scripts/release-check"
chmod +x "$non_git_fixture/scripts/release-check"
printf '0.2.1\n' >"$non_git_fixture/VERSION"
run_checker "$non_git_fixture"
expect_failure 'non-Git directory' 'repository is not a Git worktree'

unborn_fixture="$release_test_dir/unborn"
mkdir -p "$unborn_fixture/scripts"
cp "$release_script" "$unborn_fixture/scripts/release-check"
chmod +x "$unborn_fixture/scripts/release-check"
printf '0.2.1\n' >"$unborn_fixture/VERSION"
git -C "$unborn_fixture" init -q
run_checker "$unborn_fixture"
expect_failure 'unborn repository' 'HEAD does not resolve to a commit'

new_fixture 'assume-unchanged-version'
assume_unchanged_fixture=$fixture
git -C "$assume_unchanged_fixture" update-index --assume-unchanged VERSION
printf '9.9.9\n' >"$assume_unchanged_fixture/VERSION"
run_checker "$assume_unchanged_fixture"
expect_failure 'assume-unchanged VERSION' 'index contains assume-unchanged or skip-worktree entries'

new_fixture 'skip-worktree-version'
skip_worktree_fixture=$fixture
git -C "$skip_worktree_fixture" update-index --skip-worktree VERSION
printf '9.9.9\n' >"$skip_worktree_fixture/VERSION"
run_checker "$skip_worktree_fixture"
expect_failure 'skip-worktree VERSION' 'index contains assume-unchanged or skip-worktree entries'

new_fixture 'ignored-untracked-version'
ignored_version_fixture=$fixture
git -C "$ignored_version_fixture" rm -q --cached VERSION
printf 'VERSION\n' >"$ignored_version_fixture/.gitignore"
git -C "$ignored_version_fixture" add .gitignore
commit_fixture "$ignored_version_fixture" 'ignore untracked VERSION'
run_checker "$ignored_version_fixture"
expect_failure 'ignored untracked VERSION' 'VERSION is not committed at HEAD'

new_fixture 'replacement-ref'
replacement_fixture=$fixture
replacement_original_head=$(git -C "$replacement_fixture" rev-parse HEAD)
printf '9.9.9\n' >"$replacement_fixture/VERSION"
git -C "$replacement_fixture" add VERSION
replacement_tree=$(git -C "$replacement_fixture" write-tree)
replacement_commit=$(
  printf 'replacement commit\n' |
    git -C "$replacement_fixture" \
      -c user.name='ForgeFlow Tests' \
      -c user.email='forgeflow-tests@example.invalid' \
      commit-tree "$replacement_tree"
)
git -C "$replacement_fixture" replace \
  "$replacement_original_head" "$replacement_commit"
replacement_raw_version=$(
  GIT_NO_REPLACE_OBJECTS=1 \
    git -C "$replacement_fixture" show 'HEAD:VERSION'
)
[ "$replacement_raw_version" = '0.2.1' ] ||
  fail 'replacement fixture did not preserve the raw committed VERSION'
run_checker "$replacement_fixture"
expect_failure 'replacement ref' 'working VERSION does not match committed HEAD'

fsmonitor_hook="$release_test_dir/fsmonitor-hook"
fsmonitor_marker="$release_test_dir/fsmonitor-ran"
cat >"$fsmonitor_hook" <<'EOF'
#!/bin/sh

printf 'fsmonitor ran\n' >"$FF205_FSMONITOR_MARKER"
printf '\n'
EOF
chmod +x "$fsmonitor_hook"

new_fixture 'fsmonitor-configured'
fsmonitor_fixture=$fixture
git -C "$fsmonitor_fixture" config core.fsmonitor "$fsmonitor_hook"
FF205_FSMONITOR_MARKER=$fsmonitor_marker
export FF205_FSMONITOR_MARKER
run_checker "$fsmonitor_fixture"
expect_success 'configured filesystem monitor'
[ ! -e "$fsmonitor_marker" ] ||
  fail 'checker executed the configured filesystem monitor'
unset FF205_FSMONITOR_MARKER

new_fixture 'dirty-staged'
dirty_staged_fixture=$fixture
printf 'staged change\n' >>"$dirty_staged_fixture/tracked.txt"
git -C "$dirty_staged_fixture" add tracked.txt
expect_dirty_failure 'staged change' "$dirty_staged_fixture"

new_fixture 'dirty-unstaged'
dirty_unstaged_fixture=$fixture
printf 'unstaged change\n' >>"$dirty_unstaged_fixture/tracked.txt"
expect_dirty_failure 'unstaged change' "$dirty_unstaged_fixture"

new_fixture 'dirty-untracked'
dirty_untracked_fixture=$fixture
printf 'untracked change\n' >"$dirty_untracked_fixture/untracked.txt"
expect_dirty_failure 'untracked file' "$dirty_untracked_fixture"

new_fixture 'dirty-deleted'
dirty_deleted_fixture=$fixture
rm "$dirty_deleted_fixture/tracked.txt"
expect_dirty_failure 'deleted file' "$dirty_deleted_fixture"

new_fixture 'dirty-renamed'
dirty_renamed_fixture=$fixture
mv "$dirty_renamed_fixture/tracked.txt" "$dirty_renamed_fixture/renamed.txt"
git -C "$dirty_renamed_fixture" add -A
expect_dirty_failure 'renamed file' "$dirty_renamed_fixture"

new_fixture 'dirty-conflict'
dirty_conflict_fixture=$fixture
base_branch=$(git -C "$dirty_conflict_fixture" symbolic-ref --short HEAD)
git -C "$dirty_conflict_fixture" checkout -q -b conflict-side
printf 'side\n' >"$dirty_conflict_fixture/conflict.txt"
git -C "$dirty_conflict_fixture" add conflict.txt
commit_fixture "$dirty_conflict_fixture" 'side conflict'
git -C "$dirty_conflict_fixture" checkout -q "$base_branch"
printf 'main\n' >"$dirty_conflict_fixture/conflict.txt"
git -C "$dirty_conflict_fixture" add conflict.txt
commit_fixture "$dirty_conflict_fixture" 'main conflict'
if git -C "$dirty_conflict_fixture" \
  -c user.name='ForgeFlow Tests' \
  -c user.email='forgeflow-tests@example.invalid' \
  merge conflict-side >/dev/null 2>&1; then
  fail 'conflict fixture merged without a conflict'
fi
expect_dirty_failure 'conflicted file' "$dirty_conflict_fixture"

submodule_source="$release_test_dir/submodule-source"
mkdir "$submodule_source"
git -C "$submodule_source" init -q
printf 'submodule baseline\n' >"$submodule_source/content.txt"
git -C "$submodule_source" add content.txt
commit_fixture "$submodule_source" 'submodule baseline'

new_fixture 'dirty-submodule'
dirty_submodule_fixture=$fixture
git -C "$dirty_submodule_fixture" -c protocol.file.allow=always \
  submodule add -q "$submodule_source" module
git -C "$dirty_submodule_fixture" add .gitmodules module
commit_fixture "$dirty_submodule_fixture" 'add submodule'
printf 'dirty submodule\n' >>"$dirty_submodule_fixture/module/content.txt"
expect_dirty_failure 'dirty submodule' "$dirty_submodule_fixture"

real_git=$(command -v git)
lazy_guard_bin="$release_test_dir/lazy-guard-bin"
lazy_guard_marker="$release_test_dir/lazy-fetch-was-enabled"
mkdir "$lazy_guard_bin"
cat >"$lazy_guard_bin/git" <<'EOF'
#!/bin/sh

if [ "${GIT_NO_LAZY_FETCH:-}" != '1' ]; then
  printf 'lazy fetch was enabled\n' >"$LAZY_GUARD_MARKER"
fi

exec "$REAL_GIT" "$@"
EOF
chmod +x "$lazy_guard_bin/git"

new_fixture 'lazy-fetch-environment'
lazy_guard_fixture=$fixture
command_status=0
(
  cd "$outside_directory"
  env PATH="$lazy_guard_bin:$PATH" \
    REAL_GIT="$real_git" \
    LAZY_GUARD_MARKER="$lazy_guard_marker" \
    "$lazy_guard_fixture/scripts/release-check"
) >"$release_test_dir/stdout" 2>"$release_test_dir/stderr" ||
  command_status=$?
expect_success 'lazy-fetch environment guard'
[ ! -e "$lazy_guard_marker" ] ||
  fail 'checker Git commands permitted lazy fetching'

new_fixture 'promisor-missing-version'
promisor_fixture=$fixture
promisor_blob=$(git -C "$promisor_fixture" rev-parse HEAD:VERSION)
promisor_object_directory=$(printf '%s\n' "$promisor_blob" | cut -c 1-2)
promisor_object_name=$(printf '%s\n' "$promisor_blob" | cut -c 3-)
promisor_object_path="$promisor_fixture/.git/objects/$promisor_object_directory/$promisor_object_name"
[ -f "$promisor_object_path" ] || fail 'promisor fixture VERSION blob is not loose'
mv "$promisor_object_path" "$release_test_dir/promisor-version-blob"
git -C "$promisor_fixture" config core.repositoryFormatVersion 1
git -C "$promisor_fixture" config extensions.partialClone origin
git -C "$promisor_fixture" config remote.origin.promisor true
git -C "$promisor_fixture" config remote.origin.partialCloneFilter blob:none
git -C "$promisor_fixture" config remote.origin.url "$release_test_dir/missing-promisor-remote"
promisor_trace="$release_test_dir/promisor.trace"
command_status=0
(
  cd "$outside_directory"
  GIT_TRACE="$promisor_trace"
  export GIT_TRACE
  "$promisor_fixture/scripts/release-check"
) >"$release_test_dir/stdout" 2>"$release_test_dir/stderr" ||
  command_status=$?
expect_failure 'missing promisor VERSION blob' 'committed VERSION'
if grep -Eq 'git (fetch|fetch-pack|upload-pack)|run_command:.*(fetch|fetch-pack|upload-pack)' \
  "$promisor_trace"; then
  fail 'checker attempted lazy fetch for a missing promisor object'
fi

concurrent_bin="$release_test_dir/concurrent-bin"
concurrent_marker="$release_test_dir/concurrent-tag-created"
mkdir "$concurrent_bin"
cat >"$concurrent_bin/git" <<'EOF'
#!/bin/sh

is_tag_snapshot=false
for git_argument in "$@"
do
  if [ "$git_argument" = 'for-each-ref' ]; then
    is_tag_snapshot=true
  fi
done

"$REAL_GIT" "$@"
git_status=$?

if [ "$is_tag_snapshot" = true ] && [ ! -e "$CONCURRENT_MARKER" ]; then
  printf 'created\n' >"$CONCURRENT_MARKER"
  "$REAL_GIT" -C "$CONCURRENT_REPO" update-ref \
    refs/tags/v0.2.1 "$CONCURRENT_HEAD"
fi

exit "$git_status"
EOF
chmod +x "$concurrent_bin/git"

new_fixture 'concurrent-tag-change'
concurrent_fixture=$fixture
concurrent_head=$(git -C "$concurrent_fixture" rev-parse HEAD)
command_status=0
(
  cd "$outside_directory"
  env PATH="$concurrent_bin:$PATH" \
    REAL_GIT="$real_git" \
    CONCURRENT_MARKER="$concurrent_marker" \
    CONCURRENT_REPO="$concurrent_fixture" \
    CONCURRENT_HEAD="$concurrent_head" \
    "$concurrent_fixture/scripts/release-check"
) >"$release_test_dir/stdout" 2>"$release_test_dir/stderr" ||
  command_status=$?
expect_failure 'concurrent tag change' 'local tags changed during release check'

verify_failure_fixture="$release_test_dir/verify-failure"
mkdir -p "$verify_failure_fixture/scripts"
cat >"$verify_failure_fixture/Makefile" <<'EOF'
.PHONY: verify release-check

verify:
	@false

release-check: verify
	@./scripts/release-check
EOF
cat >"$verify_failure_fixture/scripts/release-check" <<'EOF'
#!/bin/sh

printf 'checker ran\n' >"$(dirname "$0")/../checker-ran"
EOF
chmod +x "$verify_failure_fixture/scripts/release-check"

run_make_check "$verify_failure_fixture"
[ "$command_status" -ne 0 ] || fail 'failing verify prerequisite unexpectedly passed'
[ ! -e "$verify_failure_fixture/checker-ran" ] ||
  fail 'checker ran after verify prerequisite failed'

verify_mutation_fixture="$release_test_dir/verify-mutation"
mkdir -p "$verify_mutation_fixture/scripts"
cp "$release_script" "$verify_mutation_fixture/scripts/release-check"
chmod +x "$verify_mutation_fixture/scripts/release-check"
printf '0.2.1\n' >"$verify_mutation_fixture/VERSION"
printf 'baseline\n' >"$verify_mutation_fixture/tracked.txt"
cat >"$verify_mutation_fixture/Makefile" <<'EOF'
.PHONY: verify release-check

verify:
	@printf 'changed by verify\n' >>tracked.txt

release-check: verify
	@./scripts/release-check
EOF
git -C "$verify_mutation_fixture" init -q
git -C "$verify_mutation_fixture" add Makefile VERSION scripts/release-check tracked.txt
commit_fixture "$verify_mutation_fixture" 'verify mutation fixture'

run_make_check "$verify_mutation_fixture"
expect_failure 'verify-created worktree change' 'worktree is not clean'

[ "$forgeflow_head_before" = "$(git -C "$forgeflow_repo" rev-parse HEAD)" ] ||
  fail 'fixtures changed the ForgeFlow HEAD'
[ "$forgeflow_refs_before" = "$(git -C "$forgeflow_repo" for-each-ref --format='%(refname) %(objectname)')" ] ||
  fail 'fixtures changed ForgeFlow refs'
[ "$forgeflow_status_before" = "$(git -C "$forgeflow_repo" status --porcelain=v1 --untracked-files=all --ignore-submodules=none)" ] ||
  fail 'fixtures changed the ForgeFlow worktree state'
[ "$forgeflow_remotes_before" = "$(git -C "$forgeflow_repo" remote -v)" ] ||
  fail 'fixtures changed ForgeFlow remotes'
[ ! -e "$hostile_hook_marker" ] ||
  fail 'fixture Git operations executed an inherited hook'

printf 'release-check tests passed\n'
