export type MutationPathKind =
  "missing" | "file" | "directory" | "symlink" | "other" | "unconfirmable";

export interface MutationPathObservation {
  readonly path: string;
  readonly kind: MutationPathKind;
  readonly readable?: boolean;
  readonly searchable?: boolean;
  readonly digest?: string;
  readonly identity?: string;
}

export interface MutationStagePrecondition {
  readonly path: string;
  readonly kind: "missing";
}

export interface MutationStageObservation {
  readonly path: string;
  readonly kind: MutationPathKind;
}

export type MutationFailureStage =
  "precondition" | "prepare" | "apply" | "recovery" | "cleanup";

export interface MutationFailure {
  readonly stage: MutationFailureStage;
  readonly code: string;
  readonly path?: string;
}

/** Immutable facts reported by a filesystem mutation adapter. */
export interface MutationExecutionObservation {
  readonly planId: string;
  readonly committed: boolean;
  readonly prepared: readonly string[];
  readonly attempted: readonly string[];
  readonly applied: readonly string[];
  readonly recoveryAttempted: readonly string[];
  readonly restored: readonly string[];
  readonly unrecovered: readonly string[];
  readonly invalidated: readonly string[];
  readonly invalidationFailed: readonly string[];
  readonly retained: readonly string[];
  readonly cleanupResidue: readonly string[];
  readonly preconditionMismatches: readonly string[];
  readonly failure?: MutationFailure;
}
