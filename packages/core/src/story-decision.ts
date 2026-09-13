/**
 * Referenced architecture decision resolution.
 *
 * Core decides whether a resolved record is usable; finding the record is the
 * caller's concern, so the resolution is presented to this module as a plain
 * lookup result.
 */

import { readStrictDeclarations } from "./story-literals.js";
import type { ResultIssue } from "./result.js";
import type { VerificationTaskMode } from "./verification.js";

/** How one referenced decision record resolved, presented by the caller. */
export type StoryDecisionRecord =
  | { readonly kind: "missing" }
  | { readonly kind: "ambiguous" }
  | { readonly kind: "unreadable" }
  | { readonly kind: "found"; readonly source: string };

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

export function checkDecision(
  id: string,
  taskMode: VerificationTaskMode,
  resolve: ((id: string) => StoryDecisionRecord) | undefined,
  issues: ResultIssue[],
): void {
  if (!/^ADR-[0-9]+$/.test(id)) {
    issues.push(
      issue(
        "STORY_DECISION_MALFORMED",
        `architecture decision must be ADR-<digits>: ${id}`,
      ),
    );
    return;
  }

  // Without a resolver Core reports the shape and nothing more, because
  // resolving a record to a file is the caller's concern.
  if (resolve === undefined) return;

  const record = resolve(id);
  switch (record.kind) {
    case "missing":
      issues.push(
        issue(
          "STORY_DECISION_MISSING",
          `referenced decision record does not exist: ${id}`,
        ),
      );
      return;
    case "ambiguous":
      issues.push(
        issue(
          "STORY_DECISION_AMBIGUOUS",
          `referenced decision resolves to more than one record: ${id}`,
        ),
      );
      return;
    case "unreadable":
      issues.push(
        issue(
          "STORY_DECISION_UNREADABLE",
          `referenced decision record is unreadable: ${id}`,
        ),
      );
      return;
    default:
      break;
  }

  // A decision record is a small top-level document, so its status is not
  // scoped to a section the way a Story declaration is.
  const declared = readStrictDeclarations(record.source, undefined, "Status");
  if (declared.length !== 1) {
    issues.push(
      issue(
        "STORY_DECISION_STATUS_COUNT",
        `referenced decision must declare Status exactly once: ${id}`,
      ),
    );
    return;
  }

  switch (declared[0]) {
    case "accepted":
      return;
    case "proposed":
      if (taskMode === "architecture" || taskMode === "mixed") return;
      issues.push(
        issue(
          "STORY_DECISION_PROPOSED",
          `referenced decision is still proposed: ${id}`,
        ),
      );
      return;
    case "superseded":
    case "rejected":
      issues.push(
        issue(
          "STORY_DECISION_UNUSABLE",
          `referenced decision is not usable (${declared[0]}): ${id}`,
        ),
      );
      return;
    default:
      issues.push(
        issue(
          "STORY_DECISION_UNKNOWN_STATUS",
          `referenced decision declares an unknown status: ${id}`,
        ),
      );
  }
}
