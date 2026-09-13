const strictNumericSemVer =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

export function isStrictNumericSemVer(value: unknown): value is string {
  return typeof value === "string" && strictNumericSemVer.test(value);
}
