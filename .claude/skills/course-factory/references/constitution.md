# Constitution — `premium-content-repo` v1.0 (VERIFIED CONTRACT)

> This file is **immutable per course**. Copy it verbatim into every course repo at
> `spec/constitution.md`. It is the single source of truth for what the pipeline and the
> consumer app actually read. It was reverse-engineered from the live consumer app
> (`thepufferlabs-2`, `content-loader.ts` + Supabase migrations) — **not** from the older
> `MASTER-COURSE-REPO-PROMPT.md`, which has drifted from reality. Where they disagree, this
> file wins.

---

## Article I — The pipeline is fixed

A GitHub Actions workflow (`.github/workflows/sync-to-supabase.yml`, calling the reusable
`thepufferlabs/ci-reusable-actions-workflows/.../sync-course-content.yml@main`) syncs the repo
into Supabase on every push to `main`. You do not modify this pipeline. You produce files it
knows how to read:

| Repo file | Lands in | Consumed by |
|---|---|---|
| `meta.json` | `products` table (+ `metadata.flash_sale`) | catalog card, overview header, search embedding |
| `content-index.json` | `product_content` rows (one per item) | reader routing, prev/next, code-example count |
| `docs/shared/sidebar.json` | `course_details.sidebar_data` (JSONB) | course viewer left sidebar |
| `docs/shared/toc.json` | `course_details.toc_data` (JSONB) | overview "Learning Path" + "Start Learning" CTA |
| `data/tags.json` | (tag taxonomy; facets) | catalog facets |
| `docs/free/**/*.md` | `free-content` bucket (public) | rendered directly to any visitor |
| `docs/premium/**/*.md` | `premium-content` bucket (private, RLS) | rendered only to entitled buyers |
| `src/**` (code) | `free-content`/`premium-content` bucket | code lessons (dir + `README.md`) |
| `assets/**` | `course-assets` bucket (public) | banner, thumbnail, preview SVGs, in-content images |

**The sync trigger path filter is:** `docs/**`, `blog/**`, `src/**`, `assets/**`, `meta.json`,
`data/**`, `.content-repo`. **Any content outside these paths never reaches Supabase and is
never delivered to the buyer.** (This is why the sample course's `labs/`, `case-studies/`,
`cheat-sheets/`, `diagrams/` folders — its best material — were dark content nobody paid-for
received. **Do not repeat this.** Premium labs/case-studies/cheatsheets live under
`docs/premium/**`; runnable code lives under `src/**`.)

---

## Article II — The stable identity model

Every content item has four identifiers. Two are permanent, two are mutable.

| Field | Example | Mutable? | Rule |
|---|---|---|---|
| `contentKey` | `caching-strategies` | **NEVER** | filename stem minus `NN-` prefix. Unique across the whole repo. |
| `routePath` | `/project/{slug}/learn/caching-strategies` | **NEVER** | `/project/{slug}/(learn\|blog\|code)/{contentKey}` — the app remaps to `/courses/...`. |
| `sourcePath` | `docs/premium/deep-dive/08-caching-strategies.md` | OK to move | actual path from repo root. |
| `accessLevel` | `free` \| `premium` | changeable | must match the folder: `docs/free/**`→`free`, `docs/premium/**`→`premium`. |

- `contentKey` derivation is **mechanical**: `08-caching-strategies.md` → `caching-strategies`.
  Blogs are prefixed `blog-`. Reject any file whose declared key ≠ derived key.
- **The same `contentKey` string must appear in `content-index.json`, `sidebar.json`, and
  `toc.json`.** It is the URL segment. A mismatch means the sidebar/TOC link 404s into the
  paywall's "not found" path. This is the #1 correctness invariant — the manifest builder
  enforces it; never hand-edit one JSON without the others.

---

## Article III — The JSON contract (exact keys the parser reads)

These shapes are what `content-loader.ts` actually parses. Deviating silently breaks rendering.
Full schemas + examples are in [`schema-contract.md`](schema-contract.md); the load-bearing
keys are frozen here.

### `sidebar.json` → `sidebar_data`
```jsonc
{
  "projectSlug": "<slug>",
  "sections": [
    {
      "id": "<kebab-section-id>",          // NOT "sectionKey" (accepted, but use "id")
      "title": "<Section Title>",
      "icon": "<lucide-icon-name>",
      "premium": false,                      // optional; inferred true if all items premium
      "items": [
        {
          "contentKey": "<key>",
          "title": "<Human Title>",
          "routePath": "/project/<slug>/learn/<key>",
          "accessLevel": "free",             // ← "accessLevel", NEVER "access"
          "order": 0
        }
      ]
    }
  ]
}
```

### `toc.json` → `toc_data` (**phase form — preferred**)
```jsonc
{
  "projectSlug": "<slug>",
  "title": "<Course Title> — Learning Path",
  "toc": [                                   // ← key is "toc", NEVER "phases"
    {
      "phase": "Phase 1 — Foundations",
      "description": "<one sentence>",
      "items": [
        { "order": 0, "contentKey": "<key>", "title": "<Human Title>", "accessLevel": "free" }
      ]
    }
  ]
}
```
> The overview page's "Start Learning" CTA renders **only if** `toc[0].items[0].contentKey`
> exists. An empty or wrong-shaped `toc` = no learning path and no CTA.

### `content-index.json` → `product_content` (one object per item)
```jsonc
{
  "contentKey": "<key>",
  "title": "<Human Title>",
  "section": "<section-id>",
  "accessLevel": "free|premium",
  "contentType": "doc|blog|code",
  "sourceType": "same_repo",
  "sourcePath": "docs/premium/deep-dive/08-caching-strategies.md",
  "storagePath": "premium-content/<slug>/docs/premium/deep-dive/08-caching-strategies.md",
  "routePath": "/project/<slug>/learn/<key>",
  "tags": ["..."],
  "order": 8,
  "isPublished": true,
  "migrationTargetPath": null
}
```
> **`storagePath` MUST be bucket-prefixed.** The loader splits on the first `/` to choose the
> bucket: `free-content/…` and `course-assets/…` resolve to public URLs; anything else
> (`premium-content/…`) is an authenticated download. Prefix rule: `free`→`free-content/`,
> `premium`→`premium-content/`, then `<slug>/<sourcePath>`.
> For `contentType: "code"`, `sourcePath`/`storagePath` point at a **directory**; the app
> appends `/README.md`. Every code dir therefore needs a `README.md`.

---

## Article IV — Markdown is pure GFM (the reader is deliberately minimal)

The viewer uses `react-markdown` + `remark-gfm` + `rehype-slug`. That is all. Therefore:

- **No raw/inline HTML.** There is no `rehype-raw`. `<div>`, `<br>`, `<details>`, `<sub>` etc.
  render as literal text. Use markdown only. (Tables, task lists, strikethrough, footnotes via GFM are fine.)
- **Images must be absolute URLs.** Relative paths do not resolve in the reader. Reference
  in-content images by their `course-assets` public URL:
  `${SUPABASE_URL}/storage/v1/object/public/course-assets/<slug>/assets/<file>`.
- **Code fences need a known language** (`ts`, `js`, `python`, `bash`, `sql`, `json`, `yaml`,
  `go`, `rust`, `java`, `mermaid`, …). Shiki highlights known langs; unknown → plain text.
- **Diagrams are ` ```mermaid ` fences.** First-class: the reader renders + recolors them to the
  brand palette, with zoom. Prefer them over ASCII. Keep each under ~15 nodes.
- **No `[[wiki-links]]`.** There is no wiki-link plugin — `[[key]]` renders as literal text.
  Cross-link with standard markdown `[Title](contentKey)`; the reader's linkMap resolves the href.
- **Frontmatter is stripped and ignored.** The reader removes a leading `---…---` block but
  never parses it. All *display* metadata comes from the JSON manifests, not frontmatter.
  Frontmatter is still written (validator/fallback + human readability) but must never be the
  only home of a fact the UI needs.

Full authoring rules + failure modes: [`consumer-render.md`](consumer-render.md).

---

## Article V — `meta.json` drives the catalog and must be honest

`meta.json` populates the `products` row. The fields the UI reads directly (get them right):

- `banner` → `banner_path`. **Required.** Missing → the catalog card is an empty ~7:2 navy
  rectangle. Ship a real `assets/banner.svg` (design for a 7:2 safe area).
- `thumbnail` → `thumbnail_path`. Fallback image; also the public-URL base for the card.
- `shortDescription` → the card subtitle and overview subtitle (1–2 lines, ~140 chars).
- `longDescription` → search embedding only (not shown), but **populate it** for discovery.
- `category`, `level`, `tags` → badges + facets + embedding.
- `freeContentCount` / `premiumContentCount` → **read verbatim** for the "N lessons" card stat
  and the overview stat tiles. **Never guess these — `build-manifests.mjs` sets them from disk.**
- `priceCents`, `currency` (`INR`), `comparePriceCents` → the price block. `comparePriceCents`
  is the strikethrough anchor.
- `status: "published"` **and** `productType: "course"` are mandatory — anything else and the
  course is invisible everywhere (every query filters on both).

Optional flash sale lives in `metadata.flash_sale` (see schema-contract). Keep
`$schema`, `schemaVersion`, `repoType` as the first three keys (they were dropped in the
sample course — a validator error, not a style choice).

---

## Article VI — Free vs premium is a promise, not a paywall trick

- **Free tier must let a motivated engineer ship a real, basic thing** using only free lessons.
  It is the SEO surface and the trust-builder. Under-powered free = no conversions.
- **Premium tier must deliver what dark folders used to hide**: internals, production scars,
  named anti-patterns, staff-level architecture, labs with full worked solutions, case studies
  with real numbers, cheatsheets, interview prep. This is what the ₹99 buys.
- Default split targets live in [`quality-rubric.md`](quality-rubric.md). The mechanism is the
  `accessLevel` field + the `docs/free/` vs `docs/premium/` folder (which routes the bucket).
  Promotions (premium→free) change `accessLevel` and move the file; `contentKey`/`routePath`
  never change.

---

## Article VII — Derived files are derived

`content-index.json`, `sidebar.json`, `toc.json`, `tags.json`, and the count fields in
`meta.json` are **generated by `scripts/build-manifests.mjs` from the on-disk files** — never
hand-authored, never guessed. Re-running the builder is idempotent and is the *only* sanctioned
way to change them. This is what makes the spec executable: the manifests cannot drift from the
content because they are a pure function of it.

---

## Article VIII — Idempotency & operations

- **Never overwrite** a file whose `contentKey` already exists unless explicitly asked. Append.
- New chapters take the next free `order` in their section (leave gaps: 0,1,2,5,8… so you can
  insert without renumbering).
- **Renaming:** change `title`/`sourcePath` freely; never touch `contentKey`/`routePath`. Leave
  a `migrationTargetPath` breadcrumb.
- **Versioning:** bump `meta.json#version` minor for new content, patch for fixes.
- Re-run `build-manifests.mjs` + `validate-local.sh` after any content change.

---

## Article IX — What NOT to generate

- No `index.html`, app code, Dockerfiles, auth, or payment code — that is the platform's job.
- No `package.json` unless runnable code samples genuinely need a runtime.
- No links to platform domains inside docs — use `routePath` only.
- No secrets. Supabase keys live in GitHub Actions secrets.
- No emojis, no marketing hype, no raw HTML (Article IV).
- No content outside the Article-I path filter if you expect a buyer to receive it.
