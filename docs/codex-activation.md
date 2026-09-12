# Codex project activation

Opt in once to make the current project discoverable to Codex without repeating
the ForgeFlow source path in each development prompt. This optional integration
adds a local skill and a small AGENTS.md section. Existing bootstrap commands,
including `--upgrade`, retain their behavior and never manage this integration.

## Install and update

From a trusted ForgeFlow checkout, preview the exact paths and AGENTS.md diff:

```sh
./scripts/codex-activate /path/to/adopted-repository
```

After reviewing the preview and authorizing these changes:

```sh
./scripts/codex-activate --apply /path/to/adopted-repository
```

The target needs a readable nonempty AGENTS.md and an existing specs/stories
directory. Legacy adoptions without a marker are supported with adoption version
`unknown`. Run the installer only against a repository you intend to modify.
It never executes the target Makefile, tests, hooks, or other repository code.

The owned surface is:

```text
AGENTS.md                         # only the ForgeFlow Codex managed section
.agents/skills/forgeflow/
  SKILL.md
  story-development.md             # copy of the canonical Story-development skill
  .forgeflow-snapshot
```

Commit these files through the adopter's normal workflow so teammates get the
same snapshot. The installed skill refers only to the current repository; the
source checkout can be removed after installation. No global skill, plugin,
background process, or extra runtime service is needed.

Preview and `--apply` have the same validation. Reapplying an identical snapshot
is a no-op. To update, deliberately choose a newer ForgeFlow checkout, preview,
then apply. There is no network fetch or automatic upgrade. Local edits to any
owned file or the managed section, unexpected files, and incomplete snapshots
are refused before target writes. Save intended edits and explicitly reconcile
them with the original installed snapshot before retrying; there is no force flag.

The seven-line snapshot records format `1`, integration version/revision,
template adoption version at installation, and POSIX cksum/byte counts for the
two skill files and the exact managed section. It is accidental-drift detection,
not a cryptographic signature or protection against someone forging metadata.
Revision is the source HEAD, HEAD-dirty, or unknown when Git cannot establish it.
Integration updates do not alter specs/.forgeflow-adoption or Story templates;
the two version values can legitimately differ. A change from the recorded
`adoption=` value means the marker differs from the recorded baseline; it does
not by itself prove a template change or partial upgrade. Confirm the template
history before proposing reconciliation. Equal version numbers are not required.

## Use

Open a fresh Codex session in the project root or a nested working directory.
Name the approved Story or provide current selection through the human request
or an external control plane. `繼續開發` resumes only when that authoritative
context is already available in the session; Codex never selects work from a
handoff, task note, or directory order. For a new independent requirement it
prepares a draft for human approval. Questions and design discussion do not
start the Story workflow. `$forgeflow` is the explicit fallback.

Missing integration files, conflicting project instructions, or absent current
selection call for a specific diagnosis or one narrow question. Historical
handoff evidence may explain prior execution and never supplies current
lifecycle state. Repairing installation or upgrading instructions requires
authorization.

Codex loads project AGENTS.md instructions and discovers repository skills from
`.agents/skills` between the working directory and repository root. Overrides,
instruction limits, and skill selection can affect activation. Test the actual
host; installation is not proof that every prompt will trigger the skill.
See the official [AGENTS.md documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
and [skill discovery documentation](https://learn.chatgpt.com/docs/build-skills).
The integration supplies guidance, not tool interception or a mechanical gate.
`make verify`, CI policy, and Human Review remain the enforcement boundaries.

## Safety and recovery

The installer rejects symlinked managed parents/leaves, wrong file types,
ambiguous delimiters, and unowned integration contents. It prepends the first
managed section and preserves original AGENTS.md bytes, including CRLF and an
unterminated final line. Later updates replace only the owned section. External
hard-link aliases retain their original bytes because replacement uses rename.

All new files and original backups are prepared before replacing any file.
Each temporary stage is private and beside its destination so each rename stays
on the same filesystem. Snapshot metadata is replaced last. Detected failures
restore attempted files in reverse order, including operations that changed a
file and then reported failure. Failed recovery prints UNRESTORED paths and
retains original copies with instructions. Do not use an unresolved snapshot
until the reported paths are reconciled. Installation success is printed only
after cleanup succeeds.

Preview may create private scratch files in the system temporary directory; it
writes nothing in the target. A quiet target is required: like bootstrap, this
is not a sandbox against hostile concurrent writers and not a cross-file atomic
transaction under power loss or SIGKILL. Recovery preserves contents/existence,
not original inode identity. Exit 0 means successful preview, no-op, or completed
installation as stated in output; exit 1 is a refusal or operational failure;
exit 2 is invalid invocation.

## Roll back or opt out

For a supported older activation snapshot, run its installer in preview mode
and explicitly apply it. Restoring an old template snapshot alone does not
restore the integration. For full opt-out, review and remove the exact section
between `<!-- ForgeFlow Codex: begin -->` and `<!-- ForgeFlow Codex: end -->`,
and the three owned files above; remove the forgeflow directory only if empty.
Preserve all other AGENTS.md bytes and any unrelated skills. Prefer the adopter's
version control to recover the exact previously reviewed snapshot. Restart the
Codex session after rollback or opt-out.

## Historical 0.5.1 acceptance walkthrough

The FF-225 walkthrough and its generated fixtures are retained as historical
evidence for the `0.5.1` activation behavior. They intentionally exercise the
legacy handoff lifecycle schema and are not a current usage guide or a fixture
for the `0.8.0` Handoff Evidence Contract. See
[`walkthrough-results.md`](../specs/stories/FF-225-codex-project-activation/walkthrough-results.md)
for the observations made at that revision.

Current activation verification is in `tests/codex-activation.sh`. It validates
installation safety and snapshot integrity, while Story selection and mutable
lifecycle state come from the human or external control plane.
