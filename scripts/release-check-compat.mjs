import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { TextDecoder } from "node:util";
import { fileURLToPath } from "node:url";

class CompatibilityError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function requireResult(condition, code) {
  if (!condition) throw new CompatibilityError(code);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function compatibleResult(stdout, childExit, schema, contract) {
  requireResult(
    Buffer.isBuffer(stdout) && stdout.length <= 1_048_576,
    "RESULT_UNAVAILABLE",
  );
  requireResult(Number.isInteger(childExit), "PROCESS_EXIT_UNAVAILABLE");

  let json;
  try {
    json = new TextDecoder("utf-8", { fatal: true }).decode(stdout);
  } catch {
    throw new CompatibilityError("INVALID_JSON_STREAM");
  }
  requireResult(/^[^\r\n]+\n$/u.test(json), "INVALID_JSON_STREAM");

  let result;
  try {
    result = JSON.parse(json);
  } catch {
    throw new CompatibilityError("INVALID_JSON_STREAM");
  }
  requireResult(isRecord(result), "INVALID_ENVELOPE");
  requireResult(
    result.schemaVersion === schema.properties.schemaVersion.const &&
      result.protocolVersion === schema.properties.protocolVersion.const,
    "UNSUPPORTED_RESULT_VERSION",
  );

  requireResult(
    contract.validateResultEnvelope(result).ok && result.subject === "release",
    "INVALID_ENVELOPE",
  );
  requireResult(result.exit === childExit, "PROCESS_EXIT_MISMATCH");
  requireResult(
    isRecord(result.data) && result.data.remoteChecks === "not-performed",
    "INVALID_RELEASE_DATA",
  );

  if (result.status === "pass") {
    requireResult(
      result.outcome === "RELEASE_READY" &&
        result.exit === 0 &&
        result.issues.length === 0 &&
        result.error === undefined,
      "INVALID_RELEASE_RESULT",
    );
    const { version, commit, expectedTag, localTag } = result.data;
    requireResult(
      typeof version === "string" &&
        /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u.test(version) &&
        typeof commit === "string" &&
        /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/u.test(commit) &&
        expectedTag === `v${version}` &&
        ["absent", "same-head"].includes(localTag),
      "INVALID_RELEASE_DATA",
    );
    return {
      ready: true,
      version,
      commit,
      expectedTag,
      localTag,
    };
  }

  if (result.status === "fail") {
    requireResult(
      result.outcome === "RELEASE_INCOMPLETE" &&
        result.exit === 1 &&
        result.issues.length > 0 &&
        result.error === undefined,
      "INVALID_RELEASE_RESULT",
    );
    return { ready: false, code: result.issues[0].code };
  }

  requireResult(
    result.status === "error" &&
      result.outcome === "ERROR" &&
      [2, 3].includes(result.exit) &&
      result.issues.length > 0 &&
      isRecord(result.error) &&
      typeof result.error.code === "string",
    "INVALID_RELEASE_RESULT",
  );
  return { ready: false, code: result.error.code };
}

async function run() {
  const releaseRoot = realpathSync(
    join(dirname(fileURLToPath(import.meta.url)), ".."),
  );
  const resultSchemaPath = join(
    releaseRoot,
    "docs/typescript-tooling/result-envelope-v1.schema.json",
  );
  const releaseBin = join(releaseRoot, "packages/cli/dist/bin.js");
  const contract = await import(
    join(releaseRoot, "packages/core/dist/result.js")
  );
  const schema = JSON.parse(readFileSync(resultSchemaPath, "utf8"));
  requireResult(
    isRecord(schema) &&
      isRecord(schema.properties) &&
      isRecord(schema.properties.schemaVersion) &&
      isRecord(schema.properties.protocolVersion) &&
      typeof schema.properties.schemaVersion.const === "string" &&
      typeof schema.properties.protocolVersion.const === "string" &&
      schema.properties.schemaVersion.const ===
        contract.RESULT_SCHEMA_VERSION &&
      schema.properties.protocolVersion.const ===
        contract.IMPLEMENTED_PROTOCOL_VERSION,
    "RESULT_SCHEMA_UNAVAILABLE",
  );
  const child = spawnSync(
    process.execPath,
    [releaseBin, "release", "check", "--json", releaseRoot],
    {
      cwd: releaseRoot,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1_048_576,
    },
  );
  requireResult(child.error === undefined, "RESULT_UNAVAILABLE");
  return compatibleResult(child.stdout, child.status, schema, contract);
}

try {
  const result = await run();
  if (result.ready) {
    process.stdout.write(
      [
        "release check passed",
        `version=${result.version}`,
        `commit=${result.commit}`,
        `expected_tag=${result.expectedTag}`,
        `local_tag=${result.localTag}`,
        "remote_checks=not-performed",
        "",
      ].join("\n"),
    );
  } else {
    process.stderr.write(`release check failed: ${result.code}\n`);
    process.exitCode = 1;
  }
} catch (error) {
  const code =
    error instanceof CompatibilityError ? error.code : "RESULT_UNAVAILABLE";
  process.stderr.write(`release check failed: ${code}\n`);
  process.exitCode = 1;
}
