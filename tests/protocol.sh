#!/bin/sh

set -eu

fail() {
  printf 'protocol test failed: %s\n' "$1" >&2
  exit 1
}

forgeflow_repo=$(
  cd -P "$(dirname "$0")/.." >/dev/null 2>&1
  pwd
)

valid_version_file() {
  forgeflow_version_file=$1

  [ -f "$forgeflow_version_file" ] || return 1

  forgeflow_version_line_count=$(
    wc -l <"$forgeflow_version_file" | tr -d '[:space:]'
  )

  [ "$forgeflow_version_line_count" -eq 1 ] &&
    grep -Eq '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$' \
      "$forgeflow_version_file"
}

check_story_headings() {
  forgeflow_heading_file=$1
  forgeflow_heading_label=$2

  for forgeflow_required_heading in \
    '## Goal' \
    '## Context' \
    '## Scope' \
    '## Inputs' \
    '## Outputs' \
    '## Rules' \
    '## Expected Errors' \
    '## Dependencies' \
    '## Classification' \
    '## Constraints'
  do
    grep -Fqx "$forgeflow_required_heading" "$forgeflow_heading_file" ||
      fail "$forgeflow_heading_label is missing: $forgeflow_required_heading"
  done
}

check_acceptance_mapping() {
  forgeflow_mapping_acceptance=$1
  forgeflow_mapping_tests=$2
  shift 2

  for forgeflow_mapping_ac_number in "$@"
  do
    forgeflow_mapping_acceptance_count=$(
      grep -Ec "AC-$forgeflow_mapping_ac_number:" \
        "$forgeflow_mapping_acceptance" || :
    )
    forgeflow_mapping_test_count=$(
      grep -Ec "^run_case 'AC-$forgeflow_mapping_ac_number'" \
        "$forgeflow_mapping_tests" || :
    )

    if [ "$forgeflow_mapping_acceptance_count" -ne 1 ]; then
      fail "$forgeflow_mapping_acceptance must define AC-$forgeflow_mapping_ac_number exactly once"
    fi

    if [ "$forgeflow_mapping_test_count" -ne 1 ]; then
      fail "$forgeflow_mapping_tests must map AC-$forgeflow_mapping_ac_number exactly once"
    fi
  done
}

check_acceptance_headings() {
  forgeflow_heading_file=$1
  forgeflow_heading_label=$2

  for forgeflow_required_heading in \
    '## Happy Path' \
    '## Business Rules' \
    '## Failure Cases' \
    '## Regression Requirements' \
    '## Verification Notes'
  do
    grep -Fqx "$forgeflow_required_heading" "$forgeflow_heading_file" ||
      fail "$forgeflow_heading_label is missing: $forgeflow_required_heading"
  done
}

for forgeflow_required_file in \
  LICENSE \
  VERSION \
  .node-version \
  .github/workflows/verify.yml \
  README.md \
  protocol/story.md \
  protocol/verification.md \
  protocol/lifecycle.md \
  protocol/handoff.md \
  protocol/repository-contract.md \
  protocol/versioning.md \
  skills/story-development/SKILL.md \
  templates/AGENTS.md \
  templates/story/story.md \
  templates/story/acceptance.md \
  templates/story/task.md \
  templates/handoff.md \
  templates/ci/github-actions.yml \
  docs/code-quality.md \
  docs/concepts.md \
  docs/contract-checks.md \
  docs/doctor.md \
  docs/getting-started.md \
  docs/releasing.md \
  examples/typescript/Makefile \
  examples/typescript/scripts/check-traceability.sh \
  examples/typescript/tests/traceability.sh \
  examples/go/Makefile \
  scripts/bootstrap \
  scripts/doctor \
  scripts/story-check \
  scripts/handoff-check \
  scripts/release-check \
  specs/handoff.md \
  tests/doctor.sh \
  tests/story-check.sh \
  tests/handoff-check.sh \
  tests/release-check.sh \
  tests/review-integrity.sh \
  specs/stories/FF-216-review-integrity-and-state-consistency/story.md \
  specs/stories/FF-216-review-integrity-and-state-consistency/acceptance.md \
  specs/stories/FF-216-review-integrity-and-state-consistency/task.md
do
  if [ ! -s "$forgeflow_repo/$forgeflow_required_file" ]; then
    fail "required artifact is missing or empty: $forgeflow_required_file"
  fi
done

if ! valid_version_file "$forgeflow_repo/VERSION"; then
  fail 'VERSION must contain one MAJOR.MINOR.PATCH value'
fi

forgeflow_version_test_dir=$(
  mktemp -d "${TMPDIR:-/tmp}/forgeflow-version.XXXXXX"
)

cleanup_version_tests() {
  rm -rf "$forgeflow_version_test_dir"
}

trap cleanup_version_tests EXIT
trap 'exit 1' HUP INT TERM

printf '0.2.0\n' >"$forgeflow_version_test_dir/valid"
valid_version_file "$forgeflow_version_test_dir/valid" ||
  fail 'version validator rejected valid metadata'

for forgeflow_invalid_version in empty short prefixed leading-zero multiline
do
  case "$forgeflow_invalid_version" in
    empty)
      : >"$forgeflow_version_test_dir/$forgeflow_invalid_version"
      ;;
    short)
      printf '0.2\n' >"$forgeflow_version_test_dir/$forgeflow_invalid_version"
      ;;
    prefixed)
      printf 'v0.2.0\n' >"$forgeflow_version_test_dir/$forgeflow_invalid_version"
      ;;
    leading-zero)
      printf '00.2.0\n' >"$forgeflow_version_test_dir/$forgeflow_invalid_version"
      ;;
    multiline)
      printf '0.2.0\nextra\n' \
        >"$forgeflow_version_test_dir/$forgeflow_invalid_version"
      ;;
  esac

  if valid_version_file \
    "$forgeflow_version_test_dir/$forgeflow_invalid_version"; then
    fail "version validator accepted $forgeflow_invalid_version metadata"
  fi
done

if valid_version_file "$forgeflow_version_test_dir/missing"; then
  fail 'version validator accepted missing metadata'
fi

grep -Fq "[\`VERSION\`](VERSION)" "$forgeflow_repo/README.md" ||
  fail 'README does not link to the protocol version authority'

grep -Fq '[Protocol Versioning policy](protocol/versioning.md)' \
  "$forgeflow_repo/README.md" ||
  fail 'README does not link to the protocol versioning policy'

for forgeflow_versioning_term in \
  'single authority' \
  'Breaking' \
  'Additive' \
  'Corrective' \
  'Before ForgeFlow 1.0' \
  'Starting with 1.0' \
  'vMAJOR.MINOR.PATCH' \
  'private TypeScript example'
do
  grep -Fq "$forgeflow_versioning_term" \
    "$forgeflow_repo/protocol/versioning.md" ||
    fail "versioning policy is missing: $forgeflow_versioning_term"
done

grep -Fq '[Repository Doctor](docs/doctor.md)' "$forgeflow_repo/README.md" ||
  fail 'README does not link to Repository Doctor documentation'

grep -Fq '[Repository Doctor](doctor.md)' \
  "$forgeflow_repo/docs/getting-started.md" ||
  fail 'Getting Started does not link to Repository Doctor documentation'

forgeflow_doctor_document="$forgeflow_repo/docs/doctor.md"

for forgeflow_doctor_document_term in \
  './scripts/doctor [repository-directory]' \
  './scripts/doctor --run-verify [repository-directory]' \
  'Verification: NOT_RUN' \
  'STRUCTURE_OK' \
  'STRUCTURE_INCOMPLETE' \
  'VERIFIED_LOCAL' \
  'VERIFICATION_FAILED' \
  'NOT_CHECKED' \
  'Human review is always still required' \
  'Doctor never authorizes a merge'
do
  grep -Fq -- "$forgeflow_doctor_document_term" \
    "$forgeflow_doctor_document" ||
    fail "Doctor documentation is missing: $forgeflow_doctor_document_term"
done

grep -Fq 'Repository Doctor is an **Additive** capability' \
  "$forgeflow_repo/protocol/versioning.md" ||
  fail 'versioning policy does not classify Repository Doctor as Additive'

for forgeflow_story_directory in \
  specs/stories/FF-201-protocol-version-contract \
  specs/stories/FF-202-bootstrap-dry-run \
  specs/stories/FF-203-executable-story-example \
  specs/stories/FF-204-linux-ci \
  specs/stories/FF-205-release-readiness \
  specs/stories/FF-206-typescript-executable-story-parity \
  specs/stories/FF-207-repository-doctor \
  specs/stories/FF-208-security-fixture-matrix \
  specs/stories/FF-209-handoff-contract \
  examples/typescript/specs/stories/TYP-001-order-total \
  examples/go/specs/stories/ORD-001-order-total
do
  forgeflow_story_file="$forgeflow_repo/$forgeflow_story_directory/story.md"
  forgeflow_acceptance_file="$forgeflow_repo/$forgeflow_story_directory/acceptance.md"

  if [ ! -s "$forgeflow_story_file" ] ||
    [ ! -s "$forgeflow_acceptance_file" ]; then
    fail "approved Story artifacts are missing: $forgeflow_story_directory"
  fi

  check_story_headings "$forgeflow_story_file" "$forgeflow_story_directory"
  check_acceptance_headings \
    "$forgeflow_acceptance_file" "$forgeflow_story_directory"

  if grep -Eq '<ID>|<Title>|Describe the user or business outcome|^\*[[:space:]]*$' \
    "$forgeflow_story_file" "$forgeflow_acceptance_file"; then
    fail "approved Story contains template placeholders: $forgeflow_story_directory"
  fi
done

forgeflow_doctor_acceptance="$forgeflow_repo/specs/stories/FF-207-repository-doctor/acceptance.md"
forgeflow_doctor_tests="$forgeflow_repo/tests/doctor.sh"

check_acceptance_mapping "$forgeflow_doctor_acceptance" \
  "$forgeflow_doctor_tests" \
  001 002 003 004 005 006 007 008 009 010 011 012

for forgeflow_doctor_artifact in scripts/doctor tests/doctor.sh
do
  if [ ! -x "$forgeflow_repo/$forgeflow_doctor_artifact" ]; then
    fail "Doctor artifact is not executable: $forgeflow_doctor_artifact"
  fi
done

forgeflow_typescript_makefile="$forgeflow_repo/examples/typescript/Makefile"

grep -Eq '^traceability:' "$forgeflow_typescript_makefile" ||
  fail 'TypeScript example does not expose the focused traceability target'

grep -Fq "\$(MAKE) traceability" "$forgeflow_typescript_makefile" ||
  fail 'TypeScript verify does not include Story traceability'

for forgeflow_typescript_traceability_artifact in \
  examples/typescript/scripts/check-traceability.sh \
  examples/typescript/tests/traceability.sh
do
  if [ ! -x "$forgeflow_repo/$forgeflow_typescript_traceability_artifact" ]; then
    fail "TypeScript traceability artifact is not executable: $forgeflow_typescript_traceability_artifact"
  fi
done

grep -Fq "[\`specs/stories/TYP-001-order-total\`](specs/stories/TYP-001-order-total/)" \
  "$forgeflow_repo/examples/typescript/README.md" ||
  fail 'TypeScript README does not link to the executable Story'

forgeflow_makefile="$forgeflow_repo/Makefile"

grep -Eq '^verify:.*verify-release' "$forgeflow_makefile" ||
  fail 'root verify does not include release-check tests'

grep -Eq '^verify:.*verify-doctor' "$forgeflow_makefile" ||
  fail 'root verify does not include Doctor tests'

grep -Fqx 'verify-doctor:' "$forgeflow_makefile" ||
  fail 'root Makefile does not expose verify-doctor'

grep -Fq 'sh -n scripts/doctor tests/doctor.sh' "$forgeflow_makefile" ||
  fail 'verify-doctor does not validate shell syntax'

grep -Fq './tests/doctor.sh' "$forgeflow_makefile" ||
  fail 'verify-doctor does not run Doctor acceptance tests'

grep -Eq '^release-check:[[:space:]]+verify$' "$forgeflow_makefile" ||
  fail 'release-check does not depend on canonical verify'

grep -Fq './scripts/release-check' "$forgeflow_makefile" ||
  fail 'release-check target does not invoke the local checker'

forgeflow_release_runbook="$forgeflow_repo/docs/releasing.md"

for forgeflow_release_term in \
  'make release-check' \
  'local-only' \
  'candidate_version' \
  'candidate_tag' \
  'candidate_sha' \
  'candidate_remote' \
  'candidate_remote_url' \
  'candidate_repository' \
  'one identical fetch/push URL' \
  'Git remote and GitHub repository do not match' \
  'exact candidate SHA' \
  'git cat-file -t' \
  'gh release create' \
  '--verify-tag' \
  'explicit authorization' \
  'remote tag peels'
do
  grep -Fq -- "$forgeflow_release_term" "$forgeflow_release_runbook" ||
    fail "release runbook is missing: $forgeflow_release_term"
done

grep -Fq '[release runbook](docs/releasing.md)' "$forgeflow_repo/README.md" ||
  fail 'README does not link to the release runbook'

for forgeflow_release_checker_term in \
  'GIT_NO_LAZY_FETCH=1' \
  "'HEAD:VERSION'" \
  "--format='%(refname) %(objectname)'" \
  'remote_checks=not-performed'
do
  grep -Fq -- "$forgeflow_release_checker_term" \
    "$forgeflow_repo/scripts/release-check" ||
    fail "release checker is missing: $forgeflow_release_checker_term"
done

if grep -Fq 'refname:short' "$forgeflow_repo/scripts/release-check"; then
  fail 'release checker must not use ambiguous short tag refs'
fi

if grep -Eq '(^|[;&|[:space:]])(gh|curl|wget)([;&|[:space:]]|$)|git.*[[:space:]](fetch|push|ls-remote|update-ref|tag)([;&|[:space:]]|$)' \
  "$forgeflow_repo/scripts/release-check"; then
  fail 'release checker must not perform network or Git mutation commands'
fi

check_story_headings \
  "$forgeflow_repo/templates/story/story.md" 'Story template'
check_acceptance_headings \
  "$forgeflow_repo/templates/story/acceptance.md" 'Acceptance template'

for forgeflow_state in \
  DRAFT \
  READY \
  IMPLEMENTING \
  VERIFYING \
  REVIEW \
  DONE \
  SPEC_BLOCKED
do
  grep -Fq "$forgeflow_state" "$forgeflow_repo/protocol/lifecycle.md" ||
    fail "lifecycle is missing state: $forgeflow_state"
done

for forgeflow_transition in \
  'DRAFT → READY' \
  'READY → IMPLEMENTING' \
  'IMPLEMENTING → VERIFYING' \
  'VERIFYING → IMPLEMENTING' \
  'VERIFYING → REVIEW' \
  'REVIEW → DONE' \
  'IMPLEMENTING → SPEC_BLOCKED' \
  'SPEC_BLOCKED → READY'
do
  grep -Fq "$forgeflow_transition" \
    "$forgeflow_repo/protocol/lifecycle.md" ||
    fail "lifecycle is missing transition: $forgeflow_transition"
done

grep -Fq 'run: make verify' \
  "$forgeflow_repo/templates/ci/github-actions.yml" ||
  fail "CI template does not invoke make verify"

forgeflow_workflow="$forgeflow_repo/.github/workflows/verify.yml"

for forgeflow_workflow_term in \
  'pull_request:' \
  'push:' \
  'contents: read' \
  'runs-on: ubuntu-latest' \
  'timeout-minutes:' \
  'node-version-file: .node-version' \
  'working-directory: examples/typescript' \
  'require-lockfile: true' \
  'go-version-file: examples/go/go.mod' \
  'go -C examples/go mod download' \
  'run: make verify'
do
  grep -Fq "$forgeflow_workflow_term" "$forgeflow_workflow" ||
    fail "repository workflow is missing: $forgeflow_workflow_term"
done

forgeflow_node_version_line_count=$(
  wc -l <"$forgeflow_repo/.node-version" | tr -d '[:space:]'
)

if [ "$forgeflow_node_version_line_count" -ne 1 ] ||
  ! grep -Eq '^[1-9][0-9]*$' "$forgeflow_repo/.node-version"; then
  fail '.node-version must contain one numeric Node major release'
fi

if grep -Fq 'continue-on-error' "$forgeflow_workflow"; then
  fail 'repository workflow must not ignore failures'
fi

forgeflow_action_count=$(grep -Ec '^[[:space:]]*uses:' "$forgeflow_workflow")
forgeflow_pinned_action_count=$(
  grep -Ec '^[[:space:]]*uses: [^@]+@[0-9a-f]{40}([[:space:]]|$)' \
    "$forgeflow_workflow"
)

if [ "$forgeflow_action_count" -eq 0 ] ||
  [ "$forgeflow_action_count" -ne "$forgeflow_pinned_action_count" ]; then
  fail 'repository workflow actions must use immutable commit SHAs'
fi

forgeflow_story_contract_acceptance="$forgeflow_repo/specs/stories/FF-208-security-fixture-matrix/acceptance.md"
forgeflow_story_contract_tests="$forgeflow_repo/tests/story-check.sh"
forgeflow_handoff_acceptance="$forgeflow_repo/specs/stories/FF-209-handoff-contract/acceptance.md"
forgeflow_handoff_tests="$forgeflow_repo/tests/handoff-check.sh"
forgeflow_review_integrity_acceptance="$forgeflow_repo/specs/stories/FF-216-review-integrity-and-state-consistency/acceptance.md"
forgeflow_review_integrity_tests="$forgeflow_repo/tests/review-integrity.sh"

check_acceptance_mapping \
  "$forgeflow_story_contract_acceptance" "$forgeflow_story_contract_tests" \
  001 002 003 004 005 006 007 008 009 010 011 012

check_acceptance_mapping \
  "$forgeflow_handoff_acceptance" "$forgeflow_handoff_tests" \
  001 002 003 004 005 006 007 008 009 010

check_acceptance_mapping \
  "$forgeflow_review_integrity_acceptance" "$forgeflow_review_integrity_tests" \
  001 002 003 004 005 006 007 008 009 010 011 012

for forgeflow_contract_artifact in \
  scripts/story-check \
  scripts/handoff-check \
  tests/story-check.sh \
  tests/handoff-check.sh
do
  if [ ! -x "$forgeflow_repo/$forgeflow_contract_artifact" ]; then
    fail "contract check artifact is not executable: $forgeflow_contract_artifact"
  fi
done

grep -Eq '^verify:.*verify-story' "$forgeflow_makefile" ||
  fail 'root verify does not include the Story contract check'

grep -Eq '^verify:.*verify-handoff' "$forgeflow_makefile" ||
  fail 'root verify does not include the handoff contract check'

grep -Fqx 'verify-story:' "$forgeflow_makefile" ||
  fail 'root Makefile does not expose verify-story'

grep -Fqx 'verify-handoff:' "$forgeflow_makefile" ||
  fail 'root Makefile does not expose verify-handoff'

grep -Fq '[Handoff](protocol/handoff.md)' "$forgeflow_repo/README.md" ||
  fail 'README does not link to the Handoff Contract'

grep -Fq '[Contract checks](docs/contract-checks.md)' \
  "$forgeflow_repo/README.md" ||
  fail 'README does not link to the contract check documentation'

grep -Fq '[Handoff Contract](handoff.md)' \
  "$forgeflow_repo/protocol/lifecycle.md" ||
  fail 'lifecycle does not link to the Handoff Contract'

for forgeflow_story_contract_term in \
  '## Classification' \
  'Security sensitive' \
  'Baseline conformance' \
  '## Trust Boundary Fields' \
  '## Superseded Behavior' \
  '| Source field | Payload | Expected result | Persisted locations | Verification |'
do
  grep -Fq -- "$forgeflow_story_contract_term" \
    "$forgeflow_repo/templates/story/story.md" \
    "$forgeflow_repo/templates/story/acceptance.md" ||
    fail "Story templates are missing: $forgeflow_story_contract_term"
done

for forgeflow_story_document_term in \
  '## Security Fixture Matrix' \
  'preserve' \
  'redact' \
  'reject' \
  'omit' \
  'STORY_CONTRACT_OK' \
  'STORY_CONTRACT_INCOMPLETE'
do
  grep -Fq -- "$forgeflow_story_document_term" \
    "$forgeflow_repo/docs/contract-checks.md" ||
    fail "contract check documentation is missing: $forgeflow_story_document_term"
done

for forgeflow_handoff_document_term in \
  'current_story' \
  'next_story' \
  'completed_stories' \
  'dirty_worktree' \
  'story_owned_paths' \
  'known_unrelated_paths' \
  'last_command'
do
  grep -Fq -- "$forgeflow_handoff_document_term" \
    "$forgeflow_repo/protocol/handoff.md" ||
    fail "Handoff Contract is missing: $forgeflow_handoff_document_term"

  grep -Fq -- "$forgeflow_handoff_document_term" \
    "$forgeflow_repo/templates/handoff.md" ||
    fail "handoff template is missing: $forgeflow_handoff_document_term"
done

for forgeflow_handoff_result_term in \
  'HANDOFF_CONTRACT_OK' \
  'HANDOFF_CONTRACT_INCOMPLETE'
do
  grep -Fq -- "$forgeflow_handoff_result_term" \
    "$forgeflow_repo/protocol/handoff.md" ||
    fail "Handoff Contract is missing: $forgeflow_handoff_result_term"

  grep -Fq -- "$forgeflow_handoff_result_term" \
    "$forgeflow_repo/docs/contract-checks.md" ||
    fail "contract check documentation is missing: $forgeflow_handoff_result_term"
done

grep -Fq 'Story `## Classification` declaration is a **Breaking** change' \
  "$forgeflow_repo/protocol/versioning.md" ||
  fail 'versioning policy does not classify the Classification field'

grep -Fq '**Additive** capabilities' "$forgeflow_repo/protocol/versioning.md" ||
  fail 'versioning policy does not classify the contract checks as additive'

grep -Fqx 'MIT License' "$forgeflow_repo/LICENSE" ||
  fail 'LICENSE does not declare the MIT License'

grep -Fq '[MIT License](LICENSE)' "$forgeflow_repo/README.md" ||
  fail 'README does not link to the MIT License'

printf 'protocol tests passed\n'
