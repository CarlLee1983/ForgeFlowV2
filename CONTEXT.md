# ForgeFlow Context

ForgeFlow defines a repository-governance protocol and optional tooling that
observes or applies that protocol. This glossary keeps the contract, evidence,
and tooling terms distinct.

## Language

**ForgeFlow Protocol**:
The language-independent, versioned contract that defines adoption, Stories,
verification, evidence, lifecycle meaning, and compatibility.
_Avoid_: TypeScript protocol, CLI protocol

**Adoption**:
A repository that exposes the ForgeFlow-required entrypoints and owns its local
verification gate.
_Avoid_: installation, CLI installation

**Reference Tooling**:
An official implementation that evaluates or applies ForgeFlow contracts
without becoming a prerequisite for adopting the Protocol.
_Avoid_: protocol runtime, ForgeFlow runtime

**Semantic Result**:
A deterministic, machine-readable statement of an evaluation outcome,
diagnostics, and supporting evidence, independent of human wording.
_Avoid_: stdout, log output

**Evidence**:
A declared or observed fact attached to a specific subject; it never implies
current lifecycle authority or human approval.
_Avoid_: status, approval

**Parity**:
Equivalence between two tooling implementations at the Semantic Result and
observable-effects level for the same repository fixture and invocation.
_Avoid_: identical output, rewrite completeness
