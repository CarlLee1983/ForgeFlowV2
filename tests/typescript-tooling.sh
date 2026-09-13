#!/bin/sh

set -eu

fail() {
  printf 'TypeScript tooling test failed [%s]: %s\n' "$forgeflow_case_id" "$1" >&2
  exit 1
}

run_case() {
  forgeflow_case_id=$1
  forgeflow_case_function=$2

  "$forgeflow_case_function"
  printf 'PASS %s %s\n' "$forgeflow_case_id" "$forgeflow_case_function"
}

forgeflow_repo=$(CDPATH='' cd -P "$(dirname "$0")/.." >/dev/null 2>&1 && pwd)
forgeflow_cli="$forgeflow_repo/packages/cli/dist/bin.js"
forgeflow_test_dir=$(mktemp -d "${TMPDIR:-/tmp}/forgeflow-tooling.XXXXXX")

cleanup() {
  rm -rf "$forgeflow_test_dir"
}

trap cleanup EXIT
trap 'exit 1' HUP INT TERM

run_cli() {
  if node "$forgeflow_cli" "$@" >"$forgeflow_test_dir/stdout" \
    2>"$forgeflow_test_dir/stderr"; then
    forgeflow_cli_status=0
  else
    forgeflow_cli_status=$?
  fi
}

assert_cli_result() {
  forgeflow_expected_status=$1
  forgeflow_expected_stdout=$2
  forgeflow_expected_stderr=$3
  shift 3

  run_cli "$@"
  [ "$forgeflow_cli_status" -eq "$forgeflow_expected_status" ] ||
    fail "CLI exited $forgeflow_cli_status, expected $forgeflow_expected_status"
  cmp "$forgeflow_expected_stdout" "$forgeflow_test_dir/stdout" >/dev/null ||
    fail 'CLI stdout did not match the documented result'
  cmp "$forgeflow_expected_stderr" "$forgeflow_test_dir/stderr" >/dev/null ||
    fail 'CLI stderr did not match the documented result'
}

built_cli_help_and_version_are_exact() {
  forgeflow_version=$(node -p \
    "require('$forgeflow_repo/packages/cli/package.json').version")
  forgeflow_help="$forgeflow_test_dir/help"
  forgeflow_version_output="$forgeflow_test_dir/version"
  forgeflow_empty="$forgeflow_test_dir/empty"

  : >"$forgeflow_empty"
  printf 'ForgeFlow CLI v%s\n\nUsage:\n  forgeflow [command]\n\nCommands:\n  help, --help       Show this help\n  version, --version Print the CLI version\n\nMigration commands are unavailable.\n' \
    "$forgeflow_version" >"$forgeflow_help"
  printf '%s\n' "$forgeflow_version" >"$forgeflow_version_output"

  assert_cli_result 0 "$forgeflow_help" "$forgeflow_empty"
  assert_cli_result 0 "$forgeflow_help" "$forgeflow_empty" help
  assert_cli_result 0 "$forgeflow_help" "$forgeflow_empty" --help
  assert_cli_result 0 "$forgeflow_version_output" "$forgeflow_empty" version
  assert_cli_result 0 "$forgeflow_version_output" "$forgeflow_empty" --version
}

packed_packages_have_the_bounded_public_contract() {
  forgeflow_pack_dir="$forgeflow_test_dir/pack"
  forgeflow_extract_dir="$forgeflow_test_dir/extract"
  mkdir -p "$forgeflow_pack_dir/core" "$forgeflow_pack_dir/cli" \
    "$forgeflow_extract_dir/core" "$forgeflow_extract_dir/cli"

  pnpm --dir "$forgeflow_repo/packages/core" pack \
    --pack-destination "$forgeflow_pack_dir/core" --silent >/dev/null
  pnpm --dir "$forgeflow_repo/packages/cli" pack \
    --pack-destination "$forgeflow_pack_dir/cli" --silent >/dev/null

  set -- "$forgeflow_pack_dir/core"/*.tgz
  [ "$#" -eq 1 ] && [ -f "$1" ] || fail 'Core did not produce one tarball'
  forgeflow_core_tarball=$1
  set -- "$forgeflow_pack_dir/cli"/*.tgz
  [ "$#" -eq 1 ] && [ -f "$1" ] || fail 'CLI did not produce one tarball'
  forgeflow_cli_tarball=$1

  tar -xzf "$forgeflow_core_tarball" -C "$forgeflow_extract_dir/core"
  tar -xzf "$forgeflow_cli_tarball" -C "$forgeflow_extract_dir/cli"

  (
    CDPATH='' cd "$forgeflow_extract_dir/core/package"
    find . -type f -print | LC_ALL=C sort
  ) >"$forgeflow_test_dir/core-files"
  printf '%s\n' \
    './LICENSE' \
    './README.md' \
    './dist/index.d.ts' \
    './dist/index.js' \
    './package.json' >"$forgeflow_test_dir/core-files.expected"
  cmp "$forgeflow_test_dir/core-files.expected" \
    "$forgeflow_test_dir/core-files" >/dev/null ||
    fail 'Core tarball contents were not the documented package surface'

  (
    CDPATH='' cd "$forgeflow_extract_dir/cli/package"
    find . -type f -print | LC_ALL=C sort
  ) >"$forgeflow_test_dir/cli-files"
  printf '%s\n' \
    './LICENSE' \
    './README.md' \
    './dist/bin.d.ts' \
    './dist/bin.js' \
    './dist/index.d.ts' \
    './dist/index.js' \
    './package.json' >"$forgeflow_test_dir/cli-files.expected"
  cmp "$forgeflow_test_dir/cli-files.expected" \
    "$forgeflow_test_dir/cli-files" >/dev/null ||
    fail 'CLI tarball contents were not the documented package surface'

  [ -x "$forgeflow_extract_dir/cli/package/dist/bin.js" ] ||
    fail 'packed CLI executable does not have its executable bit'

  node --input-type=module - \
    "$forgeflow_extract_dir/core/package/package.json" \
    "$forgeflow_extract_dir/cli/package/package.json" <<'NODE'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const [corePath, cliPath] = process.argv.slice(2);
const readManifest = (path) => JSON.parse(readFileSync(path, "utf8"));
const core = readManifest(corePath);
const cli = readManifest(cliPath);

const packageRoot = {
  types: "./dist/index.d.ts",
  import: "./dist/index.js",
};

assert.deepEqual(core.exports, { ".": packageRoot });
assert.deepEqual(cli.exports, { ".": packageRoot });
assert.equal(core.dependencies, undefined);
assert.equal(core.optionalDependencies, undefined);
assert.equal(core.peerDependencies, undefined);
assert.deepEqual(cli.dependencies, { "@forgeflow/core": core.version });
assert.equal(cli.optionalDependencies, undefined);
assert.equal(cli.peerDependencies, undefined);
assert.deepEqual(cli.bin, { forgeflow: "./dist/bin.js" });
assert.equal(cli.version, core.version);
NODE

  forgeflow_consumer_dir="$forgeflow_test_dir/consumer"
  mkdir -p "$forgeflow_consumer_dir"
  node --input-type=module - \
    "$forgeflow_consumer_dir/package.json" \
    "$forgeflow_core_tarball" "$forgeflow_cli_tarball" <<'NODE'
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [manifestPath, coreTarball, cliTarball] = process.argv.slice(2);
const manifest = {
  name: "forgeflow-tooling-consumer",
  version: "1.0.0",
  private: true,
  type: "module",
  dependencies: {
    "@forgeflow/core": `file:${coreTarball}`,
    "@forgeflow/cli": `file:${cliTarball}`,
  },
};
const workspace = {
  overrides: {
    "@forgeflow/core": `file:${coreTarball}`,
  },
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(
  join(dirname(manifestPath), "pnpm-workspace.yaml"),
  `${JSON.stringify(workspace, null, 2)}\n`,
);
NODE
  pnpm --dir "$forgeflow_consumer_dir" install --offline \
    --ignore-scripts >/dev/null
  (
    CDPATH='' cd "$forgeflow_consumer_dir"
    node --input-type=module -e \
      'await import("@forgeflow/core"); await import("@forgeflow/cli");'
    forgeflow_installed_version=$(./node_modules/.bin/forgeflow --version)
    [ "$forgeflow_installed_version" = '0.1.0' ] ||
      fail 'installed CLI bin did not report the packed version'
  )
}

unavailable_arguments_fail_with_one_usage_result() {
  forgeflow_empty="$forgeflow_test_dir/empty"
  forgeflow_unavailable="$forgeflow_test_dir/unavailable"
  : >"$forgeflow_empty"
  printf '%s\n' \
    'forgeflow: command unavailable; migration commands are not yet available. Run forgeflow --help.' \
    >"$forgeflow_unavailable"

  assert_cli_result 2 "$forgeflow_empty" "$forgeflow_unavailable" doctor
  assert_cli_result 2 "$forgeflow_empty" "$forgeflow_unavailable" --json
  assert_cli_result 2 "$forgeflow_empty" "$forgeflow_unavailable" story check
  assert_cli_result 2 "$forgeflow_empty" "$forgeflow_unavailable" help extra
  assert_cli_result 2 "$forgeflow_empty" "$forgeflow_unavailable" version extra
}

workspace_lock_is_current_single_document_and_fails_closed() {
  if grep -Fqx -- '---' "$forgeflow_repo/pnpm-lock.yaml"; then
    fail 'the workspace lockfile contains an environment document'
  fi

  forgeflow_stale_lock="$forgeflow_test_dir/stale-lock"
  mkdir -p "$forgeflow_stale_lock/packages/core" \
    "$forgeflow_stale_lock/packages/cli"
  cp "$forgeflow_repo/package.json" \
    "$forgeflow_repo/pnpm-workspace.yaml" \
    "$forgeflow_repo/pnpm-lock.yaml" \
    "$forgeflow_stale_lock/"
  cp "$forgeflow_repo/packages/core/package.json" \
    "$forgeflow_stale_lock/packages/core/"
  cp "$forgeflow_repo/packages/cli/package.json" \
    "$forgeflow_stale_lock/packages/cli/"

  node --input-type=module - "$forgeflow_stale_lock/package.json" <<'NODE'
import { readFileSync, writeFileSync } from "node:fs";

const manifestPath = process.argv[2];
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.devDependencies["forgeflow-stale-lock-fixture"] = "1.0.0";
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE

  if pnpm --dir "$forgeflow_stale_lock" install \
    --frozen-lockfile --lockfile-only --offline --ignore-scripts \
    >"$forgeflow_test_dir/stale-lock-output" 2>&1; then
    fail 'the frozen workspace gate accepted a stale lockfile'
  fi
  grep -Fq 'ERR_PNPM_OUTDATED_LOCKFILE' \
    "$forgeflow_test_dir/stale-lock-output" ||
    fail 'the stale lockfile did not fail with the documented pnpm result'
}

legacy_shell_commands_do_not_delegate_to_node() {
  if grep -E '(^|[[:space:]])(node|nodejs|pnpm)([[:space:]]|$)' \
    "$forgeflow_repo"/scripts/* >/dev/null; then
    fail 'a legacy shell command delegates to the TypeScript runtime'
  fi
}

run_case 'TST001-AC-001' workspace_lock_is_current_single_document_and_fails_closed
run_case 'TST001-AC-002' built_cli_help_and_version_are_exact
run_case 'TST001-AC-003' packed_packages_have_the_bounded_public_contract
run_case 'TST001-AC-004' unavailable_arguments_fail_with_one_usage_result
run_case 'TST001-AC-005' legacy_shell_commands_do_not_delegate_to_node

printf 'TypeScript tooling tests passed\n'
