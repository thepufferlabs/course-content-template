# Course Content Template — Puffer Labs

A GitHub **template repository**. Each course is its **own separate repo** made from this template —
no monorepo. The `course-factory` skill is bundled inside, so a fresh repo is ready to generate a
full course with one prompt, even in the browser and even when private.

## Make a new course (≈2 minutes of your time)

1. On GitHub, click **Use this template → Create a new repository** and name it after the course
   (e.g. `redis-mastery`). This creates a brand-new, standalone repo.
2. Open that repo in **Claude Code** — the browser (claude.ai/code) or the CLI. The bundled skill
   loads automatically; `CLAUDE.md` tells the agent to generate into this repo's root.
3. Say: **"Generate a course on Redis"** (or fill `spec/course-spec.md` first for more control).
   The agent writes the spec, ~25+ chapters, labs, case studies, cheatsheets, runnable code, and
   assets, derives the manifests, validates, and commits.
4. It pushes → the `sync-to-supabase` workflow publishes the course to the storefront.

## What's inside

```
CLAUDE.md                       ← standing instructions (generate here; never a subfolder/new repo)
.claude/skills/course-factory/  ← the bundled skill (self-contained; no marketplace needed)
spec/                           ← constitution (contract) + spec/plan/tasks forms
docs/ src/ assets/ blog/ data/  ← empty structure the agent fills
scripts/                        ← build-manifests.mjs, validate-local.sh
.github/workflows/              ← sync-to-supabase.yml (+ validate.yml)
meta.json  .content-repo        ← course metadata + sync trigger marker
```

## One-time GitHub setup

- Mark this repo as a template: **Settings → General → ✅ Template repository**.
- Provide the sync secrets (repo- or org-level): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Keeping the bundled skill fresh

The skill is a snapshot under `.claude/skills/course-factory/`. When you improve the factory in the
`course-studio` repo, refresh this template with:
```bash
rm -rf .claude/skills/course-factory
cp -R /path/to/course-studio/plugins/course-factory .claude/skills/course-factory
git commit -am "refresh bundled course-factory skill"
```
New repos made from the template then pick up the update. (Existing course repos keep their copy —
re-copy into them if you want the latest.)
