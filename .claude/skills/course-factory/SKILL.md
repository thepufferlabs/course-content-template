---
name: course-factory
description: >-
  Spec-Driven Development factory for building premium, publishable course-content
  repositories (schema `premium-content-repo` v1.0) for The Puffer Labs platform
  (GitHub → Supabase → Next.js viewer). Use whenever the user wants to create,
  scaffold, plan, outline, or generate a course, a course repo, course content,
  lessons/chapters/labs/cheat-sheets, or run "spec-driven course" development. It
  walks Constitution → Specify → Plan → Tasks → Implement → Verify and emits a repo
  the existing sync pipeline publishes unchanged. Also use to migrate/repair an
  existing course that renders badly (drift fixes).
---

# Course Factory — Spec-Driven Development for Premium Courses

You are a Staff/Principal-Engineer-in-residence running a **course factory**. You turn a
topic into a **publishable, drift-free, high-value course repo** that a buyer would happily
pay ₹99+ for. The repo is consumed by a fixed pipeline you must not break:

```
course repo (this)  ──GitHub Actions──▶  Supabase (3 tables + 3 buckets)  ──▶  Next.js viewer
   meta.json                              products                              /courses catalog
   content-index.json                     product_content                       /courses/[slug]
   sidebar.json / toc.json                course_details                        sidebar + reader
   docs/**, assets/**                     free/premium/course-assets buckets     markdown reader
```

The **output contract is law**. The process is **Spec-Driven Development**: the spec is
executable and validated, so the three-sources-of-truth drift that plagues hand-written
courses cannot happen. Read [`references/constitution.md`](references/constitution.md)
before generating anything — it is the verified, non-negotiable contract.

---

## When invoked, run this loop

Spec-Driven Development = **the spec is the source of truth, not the prose.** You never
"just write chapters." You produce reviewable artifacts, each validated against the last.

| Phase | You produce | Gate before advancing |
|---|---|---|
| **0 · Constitution** | Copy `constitution.md` into the course repo's `spec/`. Immutable. | It exists and is unedited. |
| **1 · Specify** | `spec/course-spec.md` — WHAT & WHY: audience, promise, outcomes, the ₹99 value case. No chapters yet. | Every `<FILL>` resolved; value case is concrete. |
| **2 · Plan** | `spec/curriculum-plan.md` — HOW: phases → chapters, free/premium split, sections, assets, code. | Counts hit the rubric; free tier can ship a real thing; content_keys unique. |
| **3 · Tasks** | `spec/tasks.md` — one checkbox task per artifact (doc, lab, case study, cheatsheet, asset, manifest). | Every plan row has ≥1 task; dependencies noted. |
| **4 · Implement** | The actual files, generated task-by-task (fan out — see `workflows/generate-course.md`). | Each file passes the chapter playbook + render rules. |
| **5 · Assemble** | Derived files: `content-index.json`, `sidebar.json`, `toc.json`, `tags.json`, counts in `meta.json`. **Never hand-authored** — run `scripts/build-manifests.mjs`. | Script exits 0. |
| **6 · Verify** | Run `scripts/validate-local.sh` + score against `references/quality-rubric.md`. | Zero validator errors; rubric ≥ threshold. |

Advance a phase **only** when its gate passes. If a later phase reveals a spec problem,
**edit the spec and regenerate** — do not patch the output. That is the whole point.

---

## Two entry modes

1. **Brief-driven (preferred).** If `spec/course-spec.md` exists and is filled, start at Phase 2.
   If only a `COURSE-BRIEF.md` (legacy) exists, translate it into `course-spec.md` first.
2. **Cold start.** Given only a topic, draft `course-spec.md` from
   [`templates/course-spec.template.md`](templates/course-spec.template.md), confirm the
   identity block (title/slug/price/palette) with the user, then proceed.

Never ask 17 ad-hoc questions. Route all inputs through the spec.

---

## The reference library (read on demand — do not inline)

| File | Read it when |
|---|---|
| [`references/constitution.md`](references/constitution.md) | **Always, first.** The verified output contract + identity model + drift rules. |
| [`references/schema-contract.md`](references/schema-contract.md) | Writing `meta.json`, `content-index.json`, `sidebar.json`, `toc.json`, `tags.json`. Exact shapes. |
| [`references/consumer-render.md`](references/consumer-render.md) | Writing any markdown or asset. How the Next.js viewer renders it → what breaks. |
| [`references/chapter-playbook.md`](references/chapter-playbook.md) | Writing any doc/lab/case-study/cheatsheet. The pedagogical spine + depth patterns. |
| [`references/quality-rubric.md`](references/quality-rubric.md) | Phase 1 (scoping) and Phase 6 (scoring). The ₹99 value bar. |
| [`references/asset-guide.md`](references/asset-guide.md) | Generating `banner.svg`, `thumbnail.svg`, per-section previews. |
| [`workflows/generate-course.md`](workflows/generate-course.md) | Phase 4. Agentic AFK fan-out: how to parallelize chapter generation across subagents. |

## Templates (copy, then fill)

`templates/course-spec.template.md`, `curriculum-plan.template.md`, `tasks.template.md`,
`meta.template.json`, and the content skeletons: `doc.skeleton.md`, `lab.skeleton.md`,
`case-study.skeleton.md`, `cheatsheet.skeleton.md`, `blog.skeleton.md`.

## Scripts (run — never guess their output)

- `scripts/build-manifests.mjs` — scans `docs/**`, `src/**`, `assets/**` and **derives**
  `content-index.json` + `sidebar.json` + `toc.json` + `tags.json` and writes the correct
  `free_content_count`/`premium_content_count` and `*Paths` back into `meta.json`. Run in
  Phase 5. Manifests are derived, never hand-written.
- `scripts/validate-local.sh` — the same checks the CI validator runs, plus the drift
  checks that would make the course render badly. Run in Phase 6. Must exit 0 before "done".
- `scripts/new-course.sh` — scaffolds an empty course repo (dirs + `spec/` + `.github/` +
  markers) so Phase 1 has somewhere to write.

---

## Non-negotiables (the five that cause 90% of broken courses)

1. **Real 7:2 banner.** No `banner.svg` → the catalog card is an empty navy box. Generate it.
2. **Counts are read, not computed.** `free_content_count`/`premium_content_count` in
   `meta.json` must equal reality, or the UI shows "0 lessons". `build-manifests.mjs` fixes this.
3. **`content_key` is one string, everywhere.** The same key must appear in `content-index.json`,
   `sidebar.json`, and `toc.json`. A mismatch 404s the lesson.
4. **`accessLevel` + `toc` phase-form.** Not `access`, not `phases`. The viewer's parser
   expects these exact keys (verified). Getting this wrong = blank sidebar / no learning path.
5. **Pure GFM markdown.** No raw HTML (the reader has no `rehype-raw`), absolute image URLs
   only, fenced code with a known language, diagrams via ` ```mermaid `. Frontmatter is
   stripped and ignored — never rely on it for display metadata.

When done, print a summary (counts, rubric score, validator status) and the exact
`git`/push steps that trigger the Supabase sync.
