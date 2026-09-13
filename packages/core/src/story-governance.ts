/**
 * The governance declarations a Story makes: its task mode, the authority it
 * grants, and its architecture boundaries, contracts, owners, and decisions.
 *
 * Authority defaults are least privilege by task mode, and one grant never
 * implies the next one along the chain.
 */

import { readDeclarationSection, type Declaration } from "./declarations.js";
import type { ResultIssue } from "./result.js";
import { readExactValue } from "./story-literals.js";
import {
  isAuthorityOperation,
  type VerificationAuthority,
  type VerificationAuthorityOperation,
  type VerificationLevel,
  type VerificationTaskMode,
} from "./verification.js";

const levels: readonly VerificationLevel[] = ["low", "medium", "high"];
const taskModes: readonly VerificationTaskMode[] = [
  "architecture",
  "execution",
  "evidence",
  "mixed",
];

/** Every operation an evidence-mode Story may not authorize, in check order. */
const mutatingOperations: readonly VerificationAuthorityOperation[] = [
  "modify",
  "add_dependency",
  "migration",
  "commit",
  "push",
  "deploy",
];

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

/** Reads the declarations of one section, reporting a repeated heading. */
export function readSection(
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
        "STORY_SECTION_REPEATED",
        `Story must declare ${heading} at most once`,
      ),
    );
}

export function readTaskMode(
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
        "STORY_TASK_MODE_REPEATED",
        'Classification must declare "Task mode" at most once',
      ),
    );
    return "execution";
  }

  const value = declared[0] ?? "execution";
  if ((taskModes as readonly string[]).includes(value))
    return value as VerificationTaskMode;

  issues.push(
    issue(
      "STORY_TASK_MODE_INVALID",
      "Task mode must be architecture, execution, evidence, or mixed",
    ),
  );
  return "execution";
}

export function readAuthority(
  source: string,
  taskMode: VerificationTaskMode,
  issues: ResultIssue[],
): VerificationAuthority {
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
          "STORY_AUTHORITY_ENTRY_INVALID",
          `authority entry is not a declaration: ${entry.text}`,
        ),
      );
      return;
    }
    if (!isAuthorityOperation(entry.label)) {
      issues.push(
        issue(
          "STORY_AUTHORITY_UNKNOWN_OPERATION",
          `authority declares an unknown operation: ${entry.label}`,
        ),
      );
      return;
    }
    if (seen.has(entry.label)) {
      issues.push(
        issue(
          "STORY_AUTHORITY_REPEATED",
          `authority declares ${entry.label} more than once`,
        ),
      );
      return;
    }
    seen.add(entry.label);
    if (entry.value !== "yes" && entry.value !== "no") {
      issues.push(
        issue(
          "STORY_AUTHORITY_VALUE_INVALID",
          `authority ${entry.label} must be declared as yes or no`,
        ),
      );
      return;
    }
    authority[entry.label] = entry.value === "yes";
  });

  // An agent being able to perform an operation is not authorization to
  // perform it, and one grant never implies the next one along the chain.
  if (authority.deploy && !authority.push)
    issues.push(
      issue("STORY_AUTHORITY_CHAIN", "authority grants deploy without push"),
    );
  if (authority.push && !authority.commit)
    issues.push(
      issue("STORY_AUTHORITY_CHAIN", "authority grants push without commit"),
    );
  if (authority.commit && !authority.modify)
    issues.push(
      issue("STORY_AUTHORITY_CHAIN", "authority grants commit without modify"),
    );

  if (taskMode === "evidence") {
    for (const operation of mutatingOperations) {
      if (authority[operation])
        issues.push(
          issue(
            "STORY_AUTHORITY_EVIDENCE_MODE",
            `evidence task mode must not authorize ${operation}`,
          ),
        );
    }
  }

  return Object.freeze(authority);
}

export interface ArchitectureFacts {
  readonly impact: VerificationLevel;
  readonly boundaries: readonly string[];
  readonly owners: readonly string[];
  readonly decisions: readonly string[];
  readonly contractCount: number;
}

const architectureLabels: ReadonlySet<string> = new Set([
  "Decision",
  "Boundary",
  "Contract",
  "Owner",
]);

export function readArchitecture(
  source: string,
  issues: ResultIssue[],
): ArchitectureFacts {
  const declared: string[] = [];
  const boundaries: string[] = [];
  const owners: string[] = [];
  const decisions: string[] = [];
  let decisionCount = 0;
  let contractCount = 0;

  readSection(source, "## Architecture", issues, (entry) => {
    if (entry.kind !== "declaration") {
      issues.push(
        issue(
          "STORY_ARCHITECTURE_ENTRY_INVALID",
          `architecture entry is not a declaration: ${entry.text}`,
        ),
      );
      return;
    }
    if (entry.label === "Impact") {
      declared.push(entry.value);
      return;
    }
    if (!architectureLabels.has(entry.label)) {
      issues.push(
        issue(
          "STORY_ARCHITECTURE_UNKNOWN_LABEL",
          `architecture declares an unknown label: ${entry.label}`,
        ),
      );
      return;
    }

    const value = readExactValue(entry.value);
    if (value === undefined) {
      issues.push(
        issue(
          "STORY_ARCHITECTURE_LITERAL_INVALID",
          `architecture ${entry.label} must state one exact backticked value`,
        ),
      );
      return;
    }

    switch (entry.label) {
      case "Decision":
        // The retained checker counts the reference before rejecting the
        // repeat, and still resolves the decision exactly once.
        decisionCount += 1;
        if (decisions.includes(value)) {
          issues.push(
            issue(
              "STORY_ARCHITECTURE_DECISION_REPEATED",
              `architecture references the same decision twice: ${value}`,
            ),
          );
          return;
        }
        decisions.push(value);
        return;
      case "Boundary":
        boundaries.push(value);
        return;
      case "Contract":
        contractCount += 1;
        return;
      default:
        owners.push(value);
    }
  });

  let impact: VerificationLevel = "low";
  if (declared.length > 1) {
    issues.push(
      issue(
        "STORY_ARCHITECTURE_IMPACT_REPEATED",
        'Architecture must declare "Impact" at most once',
      ),
    );
  } else if (declared.length === 1) {
    const value = declared[0] ?? "low";
    if ((levels as readonly string[]).includes(value)) {
      impact = value as VerificationLevel;
    } else {
      issues.push(
        issue(
          "STORY_ARCHITECTURE_IMPACT_INVALID",
          "Architecture impact must be low, medium, or high",
        ),
      );
    }
  }

  if (
    (impact === "medium" || impact === "high") &&
    decisionCount === 0 &&
    contractCount === 0
  )
    issues.push(
      issue(
        "STORY_ARCHITECTURE_IMPACT_UNSUPPORTED",
        `architecture impact ${impact} must name at least one decision or contract`,
      ),
    );

  return Object.freeze({
    impact,
    boundaries: Object.freeze(boundaries),
    owners: Object.freeze(owners),
    decisions: Object.freeze(decisions),
    contractCount,
  });
}

export function checkOwners(
  architecture: ArchitectureFacts,
  issues: ResultIssue[],
): void {
  for (const entry of architecture.owners) {
    const separator = entry.indexOf(" = ");
    if (separator < 0) {
      issues.push(
        issue(
          "STORY_ARCHITECTURE_OWNER_MALFORMED",
          `architecture owner must be stated as <boundary> = <owner>: ${entry}`,
        ),
      );
      continue;
    }

    const boundary = entry.slice(0, separator);
    const domain = entry.slice(separator + 3);
    if (domain === "") {
      issues.push(
        issue(
          "STORY_ARCHITECTURE_OWNER_UNOWNED",
          `architecture owner names no owning domain: ${entry}`,
        ),
      );
      continue;
    }

    if (!architecture.boundaries.includes(boundary))
      issues.push(
        issue(
          "STORY_ARCHITECTURE_OWNER_UNDECLARED",
          `architecture owner names an undeclared boundary: ${boundary}`,
        ),
      );
  }
}
