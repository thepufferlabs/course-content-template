# Course Spec — <COURSE TITLE>

> **Phase 1 · Specify.** This is the WHAT and WHY. No chapter list yet (that's the Plan).
> Resolve every `<FILL>`. A reviewer should be able to decide "yes, I'd pay ₹99 for this"
> from this file alone. Save at `spec/course-spec.md`.

---

## 1. Identity

```yaml
title:              "<Course Title — From Zero to Staff Engineer>"
slug:               "<kebab-case-slug>"       # URL-safe; the Supabase product slug. NEVER changes.
shortDescription:   "<=140 chars catalog pitch, benefit-led>"
longDescription:    "<2–4 sentences; used for search embedding>"
category:           "<systems|backend|frontend|data|devops|ml|search-systems>"
level:              "<beginner-to-staff|intermediate-to-staff>"
tags:               ["<6–12 canonical tags>"]
publicRepoUrl:      "https://github.com/thepufferlabs/<slug>"
palette:
  primary:          "#1E40AF"
  accent:           "#F59E0B"
  bg:               "#0B1020"
priceCents:         9900        # ₹99.00
comparePriceCents:  29900       # ₹299.00 strikethrough
currency:           "INR"
```

## 2. The promise (why this exists)

- **One-line promise:** "<After this course you can <verb> <outcome> at <level>.>"
- **The problem it solves:** <the concrete pain the buyer has today>
- **Why now / why this:** <what makes this worth money vs. free blog posts — the scars,
  the internals, the worked systems, the coherence>

## 3. Audience & prerequisites

- **Primary persona:** <role + years + what they can already do>
- **Secondary persona:** <role>
- **Not for:** <who should skip this — sets honest expectations>
- **Prerequisites:** <bullet list — what they must know first>

## 4. Learning outcomes (the "you will be able to…" list)

By the end, a learner can:
- <outcome 1 — observable, verb-first>
- <outcome 2>
- <outcome 3>
- … (6–10 total; these become the spine of the Plan)

## 5. The value case (the ₹99 justification)

Fill against `references/quality-rubric.md` floors:
```yaml
targetLessons:        24     # ≥ 20
freeDocs:             9      # ≥ 8  — free tier must ship a real basic thing
premiumDocs:          15     # ≥ 12
labs:                 5      # ≥ 4, each a full worked solution
caseStudies:          4      # ≥ 3, named company + real numbers
cheatsheets:          3      # ≥ 2
interviewDocs:        1      # ≥ 1
codeDirs:             6      # ≥ 5, each with README.md
estimatedHours:      "<N>"
```
- **What the free tier lets them build:** <a real, shippable thing using only free lessons>
- **What the premium tier adds:** <internals, scars, labs, architecture, cheatsheets, interview>
- **The one cohesive system the course builds toward (value multiplier):** <e.g. "design and
  reason about a URL shortener at 100k rps" — labs and chapters reinforce it>

## 6. Positioning & differentiation

- **Closest free alternative:** <blog/docs>; **why this beats it:** <coherence, depth, scars>
- **Closest paid alternative:** <course>; **why this is better value:** <price, focus, worked labs>
- **The screenshot-worthy artifact** buyers will share: <the cheatsheet / decision matrix / diagram>

## 7. Tone & constraints

```yaml
voice:   "senior engineer mentoring a junior; no marketing; no emojis"
demand:  ["one mermaid per chapter", "named anti-patterns", "numbers not adjectives",
          "a full worked solution in every lab", "a 'when NOT to use this' per technique"]
forbid:  ["raw HTML", "relative image paths", "unlabeled code fences", "stub solutions"]
```

## 8. Non-goals (scope guard)

- <what this course deliberately does NOT cover, to keep it focused and shippable>

---

> When every `<FILL>` is resolved and §5 clears the rubric floors, advance to **Phase 2 ·
> Plan** using `curriculum-plan.template.md`.
