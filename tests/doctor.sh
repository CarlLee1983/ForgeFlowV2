#!/bin/sh

set -eu

fail() {
  printf 'doctor test failed [%s]: %s\n' "$forgeflow_case_id" "$1" >&2
  exit 1
}

assert_status() {
  forgeflow_expected_status=$1

  if [ "$forgeflow_command_status" -ne "$forgeflow_expected_status" ]; then
    fail "expected exit $forgeflow_expected_status, got $forgeflow_command_status"
  fi
}

assert_output_contains() {
  forgeflow_expected_output=$1

  grep -Fq -- "$forgeflow_expected_output" "$forgeflow_command_output" ||
    fail "output is missing: $forgeflow_expected_output"
}

assert_output_excludes() {
  forgeflow_forbidden_output=$1

  if grep -Fq -- "$forgeflow_forbidden_output" "$forgeflow_command_output"; then
    fail "output must not contain: $forgeflow_forbidden_output"
  fi
}

assert_no_authorization_claims() {
  for forgeflow_forbidden_result in APPROVED DONE MERGE_ALLOWED
  do
    if grep -Fq -- "$forgeflow_forbidden_result" "$forgeflow_command_output"; then
      fail "Doctor emitted forbidden result: $forgeflow_forbidden_result"
    fi
  done
}

run_doctor() {
  forgeflow_command_output="$forgeflow_test_dir/$forgeflow_case_id.output"

  if "$forgeflow_doctor" "$@" >"$forgeflow_command_output" 2>&1; then
    forgeflow_command_status=0
  else
    forgeflow_command_status=$?
  fi

  assert_no_authorization_claims
}

run_doctor_with_path() {
  forgeflow_doctor_path=$1
  shift
  forgeflow_command_output="$forgeflow_test_dir/$forgeflow_case_id.output"

  if PATH="$forgeflow_doctor_path" "$forgeflow_doctor" "$@" \
    >"$forgeflow_command_output" 2>&1; then
    forgeflow_command_status=0
  else
    forgeflow_command_status=$?
  fi

  assert_no_authorization_claims
}

run_doctor_from_directory() {
  forgeflow_doctor_cwd=$1
  shift
  forgeflow_command_output="$forgeflow_test_dir/$forgeflow_case_id.output"

  if (
    CDPATH='' cd "$forgeflow_doctor_cwd"
    "$forgeflow_doctor" "$@"
  ) >"$forgeflow_command_output" 2>&1; then
    forgeflow_command_status=0
  else
    forgeflow_command_status=$?
  fi

  assert_no_authorization_claims
}

run_doctor_from_directory_with_path() {
  forgeflow_doctor_cwd=$1
  forgeflow_doctor_path=$2
  shift 2
  forgeflow_command_output="$forgeflow_test_dir/$forgeflow_case_id.output"

  if (
    CDPATH='' cd "$forgeflow_doctor_cwd"
    PATH="$forgeflow_doctor_path" "$forgeflow_doctor" "$@"
  ) >"$forgeflow_command_output" 2>&1; then
    forgeflow_command_status=0
  else
    forgeflow_command_status=$?
  fi

  assert_no_authorization_claims
}

run_case() {
  forgeflow_case_id=$1
  forgeflow_case_function=$2

  "$forgeflow_case_function"
  printf 'PASS %s %s\n' "$forgeflow_case_id" "$forgeflow_case_function"
}

forgeflow_test_dir=$(mktemp -d "${TMPDIR:-/tmp}/forgeflow-doctor.XXXXXX")

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
forgeflow_doctor="$forgeflow_repo/scripts/doctor"

create_complete_fixture() {
  forgeflow_complete_fixture=$1

  mkdir -p "$forgeflow_complete_fixture/specs/stories"
  printf 'Follow the approved Story.\n' >"$forgeflow_complete_fixture/AGENTS.md"
  printf 'verify:\n\t@:\n' >"$forgeflow_complete_fixture/Makefile"
}

snapshot_tree_without_atime() {
  forgeflow_snapshot_root=$1
  forgeflow_snapshot_output=$2

  (
    CDPATH='' cd "$forgeflow_snapshot_root"
    find . -print | LC_ALL=C sort |
      while IFS= read -r forgeflow_snapshot_path; do
        # Fixture paths are controlled and cannot contain newlines.
        # shellcheck disable=SC2012
        forgeflow_snapshot_mode=$(
          LC_ALL=C ls -ldn "$forgeflow_snapshot_path" | cut -c1-10
        )
        printf '%s %s\n' \
          "$forgeflow_snapshot_mode" "$forgeflow_snapshot_path"

        if [ -f "$forgeflow_snapshot_path" ]; then
          cksum "$forgeflow_snapshot_path"
        fi
      done
  ) >"$forgeflow_snapshot_output"
}

bootstrap_requires_repository_makefile() {
  forgeflow_fixture="$forgeflow_test_dir/bootstrap"
  mkdir -p "$forgeflow_fixture"
  "$forgeflow_repo/scripts/bootstrap" "$forgeflow_fixture" >/dev/null

  run_doctor "$forgeflow_fixture"

  assert_status 1
  assert_output_contains 'FAIL  Makefile is missing'
  assert_output_contains 'Result: STRUCTURE_INCOMPLETE'
  assert_output_contains 'Verification: NOT_RUN'
  assert_output_contains 'Define a repository-owned Makefile exposing make verify.'
  assert_output_excludes 'APPROVED'
  assert_output_excludes 'DONE'
  assert_output_excludes 'MERGE_ALLOWED'

  forgeflow_blank_agents_fixture="$forgeflow_test_dir/blank-agents"
  create_complete_fixture "$forgeflow_blank_agents_fixture"
  printf ' \t\n' >"$forgeflow_blank_agents_fixture/AGENTS.md"

  run_doctor "$forgeflow_blank_agents_fixture"
  assert_status 1
  assert_output_contains 'FAIL  Agent guide is blank: AGENTS.md'
  assert_output_contains 'Result: STRUCTURE_INCOMPLETE'

  forgeflow_blank_makefile_fixture="$forgeflow_test_dir/blank-makefile"
  create_complete_fixture "$forgeflow_blank_makefile_fixture"
  printf '\n\t \n' >"$forgeflow_blank_makefile_fixture/Makefile"

  run_doctor "$forgeflow_blank_makefile_fixture"
  assert_status 1
  assert_output_contains 'FAIL  Makefile is blank'
  assert_output_contains 'Result: STRUCTURE_INCOMPLETE'

  forgeflow_wrong_story_fixture="$forgeflow_test_dir/wrong-story-path"
  mkdir -p "$forgeflow_wrong_story_fixture/specs"
  printf 'agent guide\n' >"$forgeflow_wrong_story_fixture/AGENTS.md"
  printf 'not a directory\n' >"$forgeflow_wrong_story_fixture/specs/stories"
  printf 'verify:\n\t@:\n' >"$forgeflow_wrong_story_fixture/Makefile"

  run_doctor "$forgeflow_wrong_story_fixture"
  assert_status 1
  assert_output_contains 'FAIL  Story path is not a directory: specs/stories/'
  assert_output_contains 'Result: STRUCTURE_INCOMPLETE'

  forgeflow_wrong_agents_fixture="$forgeflow_test_dir/wrong-agents-path"
  mkdir -p \
    "$forgeflow_wrong_agents_fixture/AGENTS.md" \
    "$forgeflow_wrong_agents_fixture/specs/stories"
  printf 'verify:\n\t@:\n' >"$forgeflow_wrong_agents_fixture/Makefile"

  run_doctor "$forgeflow_wrong_agents_fixture"
  assert_status 1
  assert_output_contains 'FAIL  Agent guide is not a regular file: AGENTS.md'
  assert_output_contains 'Result: STRUCTURE_INCOMPLETE'

  forgeflow_wrong_makefile_fixture="$forgeflow_test_dir/wrong-makefile-path"
  mkdir -p \
    "$forgeflow_wrong_makefile_fixture/specs/stories" \
    "$forgeflow_wrong_makefile_fixture/Makefile"
  printf 'agent guide\n' >"$forgeflow_wrong_makefile_fixture/AGENTS.md"

  run_doctor "$forgeflow_wrong_makefile_fixture"
  assert_status 1
  assert_output_contains 'FAIL  Makefile is not a regular file'
  assert_output_contains 'Result: STRUCTURE_INCOMPLETE'
}

optional_adoption_files_are_not_required() {
  forgeflow_fixture="$forgeflow_test_dir/minimal complete"
  create_complete_fixture "$forgeflow_fixture"

  [ ! -e "$forgeflow_fixture/specs/stories/_template" ] ||
    fail 'fixture unexpectedly contains _template/'
  [ ! -e "$forgeflow_fixture/task.md" ] ||
    fail 'fixture unexpectedly contains task.md'
  [ ! -e "$forgeflow_fixture/.github" ] ||
    fail 'fixture unexpectedly contains CI configuration'
  [ ! -e "$forgeflow_fixture/skills" ] ||
    fail 'fixture unexpectedly contains Skills'

  run_doctor "$forgeflow_fixture"

  assert_status 0
  assert_output_contains 'Result: STRUCTURE_OK'
  assert_output_contains 'Verification: NOT_RUN'
  assert_output_contains 'INFO  Skill installation is optional'
  assert_output_contains 'CI: NOT_CHECKED'
  assert_output_contains 'Merge policy: NOT_CHECKED'
  assert_output_excludes 'FAIL  '
  assert_output_excludes 'ERROR '
}

static_mode_never_executes_repository_code() {
  forgeflow_fixture="$forgeflow_test_dir/static execution trap"
  forgeflow_inside_marker="$forgeflow_fixture/inside.marker"
  forgeflow_outside_marker="$forgeflow_test_dir/outside.marker"
  create_complete_fixture "$forgeflow_fixture"
  mkdir -p "$forgeflow_fixture/scripts"

  {
    # Literal Make syntax is intentional in this execution-trap fixture.
    # shellcheck disable=SC2016
    printf 'probe := $(shell printf shell-executed > "%s")\n' \
      "$forgeflow_outside_marker"
    printf 'verify:\n'
    printf '\t@printf recipe-executed > "%s"\n' "$forgeflow_inside_marker"
    printf '\t@./scripts/target-probe\n'
  } >"$forgeflow_fixture/Makefile"
  {
    printf '#!/bin/sh\n'
    printf 'printf script-executed > "%s"\n' "$forgeflow_outside_marker"
  } >"$forgeflow_fixture/scripts/target-probe"
  chmod +x "$forgeflow_fixture/scripts/target-probe"

  run_doctor "$forgeflow_fixture"

  assert_status 0
  assert_output_contains 'Result: STRUCTURE_OK'
  assert_output_contains 'Verification: NOT_RUN'
  [ ! -e "$forgeflow_inside_marker" ] ||
    fail 'static mode executed a Make recipe'
  [ ! -e "$forgeflow_outside_marker" ] ||
    fail 'static mode evaluated Make or executed a target script'
}

static_mode_preserves_repository_tree() {
  forgeflow_fixture="$forgeflow_test_dir/immutable"
  forgeflow_before="$forgeflow_test_dir/immutable.before"
  forgeflow_after="$forgeflow_test_dir/immutable.after"
  create_complete_fixture "$forgeflow_fixture"
  mkdir -p "$forgeflow_fixture/source/nested"
  printf 'preserve this content\n' >"$forgeflow_fixture/source/input.txt"
  printf 'preserve nested content\n' >"$forgeflow_fixture/source/nested/data.txt"
  chmod 750 "$forgeflow_fixture/source"
  chmod 640 "$forgeflow_fixture/source/input.txt"

  snapshot_tree_without_atime "$forgeflow_fixture" "$forgeflow_before"
  run_doctor "$forgeflow_fixture"
  snapshot_tree_without_atime "$forgeflow_fixture" "$forgeflow_after"

  assert_status 0
  if ! cmp -s "$forgeflow_before" "$forgeflow_after"; then
    diff -u "$forgeflow_before" "$forgeflow_after" >&2 || :
    fail 'static mode changed content, permissions, or directory structure'
  fi
}

static_scan_reports_clues_without_claiming_verification() {
  forgeflow_literal_fixture="$forgeflow_test_dir/literal-rule"
  create_complete_fixture "$forgeflow_literal_fixture"

  run_doctor "$forgeflow_literal_fixture"

  assert_status 0
  assert_output_contains 'INFO  Found a literal verify rule; not executed'
  assert_output_contains 'Verification: NOT_RUN'
  assert_output_excludes 'Verification: PASS'

  forgeflow_false_fixture="$forgeflow_test_dir/false-evidence"
  create_complete_fixture "$forgeflow_false_fixture"
  {
    printf '# verify:\n'
    printf '.PHONY: verify\n'
    printf 'verify:=not-a-rule\n'
    printf 'documentation := Run make verify before review\n'
    printf '\t@printf "verify: is documentation here"\n'
    printf 'continued_documentation := ordinary text \\\n'
    printf ' verify:\n'
    printf 'define HELP_TEXT\n'
    printf 'verify:\n'
    printf 'endef\n'
    printf 'define\tTABBED_HELP_TEXT\n'
    printf 'verify:\n'
    printf 'endef\n'
    printf 'override   define SPACED_HELP_TEXT\n'
    printf 'verify:\n'
    printf 'endef\n'
  } >"$forgeflow_false_fixture/Makefile"

  run_doctor "$forgeflow_false_fixture"

  assert_status 0
  assert_output_contains 'WARN  Verification entrypoint: UNCONFIRMED'
  assert_output_excludes 'Found a literal verify rule'
  assert_output_contains 'Verification: NOT_RUN'

  forgeflow_dynamic_fixture="$forgeflow_test_dir/dynamic-rule"
  create_complete_fixture "$forgeflow_dynamic_fixture"
  {
    printf 'include repository-rules.mk\n'
    printf 'target_name := verify\n'
    # Literal Make variable syntax is required by the dynamic-target fixture.
    # shellcheck disable=SC2016
    printf '$(target_name):\n'
    printf '\t@:\n'
  } >"$forgeflow_dynamic_fixture/Makefile"

  run_doctor "$forgeflow_dynamic_fixture"

  assert_status 0
  assert_output_contains 'WARN  Verification entrypoint: UNCONFIRMED'
  assert_output_contains 'WARN  Makefile uses include, continuation, definition, or dynamic syntax; static inspection is limited'
  assert_output_excludes 'Found a literal verify rule'
  assert_output_contains 'Verification: NOT_RUN'
}

explicit_verification_succeeds_once_from_repository_root() {
  forgeflow_fixture="$forgeflow_test_dir/verify-success"
  create_complete_fixture "$forgeflow_fixture"
  {
    printf 'verify:\n'
    printf '\t@printf "run\\n" >> verify-runs.log\n'
    printf '\t@pwd > verify-cwd.txt\n'
    printf '\t@printf "fixture verification output\\n"\n'
  } >"$forgeflow_fixture/Makefile"

  run_doctor --run-verify "$forgeflow_fixture"

  assert_status 0
  assert_output_contains 'WARNING: --run-verify executes repository-owned code'
  assert_output_contains 'Running: make verify'
  assert_output_contains 'fixture verification output'
  assert_output_contains 'Result: VERIFIED_LOCAL'
  assert_output_contains 'Verification: PASS'
  assert_output_contains 'Verification exit: 0'
  assert_output_contains 'CI: NOT_CHECKED'
  assert_output_contains 'Merge policy: NOT_CHECKED'
  assert_output_contains 'Human review is still required.'

  [ -f "$forgeflow_fixture/verify-runs.log" ] ||
    fail 'make verify did not create its invocation record'
  forgeflow_verify_run_count=$(
    wc -l <"$forgeflow_fixture/verify-runs.log" | tr -d '[:space:]'
  )
  [ "$forgeflow_verify_run_count" -eq 1 ] ||
    fail "make verify ran $forgeflow_verify_run_count times"

  forgeflow_expected_cwd=$(
    CDPATH='' cd -P "$forgeflow_fixture"
    pwd
  )
  forgeflow_actual_cwd=$(sed -n '1p' "$forgeflow_fixture/verify-cwd.txt")
  [ "$forgeflow_actual_cwd" = "$forgeflow_expected_cwd" ] ||
    fail "make verify ran from $forgeflow_actual_cwd, expected $forgeflow_expected_cwd"
}

explicit_verification_reports_original_failure_status() {
  forgeflow_fixture="$forgeflow_test_dir/verify-failure"
  forgeflow_fake_bin="$forgeflow_test_dir/fake-bin"
  create_complete_fixture "$forgeflow_fixture"
  mkdir -p "$forgeflow_fake_bin"
  {
    printf '#!/bin/sh\n'
    # These variables belong to the generated fake make, not this test shell.
    # shellcheck disable=SC2016
    printf '[ "$#" -eq 1 ] && [ "$1" = verify ] || exit 97\n'
    printf 'printf "run\\n" >> make-runs.log\n'
    printf 'printf "fixture failure stdout\\n"\n'
    printf 'printf "fixture failure stderr\\n" >&2\n'
    printf 'exit 23\n'
  } >"$forgeflow_fake_bin/make"
  chmod +x "$forgeflow_fake_bin/make"

  run_doctor_with_path "$forgeflow_fake_bin:$PATH" \
    --run-verify "$forgeflow_fixture"

  assert_status 1
  assert_output_contains 'fixture failure stdout'
  assert_output_contains 'fixture failure stderr'
  assert_output_contains 'Result: VERIFICATION_FAILED'
  assert_output_contains 'Verification: FAIL'
  assert_output_contains 'Verification exit: 23'
  assert_output_contains 'CI: NOT_CHECKED'
  assert_output_contains 'Merge policy: NOT_CHECKED'
  forgeflow_verify_run_count=$(
    wc -l <"$forgeflow_fixture/make-runs.log" | tr -d '[:space:]'
  )
  [ "$forgeflow_verify_run_count" -eq 1 ] ||
    fail "failing make verify ran $forgeflow_verify_run_count times"
}

include_defined_verify_runs_when_explicitly_authorized() {
  forgeflow_fixture="$forgeflow_test_dir/include-verify"
  create_complete_fixture "$forgeflow_fixture"
  printf 'include repository-rules.mk\n' >"$forgeflow_fixture/Makefile"
  {
    printf 'verify:\n'
    printf '\t@printf "run\\n" >> include-runs.log\n'
    printf '\t@printf "included verification output\\n"\n'
  } >"$forgeflow_fixture/repository-rules.mk"

  run_doctor "$forgeflow_fixture"

  assert_status 0
  assert_output_contains 'WARN  Verification entrypoint: UNCONFIRMED'
  assert_output_contains 'WARN  Makefile uses include, continuation, definition, or dynamic syntax; static inspection is limited'
  assert_output_contains 'Verification: NOT_RUN'
  [ ! -e "$forgeflow_fixture/include-runs.log" ] ||
    fail 'static inspection executed an included target'

  run_doctor --run-verify "$forgeflow_fixture"

  assert_status 0
  assert_output_contains 'included verification output'
  assert_output_contains 'Result: VERIFIED_LOCAL'
  assert_output_contains 'Verification exit: 0'
  forgeflow_verify_run_count=$(
    wc -l <"$forgeflow_fixture/include-runs.log" | tr -d '[:space:]'
  )
  [ "$forgeflow_verify_run_count" -eq 1 ] ||
    fail "included make verify ran $forgeflow_verify_run_count times"
}

incomplete_structure_blocks_explicit_verification() {
  forgeflow_fixture="$forgeflow_test_dir/incomplete-run"
  forgeflow_inside_marker="$forgeflow_fixture/should-not-run.marker"
  forgeflow_outside_marker="$forgeflow_test_dir/incomplete-outside.marker"
  mkdir -p "$forgeflow_fixture/specs/stories"
  {
    # Literal Make syntax is intentional in this execution-trap fixture.
    # shellcheck disable=SC2016
    printf 'probe := $(shell printf unsafe > "%s")\n' \
      "$forgeflow_outside_marker"
    printf 'verify:\n'
    printf '\t@printf unsafe > "%s"\n' "$forgeflow_inside_marker"
  } >"$forgeflow_fixture/Makefile"

  run_doctor --run-verify "$forgeflow_fixture"

  assert_status 1
  assert_output_contains 'Result: STRUCTURE_INCOMPLETE'
  assert_output_contains 'Verification: NOT_RUN'
  assert_output_excludes 'Running: make verify'
  [ ! -e "$forgeflow_inside_marker" ] ||
    fail 'verification ran despite missing AGENTS.md'
  [ ! -e "$forgeflow_outside_marker" ] ||
    fail 'Makefile was evaluated despite missing AGENTS.md'
}

cli_contract_and_repository_paths_are_unambiguous() {
  forgeflow_fixture_parent="$forgeflow_test_dir/path fixtures"
  forgeflow_fixture="$forgeflow_fixture_parent/relative project"
  forgeflow_root_link="$forgeflow_test_dir/repository-root-link"
  forgeflow_not_directory="$forgeflow_test_dir/not-a-directory"
  forgeflow_empty_path="$forgeflow_test_dir/empty-path"
  create_complete_fixture "$forgeflow_fixture"
  printf 'not a directory\n' >"$forgeflow_not_directory"
  mkdir -p "$forgeflow_empty_path"
  ln -s "$forgeflow_fixture" "$forgeflow_root_link"

  run_doctor --help
  assert_status 0
  assert_output_contains 'ForgeFlow Repository Doctor'
  assert_output_contains 'Usage:'
  assert_output_contains '--run-verify executes repository-owned code'
  assert_output_contains 'Use it only with repositories you trust.'

  run_doctor --unknown
  assert_status 2
  assert_output_contains 'Usage:'
  assert_output_contains 'Result: ERROR'
  assert_output_contains 'Verification: NOT_RUN'

  run_doctor --run-verify --run-verify
  assert_status 2
  assert_output_contains 'Usage:'

  run_doctor "$forgeflow_fixture" --run-verify
  assert_status 2
  assert_output_contains 'Usage:'

  run_doctor --help "$forgeflow_fixture"
  assert_status 2
  assert_output_contains 'Usage:'

  run_doctor "$forgeflow_fixture" "$forgeflow_fixture"
  assert_status 2
  assert_output_contains 'Usage:'

  run_doctor_from_directory "$forgeflow_fixture_parent" 'relative project'
  assert_status 0
  assert_output_contains 'Result: STRUCTURE_OK'

  run_doctor "$forgeflow_fixture"
  assert_status 0
  assert_output_contains 'Result: STRUCTURE_OK'

  run_doctor_from_directory "$forgeflow_fixture"
  assert_status 0
  assert_output_contains 'Result: STRUCTURE_OK'

  run_doctor "$forgeflow_root_link"
  assert_status 0
  assert_output_contains 'Result: STRUCTURE_OK'

  run_doctor "$forgeflow_not_directory"
  assert_status 2
  assert_output_contains 'Result: ERROR'
  assert_output_contains 'Verification: NOT_RUN'

  run_doctor "$forgeflow_test_dir/does-not-exist"
  assert_status 2
  assert_output_contains 'Result: ERROR'
  assert_output_contains 'Verification: NOT_RUN'

  forgeflow_unsearchable_root="$forgeflow_test_dir/unsearchable-root"
  create_complete_fixture "$forgeflow_unsearchable_root"
  chmod 000 "$forgeflow_unsearchable_root"
  run_doctor "$forgeflow_unsearchable_root"
  chmod 700 "$forgeflow_unsearchable_root"
  assert_status 2
  assert_output_contains 'ERROR Repository directory cannot be resolved:'
  assert_output_contains 'Result: ERROR'
  assert_output_contains 'Verification: NOT_RUN'

  run_doctor_from_directory "$forgeflow_fixture" --run-verify
  assert_status 0
  assert_output_contains 'Result: VERIFIED_LOCAL'
  assert_output_contains 'Verification exit: 0'

  run_doctor_with_path "$forgeflow_empty_path" \
    --run-verify "$forgeflow_fixture"
  assert_status 2
  assert_output_contains 'ERROR make is required for --run-verify but is not available'
  assert_output_contains 'Result: ERROR'
  assert_output_contains 'Verification: NOT_RUN'

  forgeflow_relative_path_caller="$forgeflow_test_dir/relative-path-caller"
  forgeflow_relative_path_marker="$forgeflow_test_dir/relative-path.marker"
  mkdir -p "$forgeflow_relative_path_caller/bin"
  {
    printf '#!/bin/sh\n'
    printf 'printf executed > "%s"\n' "$forgeflow_relative_path_marker"
    printf 'exit 0\n'
  } >"$forgeflow_relative_path_caller/bin/make"
  chmod +x "$forgeflow_relative_path_caller/bin/make"

  run_doctor_from_directory_with_path \
    "$forgeflow_relative_path_caller" bin \
    --run-verify "$forgeflow_fixture"

  assert_status 2
  assert_output_contains 'ERROR make is required for --run-verify but is not available'
  assert_output_contains 'Result: ERROR'
  assert_output_contains 'Verification: NOT_RUN'
  assert_output_excludes 'Running: make verify'
  [ ! -e "$forgeflow_relative_path_marker" ] ||
    fail 'Doctor executed a make found only relative to the caller directory'
}

required_path_symlinks_and_permissions_are_unconfirmed_errors() {
  forgeflow_outside_guide="$forgeflow_test_dir/outside-guide"
  forgeflow_outside_makefile="$forgeflow_test_dir/outside-Makefile"
  forgeflow_outside_specs="$forgeflow_test_dir/outside-specs"
  forgeflow_outside_stories="$forgeflow_test_dir/outside-stories"
  printf 'outside agent guide\n' >"$forgeflow_outside_guide"
  printf 'verify:\n\t@:\n' >"$forgeflow_outside_makefile"
  mkdir -p "$forgeflow_outside_specs/stories" "$forgeflow_outside_stories"

  forgeflow_agents_link_fixture="$forgeflow_test_dir/symlink-agents"
  mkdir -p "$forgeflow_agents_link_fixture/specs/stories"
  printf 'verify:\n\t@:\n' >"$forgeflow_agents_link_fixture/Makefile"
  ln -s "$forgeflow_outside_guide" \
    "$forgeflow_agents_link_fixture/AGENTS.md"

  forgeflow_makefile_link_fixture="$forgeflow_test_dir/symlink-makefile"
  mkdir -p "$forgeflow_makefile_link_fixture/specs/stories"
  printf 'agent guide\n' >"$forgeflow_makefile_link_fixture/AGENTS.md"
  ln -s "$forgeflow_outside_makefile" \
    "$forgeflow_makefile_link_fixture/Makefile"

  forgeflow_specs_link_fixture="$forgeflow_test_dir/symlink-specs"
  mkdir -p "$forgeflow_specs_link_fixture"
  printf 'agent guide\n' >"$forgeflow_specs_link_fixture/AGENTS.md"
  printf 'verify:\n\t@:\n' >"$forgeflow_specs_link_fixture/Makefile"
  ln -s "$forgeflow_outside_specs" "$forgeflow_specs_link_fixture/specs"

  forgeflow_stories_link_fixture="$forgeflow_test_dir/symlink-stories"
  mkdir -p "$forgeflow_stories_link_fixture/specs"
  printf 'agent guide\n' >"$forgeflow_stories_link_fixture/AGENTS.md"
  printf 'verify:\n\t@:\n' >"$forgeflow_stories_link_fixture/Makefile"
  ln -s "$forgeflow_outside_stories" \
    "$forgeflow_stories_link_fixture/specs/stories"

  forgeflow_dangling_link_fixture="$forgeflow_test_dir/symlink-dangling"
  mkdir -p "$forgeflow_dangling_link_fixture/specs/stories"
  printf 'verify:\n\t@:\n' >"$forgeflow_dangling_link_fixture/Makefile"
  ln -s "$forgeflow_test_dir/missing-guide" \
    "$forgeflow_dangling_link_fixture/AGENTS.md"

  for forgeflow_fixture in \
    "$forgeflow_agents_link_fixture" \
    "$forgeflow_makefile_link_fixture" \
    "$forgeflow_specs_link_fixture" \
    "$forgeflow_stories_link_fixture" \
    "$forgeflow_dangling_link_fixture"
  do
    run_doctor "$forgeflow_fixture"
    assert_status 2
    assert_output_contains 'ERROR Required path is a symlink and cannot be safely confirmed:'
    assert_output_contains 'Result: ERROR'
    assert_output_contains 'Verification: NOT_RUN'
  done

  [ -L "$forgeflow_agents_link_fixture/AGENTS.md" ] ||
    fail 'Doctor replaced the AGENTS.md symlink'
  [ -L "$forgeflow_makefile_link_fixture/Makefile" ] ||
    fail 'Doctor replaced the Makefile symlink'
  [ -L "$forgeflow_specs_link_fixture/specs" ] ||
    fail 'Doctor replaced the specs symlink'
  [ -L "$forgeflow_stories_link_fixture/specs/stories" ] ||
    fail 'Doctor replaced the stories symlink'
  [ -L "$forgeflow_dangling_link_fixture/AGENTS.md" ] ||
    fail 'Doctor replaced the dangling AGENTS.md symlink'
  [ "$(sed -n '1p' "$forgeflow_outside_guide")" = 'outside agent guide' ] ||
    fail 'Doctor changed the AGENTS.md symlink target'
  [ "$(sed -n '1p' "$forgeflow_outside_makefile")" = 'verify:' ] ||
    fail 'Doctor changed the Makefile symlink target'

  for forgeflow_unreadable_name in agents makefile stories
  do
    forgeflow_fixture="$forgeflow_test_dir/unreadable-$forgeflow_unreadable_name"
    create_complete_fixture "$forgeflow_fixture"

    case "$forgeflow_unreadable_name" in
      agents) forgeflow_unreadable_path="$forgeflow_fixture/AGENTS.md" ;;
      makefile) forgeflow_unreadable_path="$forgeflow_fixture/Makefile" ;;
      stories) forgeflow_unreadable_path="$forgeflow_fixture/specs/stories" ;;
    esac

    chmod 000 "$forgeflow_unreadable_path"
    # Fixture paths are controlled and cannot contain newlines.
    # shellcheck disable=SC2012
    forgeflow_mode_before=$(
      LC_ALL=C ls -ldn "$forgeflow_unreadable_path" | cut -c1-10
    )
    run_doctor "$forgeflow_fixture"
    # Fixture paths are controlled and cannot contain newlines.
    # shellcheck disable=SC2012
    forgeflow_mode_after=$(
      LC_ALL=C ls -ldn "$forgeflow_unreadable_path" | cut -c1-10
    )
    chmod u+rwX "$forgeflow_unreadable_path"

    assert_status 2
    assert_output_contains 'ERROR Required path is not readable:'
    assert_output_contains 'Result: ERROR'
    assert_output_contains 'Verification: NOT_RUN'
    [ "$forgeflow_mode_before" = "$forgeflow_mode_after" ] ||
      fail "Doctor changed permissions for $forgeflow_unreadable_name"
  done

  forgeflow_fixture="$forgeflow_test_dir/error-precedence"
  mkdir -p "$forgeflow_fixture/specs/stories"
  ln -s "$forgeflow_outside_guide" "$forgeflow_fixture/AGENTS.md"

  run_doctor --run-verify "$forgeflow_fixture"

  assert_status 2
  assert_output_contains 'FAIL  Makefile is missing'
  assert_output_contains 'Result: ERROR'
  assert_output_contains 'Verification: NOT_RUN'
  assert_output_excludes 'Running: make verify'
}

root_verify_runs_doctor_and_retains_existing_gates() {
  forgeflow_root_makefile="$forgeflow_repo/Makefile"

  grep -Eq '^verify:.*verify-protocol.*verify-bootstrap.*verify-doctor.*verify-release.*verify-typescript.*verify-go.*verify-actions' \
    "$forgeflow_root_makefile" ||
    fail 'root verify does not retain all gates and include verify-doctor'
  grep -Fqx 'verify-doctor:' "$forgeflow_root_makefile" ||
    fail 'root Makefile does not expose verify-doctor'
  grep -Fq 'sh -n scripts/doctor tests/doctor.sh' "$forgeflow_root_makefile" ||
    fail 'verify-doctor does not check Doctor shell syntax'
  grep -Fq './tests/doctor.sh' "$forgeflow_root_makefile" ||
    fail 'verify-doctor does not execute Doctor acceptance tests'
}

run_case 'AC-001' bootstrap_requires_repository_makefile
run_case 'AC-002' optional_adoption_files_are_not_required
run_case 'AC-003' static_mode_never_executes_repository_code
run_case 'AC-004' static_mode_preserves_repository_tree
run_case 'AC-005' static_scan_reports_clues_without_claiming_verification
run_case 'AC-006' explicit_verification_succeeds_once_from_repository_root
run_case 'AC-007' explicit_verification_reports_original_failure_status
run_case 'AC-008' include_defined_verify_runs_when_explicitly_authorized
run_case 'AC-009' incomplete_structure_blocks_explicit_verification
run_case 'AC-010' cli_contract_and_repository_paths_are_unambiguous
run_case 'AC-011' required_path_symlinks_and_permissions_are_unconfirmed_errors
run_case 'AC-012' root_verify_runs_doctor_and_retains_existing_gates

printf 'doctor tests passed\n'
