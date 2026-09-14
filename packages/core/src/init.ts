import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  type ResultDataValue,
  type ResultEnvelope,
  type ResultIssue,
} from "./result.js";

export type InitMode = "safe" | "force" | "upgrade";
export type InitPathKind =
  "missing" | "file" | "directory" | "symlink" | "other" | "unconfirmable";
export type InitChangeKind = "install" | "replace";

export interface InitPathObservation {
  readonly path: string;
  readonly kind: InitPathKind;
  readonly readable?: boolean;
  readonly searchable?: boolean;
}

export interface InitSnapshotPayload {
  readonly path: string;
  readonly digest: string;
}

export interface InitSnapshot {
  readonly protocolVersion: string;
  readonly provenance: string;
  readonly payloads: readonly InitSnapshotPayload[];
}

export interface InitPlanRequest {
  readonly mode: InitMode;
  readonly snapshot: InitSnapshot;
  readonly paths: readonly InitPathObservation[];
}

export interface InitPlannedChange {
  readonly [key: string]: ResultDataValue;
  readonly kind: InitChangeKind;
  readonly path: string;
  readonly digest: string;
}

export interface InitPlanEvaluation {
  readonly result: ResultEnvelope;
  readonly changes: readonly InitPlannedChange[];
}

const freshDirectories = [
  "specs",
  "specs/stories",
  "specs/stories/_template",
  "guidance",
] as const;
const upgradeDirectories = [
  "specs",
  "specs/stories",
  "specs/stories/_template",
] as const;
const freshPayloadPaths = [
  "AGENTS.md",
  "specs/stories/_template/story.md",
  "specs/stories/_template/acceptance.md",
  "specs/stories/_template/task.md",
  "guidance/ENTRY.md",
  "guidance/PRINCIPLES.md",
  "guidance/DECISIONS.md",
  "guidance/PRACTICES.md",
] as const;
const upgradePayloadPaths = [
  "specs/stories/_template/story.md",
  "specs/stories/_template/acceptance.md",
  "specs/stories/_template/task.md",
] as const;
export const adoptionMarkerPath = "specs/.forgeflow-adoption";
const sha256 = /^[a-f0-9]{64}$/;

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
    "INIT_PREVIEW" | "INIT_CONFLICT" | "INIT_OPERATION_REFUSED" | "ERROR",
  exit: 0 | 1 | 2,
  issues: readonly ResultIssue[],
  data?: Readonly<Record<string, ResultDataValue>>,
): ResultEnvelope {
  return Object.freeze({
    schemaVersion: RESULT_SCHEMA_VERSION,
    protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
    status,
    outcome,
    exit,
    subject: "init",
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

function sourceError(message: string): InitPlanEvaluation {
  const problems = Object.freeze([issue("INIT_SNAPSHOT_INVALID", message)]);
  return Object.freeze({
    result: result("fail", "INIT_OPERATION_REFUSED", 1, problems),
    changes: Object.freeze([]),
  });
}

function validSnapshot(snapshot: InitSnapshot): string | undefined {
  if (snapshot.protocolVersion !== IMPLEMENTED_PROTOCOL_VERSION)
    return "The bundled Protocol snapshot version is unsupported.";
  if (snapshot.provenance.length === 0)
    return "The bundled Protocol snapshot has no provenance.";
  if (snapshot.payloads.length !== freshPayloadPaths.length)
    return "The bundled Protocol snapshot has an unexpected managed payload set.";
  const expected = new Set<string>(freshPayloadPaths);
  const seen = new Set<string>();
  for (const payload of snapshot.payloads) {
    if (
      !expected.has(payload.path) ||
      seen.has(payload.path) ||
      !sha256.test(payload.digest)
    )
      return "The bundled Protocol snapshot has an invalid managed payload.";
    seen.add(payload.path);
  }
  return undefined;
}

function observationMap(
  observations: readonly InitPathObservation[],
): Map<string, InitPathObservation> | undefined {
  const paths = new Map<string, InitPathObservation>();
  for (const observation of observations) {
    if (paths.has(observation.path)) return undefined;
    paths.set(observation.path, observation);
  }
  return paths;
}

function refused(
  observed: Map<string, InitPathObservation>,
  directories: readonly string[],
  destinations: readonly string[],
): InitPlanEvaluation | undefined {
  for (const path of directories) {
    const entry = observed.get(path);
    if (
      entry === undefined ||
      entry.kind === "symlink" ||
      entry.kind === "other" ||
      entry.kind === "unconfirmable" ||
      (entry.kind === "directory" &&
        (entry.readable !== true || entry.searchable !== true))
    ) {
      const problems = Object.freeze([
        issue(
          "INIT_UNSAFE_MANAGED_DIRECTORY",
          "A managed directory cannot be safely inspected.",
          path,
        ),
      ]);
      return Object.freeze({
        result: result("fail", "INIT_OPERATION_REFUSED", 1, problems),
        changes: Object.freeze([]),
      });
    }
  }
  for (const path of destinations) {
    const entry = observed.get(path);
    if (
      entry === undefined ||
      entry.kind === "symlink" ||
      entry.kind === "directory" ||
      entry.kind === "other" ||
      entry.kind === "unconfirmable" ||
      (entry.kind === "file" && entry.readable !== true)
    ) {
      const problems = Object.freeze([
        issue(
          "INIT_UNSAFE_MANAGED_PATH",
          "A managed destination cannot be safely inspected.",
          path,
        ),
      ]);
      return Object.freeze({
        result: result("fail", "INIT_OPERATION_REFUSED", 1, problems),
        changes: Object.freeze([]),
      });
    }
  }
  return undefined;
}

function activePaths(mode: InitMode): {
  readonly directories: readonly string[];
  readonly payloads: readonly string[];
  readonly destinations: readonly string[];
} {
  const payloads = mode === "upgrade" ? upgradePayloadPaths : freshPayloadPaths;
  return Object.freeze({
    directories: mode === "upgrade" ? upgradeDirectories : freshDirectories,
    payloads,
    destinations: [...payloads, adoptionMarkerPath],
  });
}

/**
 * Produces an init preview from captured facts only. This boundary never reads
 * a repository, calculates a clock value, or changes the supplied snapshot.
 */
export function planMutation(request: InitPlanRequest): InitPlanEvaluation {
  const invalidSource = validSnapshot(request.snapshot);
  if (invalidSource !== undefined) return sourceError(invalidSource);

  const observed = observationMap(request.paths);
  if (observed === undefined) {
    const problems = Object.freeze([
      issue(
        "INIT_INVALID_SNAPSHOT",
        "Managed path observations are not unique.",
      ),
    ]);
    return Object.freeze({
      result: result("error", "ERROR", 2, problems),
      changes: Object.freeze([]),
    });
  }
  const active = activePaths(request.mode);
  const unsafe = refused(observed, active.directories, active.destinations);
  if (unsafe !== undefined) return unsafe;

  if (request.mode === "upgrade") {
    const stories = observed.get("specs/stories");
    if (stories?.kind !== "directory") {
      const problems = Object.freeze([
        issue(
          "INIT_UPGRADE_UNAVAILABLE",
          "No ForgeFlow adoption is available to upgrade.",
          "specs/stories",
        ),
      ]);
      return Object.freeze({
        result: result("fail", "INIT_CONFLICT", 1, problems),
        changes: Object.freeze([]),
      });
    }
  } else if (request.mode === "safe") {
    const conflict = active.destinations.find(
      (path) => observed.get(path)?.kind === "file",
    );
    if (conflict !== undefined) {
      const problems = Object.freeze([
        issue(
          "INIT_MANAGED_CONFLICT",
          "A managed destination already exists.",
          conflict,
        ),
      ]);
      return Object.freeze({
        result: result("fail", "INIT_CONFLICT", 1, problems),
        changes: Object.freeze([]),
      });
    }
  }

  const digests = new Map(
    request.snapshot.payloads.map((payload) => [payload.path, payload.digest]),
  );
  const changes = Object.freeze(
    active.destinations.map((path) => {
      const present = observed.get(path)?.kind === "file";
      return Object.freeze({
        kind: present ? "replace" : "install",
        path,
        digest:
          path === adoptionMarkerPath
            ? "generated"
            : (digests.get(path) as string),
      });
    }),
  );
  const provenance = request.snapshot.provenance;
  return Object.freeze({
    result: result("pass", "INIT_PREVIEW", 0, Object.freeze([]), {
      mode: request.mode,
      protocolVersion: request.snapshot.protocolVersion,
      provenance,
      changes,
    }),
    changes,
  });
}
