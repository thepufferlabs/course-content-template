# Schema Contract — exact file shapes

Every derived JSON here is produced by `scripts/build-manifests.mjs`. This doc is the spec the
builder implements and the shape a human reviewer checks against. Keys marked **[read]** are
consumed by the live viewer; keys marked **[sync]** are consumed by the ingestion pipeline;
others are for validation/humans.

---

## `meta.json`

```jsonc
{
  "$schema": "premium-content-repo",          // [validation] first three keys, always
  "schemaVersion": "1.0",
  "repoType": "premium-content-repo",         // [read] products.product_type gate helper

  "title": "<Course Title — From Zero to Staff Engineer>",   // [read]
  "slug": "<kebab-slug>",                     // [read] URL + storage prefix. NEVER changes.
  "shortDescription": "<=140 chars, 1–2 lines>",             // [read] card + overview subtitle
  "longDescription": "<2–4 sentences>",       // [read-search] embedding only; still populate
  "category": "<systems|backend|frontend|data|devops|ml|search-systems>",  // [read] facet+badge
  "level": "<beginner-to-staff|intermediate-to-staff>",      // [read] badge (split on '-'→'→')
  "tags": ["<6–12 canonical tags>"],          // [read] pills + facets + embedding

  "banner": "assets/banner.svg",              // [read] REQUIRED. banner_path. 7:2 safe area.
  "thumbnail": "assets/thumbnail.svg",        // [read] fallback + public-URL base

  "productType": "course",                    // [sync] MUST be "course"
  "status": "published",                      // [sync] MUST be "published" to appear

  "priceCents": 9900,                         // [read] ₹99.00
  "currency": "INR",                          // [read]
  "comparePriceCents": 29900,                 // [read] strikethrough anchor

  "premiumSourceType": "same_repo",
  "premiumSourceRef": "docs/premium",

  "previewDocPaths": [],                      // [sync] filled by builder from docs/free/**
  "premiumDocPaths": [],                      // [sync] filled by builder from docs/premium/**
  "publicBlogPaths": [],
  "premiumBlogPaths": [],
  "sampleCodePaths": [],                      // filled by builder from src/samples/**
  "premiumCodePaths": [],                     // filled by builder from src/premium/**

  "freeContentCount": 0,                      // [read] SET BY BUILDER. Wrong → "0 lessons".
  "premiumContentCount": 0,                   // [read] SET BY BUILDER.

  "version": "1.0.0",
  "githubTopics": ["premium-content-repo", "learning-course", "<category>"],

  "metadata": {                               // optional
    "flash_sale": {
      "is_active": false,
      "sale_price_cents": 4900,
      "starts_at": "2026-01-01T00:00:00Z",
      "ends_at": "2026-01-08T00:00:00Z",
      "label": "Launch Week"
    }
  }
}
```

The `*Paths` arrays and the two count fields are **derived** — leave them `[]`/`0` when hand-
starting; the builder overwrites them from disk so `meta.json` can never lie about its content.

---

## `content-index.json` (array; → `product_content` rows)

```jsonc
[
  {
    "contentKey": "load-balancing",
    "title": "Load Balancing — L4/L7, Algorithms, and Failure",
    "section": "traffic",
    "accessLevel": "free",
    "contentType": "doc",
    "sourceType": "same_repo",
    "sourcePath": "docs/free/03-load-balancing.md",
    "storagePath": "free-content/<slug>/docs/free/03-load-balancing.md",
    "routePath": "/project/<slug>/learn/load-balancing",
    "tags": ["load-balancing", "traffic", "availability"],
    "order": 3,
    "isPublished": true,
    "migrationTargetPath": null
  }
]
```

`storagePath` construction (the builder does this; verify it):
- free doc  → `free-content/<slug>/<sourcePath>`
- premium doc → `premium-content/<slug>/<sourcePath>`
- code dir → `<bucket>/<slug>/<sourcePath>` (dir; app appends `/README.md`)

---

## `sidebar.json` (→ `course_details.sidebar_data`)

```jsonc
{
  "projectSlug": "<slug>",
  "sections": [
    {
      "id": "traffic",
      "title": "Traffic & Routing",
      "icon": "route",                        // lucide icon name; "" is acceptable
      "premium": false,                       // omit or set; inferred true if all items premium
      "items": [
        { "contentKey": "load-balancing", "title": "Load Balancing",
          "routePath": "/project/<slug>/learn/load-balancing",
          "accessLevel": "free", "order": 3 }
      ]
    }
  ]
}
```
Section order = array order. Item order within a section = `order`. Group all items that share
a `section` into one sidebar section, sorted by `order`.

Common lucide icons by theme: `rocket` (getting started), `layers` (foundations), `route`
(traffic), `database` (storage/data), `git-branch` (consistency), `zap` (performance),
`shield` (reliability), `network` (distributed), `wrench` (labs), `book-open` (case studies),
`list` (cheatsheets), `graduation-cap` (interview).

---

## `toc.json` (→ `course_details.toc_data`; phase form)

```jsonc
{
  "projectSlug": "<slug>",
  "title": "<Course Title> — Learning Path",
  "toc": [
    {
      "phase": "Phase 1 — Foundations",
      "description": "The vocabulary and mental models every design rests on.",
      "items": [
        { "order": 0, "contentKey": "learning-path", "title": "Learning Path", "accessLevel": "free" },
        { "order": 1, "contentKey": "napkin-math",   "title": "Napkin Math",   "accessLevel": "free" }
      ]
    }
  ]
}
```
`items[].order` is the global order used for prev/next; keep it consistent with
`content-index.json[].order`.

---

## `data/tags.json`

```jsonc
{
  "projectSlug": "<slug>",
  "tags": [
    { "tag": "caching", "count": 4, "category": "topic" }
  ]
}
```
`count` = number of items using the tag (derived). `category` groups tags: `topic`, `pattern`,
`domain`, `level`, `technology`.

---

## Markdown frontmatter (written, but stripped by the reader)

Every `docs/**/*.md` and `blog/**/*.md` begins with:
```yaml
---
title: "<NN> — <Human Title>"
contentKey: "<key>"
section: "<section-id>"
accessLevel: "free|premium"
contentType: "doc"
tags: ["..."]
order: <NN>
sourceType: "same_repo"
sourcePath: "<path>"
routePath: "/project/<slug>/learn/<key>"
migrationTargetPath: null
isPublished: true
---
```
Blogs add `author`, `publishedAt` (`YYYY-MM-DD`), `estimatedReadTime`. The reader discards all
of this — it exists so the builder can derive manifests even if a JSON is stale, and so the file
is self-describing to a human. **Never** let frontmatter be the only place a UI-visible fact lives.

---

## Cross-file invariants (validator enforces)

1. `contentKey` unique across the repo and equal to `sourcePath` filename stem minus `NN-`.
2. Every `contentKey` in `sidebar.json`/`toc.json` exists in `content-index.json`.
3. `accessLevel` matches folder: `docs/free/**`→`free`, `docs/premium/**`→`premium`.
4. `storagePath` bucket prefix matches `accessLevel`.
5. `routePath` == `/project/<slug>/(learn|blog|code)/<contentKey>`.
6. `meta.freeContentCount` == count of free docs; `premiumContentCount` == count of premium docs.
7. Every `docs/**/*.md` has valid frontmatter whose `contentKey` matches its filename.
8. Every `contentType:"code"` dir contains a `README.md`.
9. `meta.banner` file exists; each `sidebar.json` section has a preview SVG (soft warning).
