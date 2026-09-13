/**
 * The shared Markdown declaration subset every ForgeFlow contract reader uses.
 *
 * This module is internal to Core. It owns fences and heading scope; callers
 * own meaning, so one parsing subset serves every declaration section.
 */

/** One `* label: value` bullet, or an entry that is not a declaration. */
export type Declaration =
  | {
      readonly kind: "declaration";
      readonly label: string;
      readonly value: string;
    }
  | { readonly kind: "entry"; readonly text: string };

export interface DeclarationSection {
  /** How many times the heading itself was declared. */
  readonly count: number;
  /** Every bullet of every occurrence, in document order. */
  readonly entries: readonly Declaration[];
}

const placeholders = new Set([
  "*",
  "-",
  "TBD",
  "tbd",
  "TODO",
  "todo",
  "N/A",
  "n/a",
  "...",
]);

function trim(line: string): string {
  return line.replace(/^[ \t\r]+/, "").replace(/[ \t\r]+$/, "");
}

function fenceRun(line: string, character: string): number {
  let run = 0;
  while (line[run] === character) run += 1;
  return run;
}

function splitBullet(bullet: string): Declaration {
  const separator = bullet.indexOf(": ");
  let label: string;
  let value: string;

  if (separator >= 0) {
    label = bullet.slice(0, separator);
    value = bullet.slice(separator + 2);
  } else if (bullet.endsWith(":")) {
    label = bullet.slice(0, -1);
    value = "";
  } else {
    return { kind: "entry", text: bullet };
  }

  label = trim(label);
  return label === ""
    ? { kind: "entry", text: bullet }
    : { kind: "declaration", label, value: trim(value) };
}

/** Reads the bullets of one Markdown section, ignoring fenced examples. */
export function readDeclarationSection(
  source: string,
  heading: string,
): DeclarationSection {
  const entries: Declaration[] = [];
  let count = 0;
  let inSection = false;
  let fenceCharacter = "";
  let fenceLength = 0;

  for (const rawLine of source.split("\n")) {
    const line = trim(rawLine);

    if (fenceLength === 0) {
      const character = line.startsWith("`")
        ? "`"
        : line.startsWith("~")
          ? "~"
          : "";
      if (character !== "") {
        const run = fenceRun(line, character);
        if (run >= 3) {
          fenceCharacter = character;
          fenceLength = run;
          continue;
        }
      }
    } else {
      if (line.startsWith(fenceCharacter)) {
        const run = fenceRun(line, fenceCharacter);
        if (run >= fenceLength && line.length === run) {
          fenceLength = 0;
          continue;
        }
      }
      continue;
    }

    if (line.startsWith("#")) {
      inSection = line === heading;
      if (inSection) count += 1;
      continue;
    }
    if (!inSection) continue;

    const bullet =
      line.startsWith("* ") || line.startsWith("- ") ? trim(line.slice(2)) : "";
    if (bullet === "") continue;

    entries.push(splitBullet(bullet));
  }

  return Object.freeze({ count, entries: Object.freeze(entries) });
}

/**
 * Recognizes one exact same-line backticked literal. A placeholder such as
 * `TBD` is deliberately not an exact value.
 */
export function readExactLiteral(value: string): string | undefined {
  const trimmed = trim(value);
  if (trimmed.length < 2 || !trimmed.startsWith("`") || !trimmed.endsWith("`"))
    return undefined;

  const inner = trimmed.slice(1, -1);
  if (
    inner === "" ||
    inner.includes("`") ||
    !/[^ \t\r\n\v\f]/.test(inner) ||
    placeholders.has(inner)
  )
    return undefined;

  return inner;
}
