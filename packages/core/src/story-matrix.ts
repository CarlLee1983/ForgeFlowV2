/**
 * The security fixture matrix reader.
 *
 * The matrix is a Markdown table with an exact header, a five-column separator
 * row, and rows whose cells must state exact values. A pipe may be escaped, so
 * cells are split with the same escape rule the retained checker applies.
 */

import { readContentLines, trimDeclarationText } from "./declarations.js";
import type { ResultIssue } from "./result.js";
import { hasLiteral, isPlaceholder } from "./story-literals.js";

const matrixHeaderRow =
  "| Source field | Payload | Expected result | Persisted locations | Verification |";

const expectedResults: ReadonlySet<string> = new Set([
  "preserve",
  "redact",
  "reject",
  "omit",
]);

function issue(code: string, message: string): ResultIssue {
  return Object.freeze({ code, message });
}

/** Counts the pipes a row declares, ignoring backslash-escaped ones. */
function countPipes(row: string): number {
  let count = 0;
  let backslashes = 0;

  for (const character of row) {
    if (character === "\\") {
      backslashes += 1;
      continue;
    }
    if (character === "|" && backslashes % 2 === 0) count += 1;
    backslashes = 0;
  }

  return count;
}

/** Splits one table row into its cells, honouring escaped pipes. */
function readCells(row: string): readonly string[] {
  const cells: string[] = [];
  let cell = "";
  let backslashes = 0;

  for (const character of row) {
    if (character === "|" && backslashes % 2 === 0) {
      cells.push(trimDeclarationText(cell));
      cell = "";
      backslashes = 0;
      continue;
    }
    cell += character;
    backslashes = character === "\\" ? backslashes + 1 : 0;
  }

  cells.push(trimDeclarationText(cell));
  return cells;
}

function isSeparatorCell(cell: string): boolean {
  return /^ *:?-+:? *$/.test(cell);
}

/** Recognizes the five-column separator row that must follow the header. */
function isFiveColumnSeparator(row: string): boolean {
  if (!row.startsWith("|")) return false;

  const rest = row.slice(1);
  if (rest === "") return false;
  if (!rest.includes("|")) return false;

  const cells = rest.split("|");
  // A trailing pipe leaves one empty trailing cell, which is not a column.
  if (cells[cells.length - 1] !== "") return false;

  const columns = cells.slice(0, -1);
  return columns.length === 5 && columns.every(isSeparatorCell);
}

/** The four matrix columns that must state an exact value, in check order. */
const matrixLiteralColumns: readonly (readonly [number, string])[] = [
  [0, "source field"],
  [1, "payload"],
  [3, "persisted locations"],
  [4, "verification"],
];

function checkMatrixRow(
  row: string,
  number: number,
  issues: ResultIssue[],
): void {
  if (countPipes(row) !== 6) {
    issues.push(
      issue(
        "STORY_MATRIX_ROW_COLUMNS",
        `security fixture row ${number} must declare five columns`,
      ),
    );
    return;
  }

  const cells = readCells(row.slice(1));

  for (const [index, name] of matrixLiteralColumns) {
    const value = cells[index] ?? "";
    if (isPlaceholder(value)) {
      issues.push(
        issue(
          "STORY_MATRIX_CELL_UNSPECIFIED",
          `security fixture row ${number} leaves ${name} unspecified`,
        ),
      );
      continue;
    }
    if (!hasLiteral(value))
      issues.push(
        issue(
          "STORY_MATRIX_CELL_PROSE",
          `security fixture row ${number} states ${name} as prose instead of an exact value`,
        ),
      );
  }

  if (!expectedResults.has(cells[2] ?? ""))
    issues.push(
      issue(
        "STORY_MATRIX_EXPECTED_RESULT",
        `security fixture row ${number} expected result must be preserve, redact, reject, or omit`,
      ),
    );
}

export interface MatrixFacts {
  readonly found: boolean;
  readonly rows: number;
}

export function checkMatrix(
  acceptance: string,
  issues: ResultIssue[],
): MatrixFacts {
  let found = false;
  let inSection = false;
  let header = false;
  let separator = false;
  let rows = 0;

  for (const line of readContentLines(acceptance)) {
    if (line.startsWith("#")) {
      inSection = line === "## Security Fixture Matrix";
      if (inSection) found = true;
      continue;
    }
    if (!inSection || !line.startsWith("|")) continue;

    if (!header) {
      header = true;
      if (line !== matrixHeaderRow)
        issues.push(
          issue(
            "STORY_MATRIX_HEADER",
            "security fixture matrix header must be exactly the documented five columns",
          ),
        );
      continue;
    }

    if (!separator) {
      separator = true;
      if (!isFiveColumnSeparator(line))
        issues.push(
          issue(
            "STORY_MATRIX_SEPARATOR",
            "security fixture matrix header must be followed by a five-column separator row",
          ),
        );
      continue;
    }

    rows += 1;
    checkMatrixRow(line, rows, issues);
  }

  return Object.freeze({ found, rows });
}
