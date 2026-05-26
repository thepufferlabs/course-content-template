#!/usr/bin/env bash
# Thin stub. Fetches the real validator from senapatisantosh/course-tooling
# and runs it against this repo. Update TOOLING_REF to pin a different
# version. Defaults to the floating v1 tag.
#
# Override via env:
#   COURSE_TOOLING_REF=v1.2.3 bash scripts/validate.sh
#   COURSE_TOOLING_REPO=other/fork bash scripts/validate.sh
#
# Usage:  bash scripts/validate.sh [--strict]

set -euo pipefail

REPO="${COURSE_TOOLING_REPO:-senapatisantosh/course-tooling}"
REF="${COURSE_TOOLING_REF:-v1}"
URL="https://raw.githubusercontent.com/${REPO}/${REF}/scripts/validate.sh"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export COURSE_REPO_ROOT="$ROOT"

# Fetch to a temp file so the script sees a real path (some shells dislike
# piping into `bash` for scripts that introspect $0).
TMP="$(mktemp -t validate-XXXXXX.sh)"
trap 'rm -f "$TMP"' EXIT

if ! curl -fsSL "$URL" -o "$TMP"; then
  echo "Failed to fetch $URL" >&2
  echo "Hint: set COURSE_TOOLING_REF or COURSE_TOOLING_REPO to override." >&2
  exit 2
fi

bash "$TMP" "$@"
