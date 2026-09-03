#!/bin/sh

set -eu

fail() {
  printf 'story-check test failed [%s]: %s\n' "$forgeflow_case_id" "$1" >&2
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

run_story_check() {
  forgeflow_command_output="$forgeflow_test_dir/$forgeflow_case_id.output"

  if "$forgeflow_story_check" "$@" >"$forgeflow_command_output" 2>&1; then
    forgeflow_command_status=0
  else
    forgeflow_command_status=$?
  fi
}

run_case() {
  forgeflow_case_id=$1
  forgeflow_case_function=$2

  "$forgeflow_case_function"
  printf 'PASS %s %s\n' "$forgeflow_case_id" "$forgeflow_case_function"
}

new_story() {
  forgeflow_story_dir="$forgeflow_test_dir/$forgeflow_case_id-$1"
  forgeflow_story_security=$2
  forgeflow_story_baseline=$3

  rm -rf "$forgeflow_story_dir"
  mkdir -p "$forgeflow_story_dir"

  cat >"$forgeflow_story_dir/story.md" <<'FORGEFLOW_FIXTURE'
# Story: TST-001 Fixture Story

## Goal

Provide a deterministic Story fixture.

## Context

Fixture context.

## Classification

FORGEFLOW_FIXTURE

  printf '* Security sensitive: %s\n' "$forgeflow_story_security" \
    >>"$forgeflow_story_dir/story.md"
  printf '* Baseline conformance: %s\n\n' "$forgeflow_story_baseline" \
    >>"$forgeflow_story_dir/story.md"

  cat >>"$forgeflow_story_dir/story.md" <<'FORGEFLOW_FIXTURE'
## Scope

### In Scope

* Fixture behavior.

### Out of Scope

* Everything else.

## Inputs

* Fixture input.

## Outputs

* Fixture output.

## Rules

* R1: Fixture rule.

## Expected Errors

* Fixture error.

## Dependencies

* None.

## Constraints

* None.
FORGEFLOW_FIXTURE

  cat >"$forgeflow_story_dir/acceptance.md" <<'FORGEFLOW_FIXTURE'
# Acceptance Criteria

## Happy Path

* [ ] AC-001: Fixture happy path.

## Business Rules

* [ ] AC-002: Fixture business rule.

## Failure Cases

* [ ] AC-003: Fixture failure case.

## Regression Requirements

* [ ] AC-004: Fixture regression.
FORGEFLOW_FIXTURE

  cat >>"$forgeflow_story_dir/acceptance.md" <<'FORGEFLOW_FIXTURE'

## Verification Notes

Fixture verification notes.
FORGEFLOW_FIXTURE
}

add_story_section() {
  printf '\n%s\n\n' "$1" >>"$forgeflow_story_dir/story.md"
  shift

  for forgeflow_section_entry in "$@"
  do
    printf '%s\n' "$forgeflow_section_entry" >>"$forgeflow_story_dir/story.md"
  done
}

add_matrix() {
  {
    printf '\n## Security Fixture Matrix\n\n'
    printf '| Source field | Payload | Expected result | Persisted locations | Verification |\n'
    printf '| --- | --- | --- | --- | --- |\n'

    for forgeflow_matrix_row in "$@"
    do
      printf '%s\n' "$forgeflow_matrix_row"
    done
  } >>"$forgeflow_story_dir/acceptance.md"
}

complete_security_story() {
  new_story "$1" yes no
  add_story_section '## Trust Boundary Fields' \
    '* `request.sql` — the raw statement supplied by the caller'
  add_matrix "$forgeflow_valid_row"
}

forgeflow_test_dir=$(mktemp -d "${TMPDIR:-/tmp}/forgeflow-story-check.XXXXXX")

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
forgeflow_story_check="$forgeflow_repo/scripts/story-check"
forgeflow_valid_row='| `request.sql` | `password=hunter2` | redact | `artifact.summary` | `tests/story-check.sh` |'

complete_security_story_passes() {
  complete_security_story ok
  run_story_check "$forgeflow_story_dir"
  assert_status 0
  assert_output_contains 'Result: STORY_CONTRACT_OK'
  assert_output_contains 'security=yes'
  assert_output_contains 'Stories checked: 1'
}

unclassified_story_needs_no_security_sections() {
  new_story plain no no
  run_story_check "$forgeflow_story_dir"
  assert_status 0
  assert_output_contains 'Result: STORY_CONTRACT_OK'
  assert_output_excludes 'FAIL'
}

prose_fixture_cells_are_rejected() {
  new_story prose yes no
  add_story_section '## Trust Boundary Fields' \
    '* `request.sql` — the raw statement supplied by the caller'
  add_matrix \
    '| `request.sql` | no credentials | redact | `artifact.summary` | `tests/story-check.sh` |' \
    '| `request.sql` | `password=hunter2` | redact | the stored artifact | run the suite |'
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'Result: STORY_CONTRACT_INCOMPLETE'
  assert_output_contains 'row 1 states payload as prose'
  assert_output_contains 'row 2 states persisted locations as prose'
  assert_output_contains 'row 2 states verification as prose'

  new_story empty-literal yes no
  add_story_section '## Trust Boundary Fields' \
    '* `request.sql` — the raw statement supplied by the caller'
  add_matrix '| `` | `` | redact | `` | `` |'
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'row 1 states payload as prose'

  new_story markup-payload yes no
  add_story_section '## Trust Boundary Fields' \
    '* `comment.body` — the untrusted comment supplied by the caller'
  add_matrix \
    '| `comment.body` | `<script>alert(1)</script>` | redact | `page.html` | `tests/xss.sh` |'
  run_story_check "$forgeflow_story_dir"
  assert_status 0
  assert_output_contains 'Result: STORY_CONTRACT_OK'
}

fixture_shape_and_expected_result_are_constrained() {
  new_story shape yes no
  add_story_section '## Trust Boundary Fields' \
    '* `request.sql` — the raw statement supplied by the caller'
  add_matrix \
    '| `request.sql` | `password=hunter2` | scrubbed | `artifact.summary` | `tests/story-check.sh` |' \
    '| `request.sql` | `password=hunter2` | redact | `artifact.summary` |'
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'row 1 expected result must be preserve, redact, reject, or omit'
  assert_output_contains 'row 2 must declare five columns'
}

trust_boundary_fields_must_be_enumerated() {
  new_story trust-missing yes no
  add_matrix "$forgeflow_valid_row"
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'must enumerate its trust-boundary fields'

  new_story trust-prose yes no
  add_story_section '## Trust Boundary Fields' \
    '* every field a user can influence'
  add_matrix "$forgeflow_valid_row"
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'every trust-boundary field must name an exact field'
}

missing_matrix_is_reported() {
  new_story no-matrix yes no
  add_story_section '## Trust Boundary Fields' \
    '* `request.sql` — the raw statement supplied by the caller'
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'missing acceptance section: ## Security Fixture Matrix'

  new_story empty-matrix yes no
  add_story_section '## Trust Boundary Fields' \
    '* `request.sql` — the raw statement supplied by the caller'
  add_matrix
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'declares no fixture rows'
}

missing_superseded_behavior_is_reported() {
  new_story baseline no yes
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'must list superseded tests or behavior under ## Superseded Behavior'

  new_story baseline-prose no yes
  add_story_section '## Superseded Behavior' \
    '* the old guard behavior changes'
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'every superseded entry must name an exact test path'
}

classification_must_be_explicit_and_consistent() {
  new_story missing no no
  grep -v 'Security sensitive' "$forgeflow_story_dir/story.md" \
    >"$forgeflow_story_dir/story.trimmed"
  mv "$forgeflow_story_dir/story.trimmed" "$forgeflow_story_dir/story.md"
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'must declare "Security sensitive" exactly once'

  new_story duplicated no no
  printf '\n## Classification\n\n* Baseline conformance: no\n' \
    >>"$forgeflow_story_dir/story.md"
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'must declare "Baseline conformance" exactly once'

  new_story invalid maybe no
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'Security sensitive must be declared as yes or no'

  new_story contradiction no no
  add_matrix "$forgeflow_valid_row"
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'declares Security sensitive: no but provides a security fixture matrix'

  new_story contradiction-baseline no no
  add_story_section '## Superseded Behavior' \
    '* `tests/legacy.sh` — replaced by the new guard'
  run_story_check "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'declares Baseline conformance: no but declares superseded behavior'
}

operational_failures_exit_two() {
  run_story_check --bogus
  assert_status 2
  assert_output_contains 'Result: ERROR'

  run_story_check "$forgeflow_test_dir/$forgeflow_case_id-absent"
  assert_status 2
  assert_output_contains 'Story directory is missing'
  assert_output_excludes 'STORY_CONTRACT_INCOMPLETE'

  new_story unreadable no no
  rm "$forgeflow_story_dir/acceptance.md"
  run_story_check "$forgeflow_story_dir"
  assert_status 2
  assert_output_contains 'required Story file is missing or unreadable'
  assert_output_contains 'Result: ERROR'

  run_story_check --help
  assert_status 0
  assert_output_contains 'ForgeFlow Story Contract Check'
}

root_verify_runs_story_contract_check() {
  forgeflow_root_makefile="$forgeflow_repo/Makefile"

  grep -Eq '^verify:.*verify-protocol.*verify-bootstrap.*verify-doctor.*verify-story.*verify-release.*verify-typescript.*verify-go.*verify-actions' \
    "$forgeflow_root_makefile" ||
    fail 'root verify does not retain all gates and include verify-story'
  grep -Fqx 'verify-story:' "$forgeflow_root_makefile" ||
    fail 'root Makefile does not expose verify-story'
  grep -Fq 'sh -n scripts/story-check tests/story-check.sh' \
    "$forgeflow_root_makefile" ||
    fail 'verify-story does not check Story contract shell syntax'
  grep -Fq './tests/story-check.sh' "$forgeflow_root_makefile" ||
    fail 'verify-story does not execute Story contract acceptance tests'
  grep -Fq './scripts/story-check' "$forgeflow_root_makefile" ||
    fail 'verify-story does not check this repository own Stories'

  forgeflow_case_id='AC-010'
  forgeflow_command_output="$forgeflow_test_dir/AC-010.output"

  if (
    CDPATH='' cd "$forgeflow_repo"
    "$forgeflow_story_check"
  ) >"$forgeflow_command_output" 2>&1; then
    forgeflow_command_status=0
  else
    forgeflow_command_status=$?
  fi

  assert_status 0
  assert_output_contains 'Result: STORY_CONTRACT_OK'
}

every_story_gets_its_own_verdict() {
  complete_security_story valid

  new_story broken-one yes no
  forgeflow_first_broken=$forgeflow_story_dir
  new_story broken-two yes no
  forgeflow_second_broken=$forgeflow_story_dir

  run_story_check "$forgeflow_first_broken" "$forgeflow_second_broken"
  assert_status 1
  assert_output_contains 'Stories checked: 2'
  assert_output_excludes 'PASS'

  forgeflow_broken_verdicts=$(
    grep -c "^FAIL  $forgeflow_second_broken" "$forgeflow_command_output"
  )

  [ "$forgeflow_broken_verdicts" -ge 1 ] ||
    fail 'the second broken Story reported no failure'

  complete_security_story second-valid
  run_story_check "$forgeflow_first_broken" "$forgeflow_story_dir"
  assert_status 1
  assert_output_contains 'Stories checked: 2'
  grep -Fq "PASS  $forgeflow_story_dir" "$forgeflow_command_output" ||
    fail 'a compliant Story checked after a failing one lost its PASS verdict'
}

fenced_examples_are_not_declarations() {
  new_story fenced no no
  {
    printf '\n## Notes\n\n'
    printf 'The contract is illustrated below.\n\n'
    printf '```markdown\n'
    printf '## Classification\n\n'
    printf '* Security sensitive: yes\n'
    printf '* Baseline conformance: yes\n'
    printf '```\n'
  } >>"$forgeflow_story_dir/story.md"
  run_story_check "$forgeflow_story_dir"
  assert_status 0
  assert_output_contains 'security=no baseline=no'
}

run_case 'AC-001' complete_security_story_passes
run_case 'AC-002' unclassified_story_needs_no_security_sections
run_case 'AC-003' prose_fixture_cells_are_rejected
run_case 'AC-004' fixture_shape_and_expected_result_are_constrained
run_case 'AC-005' trust_boundary_fields_must_be_enumerated
run_case 'AC-006' missing_matrix_is_reported
run_case 'AC-007' missing_superseded_behavior_is_reported
run_case 'AC-008' classification_must_be_explicit_and_consistent
run_case 'AC-009' operational_failures_exit_two
run_case 'AC-010' root_verify_runs_story_contract_check
run_case 'AC-011' every_story_gets_its_own_verdict
run_case 'AC-012' fenced_examples_are_not_declarations

printf 'story-check tests passed\n'
