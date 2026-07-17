#!/usr/bin/env bash
# new-course.sh — scaffold an empty premium-content-repo ready for the SDD loop.
# Creates the directory tree, CI workflows, markers, spec/ (constitution + templates),
# a seeded meta.json, and vendors the two scripts. Safe to run in an empty dir or a
# repo made from course-content-template.
#
# Usage:  bash new-course.sh <slug> [targetDir]
#   e.g.  bash new-course.sh system-design-patterns-mastery .

set -euo pipefail
SLUG="${1:?usage: new-course.sh <slug> [targetDir]}"
DEST="${2:-$SLUG}"
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"   # the skill/plugin root (contains references/, templates/)

mkdir -p "$DEST"
DEST="$(cd "$DEST" && pwd)"
echo "Scaffolding course '$SLUG' in $DEST"

mkdir -p "$DEST"/docs/free \
         "$DEST"/docs/premium/{deep-dive,architecture,labs,case-studies,cheatsheets,interview} \
         "$DEST"/docs/shared \
         "$DEST"/src/samples "$DEST"/src/premium \
         "$DEST"/blog/public "$DEST"/blog/premium \
         "$DEST"/assets/preview \
         "$DEST"/data "$DEST"/spec "$DEST"/scripts \
         "$DEST"/.github/workflows

# markers
: > "$DEST/.content-repo"
touch "$DEST/assets/preview/.gitkeep"
cat > "$DEST/.gitignore" <<'EOF'
.DS_Store
node_modules/
.idea/
.vscode/
*.log
EOF

# Claude Code project settings: auto-enable the course-factory plugin so anyone who opens this
# course repo (CLI, IDE, or claude.ai/code in the browser) gets the skill without manual install.
# Override the marketplace repo with COURSE_FACTORY_MARKETPLACE=owner/repo.
MARKETPLACE_REPO="${COURSE_FACTORY_MARKETPLACE:-thepufferlabs/course-studio}"
mkdir -p "$DEST/.claude"
cat > "$DEST/.claude/settings.json" <<EOF
{
  "extraKnownMarketplaces": {
    "puffer-course-studio": {
      "source": { "source": "github", "repo": "$MARKETPLACE_REPO" }
    }
  },
  "enabledPlugins": {
    "course-factory@puffer-course-studio": true
  }
}
EOF

# spec: immutable constitution + fill-in templates
cp "$SKILL_DIR/references/constitution.md"            "$DEST/spec/constitution.md"
cp "$SKILL_DIR/templates/course-spec.template.md"     "$DEST/spec/course-spec.md"
cp "$SKILL_DIR/templates/curriculum-plan.template.md" "$DEST/spec/curriculum-plan.md"
cp "$SKILL_DIR/templates/tasks.template.md"           "$DEST/spec/tasks.md"
# structure.json stub (consumed by build-manifests.mjs for section titles/icons + phases)
cat > "$DEST/spec/structure.json" <<'EOF'
{ "sections": [], "phases": [] }
EOF

# vendored scripts (so the course repo is self-contained)
cp "$SKILL_DIR/scripts/build-manifests.mjs" "$DEST/scripts/build-manifests.mjs"
cp "$SKILL_DIR/scripts/validate-local.sh"   "$DEST/scripts/validate-local.sh"
chmod +x "$DEST/scripts/validate-local.sh"

# seeded meta.json
sed "s/<COURSE_SLUG>/$SLUG/g" "$SKILL_DIR/templates/meta.template.json" > "$DEST/meta.json"

# CI: sync + validate
cat > "$DEST/.github/workflows/sync-to-supabase.yml" <<EOF
name: Sync to Supabase
on:
  push:
    branches: [main]
    paths: ["docs/**","blog/**","src/**","assets/**","meta.json","data/**",".content-repo"]
  workflow_dispatch:
jobs:
  gate:
    runs-on: ubuntu-latest
    outputs:
      ready: \${{ steps.check.outputs.ready }}
    steps:
      - uses: actions/checkout@v4
      - id: check
        run: |
          slug=\$(node -p "require('./meta.json').slug" 2>/dev/null || echo "")
          docs=\$(find docs/free docs/premium -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
          if [ "\$docs" = "0" ] || [ "\$slug" = "your-course-slug" ] || [ -z "\$slug" ]; then
            echo "Un-filled scaffold / template (slug=\$slug, docs=\$docs) — skipping sync."
            echo "ready=false" >> "\$GITHUB_OUTPUT"
          else
            echo "ready=true" >> "\$GITHUB_OUTPUT"
          fi
  sync:
    needs: gate
    if: needs.gate.outputs.ready == 'true'
    uses: thepufferlabs/ci-reusable-actions-workflows/.github/workflows/sync-course-content.yml@main
    with:
      product-slug: $SLUG
      content-branch: main
    secrets:
      SUPABASE_URL: \${{ secrets.SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: \${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
EOF
cat > "$DEST/.github/workflows/validate.yml" <<'EOF'
name: Validate
on: { push: { branches: [main] }, pull_request: {}, workflow_dispatch: {} }
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: bash scripts/validate-local.sh
EOF

echo "✓ scaffold complete"
echo "  next: fill spec/course-spec.md → spec/curriculum-plan.md → spec/tasks.md, then generate,"
echo "        then: node scripts/build-manifests.mjs && bash scripts/validate-local.sh"
