/** Shared escaped-pipe table primitives used by static Story readers. */

import { trimDeclarationText } from "./declarations.js";

/** Counts unescaped pipes, treating an odd backslash run as an escape. */
export function countTablePipes(row: string): number {
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

/** Splits a row at unescaped pipes while retaining escaped pipe text. */
export function splitTableCells(row: string): readonly string[] {
  const values: string[] = [];
  let cell = "";
  let backslashes = 0;
  for (const character of row) {
    if (character === "|" && backslashes % 2 === 0) {
      values.push(trimDeclarationText(cell));
      cell = "";
      backslashes = 0;
      continue;
    }
    cell += character;
    backslashes = character === "\\" ? backslashes + 1 : 0;
  }
  values.push(trimDeclarationText(cell));
  return values;
}

/** Recognizes the exact five-column separator syntax shared by Story tables. */
export function isFiveColumnTableSeparator(row: string): boolean {
  if (!row.startsWith("|")) return false;
  const values = row.slice(1).split("|");
  return (
    values.length === 6 &&
    values[5] === "" &&
    values.slice(0, 5).every((value) => /^ *:?-+:? *$/.test(value))
  );
}
