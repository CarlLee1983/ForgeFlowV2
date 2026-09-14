/**
 * The literal and placeholder subsets the Story contract recognizes.
 *
 * The retained checker keeps three distinct placeholder lists and two distinct
 * literal predicates, and the difference between them is load-bearing, so each
 * is modelled separately rather than merged into one notion of "filled in".
 */

import { readContentLines, trimDeclarationText } from "./declarations.js";

/**
 * The C-locale `[:space:]` class the retained checker matches against. Every
 * other code point, Unicode whitespace included, is content — the same subset
 * the shared declaration reader already uses.
 */
const nonSpace = /[^ \t\r\n\v\f]/;

/**
 * The bullet placeholder subset the matrix and the literal bullet sections
 * use. Unlike the readiness subset it is a pattern, not a finite list, because
 * an unfilled template cell is written `<like this>`.
 */
export function isPlaceholder(value: string): boolean {
  if (["", "*", "-", "TBD", "tbd", "N/A", "n/a"].includes(value)) return true;
  return value.startsWith("<") && value.endsWith(">");
}

/** True when any backtick pair encloses at least one non-space character. */
export function hasLiteral(value: string): boolean {
  const parts = value.split("`");
  for (let index = 1; index < parts.length; index += 2) {
    const span = parts[index];
    if (span !== undefined && nonSpace.test(span)) return true;
  }
  return false;
}

/**
 * One exact same-line backticked value. Risk contracts are structurally exact
 * even before readiness, so this subset deliberately permits a placeholder.
 */
export function readStructuredLiteral(value: string): string | undefined {
  const trimmed = trimDeclarationText(value);
  if (trimmed.length < 2 || !trimmed.startsWith("`") || !trimmed.endsWith("`"))
    return undefined;

  const inner = trimmed.slice(1, -1);
  if (inner === "" || inner.includes("`") || !nonSpace.test(inner))
    return undefined;
  return inner;
}

/** The evidence placeholder subset the architecture and risk labels reject. */
const evidencePlaceholders: ReadonlySet<string> = new Set([
  "",
  "*",
  "-",
  "TBD",
  "tbd",
  "TODO",
  "todo",
  "N/A",
  "n/a",
  "...",
  "<evidence>",
  "<fixture>",
  "<fixture / precondition>",
  "<expected observation>",
]);

/** One exact same-line backticked value that is not an unfilled placeholder. */
export function readExactValue(value: string): string | undefined {
  const inner = readStructuredLiteral(value);
  if (inner === undefined || evidencePlaceholders.has(inner)) return undefined;
  return inner;
}

/**
 * Reads `* <label>: <value>` declarations exactly as the retained checker's
 * declaration reader does: the label must follow a single space after the
 * bullet marker, and the colon must be followed by a single space. The section
 * scanner used for every other declaration is deliberately more forgiving, so
 * the two are not interchangeable.
 *
 * A `heading` scopes the read to one section; `undefined` reads the whole
 * document, which is how a decision record's status is read.
 */
export function readStrictDeclarations(
  source: string,
  heading: string | undefined,
  label: string,
): readonly string[] {
  const declared: string[] = [];
  const prefix = `* ${label}: `;
  let inSection = heading === undefined;

  for (const line of readContentLines(source)) {
    if (line.startsWith("#")) {
      if (heading !== undefined) inSection = line === heading;
      continue;
    }
    if (!inSection) continue;

    const bullet = line.startsWith("- ") ? `* ${line.slice(2)}` : line;
    if (!bullet.startsWith(prefix)) continue;
    declared.push(trimDeclarationText(bullet.slice(prefix.length)));
  }

  return declared;
}
