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

for forgeflow_required_file in \
  LICENSE \
  README.md \
  protocol/story.md \
  protocol/verification.md \
  protocol/lifecycle.md \
  protocol/repository-contract.md \
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

for forgeflow_story_heading in \
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
  grep -Fqx "$forgeflow_story_heading" \
    "$forgeflow_repo/templates/story/story.md" ||
    fail "Story template is missing: $forgeflow_story_heading"
done

for forgeflow_acceptance_heading in \
  '## Happy Path' \
  '## Business Rules' \
  '## Failure Cases' \
  '## Regression Requirements' \
  '## Verification Notes'
do
  grep -Fqx "$forgeflow_acceptance_heading" \
    "$forgeflow_repo/templates/story/acceptance.md" ||
    fail "Acceptance template is missing: $forgeflow_acceptance_heading"
done

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

grep -Fqx 'MIT License' "$forgeflow_repo/LICENSE" ||
  fail 'LICENSE does not declare the MIT License'

grep -Fq '[MIT License](LICENSE)' "$forgeflow_repo/README.md" ||
  fail 'README does not link to the MIT License'

printf 'protocol tests passed\n'
