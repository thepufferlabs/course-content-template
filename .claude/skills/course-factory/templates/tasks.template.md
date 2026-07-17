# Tasks — <COURSE TITLE>

> **Phase 3 · Tasks.** One checkbox per generatable artifact. This is the fan-out unit: each
> unchecked doc/lab/case-study/cheatsheet task can be handed to a subagent (see
> `workflows/generate-course.md`). Derived-file and asset tasks run after content. Save at
> `spec/tasks.md`; check items off as they land so a resumed/AFK run knows what's left.

## Legend
`[ ]` todo · `[~]` in progress · `[x]` done. Each task: `contentKey` · sourcePath · access ·
acceptance (from `chapter-playbook.md` + `quality-rubric.md`).

---

## T0 · Scaffold (once)
- [ ] Run `scripts/new-course.sh <slug>` — dirs, `spec/`, `.github/`, `.content-repo`, `.gitignore`
- [ ] Copy `constitution.md` → `spec/constitution.md`
- [ ] Write `spec/course-spec.md`, `spec/curriculum-plan.md`
- [ ] Write initial `meta.json` (identity from spec; counts/`*Paths` left 0/[] for the builder)

## T1 · Free docs  (parallelizable)
- [ ] `learning-path` · docs/free/00-learning-path.md · free · overview + roadmap + how-to-use
- [ ] `<key>` · docs/free/01-<key>.md · free · spine: goal→hook→model(mermaid)→mechanics→anti-patterns→takeaways
- [ ] … one line per free doc from plan §3 …

## T2 · Premium docs  (parallelizable)
- [ ] `<key>` · docs/premium/deep-dive/NN-<key>.md · premium · internals + numbers + worked exercise
- [ ] `<key>` · docs/premium/architecture/NN-<key>.md · premium · staff-level design + when-NOT-to
- [ ] … one line per premium doc from plan §3 …

## T3 · Labs  (parallelizable; each MUST end with a full solution)
- [ ] `lab-<key>` · docs/premium/labs/NN-lab-<key>.md · premium · buildable brief + complete solution
- [ ] …

## T4 · Case studies  (parallelizable)
- [ ] `case-<key>` · docs/premium/case-studies/NN-case-<key>.md · premium · named company + metrics table + lessons
- [ ] …

## T5 · Cheatsheets  (parallelizable)
- [ ] `cheatsheet-<key>` · docs/premium/cheatsheets/NN-cheatsheet-<key>.md · premium · dense tables, no narrative
- [ ] …

## T6 · Interview / revision
- [ ] `interview-revision` · docs/premium/interview/NN-interview-revision.md · premium · 40–60 graded Qs mapped to chapters

## T7 · Runnable code  (each dir needs README.md)
- [ ] src/samples/01-<topic>/ · free · + README.md
- [ ] src/premium/NN-<topic>/ · premium · + README.md

## T8 · Blogs (optional)
- [ ] public · blog/public/01-<key>.md
- [ ] premium · blog/premium/01-<key>.md

## T9 · Assets
- [ ] assets/banner.svg (1400×400, legible title in 7:2 safe area)
- [ ] assets/thumbnail.svg (600×400)
- [ ] assets/preview/<section-id>.svg — one per section

## T10 · Assemble (derived — run scripts, do not hand-author)
- [ ] `node scripts/build-manifests.mjs` → content-index.json, sidebar.json, toc.json, tags.json,
      and correct counts + `*Paths` in meta.json
- [ ] Review generated JSON for sane sections/phases/titles

## T11 · Verify (gate to "done")
- [ ] `bash scripts/validate-local.sh` exits 0 (fix every error)
- [ ] Score against `quality-rubric.md`: ≥ 16/20, no axis < 3
- [ ] Spot-render 2–3 docs mentally against `consumer-render.md` (mermaid, images, code, no HTML)
- [ ] Print final summary + `git add/commit/push` steps that trigger the Supabase sync
