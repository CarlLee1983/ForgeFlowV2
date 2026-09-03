#!/bin/sh

set -eu

fail() {
  printf 'handoff-check test failed [%s]: %s\n' "$forgeflow_case_id" "$1" >&2
  exit 1
}

assert_status() {
  forgeflow_expected_status=$1

  if [ "$forgeflow_command_status" -ne "$forgeflow_expected_status" ]; then
    fail "expected exit $forgeflow_expected_status, got $forgeflow_command_status"
  fi
}

assert_output_contains() {
  grep -Fq -- "$1" "$forgeflow_command_output" ||
    fail "output is missing: $1"
}

assert_output_excludes() {
  if grep -Fq -- "$1" "$forgeflow_command_output"; then
    fail "output must not contain: $1"
  fi
}

run_handoff_check() {
  forgeflow_command_output="$forgeflow_test_dir/$forgeflow_case_id.output"

  if "$forgeflow_handoff_check" "$@" >"$forgeflow_command_output" 2>&1; then
    forgeflow_command_status=0
  else
    forgeflow_command_status=$?
  fi

  for forgeflow_forbidden_claim in APPROVED MERGE_ALLOWED
  do
    if grep -Fq -- "$forgeflow_forbidden_claim" "$forgeflow_command_output"
    then
      fail "handoff check emitted forbidden claim: $forgeflow_forbidden_claim"
    fi
  done
}

run_case() {
  forgeflow_case_id=$1
  forgeflow_case_function=$2

  "$forgeflow_case_function"
  printf 'PASS %s %s\n' "$forgeflow_case_id" "$forgeflow_case_function"
}

new_handoff() {
  forgeflow_handoff_file="$forgeflow_test_dir/$forgeflow_case_id-$1.md"

  cat >"$forgeflow_handoff_file" <<'FORGEFLOW_FIXTURE'
# ForgeFlow Handoff

Prose context that the contract check ignores.

## Lifecycle

```yaml
workflow:
  current_story: TST-005
  next_story: TST-006
  completed_stories:
    - TST-004
  status: ready_for_implementation

baseline:
  repository: example/repository
  branch: main
  commit: 0123456789abcdef0123456789abcdef01234567
  dirty_worktree: false
  story_owned_paths: []
  known_unrelated_paths: []

verification:
  last_command: make verify
  result: pass
```
FORGEFLOW_FIXTURE
}

edit_handoff() {
  sed "$1" "$forgeflow_handoff_file" >"$forgeflow_handoff_file.next"
  mv "$forgeflow_handoff_file.next" "$forgeflow_handoff_file"
}

forgeflow_test_dir=$(mktemp -d "${TMPDIR:-/tmp}/forgeflow-handoff-check.XXXXXX")

cleanup() {
  chmod -R u+rwX "$forgeflow_test_dir" 2>/dev/null || :
  rm -rf "$forgeflow_test_dir"
}

trap cleanup EXIT
trap 'exit 1' HUP INT TERM

forgeflow_repo=$(
  cd -P "$(dirname "$0")/.." >/dev/null 2>&1
  pwd
)
forgeflow_handoff_check="$forgeflow_repo/scripts/handoff-check"

complete_handoff_passes() {
  new_handoff ok
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 0
  assert_output_contains 'Result: HANDOFF_CONTRACT_OK'
  assert_output_contains 'current Story: TST-005'
  assert_output_contains 'next Story: TST-006'
  assert_output_contains 'completed Stories: 1'
  assert_output_contains 'example/repository main'
  assert_output_contains 'make verify pass'
}

inactive_handoff_states_absence_explicitly() {
  new_handoff inactive
  edit_handoff 's/current_story: TST-005/current_story: none/'
  edit_handoff 's/next_story: TST-006/next_story: pending/'
  edit_handoff 's/status: ready_for_implementation/status: draft/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 0
  assert_output_contains 'current Story: none'
  assert_output_contains 'next Story: pending'
}

current_and_next_story_are_single_and_explicit() {
  new_handoff no-next
  edit_handoff '/next_story: TST-006/d'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'handoff is missing: workflow.next_story'

  new_handoff repeated-current
  edit_handoff 's/current_story: TST-005/current_story: TST-005\
  current_story: TST-007/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'declares workflow.current_story more than once'

  new_handoff inferred-next
  edit_handoff 's/next_story: TST-006/next_story: see the candidate list/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'workflow.next_story must be one Story ID or pending'
}

completed_stories_are_recorded_separately() {
  new_handoff duplicate-completed
  edit_handoff 's/    - TST-004/    - TST-004\
    - TST-004/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'completed Story IDs must be unique'

  new_handoff prose-completed
  edit_handoff 's/    - TST-004/    - the earlier refactor/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'completed Story is not a Story ID'
}

baseline_identity_is_required() {
  new_handoff short-commit
  edit_handoff 's/commit: 0123456789abcdef0123456789abcdef01234567/commit: 0123456/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'baseline.commit must be a full 40-character commit SHA'

  new_handoff no-branch
  edit_handoff '/branch: main/d'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'handoff is missing: baseline.branch'

  new_handoff bad-dirty
  edit_handoff 's/dirty_worktree: false/dirty_worktree: maybe/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'baseline.dirty_worktree must be true or false'
}

dirty_worktree_requires_path_attribution() {
  new_handoff dirty-missing-paths
  edit_handoff 's/dirty_worktree: false/dirty_worktree: true/'
  edit_handoff '/story_owned_paths: \[\]/d'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'a dirty worktree must declare baseline.story_owned_paths'

  new_handoff dirty-conflicting-paths
  edit_handoff 's/dirty_worktree: false/dirty_worktree: true/'
  edit_handoff 's|  story_owned_paths: \[\]|  story_owned_paths:\
    - src/guard.ts|'
  edit_handoff 's|  known_unrelated_paths: \[\]|  known_unrelated_paths:\
    - src/guard.ts|'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'path is both Story-owned and unrelated: src/guard.ts'

  new_handoff dirty-empty-paths
  edit_handoff 's/dirty_worktree: false/dirty_worktree: true/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'must attribute at least one path to the Story'

  new_handoff repeated-paths
  edit_handoff 's|  story_owned_paths: \[\]|  story_owned_paths: []\
  story_owned_paths: []|'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'declares baseline.story_owned_paths more than once'
}

verification_state_is_required() {
  new_handoff bad-result
  edit_handoff 's/result: pass/result: probably/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'verification.result must be pass, fail, or not_run'

  new_handoff no-command
  edit_handoff '/last_command: make verify/d'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'handoff is missing: verification.last_command'
}

contradictory_lifecycle_states_are_rejected() {
  new_handoff same-story
  edit_handoff 's/next_story: TST-006/next_story: TST-005/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'the same Story cannot be both current and next'

  new_handoff completed-and-next
  edit_handoff 's/next_story: TST-006/next_story: TST-004/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'next Story is also recorded as completed: TST-004'

  new_handoff active-without-current
  edit_handoff 's/current_story: TST-005/current_story: none/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'status ready_for_implementation requires an explicit current Story'

  new_handoff reviewed-but-failing
  edit_handoff 's/status: ready_for_implementation/status: review/'
  edit_handoff 's/result: pass/result: fail/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'status review contradicts verification result fail'
}

block_and_invocation_errors_are_distinct() {
  new_handoff no-block
  edit_handoff 's/```yaml/```text/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'exactly one machine-readable lifecycle block'

  new_handoff duplicate-source
  cat "$forgeflow_handoff_file" >"$forgeflow_test_dir/$forgeflow_case_id-two.md"
  cat "$forgeflow_handoff_file" \
    >>"$forgeflow_test_dir/$forgeflow_case_id-two.md"
  run_handoff_check "$forgeflow_test_dir/$forgeflow_case_id-two.md"
  assert_status 1
  assert_output_contains 'exactly one machine-readable lifecycle block'

  new_handoff unclosed-block
  edit_handoff '/^```$/d'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'lifecycle block is not closed'

  run_handoff_check --bogus
  assert_status 2
  assert_output_contains 'Result: ERROR'

  new_handoff extra-arguments
  run_handoff_check "$forgeflow_handoff_file" "$forgeflow_handoff_file"
  assert_status 2

  run_handoff_check "$forgeflow_test_dir/$forgeflow_case_id-absent.md"
  assert_status 2
  assert_output_contains 'Handoff is missing, unreadable, or empty'
  assert_output_excludes 'HANDOFF_CONTRACT_INCOMPLETE'

  run_handoff_check --help
  assert_status 0
  assert_output_contains 'ForgeFlow Handoff Contract Check'
}

run_handoff_check_without_utilities() {
  forgeflow_empty_path="$forgeflow_test_dir/empty-path"
  mkdir -p "$forgeflow_empty_path"
  forgeflow_command_output="$forgeflow_test_dir/$forgeflow_case_id.no-path"

  if PATH="$forgeflow_empty_path" "$forgeflow_handoff_check" "$@" \
    >"$forgeflow_command_output" 2>&1; then
    forgeflow_command_status=0
  else
    forgeflow_command_status=$?
  fi
}

assert_same_verdict_without_utilities() {
  forgeflow_normal_output="$forgeflow_test_dir/$forgeflow_case_id.normal"

  run_handoff_check "$@"
  cp "$forgeflow_command_output" "$forgeflow_normal_output"
  forgeflow_normal_status=$forgeflow_command_status

  run_handoff_check_without_utilities "$@"

  if [ "$forgeflow_command_status" -ne "$forgeflow_normal_status" ]; then
    fail "an empty PATH changed the exit status from $forgeflow_normal_status to $forgeflow_command_status"
  fi

  cmp "$forgeflow_normal_output" "$forgeflow_command_output" >/dev/null ||
    fail 'an empty PATH changed the output'
}

the_verdict_does_not_depend_on_external_utilities() {
  assert_same_verdict_without_utilities "$forgeflow_repo/specs/handoff.md"
  assert_status 0
  assert_output_contains 'Result: HANDOFF_CONTRACT_OK'
}

assert_story_id_accepted() {
  new_handoff "id-ok-$2"
  edit_handoff "s/current_story: TST-005/current_story: $1/"
  edit_handoff "s/next_story: TST-006/next_story: pending/"
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 0
  assert_output_contains "current Story: $1"
}

assert_story_id_rejected() {
  new_handoff "id-bad-$2"
  edit_handoff "s/current_story: TST-005/current_story: $1/"
  edit_handoff "s/next_story: TST-006/next_story: pending/"
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'workflow.current_story must be one Story ID or none'
}

contradictions_and_usage_errors_survive_an_empty_path() {
  new_handoff empty-path-contradiction
  edit_handoff 's/next_story: TST-006/next_story: TST-005/'
  assert_same_verdict_without_utilities "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'the same Story cannot be both current and next'

  assert_same_verdict_without_utilities --unknown
  assert_status 2
  assert_output_contains 'Usage:'
}

handoff_check_uses_no_external_utilities() {
  # Tests may use external commands; the scripts under test may not. This scan
  # is a tripwire that names the utilities these scripts once used, not proof of
  # the guarantee: the empty-PATH cases are what establish it. Comment lines are
  # dropped after numbering so a reported line refers to the file.
  forgeflow_scan_output="$forgeflow_test_dir/$forgeflow_case_id.scan"

  grep -nE '(^|[ 	(|&;`]|\$\()(grep|sed|awk|sort|uniq|tr|cut|head|tail|wc|expr|cat|find|basename|dirname|readlink|stat|date|mktemp|xargs|git)([ 	]|$)' \
    "$forgeflow_handoff_check" | grep -v '^[0-9][0-9]*:[[:space:]]*#' \
    >"$forgeflow_scan_output" || :

  if [ -s "$forgeflow_scan_output" ]; then
    fail "the script still calls an external utility: $(cat "$forgeflow_scan_output")"
  fi
}

the_story_id_form_is_unchanged() {
  assert_story_id_accepted 'FF-001' 1
  assert_story_id_accepted 'A-1' 2
  assert_story_id_accepted 'DBCLI-004' 3
  assert_story_id_accepted 'FF2-30' 4

  assert_story_id_rejected 'ff-001' 1
  assert_story_id_rejected 'FF001' 2
  assert_story_id_rejected 'FF-' 3
  assert_story_id_rejected '-1' 4
  assert_story_id_rejected 'FF-1a' 5
  assert_story_id_rejected '1F-1' 6
  assert_story_id_rejected 'FF-1-2' 7
  assert_story_id_rejected 'FF-01x' 8
}

assert_commit_accepted() {
  new_handoff "sha-ok-$2"
  edit_handoff "s/commit: [0-9a-f]*/commit: $1/"
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 0
  assert_output_contains "$1"
}

assert_commit_rejected() {
  new_handoff "sha-bad-$2"
  edit_handoff "s/commit: [0-9a-f]*/commit: $1/"
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'baseline.commit must be a full 40-character commit SHA'
}

the_baseline_commit_form_is_unchanged() {
  assert_commit_accepted '0123456789abcdef0123456789abcdef01234567' 1
  assert_commit_accepted 'ffffffffffffffffffffffffffffffffffffffff' 2

  assert_commit_rejected '0123456789abcdef0123456789abcdef0123456' 1
  assert_commit_rejected '0123456789abcdef0123456789abcdef012345678' 2
  assert_commit_rejected '0123456789ABCDEF0123456789abcdef01234567' 3
  assert_commit_rejected '0123456789abcdefg123456789abcdef01234567' 4
}

duplicate_detection_is_unchanged() {
  new_handoff dup-yes
  edit_handoff 's/    - TST-004/    - TST-004\n    - TST-004/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'completed Story IDs must be unique'

  new_handoff dup-distinct
  edit_handoff 's/    - TST-004/    - TST-004\n    - TST-003/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 0
  assert_output_contains 'completed Stories: 2'

  new_handoff dup-empty
  edit_handoff 's/^    - TST-004$//'
  run_handoff_check "$forgeflow_handoff_file"
  assert_output_excludes 'completed Story IDs must be unique'
}

root_verify_validates_repository_handoff() {
  forgeflow_root_makefile="$forgeflow_repo/Makefile"

  grep -Eq '^verify:.*verify-protocol.*verify-bootstrap.*verify-doctor.*verify-story.*verify-handoff.*verify-release.*verify-typescript.*verify-go.*verify-actions' \
    "$forgeflow_root_makefile" ||
    fail 'root verify does not retain all gates and include verify-handoff'
  grep -Fqx 'verify-handoff:' "$forgeflow_root_makefile" ||
    fail 'root Makefile does not expose verify-handoff'
  grep -Fq 'sh -n scripts/handoff-check tests/handoff-check.sh' \
    "$forgeflow_root_makefile" ||
    fail 'verify-handoff does not check handoff shell syntax'
  grep -Fq './tests/handoff-check.sh' "$forgeflow_root_makefile" ||
    fail 'verify-handoff does not execute handoff acceptance tests'
  grep -Fq './scripts/handoff-check' "$forgeflow_root_makefile" ||
    fail 'verify-handoff does not validate this repository own handoff'

  forgeflow_command_output="$forgeflow_test_dir/AC-010.output"

  if (
    CDPATH='' cd "$forgeflow_repo"
    "$forgeflow_handoff_check"
  ) >"$forgeflow_command_output" 2>&1; then
    forgeflow_command_status=0
  else
    forgeflow_command_status=$?
  fi

  assert_status 0
  assert_output_contains 'Result: HANDOFF_CONTRACT_OK'
}

run_case 'AC-001' complete_handoff_passes
run_case 'AC-002' inactive_handoff_states_absence_explicitly
run_case 'AC-003' current_and_next_story_are_single_and_explicit
run_case 'AC-004' completed_stories_are_recorded_separately
run_case 'AC-005' baseline_identity_is_required
run_case 'AC-006' dirty_worktree_requires_path_attribution
run_case 'AC-007' verification_state_is_required
run_case 'AC-008' contradictory_lifecycle_states_are_rejected
run_case 'AC-009' block_and_invocation_errors_are_distinct
run_case 'AC-010' root_verify_validates_repository_handoff

run_case 'FF212-AC-001' the_verdict_does_not_depend_on_external_utilities
run_case 'FF212-AC-009' contradictions_and_usage_errors_survive_an_empty_path
run_case 'FF212-AC-004' the_story_id_form_is_unchanged
run_case 'FF212-AC-005' the_baseline_commit_form_is_unchanged
run_case 'FF212-AC-006' duplicate_detection_is_unchanged
run_case 'FF212-AC-012' handoff_check_uses_no_external_utilities

printf 'handoff-check tests passed\n'
