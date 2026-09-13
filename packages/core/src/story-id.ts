/**
 * The Story ID grammar, shared by the Story contract and the Handoff contract.
 *
 * A Story directory is a Story ID followed by an optional readable slug. The
 * ID is the shortest leading run of segments that is itself a valid ID, so
 * `FF-227-story-id-grammar` names `FF-227` and `FF-232-API-limits` names
 * `FF-232`. A slug is never absorbed, because the ID stops as soon as it is
 * complete.
 */

const upperOrDigit = /^[A-Z0-9]+$/;

function isFirstSegment(segment: string): boolean {
  return /^[A-Z]/.test(segment) && upperOrDigit.test(segment);
}

function isMiddleSegment(segment: string): boolean {
  return upperOrDigit.test(segment) && /[A-Z]/.test(segment);
}

function isLastSegment(segment: string): boolean {
  return /^[0-9]+$/.test(segment);
}

/** Recognizes one complete Story ID. */
export function isStoryId(candidate: string): boolean {
  const segments = candidate.split("-");
  if (segments.length < 2) return false;

  const first = segments[0];
  const last = segments[segments.length - 1];
  if (first === undefined || last === undefined) return false;
  if (!isFirstSegment(first) || !isLastSegment(last)) return false;

  return segments.slice(1, -1).every(isMiddleSegment);
}

/** Reads the Story ID a directory name carries, if it names one. */
export function readStoryId(directory: string): string | undefined {
  const name = directory.replace(/\/+$/, "").split("/").pop() ?? "";
  const segments = name.split("-");

  for (let length = 1; length <= segments.length; length += 1) {
    const candidate = segments.slice(0, length).join("-");
    if (isStoryId(candidate)) return candidate;
  }

  return undefined;
}
