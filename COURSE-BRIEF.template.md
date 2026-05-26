# Course Brief — <FILL>

> Fill this out and Claude will scaffold the entire course repo per
> `MASTER-COURSE-REPO-PROMPT.md`. Save this as `COURSE-BRIEF.md` (drop the
> `.template` suffix) at the repo root, then say *"generate from the brief"*.
>
> Anything left as `<FILL>` will trigger a question. Anything left as a
> sensible default will be used as-is.

---

## 1. Identity

```yaml
title:              "<Course Title — From Zero to Staff Engineer>"
slug:               "<kebab-case-slug>"          # URL-safe; becomes the Supabase product slug
shortDescription:   "<One-sentence catalog pitch.>"
category:           "<search-systems|devops|ml|systems|frontend|backend|data>"
level:              "<beginner-to-staff|beginner-to-advanced|intermediate-to-staff>"
tags:               ["tag1", "tag2", "tag3"]      # 6–12 canonical tags
publicRepoUrl:      "https://github.com/<org>/<slug>"
palette:
  primary:          "#1E40AF"
  accent:           "#F59E0B"
  bg:               "#0B1020"
priceCents:         19900                          # ₹199.00
comparePriceCents:  49900                          # ₹499.00 strikethrough
currency:           "INR"
```

---

## 2. Pricing & Access split (targets)

```yaml
freeDocCount:        12
premiumDocCount:     11
blogFreeCount:       1
blogPremiumCount:    2
sampleCodeDirs:      5
premiumCodeDirs:     2
cheatsheetCount:     4
```

---

## 3. Learning phases & chapters (ordered)

Each row becomes a chapter. `section` must match a `sidebar.json` section id;
Claude creates the section if it doesn't exist. `access` of `free` lands in
`docs/free/`; `premium` lands in the matching subfolder of `docs/premium/`.

| order | phase                       | title                          | access  | section          | subfolder        |
|------:|-----------------------------|--------------------------------|---------|------------------|------------------|
| 0     | Phase 0 — Orientation       | Learning Path                  | free    | getting-started  | free             |
| 1     | Phase 1 — Foundations       | What Is <Topic>                | free    | foundations      | free             |
| 2     | Phase 1 — Foundations       | <Core concept>                 | free    | foundations      | free             |
| 3     | Phase 2 — Core              | <Working knowledge>            | free    | <section>        | free             |
| ...   | ...                         | ...                            | ...     | ...              | ...              |
| 8     | Phase 4 — Internals         | <Mechanism deep-dive>          | premium | deep-dive        | premium/deep-dive |
| 11    | Phase 5 — Production        | Production Architecture        | premium | architecture     | premium/architecture |
| 17    | Phase 6 — Mastery           | Staff Engineer Cheatsheet      | premium | architecture     | premium/architecture |
| 18    | Phase 6 — Mastery           | Interview Revision Guide       | premium | interview        | premium/interview |

> Tip: leave gaps in `order` (e.g. 0, 1, 2, 5, 8) so you can insert chapters later without renumbering.

---

## 4. Per-chapter depth notes (optional but recommended)

For each chapter where you want richer content than the generic skeleton,
add a depth block. Claude expands these into the chapter body.

```yaml
- contentKey: "<slug>"        # must match derived slug from §3 title
  mentalModel: |
    <one-paragraph mental model — how to think about it, not just what it is>
  mustCover:
    - <bullet>
    - <bullet>
  antiPatterns:
    - name:    "<named anti-pattern>"
      symptom: "<what it looks like>"
      fix:     "<what to do instead>"
  diagram:    "<one-line description of the Mermaid diagram you want>"
  codeSamples:
    - <filename in src/samples/NN-topic/>
    - <filename>
  productionTradeoffs:
    - "<one tradeoff a Staff Engineer would weigh>"
  interviewAngles:
    - "<question that probes whether someone really gets this>"
  premiumExtension: "<contentKey of premium deep-dive that builds on this, or null>"
```

Repeat the block for each chapter you want depth on. Chapters without a
depth block get the generic doc skeleton with `<!-- TODO -->` placeholders.

---

## 5. Cheatsheets (premium)

```yaml
cheatsheets:
  - slug:    "<topic>-cheatsheet"
    title:   "<Topic> Cheat Sheet"
    purpose: "<one sentence on what this cheatsheet covers>"
    groups:
      - "<group 1 of clauses/operations/etc>"
      - "<group 2>"
```

---

## 6. Blogs

```yaml
publicBlogs:
  - title:  "<Strong-claim title>"
    thesis: "<One-sentence position the post argues>"
    audience: "<who this lead-magnets>"

premiumBlogs:
  - title:  "<Opinion-driven title>"
    thesis: "<One-sentence position>"
    scars:  "<the real production incident or experience behind this>"
```

---

## 7. Code samples

```yaml
freeSamples:
  - dir:    "src/samples/01-<topic>"
    files:  ["01-<name>.json", "02-<name>.json"]
    purpose: "<what these illustrate>"
  - dir:    "src/samples/00-sample-documents"
    files:  ["app-data.ndjson"]
    purpose: "seed data referenced by other samples"

premiumSamples:
  - dir:    "src/premium/06-<topic>"
    files:  ["01-<name>.json", "02-<name>.md"]
    purpose: "<what these illustrate>"
```

---

## 8. Tone overrides (optional)

```yaml
voice:    "senior engineer mentoring a junior; no marketing"
forbid:   ["emoji", "hype phrases", "obvious code comments"]
demand:   ["one mermaid per chapter", "named anti-patterns", "production tradeoffs section"]
```

---

## 9. Generation flags

```yaml
generateAssets:        true    # banner, thumbnail, per-section previews
generateValidator:     true    # scripts/validate.sh
generatePlaceholders:  true    # chapters without depth blocks get TODO scaffolding
strictMode:            true    # fail on any validation error
```
