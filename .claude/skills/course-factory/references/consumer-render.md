# Consumer Render Rules — design for the viewer that actually exists

The Next.js viewer (`thepufferlabs-2`) is deliberately minimal. Content that ignores its
constraints renders broken even when the JSON is perfect. These rules are derived from the
real components (`MarkdownRenderer.tsx`, `CodeBlock.tsx`, `MermaidDiagram.tsx`,
`content-loader.ts`, `EnhancedCourseCard`, the overview page). Follow them exactly.

---

## The rendering stack (what you get, and only this)

| Layer | Library | Consequence for authors |
|---|---|---|
| Markdown | `react-markdown` + `remark-gfm` | GFM only: tables, task lists, strikethrough, footnotes, autolinks. |
| Raw HTML | **none** (`rehype-raw` absent) | Any `<tag>` renders as literal text. **Never use HTML.** |
| Headings | `rehype-slug` | `##`/`###` get anchor IDs automatically. Use a clean heading hierarchy. |
| Code | Shiki (`night-owl`/`github-light`) | Fence every block with a **known** language or it renders unstyled. |
| Diagrams | Mermaid, recolored to brand, zoomable | ` ```mermaid ` is first-class. Prefer it. Parse errors fall back to a code block. |
| Images | plain lazy `<img src>` | **Relative paths break.** Use absolute `course-assets` URLs only. |
| Frontmatter | stripped, never parsed | Not a metadata source. Manifests are. |

---

## Authoring do / don't

**DO**
- Write pure GFM. Lead with prose and mental models; use tables for comparisons and lookups.
- Use ` ```mermaid ` for every architectural idea (flowchart LR for pipelines, sequenceDiagram
  for request timelines, stateDiagram-v2 for lifecycles, classDiagram only for data models).
- Fence code with a real language tag. Keep runnable examples runnable; annotate with comments.
- Reference images as
  `${SUPABASE_URL}/storage/v1/object/public/course-assets/<slug>/assets/<file>.svg`.
- Link between lessons with the sibling's markdown filename or its `contentKey` — the reader's
  `linkMap` resolves `[text](08-caching-strategies.md)`, `[text](caching-strategies)`, and the
  numeric-stripped form to the right lesson. Prefer `[text](caching-strategies.md)`.
- Keep code blocks that need line numbers > 5 lines (the reader shows line numbers past 5).

**DON'T**
- No `<div>`, `<br>`, `<details>`, `<summary>`, `<sub>`, `<kbd>`, `<img>` tags, HTML comments,
  or inline styles. They print as text.
- No relative image paths (`./assets/x.svg`, `../x.png`) — they 404 silently.
- No `[[wiki-links]]`. The reader has no wiki-link plugin, so `[[caching-strategies]]` renders as
  the literal text `[[caching-strategies]]`. Cross-link with `[Caching Strategies](caching-strategies)`
  — a standard markdown link whose `contentKey` (or `filename.md`) href the reader's linkMap resolves.
- No unlabeled code fences and no exotic language IDs (Shiki will drop styling).
- No reliance on frontmatter for anything the reader must show.
- No mermaid diagrams over ~15 nodes — split them; huge graphs render illegibly after recolor.
- No emojis in body text (house style) unless the spec explicitly allows them.

---

## Where a course visibly breaks (and the fix)

| Symptom in the app | Root cause | Fix |
|---|---|---|
| Catalog card is an empty navy box | no `banner_path` / missing `assets/banner.svg` | generate a real 7:2 banner |
| Card / overview says "0 lessons" | `freeContentCount`/`premiumContentCount` wrong | run `build-manifests.mjs` (sets from disk) |
| Overview has no "Start Learning" button | `toc_data` empty or wrong shape | emit `toc.json` phase form with a first free item |
| Sidebar is blank | `sidebar_data` empty or malformed | emit `sidebar.json`; use `accessLevel`, not `access` |
| Lesson shows "# Failed to Load" | `storagePath` wrong/not bucket-prefixed, or file absent | fix `storagePath`; ensure file synced |
| Sidebar link 404s → paywall "not found" | `contentKey` mismatch across JSONs | one key everywhere (builder enforces) |
| Code lesson blank | `contentType:"code"` dir missing `README.md` | add `README.md` to the dir |
| Literal `<div>` text in a lesson | raw HTML used | rewrite as markdown |
| Broken image icon mid-lesson | relative image path | use absolute course-assets URL |
| Premium lesson: "content is being prepared" | premium row has no stored file | ensure the `.md` exists under `docs/premium/**` |

---

## The catalog card & overview — what "looks premium" means

The card (`EnhancedCourseCard`) shows: banner at `aspect-[7/2] object-cover`, `title`,
`shortDescription` (`line-clamp-2`), `"{free+premium} lessons · {duration}"` (12 min/lesson),
and the price block (`priceCents`, `comparePriceCents`, optional `flashSale`). So:
- A tight, benefit-led **title** and a crisp **1–2 line description** do most of the work.
- A **banner with a legible title + motif** in the 7:2 safe area beats a generic gradient.
- **Non-zero, honest counts** — a course with 24 real lessons reads as substantial.

The overview page shows three stat tiles (**Free Lessons**, **Premium Lessons**, **Code
Examples** = count of `contentType:"code"` rows) and the `toc_data` learning path as numbered
phase cards. So a well-phased `toc.json` with 5–7 phases and honest per-phase descriptions is
the overview's entire first impression — invest in it.
