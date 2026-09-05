# Upgrading an Adopting Repository

Bootstrap installs a copy-time snapshot. This page covers moving an existing
adoption to a newer snapshot without losing what the repository owns.

## The adoption marker

A fresh bootstrap writes `specs/.forgeflow-adoption`, a machine-readable record
of the snapshot it installed:

```text
version=0.3.0
revision=f14da0095cf04d42df3d7a82822e072639beba9e
```

`version` is the ForgeFlow `VERSION` value the snapshot came from. `revision`
is the full commit SHA of the ForgeFlow checkout that copied it, with a `-dirty`
suffix when that checkout had uncommitted changes. It is the literal `unknown`
whenever the checkout cannot prove otherwise: Git is unavailable, the checkout
is not itself the root of a Git work tree (a copy vendored inside another
repository included), or the work tree's state cannot be read. A `-dirty` or
`unknown` revision means the snapshot cannot be reproduced from a commit; the
version line is still exact.

The marker is a managed file, classified in
[Protocol Versioning](../protocol/versioning.md).

`specs/stories/README.md` is **not** managed. A repository may keep whatever
prose it likes there; ForgeFlow neither reads nor writes it.

## Upgrading the templates

From a newer ForgeFlow checkout:

```sh
./scripts/bootstrap --upgrade /path/to/repository
```

This replaces the three `specs/stories/_template/` files and the adoption
marker, and recreates `specs/stories/_template/` if the adoption had removed it.
Outside the temporary private staging/recovery directories described below,
nothing else in the target is written.

Preview it first:

```sh
./scripts/bootstrap --upgrade --dry-run /path/to/repository
```

`--upgrade` and `--dry-run` may appear in either order before the optional
target, and each flag may appear at most once. `--upgrade` and `--force` are
mutually exclusive: `--force` is a fresh installation that replaces every
managed file, `--upgrade` deliberately replaces fewer.

`--upgrade` requires an existing `specs/stories/` directory. A repository that
never adopted ForgeFlow exits `1` and is told to run a fresh bootstrap instead.
The static safety rules are the same as a fresh install: managed directory and
file symlinks are refused, a managed path of the wrong file type is refused, and
each replacement uses a single-file atomic rename.

## Failure recovery

Fresh bootstrap, `--force`, and `--upgrade` prepare every replacement and back up
every existing managed file before replacing any of them. Private
`.forgeflow-install.<pid>-<filename>` directories beside the destinations keep
each rename on the same filesystem. Originals must be readable and enough disk
space must be available for staging and recovery copies; preparation failure
leaves managed files unchanged. The adoption marker is replaced last.

Detected command failures and caught HUP/INT/TERM interruptions trigger cross-file
recovery: restore original file contents and existence, including a command that
changed its destination before reporting failure. Other paths keep being
restored even if one recovery operation fails. Recovery uses copies, so it does
not promise original inode identity, hard-link reconstruction, or all filesystem
metadata. Successful cleanup removes staging and newly created empty directories
on a failed installation. `--dry-run` never stages or backs up anything.

An incomplete recovery exits nonzero, prints every `UNRESTORED:` destination,
and retains private recovery directories. Restore each named destination from
its named `original` backup through a temporary copy beside that destination and
rename the copy into place. If the original was absent, remove only that named
destination. Recheck all managed contents before removing retained directories
or retrying bootstrap. Never blindly remove the target repository.

If marker restoration fails, bootstrap attempts to remove the marker so it
cannot claim a successfully installed new snapshot. If removal also fails,
`Do not trust the adoption marker` names the path to remove or restore manually
before using the adoption. No failure prints installation success. A cleanup
failure after all replacements succeeded can leave a complete installation with
staging to remove; it still exits nonzero and reports the cleanup path.

This is single-file atomic replacement with cross-file recovery, **not an atomic
installation transaction**. Power loss, SIGKILL, an unavailable filesystem, or
hostile concurrent changes can prevent recovery; backups alone are not a durable
journal. Run only while controlling the repository. After an uncatchable failure,
inspect all managed files and any retained originals, restore a known complete
snapshot (or deliberately retry with `--force`/`--upgrade`), and confirm the
marker agrees before relying on it. Upgrade staging/recovery never includes
repository-owned `AGENTS.md`.

## What `--upgrade` never does

`--upgrade` never creates, replaces, removes, or reads `AGENTS.md`. Once
installed, the agent guide is owned by the adopting repository, and repositories
customize it heavily.

The command reports that it left `AGENTS.md` alone. When the marker it found
records a different protocol version from the templates it just installed, it
also warns, naming both versions and pointing here. The marker records the last
bootstrap or upgrade, not the provenance of `AGENTS.md`, so the warning says
only that the guide may predate either version — it cannot say when the guide
was written. Deciding what to carry across from the new `templates/AGENTS.md` is
the adopter's call; ForgeFlow does not diff, merge, or keep historical copies of
it.

`--upgrade` also does not rewrite existing Stories. A newer Story Contract can
make previously valid Stories incomplete, and fixing them is a migration step
you perform and `scripts/story-check` verifies.

## Reconcile repository-owned agent guidance

An adoption marker upgraded to the current version does not mean
repository-owned `AGENTS.md` is current. Bootstrap never merges or overwrites
`AGENTS.md` in upgrade mode, so adopters manually compare the current
`templates/AGENTS.md` and reconcile guidance that fits their repository:

* when upgrading to 0.3.3 or later, compare the Code Quality guidance;
* when upgrading to 0.3.4 or later, compare Review Preparation and human-only
  acceptance guidance; and
* when upgrading to 0.3.5 or later, compare Classification truthfulness and
  verification freshness guidance.

This is a manual reconciliation step. A marker update proves only which managed
Story-template snapshot bootstrap installed; it does not prove that the
repository-owned guide carries the same guidance version.

## Per-version migration steps

The required repository changes for each version, including the `0.3.0` Story
`## Classification` migration, are recorded with the change classification that
justifies them in [Protocol Versioning](../protocol/versioning.md). Read that
page's migration guidance for the version you are moving to, then run
`./scripts/story-check` to confirm the result.
