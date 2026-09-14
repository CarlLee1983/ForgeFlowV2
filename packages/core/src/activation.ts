import { createHash } from "node:crypto";

import type {
  MutationExecutionObservation,
  MutationPathKind,
  MutationStageObservation,
  MutationStagePrecondition,
} from "./mutation.js";
import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  type ResultDataValue,
  type ResultEnvelope,
  type ResultIssue,
} from "./result.js";

export const activationSkillDirectory = ".agents/skills/forgeflow";
export const activationSnapshotPath =
  ".agents/skills/forgeflow/.forgeflow-snapshot";
export const activationDestinations = Object.freeze([
  "AGENTS.md",
  ".agents/skills/forgeflow/SKILL.md",
  ".agents/skills/forgeflow/story-development.md",
  activationSnapshotPath,
] as const);
export const activationDirectories = Object.freeze([
  "specs",
  "specs/stories",
  ".agents",
  ".agents/skills",
  activationSkillDirectory,
] as const);
export const activationAdoptionPath = "specs/.forgeflow-adoption";

const beginMarker = "<!-- ForgeFlow Codex: begin -->";
const endMarker = "<!-- ForgeFlow Codex: end -->";
const markerPrefix = "<!-- ForgeFlow Codex:";
const sha256Pattern = /^[a-f0-9]{64}$/;
const revisionPattern = /^(?:unknown|[a-f0-9]{40}|[a-f0-9]{64})(?:-dirty)?$/;
const semverPattern =
  /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/;
const expectedMembers = Object.freeze([
  ".forgeflow-snapshot",
  "SKILL.md",
  "story-development.md",
]);

export interface ActivationSourceAsset {
  readonly bytes: Uint8Array;
  readonly digest: string;
  readonly mode: number;
}

export interface ActivationSourceSnapshot {
  readonly version: string;
  readonly revision: string;
  readonly provenance: string;
  readonly skill: ActivationSourceAsset;
  readonly workflow: ActivationSourceAsset;
  readonly agentBlock: ActivationSourceAsset;
}

export interface ActivationPathObservation {
  readonly path: string;
  readonly kind: MutationPathKind;
  readonly readable?: boolean;
  readonly searchable?: boolean;
  readonly digest?: string;
  readonly identity?: string;
  readonly mode?: number;
  readonly bytes?: Uint8Array;
  readonly members?: readonly string[];
}

export interface ActivationPathPrecondition {
  readonly path: string;
  readonly kind: MutationPathKind;
  readonly readable?: boolean;
  readonly searchable?: boolean;
  readonly digest?: string;
  readonly identity?: string;
  readonly mode?: number;
}

export interface ActivationPlanRequest {
  readonly rootIdentity: string;
  readonly source: ActivationSourceSnapshot;
  readonly paths: readonly ActivationPathObservation[];
}

export interface ActivationAcquisitionObservation {
  readonly kind: "target-unavailable" | "source-unavailable";
}

export interface ActivationPlannedChange {
  readonly [key: string]: ResultDataValue;
  readonly kind: "install" | "replace";
  readonly path: string;
  readonly digest: string;
  readonly mode: number;
}

export interface ActivationPlannedPayload {
  readonly path: string;
  readonly digest: string;
  readonly bytes: Uint8Array;
  readonly mode: number;
}

export interface ActivationMutationPlan {
  readonly planVersion: "1";
  readonly operation: "activation";
  readonly rootIdentity: string;
  readonly version: string;
  readonly revision: string;
  readonly adoption: string;
  readonly provenance: string;
  readonly preconditions: readonly ActivationPathPrecondition[];
  readonly stagePreconditions: readonly MutationStagePrecondition[];
  readonly effects: readonly ActivationPlannedChange[];
  readonly commitMarker: typeof activationSnapshotPath;
  readonly planId: string;
}

export interface ActivationPlanEvaluation {
  readonly result: ResultEnvelope;
  readonly changes: readonly ActivationPlannedChange[];
  readonly plan?: ActivationMutationPlan;
  readonly payloads?: readonly ActivationPlannedPayload[];
}

export interface ActivationScratchCleanupObservation {
  readonly prepared?: boolean;
  readonly cleaned: boolean;
  readonly retained: readonly string[];
}

function issue(code: string, message: string, path?: string): ResultIssue {
  return Object.freeze({
    code,
    message,
    ...(path === undefined ? {} : { path }),
  });
}

function result(
  status: "pass" | "fail" | "error",
  outcome:
    | "ACTIVATION_PREVIEW"
    | "ACTIVATION_APPLIED"
    | "ACTIVATION_UNCHANGED"
    | "ACTIVATION_CONFLICT"
    | "ACTIVATION_OPERATION_REFUSED"
    | "ACTIVATION_APPLY_FAILED_RECOVERED"
    | "ACTIVATION_RECOVERY_INCOMPLETE"
    | "ACTIVATION_CLEANUP_INCOMPLETE"
    | "ERROR",
  exit: 0 | 1 | 2 | 3,
  issues: readonly ResultIssue[],
  data?: Readonly<Record<string, ResultDataValue>>,
): ResultEnvelope {
  return Object.freeze({
    schemaVersion: RESULT_SCHEMA_VERSION,
    protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
    status,
    outcome,
    exit,
    subject: "activation",
    ...(data === undefined ? {} : { data }),
    ...(status === "error" && issues[0] !== undefined
      ? {
          error: Object.freeze({
            code: issues[0].code,
            message: issues[0].message,
          }),
        }
      : {}),
    issues: Object.freeze(issues),
  });
}

function hash(bytes: string | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.byteLength, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function decode(bytes: Uint8Array): string | undefined {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

function validMode(mode: number | undefined): mode is number {
  return (
    mode !== undefined && Number.isInteger(mode) && mode >= 0 && mode <= 0o777
  );
}

function validAsset(asset: ActivationSourceAsset): boolean {
  return (
    asset.bytes.byteLength > 0 &&
    sha256Pattern.test(asset.digest) &&
    hash(asset.bytes) === asset.digest &&
    validMode(asset.mode)
  );
}

function validSource(source: ActivationSourceSnapshot): string | undefined {
  if (!semverPattern.test(source.version))
    return "The packaged activation version is invalid.";
  if (!revisionPattern.test(source.revision))
    return "The packaged activation revision is invalid.";
  if (source.provenance.length === 0 || /[\r\n]/.test(source.provenance))
    return "The packaged activation provenance is invalid.";
  if (
    !validAsset(source.skill) ||
    !validAsset(source.workflow) ||
    !validAsset(source.agentBlock)
  )
    return "A packaged activation asset is invalid.";
  const block = decode(source.agentBlock.bytes);
  if (
    block === undefined ||
    block.includes(markerPrefix) ||
    !block.endsWith("\n")
  )
    return "The packaged AGENTS block is invalid.";
  const skill = decode(source.skill.bytes);
  if (skill === undefined)
    return "The packaged ForgeFlow skill is not valid UTF-8.";
  return undefined;
}

function immutablePrecondition(
  observation: ActivationPathObservation,
): ActivationPathPrecondition {
  return Object.freeze({
    path: observation.path,
    kind: observation.kind,
    ...(observation.readable === undefined
      ? {}
      : { readable: observation.readable }),
    ...(observation.searchable === undefined
      ? {}
      : { searchable: observation.searchable }),
    ...(observation.digest === undefined ? {} : { digest: observation.digest }),
    ...(observation.identity === undefined
      ? {}
      : { identity: observation.identity }),
    ...(observation.mode === undefined ? {} : { mode: observation.mode }),
  });
}

function observationMap(
  observations: readonly ActivationPathObservation[],
): Map<string, ActivationPathObservation> | undefined {
  const paths = new Map<string, ActivationPathObservation>();
  for (const observation of observations) {
    if (paths.has(observation.path)) return undefined;
    paths.set(observation.path, observation);
  }
  return paths;
}

function membersDigest(members: readonly string[]): string {
  return hash(`${members.join("\n")}\n`);
}

function validMembers(
  members: readonly string[] | undefined,
): members is readonly string[] {
  return (
    members !== undefined &&
    members.every(
      (member) =>
        member.length > 0 &&
        member !== "." &&
        member !== ".." &&
        !member.includes("/") &&
        !member.includes("\\") &&
        !Array.from(member).some((character) => {
          const code = character.codePointAt(0);
          return (
            code !== undefined && (code <= 31 || (code >= 127 && code <= 159))
          );
        }),
    ) &&
    new Set(members).size === members.length &&
    [...members].sort().every((member, index) => member === members[index])
  );
}

function safeFileObservation(
  observation: ActivationPathObservation | undefined,
): observation is ActivationPathObservation & {
  readonly kind: "file";
  readonly bytes: Uint8Array;
  readonly digest: string;
  readonly identity: string;
  readonly mode: number;
} {
  return (
    observation?.kind === "file" &&
    observation.readable === true &&
    observation.bytes !== undefined &&
    sha256Pattern.test(observation.digest ?? "") &&
    hash(observation.bytes) === observation.digest &&
    observation.identity !== undefined &&
    validMode(observation.mode)
  );
}

interface MarkerSpan {
  readonly count: 0 | 2;
  readonly start: number;
  readonly stop: number;
  readonly bytes: Uint8Array;
}

function asciiEquals(bytes: Uint8Array, value: string): boolean {
  const expected = encode(value);
  return bytesEqual(bytes, expected);
}

function containsAscii(bytes: Uint8Array, value: string): boolean {
  const needle = encode(value);
  outer: for (
    let start = 0;
    start + needle.byteLength <= bytes.byteLength;
    start += 1
  ) {
    for (let index = 0; index < needle.byteLength; index += 1) {
      if (bytes[start + index] !== needle[index]) continue outer;
    }
    return true;
  }
  return false;
}

function findMarkerSpan(bytes: Uint8Array): MarkerSpan | undefined {
  let position = 0;
  let state: 0 | 1 | 2 = 0;
  let start = 0;
  let stop = 0;
  while (position < bytes.byteLength) {
    let lineEnd = position;
    while (lineEnd < bytes.byteLength && bytes[lineEnd] !== 10) lineEnd += 1;
    const contentEnd =
      lineEnd > position && bytes[lineEnd - 1] === 13 ? lineEnd - 1 : lineEnd;
    const line = bytes.slice(position, contentEnd);
    const width =
      lineEnd < bytes.byteLength ? lineEnd - position + 1 : lineEnd - position;
    if (containsAscii(line, markerPrefix)) {
      if (asciiEquals(line, beginMarker) && state === 0) {
        start = position;
        state = 1;
      } else if (asciiEquals(line, endMarker) && state === 1) {
        stop = position + width;
        state = 2;
      } else {
        return undefined;
      }
    }
    position += width;
  }
  if (state === 1) return undefined;
  if (state === 0)
    return Object.freeze({
      count: 0,
      start: 0,
      stop: 0,
      bytes: new Uint8Array(),
    });
  return Object.freeze({
    count: 2,
    start,
    stop,
    bytes: bytes.slice(start, stop),
  });
}

function parseAdoption(bytes: Uint8Array | undefined): string | undefined {
  if (bytes === undefined) return "unknown";
  const source = decode(bytes);
  if (source === undefined) return undefined;
  const matches = source
    .split("\n")
    .filter((line) => line.startsWith("version="));
  if (matches.length !== 1) return undefined;
  const version = matches[0]?.slice("version=".length).replace(/\r$/, "") ?? "";
  return semverPattern.test(version) ? version : undefined;
}

function crcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let byte = 0; byte < 256; byte += 1) {
    let crc = byte << 24;
    for (let bit = 0; bit < 8; bit += 1) {
      crc =
        (crc & 0x80000000) !== 0
          ? ((crc << 1) ^ 0x04c11db7) >>> 0
          : (crc << 1) >>> 0;
    }
    table[byte] = crc >>> 0;
  }
  return table;
}

const posixCrcTable = crcTable();

/** Returns the decimal checksum and byte count emitted by POSIX cksum. */
export function posixCksum(bytes: Uint8Array): string {
  let crc = 0;
  for (const byte of bytes) {
    crc = (posixCrcTable[((crc >>> 24) ^ byte) & 0xff]! ^ (crc << 8)) >>> 0;
  }
  let length = bytes.byteLength;
  while (length !== 0) {
    crc =
      (posixCrcTable[((crc >>> 24) ^ (length & 0xff)) & 0xff]! ^ (crc << 8)) >>>
      0;
    length = Math.floor(length / 256);
  }
  return `${~crc >>> 0} ${bytes.byteLength}`;
}

function snapshotBytes(
  version: string,
  revision: string,
  adoption: string,
  skill: Uint8Array,
  workflow: Uint8Array,
  block: Uint8Array,
): Uint8Array {
  return encode(
    `format=1\nversion=${version}\nrevision=${revision}\nadoption=${adoption}\n` +
      `skill=${posixCksum(skill)}\nworkflow=${posixCksum(workflow)}\n` +
      `block=${posixCksum(block)}\n`,
  );
}

function validInstalledSnapshot(
  bytes: Uint8Array,
  skill: Uint8Array,
  workflow: Uint8Array,
  block: Uint8Array,
): boolean {
  const source = decode(bytes);
  if (source === undefined || !source.endsWith("\n")) return false;
  const lines = source.split("\n");
  if (lines.length !== 8 || lines[7] !== "" || lines[0] !== "format=1")
    return false;
  const version = lines[1]?.replace(/^version=/, "");
  const revision = lines[2]?.replace(/^revision=/, "");
  const adoption = lines[3]?.replace(/^adoption=/, "");
  if (
    lines[1] !== `version=${version}` ||
    lines[2] !== `revision=${revision}` ||
    lines[3] !== `adoption=${adoption}` ||
    version === undefined ||
    revision === undefined ||
    adoption === undefined ||
    !semverPattern.test(version) ||
    !revisionPattern.test(revision) ||
    !(adoption === "unknown" || semverPattern.test(adoption))
  )
    return false;
  const expected = snapshotBytes(
    version,
    revision,
    adoption,
    skill,
    workflow,
    block,
  );
  return bytesEqual(bytes, expected);
}

function conflict(message: string, path?: string): ActivationPlanEvaluation {
  const problems = Object.freeze([issue("ACTIVATION_CONFLICT", message, path)]);
  return Object.freeze({
    result: result("fail", "ACTIVATION_CONFLICT", 1, problems),
    changes: Object.freeze([]),
  });
}

function refused(
  code: string,
  message: string,
  path?: string,
): ActivationPlanEvaluation {
  const problems = Object.freeze([issue(code, message, path)]);
  return Object.freeze({
    result: result("fail", "ACTIVATION_OPERATION_REFUSED", 1, problems),
    changes: Object.freeze([]),
  });
}

export function evaluateActivationAcquisition(
  observation: ActivationAcquisitionObservation,
): ActivationPlanEvaluation {
  return observation.kind === "target-unavailable"
    ? refused(
        "ACTIVATION_TARGET_UNAVAILABLE",
        "The activation target could not be safely inspected.",
      )
    : refused(
        "ACTIVATION_SNAPSHOT_UNAVAILABLE",
        "The packaged activation source could not be safely inspected.",
      );
}

function stagePath(path: string, seed: string): string {
  const separator = path.lastIndexOf("/");
  const parent = separator === -1 ? "" : `${path.slice(0, separator + 1)}`;
  const name = path.slice(separator + 1);
  return `${parent}.forgeflow-activate.${seed.slice(0, 16)}-${name}`;
}

function planBody(plan: Omit<ActivationMutationPlan, "planId">): object {
  return {
    planVersion: plan.planVersion,
    operation: plan.operation,
    rootIdentity: plan.rootIdentity,
    version: plan.version,
    revision: plan.revision,
    adoption: plan.adoption,
    provenance: plan.provenance,
    preconditions: plan.preconditions,
    stagePreconditions: plan.stagePreconditions,
    effects: plan.effects,
    commitMarker: plan.commitMarker,
  };
}

function planIdentity(plan: Omit<ActivationMutationPlan, "planId">): string {
  return hash(JSON.stringify(planBody(plan)));
}

function planData(
  version: string,
  revision: string,
  adoption: string,
  changes: readonly ActivationPlannedChange[],
  planId?: string,
): Readonly<Record<string, ResultDataValue>> {
  return Object.freeze({
    version,
    revision,
    adoption,
    changes,
    ...(planId === undefined ? {} : { planId }),
  });
}

export function getActivationObservationScope(): {
  readonly directories: readonly string[];
  readonly destinations: readonly string[];
} {
  return Object.freeze({
    directories: activationDirectories,
    destinations: Object.freeze([
      "AGENTS.md",
      activationAdoptionPath,
      ...activationDestinations.slice(1),
    ]),
  });
}

export function planActivation(
  request: ActivationPlanRequest,
): ActivationPlanEvaluation {
  if (request.rootIdentity.length === 0 || /[\r\n]/.test(request.rootIdentity))
    return refused(
      "ACTIVATION_ROOT_IDENTITY_INVALID",
      "The activation target root identity is invalid.",
    );
  const sourceProblem = validSource(request.source);
  if (sourceProblem !== undefined)
    return refused("ACTIVATION_SNAPSHOT_INVALID", sourceProblem);
  const observed = observationMap(request.paths);
  if (observed === undefined)
    return refused(
      "ACTIVATION_OBSERVATION_INVALID",
      "Activation path observations contain a duplicate path.",
    );
  const scope = getActivationObservationScope();
  if (
    request.paths.length !==
      scope.directories.length + scope.destinations.length ||
    [...scope.directories, ...scope.destinations].some(
      (path) => !observed.has(path),
    )
  )
    return refused(
      "ACTIVATION_OBSERVATION_INVALID",
      "Activation path observations do not cover the managed surface.",
    );

  for (const path of scope.directories) {
    const entry = observed.get(path) as ActivationPathObservation;
    if (
      entry.kind !== "missing" &&
      (entry.kind !== "directory" ||
        entry.readable !== true ||
        entry.searchable !== true ||
        entry.identity === undefined)
    )
      return refused(
        "ACTIVATION_UNSAFE_MANAGED_DIRECTORY",
        "A managed activation directory cannot be safely inspected.",
        path,
      );
    if (entry.kind === "directory") {
      if (path === activationSkillDirectory) {
        const members = entry.members;
        if (!validMembers(members) || entry.digest !== membersDigest(members))
          return refused(
            "ACTIVATION_DIRECTORY_OBSERVATION_INVALID",
            "The activation directory membership cannot be confirmed.",
            path,
          );
      } else if (entry.members !== undefined || entry.digest !== undefined) {
        return refused(
          "ACTIVATION_DIRECTORY_OBSERVATION_INVALID",
          "An activation parent has unexpected membership evidence.",
          path,
        );
      }
    } else if (entry.members !== undefined || entry.digest !== undefined) {
      return refused(
        "ACTIVATION_DIRECTORY_OBSERVATION_INVALID",
        "A missing activation directory has inconsistent evidence.",
        path,
      );
    }
  }

  for (const path of ["specs", "specs/stories"] as const) {
    if (observed.get(path)?.kind !== "directory")
      return conflict(
        "The target is not an adopted ForgeFlow repository.",
        path,
      );
  }
  const agents = observed.get("AGENTS.md");
  if (!safeFileObservation(agents) || agents.bytes.byteLength === 0)
    return agents?.kind === "missing"
      ? conflict(
          "The target has no nonempty AGENTS.md adoption entry point.",
          "AGENTS.md",
        )
      : refused(
          "ACTIVATION_UNSAFE_MANAGED_PATH",
          "AGENTS.md cannot be safely inspected.",
          "AGENTS.md",
        );

  const adoptionEntry = observed.get(activationAdoptionPath);
  if (adoptionEntry?.kind !== "missing" && !safeFileObservation(adoptionEntry))
    return refused(
      "ACTIVATION_UNSAFE_MANAGED_PATH",
      "The adoption marker cannot be safely inspected.",
      activationAdoptionPath,
    );
  const adoption = parseAdoption(
    adoptionEntry?.kind === "file" ? adoptionEntry.bytes : undefined,
  );
  if (adoption === undefined)
    return conflict(
      "The adoption marker has an invalid version declaration.",
      activationAdoptionPath,
    );

  const integrationDirectory = observed.get(
    activationSkillDirectory,
  ) as ActivationPathObservation;
  const installed = integrationDirectory.kind === "directory";
  const members = integrationDirectory.members ?? Object.freeze([]);
  if (
    installed &&
    (members.length !== expectedMembers.length ||
      members.some((member, index) => member !== expectedMembers[index]))
  )
    return conflict(
      "The installed activation contains unknown or incomplete content.",
      activationSkillDirectory,
    );
  if (!installed && members.length !== 0)
    return conflict(
      "Activation ownership evidence is inconsistent.",
      activationSkillDirectory,
    );

  const installedEntries = activationDestinations
    .slice(1)
    .map((path) => observed.get(path));
  for (const [index, entry] of installedEntries.entries()) {
    if (entry?.kind !== "missing" && entry?.kind !== "file")
      return refused(
        "ACTIVATION_UNSAFE_MANAGED_PATH",
        "An activation destination cannot be safely inspected.",
        activationDestinations[index + 1],
      );
    if (entry?.kind === "file" && !safeFileObservation(entry))
      return refused(
        "ACTIVATION_UNSAFE_MANAGED_PATH",
        "An activation destination cannot be safely inspected.",
        activationDestinations[index + 1],
      );
  }
  if (
    installed
      ? installedEntries.some(
          (entry) =>
            !safeFileObservation(entry) || entry.bytes.byteLength === 0,
        )
      : installedEntries.some((entry) => entry?.kind !== "missing")
  )
    return conflict(
      "The installed activation is incomplete or unowned.",
      activationSkillDirectory,
    );

  const marker = findMarkerSpan(agents.bytes);
  if (marker === undefined)
    return conflict(
      "AGENTS.md has an ambiguous or malformed ForgeFlow section.",
      "AGENTS.md",
    );
  if ((installed && marker.count !== 2) || (!installed && marker.count !== 0))
    return conflict(
      "The AGENTS section and installed snapshot ownership disagree.",
      "AGENTS.md",
    );

  if (installed) {
    const skill = installedEntries[0] as ActivationPathObservation & {
      readonly bytes: Uint8Array;
    };
    const workflow = installedEntries[1] as ActivationPathObservation & {
      readonly bytes: Uint8Array;
    };
    const snapshot = installedEntries[2] as ActivationPathObservation & {
      readonly bytes: Uint8Array;
    };
    if (
      !validInstalledSnapshot(
        snapshot.bytes,
        skill.bytes,
        workflow.bytes,
        marker.bytes,
      )
    )
      return conflict(
        "The installed activation is locally edited or malformed.",
        activationSnapshotPath,
      );
    const snapshotSource = decode(snapshot.bytes) as string;
    const version = snapshotSource.split("\n")[1]?.slice("version=".length);
    const revision = snapshotSource.split("\n")[2]?.slice("revision=".length);
    const installedAdoption = snapshotSource
      .split("\n")[3]
      ?.slice("adoption=".length);
    const identity = `<!-- snapshot version=${version} revision=${revision} adoption=${installedAdoption} -->`;
    if (!decode(marker.bytes)?.split(/\r?\n/).includes(identity))
      return conflict(
        "The installed snapshot identity and AGENTS section disagree.",
        "AGENTS.md",
      );
  }

  const sourceSkillText = decode(request.source.skill.bytes) as string;
  const desiredSkill = encode(
    sourceSkillText.replaceAll(
      "../story-development/SKILL.md",
      "story-development.md",
    ),
  );
  const identity = `<!-- snapshot version=${request.source.version} revision=${request.source.revision} adoption=${adoption} -->`;
  const block = concatBytes([
    encode(`${beginMarker}\n${identity}\n`),
    request.source.agentBlock.bytes,
    encode(`${endMarker}\n`),
  ]);
  const desiredAgents =
    marker.count === 0
      ? concatBytes([block, agents.bytes])
      : concatBytes([
          agents.bytes.slice(0, marker.start),
          block,
          agents.bytes.slice(marker.stop),
        ]);
  const desiredWorkflow = request.source.workflow.bytes.slice();
  const desiredSnapshot = snapshotBytes(
    request.source.version,
    request.source.revision,
    adoption,
    desiredSkill,
    desiredWorkflow,
    block,
  );
  const desired = [
    {
      path: activationDestinations[0],
      bytes: desiredAgents,
      sourceMode: agents.mode,
    },
    {
      path: activationDestinations[1],
      bytes: desiredSkill,
      sourceMode: request.source.skill.mode,
    },
    {
      path: activationDestinations[2],
      bytes: desiredWorkflow,
      sourceMode: request.source.workflow.mode,
    },
    {
      path: activationDestinations[3],
      bytes: desiredSnapshot,
      sourceMode: 0o644,
    },
  ] as const;
  const payloads = Object.freeze(
    desired.map(({ path, bytes, sourceMode }) => {
      const current = observed.get(path);
      const mode =
        current?.kind === "file" && validMode(current.mode)
          ? current.mode
          : sourceMode;
      return Object.freeze({
        path,
        bytes: bytes.slice(),
        digest: hash(bytes),
        mode,
      });
    }),
  );
  if (
    payloads.every(({ path, bytes }) => {
      const current = observed.get(path);
      return current?.bytes !== undefined && bytesEqual(bytes, current.bytes);
    })
  ) {
    return Object.freeze({
      result: result(
        "pass",
        "ACTIVATION_UNCHANGED",
        0,
        Object.freeze([]),
        planData(
          request.source.version,
          request.source.revision,
          adoption,
          Object.freeze([]),
        ),
      ),
      changes: Object.freeze([]),
      payloads,
    });
  }

  const effects = Object.freeze(
    payloads.map(({ path, digest, mode }) =>
      Object.freeze({
        kind:
          observed.get(path)?.kind === "file"
            ? ("replace" as const)
            : ("install" as const),
        path,
        digest,
        mode,
      }),
    ),
  );
  const preconditions = Object.freeze(request.paths.map(immutablePrecondition));
  const seed = hash(
    JSON.stringify({
      rootIdentity: request.rootIdentity,
      version: request.source.version,
      revision: request.source.revision,
      adoption,
      preconditions,
      effects,
    }),
  );
  const stagePreconditions = Object.freeze(
    effects.map(({ path }) =>
      Object.freeze({ path: stagePath(path, seed), kind: "missing" as const }),
    ),
  );
  const body = Object.freeze({
    planVersion: "1" as const,
    operation: "activation" as const,
    rootIdentity: request.rootIdentity,
    version: request.source.version,
    revision: request.source.revision,
    adoption,
    provenance: request.source.provenance,
    preconditions,
    stagePreconditions,
    effects,
    commitMarker: activationSnapshotPath,
  });
  const plan = Object.freeze({ ...body, planId: planIdentity(body) });
  return Object.freeze({
    result: result(
      "pass",
      "ACTIVATION_PREVIEW",
      0,
      Object.freeze([]),
      planData(
        plan.version,
        plan.revision,
        plan.adoption,
        effects,
        plan.planId,
      ),
    ),
    changes: effects,
    plan,
    payloads,
  });
}

function samePrecondition(
  expected: ActivationPathPrecondition,
  actual: ActivationPathObservation | undefined,
): boolean {
  if (actual === undefined) return false;
  const normalized = immutablePrecondition(actual);
  return JSON.stringify(expected) === JSON.stringify(normalized);
}

export function findActivationPreconditionMismatches(
  plan: ActivationMutationPlan,
  observations: readonly ActivationPathObservation[],
  stages: readonly MutationStageObservation[],
): readonly string[] {
  const paths = observationMap(observations);
  if (paths === undefined)
    return Object.freeze(plan.preconditions.map(({ path }) => path));
  const stageMap = new Map(stages.map((stage) => [stage.path, stage]));
  return Object.freeze([
    ...plan.preconditions
      .filter(
        (expected) => !samePrecondition(expected, paths.get(expected.path)),
      )
      .map(({ path }) => path),
    ...plan.stagePreconditions
      .filter((expected) => stageMap.get(expected.path)?.kind !== "missing")
      .map(({ path }) => path),
  ]);
}

function unique(paths: readonly string[]): boolean {
  return new Set(paths).size === paths.length;
}

function validExecutionObservation(
  plan: ActivationMutationPlan,
  observation: MutationExecutionObservation,
): boolean {
  const effectPaths = plan.effects.map(({ path }) => path);
  const allowedEffects = new Set(effectPaths);
  const allowedEvidence = new Set([
    ...plan.preconditions.map(({ path }) => path),
    ...plan.stagePreconditions.map(({ path }) => path),
  ]);
  const allowedStages = new Set(
    plan.stagePreconditions.map(({ path }) => path),
  );
  const effectLists = [
    observation.prepared,
    observation.attempted,
    observation.applied,
    observation.recoveryAttempted,
    observation.restored,
    observation.unrecovered,
    observation.invalidated,
    observation.invalidationFailed,
  ];
  if (
    observation.planId !== plan.planId ||
    planIdentity(plan) !== plan.planId ||
    effectLists.some(
      (paths) =>
        !unique(paths) || paths.some((path) => !allowedEffects.has(path)),
    ) ||
    !unique(observation.retained) ||
    observation.retained.some((path) => !allowedEvidence.has(path)) ||
    !unique(observation.cleanupResidue) ||
    observation.cleanupResidue.some((path) => !allowedEvidence.has(path)) ||
    !unique(observation.preconditionMismatches) ||
    observation.preconditionMismatches.some(
      (path) => !allowedEvidence.has(path),
    ) ||
    observation.invalidated.some((path) => path !== plan.commitMarker) ||
    observation.invalidationFailed.some((path) => path !== plan.commitMarker) ||
    observation.invalidated.some((path) =>
      observation.invalidationFailed.includes(path),
    ) ||
    observation.attempted.some((path, index) => effectPaths[index] !== path) ||
    observation.applied.some(
      (path, index) => observation.attempted[index] !== path,
    ) ||
    observation.prepared.some((path, index) => effectPaths[index] !== path) ||
    (observation.failure !== undefined &&
      !/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(observation.failure.code)) ||
    (observation.failure?.path !== undefined &&
      !allowedEvidence.has(observation.failure.path))
  )
    return false;
  if (
    observation.committed &&
    (observation.prepared.length !== effectPaths.length ||
      observation.attempted.length !== effectPaths.length ||
      observation.applied.length !== effectPaths.length ||
      observation.prepared.some((path, index) => effectPaths[index] !== path) ||
      observation.attempted.some(
        (path, index) => effectPaths[index] !== path,
      ) ||
      observation.applied.some((path, index) => effectPaths[index] !== path) ||
      observation.recoveryAttempted.length !== 0 ||
      observation.restored.length !== 0 ||
      observation.unrecovered.length !== 0 ||
      observation.invalidated.length !== 0 ||
      observation.invalidationFailed.length !== 0 ||
      observation.retained.length !== 0 ||
      observation.preconditionMismatches.length !== 0 ||
      (observation.failure !== undefined &&
        observation.failure.stage !== "cleanup"))
  )
    return false;
  if (
    observation.committed &&
    observation.cleanupResidue.some((path) => !allowedStages.has(path))
  )
    return false;
  if (
    (observation.preconditionMismatches.length > 0 ||
      observation.failure?.stage === "precondition" ||
      observation.failure?.stage === "prepare") &&
    (observation.attempted.length !== 0 ||
      observation.applied.length !== 0 ||
      observation.recoveryAttempted.length !== 0 ||
      observation.restored.length !== 0 ||
      observation.unrecovered.length !== 0 ||
      observation.invalidated.length !== 0 ||
      observation.invalidationFailed.length !== 0 ||
      observation.retained.length !== 0)
  )
    return false;
  if (observation.failure?.stage === "cleanup" && !observation.committed)
    return false;
  if (
    !observation.committed &&
    (observation.failure?.stage === "apply" ||
      observation.failure?.stage === "recovery")
  ) {
    const reversed = [...observation.attempted].reverse();
    if (
      observation.prepared.length !== effectPaths.length ||
      observation.prepared.some((path, index) => effectPaths[index] !== path) ||
      observation.recoveryAttempted.length !== reversed.length ||
      observation.recoveryAttempted.some(
        (path, index) => reversed[index] !== path,
      ) ||
      observation.restored.some((path) =>
        observation.unrecovered.includes(path),
      ) ||
      new Set([...observation.restored, ...observation.unrecovered]).size !==
        observation.attempted.length ||
      observation.attempted.some(
        (path) =>
          !observation.restored.includes(path) &&
          !observation.unrecovered.includes(path),
      )
    )
      return false;
  }
  if (
    observation.failure?.stage === "apply" &&
    observation.attempted.length === 0
  )
    return false;
  if (
    (observation.unrecovered.length > 0 ||
      observation.invalidationFailed.length > 0) &&
    (observation.retained.length !== plan.stagePreconditions.length ||
      observation.retained.some(
        (path, index) => path !== plan.stagePreconditions[index]?.path,
      ))
  )
    return false;
  if (
    observation.unrecovered.length > 0 &&
    !observation.invalidated.includes(plan.commitMarker) &&
    !observation.invalidationFailed.includes(plan.commitMarker)
  )
    return false;
  if (
    observation.unrecovered.length === 0 &&
    (observation.invalidated.length > 0 ||
      observation.invalidationFailed.length > 0 ||
      observation.retained.length > 0)
  )
    return false;
  return true;
}

function executionData(
  plan: ActivationMutationPlan,
  observation: MutationExecutionObservation,
): Readonly<Record<string, ResultDataValue>> {
  return Object.freeze({
    version: plan.version,
    revision: plan.revision,
    adoption: plan.adoption,
    provenance: plan.provenance,
    planId: plan.planId,
    changes: plan.effects,
    prepared: Object.freeze([...observation.prepared]),
    attempted: Object.freeze([...observation.attempted]),
    applied: Object.freeze([...observation.applied]),
    recoveryAttempted: Object.freeze([...observation.recoveryAttempted]),
    restored: Object.freeze([...observation.restored]),
    unrecovered: Object.freeze([...observation.unrecovered]),
    invalidated: Object.freeze([...observation.invalidated]),
    invalidationFailed: Object.freeze([...observation.invalidationFailed]),
    retained: Object.freeze([...observation.retained]),
    cleanupResidue: Object.freeze([...observation.cleanupResidue]),
    preconditionMismatches: Object.freeze([
      ...observation.preconditionMismatches,
    ]),
  });
}

export function evaluateActivationMutation(
  plan: ActivationMutationPlan,
  observation: MutationExecutionObservation,
): ActivationPlanEvaluation {
  if (!validExecutionObservation(plan, observation)) {
    const problems = Object.freeze([
      issue(
        "ACTIVATION_EXECUTION_OBSERVATION_INVALID",
        "The activation mutation execution observation is inconsistent.",
      ),
    ]);
    return Object.freeze({
      result: result("error", "ERROR", 3, problems),
      changes: plan.effects,
      plan,
    });
  }
  const data = executionData(plan, observation);
  if (
    (observation.preconditionMismatches.length > 0 ||
      observation.failure?.stage === "precondition") &&
    observation.cleanupResidue.length === 0
  ) {
    const code = observation.failure?.code ?? "ACTIVATION_STALE_PLAN";
    const paths =
      observation.preconditionMismatches.length > 0
        ? observation.preconditionMismatches
        : [observation.failure?.path].filter(
            (path): path is string => path !== undefined,
          );
    const problems = Object.freeze(
      (paths.length === 0 ? [undefined] : paths).map((path) =>
        issue(
          code,
          code === "ACTIVATION_STAGE_COLLISION"
            ? "A private activation staging path already exists."
            : code === "ACTIVATION_PAYLOAD_INVALID"
              ? "A packaged activation payload does not match the plan."
              : "The activation plan became stale before application.",
          path,
        ),
      ),
    );
    return Object.freeze({
      result: result("fail", "ACTIVATION_OPERATION_REFUSED", 1, problems, data),
      changes: plan.effects,
      plan,
    });
  }
  if (
    observation.unrecovered.length > 0 ||
    observation.invalidationFailed.length > 0 ||
    observation.failure?.stage === "recovery"
  ) {
    const paths = [
      ...observation.unrecovered,
      ...observation.invalidationFailed.filter(
        (path) => !observation.unrecovered.includes(path),
      ),
    ];
    const problems = Object.freeze(
      (paths.length === 0 ? [observation.failure?.path] : paths).map((path) =>
        issue(
          "ACTIVATION_RECOVERY_INCOMPLETE",
          "An activation destination or recovery artifact requires manual recovery.",
          path,
        ),
      ),
    );
    return Object.freeze({
      result: result(
        "fail",
        "ACTIVATION_RECOVERY_INCOMPLETE",
        1,
        problems,
        data,
      ),
      changes: plan.effects,
      plan,
    });
  }
  if (observation.cleanupResidue.length > 0) {
    const problems = Object.freeze(
      observation.cleanupResidue.map((path) =>
        issue(
          "ACTIVATION_CLEANUP_INCOMPLETE",
          "Private activation staging cleanup is incomplete.",
          path,
        ),
      ),
    );
    return Object.freeze({
      result: result(
        "fail",
        "ACTIVATION_CLEANUP_INCOMPLETE",
        1,
        problems,
        data,
      ),
      changes: plan.effects,
      plan,
    });
  }
  if (!observation.committed && observation.failure !== undefined) {
    const problems = Object.freeze([
      issue(
        "ACTIVATION_APPLY_FAILED_RECOVERED",
        "Activation failed and the prior target state was restored.",
        observation.failure.path,
      ),
    ]);
    return Object.freeze({
      result: result(
        "fail",
        "ACTIVATION_APPLY_FAILED_RECOVERED",
        1,
        problems,
        data,
      ),
      changes: plan.effects,
      plan,
    });
  }
  if (observation.committed) {
    return Object.freeze({
      result: result("pass", "ACTIVATION_APPLIED", 0, Object.freeze([]), data),
      changes: plan.effects,
      plan,
    });
  }
  const problems = Object.freeze([
    issue(
      "ACTIVATION_EXECUTION_OBSERVATION_INVALID",
      "The activation mutation execution observation has no final state.",
    ),
  ]);
  return Object.freeze({
    result: result("error", "ERROR", 3, problems),
    changes: plan.effects,
    plan,
  });
}

export function evaluateActivationScratchCleanup(
  evaluation: ActivationPlanEvaluation,
  observation: ActivationScratchCleanupObservation,
): ActivationPlanEvaluation {
  const prepared = observation.prepared ?? true;
  const valid = observation.cleaned
    ? observation.retained.length === 0
    : observation.retained.length > 0 &&
      unique(observation.retained) &&
      observation.retained.every((path) =>
        /^scratch\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(path),
      );
  if (!valid) {
    const problems = Object.freeze([
      issue(
        "ACTIVATION_SCRATCH_OBSERVATION_INVALID",
        "The activation scratch cleanup observation is inconsistent.",
      ),
    ]);
    return Object.freeze({
      result: result("error", "ERROR", 3, problems),
      changes: evaluation.changes,
      ...(evaluation.plan === undefined ? {} : { plan: evaluation.plan }),
      ...(evaluation.payloads === undefined
        ? {}
        : { payloads: evaluation.payloads }),
    });
  }
  if (!prepared && observation.cleaned) {
    const problems = Object.freeze([
      issue(
        "ACTIVATION_SCRATCH_UNAVAILABLE",
        "Private activation scratch could not be prepared.",
      ),
    ]);
    return Object.freeze({
      result: result(
        "fail",
        "ACTIVATION_OPERATION_REFUSED",
        1,
        problems,
        evaluation.result.data,
      ),
      changes: evaluation.changes,
      ...(evaluation.plan === undefined ? {} : { plan: evaluation.plan }),
      ...(evaluation.payloads === undefined
        ? {}
        : { payloads: evaluation.payloads }),
    });
  }
  if (observation.cleaned) return evaluation;
  const baseData: Readonly<Record<string, ResultDataValue>> =
    evaluation.result.data ?? Object.freeze({});
  const problems = Object.freeze(
    observation.retained.map((path) =>
      issue(
        "ACTIVATION_CLEANUP_INCOMPLETE",
        "Private activation scratch cleanup is incomplete.",
        path,
      ),
    ),
  );
  const existing = Array.isArray(baseData.cleanupResidue)
    ? baseData.cleanupResidue
    : Object.freeze([]);
  const cleanupResidue = Object.freeze([...existing, ...observation.retained]);
  const issues = Object.freeze([...evaluation.result.issues, ...problems]);
  if (evaluation.result.outcome === "ACTIVATION_RECOVERY_INCOMPLETE") {
    return Object.freeze({
      result: result(
        "fail",
        "ACTIVATION_RECOVERY_INCOMPLETE",
        1,
        issues,
        Object.freeze({
          ...baseData,
          cleanupResidue,
        }),
      ),
      changes: evaluation.changes,
      ...(evaluation.plan === undefined ? {} : { plan: evaluation.plan }),
      ...(evaluation.payloads === undefined
        ? {}
        : { payloads: evaluation.payloads }),
    });
  }
  return Object.freeze({
    result: result(
      "fail",
      "ACTIVATION_CLEANUP_INCOMPLETE",
      1,
      issues,
      Object.freeze({
        ...baseData,
        cleanupResidue,
      }),
    ),
    changes: evaluation.changes,
    ...(evaluation.plan === undefined ? {} : { plan: evaluation.plan }),
    ...(evaluation.payloads === undefined
      ? {}
      : { payloads: evaluation.payloads }),
  });
}
