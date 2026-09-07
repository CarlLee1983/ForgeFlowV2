# ADR-002: Codex activation is a repository-local pinned snapshot

* Status: accepted
* Date: 2026-09-07

## Context

An adopted repository needs Codex to find ForgeFlow's workflow without the
developer supplying the ForgeFlow source path or pasting its prompt into each
session. Three ways to deliver those instructions were available:

* a global skill installed once per machine, outside any repository;
* a fetch-at-runtime integration that reads the instructions from a remote
  ForgeFlow source at session start; or
* a self-contained snapshot committed inside the adopted repository.

The three differ in who can see the instructions that were actually in force,
who can change them, and whether an old commit still explains itself.

## Decision

The integration is a snapshot pinned in the adopted repository:
`.agents/skills/forgeflow/` plus one bounded managed section in `AGENTS.md`.
`scripts/codex-activate` installs and updates it explicitly, previewing every
change first. Runtime guidance reads only those local files. Updates are chosen
by a human against a specific ForgeFlow checkout; there is no automatic upgrade
and no network fetch.

The snapshot records its own identity — integration version, source revision,
and the adopted template version at installation time — and refuses to update
over locally edited owned content.

A global skill is rejected because it makes the instructions invisible to the
repository, to teammates, and to review: two machines can behave differently on
the same commit with nothing in the tree to explain it. A runtime fetch is
rejected because it lets instructions change under an approved Story without a
reviewed diff, and it makes an offline or archived checkout behave differently
from the one that was reviewed.

## Boundaries

* `Activation` owns the installer, the managed `AGENTS.md` section, the
  installed skill files, and the snapshot identity. It does not own the adopted
  templates, the adoption marker, or any lifecycle decision.
* `Bootstrap` owns adoption, managed templates, and the adoption marker. It does
  not read or write the activation section, and `--upgrade` never touches
  `AGENTS.md`.
* `Human Review` owns whether an installed snapshot is the right one and whether
  an update should happen. The installer proposes; it never decides.

## Consequences

The instructions in force are a reviewable part of the repository, so a diff
shows exactly what changed and an old commit still carries the guidance it was
written under. The cost is duplication: every adopting repository holds its own
copy, and a ForgeFlow improvement reaches them only when someone explicitly
reapplies the installer. Drift between repositories is therefore expected and is
reported, not corrected automatically.

Because the snapshot is copied rather than referenced, its integration version
and the repository's adopted template version can differ legitimately. Equal
numbers are not a health signal, and the tooling does not treat a mismatch as a
defect.

The recorded checksums are accidental-drift detection, not a signature. Someone
with write access can edit an owned file and its recorded checksum together.

## Falsified if

Instructions must change without a repository commit — for example, a security
correction that has to reach every adopter before their next explicit update. If
that requirement appears, `scripts/codex-activate` and
`docs/codex-activation.md` stop being the right home and delivery must move to a
mechanism that can push, which is a Breaking change to this contract.
