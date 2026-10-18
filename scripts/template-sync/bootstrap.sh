#!/usr/bin/env bash
# One-time: find the course repos under the downstream owner and tag them with the discovery
# topic so template-sync.yml picks them up. Dry by default; pass --apply to add the topic.
#
#   bash scripts/template-sync/bootstrap.sh            # report only
#   bash scripts/template-sync/bootstrap.sh --apply    # add the topic to every course repo
set -euo pipefail
cd "$(dirname "$0")/../.."

owner=$(node -p "require('./template-sync.json').downstream.owner")
topic=$(node -p "require('./template-sync.json').downstream.topic")
marker=$(node -p "require('./template-sync.json').downstream.marker || 'meta.json'")
apply=false; [ "${1:-}" = "--apply" ] && apply=true

printf '%-60s %-10s %-8s %-6s %s\n' REPO BRANCH LAYOUT TOPIC ACTION
gh repo list "$owner" --limit 500 --json nameWithOwner,defaultBranchRef,repositoryTopics,isArchived \
  -q '.[] | select(.isArchived|not) | [.nameWithOwner, .defaultBranchRef.name, ([.repositoryTopics[]?.name]|join(","))] | @tsv' |
while IFS=$'\t' read -r repo branch topics; do
  # a course repo carries the sync marker at its root
  gh api "repos/$repo/contents/$marker?ref=$branch" --silent >/dev/null 2>&1 || continue
  layout=legacy
  gh api "repos/$repo/contents/.claude/skills/course-factory/SKILL.md?ref=$branch" --silent >/dev/null 2>&1 && layout=template
  has_topic=no; [[ ",$topics," == *",$topic,"* ]] && has_topic=yes
  action=-
  if [ "$has_topic" = no ]; then
    if $apply; then gh repo edit "$repo" --add-topic "$topic" >/dev/null && action=tagged; else action="would tag"; fi
  fi
  printf '%-60s %-10s %-8s %-6s %s\n' "$repo" "$branch" "$layout" "$has_topic" "$action"
done
