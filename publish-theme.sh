#!/usr/bin/env bash
# publish-theme.sh — the COMPLETE deploy for a V3 marketplace theme.
#
# A theme release is only "live in the hub" when BOTH halves happen:
#   • the bundle files are on R2, AND
#   • a marketplace catalog version row points at them (status=published).
# Doing only the first (what `_deploy-bundle-r2.py` does on its own) ships the
# fix to stores already on that version, but the hub shows NO "update
# available" — the trap this script exists to prevent.
#
# Full chain per theme:
#   1. [--bump]  bump the patch version in <theme>/theme.json
#   2.           build the bundle           (npm run build → dist/)
#   3.           upload dist/ to R2 at <id>/<version>/   (_deploy-bundle-r2.py)
#   4.           register the version in the marketplace catalog so it becomes
#                the latest published "update"   (NUMU-api seed_marketplace_theme.py)
#
# Credentials are read from the environment and never printed:
#   NUMU_R2_ENV      file with S3_* R2 creds          (required — for step 3)
#   POSTGRES_HOST/PORT/USER/PASSWORD/DB/SSLMODE        target DB for step 4
#                    (point at the prod Supabase session pooler to publish prod)
#   THEME_BUNDLE_BASE   bundle CDN base   (default https://cdn.numueg.app)
#   NUMU_API_DIR        path to NUMU-api  (default ../NUMU-api — has venv + seed)
#
# Usage:
#   NUMU_R2_ENV=/path/.r2.env POSTGRES_HOST=... POSTGRES_USER=... POSTGRES_PASSWORD=... \
#   POSTGRES_DB=postgres POSTGRES_PORT=5432 POSTGRES_SSLMODE=require \
#     ./publish-theme.sh [--bump] <theme-dir> [<theme-dir> ...]
#   ./publish-theme.sh --bump all          # every *-engine-V3 except broken builds
set -euo pipefail

THEMES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="${NUMU_API_DIR:-$(cd "$THEMES_DIR/../NUMU-api" && pwd)}"
PY="$API_DIR/venv/Scripts/python.exe"; [ -x "$PY" ] || PY="$API_DIR/venv/bin/python"
SEED="$API_DIR/scripts/seed_marketplace_theme.py"
export THEME_BUNDLE_BASE="${THEME_BUNDLE_BASE:-https://cdn.numueg.app}"

[ -n "${NUMU_R2_ENV:-}" ] || { echo "ERROR: set NUMU_R2_ENV to a file with S3_* R2 creds"; exit 1; }
[ -f "$SEED" ] || { echo "ERROR: seed script not found at $SEED (set NUMU_API_DIR)"; exit 1; }

BUMP=0; [ "${1:-}" = "--bump" ] && { BUMP=1; shift; }
[ "$#" -ge 1 ] || { echo "usage: $0 [--bump] <theme-dir|all> ..."; exit 2; }

# Resolve the target list.
if [ "${1:-}" = "all" ]; then set -- "$THEMES_DIR"/*-engine-V3; fi

bump_patch() { # $1 = path to theme.json → prints new version, edits in place
  node -e '
    const fs=require("fs");const p=process.argv[1];let s=fs.readFileSync(p,"utf8");
    const m=s.match(/"version"\s*:\s*"(\d+)\.(\d+)\.(\d+)"/);
    if(!m){console.error("no version in "+p);process.exit(1);}
    const nv=`${m[1]}.${m[2]}.${Number(m[3])+1}`;
    fs.writeFileSync(p,s.replace(/("version"\s*:\s*")\d+\.\d+\.\d+(")/,`$1${nv}$2`));
    process.stdout.write(nv);' "$1"
}

for d in "$@"; do
  d="${d%/}"; name="$(basename "$d")"
  [ -f "$d/theme.json" ] || { echo "SKIP $name (no theme.json)"; continue; }
  d="$(cd "$d" && pwd)"   # absolute — the seed runs from $API_DIR and reads THEME_DIR

  if [ "$BUMP" = 1 ]; then VER="$(bump_patch "$d/theme.json")"; else
    VER="$(node -e "process.stdout.write(require('$d/theme.json').version)")"; fi
  ID="$(node -e "process.stdout.write(require('$d/theme.json').id)")"
  echo "===== $ID -> $VER ====="

  ( cd "$d" && npm run build >/tmp/publish_"$name".log 2>&1 ) \
    || { echo "  BUILD FAIL — see /tmp/publish_$name.log"; tail -3 /tmp/publish_"$name".log; continue; }
  DV="$(node -e "process.stdout.write(require('$d/dist/theme.json').version)")"
  [ "$DV" = "$VER" ] || { echo "  VERSION MISMATCH dist=$DV expected=$VER — aborting this theme"; continue; }

  python "$THEMES_DIR/_deploy-bundle-r2.py" "$ID" "$VER" "$d/dist" 2>&1 \
    | { grep -E "Uploaded|Error" || true; } | sed 's/^/  R2: /'
  ( cd "$API_DIR" && THEME_DIR="$d/dist" "$PY" "$SEED" 2>&1 \
    | { grep -E "\[seed\]|\[update\]|Done\.|Error|Traceback" || true; } | tail -2 | sed 's/^/  DB: /' )
done
echo "===== publish-theme: done ====="
