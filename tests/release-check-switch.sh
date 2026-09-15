#!/bin/sh

set -eu

fail() {
  printf 'release-check-switch test failed: %s\n' "$1" >&2
  exit 1
}

test_root=$(CDPATH='' cd -P "$(dirname "$0")/.." && pwd)
test_dir=$(mktemp -d "${TMPDIR:-/tmp}/praxisbound-release-switch.XXXXXX")
trap 'rm -rf "$test_dir"' EXIT
trap 'exit 1' HUP INT TERM

GIT_CONFIG_GLOBAL=/dev/null
GIT_CONFIG_NOSYSTEM=1
GIT_CONFIG_COUNT=2
GIT_CONFIG_KEY_0=core.hooksPath
GIT_CONFIG_VALUE_0="$test_dir/no-hooks"
GIT_CONFIG_KEY_1=commit.gpgSign
GIT_CONFIG_VALUE_1=false
export GIT_CONFIG_GLOBAL GIT_CONFIG_NOSYSTEM GIT_CONFIG_COUNT
export GIT_CONFIG_KEY_0 GIT_CONFIG_VALUE_0 GIT_CONFIG_KEY_1 GIT_CONFIG_VALUE_1
mkdir "$test_dir/no-hooks"

# The outer release-check target may export its own selected implementation
# while verifying. Fixture defaults are fixed independently of that selection.
RELEASE_CHECK_IMPLEMENTATION=typescript
export RELEASE_CHECK_IMPLEMENTATION
RELEASE_TEST_REAL_NODE=$(command -v node)
RELEASE_TEST_NODE_LOG="$test_dir/node.log"
export RELEASE_TEST_REAL_NODE RELEASE_TEST_NODE_LOG
mkdir "$test_dir/wrappers"
cat >"$test_dir/wrappers/node" <<'EOF'
#!/bin/sh
printf 'node\n' >> "$RELEASE_TEST_NODE_LOG"
exec "$RELEASE_TEST_REAL_NODE" "$@"
EOF
chmod +x "$test_dir/wrappers/node"

new_candidate() {
  candidate="$test_dir/$1"
  mkdir -p "$candidate/scripts" "$candidate/docs/typescript-tooling" "$candidate/packages/cli/dist" "$candidate/packages/core"
  cp "$test_root/scripts/release-check-select" "$candidate/scripts/"
  cp "$test_root/scripts/release-check-compat.mjs" "$candidate/scripts/"
  cp "$test_root/scripts/release-check" "$candidate/scripts/"
  cp "$test_root/docs/typescript-tooling/result-envelope-v1.schema.json" "$candidate/docs/typescript-tooling/"
  ln -s "$test_root/packages/core/dist" "$candidate/packages/core/dist"
  printf '0.2.1\n' >"$candidate/VERSION"
  printf 'candidate\n' >"$candidate/tracked.txt"
  cat >"$candidate/Makefile" <<'EOF'
.PHONY: verify release-check
verify:
	@printf 'verify\n' >> "$$RELEASE_TEST_VERIFY_LOG"
	@test "$$RELEASE_TEST_VERIFY_RESULT" = pass || { printf 'verify failed after output\n'; exit 1; }
EOF
  awk '
    /^RELEASE_CHECK_IMPLEMENTATION \?=/ { print; getline; print; found_selector=1 }
    /^release-check: verify$/ { print; getline; print; found_target=1 }
    END { if (!found_selector || !found_target) exit 1 }
  ' "$test_root/Makefile" >>"$candidate/Makefile" ||
    fail 'root Make target cannot be copied into disposable candidate'
  git -C "$candidate" init -q
  git -C "$candidate" add .
  git -C "$candidate" -c user.name='PraxisBound Tests' \
    -c user.email='tests@example.invalid' commit -qm baseline
}

run_make() {
  RELEASE_TEST_VERIFY_LOG="$test_dir/verify.log"
  RELEASE_TEST_VERIFY_RESULT=${RELEASE_TEST_VERIFY_RESULT:-pass}
  export RELEASE_TEST_VERIFY_LOG RELEASE_TEST_VERIFY_RESULT
  : >"$RELEASE_TEST_VERIFY_LOG"
  : >"$RELEASE_TEST_NODE_LOG"
  status=0
  PATH="$test_dir/wrappers:$PATH" make -s -C "$candidate" release-check "$@" \
    >"$test_dir/stdout" 2>"$test_dir/stderr" || status=$?
}

expect_verify_once() {
  [ "$(wc -l <"$test_dir/verify.log" | tr -d ' ')" -eq 1 ] ||
    fail 'canonical verification was not invoked exactly once'
}

real_candidate() {
  new_candidate "$1"
  rmdir "$candidate/packages/cli/dist"
  ln -s "$test_root/packages/cli/dist" "$candidate/packages/cli/dist"
  git -C "$candidate" add packages/cli/dist
  git -C "$candidate" -c user.name='PraxisBound Tests' \
    -c user.email='tests@example.invalid' commit -qm 'CLI link'
}

case_ready_output() {
  real_candidate ready
  head=$(git -C "$candidate" rev-parse HEAD)
  refs_before=$(git -C "$candidate" for-each-ref --format='%(refname) %(objectname)')
  before=$(git -C "$candidate" status --porcelain=v1 --untracked-files=all)
  index_before=$(cksum <"$candidate/.git/index")
  config_before=$(cksum <"$candidate/.git/config")
  run_make
  [ "$status" -eq 0 ] || fail 'TypeScript default rejected clean candidate'
  expect_verify_once
  [ "$(wc -l <"$test_dir/node.log" | tr -d ' ')" -eq 1 ] ||
    fail 'default selected TypeScript Node process more or less than once'
  cat >"$test_dir/expected" <<EOF
release check passed
version=0.2.1
commit=$head
expected_tag=v0.2.1
local_tag=absent
remote_checks=not-performed
EOF
  cmp -s "$test_dir/expected" "$test_dir/stdout" ||
    fail 'TypeScript default changed the six-line success contract'
  [ ! -s "$test_dir/stderr" ] || fail 'ready result wrote stderr'
  [ "$before" = "$(git -C "$candidate" status --porcelain=v1 --untracked-files=all)" ] ||
    fail 'default checker mutated candidate'
  [ "$head" = "$(git -C "$candidate" rev-parse HEAD)" ] ||
    fail 'default checker moved HEAD'
  [ "$refs_before" = "$(git -C "$candidate" for-each-ref --format='%(refname) %(objectname)')" ] ||
    fail 'default checker changed refs'
  [ "$index_before" = "$(cksum <"$candidate/.git/index")" ] ||
    fail 'default checker changed index'
  [ "$config_before" = "$(cksum <"$candidate/.git/config")" ] ||
    fail 'default checker changed Git config'
  "$candidate/scripts/release-check" >"$test_dir/legacy.stdout" 2>"$test_dir/legacy.stderr" ||
    fail 'direct shell checker rejected clean candidate'
  cmp -s "$test_dir/legacy.stdout" "$test_dir/stdout" ||
    fail 'default output differs from unchanged shell output'
}

case_same_head_output() {
  real_candidate same-head
  git -C "$candidate" -c tag.gpgSign=false tag v0.2.1
  before_refs=$(git -C "$candidate" for-each-ref --format='%(refname) %(objectname)')
  run_make
  [ "$status" -eq 0 ] || fail 'same-HEAD tag was rejected'
  expect_verify_once
  grep -Fqx 'local_tag=same-head' "$test_dir/stdout" ||
    fail 'same-HEAD tag projection changed'
  [ "$before_refs" = "$(git -C "$candidate" for-each-ref --format='%(refname) %(objectname)')" ] ||
    fail 'same-HEAD inspection changed refs'
}

case_selector_and_rollback() {
  candidate="$test_dir/ready"
  run_make RELEASE_CHECK_IMPLEMENTATION=legacy
  [ "$status" -eq 0 ] || fail 'legacy rollback rejected clean candidate'
  expect_verify_once
  [ ! -s "$test_dir/node.log" ] || fail 'legacy rollback invoked TypeScript selector'
  cmp -s "$test_dir/legacy.stdout" "$test_dir/stdout" ||
    fail 'legacy selector changed direct shell output'
  run_make RELEASE_CHECK_IMPLEMENTATION=unknown
  [ "$status" -ne 0 ] || fail 'unknown selector passed'
  expect_verify_once
  [ ! -s "$test_dir/node.log" ] || fail 'unknown selector invoked TypeScript'
  [ ! -s "$test_dir/stdout" ] || fail 'unknown selector emitted success'
  grep -Fq 'unknown implementation' "$test_dir/stderr" ||
    fail 'unknown selector lacked diagnostic'
}

fake_candidate() {
  new_candidate fake
  cat >"$candidate/packages/cli/dist/bin.js" <<'EOF'
const fs = require('node:fs');
fs.appendFileSync(process.env.RELEASE_TEST_CHILD_LOG, `${process.argv.slice(2).join('|')}\n`);
process.stdout.write(fs.readFileSync(process.env.RELEASE_TEST_PAYLOAD));
process.stderr.write(process.env.RELEASE_TEST_CHILD_STDERR ?? '');
process.exit(Number(process.env.RELEASE_TEST_CHILD_EXIT));
EOF
  git -C "$candidate" add packages/cli/dist/bin.js
  git -C "$candidate" -c user.name='PraxisBound Tests' \
    -c user.email='tests@example.invalid' commit -qm 'fake child'
  cat >"$candidate/scripts/release-check" <<'EOF'
#!/bin/sh
printf 'shell\n' >> "$RELEASE_TEST_SHELL_LOG"
exit 1
EOF
  git -C "$candidate" add scripts/release-check
  git -C "$candidate" -c user.name='PraxisBound Tests' \
    -c user.email='tests@example.invalid' commit -qm 'observable shell stub'
  RELEASE_TEST_CHILD_LOG="$test_dir/child.log"
  RELEASE_TEST_SHELL_LOG="$test_dir/shell.log"
  RELEASE_TEST_PAYLOAD="$test_dir/payload"
  RELEASE_TEST_CHILD_STDERR='fatal: hostile Git diagnostic must not escape'
  RELEASE_TEST_CHILD_EXIT=0
  export RELEASE_TEST_CHILD_LOG RELEASE_TEST_SHELL_LOG
  export RELEASE_TEST_PAYLOAD RELEASE_TEST_CHILD_STDERR RELEASE_TEST_CHILD_EXIT
}

write_result() {
  node -e 'const fs=require("node:fs"); const schema=require(process.argv[1]); const result={schemaVersion:schema.properties.schemaVersion.const,protocolVersion:schema.properties.protocolVersion.const,status:"pass",outcome:"RELEASE_READY",exit:0,subject:"release",issues:[],data:{version:"0.2.1",commit:"a".repeat(40),expectedTag:"v0.2.1",localTag:"absent",remoteChecks:"not-performed"}}; const changes=JSON.parse(process.argv[3]); if(changes.data) changes.data={...result.data,...changes.data}; Object.assign(result,changes); fs.writeFileSync(process.argv[2],JSON.stringify(result)+"\n")' \
    "$test_root/docs/typescript-tooling/result-envelope-v1.schema.json" \
    "$test_dir/payload" "$1"
}

expect_child_once() {
  [ "$(wc -l <"$test_dir/child.log" | tr -d ' ')" -eq 1 ] ||
    fail 'TypeScript child was not called exactly once'
  grep -Fq 'release|check|--json|' "$test_dir/child.log" ||
    fail 'TypeScript child invocation was not JSON release check'
}

expect_refusal() {
  : >"$test_dir/child.log"
  run_make
  [ "$status" -ne 0 ] || fail "$1 unexpectedly passed"
  expect_verify_once
  expect_child_once
  [ ! -s "$test_dir/stdout" ] || fail "$1 emitted a success record"
  grep -Fq "release check failed: $2" "$test_dir/stderr" ||
    fail "$1 did not emit safe failure code $2"
  if grep -Fq 'hostile Git diagnostic' "$test_dir/stderr"; then
    fail "$1 exposed child Git stderr"
  fi
}

case_json_fail_closed() {
  fake_candidate
  : >"$test_dir/child.log"
  : >"$test_dir/shell.log"
  run_make RELEASE_CHECK_IMPLEMENTATION=unknown
  [ "$status" -ne 0 ] || fail 'unknown selector passed observable fixture'
  expect_verify_once
  [ ! -s "$test_dir/child.log" ] || fail 'unknown selector invoked TypeScript'
  [ ! -s "$test_dir/shell.log" ] || fail 'unknown selector invoked shell'
  direct_status=0
  RELEASE_CHECK_IMPLEMENTATION=unknown "$candidate/scripts/release-check-select" \
    >"$test_dir/direct.stdout" 2>"$test_dir/direct.stderr" || direct_status=$?
  [ "$direct_status" -eq 2 ] || fail 'unknown selector process exit changed'
  write_result '{"schemaVersion":"9.0.0"}'
  expect_refusal 'unsupported schema' UNSUPPORTED_RESULT_VERSION
  write_result '{"protocolVersion":"9.0.0"}'
  expect_refusal 'unsupported Protocol' UNSUPPORTED_RESULT_VERSION
  printf 'not-json\n' >"$test_dir/payload"
  expect_refusal 'malformed JSON' INVALID_JSON_STREAM
  printf '' >"$test_dir/payload"
  expect_refusal 'missing JSON' INVALID_JSON_STREAM
  write_result '{}'
  printf '{}\n' >>"$test_dir/payload"
  expect_refusal 'multiple JSON lines' INVALID_JSON_STREAM
  write_result '{}'
  RELEASE_TEST_CHILD_EXIT=1
  export RELEASE_TEST_CHILD_EXIT
  expect_refusal 'child exit mismatch' PROCESS_EXIT_MISMATCH
  RELEASE_TEST_CHILD_EXIT=17
  export RELEASE_TEST_CHILD_EXIT
  expect_refusal 'unsupported child exit' PROCESS_EXIT_MISMATCH
  RELEASE_TEST_CHILD_EXIT=0
  export RELEASE_TEST_CHILD_EXIT
  write_result '{"status":"fail","outcome":"RELEASE_INCOMPLETE","exit":0,"issues":[{"code":"RELEASE_DIRTY","message":"dirty"}]}'
  expect_refusal 'invalid typed result combination' INVALID_ENVELOPE
  write_result '{"issues":[{"code":"BAD__CODE","message":"invalid"}]}'
  expect_refusal 'invalid issue code' INVALID_ENVELOPE
  write_result '{"data":{"version":"0.2.1\\nforged"}}'
  expect_refusal 'hostile ready field' INVALID_RELEASE_DATA
  write_result '{"status":"fail","outcome":"RELEASE_INCOMPLETE","exit":1,"issues":[{"code":"RELEASE_DIRTY","message":"candidate dirty"}]}'
  RELEASE_TEST_CHILD_EXIT=1
  export RELEASE_TEST_CHILD_EXIT
  expect_refusal 'typed negative result' RELEASE_DIRTY
  direct_status=0
  RELEASE_CHECK_IMPLEMENTATION=typescript "$candidate/scripts/release-check-select" \
    >"$test_dir/direct.stdout" 2>"$test_dir/direct.stderr" || direct_status=$?
  [ "$direct_status" -eq 1 ] || fail 'adapter release-failure process exit changed'
  write_result '{"status":"error","outcome":"ERROR","exit":3,"issues":[{"code":"RELEASE_INTERNAL_ERROR","message":"safe"}],"error":{"code":"RELEASE_INTERNAL_ERROR","message":"safe"}}'
  RELEASE_TEST_CHILD_EXIT=3
  export RELEASE_TEST_CHILD_EXIT
  expect_refusal 'typed error result' RELEASE_INTERNAL_ERROR
}

case_real_negative() {
  candidate="$test_dir/ready"
  printf 'dirty\n' >>"$candidate/tracked.txt"
  run_make
  [ "$status" -ne 0 ] || fail 'real dirty candidate passed'
  expect_verify_once
  [ ! -s "$test_dir/stdout" ] || fail 'real dirty candidate emitted success'
  grep -Eq '^release check failed: [A-Z][A-Z0-9_]*$' "$test_dir/stderr" ||
    fail 'real negative result lacked sanitized code'
  printf 'candidate\n' >"$candidate/tracked.txt"
  [ -z "$(git -C "$candidate" status --porcelain=v1 --untracked-files=all)" ] ||
    fail 'negative fixture cleanup left candidate dirty'
}

case_non_root_target() {
  candidate="$test_dir/ready"
  status=0
  node "$test_root/packages/cli/dist/bin.js" release check --json "$candidate/.git" \
    >"$test_dir/stdout" 2>"$test_dir/stderr" || status=$?
  [ "$status" -eq 2 ] || fail 'non-root CLI target exit changed'
  [ ! -s "$test_dir/stderr" ] || fail 'non-root CLI leaked presentation text'
  node -e 'const fs=require("node:fs"); const result=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); if(result.outcome!=="ERROR" || result.exit!==2 || result.issues[0]?.code!=="RELEASE_TARGET_NOT_ROOT") process.exit(1)' \
    "$test_dir/stdout" || fail 'non-root CLI target lacked typed issue'
}

case_verify_short_circuit() {
  candidate="$test_dir/fake"
  : >"$test_dir/child.log"
  : >"$test_dir/shell.log"
  RELEASE_TEST_VERIFY_RESULT=fail
  export RELEASE_TEST_VERIFY_RESULT
  run_make
  [ "$status" -ne 0 ] || fail 'failed verify permitted release check'
  expect_verify_once
  [ ! -s "$test_dir/child.log" ] || fail 'failed verify invoked TypeScript child'
  [ ! -s "$test_dir/shell.log" ] || fail 'failed verify invoked shell'
  grep -Fqx 'verify failed after output' "$test_dir/stdout" ||
    fail 'failed verify did not preserve its own output'
  run_make RELEASE_CHECK_IMPLEMENTATION=legacy
  [ "$status" -ne 0 ] || fail 'failed verify permitted legacy release check'
  expect_verify_once
  [ ! -s "$test_dir/child.log" ] || fail 'failed verify invoked a child'
  [ ! -s "$test_dir/shell.log" ] || fail 'failed verify invoked legacy shell'
  grep -Fqx 'verify failed after output' "$test_dir/stdout" ||
    fail 'failed verify did not preserve its own output'
  RELEASE_TEST_VERIFY_RESULT=pass
  export RELEASE_TEST_VERIFY_RESULT
}

run_case() {
  case_id=$1
  case_function=$2
  "$case_function" || fail "$case_id"
  printf '%s passed\n' "$case_id"
}

run_case 'TST017-AC-001' case_ready_output
run_case 'TST017-AC-001' case_same_head_output
run_case 'TST017-AC-002' case_selector_and_rollback
run_case 'TST017-AC-003' case_json_fail_closed
run_case 'TST017-AC-003' case_real_negative
run_case 'TST017-AC-003' case_non_root_target
run_case 'TST017-AC-004' case_verify_short_circuit
