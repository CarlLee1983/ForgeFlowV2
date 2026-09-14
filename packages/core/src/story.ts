/**
 * The default Story contract evaluator.
 *
 * Core owns meaning only: the caller presents the Story directory name and the
 * Story and acceptance source text, and receives the resolved facts, ordered
 * diagnostics, and one canonical result envelope. This module never touches
 * the filesystem, a process, the clock, Git, or lifecycle state, and it never
 * treats a declared fact as approval, completion, or current state.
 */

import { readDeclarationSection, readSectionBullets } from "./declarations.js";
import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
  type ResultEnvelope,
  type ResultIssue,
} from "./result.js";
import { checkDecision, type StoryDecisionRecord } from "./story-decision.js";
import {
  checkOwners,
  readArchitecture,
  readAuthority,
  readSection,
  readTaskMode,
} from "./story-governance.js";
import { readStoryId } from "./story-id.js";
import {
  hasLiteral,
  isPlaceholder,
  readExactValue,
  readStrictDeclarations,
  readStructuredLiteral,
} from "./story-literals.js";
import { checkMatrix } from "./story-matrix.js";
import {
  checkRiskContractFieldReadiness,
  checkRiskEvidenceReadiness,
  checkStoryReadiness,
  type StoryReadinessFacts,
} from "./story-readiness.js";
import {
  type VerificationAuthority,
  type VerificationLevel,
  type VerificationTaskMode,
} from "./verification.js";

/** Every fact the default contract resolves, as declared. */
export interface StoryFacts {
  readonly storyId: string | undefined;
  readonly securitySensitive: boolean | undefined;
  readonly baselineConformance: boolean | undefined;
  readonly taskMode: VerificationTaskMode;
  readonly authority: VerificationAuthority;
  readonly architectureImpact: VerificationLevel;
  readonly riskLevel: VerificationLevel;
  readonly boundaries: readonly string[];
  readonly owners: readonly string[];
  /** Every decision record the Story references, expanded and deduplicated. */
  readonly decisions: readonly string[];
  readonly reasons: readonly string[];
  readonly riskSignals: readonly string[];
}

export type { StoryDecisionRecord };

export interface StoryContractSources {
  /** The Story directory, exactly as the caller names it. */
  readonly directory: string;
  readonly story: string;
  readonly acceptance: string;
  /** Resolves one referenced `ADR-<digits>` to its record, or its failure. */
  readonly decision?: (id: string) => StoryDecisionRecord;
}

/** A pure Story contract evaluation. The facts are always resolved. */
export interface StoryContractEvaluation {
  readonly result: ResultEnvelope;
  readonly facts: StoryFacts;
}

/** A pure opt-in readiness evaluation plus its unchanged structural result. */
export interface StoryReadinessEvaluation extends StoryContractEvaluation {
  readonly structure: ResultEnvelope;
}

const levels: readonly VerificationLevel[] = ["low", "medium", "high"];

const highRiskSignals: ReadonlySet<string> = new Set([
  "authentication",
  "authorization",
  "security",
  "payment",
  "payments",
  "schema-migration",
  "data-loss",
  "public-contract",
  "concurrency",
  "production-config",
  "dependency-supply-chain",
  "destructive-operation",
]);

interface RiskContract {
  readonly signal: string;
  readonly heading: string;
  /** The name every diagnostic for this contract uses. */
  readonly name: string;
  readonly fields: readonly string[];
}

/** The four standard risk contracts, in declaration order. */
const riskContracts: readonly RiskContract[] = [
  {
    signal: "error-projection",
    heading: "## Error Projection",
    name: "Error Projection",
    fields: [
      "Source failure",
      "Public projection",
      "Detail policy",
      "Evidence AC",
    ],
  },
  {
    signal: "concurrency",
    heading: "## Concurrency",
    name: "Concurrency",
    fields: [
      "Contended resource",
      "Linearization point",
      "Conflict outcome",
      "Evidence AC",
    ],
  },
  {
    signal: "bounded-capacity",
    heading: "## Capacity",
    name: "Capacity",
    fields: [
      "Bounded resource",
      "Limit",
      "Saturation behavior",
      "Failure projection",
      "Evidence AC",
    ],
  },
  {
    signal: "retention-overflow",
    heading: "## Retention and Overflow",
    name: "Retention and Overflow",
    fields: [
      "Retained resource",
      "Retention bound",
      "Overflow policy",
      "Recovery / observability",
      "Evidence AC",
    ],
  },
];

const riskContractsBySignal: ReadonlyMap<string, RiskContract> = new Map(
  riskContracts.map((contract) => [contract.signal, contract]),
);

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

function readClassificationValue(
  source: string,
  label: string,
  issues: ResultIssue[],
): boolean | undefined {
  const declared = readStrictDeclarations(source, "## Classification", label);

  if (declared.length !== 1) {
    issues.push(
      issue(
        "STORY_CLASSIFICATION_COUNT",
        `Classification must declare "${label}" exactly once`,
      ),
    );
    return undefined;
  }

  const value = declared[0];
  if (value === "yes" || value === "no") return value === "yes";

  issues.push(
    issue(
      "STORY_CLASSIFICATION_VALUE",
      `${label} must be declared as yes or no`,
    ),
  );
  return undefined;
}

interface RiskFacts {
  readonly level: VerificationLevel;
  readonly reasons: readonly string[];
  readonly signals: readonly string[];
}

/**
 * Splits one declared value the way the retained checker's unquoted list
 * expansion does. The checker accumulates decisions and risk reasons into a
 * space-separated string and iterates it unquoted, so a value carrying inner
 * whitespace becomes several entries. Pathname expansion is deliberately not
 * reproduced: it would make a pure evaluation depend on the working directory,
 * and it only ever fires when the value happens to match a real path.
 */
function splitDeclaredList(value: string): readonly string[] {
  return value.split(/[ \t\n]+/).filter((entry) => entry !== "");
}

/** Every record the declared references name, expanded and deduplicated. */
function referencedDecisions(architecture: {
  readonly decisions: readonly string[];
}): string[] {
  return [...new Set(architecture.decisions.flatMap(splitDeclaredList))];
}

function readRisk(source: string, issues: ResultIssue[]): RiskFacts {
  const declared: string[] = [];
  const reasons: string[] = [];
  let reasonCount = 0;
  const signals: string[] = [];

  readSection(source, "## Risk", issues, (entry) => {
    if (entry.kind !== "declaration") {
      issues.push(
        issue(
          "STORY_RISK_ENTRY_INVALID",
          `risk entry is not a declaration: ${entry.text}`,
        ),
      );
      return;
    }

    switch (entry.label) {
      case "Level":
        declared.push(entry.value);
        return;
      case "Reason": {
        // The retained checker counts the reason before rejecting prose, so a
        // prose reason still satisfies "must name at least one reason".
        reasonCount += 1;
        const reason = readExactValue(entry.value);
        if (reason === undefined) {
          issues.push(
            issue(
              "STORY_RISK_REASON_INVALID",
              "risk reason must name one same-line backticked signal",
            ),
          );
          return;
        }
        reasons.push(reason);
        return;
      }
      case "Signal": {
        const signal = readStructuredLiteral(entry.value);
        if (signal === undefined) {
          issues.push(
            issue(
              "STORY_RISK_SIGNAL_INVALID",
              "risk signal must name one same-line backticked value",
            ),
          );
          return;
        }
        if (!riskContractsBySignal.has(signal)) {
          issues.push(
            issue(
              "STORY_RISK_SIGNAL_UNKNOWN",
              `risk signal is unknown: ${signal}`,
            ),
          );
          return;
        }
        if (signals.includes(signal)) {
          issues.push(
            issue(
              "STORY_RISK_SIGNAL_REPEATED",
              `risk signal is declared more than once: ${signal}`,
            ),
          );
          return;
        }
        signals.push(signal);
        return;
      }
      default:
        issues.push(
          issue(
            "STORY_RISK_UNKNOWN_LABEL",
            `risk declares an unknown label: ${entry.label}`,
          ),
        );
    }
  });

  let level: VerificationLevel = "low";
  if (declared.length > 1) {
    issues.push(
      issue(
        "STORY_RISK_LEVEL_REPEATED",
        'Risk must declare "Level" at most once',
      ),
    );
  } else if (declared.length === 1) {
    const value = declared[0] ?? "low";
    if ((levels as readonly string[]).includes(value)) {
      level = value as VerificationLevel;
    } else {
      issues.push(
        issue(
          "STORY_RISK_LEVEL_INVALID",
          "Risk level must be low, medium, or high",
        ),
      );
    }
  }

  if ((level === "medium" || level === "high") && reasonCount === 0)
    issues.push(
      issue(
        "STORY_RISK_REASON_MISSING",
        `risk level ${level} must name at least one reason`,
      ),
    );

  // Risk raises inspection and verification depth; it never widens scope. A
  // recognized high-risk signal may therefore not be filed as lower risk.
  if (level !== "high") {
    for (const reason of reasons.flatMap(splitDeclaredList)) {
      if (highRiskSignals.has(reason))
        issues.push(
          issue(
            "STORY_RISK_SIGNAL_UNDERSTATED",
            `risk reason ${reason} is a high-risk signal but the level is ${level}`,
          ),
        );
    }
  }

  return Object.freeze({
    level,
    reasons: Object.freeze(reasons),
    signals: Object.freeze(signals),
  });
}

function checkRiskContract(
  source: string,
  contract: RiskContract,
  issues: ResultIssue[],
  readiness: StoryReadinessFacts | undefined,
  reportReadiness: ((entry: ResultIssue) => void) | undefined,
): void {
  const section = readDeclarationSection(source, contract.heading);

  // The retained checker scans every occurrence's bullets before it judges how
  // many times the heading was declared, so a malformed entry inside a
  // repeated section is still reported.
  const declared = new Map<string, string[]>();
  for (const entry of section.entries) {
    if (entry.kind !== "declaration") {
      issues.push(
        issue(
          "STORY_RISK_CONTRACT_ENTRY_INVALID",
          `${contract.name} entry is not a declaration: ${entry.text}`,
        ),
      );
      continue;
    }
    if (!contract.fields.includes(entry.label)) {
      issues.push(
        issue(
          "STORY_RISK_CONTRACT_UNKNOWN_LABEL",
          `${contract.name} declares an unknown label: ${entry.label}`,
        ),
      );
      continue;
    }
    const values = declared.get(entry.label) ?? [];
    values.push(entry.value);
    declared.set(entry.label, values);
  }

  if (section.count !== 1) {
    issues.push(
      issue(
        "STORY_RISK_CONTRACT_SECTION",
        `risk signal ${contract.signal} requires ${contract.heading} exactly once`,
      ),
    );
    return;
  }

  for (const field of contract.fields) {
    const values = declared.get(field) ?? [];
    if (values.length !== 1) {
      issues.push(
        issue(
          "STORY_RISK_CONTRACT_FIELD_COUNT",
          `${contract.name} must declare "${field}" exactly once`,
        ),
      );
      continue;
    }
    const value = readStructuredLiteral(values[0] ?? "");
    if (value === undefined) {
      issues.push(
        issue(
          "STORY_RISK_CONTRACT_FIELD_LITERAL",
          `${contract.name} ${field} must state one exact same-line backticked value`,
        ),
      );
      continue;
    }
    if (readiness !== undefined && reportReadiness !== undefined)
      checkRiskContractFieldReadiness(
        contract.name,
        field,
        value,
        reportReadiness,
      );
  }

  if (readiness !== undefined && reportReadiness !== undefined)
    checkRiskEvidenceReadiness(
      contract.name,
      declared,
      readiness,
      reportReadiness,
    );
}

interface LiteralBullets {
  readonly found: boolean;
  readonly total: number;
  readonly literal: number;
}

/**
 * Counts the bullets of one section that carry a quoted literal. A placeholder
 * is an unfilled template cell, so it counts as neither.
 */
function countLiteralBullets(source: string, heading: string): LiteralBullets {
  const section = readSectionBullets(source, heading);
  let total = 0;
  let literal = 0;

  for (const bullet of section.bullets) {
    if (isPlaceholder(bullet)) continue;
    total += 1;
    if (hasLiteral(bullet)) literal += 1;
  }

  return Object.freeze({ found: section.count > 0, total, literal });
}

function envelope(issues: readonly ResultIssue[]): ResultEnvelope {
  const failed = issues.length > 0;

  return Object.freeze({
    schemaVersion: RESULT_SCHEMA_VERSION,
    protocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
    status: failed ? "fail" : "pass",
    outcome: failed ? "failure" : "success",
    exit: failed ? 1 : 0,
    subject: "story",
    issues: Object.freeze(issues.map((entry) => Object.freeze({ ...entry }))),
  } as const);
}

/**
 * Reads the decision records a Story references, so a caller can resolve each
 * one before presenting the resolution to the evaluator. Reading reports
 * nothing: every diagnostic belongs to the evaluation itself, and the list is
 * the one the evaluation reports back as a fact.
 */
export function readStoryDecisions(story: string): readonly string[] {
  return Object.freeze(referencedDecisions(readArchitecture(story, [])));
}

/**
 * Evaluates one Story's default contract.
 *
 * The order of the checks, and so the order of the diagnostics, is the order
 * the retained portable checker reports them in.
 */
function evaluateStory(
  sources: StoryContractSources,
  ready: boolean,
): StoryReadinessEvaluation {
  const issues: ResultIssue[] = [];
  const structureIssues: ResultIssue[] = [];
  const { directory, story, acceptance } = sources;

  const storyId = readStoryId(directory);
  if (storyId === undefined) {
    const entry = issue(
      "STORY_ID_INVALID",
      `Story directory does not name a Story ID: ${directory.replace(/\/+$/, "").split("/").pop() ?? ""} (no leading run of its hyphen-separated segments is one; a Story ID is segments of uppercase letters and digits, where the first segment starts with an uppercase letter, each middle segment has an uppercase letter, and the last segment is digits)`,
    );
    issues.push(entry);
    structureIssues.push(entry);
  }

  const readiness = ready
    ? checkStoryReadiness(story, acceptance, issues)
    : undefined;
  const push = issues.push.bind(issues);
  issues.push = (...entries: ResultIssue[]): number => {
    structureIssues.push(...entries);
    return push(...entries);
  };
  const reportReadiness = (entry: ResultIssue): void => {
    issues[issues.length] = entry;
  };

  const taskMode = readTaskMode(story, issues);
  const authority = readAuthority(story, taskMode, issues);
  const architecture = readArchitecture(story, issues);
  // One declared value can name several records, exactly as readStoryDecisions
  // reports them to the caller that resolves each one.
  const referenced = referencedDecisions(architecture);
  for (const id of architecture.decisions.flatMap(splitDeclaredList))
    checkDecision(id, taskMode, sources.decision, issues);
  checkOwners(architecture, issues);
  const risk = readRisk(story, issues);
  for (const signal of risk.signals) {
    const contract = riskContractsBySignal.get(signal);
    if (contract !== undefined)
      checkRiskContract(story, contract, issues, readiness, reportReadiness);
  }

  const securitySensitive = readClassificationValue(
    story,
    "Security sensitive",
    issues,
  );
  const baselineConformance = readClassificationValue(
    story,
    "Baseline conformance",
    issues,
  );

  const facts: StoryFacts = Object.freeze({
    storyId,
    securitySensitive,
    baselineConformance,
    taskMode,
    authority,
    architectureImpact: architecture.impact,
    riskLevel: risk.level,
    boundaries: architecture.boundaries,
    owners: architecture.owners,
    decisions: Object.freeze(referenced),
    reasons: risk.reasons,
    riskSignals: risk.signals,
  });

  // An invalid classification suppresses every conditional check, because
  // neither condition is known.
  if (securitySensitive === undefined || baselineConformance === undefined)
    return Object.freeze({
      result: envelope(issues),
      structure: envelope(structureIssues),
      facts,
    });

  const matrix = checkMatrix(acceptance, issues);
  const trust = countLiteralBullets(story, "## Trust Boundary Fields");
  const superseded = countLiteralBullets(story, "## Superseded Behavior");

  if (securitySensitive) {
    if (!matrix.found) {
      issues.push(
        issue(
          "STORY_MATRIX_MISSING",
          "security-sensitive Story is missing acceptance section: ## Security Fixture Matrix",
        ),
      );
    } else if (matrix.rows === 0) {
      issues.push(
        issue(
          "STORY_MATRIX_EMPTY",
          "security fixture matrix declares no fixture rows",
        ),
      );
    }

    if (!trust.found || trust.total === 0) {
      issues.push(
        issue(
          "STORY_TRUST_BOUNDARY_MISSING",
          "security-sensitive Story must enumerate its trust-boundary fields under ## Trust Boundary Fields",
        ),
      );
    } else if (trust.literal !== trust.total) {
      issues.push(
        issue(
          "STORY_TRUST_BOUNDARY_PROSE",
          "every trust-boundary field must name an exact field, not prose",
        ),
      );
    }
  } else if (matrix.found) {
    issues.push(
      issue(
        "STORY_MATRIX_UNEXPECTED",
        "Story declares Security sensitive: no but provides a security fixture matrix",
      ),
    );
  }

  if (baselineConformance) {
    if (!superseded.found || superseded.total === 0) {
      issues.push(
        issue(
          "STORY_SUPERSEDED_MISSING",
          "baseline-conformance Story must list superseded tests or behavior under ## Superseded Behavior",
        ),
      );
    } else if (superseded.literal !== superseded.total) {
      issues.push(
        issue(
          "STORY_SUPERSEDED_PROSE",
          "every superseded entry must name an exact test path or behavior",
        ),
      );
    }
  } else if (superseded.found) {
    issues.push(
      issue(
        "STORY_SUPERSEDED_UNEXPECTED",
        "Story declares Baseline conformance: no but declares superseded behavior",
      ),
    );
  }

  return Object.freeze({
    result: envelope(issues),
    structure: envelope(structureIssues),
    facts,
  });
}

/** Evaluates the unchanged default Story contract. */
export function evaluateStoryContract(
  sources: StoryContractSources,
): StoryContractEvaluation {
  const evaluation = evaluateStory(sources, false);
  return Object.freeze({
    result: evaluation.structure,
    facts: evaluation.facts,
  });
}

/** Evaluates the opt-in Story readiness contract and retains its structure. */
export function evaluateStoryReadiness(
  sources: StoryContractSources,
): StoryReadinessEvaluation {
  return evaluateStory(sources, true);
}
