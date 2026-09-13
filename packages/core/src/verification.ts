import {
  readDeclarationSection,
  readExactLiteral,
  type Declaration,
} from "./declarations.js";
import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  type ResultEnvelope,
  type ResultIssue,
} from "./result.js";

export type VerificationTaskMode =
  "architecture" | "execution" | "evidence" | "mixed";

export type VerificationLevel = "low" | "medium" | "high";

export type VerificationLayer =
  | "lint"
  | "static"
  | "unit"
  | "integration"
  | "contract"
  | "e2e"
  | "architecture";

export type VerificationAuthorityOperation =
  | "plan"
  | "modify"
  | "add_dependency"
  | "migration"
  | "commit"
  | "push"
  | "deploy";

export type VerificationAuthority = Readonly<
  Record<VerificationAuthorityOperation, boolean>
>;

/** The execution contract a Story resolves to, after documented defaults. */
export interface VerificationPlan {
  readonly taskMode: VerificationTaskMode;
  readonly authority: VerificationAuthority;
  readonly riskLevel: VerificationLevel;
  readonly architectureImpact: VerificationLevel;
  readonly requiredChecks: readonly VerificationLayer[];
}

/** A pure verification plan resolution. The plan is always resolved. */
export interface VerificationPlanEvaluation {
  readonly result: ResultEnvelope;
  readonly plan: VerificationPlan;
}

const taskModes: readonly VerificationTaskMode[] = [
  "architecture",
  "execution",
  "evidence",
  "mixed",
];
const levels: readonly VerificationLevel[] = ["low", "medium", "high"];
const authorityOperations: readonly VerificationAuthorityOperation[] = [
  "plan",
  "modify",
  "add_dependency",
  "migration",
  "commit",
  "push",
  "deploy",
];
const riskSignals: readonly string[] = [
  "error-projection",
  "concurrency",
  "bounded-capacity",
  "retention-overflow",
];
const profiles: Readonly<
  Record<VerificationLevel, readonly VerificationLayer[]>
> = Object.freeze({
  low: Object.freeze<VerificationLayer[]>(["lint", "static", "unit"]),
  medium: Object.freeze<VerificationLayer[]>([
    "lint",
    "static",
    "unit",
    "integration",
  ]),
  high: Object.freeze<VerificationLayer[]>([
    "lint",
    "static",
    "unit",
    "integration",
    "contract",
    "e2e",
  ]),
});

const architectureLiterals: ReadonlyMap<string, string> = new Map([
  [
    "Decision",
    "architecture decision must name one exact backticked decision ID",
  ],
  ["Boundary", "architecture boundary must name one exact backticked boundary"],
  [
    "Contract",
    "architecture contract must state one exact backticked contract",
  ],
  [
    "Owner",
    "architecture owner must state one exact backticked `<boundary> = <owner>`",
  ],
]);

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

function isTaskMode(value: string): value is VerificationTaskMode {
  return (taskModes as readonly string[]).includes(value);
}

function isLevel(value: string): value is VerificationLevel {
  return (levels as readonly string[]).includes(value);
}

function isAuthorityOperation(
  value: string,
): value is VerificationAuthorityOperation {
  return (authorityOperations as readonly string[]).includes(value);
}

function readSection(
  source: string,
  heading: string,
  issues: ResultIssue[],
  read: (declaration: Declaration) => void,
): void {
  const section = readDeclarationSection(source, heading);
  for (const entry of section.entries) read(entry);
  if (section.count > 1)
    issues.push(
      issue(
        "VERIFICATION_SECTION_REPEATED",
        `Story must declare ${heading} at most once`,
      ),
    );
}

function readTaskMode(
  source: string,
  issues: ResultIssue[],
): VerificationTaskMode {
  const declared: string[] = [];
  for (const entry of readDeclarationSection(source, "## Classification")
    .entries) {
    if (entry.kind === "declaration" && entry.label === "Task mode")
      declared.push(entry.value);
  }

  if (declared.length > 1) {
    issues.push(
      issue(
        "VERIFICATION_TASK_MODE_REPEATED",
        'Classification must declare "Task mode" at most once',
      ),
    );
    return "execution";
  }

  const value = declared[0] ?? "execution";
  if (isTaskMode(value)) return value;

  issues.push(
    issue(
      "VERIFICATION_TASK_MODE_INVALID",
      "Task mode must be architecture, execution, evidence, or mixed",
    ),
  );
  return "execution";
}

function readAuthority(
  source: string,
  taskMode: VerificationTaskMode,
  issues: ResultIssue[],
): VerificationAuthority {
  // Least privilege by task mode. A Story that declares no authority keeps the
  // historical implementation permission, because entering implementation is
  // what an approved execution Story already authorized. It never inherits
  // commit, push, deploy, dependency, or migration authority.
  const authority: Record<VerificationAuthorityOperation, boolean> = {
    plan: true,
    modify: taskMode === "execution" || taskMode === "mixed",
    add_dependency: false,
    migration: false,
    commit: false,
    push: false,
    deploy: false,
  };
  const seen = new Set<string>();

  readSection(source, "## Authority", issues, (entry) => {
    if (entry.kind !== "declaration") {
      issues.push(
        issue(
          "VERIFICATION_AUTHORITY_ENTRY_INVALID",
          `authority entry is not a declaration: ${entry.text}`,
        ),
      );
      return;
    }
    if (!isAuthorityOperation(entry.label)) {
      issues.push(
        issue(
          "VERIFICATION_AUTHORITY_UNKNOWN_OPERATION",
          `authority declares an unknown operation: ${entry.label}`,
        ),
      );
      return;
    }
    if (seen.has(entry.label)) {
      issues.push(
        issue(
          "VERIFICATION_AUTHORITY_REPEATED",
          `authority declares ${entry.label} more than once`,
        ),
      );
      return;
    }
    seen.add(entry.label);
    if (entry.value !== "yes" && entry.value !== "no") {
      issues.push(
        issue(
          "VERIFICATION_AUTHORITY_VALUE_INVALID",
          `authority ${entry.label} must be declared as yes or no`,
        ),
      );
      return;
    }
    authority[entry.label] = entry.value === "yes";
  });

  return Object.freeze(authority);
}

function readArchitectureImpact(
  source: string,
  issues: ResultIssue[],
): VerificationLevel {
  const declared: string[] = [];

  // This resolver validates the shape of each declaration and nothing more.
  // Resolving a decision to a record, and an owner to a declared boundary, is
  // the Story contract's job; ADR-003 records that ForgeFlow analyses no
  // further than this.
  readSection(source, "## Architecture", issues, (entry) => {
    if (entry.kind !== "declaration") {
      issues.push(
        issue(
          "VERIFICATION_ARCHITECTURE_ENTRY_INVALID",
          `architecture entry is not a declaration: ${entry.text}`,
        ),
      );
      return;
    }
    if (entry.label === "Impact") {
      declared.push(entry.value);
      return;
    }
    const literalMessage = architectureLiterals.get(entry.label);
    if (literalMessage === undefined) {
      issues.push(
        issue(
          "VERIFICATION_ARCHITECTURE_UNKNOWN_LABEL",
          `architecture declares an unknown label: ${entry.label}`,
        ),
      );
      return;
    }
    if (readExactLiteral(entry.value) === undefined)
      issues.push(
        issue("VERIFICATION_ARCHITECTURE_LITERAL_INVALID", literalMessage),
      );
  });

  if (declared.length > 1) {
    issues.push(
      issue(
        "VERIFICATION_ARCHITECTURE_IMPACT_REPEATED",
        'Architecture must declare "Impact" at most once',
      ),
    );
    return "low";
  }

  const value = declared[0] ?? "low";
  if (isLevel(value)) return value;

  issues.push(
    issue(
      "VERIFICATION_ARCHITECTURE_IMPACT_INVALID",
      "Architecture impact must be low, medium, or high",
    ),
  );
  return "low";
}

function readRiskLevel(
  source: string,
  issues: ResultIssue[],
): VerificationLevel {
  const declared: string[] = [];
  const signals = new Set<string>();

  readSection(source, "## Risk", issues, (entry) => {
    if (entry.kind !== "declaration") {
      issues.push(
        issue(
          "VERIFICATION_RISK_ENTRY_INVALID",
          `risk entry is not a declaration: ${entry.text}`,
        ),
      );
      return;
    }
    if (entry.label === "Level") {
      declared.push(entry.value);
      return;
    }
    if (entry.label === "Reason") {
      if (readExactLiteral(entry.value) === undefined)
        issues.push(
          issue(
            "VERIFICATION_RISK_REASON_INVALID",
            "risk reason must name one same-line backticked signal",
          ),
        );
      return;
    }
    if (entry.label === "Signal") {
      const signal = readExactLiteral(entry.value);
      if (signal === undefined) {
        issues.push(
          issue(
            "VERIFICATION_RISK_SIGNAL_INVALID",
            "risk signal must name one same-line backticked signal",
          ),
        );
        return;
      }
      if (!riskSignals.includes(signal)) {
        issues.push(
          issue(
            "VERIFICATION_RISK_SIGNAL_UNKNOWN",
            `risk signal is unknown: ${signal}`,
          ),
        );
        return;
      }
      if (signals.has(signal)) {
        issues.push(
          issue(
            "VERIFICATION_RISK_SIGNAL_REPEATED",
            `risk signal declared more than once: ${signal}`,
          ),
        );
        return;
      }
      signals.add(signal);
      return;
    }
    issues.push(
      issue(
        "VERIFICATION_RISK_UNKNOWN_LABEL",
        `risk declares an unknown label: ${entry.label}`,
      ),
    );
  });

  if (declared.length > 1) {
    issues.push(
      issue(
        "VERIFICATION_RISK_LEVEL_REPEATED",
        'Risk must declare "Level" at most once',
      ),
    );
    return "low";
  }

  const value = declared[0] ?? "low";
  if (isLevel(value)) return value;

  issues.push(
    issue(
      "VERIFICATION_RISK_LEVEL_INVALID",
      "Risk level must be low, medium, or high",
    ),
  );
  return "low";
}

function plan(
  taskMode: VerificationTaskMode,
  authority: VerificationAuthority,
  riskLevel: VerificationLevel,
  architectureImpact: VerificationLevel,
): VerificationPlan {
  const requiredChecks = [...profiles[riskLevel]];
  if (architectureImpact !== "low") requiredChecks.push("architecture");

  return Object.freeze({
    taskMode,
    authority,
    riskLevel,
    architectureImpact,
    requiredChecks: Object.freeze(requiredChecks),
  });
}

function evaluation(
  resolved: VerificationPlan,
  issues: readonly ResultIssue[],
): VerificationPlanEvaluation {
  const incomplete = issues.length > 0;

  return Object.freeze({
    plan: resolved,
    result: Object.freeze({
      schemaVersion: RESULT_SCHEMA_VERSION,
      protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
      status: incomplete ? "fail" : "pass",
      outcome: incomplete ? "failure" : "success",
      exit: incomplete ? 1 : 0,
      subject: "verification",
      issues: Object.freeze([...issues]),
    } as const),
  });
}

/**
 * Resolves one Story's declared execution contract and required verification
 * profile from Markdown source. It performs no I/O, never executes a declared
 * command, and never throws for runtime input.
 */
export function resolveVerificationPlan(
  source: unknown,
): VerificationPlanEvaluation {
  const defaults = plan(
    "execution",
    Object.freeze({
      plan: true,
      modify: true,
      add_dependency: false,
      migration: false,
      commit: false,
      push: false,
      deploy: false,
    }),
    "low",
    "low",
  );

  if (typeof source !== "string")
    return evaluation(defaults, [
      issue("VERIFICATION_SOURCE_TYPE", "story source must be a string"),
    ]);

  const issues: ResultIssue[] = [];
  const taskMode = readTaskMode(source, issues);
  const authority = readAuthority(source, taskMode, issues);
  const architectureImpact = readArchitectureImpact(source, issues);
  const riskLevel = readRiskLevel(source, issues);

  return evaluation(
    plan(taskMode, authority, riskLevel, architectureImpact),
    issues,
  );
}
