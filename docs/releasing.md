# Releasing ForgeFlow

ForgeFlow publication is a human-authorized operation. The repository provides
one repeatable local readiness interface:

```sh
make release-check
```

The command first runs the canonical `make verify` gate, then checks the local
release candidate's version, commit, strict worktree cleanliness, and local tag
consistency. Its PASS is local-only evidence. It never fetches, pushes, changes
tags, calls GitHub, or creates a release.

Remote tag, Release, and CI state is time-sensitive evidence. Query it through
this runbook when making a release or review decision; a handoff may preserve a
historical publication fact but is not the long-term source of truth for
current remote state.

## 1. Classify and prepare the change

Classify every adopter-facing change as breaking, additive, or corrective under
the [Protocol Versioning policy](../protocol/versioning.md). Update `VERSION` in
the same release change and add migration guidance when the policy requires it.

Commit the complete release change before continuing. Do not exclude untracked
or generated files from the candidate merely to make the readiness check pass.

## 2. Establish local readiness

Run:

```sh
make release-check
```

PASS reports the candidate version, full commit SHA, expected tag, and whether
that local tag is absent or already resolves to the same `HEAD`. The same-HEAD
case is intentionally idempotent. A tag conflict or dirty worktree is a stop
condition; never move a release tag or clean user-owned files to bypass it.

The final line, `remote_checks=not-performed`, is a required reminder that local
PASS is necessary but insufficient for publication.

Immediately after PASS, record one identity tuple from that verified state and
preserve it throughout the rest of the process:

```sh
candidate_version=$(sed -n '1p' VERSION)
candidate_tag="v$candidate_version"
candidate_sha=$(git rev-parse HEAD)
```

Confirm that these three values match the preceding readiness output. If the
repository changes later, stop, rerun `make release-check`, and record a new
tuple; never mix evidence from two candidate revisions.

Resolve the Git remote and GitHub repository once. The following guard supports
this repository's standard GitHub HTTPS and SSH remote forms:

```sh
candidate_remote=origin
if ! candidate_repository=$(gh repo view --json nameWithOwner --jq .nameWithOwner); then
  printf 'STOP: cannot resolve the GitHub repository\n' >&2
  exit 1
fi
if ! candidate_fetch_urls=$(git remote get-url --all "$candidate_remote"); then
  printf 'STOP: cannot resolve the release remote fetch URL\n' >&2
  exit 1
fi
if ! candidate_push_urls=$(git remote get-url --push --all "$candidate_remote"); then
  printf 'STOP: cannot resolve the release remote push URL\n' >&2
  exit 1
fi
candidate_fetch_url_count=$(printf '%s\n' "$candidate_fetch_urls" | wc -l | tr -d '[:space:]')
candidate_push_url_count=$(printf '%s\n' "$candidate_push_urls" | wc -l | tr -d '[:space:]')

if [ -z "$candidate_repository" ] ||
  [ -z "$candidate_fetch_urls" ] ||
  [ -z "$candidate_push_urls" ] ||
  [ "$candidate_fetch_url_count" -ne 1 ] ||
  [ "$candidate_push_url_count" -ne 1 ] ||
  [ "$candidate_fetch_urls" != "$candidate_push_urls" ]; then
  printf 'STOP: release remote must have one identical fetch/push URL\n' >&2
  exit 1
fi

candidate_remote_url=$candidate_push_urls

case "$candidate_remote_url" in
  "https://github.com/$candidate_repository" | \
  "https://github.com/$candidate_repository.git" | \
  "git@github.com:$candidate_repository.git" | \
  "ssh://git@github.com/$candidate_repository.git")
    ;;
  *)
    printf 'STOP: Git remote and GitHub repository do not match\n' >&2
    exit 1
    ;;
esac

gh repo view "$candidate_repository" --json nameWithOwner,url,sshUrl
```

Review that output before continuing. Reuse the exact `candidate_remote_url`
and `candidate_repository` for every subsequent remote read or write; do not
fall back to the remote alias or a separately typed repository name.

## 3. Verify the exact remote revision

With explicit authorization, publish the candidate commit through the
repository's normal branch workflow. Then use authenticated `gh` commands to
find and inspect the verification run for the exact candidate SHA:

```sh
gh run list --repo "$candidate_repository" --commit "$candidate_sha" \
  --workflow verify.yml \
  --json databaseId,headSha,status,conclusion,url
gh run view RUN_ID --repo "$candidate_repository" \
  --json headSha,status,conclusion,url
```

Continue only when the completed successful run's `headSha` equals
`candidate_sha`. A successful run for a branch name, another commit, or an
outdated local checkout is not release evidence.

## 4. Reconcile remote tag and release state

Inspect both remote objects before creating either one:

```sh
git ls-remote --tags "$candidate_remote_url" \
  "refs/tags/$candidate_tag" "refs/tags/$candidate_tag^{}"
gh release view "$candidate_tag" --repo "$candidate_repository" \
  --json tagName,name,isDraft,isPrerelease,targetCommitish,url,publishedAt
```

Apply these stop/go rules:

* If neither remote tag nor release exists, publication may proceed after
  explicit human approval.
* If both exist and the peeled tag, release, and successful CI evidence resolve
  to `candidate_sha`, treat the operation as resumed or already published. Do
  not recreate it.
* If only one exists, either points elsewhere, the release is unexpectedly
  draft/prerelease, or evidence is missing or stale, stop and reconcile the
  external state before any write.

## 5. Publish only after explicit approval

First re-establish the local invariant and confirm the tuple is unchanged:

```sh
make release-check
test "$(sed -n '1p' VERSION)" = "$candidate_version"
test "$(git rev-parse HEAD)" = "$candidate_sha"
test "$(git remote get-url --all "$candidate_remote")" = \
  "$candidate_remote_url"
test "$(git remote get-url --push --all "$candidate_remote")" = \
  "$candidate_remote_url"
```

Then reconcile the local tag form:

* If `local_tag=absent`, create one annotated tag at `candidate_sha`.
* If `local_tag=same-head` and `git cat-file -t
  "refs/tags/$candidate_tag"` reports `tag`, reuse that annotated tag.
* If `local_tag=same-head` reports `commit`, it is a lightweight tag. Stop and
  obtain an explicit reconciliation decision; do not silently replace, move, or
  publish it as though it were annotated.

When the tag is absent, create it and rerun the readiness gate:

```sh
git tag -a "$candidate_tag" "$candidate_sha" \
  -m "ForgeFlow protocol $candidate_version"
make release-check
```

Only after those checks pass, push that exact ref and make the GitHub Release
verify the tag instead of implicitly creating one:

```sh
git push "$candidate_remote_url" "refs/tags/$candidate_tag"
gh release create "$candidate_tag" --repo "$candidate_repository" --verify-tag \
  --title "ForgeFlow $candidate_tag" \
  --notes-file /path/to/release-notes.md
```

These are externally visible writes. Resolve the exact repository first and run
them only with explicit authorization. If local tag creation succeeds but push
does not, stop and diagnose; do not move an existing remote tag.

## 6. Verify publication

Repeat the exact-SHA CI check and remote-state inspection. Confirm that:

* the remote tag peels to `candidate_sha`;
* the published release names `candidate_tag` and has the intended publication
  state; and
* the successful required workflow still names `candidate_sha`.

Only this combined evidence establishes publication. `VERSION`, local PASS, a
tag, a release page, or a green run is insufficient on its own.
