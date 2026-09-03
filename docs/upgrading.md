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
Nothing else in the target is written.

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
files are replaced atomically.

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
