import {
  IMPLEMENTED_PROTOCOL_VERSION,
  RESULT_SCHEMA_VERSION,
} from "./result.js";
import { isStrictNumericSemVer } from "./version.js";

export const SUPPORTED_PROTOCOL_RANGE = Object.freeze({
  minimum: IMPLEMENTED_PROTOCOL_VERSION,
  maximum: IMPLEMENTED_PROTOCOL_VERSION,
});

export interface ToolingCapabilities {
  readonly resultSchemaVersion: typeof RESULT_SCHEMA_VERSION;
  readonly implementedProtocolVersion: typeof IMPLEMENTED_PROTOCOL_VERSION;
  readonly supportedProtocolRange: typeof SUPPORTED_PROTOCOL_RANGE;
}

const toolingCapabilities: ToolingCapabilities = Object.freeze({
  resultSchemaVersion: RESULT_SCHEMA_VERSION,
  implementedProtocolVersion: IMPLEMENTED_PROTOCOL_VERSION,
  supportedProtocolRange: SUPPORTED_PROTOCOL_RANGE,
});

export function getToolingCapabilities(): ToolingCapabilities {
  return toolingCapabilities;
}

export type ProtocolSelectorSource = "current" | "adopted" | "explicit";

export type ProtocolSelector =
  | { readonly kind: "current" }
  | { readonly kind: "adopted"; readonly version: string }
  | { readonly kind: "explicit"; readonly version: string };

export type ProtocolSelectionErrorCode =
  | "MISSING_SELECTOR"
  | "INVALID_SELECTOR"
  | "MISSING_PROTOCOL_VERSION"
  | "INVALID_PROTOCOL_VERSION"
  | "UNSUPPORTED_PROTOCOL_VERSION";

export type ProtocolSelection =
  | {
      readonly ok: true;
      readonly value: {
        readonly source: ProtocolSelectorSource;
        readonly version: typeof IMPLEMENTED_PROTOCOL_VERSION;
      };
    }
  | {
      readonly ok: false;
      readonly error: { readonly code: ProtocolSelectionErrorCode };
    };

function selectionError(code: ProtocolSelectionErrorCode): ProtocolSelection {
  return { ok: false, error: { code } };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

export function resolveProtocolSelector(selector: unknown): ProtocolSelection {
  if (selector === undefined || selector === null) {
    return selectionError("MISSING_SELECTOR");
  }
  if (!isRecord(selector)) {
    return selectionError("INVALID_SELECTOR");
  }

  const kind = selector.kind;
  if (kind !== "current" && kind !== "adopted" && kind !== "explicit") {
    return selectionError("INVALID_SELECTOR");
  }

  const allowedFields = kind === "current" ? ["kind"] : ["kind", "version"];
  if (Object.keys(selector).some((field) => !allowedFields.includes(field))) {
    return selectionError("INVALID_SELECTOR");
  }

  if (kind === "current") {
    return {
      ok: true,
      value: { source: kind, version: IMPLEMENTED_PROTOCOL_VERSION },
    };
  }

  if (selector.version === undefined || selector.version === null) {
    return selectionError("MISSING_PROTOCOL_VERSION");
  }
  if (
    typeof selector.version !== "string" ||
    !isStrictNumericSemVer(selector.version)
  ) {
    return selectionError("INVALID_PROTOCOL_VERSION");
  }
  if (selector.version !== IMPLEMENTED_PROTOCOL_VERSION) {
    return selectionError("UNSUPPORTED_PROTOCOL_VERSION");
  }

  return {
    ok: true,
    value: { source: kind, version: IMPLEMENTED_PROTOCOL_VERSION },
  };
}
