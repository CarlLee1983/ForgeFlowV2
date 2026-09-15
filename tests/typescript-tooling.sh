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
forgeflow_registry_pid=''
forgeflow_registry_sequence=0

cleanup() {
  if [ -n "$forgeflow_registry_pid" ]; then
    kill "$forgeflow_registry_pid" 2>/dev/null || :
    wait "$forgeflow_registry_pid" 2>/dev/null || :
  fi
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
  printf 'ForgeFlow CLI v%s\n\nUsage:\n  forgeflow [command]\n\nCommands:\n  init               Plan or apply ForgeFlow initialization\n  codex activate     Preview or apply project-local Codex activation\n  doctor             Inspect the static Repository Contract\n  verify             Run the canonical repository verification target\n  handoff check      Check immutable Handoff evidence\n  release check      Inspect local Git release readiness\n  story check        Check the static Story contract\n  verification check Resolve plans and check recorded results\n  help, --help       Show this help\n  version, --version Print the CLI version\n\nOther migration commands are unavailable.\n' \
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

  npm pack "$forgeflow_repo/packages/core" --json \
    --pack-destination "$forgeflow_pack_dir/core" \
    >"$forgeflow_test_dir/core-pack.json"
  npm pack "$forgeflow_repo/packages/cli" --json \
    --pack-destination "$forgeflow_pack_dir/cli" \
    >"$forgeflow_test_dir/cli-pack.json"

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
    './dist/activation.d.ts' \
    './dist/activation.js' \
    './dist/declarations.d.ts' \
    './dist/declarations.js' \
    './dist/handoff.d.ts' \
    './dist/handoff.js' \
    './dist/index.d.ts' \
    './dist/index.js' \
    './dist/init.d.ts' \
    './dist/init.js' \
    './dist/mutation.d.ts' \
    './dist/mutation.js' \
    './dist/protocol.d.ts' \
    './dist/protocol.js' \
    './dist/release.d.ts' \
    './dist/release.js' \
    './dist/repository.d.ts' \
    './dist/repository.js' \
    './dist/result.d.ts' \
    './dist/result.js' \
    './dist/story-decision.d.ts' \
    './dist/story-decision.js' \
    './dist/story-governance.d.ts' \
    './dist/story-governance.js' \
    './dist/story-id.d.ts' \
    './dist/story-id.js' \
    './dist/story-literals.d.ts' \
    './dist/story-literals.js' \
    './dist/story-matrix.d.ts' \
    './dist/story-matrix.js' \
    './dist/story-readiness.d.ts' \
    './dist/story-readiness.js' \
    './dist/story-table.d.ts' \
    './dist/story-table.js' \
    './dist/story.d.ts' \
    './dist/story.js' \
    './dist/verification-result.d.ts' \
    './dist/verification-result.js' \
    './dist/verification.d.ts' \
    './dist/verification.js' \
    './dist/version.d.ts' \
    './dist/version.js' \
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
    './dist/activation-mutation.d.ts' \
    './dist/activation-mutation.js' \
    './dist/activation-observation.d.ts' \
    './dist/activation-observation.js' \
    './dist/activation-snapshot.d.ts' \
    './dist/activation-snapshot.js' \
    './dist/activation.d.ts' \
    './dist/activation.js' \
    './dist/bin.d.ts' \
    './dist/bin.js' \
    './dist/canonical-verification.d.ts' \
    './dist/canonical-verification.js' \
    './dist/doctor-execution.d.ts' \
    './dist/doctor-execution.js' \
    './dist/doctor.d.ts' \
    './dist/doctor.js' \
    './dist/handoff.d.ts' \
    './dist/handoff.js' \
    './dist/index.d.ts' \
    './dist/index.js' \
    './dist/init-mutation.d.ts' \
    './dist/init-mutation.js' \
    './dist/init-observation.d.ts' \
    './dist/init-observation.js' \
    './dist/init-snapshot.d.ts' \
    './dist/init-snapshot.js' \
    './dist/init.d.ts' \
    './dist/init.js' \
    './dist/machine.d.ts' \
    './dist/machine.js' \
    './dist/packaged-snapshot.d.ts' \
    './dist/packaged-snapshot.js' \
    './dist/release-git.d.ts' \
    './dist/release-git.js' \
    './dist/release.d.ts' \
    './dist/release.js' \
    './dist/snapshot/AGENTS.md' \
    './dist/snapshot/VERSION' \
    './dist/snapshot/guidance/DECISIONS.md' \
    './dist/snapshot/guidance/ENTRY.md' \
    './dist/snapshot/guidance/PRACTICES.md' \
    './dist/snapshot/guidance/PRINCIPLES.md' \
    './dist/snapshot/provenance.json' \
    './dist/snapshot/skills/forgeflow/SKILL.md' \
    './dist/snapshot/skills/forgeflow/agents-block.md' \
    './dist/snapshot/skills/story-development/SKILL.md' \
    './dist/snapshot/templates/story/acceptance.md' \
    './dist/snapshot/templates/story/story.md' \
    './dist/snapshot/templates/story/task.md' \
    './dist/source.d.ts' \
    './dist/source.js' \
    './dist/story.d.ts' \
    './dist/story.js' \
    './dist/verification.d.ts' \
    './dist/verification.js' \
    './dist/verify.d.ts' \
    './dist/verify.js' \
    './package.json' >"$forgeflow_test_dir/cli-files.expected"
  cmp "$forgeflow_test_dir/cli-files.expected" \
    "$forgeflow_test_dir/cli-files" >/dev/null ||
    fail 'CLI tarball contents were not the documented package surface'

  [ -x "$forgeflow_extract_dir/cli/package/dist/bin.js" ] ||
    fail 'packed CLI executable does not have its executable bit'
  [ "$(sed -n '1p' "$forgeflow_extract_dir/cli/package/dist/bin.js")" = \
    '#!/usr/bin/env node' ] ||
    fail 'packed CLI executable does not have the documented shebang'
  cmp "$forgeflow_repo/LICENSE" \
    "$forgeflow_extract_dir/core/package/LICENSE" >/dev/null ||
    fail 'Core package license does not match the repository license'
  cmp "$forgeflow_repo/LICENSE" \
    "$forgeflow_extract_dir/cli/package/LICENSE" >/dev/null ||
    fail 'CLI package license does not match the repository license'
  cmp "$forgeflow_repo/packages/core/README.md" \
    "$forgeflow_extract_dir/core/package/README.md" >/dev/null ||
    fail 'Core package readme does not match its source'
  cmp "$forgeflow_repo/packages/cli/README.md" \
    "$forgeflow_extract_dir/cli/package/README.md" >/dev/null ||
    fail 'CLI package readme does not match its source'

  node --input-type=module - \
    "$forgeflow_extract_dir/core/package/package.json" \
    "$forgeflow_extract_dir/cli/package/package.json" \
    "$forgeflow_test_dir/core-pack.json" \
    "$forgeflow_test_dir/cli-pack.json" \
    "$forgeflow_core_tarball" "$forgeflow_cli_tarball" <<'NODE'
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const [corePath, cliPath, corePackPath, cliPackPath, coreTarball, cliTarball] =
  process.argv.slice(2);
const readManifest = (path) => JSON.parse(readFileSync(path, "utf8"));
const core = readManifest(corePath);
const cli = readManifest(cliPath);

const packageRoot = {
  types: "./dist/index.d.ts",
  import: "./dist/index.js",
};

assert.equal(core.name, "@forgeflow/core");
assert.equal(cli.name, "@forgeflow/cli");
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
assert.equal(core.engines.node, "^22.13.0 || ^24.0.0 || ^26.0.0");
assert.deepEqual(cli.engines, core.engines);
assert.deepEqual(core.files, ["dist", "README.md", "LICENSE"]);
assert.deepEqual(cli.files, core.files);
assert.deepEqual(core.repository, {
  type: "git",
  url: "git+https://github.com/CarlLee1983/ForgeFlowV2.git",
  directory: "packages/core",
});
assert.deepEqual(cli.repository, {
  ...core.repository,
  directory: "packages/cli",
});
assert.deepEqual(core.publishConfig, { access: "public", provenance: true });
assert.deepEqual(cli.publishConfig, core.publishConfig);
for (const manifest of [core, cli]) {
  for (const lifecycle of ["preinstall", "install", "postinstall", "prepare"]) {
    assert.equal(manifest.scripts?.[lifecycle], undefined);
  }
  for (const target of Object.values(manifest.exports["."])) {
    assert.equal(existsSync(resolve(dirname(manifest === core ? corePath : cliPath), target)), true);
  }
}

for (const [packPath, tarballPath] of [
  [corePackPath, coreTarball],
  [cliPackPath, cliTarball],
]) {
  const [packed] = JSON.parse(readFileSync(packPath, "utf8"));
  const tarball = readFileSync(tarballPath);
  assert.equal(
    packed.integrity,
    `sha512-${createHash("sha512").update(tarball).digest("base64")}`,
  );
  assert.equal(packed.shasum, createHash("sha1").update(tarball).digest("hex"));
  assert.equal(packed.files.some(({ path }) => path === "package.json"), true);
}

const snapshotRoot = resolve(dirname(cliPath), "dist/snapshot");
const provenance = readManifest(join(snapshotRoot, "provenance.json"));
assert.equal(
  readFileSync(join(snapshotRoot, "VERSION"), "utf8").trim(),
  provenance.protocolVersion,
);
assert.equal(provenance.provenance, "@forgeflow/cli bundled Protocol snapshot");
assert.equal(provenance.revision, "unknown");
for (const payload of provenance.payloads) {
  assert.equal(
    createHash("sha256")
      .update(readFileSync(join(snapshotRoot, payload.destination)))
      .digest("hex"),
    payload.sha256,
  );
}
assert.equal(
  createHash("sha256")
    .update(JSON.stringify(provenance.payloads))
    .digest("hex"),
  provenance.snapshotDigest,
);
NODE

  forgeflow_consumer_dir="$forgeflow_test_dir/consumer"
  forgeflow_npm_home="$forgeflow_test_dir/npm-home"
  forgeflow_npm_cache="$forgeflow_test_dir/npm-cache"
  forgeflow_npm_userconfig="$forgeflow_test_dir/npmrc"
  mkdir -p "$forgeflow_consumer_dir" "$forgeflow_npm_home" \
    "$forgeflow_npm_cache"
  : >"$forgeflow_npm_userconfig"
  node --input-type=module - \
    "$forgeflow_consumer_dir/package.json" \
    "$forgeflow_core_tarball" "$forgeflow_cli_tarball" <<'NODE'
import { writeFileSync } from "node:fs";

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

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
NODE
  (
    CDPATH='' cd "$forgeflow_consumer_dir"
    env -i PATH="$PATH" HOME="$forgeflow_npm_home" \
      npm_config_cache="$forgeflow_npm_cache" \
      npm_config_userconfig="$forgeflow_npm_userconfig" \
      npm_config_offline=true npm_config_audit=false npm_config_fund=false \
      npm install --ignore-scripts >/dev/null
    node --input-type=module <<'NODE'
await import("@forgeflow/core");
await import("@forgeflow/cli");
NODE
    forgeflow_installed_version=$(./node_modules/.bin/forgeflow --version)
    [ "$forgeflow_installed_version" = '0.1.0' ] ||
      fail 'installed CLI bin did not report the packed version'
  )
}

packed_machine_contract_is_consumable() {
  [ -d "$forgeflow_consumer_dir/node_modules" ] ||
    fail 'packed-package consumer fixture is unavailable'

  (
    CDPATH='' cd "$forgeflow_consumer_dir"
    node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import {
  evaluateHandoff,
  getToolingCapabilities,
  validateResultEnvelope,
} from "@forgeflow/core";
import { serializeResultEnvelope } from "@forgeflow/cli";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const envelope = {
  schemaVersion: "1.0.0",
  protocolVersion: "0.9.0",
  status: "pass",
  outcome: "success",
  exit: 0,
  subject: "repository",
  issues: [],
};

assert.equal(validateResultEnvelope(envelope).ok, true);
assert.equal(getToolingCapabilities().implementedProtocolVersion, "0.9.0");
assert.equal(
  serializeResultEnvelope(envelope),
  '{"schemaVersion":"1.0.0","protocolVersion":"0.9.0","status":"pass","outcome":"success","exit":0,"subject":"repository","issues":[]}\n',
);
const handoffSource = `# ForgeFlow Handoff Evidence

\`\`\`yaml
handoff:
  story: TST-004
  recorded_at: 2026-09-12T02:30:00Z
  repository: example/repository
  revision: 0123456789abcdef0123456789abcdef01234567

verification:
  command: make verify
  result: pass
\`\`\`
`;
assert.equal(evaluateHandoff(handoffSource).result.exit, 0);

const handoffPath = join(process.cwd(), "handoff.md");
const incompletePath = join(process.cwd(), "handoff-incomplete.md");
const cli = join(process.cwd(), "node_modules", ".bin", "forgeflow");
writeFileSync(join(process.cwd(), "AGENTS.md"), "agent guide\n");
writeFileSync(join(process.cwd(), "Makefile"), "verify:\n\t@:\n");
writeFileSync(handoffPath, handoffSource);
writeFileSync(incompletePath, handoffSource.replace("  story: TST-004\n", ""));

for (const [path, expectedExit, expectedStatus] of [
  [handoffPath, 0, "pass"],
  [incompletePath, 1, "fail"],
  [join(process.cwd(), "absent.md"), 2, "error"],
]) {
  const command = spawnSync(cli, ["handoff", "check", "--json", path], {
    encoding: "utf8",
  });
  assert.equal(command.status, expectedExit);
  assert.equal(command.stderr, "");
  const machine = JSON.parse(command.stdout);
  assert.equal(validateResultEnvelope(machine).ok, true);
  assert.equal(machine.status, expectedStatus);
  assert.equal(machine.exit, expectedExit);
}

const human = spawnSync(cli, ["handoff", "check", handoffPath], {
  encoding: "utf8",
});
assert.equal(human.status, 0);
assert.equal(human.stderr, "");
assert.match(human.stdout, /Result: HANDOFF_CONTRACT_OK/);

const initTarget = join(process.cwd(), "init-preview-target");
mkdirSync(initTarget);
const initPreview = spawnSync(cli, ["init", "--dry-run", "--json", initTarget], {
  encoding: "utf8",
});
assert.equal(initPreview.status, 0);
assert.equal(initPreview.stderr, "");
const initMachine = JSON.parse(initPreview.stdout);
assert.equal(validateResultEnvelope(initMachine).ok, true);
assert.equal(initMachine.status, "pass");
assert.equal(initMachine.outcome, "INIT_PREVIEW");
assert.deepEqual(readdirSync(initTarget), []);
assert.equal(initMachine.data.provenance, "@forgeflow/cli bundled Protocol snapshot");
assert.equal(
  initMachine.data.changes.map((change) => change.path).join(","),
  "AGENTS.md,specs/stories/_template/story.md,specs/stories/_template/acceptance.md,specs/stories/_template/task.md,guidance/ENTRY.md,guidance/PRINCIPLES.md,guidance/DECISIONS.md,guidance/PRACTICES.md,specs/.forgeflow-adoption",
);

const storyDirectory = join(process.cwd(), "specs", "stories", "TST-005-packed");
mkdirSync(storyDirectory, { recursive: true });
writeFileSync(
  join(storyDirectory, "story.md"),
  "# Story: TST-005 Packed\n\n## Classification\n\n* Task mode: evidence\n",
);
writeFileSync(
  join(storyDirectory, "acceptance.md"),
  "# Acceptance Criteria\n\n* [ ] AC-001: Packed fixture.\n",
);

for (const args of [
  ["verify", "--json"],
  ["doctor", "--run-verify", "--json"],
]) {
  const command = spawnSync(cli, args, { encoding: "utf8" });
  assert.equal(command.status, 0);
  assert.equal(command.stdout.trimEnd().split("\n").length, 1);
  const envelope = JSON.parse(command.stdout);
  assert.equal(validateResultEnvelope(envelope).ok, true);
  assert.equal(envelope.status, "pass");
}

const plan = spawnSync(cli, ["verification", "check"], { encoding: "utf8" });
assert.equal(plan.status, 0);
assert.equal(plan.stderr, "");
assert.match(plan.stdout, /Result: VERIFICATION_PLAN_OK/);
assert.match(plan.stdout, /^ {2}Authority: plan=yes modify=no /m);

writeFileSync(
  join(storyDirectory, "verification.md"),
  [
    "# Verification Result: TST-005",
    "",
    "## Checks",
    "",
    "* lint: pass \u2014 `pnpm run lint`",
    "* static: pass \u2014 `pnpm run typecheck`",
    "* unit: pass \u2014 `pnpm test`",
    "",
    "## Evidence",
    "",
    "* `AC-001`: pass \u2014 `the packed fixture proved the happy path`",
    "",
  ].join("\n"),
);

const recorded = spawnSync(cli, ["verification", "check", "--result"], {
  encoding: "utf8",
});
assert.equal(recorded.status, 0);
assert.equal(recorded.stderr, "");
assert.match(recorded.stdout, /^ {2}Checks: lint=pass static=pass unit=pass$/m);
assert.match(recorded.stdout, /^ {2}Status: PASS$/m);
assert.match(recorded.stdout, /Result: VERIFICATION_PASS/);

for (const [args, expectedExit, expectedStatus] of [
  [["verification", "check", "--json"], 0, "pass"],
  [["verification", "check", "--json", "specs/stories/absent"], 2, "error"],
  [["verification", "check", "--result", "--json"], 0, "pass"],
]) {
  const command = spawnSync(cli, args, { encoding: "utf8" });
  assert.equal(command.status, expectedExit);
  assert.equal(command.stderr, "");
  const envelope = JSON.parse(command.stdout);
  assert.equal(validateResultEnvelope(envelope).ok, true);
  assert.equal(envelope.status, expectedStatus);
  assert.equal(envelope.subject, "verification");
}
await assert.rejects(import("@forgeflow/core/result"), {
  code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
});
await assert.rejects(import("@forgeflow/cli/machine"), {
  code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
});
NODE
  )
  : >"$forgeflow_test_dir/packed-machine-passed"
}

packed_init_apply_is_consumable() {
  [ -d "$forgeflow_consumer_dir/node_modules" ] ||
    fail 'packed-package consumer fixture is unavailable'

  (
    CDPATH='' cd "$forgeflow_consumer_dir"
    node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validateResultEnvelope } from "@forgeflow/core";

const cli = join(process.cwd(), "node_modules", ".bin", "forgeflow");
function apply(target, args = []) {
  const execution = spawnSync(cli, ["init", ...args, "--json", target], {
    encoding: "utf8",
  });
  assert.equal(execution.status, 0, execution.stderr);
  assert.equal(execution.stderr, "");
  const result = JSON.parse(execution.stdout);
  assert.equal(validateResultEnvelope(result).ok, true);
  assert.equal(result.outcome, "INIT_APPLIED");
  assert.equal(result.data.attempted.at(-1), "specs/.forgeflow-adoption");
  assert.equal(
    readdirSync(target, { recursive: true }).some((path) =>
      String(path).includes(".forgeflow-install."),
    ),
    false,
  );
}

for (const mode of ["safe", "force", "upgrade"]) {
  const target = join(process.cwd(), `init-apply-${mode}`);
  mkdirSync(target);
  if (mode !== "safe") apply(target);
  if (mode === "upgrade") {
    writeFileSync(join(target, "AGENTS.md"), "repository guide\n");
    writeFileSync(join(target, "guidance/ENTRY.md"), "repository guidance\n");
  }
  apply(target, mode === "safe" ? [] : [`--${mode}`]);
  assert.equal(
    readFileSync(join(target, "specs/.forgeflow-adoption"), "utf8"),
    "version=0.9.0\nrevision=unknown\n",
  );
  if (mode === "upgrade") {
    assert.equal(readFileSync(join(target, "AGENTS.md"), "utf8"), "repository guide\n");
    assert.equal(
      readFileSync(join(target, "guidance/ENTRY.md"), "utf8"),
      "repository guidance\n",
    );
  }
}
NODE
  )
  : >"$forgeflow_test_dir/packed-init-passed"
}

packed_activation_is_consumable() {
  [ -d "$forgeflow_consumer_dir/node_modules" ] ||
    fail 'packed-package consumer fixture is unavailable'

  (
    CDPATH='' cd "$forgeflow_consumer_dir"
    node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { posixCksum, validateResultEnvelope } from "@forgeflow/core";

const cli = join(process.cwd(), "node_modules", ".bin", "forgeflow");
const target = join(process.cwd(), "activation-target");
mkdirSync(join(target, "specs", "stories"), { recursive: true });
const originalAgents = Buffer.from("custom policy\r\nno final newline");
writeFileSync(join(target, "AGENTS.md"), originalAgents);
writeFileSync(
  join(target, "specs", ".forgeflow-adoption"),
  "version=0.9.0\nrevision=unknown\n",
);

function run(args) {
  const execution = spawnSync(
    cli,
    ["codex", "activate", ...args, "--json", target],
    { encoding: "utf8" },
  );
  assert.equal(execution.status, 0, execution.stderr);
  assert.equal(execution.stderr, "");
  const result = JSON.parse(execution.stdout);
  assert.equal(validateResultEnvelope(result).ok, true);
  return result;
}

const preview = run([]);
assert.equal(preview.outcome, "ACTIVATION_PREVIEW");
assert.equal(readFileSync(join(target, "AGENTS.md")).equals(originalAgents), true);
const applied = run(["--apply"]);
assert.equal(applied.outcome, "ACTIVATION_APPLIED");
assert.equal(
  applied.data.attempted.at(-1),
  ".agents/skills/forgeflow/.forgeflow-snapshot",
);
const unchanged = run(["--apply"]);
assert.equal(unchanged.outcome, "ACTIVATION_UNCHANGED");

const packageSnapshot = join(
  process.cwd(),
  "node_modules",
  "@forgeflow",
  "cli",
  "dist",
  "snapshot",
);
const skill = Buffer.from(
  readFileSync(join(packageSnapshot, "skills/forgeflow/SKILL.md"), "utf8").replaceAll(
    "../story-development/SKILL.md",
    "story-development.md",
  ),
);
const workflow = readFileSync(
  join(packageSnapshot, "skills/story-development/SKILL.md"),
);
const agentBlock = readFileSync(
  join(packageSnapshot, "skills/forgeflow/agents-block.md"),
);
const block = Buffer.concat([
  Buffer.from(
    "<!-- ForgeFlow Codex: begin -->\n<!-- snapshot version=0.9.0 revision=unknown adoption=0.9.0 -->\n",
  ),
  agentBlock,
  Buffer.from("<!-- ForgeFlow Codex: end -->\n"),
]);
assert.equal(
  readFileSync(join(target, "AGENTS.md")).equals(
    Buffer.concat([block, originalAgents]),
  ),
  true,
);
assert.equal(
  readFileSync(join(target, ".agents/skills/forgeflow/SKILL.md")).equals(skill),
  true,
);
assert.equal(
  readFileSync(join(target, ".agents/skills/forgeflow/story-development.md")).equals(
    workflow,
  ),
  true,
);
assert.equal(
  readFileSync(
    join(target, ".agents/skills/forgeflow/.forgeflow-snapshot"),
    "utf8",
  ),
  `format=1\nversion=0.9.0\nrevision=unknown\nadoption=0.9.0\nskill=${posixCksum(skill)}\nworkflow=${posixCksum(workflow)}\nblock=${posixCksum(block)}\n`,
);
NODE
  )
}

historical_packed_package_contract_is_preserved() {
  [ -f "$forgeflow_core_tarball" ] && [ -f "$forgeflow_cli_tarball" ] ||
    fail 'npm package validation did not preserve both historical tarballs'
  [ -d "$forgeflow_consumer_dir/node_modules/@forgeflow/core" ] &&
    [ -d "$forgeflow_consumer_dir/node_modules/@forgeflow/cli" ] ||
    fail 'npm package validation did not preserve the historical consumer contract'
}

clean_npm_consumer_runs_required_commands() {
  [ -f "$forgeflow_test_dir/packed-machine-passed" ] ||
    fail 'clean npm consumer machine checks did not complete'
  [ -f "$forgeflow_test_dir/packed-init-passed" ] ||
    fail 'clean npm consumer init checks did not complete'
  [ -f "$forgeflow_consumer_dir/package-lock.json" ] ||
    fail 'clean consumer has no npm package lock'
  [ ! -e "$forgeflow_consumer_dir/pnpm-lock.yaml" ] &&
    [ ! -e "$forgeflow_consumer_dir/pnpm-workspace.yaml" ] ||
    fail 'clean npm consumer depends on pnpm state'

  (
    CDPATH='' cd "$forgeflow_consumer_dir"
    ./node_modules/.bin/forgeflow --help >"$forgeflow_test_dir/consumer-help"
  )
  grep -Fq 'Usage:' "$forgeflow_test_dir/consumer-help" ||
    fail 'clean npm consumer help did not render'
  grep -Fq '  init               Plan or apply ForgeFlow initialization' \
    "$forgeflow_test_dir/consumer-help" ||
    fail 'clean npm consumer help omitted init'
}

start_npm_registry_fixture() {
  forgeflow_registry_mode=$1
  forgeflow_registry_sequence=$((forgeflow_registry_sequence + 1))
  forgeflow_registry_state="$forgeflow_test_dir/registry-$forgeflow_registry_sequence.state"
  forgeflow_registry_log="$forgeflow_test_dir/registry-$forgeflow_registry_sequence.log"
  forgeflow_registry_stdout="$forgeflow_test_dir/registry-$forgeflow_registry_sequence.stdout"
  forgeflow_registry_stderr="$forgeflow_test_dir/registry-$forgeflow_registry_sequence.stderr"
  : >"$forgeflow_registry_log"

  node "$forgeflow_repo/tests/npm-registry-fixture.mjs" \
    "$forgeflow_registry_state" "$forgeflow_registry_log" \
    "$forgeflow_core_tarball" "$forgeflow_cli_tarball" \
    "$forgeflow_extract_dir/core/package/package.json" \
    "$forgeflow_extract_dir/cli/package/package.json" \
    "$forgeflow_registry_mode" \
    >"$forgeflow_registry_stdout" 2>"$forgeflow_registry_stderr" &
  forgeflow_registry_pid=$!

  forgeflow_registry_wait=0
  while [ ! -s "$forgeflow_registry_state" ]; do
    kill -0 "$forgeflow_registry_pid" 2>/dev/null ||
      fail 'npm registry fixture exited before becoming ready'
    forgeflow_registry_wait=$((forgeflow_registry_wait + 1))
    [ "$forgeflow_registry_wait" -lt 10 ] ||
      fail 'npm registry fixture did not become ready'
    sleep 1
  done
  forgeflow_registry=$(node -e \
    'console.log(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")).registry)' \
    "$forgeflow_registry_state")
}

stop_npm_registry_fixture() {
  kill "$forgeflow_registry_pid" 2>/dev/null || :
  wait "$forgeflow_registry_pid" 2>/dev/null || :
  forgeflow_registry_pid=''
}

coordinate_is_pinned_cli() {
  forgeflow_coordinate=$1
  forgeflow_tooling_version=$2
  [ "$forgeflow_coordinate" = "@forgeflow/cli@$forgeflow_tooling_version" ]
}

run_isolated_npx() {
  forgeflow_npx_registry=$1
  forgeflow_npx_cache=$2
  forgeflow_npx_coordinate=$3
  forgeflow_npx_stdout=$4
  forgeflow_npx_stderr=$5
  forgeflow_npx_home="$forgeflow_npx_cache/home"
  forgeflow_npx_userconfig="$forgeflow_npx_cache/npmrc"
  mkdir -p "$forgeflow_npx_home" "$forgeflow_npx_cache/cache"
  : >"$forgeflow_npx_userconfig"

  env -i PATH="$PATH" HOME="$forgeflow_npx_home" \
    npm_config_cache="$forgeflow_npx_cache/cache" \
    npm_config_userconfig="$forgeflow_npx_userconfig" \
    npm_config_registry="$forgeflow_npx_registry" \
    npm_config_audit=false npm_config_fund=false \
    npm_config_fetch_retries=0 npm_config_fetch_retry_mintimeout=1 \
    npm_config_fetch_retry_maxtimeout=1 \
    npm_config_update_notifier=false \
    npx --yes "$forgeflow_npx_coordinate" --version \
    >"$forgeflow_npx_stdout" 2>"$forgeflow_npx_stderr"
}

registry_received_no_authorization() {
  if grep -Fq '"authorization":true' "$forgeflow_registry_log"; then
    fail 'isolated npm acquisition sent an authorization header'
  fi
}

sensitive_acquisition_payloads_are_absent() {
  for forgeflow_sensitive_payload in \
    'ambient-node-auth-secret' 'ambient-npm-secret' \
    'ambient-secret' 'https://hostile.invalid/' \
    'http://hostile.invalid/'
  do
    if grep -F "$forgeflow_sensitive_payload" \
      "$forgeflow_registry_log" \
      "$forgeflow_test_dir/npx-good.stdout" \
      "$forgeflow_test_dir/npx-good.stderr" >/dev/null; then
      fail 'isolated npm acquisition exposed inherited credential or routing state'
    fi
  done
}

pinned_acquisition_and_offline_execution_are_distinct() {
  forgeflow_tooling_version=$(node -p \
    "require('$forgeflow_repo/packages/cli/package.json').version")
  forgeflow_pinned_coordinate="@forgeflow/cli@$forgeflow_tooling_version"
  coordinate_is_pinned_cli "$forgeflow_pinned_coordinate" \
    "$forgeflow_tooling_version" ||
    fail 'exact CLI coordinate was not accepted as pinned'
  if coordinate_is_pinned_cli '@forgeflow/cli@latest' \
    "$forgeflow_tooling_version"; then
    fail 'latest dist-tag was accepted for automated acquisition'
  fi
  if coordinate_is_pinned_cli 'forgeflow' "$forgeflow_tooling_version"; then
    fail 'unscoped package was accepted for automated acquisition'
  fi

  start_npm_registry_fixture none
  forgeflow_hostile_npmrc="$forgeflow_test_dir/hostile/npmrc"
  forgeflow_registry_authority=${forgeflow_registry#http://}
  forgeflow_registry_authority=${forgeflow_registry_authority%/}
  mkdir -p "$forgeflow_test_dir/hostile"
  printf 'registry=https://hostile.invalid/\n//%s/:_authToken=ambient-secret\nalways-auth=true\n' \
    "$forgeflow_registry_authority" >"$forgeflow_hostile_npmrc"
  (
    NODE_AUTH_TOKEN='ambient-node-auth-secret'
    NPM_TOKEN='ambient-npm-secret'
    npm_config_userconfig="$forgeflow_hostile_npmrc"
    npm_config_registry='https://hostile.invalid/'
    HTTP_PROXY='http://hostile.invalid/'
    HTTPS_PROXY='http://hostile.invalid/'
    export NODE_AUTH_TOKEN NPM_TOKEN npm_config_userconfig npm_config_registry
    export HTTP_PROXY HTTPS_PROXY
    run_isolated_npx "$forgeflow_registry" \
      "$forgeflow_test_dir/npx-good" "$forgeflow_pinned_coordinate" \
      "$forgeflow_test_dir/npx-good.stdout" \
      "$forgeflow_test_dir/npx-good.stderr"
  ) || fail 'version-pinned npx acquisition failed'
  [ "$(sed -n '1p' "$forgeflow_test_dir/npx-good.stdout")" = \
    "$forgeflow_tooling_version" ] ||
    fail 'version-pinned npx did not execute the acquired CLI version'
  grep -Fq '"path":"/@forgeflow/cli"' "$forgeflow_registry_log" ||
    fail 'pinned acquisition did not request scoped CLI metadata'
  grep -Fq '"path":"/@forgeflow/core"' "$forgeflow_registry_log" ||
    fail 'pinned acquisition did not request scoped Core metadata'
  grep -Fq "/@forgeflow/cli/-/cli-$forgeflow_tooling_version.tgz" \
    "$forgeflow_registry_log" ||
    fail 'pinned acquisition did not request the exact CLI tarball'
  grep -Fq "/@forgeflow/core/-/core-$forgeflow_tooling_version.tgz" \
    "$forgeflow_registry_log" ||
    fail 'pinned acquisition did not request the exact Core tarball'
  registry_received_no_authorization
  sensitive_acquisition_payloads_are_absent
  stop_npm_registry_fixture

  for forgeflow_failure_mode in bad-integrity bad-shasum corrupt-tarball; do
    start_npm_registry_fixture "$forgeflow_failure_mode"
    if run_isolated_npx "$forgeflow_registry" \
      "$forgeflow_test_dir/npx-$forgeflow_failure_mode" \
      "$forgeflow_pinned_coordinate" \
      "$forgeflow_test_dir/npx-$forgeflow_failure_mode.stdout" \
      "$forgeflow_test_dir/npx-$forgeflow_failure_mode.stderr"; then
      fail "pinned acquisition accepted $forgeflow_failure_mode package metadata"
    fi
    [ ! -s "$forgeflow_test_dir/npx-$forgeflow_failure_mode.stdout" ] ||
      fail "$forgeflow_failure_mode acquisition executed the CLI"
    registry_received_no_authorization
    stop_npm_registry_fixture
  done

  forgeflow_offline_target="$forgeflow_test_dir/offline-init-target"
  mkdir "$forgeflow_offline_target"
  (
    CDPATH='' cd "$forgeflow_consumer_dir"
    env -i PATH="$PATH" HOME="$forgeflow_npm_home" \
      NODE_OPTIONS="--require=$forgeflow_repo/tests/network-deny.cjs" \
      ./node_modules/.bin/forgeflow --help \
      >"$forgeflow_test_dir/offline-help"
    env -i PATH="$PATH" HOME="$forgeflow_npm_home" \
      NODE_OPTIONS="--require=$forgeflow_repo/tests/network-deny.cjs" \
      ./node_modules/.bin/forgeflow doctor --json \
      >"$forgeflow_test_dir/offline-doctor.json"
    env -i PATH="$PATH" HOME="$forgeflow_npm_home" \
      NODE_OPTIONS="--require=$forgeflow_repo/tests/network-deny.cjs" \
      ./node_modules/.bin/forgeflow verification check --json \
      >"$forgeflow_test_dir/offline-verification.json"
    env -i PATH="$PATH" HOME="$forgeflow_npm_home" \
      NODE_OPTIONS="--require=$forgeflow_repo/tests/network-deny.cjs" \
      ./node_modules/.bin/forgeflow verify --json \
      >"$forgeflow_test_dir/offline-verify.json" \
      2>"$forgeflow_test_dir/offline-verify.stderr"
    env -i PATH="$PATH" HOME="$forgeflow_npm_home" \
      NODE_OPTIONS="--require=$forgeflow_repo/tests/network-deny.cjs" \
      ./node_modules/.bin/forgeflow init --dry-run --json \
      "$forgeflow_offline_target" >"$forgeflow_test_dir/offline-init.json"
  )
  node --input-type=module - \
    "$forgeflow_test_dir/offline-doctor.json" \
    "$forgeflow_test_dir/offline-verification.json" \
    "$forgeflow_test_dir/offline-verify.json" \
    "$forgeflow_test_dir/offline-init.json" <<'NODE'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const [doctorPath, verificationPath, verifyPath, initPath] = process.argv.slice(2);
const results = [doctorPath, verificationPath, verifyPath, initPath].map((path) =>
  JSON.parse(readFileSync(path, "utf8")),
);
assert.equal(["pass", "warning"].includes(results[0].status), true);
for (const result of results.slice(1)) assert.equal(result.status, "pass");
for (const result of results) assert.equal(result.exit, 0);
assert.equal(results[0].subject, "repository");
assert.equal(results[1].subject, "verification");
assert.equal(results[2].outcome, "success");
assert.equal(results[3].outcome, "INIT_PREVIEW");
NODE
}

supported_consumer_matrix_and_acquisition_docs_are_declared() {
  forgeflow_contract_fixture="$forgeflow_test_dir/distribution-contract"
  mkdir "$forgeflow_contract_fixture"
  cp "$forgeflow_repo/.github/workflows/verify.yml" \
    "$forgeflow_contract_fixture/verify.yml"
  cp "$forgeflow_repo/packages/cli/README.md" \
    "$forgeflow_contract_fixture/cli-README.md"
  forgeflow_workflow="$forgeflow_contract_fixture/verify.yml"
  for forgeflow_matrix_value in \
    'ubuntu-latest' 'macos-latest' \
    '22.13.0' '22.x' '24.0.0' '24.x' '26.0.0' '26.x'
  do
    grep -Fq -- "- $forgeflow_matrix_value" "$forgeflow_workflow" ||
      fail "tooling compatibility matrix omits $forgeflow_matrix_value"
  done
  if grep -Fq -- '- 20.19.0' "$forgeflow_workflow"; then
    fail 'tooling compatibility matrix still admits Node 20'
  fi
  grep -Fq 'runs-on: ${{ matrix.runner }}' "$forgeflow_workflow" ||
    fail 'tooling compatibility matrix does not select its declared OS runner'
  grep -Fq 'check-latest: true' "$forgeflow_workflow" ||
    fail 'moving Node matrix lines may use stale runner cache versions'

  forgeflow_cli_readme="$forgeflow_contract_fixture/cli-README.md"
  grep -Fq 'npx --yes @forgeflow/cli@<tooling-version>' \
    "$forgeflow_cli_readme" ||
    fail 'CLI readme omits version-pinned acquisition'
  grep -Fq './node_modules/.bin/forgeflow' "$forgeflow_cli_readme" ||
    fail 'CLI readme omits direct installed-binary execution'
  grep -Fq 'Do not use the unscoped `npx forgeflow`' \
    "$forgeflow_cli_readme" ||
    fail 'CLI readme does not reject the unrelated unscoped package'
}

unavailable_arguments_fail_with_one_usage_result() {
  forgeflow_empty="$forgeflow_test_dir/empty"
  forgeflow_unavailable="$forgeflow_test_dir/unavailable"
  : >"$forgeflow_empty"
  printf '%s\n' \
    'forgeflow: command unavailable; this command is not available. Run forgeflow --help.' \
    >"$forgeflow_unavailable"

  assert_cli_result 2 "$forgeflow_empty" "$forgeflow_unavailable" --json
  assert_cli_result 2 "$forgeflow_empty" "$forgeflow_unavailable" story lint
  assert_cli_result 2 "$forgeflow_empty" "$forgeflow_unavailable" verification lint
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
run_case 'TST015-AC-002' packed_packages_have_the_bounded_public_contract
run_case 'TST001-AC-003' historical_packed_package_contract_is_preserved
run_case 'TST002-AC-005' packed_machine_contract_is_consumable
run_case 'TST013-AC-001' packed_init_apply_is_consumable
run_case 'TST015-AC-003' clean_npm_consumer_runs_required_commands
run_case 'TST014-AC-001' packed_activation_is_consumable
run_case 'TST015-AC-004' pinned_acquisition_and_offline_execution_are_distinct
run_case 'TST015-AC-004' supported_consumer_matrix_and_acquisition_docs_are_declared
run_case 'TST001-AC-004' unavailable_arguments_fail_with_one_usage_result
run_case 'TST001-AC-005' legacy_shell_commands_do_not_delegate_to_node

printf 'TypeScript tooling tests passed\n'
