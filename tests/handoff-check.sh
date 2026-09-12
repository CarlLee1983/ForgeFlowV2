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

  for forgeflow_forbidden_claim in APPROVED MERGE_ALLOWED; do
    if grep -Fq -- "$forgeflow_forbidden_claim" "$forgeflow_command_output"; then
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
# ForgeFlow Handoff Evidence

Prose context that the contract check ignores.

## Evidence

```yaml
handoff:
  story: TST-005
  recorded_at: 2026-09-12T02:30:00Z
  repository: example/repository
  revision: 0123456789abcdef0123456789abcdef01234567

verification:
  command: make verify
  result: pass
```
FORGEFLOW_FIXTURE
}

new_legacy_handoff() {
  forgeflow_handoff_file="$forgeflow_test_dir/$forgeflow_case_id-legacy.md"

  cat >"$forgeflow_handoff_file" <<'FORGEFLOW_FIXTURE'
# Legacy ForgeFlow Handoff

```yaml
workflow:
  current_story: TST-005
  next_story: pending
  completed_stories: []
  status: implementing

baseline:
  repository: example/repository
  branch: main
  commit: 0123456789abcdef0123456789abcdef01234567
  dirty_worktree: false
  story_owned_paths: []
  known_unrelated_paths: []

verification:
  last_command: make verify
  result: not_run
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

complete_evidence_passes_without_current_state_claims() {
  new_handoff complete
  run_handoff_check "$forgeflow_handoff_file"

  assert_status 0
  assert_output_contains 'Result: HANDOFF_CONTRACT_OK'
  assert_output_contains 'Story evidence: TST-005'
  assert_output_contains 'recorded at: 2026-09-12T02:30:00Z'
  assert_output_contains 'example/repository 0123456789abcdef0123456789abcdef01234567'
  assert_output_contains 'verification evidence: make verify pass'
  assert_output_contains 'Historical evidence only.'

  for forgeflow_mutable_claim in \
    'current Story:' \
    'next Story:' \
    'completed Stories:' \
    'lifecycle status:' \
    'Gate state:' \
    'review state:' \
    'completion state:'
  do
    assert_output_excludes "$forgeflow_mutable_claim"
  done
}

required_evidence_is_single_and_explicit() {
  new_handoff no-story
  edit_handoff '/story: TST-005/d'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'handoff is missing: handoff.story'

  new_handoff repeated-time
  edit_handoff 's/  recorded_at: 2026-09-12T02:30:00Z/  recorded_at: 2026-09-12T02:30:00Z\
  recorded_at: 2026-09-12T02:31:00Z/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'handoff declares handoff.recorded_at more than once'

  new_handoff repeated-section
  edit_handoff 's/^verification:/handoff:\
\
verification:/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'evidence block must declare the handoff section exactly once'

  new_handoff missing-section
  edit_handoff '/^verification:$/d'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'evidence block must declare the verification section exactly once'

  new_handoff no-verification
  edit_handoff '/command: make verify/d'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'handoff is missing: verification.command'

  new_handoff blank-repository
  edit_handoff 's|repository: example/repository|repository:|'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'handoff.repository must be one non-null unquoted plain scalar'
}

timestamp_and_result_forms_are_validated() {
  for forgeflow_bad_timestamp in \
    '2026-13-12T02:30:00Z' \
    '2026-09-00T02:30:00Z' \
    '2026-09-12T24:30:00Z' \
    '2026-09-12T02:60:00Z' \
    '2026-09-12T02:30:00+00:00'
  do
    new_handoff bad-time
    edit_handoff "s/recorded_at: .*/recorded_at: $forgeflow_bad_timestamp/"
    run_handoff_check "$forgeflow_handoff_file"
    assert_status 1
    assert_output_contains 'handoff.recorded_at must be YYYY-MM-DDTHH:MM:SSZ in UTC'
  done

  new_handoff bad-result
  edit_handoff 's/result: pass/result: probably/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'verification.result must be pass, fail, or not_run'

  for forgeflow_result_value in pass fail not_run; do
    new_handoff "result-$forgeflow_result_value"
    edit_handoff "s/result: pass/result: $forgeflow_result_value/"
    run_handoff_check "$forgeflow_handoff_file"
    assert_status 0
  done
}

mutable_lifecycle_and_unknown_fields_are_rejected() {
  new_legacy_handoff
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'mutable lifecycle section is forbidden: workflow'
  assert_output_contains 'mutable lifecycle section is forbidden: baseline'
  assert_output_contains 'mutable lifecycle evidence is forbidden: workflow.current_story'
  assert_output_excludes 'Result: HANDOFF_CONTRACT_OK'

  new_handoff current-status
  edit_handoff 's/  story: TST-005/  story: TST-005\
  current_status: implementing/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'unknown handoff evidence key: handoff.current_status'

  new_handoff current-revision
  edit_handoff 's/  revision: /  current_revision: current\
  revision: /'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'unknown handoff evidence key: handoff.current_revision'

  new_handoff unknown-section
  edit_handoff 's/^verification:/gates:\
  open: GATE-1\
\
verification:/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'unknown handoff evidence section: gates'
}

non_string_yaml_forms_and_inline_comments_are_rejected() {
  new_handoff flow-map
  edit_handoff 's|repository: example/repository|repository: {name: example/repository, current_story: TST-999}|'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'handoff.repository must be one non-null unquoted plain scalar'
  assert_output_excludes 'Result: HANDOFF_CONTRACT_OK'

  new_handoff flow-sequence
  edit_handoff 's|command: make verify|command: [make, verify, {status: implementing}]|'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'verification.command must be one non-null unquoted plain scalar'

  for forgeflow_extra_space_value in \
    '{"current_story":"TST-999","status":"implementing"}' \
    '[make, verify]' \
    null \
    '"make verify"' \
    '|'
  do
    new_handoff extra-separator-space
    edit_handoff "s@command: make verify@command:  $forgeflow_extra_space_value@"
    run_handoff_check "$forgeflow_handoff_file"
    assert_status 1
    assert_output_contains 'handoff evidence value must follow exactly one separator space: verification.command'
    assert_output_excludes 'Result: HANDOFF_CONTRACT_OK'
  done

  for forgeflow_bad_repository in null false 123 '|'; do
    new_handoff non-string-repository
    edit_handoff "s@repository: example/repository@repository: $forgeflow_bad_repository@"
    run_handoff_check "$forgeflow_handoff_file"
    assert_status 1
    assert_output_contains 'handoff.repository must be one non-null unquoted plain scalar'
  done

  for forgeflow_bad_command in \
    '!!str make verify' \
    '&verify make verify' \
    '*verify' \
    '"make verify"' \
    'make verify # current result'
  do
    new_handoff unsupported-command
    edit_handoff "s|command: make verify|command: $forgeflow_bad_command|"
    run_handoff_check "$forgeflow_handoff_file"
    assert_status 1
    assert_output_contains 'verification.command must be one non-null unquoted plain scalar'
  done

  for forgeflow_bad_indicator in '-' '?' ':' 'make verify:'; do
    new_handoff invalid-indicator
    edit_handoff "s|command: make verify|command: $forgeflow_bad_indicator|"
    run_handoff_check "$forgeflow_handoff_file"
    assert_status 1
    assert_output_contains 'verification.command must be one non-null unquoted plain scalar'
  done

  new_handoff whole-line-comment
  edit_handoff 's/  story: TST-005/  # Historical context only.\
  story: TST-005/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 0
  assert_output_contains 'Result: HANDOFF_CONTRACT_OK'

  forgeflow_embedded_cr=$(printf '\r')
  forgeflow_embedded_nel=$(printf '\302\205')
  forgeflow_embedded_ls=$(printf '\342\200\250')
  forgeflow_embedded_ps=$(printf '\342\200\251')

  for forgeflow_embedded_line_break in \
    "$forgeflow_embedded_cr" \
    "$forgeflow_embedded_nel" \
    "$forgeflow_embedded_ls" \
    "$forgeflow_embedded_ps"
  do
    new_handoff embedded-yaml-line-break
    edit_handoff "s@command: make verify@command: ${forgeflow_embedded_line_break}    {current_story: TST-999, status: implementing}@"
    assert_same_verdict_without_utilities "$forgeflow_handoff_file"
    assert_status 1
    assert_output_contains 'handoff source line contains an embedded YAML line break'
    assert_output_excludes 'Result: HANDOFF_CONTRACT_OK'

    new_handoff comment-prefixed-yaml-line-break
    edit_handoff "s@^handoff:@# Historical context${forgeflow_embedded_line_break}workflow: {current_story: TST-999, status: implementing}\\
handoff:@"
    assert_same_verdict_without_utilities "$forgeflow_handoff_file"
    assert_status 1
    assert_output_contains 'handoff source line contains an embedded YAML line break'
    assert_output_excludes 'Result: HANDOFF_CONTRACT_OK'

    new_handoff hidden-opener-after-record
    printf '\nHistorical context%s```yaml\nworkflow:\n  current_story: TST-999\n```\n' \
      "$forgeflow_embedded_line_break" >>"$forgeflow_handoff_file"
    assert_same_verdict_without_utilities "$forgeflow_handoff_file"
    assert_status 1
    assert_output_contains 'handoff source line contains an embedded YAML line break'
    assert_output_excludes 'Result: HANDOFF_CONTRACT_OK'

    new_handoff hidden-opener-before-record
    forgeflow_hidden_prefix="$forgeflow_handoff_file.prefix"
    printf 'Historical context%s```yaml\nworkflow:\n  current_story: TST-999\n```\n' \
      "$forgeflow_embedded_line_break" >"$forgeflow_hidden_prefix"
    cat "$forgeflow_handoff_file" >>"$forgeflow_hidden_prefix"
    mv "$forgeflow_hidden_prefix" "$forgeflow_handoff_file"
    assert_same_verdict_without_utilities "$forgeflow_handoff_file"
    assert_status 1
    assert_output_contains 'handoff source line contains an embedded YAML line break'
    assert_output_excludes 'Result: HANDOFF_CONTRACT_OK'
  done
}

block_and_invocation_errors_are_distinct() {
  new_handoff no-block
  edit_handoff 's/```yaml/```text/'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'exactly one machine-readable evidence block'

  new_handoff duplicate-source
  cat "$forgeflow_handoff_file" >"$forgeflow_test_dir/$forgeflow_case_id-two.md"
  cat "$forgeflow_handoff_file" >>"$forgeflow_test_dir/$forgeflow_case_id-two.md"
  run_handoff_check "$forgeflow_test_dir/$forgeflow_case_id-two.md"
  assert_status 1
  assert_output_contains 'exactly one machine-readable evidence block'

  new_handoff unclosed-block
  edit_handoff '/^```$/d'
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'handoff evidence block is not closed'

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

verdicts_do_not_depend_on_external_utilities() {
  assert_same_verdict_without_utilities "$forgeflow_repo/specs/handoff.md"
  assert_status 0
  assert_output_contains 'Result: HANDOFF_CONTRACT_OK'

  new_legacy_handoff
  assert_same_verdict_without_utilities "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'mutable lifecycle section is forbidden: workflow'

  assert_same_verdict_without_utilities --unknown
  assert_status 2
  assert_output_contains 'Usage:'
}

handoff_check_uses_no_external_utilities() {
  forgeflow_scan_output="$forgeflow_test_dir/$forgeflow_case_id.scan"

  grep -nE '(^|[ \t(|&;`]|\$\()(grep|sed|awk|sort|uniq|tr|cut|head|tail|wc|expr|cat|find|basename|dirname|readlink|stat|date|mktemp|xargs|git)([ \t]|$)' \
    "$forgeflow_handoff_check" | grep -v '^[0-9][0-9]*:[[:space:]]*#' \
    >"$forgeflow_scan_output" || :

  if [ -s "$forgeflow_scan_output" ]; then
    fail "the script still calls an external utility: $(cat "$forgeflow_scan_output")"
  fi
}

assert_story_id_accepted() {
  new_handoff "id-ok-$2"
  edit_handoff "s/story: TST-005/story: $1/"
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 0
  assert_output_contains "Story evidence: $1"
}

assert_story_id_rejected() {
  new_handoff "id-bad-$2"
  edit_handoff "s/story: TST-005/story: $1/"
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'handoff.story must be one Story ID'
}

the_story_id_form_is_unchanged() {
  assert_story_id_accepted 'FF-001' 1
  assert_story_id_accepted 'A-1' 2
  assert_story_id_accepted 'DBCLI-004' 3
  assert_story_id_accepted 'FF2-30' 4
  assert_story_id_accepted 'DBCLI-PLAT-001' 5
  assert_story_id_accepted 'FF-CORE-A1-042' 6

  assert_story_id_rejected 'ff-001' 1
  assert_story_id_rejected 'FF001' 2
  assert_story_id_rejected 'FF-' 3
  assert_story_id_rejected '-1' 4
  assert_story_id_rejected 'FF-1a' 5
  assert_story_id_rejected '1F-1' 6
  assert_story_id_rejected 'FF-1-2' 7
  assert_story_id_rejected 'FF-01x' 8
}

assert_revision_accepted() {
  new_handoff "revision-ok-$2"
  edit_handoff "s/revision: [0-9a-f]*/revision: $1/"
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 0
  assert_output_contains "$1"
}

assert_revision_rejected() {
  new_handoff "revision-bad-$2"
  edit_handoff "s/revision: [0-9a-f]*/revision: $1/"
  run_handoff_check "$forgeflow_handoff_file"
  assert_status 1
  assert_output_contains 'handoff.revision must be a full 40-character commit SHA'
}

the_revision_form_is_unchanged() {
  assert_revision_accepted '0123456789abcdef0123456789abcdef01234567' 1
  assert_revision_accepted 'ffffffffffffffffffffffffffffffffffffffff' 2

  assert_revision_rejected '0123456789abcdef0123456789abcdef0123456' 1
  assert_revision_rejected '0123456789abcdef0123456789abcdef012345678' 2
  assert_revision_rejected '0123456789ABCDEF0123456789abcdef01234567' 3
  assert_revision_rejected '0123456789abcdefg123456789abcdef01234567' 4
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

  forgeflow_command_output="$forgeflow_test_dir/$forgeflow_case_id.output"

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

run_case 'P0001-AC-002' complete_evidence_passes_without_current_state_claims
run_case 'P0001-AC-006' required_evidence_is_single_and_explicit
run_case 'P0001-AC-006' timestamp_and_result_forms_are_validated
run_case 'P0001-AC-006' mutable_lifecycle_and_unknown_fields_are_rejected
run_case 'P0001-AC-006' non_string_yaml_forms_and_inline_comments_are_rejected
run_case 'P0001-AC-006' block_and_invocation_errors_are_distinct
run_case 'FF212-AC-001' verdicts_do_not_depend_on_external_utilities
run_case 'FF212-AC-012' handoff_check_uses_no_external_utilities
run_case 'FF212-AC-004' the_story_id_form_is_unchanged
run_case 'FF212-AC-005' the_revision_form_is_unchanged
run_case 'P0001-AC-008' root_verify_validates_repository_handoff

printf 'handoff-check tests passed\n'
