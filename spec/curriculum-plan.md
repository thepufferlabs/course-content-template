# Curriculum Plan — <COURSE TITLE>

> **Phase 2 · Plan.** The HOW. Turn the spec's outcomes into an ordered, sectioned, access-split
> curriculum. This is the last human-reviewable artifact before generation. Save at
> `spec/curriculum-plan.md`. Every row here becomes ≥1 task in `tasks.md`.

---

## 1. Sections (→ `sidebar.json` sections)

Semantic, kebab-case section ids — not numeric. Each maps to a sidebar section + a preview SVG.

| id | title | icon (lucide) | mostly |
|---|---|---|---|
| getting-started | Getting Started | rocket | free |
| foundations | Foundations | layers | free |
| <core-section> | <Title> | <icon> | free |
| deep-dive | Deep Dive (Internals) | zap | premium |
| architecture | Production Architecture | network | premium |
| labs | Hands-On Labs | wrench | premium |
| case-studies | Case Studies | book-open | premium |
| cheatsheets | Cheatsheets | list | premium |
| interview | Interview & Revision | graduation-cap | premium |

## 2. Phases (→ `toc.json`, 5–7 phases)

| phase | description (one sentence) |
|---|---|
| Phase 0 — Orientation | How to use the course + the mental models it rests on. |
| Phase 1 — Foundations | <…> |
| Phase 2 — Core | <…> |
| Phase 3 — Internals | <…> |
| Phase 4 — Production | <…> |
| Phase 5 — Mastery | Labs, case studies, cheatsheets, interview. |

## 3. Chapter ledger (→ docs)

Leave gaps in `order` (0,1,2,5,8…) so chapters insert without renumbering. `contentKey` =
filename stem minus `NN-`. `access=free` → `docs/free/`; `premium` → `docs/premium/<subfolder>/`.
Every premium row's subfolder decides its section.

| order | phase | title | contentKey | access | section | sourcePath |
|------:|-------|-------|-----------|--------|---------|-----------|
| 0 | 0 | Learning Path | learning-path | free | getting-started | docs/free/00-learning-path.md |
| 1 | 1 | <…> | <key> | free | foundations | docs/free/01-<key>.md |
| … | … | … | … | … | … | … |
| 20 | 3 | <Internals topic> | <key> | premium | deep-dive | docs/premium/deep-dive/20-<key>.md |
| 30 | 5 | Interview Revision | interview-revision | premium | interview | docs/premium/interview/30-interview-revision.md |

## 4. Labs (→ `docs/premium/labs/`, full worked solutions)

| order | title | contentKey | builds | sourcePath |
|------:|-------|-----------|--------|-----------|
| 40 | <Lab title> | lab-<key> | <what the learner builds> | docs/premium/labs/40-lab-<key>.md |

## 5. Case studies (→ `docs/premium/case-studies/`)

| order | title | contentKey | company (fictional) | scale | sourcePath |
|------:|-------|-----------|--------|-------|-----------|
| 50 | <Case title> | case-<key> | <Name> | <100k users / 40k rps / …> | docs/premium/case-studies/50-case-<key>.md |

## 6. Cheatsheets (→ `docs/premium/cheatsheets/`)

| order | title | contentKey | covers | sourcePath |
|------:|-------|-----------|--------|-----------|
| 60 | <Topic> Cheatsheet | cheatsheet-<key> | <groups> | docs/premium/cheatsheets/60-cheatsheet-<key>.md |

## 7. Runnable code (→ `src/samples/**` free, `src/premium/**` premium; each needs `README.md`)

| dir | access | illustrates | referenced by |
|---|---|---|---|
| src/samples/01-<topic> | free | <…> | <contentKey> |
| src/premium/20-<topic> | premium | <…> | <contentKey> |

## 8. Blogs (optional; SEO + premium opinion)

| type | title | thesis | sourcePath |
|---|---|---|---|
| public | <…> | <one-sentence claim> | blog/public/01-<key>.md |
| premium | <…> | <opinion + scar> | blog/premium/01-<key>.md |

## 9. Assets to generate

- `assets/banner.svg` (1400×400), `assets/thumbnail.svg` (600×400)
- `assets/preview/<section-id>.svg` — one per §1 section

## 10. Rubric check (must pass before Phase 3)

- [ ] free docs ≥ 8, premium docs ≥ 12, total ≥ 20
- [ ] labs ≥ 4 (full solutions), case studies ≥ 3, cheatsheets ≥ 2, interview ≥ 1, code dirs ≥ 5
- [ ] every premium value item is under `docs/premium/**` or `src/**` (will actually ship)
- [ ] all `contentKey`s unique; all `order`s spaced; every section has ≥1 item
- [ ] free tier alone can build the §5 "real basic thing"

---

> When the rubric check passes, advance to **Phase 3 · Tasks** using `tasks.template.md`.
