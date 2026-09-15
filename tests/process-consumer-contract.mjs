import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [mode, cli, scratch, schemaPath] = process.argv.slice(2);
const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
const supportedSchema = schema.properties.schemaVersion.const;
const supportedProtocol = schema.properties.protocolVersion.const;

class ConsumerContractError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function schemaAccepts(value, node, root = schema) {
  const knownKeywords = new Set([
    "$schema",
    "$id",
    "$ref",
    "$defs",
    "title",
    "description",
    "type",
    "const",
    "enum",
    "required",
    "properties",
    "additionalProperties",
    "items",
    "oneOf",
    "minLength",
    "pattern",
  ]);
  assert.ok(Object.keys(node).every((key) => knownKeywords.has(key)));
  if (node.$ref !== undefined) {
    assert.match(node.$ref, /^#\/\$defs\//u);
    return schemaAccepts(value, root.$defs[node.$ref.slice(8)], root);
  }
  const type = Array.isArray(value)
    ? "array"
    : value === null
      ? "null"
      : typeof value;
  if (node.type !== undefined && type !== node.type) return false;
  if (node.const !== undefined && value !== node.const) return false;
  if (node.enum !== undefined && !node.enum.includes(value)) return false;
  if (node.minLength !== undefined && value.length < node.minLength)
    return false;
  if (node.pattern !== undefined && !new RegExp(node.pattern, "u").test(value))
    return false;
  if (
    node.oneOf !== undefined &&
    node.oneOf.filter((branch) => schemaAccepts(value, branch, root)).length !==
      1
  ) {
    return false;
  }
  if (
    node.required !== undefined &&
    !node.required.every((field) => Object.hasOwn(value, field))
  ) {
    return false;
  }
  if (node.properties !== undefined && type === "object") {
    for (const [field, fieldValue] of Object.entries(value)) {
      if (Object.hasOwn(node.properties, field)) {
        if (!schemaAccepts(fieldValue, node.properties[field], root))
          return false;
      } else if (node.additionalProperties === false) {
        return false;
      } else if (
        typeof node.additionalProperties === "object" &&
        !schemaAccepts(fieldValue, node.additionalProperties, root)
      ) {
        return false;
      }
    }
  }
  if (
    node.items !== undefined &&
    type === "array" &&
    !value.every((item) => schemaAccepts(item, node.items, root))
  ) {
    return false;
  }
  return true;
}

// This is an independent process consumer. It imports no PraxisBound module and
// treats command output as untrusted data, including when the child exits zero.
function consume(execution) {
  const { stdout, status: childExit } = execution;
  if (typeof stdout !== "string" || !/^[^\n]+\n$/u.test(stdout)) {
    throw new ConsumerContractError("invalid-json-stream");
  }
  let result;
  try {
    result = JSON.parse(stdout);
  } catch {
    throw new ConsumerContractError("invalid-json-stream");
  }
  if (result === null || Array.isArray(result) || typeof result !== "object") {
    throw new ConsumerContractError("invalid-envelope");
  }
  // Version negotiation comes first: a newer schema is never interpreted using
  // older status/outcome assumptions, even when those fields look familiar.
  if (result.schemaVersion !== supportedSchema) {
    throw new ConsumerContractError("unsupported-schema-version");
  }
  if (result.protocolVersion !== supportedProtocol) {
    throw new ConsumerContractError("unsupported-protocol-version");
  }
  if (
    !Number.isInteger(result.exit) ||
    !schema.properties.exit.enum.includes(result.exit)
  ) {
    throw new ConsumerContractError("invalid-envelope");
  }
  if (childExit !== result.exit) {
    throw new ConsumerContractError("exit-mismatch");
  }
  if (!schemaAccepts(result, schema)) {
    throw new ConsumerContractError("invalid-envelope");
  }
  return {
    status: result.status,
    outcome: result.outcome,
    exit: result.exit,
    subject: result.subject,
    issueCodes: result.issues.map((issue) => issue.code),
    data: result.data,
  };
}

function runCli(args, cwd = scratch) {
  return spawnSync(cli, args, {
    cwd,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      HOME: join(scratch, "home"),
      TMPDIR: scratch,
      LC_ALL: "C",
    },
  });
}

function makeStaticFixture() {
  const root = join(scratch, "repository");
  const story = join(root, "specs", "stories", "TST-900-fixture");
  mkdirSync(story, { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "Follow the Story.\n");
  writeFileSync(join(root, "Makefile"), "verify:\n\t@:\n");
  writeFileSync(
    join(story, "story.md"),
    "# Story: TST-900 Fixture\n\n## Classification\n\n* Security sensitive: no\n* Baseline conformance: no\n",
  );
  writeFileSync(join(story, "acceptance.md"), "# Acceptance Criteria\n");
  const handoff = join(root, "handoff.md");
  writeFileSync(
    handoff,
    "# PraxisBound Handoff Evidence\n\n```yaml\nhandoff:\n  story: TST-900\n  recorded_at: 2026-09-12T02:30:00Z\n  repository: example/repository\n  revision: 0123456789abcdef0123456789abcdef01234567\n\nverification:\n  command: make verify\n  result: pass\n```\n",
  );
  return { root, story, handoff };
}

function makeActivationFixture() {
  const root = join(scratch, "activation");
  mkdirSync(join(root, "specs", "stories"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "local policy\n");
  writeFileSync(
    join(root, "specs", ".praxisbound-adoption"),
    `version=${supportedProtocol}\nrevision=unknown\n`,
  );
  return root;
}

function makeReleaseFixture() {
  const root = join(scratch, "release");
  mkdirSync(root);
  const git = (args) => {
    const result = spawnSync("git", args, {
      cwd: root,
      encoding: "utf8",
      env: { PATH: process.env.PATH, HOME: join(scratch, "home") },
    });
    assert.equal(result.status, 0, result.stderr);
  };
  git(["init", "-q"]);
  git(["config", "user.email", "release@example.test"]);
  git(["config", "user.name", "Release Test"]);
  writeFileSync(join(root, "VERSION"), `${supportedProtocol}\n`);
  git(["add", "VERSION"]);
  git(["commit", "-qm", "release candidate"]);
  return root;
}

function allCommands() {
  const { root, story, handoff } = makeStaticFixture();
  const activation = makeActivationFixture();
  const release = makeReleaseFixture();
  const fresh = join(scratch, "fresh");
  mkdirSync(fresh);

  const cases = [
    {
      name: "init",
      args: ["init", "--dry-run", "--json", fresh],
      status: "pass",
      outcome: "INIT_PREVIEW",
      dataKey: "changes",
    },
    {
      name: "codex activate",
      args: ["codex", "activate", "--json", activation],
      status: "pass",
      outcome: "ACTIVATION_PREVIEW",
      dataKey: "changes",
    },
    {
      name: "doctor",
      args: ["doctor", "--json", root],
      status: "pass",
      outcome: "success",
    },
    {
      name: "verify",
      args: ["verify", "--json", root],
      status: "pass",
      outcome: "success",
    },
    {
      name: "handoff check",
      args: ["handoff", "check", "--json", handoff],
      status: "pass",
      outcome: "success",
    },
    {
      name: "release check",
      args: ["release", "check", "--json", release],
      status: "pass",
      outcome: "RELEASE_READY",
      dataKey: "remoteChecks",
    },
    {
      name: "story check",
      args: ["story", "check", "--json", story],
      status: "pass",
      outcome: "success",
    },
    {
      name: "verification check",
      args: ["verification", "check", "--json", story],
      status: "pass",
      outcome: "success",
    },
  ];
  assert.equal(cases.length, 8);
  for (const { name, args, status, outcome, dataKey } of cases) {
    const execution = runCli(args);
    assert.equal(execution.error, undefined, `${name}: spawn failed`);
    const consumed = consume(execution);
    assert.equal(consumed.exit, execution.status, name);
    assert.equal(consumed.status, status, name);
    assert.equal(consumed.outcome, outcome, name);
    assert.deepEqual(consumed.issueCodes, [], name);
    assert.ok(consumed.subject.length > 0, name);
    if (dataKey !== undefined)
      assert.ok(Object.hasOwn(consumed.data, dataKey), name);
  }
  for (const target of [root, activation, release, fresh]) {
    assert.equal(existsSync(join(target, ".forgepilot")), false);
  }
}

function failureCases() {
  const { root, handoff } = makeStaticFixture();
  const pass = runCli(["handoff", "check", "--json", handoff]);
  assert.equal(consume(pass).status, "pass");

  writeFileSync(
    join(root, "specs", ".praxisbound-adoption"),
    "version=not-this-version\r\n",
  );
  writeFileSync(join(root, "specs", "handoff.md"), "# Handoff\n");
  const warning = runCli(["doctor", "--json", root]);
  const warningResult = consume(warning);
  assert.equal(warningResult.status, "warning");
  assert.equal(warningResult.outcome, "warning");
  assert.deepEqual(warningResult.issueCodes, []);

  const failed = runCli([
    "handoff",
    "check",
    "--json",
    join(root, "specs", "handoff.md"),
  ]);
  const failedResult = consume(failed);
  assert.equal(failedResult.status, "fail");
  assert.equal(failedResult.outcome, "failure");
  assert.deepEqual(failedResult.issueCodes, ["HANDOFF_BLOCK_COUNT_INVALID"]);
  const errored = runCli([
    "handoff",
    "check",
    "--json",
    join(root, "absent.md"),
  ]);
  const errorResult = consume(errored);
  assert.equal(errorResult.status, "error");
  assert.deepEqual(errorResult.issueCodes, ["HANDOFF_SOURCE_UNAVAILABLE"]);

  const valid = JSON.parse(pass.stdout);
  const envelope = (value) => ({
    stdout: `${JSON.stringify(value)}\n`,
    status: value.exit,
  });
  const expectFailure = (execution, code) =>
    assert.throws(
      () => consume(execution),
      (error) => error.code === code,
    );

  expectFailure(
    envelope({ ...valid, schemaVersion: "2.0.0", status: "unknown" }),
    "unsupported-schema-version",
  );
  expectFailure(
    envelope({ ...valid, protocolVersion: "99.0.0" }),
    "unsupported-protocol-version",
  );
  expectFailure({ ...pass, status: 1 }, "exit-mismatch");
  expectFailure(
    { stdout: envelope({ ...valid, status: "unknown" }).stdout, status: 1 },
    "exit-mismatch",
  );
  expectFailure({ stdout: "", status: 0 }, "invalid-json-stream");
  expectFailure({ stdout: "{\n", status: 0 }, "invalid-json-stream");
  expectFailure(
    { stdout: `${pass.stdout}${pass.stdout}`, status: 0 },
    "invalid-json-stream",
  );
  expectFailure(
    envelope({ ...valid, issues: [{ message: "human prose" }] }),
    "invalid-envelope",
  );
  expectFailure(envelope({ ...valid, outcome: "failure" }), "invalid-envelope");
}

assert.ok(["all-commands", "failure-cases"].includes(mode));
mkdirSync(join(scratch, "home"), { recursive: true });
if (mode === "all-commands") allCommands();
else failureCases();
