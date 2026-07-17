# Course repo — generate the course HERE (repo root = course root)

This repository is **one course**, created from the Puffer Labs course template. When asked to build
the course, generate everything **at the repo root of THIS repository**.

**Hard rules — this is what prevents the monorepo problem:**
- **Never** create a subfolder like `courses/<slug>/` and put the course inside it. The course files
  (`docs/`, `src/`, `assets/`, `meta.json`, …) live at the repo root.
- **Never** try to create a new GitHub repo, clone another repo, or push elsewhere. This repo *is*
  the course. Commit and push to the current repo only.
- **Do not** run `new-course.sh` — the scaffold already exists here. Fill it in place.

The `course-factory` skill is bundled at `.claude/skills/course-factory/` and loads automatically
(works in the browser and in private repos — no marketplace needed).

## To generate the course

1. **Topic:** if `spec/course-spec.md` is already filled, use it. Otherwise ask the user for a
   topic (they'll usually say "generate a course on X").
2. **Invoke the course-factory skill** and follow its loop, but IN PLACE:
   - Fill `spec/course-spec.md`, `spec/curriculum-plan.md`, `spec/structure.json` from the topic.
   - Set the real values in `meta.json` (`title`, `slug`, `shortDescription`, `category`, `level`,
     `tags`, pricing) **and** the `product-slug` in `.github/workflows/sync-to-supabase.yml` (match
     the repo/course slug).
   - Generate all chapters into `docs/free/` and `docs/premium/**`, runnable code into `src/**`
     (each dir with a `README.md`), and `assets/` (banner 1400×400, thumbnail, one preview per
     section). Fan out across subagents per
     `.claude/skills/course-factory/workflows/generate-course.md`.
   - Hit the quality-rubric floors: ≥9 free docs, ≥15 premium docs, ≥4 labs (full worked
     solutions), ≥3 case studies, ≥2 cheatsheets, 1 interview guide, ≥5 code dirs.
3. **Assemble + verify (must pass):**
   ```
   node scripts/build-manifests.mjs
   bash scripts/validate-local.sh
   ```
4. **Commit and push to THIS repo:**
   ```
   git add -A && git commit -m "course: <slug> v1" && git push
   ```
   That triggers `sync-to-supabase` → Supabase → live in the storefront.

## Contract (do not violate)

Follow `.claude/skills/course-factory/references/constitution.md`. Render rules: pure GFM only —
no raw HTML, no `[[wiki-links]]` (use `[Title](contentKey)`), absolute image URLs, fenced code with
a known language, diagrams in ` ```mermaid ` fences. Manifests are **derived** by
`build-manifests.mjs` — never hand-edit them.
