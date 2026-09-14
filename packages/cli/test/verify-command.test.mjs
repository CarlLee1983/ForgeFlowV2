import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validateResultEnvelope } from "@forgeflow/core";

import { runDoctor } from "../dist/doctor.js";
import { runDoctorVerification } from "../dist/doctor-execution.js";
import { runVerify } from "../dist/verify.js";

const bin = fileURLToPath(
  new globalThis.URL("../dist/bin.js", import.meta.url),
);

function runCli(args, cwd, env) {
  return spawnSync(globalThis.process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
    ...(env === undefined ? {} : { env }),
  });
}

async function fixture(t, makefile = "verify:\n\t@:\n") {
  const root = await mkdtemp(join(tmpdir(), "forgeflow-verify-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "specs", "stories"), { recursive: true });
  await writeFile(join(root, "AGENTS.md"), "agent guide\n");
  await writeFile(join(root, "Makefile"), makefile);
  return root;
}

function fakeProcess(observation, calls, output = {}) {
  return {
    async run(request) {
      calls.push(request);
      if (output.stdout) request.onStdout(output.stdout);
      if (output.stderr) request.onStderr(output.stderr);
      return observation;
    },
  };
}

test("TST010-AC-001: direct verification invokes make once from the resolved physical root", async (t) => {
  const root = await fixture(t);
  const link = join(tmpdir(), `forgeflow-verify-link-${Date.now()}`);
  await symlink(root, link);
  t.after(() => rm(link, { force: true }));
  const calls = [];
  const chunks = [];
  const execution = await runVerify(
    [link],
    tmpdir(),
    undefined,
    fakeProcess({ kind: "completed", status: 0, signal: null }, calls, {
      stdout: "child stdout\n",
      stderr: "child stderr\n",
    }),
    {
      onStdout: (chunk) => chunks.push(["stdout", chunk]),
      onStderr: (chunk) => chunks.push(["stderr", chunk]),
    },
  );

  assert.equal(execution.kind, "executed");
  assert.equal(execution.result.exit, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, "make");
  assert.deepEqual(calls[0].args, ["verify"]);
  assert.equal(calls[0].cwd, await realpath(root));
  assert.equal(calls[0].env.CDPATH, "");
  assert.deepEqual(chunks, [
    ["stdout", "child stdout\n"],
    ["stderr", "child stderr\n"],
  ]);
});

test("TST010-AC-001/002: advisory Doctor drift permits execution, but incomplete Doctor structure does not", async (t) => {
  const root = await fixture(t);
  await writeFile(
    join(root, "specs", ".forgeflow-adoption"),
    "version=0.0.0\n",
  );
  const calls = [];
  const drift = await runDoctorVerification(
    ["--run-verify"],
    root,
    undefined,
    fakeProcess({ kind: "completed", status: 0, signal: null }, calls),
  );
  assert.equal(drift.kind, "executed");
  assert.equal(calls.length, 1);
  const link = join(tmpdir(), `forgeflow-doctor-verify-link-${Date.now()}`);
  await symlink(root, link);
  t.after(() => rm(link, { force: true }));
  const linked = await runDoctorVerification(
    ["--run-verify", link],
    tmpdir(),
    undefined,
    fakeProcess({ kind: "completed", status: 0, signal: null }, calls),
  );
  assert.equal(linked.kind, "executed");
  assert.equal(calls.at(-1).cwd, await realpath(root));

  await symlink(join(root, "Makefile"), join(root, "guidance"));
  const optionalError = await runDoctorVerification(
    ["--run-verify"],
    root,
    undefined,
    fakeProcess({ kind: "completed", status: 0, signal: null }, calls),
  );
  assert.equal(optionalError.kind, "executed");
  assert.equal(calls.length, 3);

  await rm(join(root, "AGENTS.md"));
  const incomplete = await runDoctorVerification(
    ["--run-verify"],
    root,
    undefined,
    fakeProcess({ kind: "completed", status: 0, signal: null }, calls),
  );
  assert.equal(incomplete.kind, "static");
  assert.equal(calls.length, 3);
});

test("TST010-AC-002/005: unsafe or incomplete static structure never reaches the process adapter", async (t) => {
  const root = await fixture(t);
  await rm(join(root, "AGENTS.md"));
  const calls = [];
  const execution = await runVerify(
    [],
    root,
    undefined,
    fakeProcess({ kind: "completed", status: 0, signal: null }, calls),
  );

  assert.equal(execution.kind, "static-failure");
  assert.equal(execution.result.exit, 1);
  assert.equal(calls.length, 0);

  const unsafeRoot = await fixture(t);
  await rm(join(unsafeRoot, "AGENTS.md"));
  await symlink(join(unsafeRoot, "Makefile"), join(unsafeRoot, "AGENTS.md"));
  const unsafe = await runVerify(
    [],
    unsafeRoot,
    undefined,
    fakeProcess({ kind: "completed", status: 0, signal: null }, calls),
  );
  assert.equal(unsafe.kind, "static-failure");
  assert.equal(unsafe.result.exit, 2);
  assert.equal(calls.length, 0);
});

test("TST010-AC-004/005: nonzero, signal, and spawn observations keep their raw typed evidence", async (t) => {
  const root = await fixture(t);
  for (const [name, observation, exit] of [
    ["nonzero", { kind: "completed", status: 23, signal: null }, 1],
    ["signal", { kind: "completed", status: null, signal: "SIGTERM" }, 1],
    ["spawn", { kind: "spawn-error", code: "ENOENT" }, 2],
  ]) {
    await t.test(name, async () => {
      const calls = [];
      const execution = await runVerify(
        [],
        root,
        undefined,
        fakeProcess(observation, calls),
      );
      assert.equal(execution.kind, "executed");
      assert.equal(execution.result.exit, exit);
      assert.deepEqual(execution.execution.observation, observation);
      assert.equal(calls.length, 1);
    });
  }
});

test("TST010-AC-005: a rejected process adapter maps to one typed error", async (t) => {
  const root = await fixture(t);
  const execution = await runVerify([], root, undefined, {
    async run() {
      throw Object.assign(new Error("unavailable"), { code: "EACCES" });
    },
  });
  assert.equal(execution.kind, "executed");
  assert.equal(execution.result.exit, 2);
  assert.deepEqual(execution.execution.observation, {
    kind: "spawn-error",
    code: "EACCES",
  });
});

test("TST010-AC-005: an unavailable make executable is an error without target execution", async (t) => {
  const root = await fixture(t, "verify:\n\t@printf unsafe > ran.marker\n");
  const execution = runCli(["verify", "--json"], root, { PATH: "" });
  assert.equal(execution.status, 2);
  assert.match(execution.stdout, /^\{[^\n]+\}\n$/);
  const envelope = JSON.parse(execution.stdout);
  assert.equal(envelope.outcome, "configuration-error");
  assert.equal(envelope.issues[0].code, "VERIFICATION_PROCESS_UNAVAILABLE");
  await assert.rejects(readFile(join(root, "ran.marker"), "utf8"));
});

test("TST010-AC-005: empty execution targets are rejected before static acquisition or process execution", async (t) => {
  const root = await fixture(t);
  const calls = [];
  const direct = await runVerify(
    [""],
    root,
    undefined,
    fakeProcess({ kind: "completed", status: 0, signal: null }, calls),
  );
  assert.equal(direct.kind, "static-failure");
  assert.equal(direct.result.exit, 2);

  const doctor = await runDoctorVerification(
    ["--run-verify", ""],
    root,
    undefined,
    fakeProcess({ kind: "completed", status: 0, signal: null }, calls),
  );
  assert.equal(doctor.kind, "static");
  assert.equal(doctor.static.evaluation.result.exit, 2);
  assert.equal(calls.length, 0);
});

test("TST010-AC-001: Make-control environment flags cannot suppress the canonical recipe", async (t) => {
  const root = await fixture(t, "verify:\n\t@printf ran > make-ran.marker\n");
  const execution = runCli(["verify", "--json"], root, {
    ...globalThis.process.env,
    MAKEFLAGS: "-n",
  });
  assert.equal(execution.status, 0);
  assert.equal(await readFile(join(root, "make-ran.marker"), "utf8"), "ran");
});

test("TST010-AC-001/003: direct and Doctor execution stream human output, while JSON reserves stdout for one envelope", async (t) => {
  const root = await fixture(
    t,
    "verify:\n\t@printf 'child stdout\\n'\n\t@printf 'child stderr\\n' >&2\n\t@printf run >> verify-runs.log\n",
  );

  const human = runCli(["verify"], root);
  assert.equal(human.status, 0);
  assert.match(human.stdout, /^ForgeFlow Canonical Verification$/m);
  assert.match(human.stdout, /child stdout/);
  assert.match(human.stderr, /child stderr/);
  assert.match(human.stdout, /^Result: VERIFIED_LOCAL$/m);

  const machine = runCli(["verify", "--json"], root);
  assert.equal(machine.status, 0);
  assert.match(machine.stdout, /^\{[^\n]+\}\n$/);
  assert.deepEqual(validateResultEnvelope(JSON.parse(machine.stdout)), {
    ok: true,
    value: JSON.parse(machine.stdout),
  });
  assert.match(machine.stderr, /child stdout/);
  assert.match(machine.stderr, /child stderr/);

  const doctor = runCli(["doctor", "--run-verify"], root);
  assert.equal(doctor.status, 0);
  assert.match(
    doctor.stdout,
    /WARNING: --run-verify executes repository-owned code/,
  );
  assert.match(doctor.stdout, /^Result: VERIFIED_LOCAL$/m);

  const doctorMachine = runCli(["doctor", "--run-verify", "--json"], root);
  assert.equal(doctorMachine.status, 0);
  assert.match(doctorMachine.stdout, /^\{[^\n]+\}\n$/);
  assert.match(doctorMachine.stderr, /child stdout/);
  assert.match(doctorMachine.stderr, /child stderr/);
  assert.equal(
    (await readFile(join(root, "verify-runs.log"), "utf8")).length,
    12,
  );
});

test("TST010-AC-002: static Doctor source retains no child-process capability", async (t) => {
  const root = await fixture(t);
  const staticDoctor = await runDoctor([], root);
  assert.equal(staticDoctor.evaluation.outcome, "STRUCTURE_OK");
  const source = await readFile(
    fileURLToPath(new globalThis.URL("../src/doctor.ts", import.meta.url)),
    "utf8",
  );
  assert.doesNotMatch(source, /node:child_process|spawn\(|exec\(/);
});
