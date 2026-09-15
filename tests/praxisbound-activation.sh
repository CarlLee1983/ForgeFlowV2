#!/bin/sh

set -eu

repo=$(CDPATH='' cd -P "$(dirname "$0")/.." && pwd)
work=$(mktemp -d "${TMPDIR:-/tmp}/praxisbound-activation.XXXXXX")
work=$(CDPATH='' cd -P "$work" && pwd)
trap 'rm -rf "$work"' 0
trap 'exit 1' HUP INT TERM
selected=$*
run_case() {
  case " $selected " in *" $1 "*|'  ') ;; *) return 0 ;; esac
  "$2"
  printf 'PASS %s %s\n' "$1" "$2"
}
fail() { printf 'FAIL %s\n' "$*" >&2; exit 1; }

fresh() {
  target=$work/fresh
  mkdir "$target"
  "$repo/scripts/bootstrap" "$target" >/dev/null
  printf 'prefix\r\npolicy without final newline' >"$target/AGENTS.md"
  before=$(cksum <"$target/AGENTS.md")
  "$repo/scripts/codex-activate" "$target" >/dev/null
  [ "$before" = "$(cksum <"$target/AGENTS.md")" ] || fail preview-wrote-target
  "$repo/scripts/codex-activate" --apply "$target" >/dev/null
  [ -f "$target/.agents/skills/praxisbound/.praxisbound-snapshot" ] || fail missing-current-snapshot
  [ ! -e "$target/.agents/skills/forgeflow" ] || fail legacy-on-fresh
  grep -Fq '<!-- PraxisBound Codex: begin -->' "$target/AGENTS.md" || fail missing-current-block
  skill="$target/.agents/skills/praxisbound/SKILL.md"
  grep -Fq 'For "continue development" (including "繼續開發")' "$skill" ||
    fail current-skill-lost-continue-contract
  grep -Fq 'REVIEW awaits a human decision;' "$skill" ||
    fail current-skill-lost-review-contract
  grep -Fq 'DONE is not reopened.' "$skill" ||
    fail current-skill-lost-done-contract
  grep -Fq 'Present the draft for human approval before coding.' "$skill" ||
    fail current-skill-lost-new-story-approval
}

seed_legacy_activation() {
  target=$1
  mkdir "$target"
  "$repo/scripts/bootstrap" "$target" >/dev/null
  mkdir -p "$target/.agents/skills/forgeflow"
  cp "$repo/skills/praxisbound/SKILL.md" "$target/.agents/skills/forgeflow/SKILL.md"
  cp "$repo/skills/story-development/SKILL.md" "$target/.agents/skills/forgeflow/story-development.md"
  version=0.9.0
  block=$work/legacy-block
  { printf '%s\n' '<!-- ForgeFlow Codex: begin -->' "<!-- snapshot version=$version revision=unknown adoption=unknown -->"; printf 'legacy block\n'; printf '%s\n' '<!-- ForgeFlow Codex: end -->'; } >"$block"
  { printf 'prefix\r\n'; cat "$block"; printf 'suffix without final newline'; } >"$target/AGENTS.md"
  { printf 'format=1\nversion=%s\nrevision=unknown\nadoption=unknown\n' "$version"; printf 'skill=%s\nworkflow=%s\nblock=%s\n' "$(cksum <"$target/.agents/skills/forgeflow/SKILL.md")" "$(cksum <"$target/.agents/skills/forgeflow/story-development.md")" "$(cksum <"$block")"; } >"$target/.agents/skills/forgeflow/.forgeflow-snapshot"
}

migration() {
  seed_legacy_activation "$work/legacy"
  before=$(cksum <"$target/AGENTS.md")
  "$repo/scripts/codex-activate" "$target" >/dev/null
  [ "$before" = "$(cksum <"$target/AGENTS.md")" ] || fail migration-preview-wrote-target
  "$repo/scripts/codex-activate" --apply "$target" >/dev/null
  [ ! -e "$target/.agents/skills/forgeflow" ] || fail legacy-not-removed
  [ -f "$target/.agents/skills/praxisbound/.praxisbound-snapshot" ] || fail current-not-installed
  printf 'suffix without final newline' >"$work/expected-suffix"
  tail -c "$(wc -c <"$work/expected-suffix" | tr -d '[:space:]')" "$target/AGENTS.md" >"$work/actual-suffix"
  cmp -s "$work/expected-suffix" "$work/actual-suffix" || fail suffix-not-preserved
}

legacy_removal_failure_recovers() {
  mkdir -p "$work/fault-bin"
  for fault in rm rmdir; do
    seed_legacy_activation "$work/legacy-fault-$fault"
    find "$target" -type d -print | LC_ALL=C sort >"$work/$fault-before-directories"
    find "$target" -type f -exec cksum {} \; | LC_ALL=C sort >"$work/$fault-before-files"
    fired="$work/$fault-fired"
    if [ "$fault" = rm ]; then
      printf '%s\n' '#!/bin/sh' \
        'for member in "$@"; do' \
        '  case "$member" in */.agents/skills/forgeflow/SKILL.md)' \
        '    if [ ! -e "$fault_fired" ]; then' \
        '      : >"$fault_fired"; /bin/rm "$member"; exit 1' \
        '    fi ;; esac' \
        'done' 'exec /bin/rm "$@"' >"$work/fault-bin/rm"
    else
      printf '%s\n' '#!/bin/sh' \
        'case "$1" in */legacy-fault-rmdir/.agents/skills/forgeflow)' \
        '  if [ ! -e "$fault_fired" ]; then : >"$fault_fired"; exit 1; fi ;;' \
        'esac' 'exec /bin/rmdir "$@"' >"$work/fault-bin/rmdir"
    fi
    chmod 755 "$work/fault-bin/$fault"
    if fault_target="$target" fault_fired="$fired" \
      PATH="$work/fault-bin:/bin:/usr/bin" \
      "$repo/scripts/codex-activate" --apply "$target" >/dev/null 2>&1; then
      fail "legacy-$fault-failure-succeeded"
    fi
    [ -f "$fired" ] || fail "legacy-$fault-fault-not-fired"
    find "$target" -type d -print | LC_ALL=C sort >"$work/$fault-after-directories"
    find "$target" -type f -exec cksum {} \; | LC_ALL=C sort >"$work/$fault-after-files"
    cmp -s "$work/$fault-before-directories" "$work/$fault-after-directories" ||
      fail "legacy-$fault-recovery-changed-directories"
    cmp -s "$work/$fault-before-files" "$work/$fault-after-files" ||
      fail "legacy-$fault-recovery-changed-files"
    rm -f "$work/fault-bin/$fault"
  done
}

unsupported_legacy_version_refuses() {
  seed_legacy_activation "$work/unsupported-version"
  sed 's/version=0.9.0/version=0.8.0/' \
    "$target/.agents/skills/forgeflow/.forgeflow-snapshot" \
    >"$work/unsupported-snapshot"
  mv "$work/unsupported-snapshot" "$target/.agents/skills/forgeflow/.forgeflow-snapshot"
  sed 's/snapshot version=0.9.0/snapshot version=0.8.0/' \
    "$target/AGENTS.md" >"$work/unsupported-agents"
  mv "$work/unsupported-agents" "$target/AGENTS.md"
  before=$(cksum <"$target/AGENTS.md")
  if "$repo/scripts/codex-activate" --apply "$target" >/dev/null 2>&1; then
    fail unsupported-legacy-version-accepted
  fi
  [ "$before" = "$(cksum <"$target/AGENTS.md")" ] ||
    fail unsupported-legacy-version-mutated-target
  [ ! -e "$target/.agents/skills/praxisbound" ] ||
    fail unsupported-legacy-version-installed-current
}

legacy_unsafe_inputs_refuse() {
  for fault in symlink edited-skill edited-snapshot repeated-block unknown-file; do
    seed_legacy_activation "$work/legacy-unsafe-$fault"
    case "$fault" in
      symlink)
        mv "$target/.agents/skills/forgeflow" "$work/legacy-symlink-owned"
        ln -s "$work/legacy-symlink-owned" "$target/.agents/skills/forgeflow" ;;
      edited-skill)
        printf 'local edit\n' >>"$target/.agents/skills/forgeflow/SKILL.md" ;;
      edited-snapshot)
        printf 'malformed\n' >>"$target/.agents/skills/forgeflow/.forgeflow-snapshot" ;;
      repeated-block)
        cat "$work/legacy-block" >>"$target/AGENTS.md" ;;
      unknown-file)
        printf 'owned by adopter\n' >"$target/.agents/skills/forgeflow/unknown.md" ;;
    esac
    before=$(cksum <"$target/AGENTS.md")
    if "$repo/scripts/codex-activate" "$target" >/dev/null 2>&1; then
      fail "legacy-$fault-preview-accepted"
    fi
    if "$repo/scripts/codex-activate" --apply "$target" >/dev/null 2>&1; then
      fail "legacy-$fault-apply-accepted"
    fi
    [ "$before" = "$(cksum <"$target/AGENTS.md")" ] ||
      fail "legacy-$fault-refusal-mutated-agents"
    [ ! -e "$target/.agents/skills/praxisbound" ] ||
      fail "legacy-$fault-refusal-installed-current"
  done
}

legacy_incomplete_recovery_retains_artifacts() {
  seed_legacy_activation "$work/legacy-unrestored"
  original=$(cksum <"$target/.agents/skills/forgeflow/SKILL.md")
  mkdir -p "$work/incomplete-bin"
  fired=$work/incomplete-fired
  printf '%s\n' '#!/bin/sh' \
    'for member in "$@"; do' \
    '  case "$member" in */.agents/skills/forgeflow/SKILL.md)' \
    '    if [ ! -e "$fault_fired" ]; then' \
    '      : >"$fault_fired"; /bin/rm "$member"; exit 1' \
    '    fi ;; esac' \
    'done' 'exec /bin/rm "$@"' >"$work/incomplete-bin/rm"
  printf '%s\n' '#!/bin/sh' \
    'for member in "$@"; do' \
    '  case "$member" in */.agents/skills/forgeflow/SKILL.md)' \
    '    [ ! -e "$fault_fired" ] || exit 1 ;; esac' \
    'done' 'exec /bin/mv "$@"' >"$work/incomplete-bin/mv"
  chmod 755 "$work/incomplete-bin/rm" "$work/incomplete-bin/mv"
  if TMPDIR="$work" fault_fired="$fired" PATH="$work/incomplete-bin:/bin:/usr/bin" \
    "$repo/scripts/codex-activate" --apply "$target" >"$work/incomplete-out" 2>"$work/incomplete-error"; then
    fail incomplete-legacy-restoration-succeeded
  fi
  [ -f "$fired" ] || fail incomplete-recovery-fault-not-fired
  grep -Fq "UNRESTORED: $target/.agents/skills/forgeflow/SKILL.md" "$work/incomplete-error" ||
    fail incomplete-recovery-did-not-name-file
  grep -Fq 'Recovery copies retained:' "$work/incomplete-error" ||
    fail incomplete-recovery-did-not-name-backups
  [ ! -f "$target/.agents/skills/praxisbound/.praxisbound-snapshot" ] ||
    fail incomplete-recovery-claimed-current
  [ ! -f "$target/.agents/skills/forgeflow/SKILL.md" ] || fail incomplete-recovery-claimed-legacy
  backup=$(find "$work" -path '*/praxisbound-activate.*/legacy-SKILL.md' -type f -print)
  [ -n "$backup" ] && [ "$original" = "$(cksum <"$backup")" ] ||
    fail incomplete-recovery-lost-original
  grep -Fq "Recovery copies retained: ${backup%/legacy-SKILL.md}" "$work/incomplete-error" ||
    fail incomplete-recovery-did-not-name-exact-artifact
}

safety() {
  target=$work/unsafe
  mkdir "$target"
  "$repo/scripts/bootstrap" "$target" >/dev/null
  printf 'policy\n' >"$target/AGENTS.md"
  "$repo/scripts/codex-activate" --apply "$target" >/dev/null
  mkdir -p "$target/.agents/skills/forgeflow"
  before=$(cksum <"$target/AGENTS.md")
  if "$repo/scripts/codex-activate" "$target" >/dev/null 2>&1; then fail dual-identity-accepted; fi
  [ "$before" = "$(cksum <"$target/AGENTS.md")" ] || fail refusal-mutated-target
}

run_case PB002-AC-001 fresh
run_case PB002-AC-002 migration
run_case PB002-AC-003 safety
run_case PB002-AC-003 legacy_removal_failure_recovers
run_case PB002-AC-003 unsupported_legacy_version_refuses
run_case PB002-AC-003 legacy_unsafe_inputs_refuse
run_case PB002-AC-003 legacy_incomplete_recovery_retains_artifacts
