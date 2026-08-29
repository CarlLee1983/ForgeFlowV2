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
    '## Constraints'
  do
    grep -Fqx "$forgeflow_required_heading" "$forgeflow_heading_file" ||
      fail "$forgeflow_heading_label is missing: $forgeflow_required_heading"
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
  protocol/repository-contract.md \
  protocol/versioning.md \
  skills/story-development/SKILL.md \
  templates/AGENTS.md \
  templates/story/story.md \
  templates/story/acceptance.md \
  templates/story/task.md \
  templates/ci/github-actions.yml \
  docs/concepts.md \
  docs/getting-started.md \
  examples/typescript/Makefile \
  examples/go/Makefile \
  scripts/bootstrap
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

for forgeflow_story_directory in \
  specs/stories/FF-201-protocol-version-contract \
  specs/stories/FF-202-bootstrap-dry-run \
  specs/stories/FF-203-executable-story-example \
  specs/stories/FF-204-linux-ci \
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

grep -Fqx 'MIT License' "$forgeflow_repo/LICENSE" ||
  fail 'LICENSE does not declare the MIT License'

grep -Fq '[MIT License](LICENSE)' "$forgeflow_repo/README.md" ||
  fail 'README does not link to the MIT License'

printf 'protocol tests passed\n'
