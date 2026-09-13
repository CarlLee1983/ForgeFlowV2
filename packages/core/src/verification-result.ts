import {
  readContentLines,
  readExactLiteral,
  readSectionBullets,
  splitDeclaration,
} from "./declarations.js";
import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  type ResultEnvelope,
  type ResultIssue,
} from "./result.js";
import {
  resolveVerificationPlan,
  type VerificationAuthorityOperation,
  type VerificationLayer,
  type VerificationPlan,
} from "./verification.js";

/** How one recorded verification layer was observed. */
export type VerificationCheckStatus =
  "pass" | "fail" | "skipped" | "blocked" | "unsupported";

/** How one acceptance criterion was observed. */
export type VerificationEvidenceStatus =
  "pass" | "fail" | "blocked" | "skipped";

/** The status a completely read record resolves to. */
export type VerificationRecordStatus = "pass" | "partial" | "fail";

/**
 * What a diagnostic says about the record: `defect` means the record itself is
 * unusable, `conflict` means it records an operation the Story never granted,
 * and `unproven` means a required observation is simply absent.
 */
export type VerificationDiagnosticKind = "defect" | "conflict" | "unproven";

export interface VerificationDiagnostic {
  readonly kind: VerificationDiagnosticKind;
  readonly issue: ResultIssue;
}

export interface VerificationRecordedCheck {
  readonly layer: VerificationLayer;
  readonly status: VerificationCheckStatus;
}

/** The facts one record declares. They are observations, never approvals. */
export interface VerificationRecord {
  readonly checks: readonly VerificationRecordedCheck[];
  readonly evidenceTraced: number;
  readonly acceptanceCount: number;
  readonly authorityUsed: readonly VerificationAuthorityOperation[];
  readonly residualRisks: number;
}

/** A pure recorded-result evaluation over one Story's declared sources. */
export interface VerificationResultEvaluation {
  readonly result: ResultEnvelope;
  readonly plan: VerificationPlan;
  readonly planIssues: readonly ResultIssue[];
  readonly diagnostics: readonly VerificationDiagnostic[];
  /** Whether the record itself is unusable or incompletely declared. */
  readonly incomplete: boolean;
  /** Absent when a defect stopped the evaluation before a status was decided. */
  readonly status?: VerificationRecordStatus;
  /** Absent for the same reason as `status`. */
  readonly record?: VerificationRecord;
}

export interface VerificationResultSources {
  /** `story.md` source text. */
  readonly story: unknown;
  /** `acceptance.md` source text. */
  readonly acceptance: unknown;
  /** `verification.md` source text, or a non-string when it is unusable. */
  readonly record: unknown;
}

const checkLayers: readonly VerificationLayer[] = [
  "lint",
  "static",
  "unit",
  "integration",
  "contract",
  "e2e",
  "architecture",
];
const checkStatuses: readonly VerificationCheckStatus[] = [
  "pass",
  "fail",
  "skipped",
  "blocked",
  "unsupported",
];
const evidenceStatuses: readonly VerificationEvidenceStatus[] = [
  "pass",
  "fail",
  "blocked",
  "skipped",
];
const authorityOperations: readonly VerificationAuthorityOperation[] = [
  "plan",
  "modify",
  "add_dependency",
  "migration",
  "commit",
  "push",
  "deploy",
];
const detailSeparator = " — ";

function diagnostic(
  kind: VerificationDiagnosticKind,
  code: string,
  message: string,
): VerificationDiagnostic {
  return Object.freeze({ kind, issue: Object.freeze({ code, message }) });
}

function isCheckLayer(value: string): value is VerificationLayer {
  return (checkLayers as readonly string[]).includes(value);
}

function isCheckStatus(value: string): value is VerificationCheckStatus {
  return (checkStatuses as readonly string[]).includes(value);
}

function isEvidenceStatus(value: string): value is VerificationEvidenceStatus {
  return (evidenceStatuses as readonly string[]).includes(value);
}

function isAuthorityOperation(
  value: string,
): value is VerificationAuthorityOperation {
  return (authorityOperations as readonly string[]).includes(value);
}

/** Splits `<status> — <detail>` on its first separator. */
function splitObservation(value: string): {
  readonly status: string;
  readonly detail: string;
} {
  const separator = value.indexOf(detailSeparator);

  return separator < 0
    ? { status: value.trim(), detail: "" }
    : {
        status: value.slice(0, separator).trim(),
        detail: value.slice(separator + detailSeparator.length),
      };
}

/** Reads the checkbox acceptance-criterion IDs, in first-declaration order. */
function readAcceptanceIds(source: string): readonly string[] {
  const ids: string[] = [];

  for (const line of readContentLines(source)) {
    if (!line.startsWith("* ") && !line.startsWith("- ")) continue;
    const box = line.slice(2);
    if (!/^\[[ xX]\] /.test(box)) continue;

    const text = box.slice(4);
    const separator = text.indexOf(":");
    if (separator < 0) continue;

    const id = text.slice(0, separator);
    if (!/^AC-\d+$/.test(id) || ids.includes(id)) continue;

    ids.push(id);
  }

  return ids;
}

function readChecks(
  source: string,
  diagnostics: VerificationDiagnostic[],
): {
  readonly checks: VerificationRecordedCheck[];
  readonly declared: number;
  readonly failed: boolean;
} {
  const section = readSectionBullets(source, "## Checks");
  const checks: VerificationRecordedCheck[] = [];
  const seen = new Set<string>();
  let failed = false;

  for (const bullet of section.bullets) {
    const entry = splitDeclaration(bullet);
    if (entry.kind !== "declaration") {
      diagnostics.push(
        diagnostic(
          "defect",
          "VERIFICATION_CHECK_ENTRY_INVALID",
          `check entry is not a declaration: ${bullet}`,
        ),
      );
      continue;
    }
    if (!isCheckLayer(entry.label)) {
      diagnostics.push(
        diagnostic(
          "defect",
          "VERIFICATION_CHECK_UNKNOWN",
          `unknown verification check: ${entry.label}`,
        ),
      );
      continue;
    }
    if (seen.has(entry.label)) {
      diagnostics.push(
        diagnostic(
          "defect",
          "VERIFICATION_CHECK_REPEATED",
          `verification check is recorded more than once: ${entry.label}`,
        ),
      );
      continue;
    }
    seen.add(entry.label);

    const observation = splitObservation(entry.value);
    if (!isCheckStatus(observation.status)) {
      diagnostics.push(
        diagnostic(
          "defect",
          "VERIFICATION_CHECK_STATUS_INVALID",
          `check ${entry.label} status must be pass, fail, skipped, blocked, or unsupported`,
        ),
      );
      continue;
    }
    if (readExactLiteral(observation.detail) === undefined)
      diagnostics.push(
        diagnostic(
          "defect",
          "VERIFICATION_CHECK_DETAIL_INVALID",
          `check ${entry.label} must name one exact backticked command or reason`,
        ),
      );

    checks.push(
      Object.freeze({ layer: entry.label, status: observation.status }),
    );
    if (observation.status === "fail") failed = true;
  }

  return { checks, declared: section.count, failed };
}

function readEvidence(
  source: string,
  acceptanceIds: readonly string[],
  diagnostics: VerificationDiagnostic[],
): {
  readonly traced: number;
  readonly passed: Set<string>;
  readonly declared: number;
  readonly failed: boolean;
} {
  const section = readSectionBullets(source, "## Evidence");
  const passed = new Set<string>();
  const seen = new Set<string>();
  let traced = 0;
  let failed = false;

  for (const bullet of section.bullets) {
    const entry = splitDeclaration(bullet);
    if (entry.kind !== "declaration") {
      diagnostics.push(
        diagnostic(
          "defect",
          "VERIFICATION_EVIDENCE_ENTRY_INVALID",
          `evidence entry is not a declaration: ${bullet}`,
        ),
      );
      continue;
    }

    const acceptanceId = readExactLiteral(entry.label);
    if (acceptanceId === undefined) {
      diagnostics.push(
        diagnostic(
          "defect",
          "VERIFICATION_EVIDENCE_AC_INVALID",
          `evidence entry must name one exact backticked AC ID: ${entry.label}`,
        ),
      );
      continue;
    }
    if (!acceptanceIds.includes(acceptanceId)) {
      diagnostics.push(
        diagnostic(
          "defect",
          "VERIFICATION_EVIDENCE_AC_UNKNOWN",
          `evidence names unknown AC ID: ${acceptanceId}`,
        ),
      );
      continue;
    }
    if (seen.has(acceptanceId)) {
      diagnostics.push(
        diagnostic(
          "defect",
          "VERIFICATION_EVIDENCE_AC_REPEATED",
          `evidence duplicates AC ID: ${acceptanceId}`,
        ),
      );
      continue;
    }
    seen.add(acceptanceId);
    traced += 1;

    const observation = splitObservation(entry.value);
    if (!isEvidenceStatus(observation.status)) {
      diagnostics.push(
        diagnostic(
          "defect",
          "VERIFICATION_EVIDENCE_STATUS_INVALID",
          `evidence ${acceptanceId} status must be pass, fail, blocked, or skipped`,
        ),
      );
      continue;
    }
    if (readExactLiteral(observation.detail) === undefined)
      diagnostics.push(
        diagnostic(
          "defect",
          "VERIFICATION_EVIDENCE_DETAIL_INVALID",
          `evidence ${acceptanceId} must name one exact backticked observation`,
        ),
      );

    if (observation.status === "pass") passed.add(acceptanceId);
    if (observation.status === "fail") failed = true;
  }

  return { traced, passed, declared: section.count, failed };
}

function readAuthorityUsed(
  source: string,
  plan: VerificationPlan,
  diagnostics: VerificationDiagnostic[],
): {
  readonly used: VerificationAuthorityOperation[];
  readonly failed: boolean;
} {
  const used: VerificationAuthorityOperation[] = [];
  let failed = false;

  for (const bullet of readSectionBullets(source, "## Authority Used")
    .bullets) {
    if (!isAuthorityOperation(bullet)) {
      diagnostics.push(
        diagnostic(
          "defect",
          "VERIFICATION_AUTHORITY_USED_UNKNOWN",
          `authority used names an unknown operation: ${bullet}`,
        ),
      );
      continue;
    }

    used.push(bullet);
    if (!plan.authority[bullet]) {
      diagnostics.push(
        diagnostic(
          "conflict",
          "VERIFICATION_AUTHORITY_CONFLICT",
          `authority conflict: ${bullet} was used but the Story does not grant it`,
        ),
      );
      failed = true;
    }
  }

  return { used, failed };
}

function readResidualRisks(
  source: string,
  diagnostics: VerificationDiagnostic[],
): number {
  let residualRisks = 0;

  for (const bullet of readSectionBullets(source, "## Residual Risks")
    .bullets) {
    residualRisks += 1;
    if (readExactLiteral(bullet) === undefined)
      diagnostics.push(
        diagnostic(
          "defect",
          "VERIFICATION_RESIDUAL_RISK_INVALID",
          "every residual risk must be one exact backticked statement",
        ),
      );
  }

  return residualRisks;
}

function envelope(
  planIssues: readonly ResultIssue[],
  diagnostics: readonly VerificationDiagnostic[],
  negative: boolean,
): ResultEnvelope {
  const issues = [
    ...planIssues,
    ...diagnostics.map((entry) => entry.issue),
  ] as const;
  const failing = negative || issues.length > 0;

  return Object.freeze({
    schemaVersion: RESULT_SCHEMA_VERSION,
    protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
    status: failing ? "fail" : "pass",
    outcome: failing ? "failure" : "success",
    exit: failing ? 1 : 0,
    subject: "verification",
    issues: Object.freeze([...issues]),
  } as const);
}

function stopped(
  plan: VerificationPlan,
  planIssues: readonly ResultIssue[],
  diagnostics: readonly VerificationDiagnostic[],
): VerificationResultEvaluation {
  return Object.freeze({
    result: envelope(planIssues, diagnostics, true),
    plan,
    planIssues,
    diagnostics: Object.freeze([...diagnostics]),
    incomplete: true,
  });
}

/**
 * Evaluates one Story's recorded verification result against the execution
 * contract the Story declares. It performs no I/O, never executes or re-runs a
 * recorded command, and never throws for runtime input. A declared fact is
 * reported as an observation; it is never read as human approval, completion,
 * or current lifecycle state.
 */
export function evaluateVerificationResult(
  sources: VerificationResultSources,
): VerificationResultEvaluation {
  const resolved = resolveVerificationPlan(sources.story);
  const { plan } = resolved;
  const planIssues = resolved.result.issues;
  const diagnostics: VerificationDiagnostic[] = [];

  // An empty record is as unusable as an absent one. A blank but non-empty
  // record is readable, and reports its missing sections instead.
  if (typeof sources.record !== "string" || sources.record === "")
    return stopped(plan, planIssues, [
      diagnostic(
        "defect",
        "VERIFICATION_RECORD_UNAVAILABLE",
        "verification.md is missing, unreadable, or empty",
      ),
    ]);

  const acceptanceIds =
    typeof sources.acceptance === "string"
      ? readAcceptanceIds(sources.acceptance)
      : [];
  const source = sources.record;
  const checks = readChecks(source, diagnostics);
  const evidence = readEvidence(source, acceptanceIds, diagnostics);
  const authority = readAuthorityUsed(source, plan, diagnostics);
  const residualRisks = readResidualRisks(source, diagnostics);

  if (checks.declared !== 1)
    return stopped(plan, planIssues, [
      ...diagnostics,
      diagnostic(
        "defect",
        "VERIFICATION_CHECKS_SECTION_INVALID",
        "verification.md must declare ## Checks exactly once",
      ),
    ]);
  if (evidence.declared !== 1)
    return stopped(plan, planIssues, [
      ...diagnostics,
      diagnostic(
        "defect",
        "VERIFICATION_EVIDENCE_SECTION_INVALID",
        "verification.md must declare ## Evidence exactly once",
      ),
    ]);
  if (acceptanceIds.length === 0)
    return stopped(plan, planIssues, [
      ...diagnostics,
      diagnostic(
        "defect",
        "VERIFICATION_ACCEPTANCE_MISSING",
        "acceptance.md declares no checkbox AC to trace evidence to",
      ),
    ]);

  // A recorded result is complete only when every required layer and every
  // acceptance criterion is accounted for. Silence is never PASS.
  const recorded = new Map(checks.checks.map((check) => [check.layer, check]));
  let unproven = 0;

  for (const layer of plan.requiredChecks) {
    const check = recorded.get(layer);
    if (check?.status === "pass") continue;

    diagnostics.push(
      check === undefined
        ? diagnostic(
            "unproven",
            "VERIFICATION_REQUIRED_CHECK_NOT_RECORDED",
            `required check is not recorded: ${layer}`,
          )
        : diagnostic(
            "unproven",
            "VERIFICATION_REQUIRED_CHECK_NOT_PASSED",
            `required check did not pass: ${layer}`,
          ),
    );
    unproven += 1;
  }

  for (const acceptanceId of acceptanceIds) {
    if (evidence.passed.has(acceptanceId)) continue;

    diagnostics.push(
      diagnostic(
        "unproven",
        "VERIFICATION_ACCEPTANCE_UNPROVEN",
        `acceptance criterion has no passing evidence: ${acceptanceId}`,
      ),
    );
    unproven += 1;
  }

  const record: VerificationRecord = Object.freeze({
    checks: Object.freeze([...checks.checks]),
    evidenceTraced: evidence.traced,
    acceptanceCount: acceptanceIds.length,
    authorityUsed: Object.freeze([...authority.used]),
    residualRisks,
  });
  const failed = checks.failed || evidence.failed || authority.failed;

  if (!failed && unproven > 0 && residualRisks === 0)
    diagnostics.push(
      diagnostic(
        "defect",
        "VERIFICATION_RESIDUAL_RISK_REQUIRED",
        "incomplete verification must record at least one residual risk",
      ),
    );

  const status: VerificationRecordStatus = failed
    ? "fail"
    : unproven > 0
      ? "partial"
      : "pass";

  return Object.freeze({
    result: envelope(planIssues, diagnostics, status !== "pass"),
    plan,
    planIssues,
    diagnostics: Object.freeze([...diagnostics]),
    incomplete: diagnostics.some((entry) => entry.kind === "defect"),
    status,
    record,
  });
}
