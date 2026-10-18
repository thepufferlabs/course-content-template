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

## Rich lesson content

Lessons are plain Markdown. Interactive pieces — discussion/concept callouts, four-colour flow and
sequence diagrams (with a step player), quizzes, pros/cons, parameter tables and demos — are fenced
blocks (` ```quiz `, ` ```flow `, …) rendered by `@thepufferlabs/course-ui` in the viewer. The bundled
skill emits them; the syntax lives in
`.claude/skills/course-factory/references/rich-content.md` with copy-paste bodies in
`.claude/skills/course-factory/templates/rich-blocks.snippets.md`.

## One-time GitHub setup

- Mark this repo as a template: **Settings → General → ✅ Template repository**.
- Provide the sync secrets (repo- or org-level): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Pushing template updates to every course repo

"Use this template" is a one-time copy, so on its own an existing course never sees later changes.
This repo closes that gap: `template-sync.json` lists the paths the template **owns** in every
course repo (the bundled skill, `CLAUDE.md`, scripts, the contract, the workflows), and
`.github/workflows/template-sync.yml` copies them into each course repo and commits, on every push
to `main` that touches one of those paths. Course content and metadata are never touched.

- **How courses are found:** every repo under the downstream owner carrying the GitHub topic
  `premium-content-repo` and a `meta.json` at its root. Tag the existing ones once with
  `bash scripts/template-sync/bootstrap.sh --apply` (run without `--apply` to preview; it finds
  every repo with a `meta.json`).
- **Older courses** (generated before this template, default branch `claude/…`, no workflows) are
  skipped by default. Run the workflow once with `include_legacy` to adopt them: they receive the
  skill, `CLAUDE.md`, scripts, the contract and the workflows, and the managed Supabase sync works
  on any default branch.
- **Opt out** a repo by committing an empty `.template-sync-ignore` at its root.
- **Secret:** `TEMPLATE_SYNC_TOKEN` on this repo — a fine-grained PAT of the downstream account with
  Contents, Pull requests and Workflows read/write (plus Metadata read) on the course repos.
- **Manual runs:** *Actions → Template sync → Run workflow* lets you dry-run, target specific repos,
  open pull requests instead of pushing (`mode: pr`), or include legacy repos whose default branch
  is not `main`. Locally: `node scripts/template-sync/sync.mjs --dry-run`.
- **Adding a shared file:** put it in this repo, add its path to `template-sync.json`
  **and** to the `paths:` trigger list in `template-sync.yml`.

The course-factory skill is still a snapshot copied from the `course-studio` repo; refresh it here
and the sync delivers it everywhere.
