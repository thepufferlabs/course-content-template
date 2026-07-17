# Quality Rubric — the ₹99 value bar

A buyer paying ₹99 (and seeing a ₹299 strikethrough) should feel they got a steal. Use this
rubric twice: in **Phase 1** to size the course, and in **Phase 6** to score it before "done".
The bar is calibrated against the real sample course (~93k words of docs + ~48k of labs/case
studies) — you do not need that volume for ₹99, but you must clear the thresholds below.

---

## Minimum shippable course (hard floors)

| Dimension | Floor for ₹99 | Notes |
|---|---|---|
| Total lessons (docs) | **≥ 20** | across free + premium |
| Free docs | **≥ 8** | enough to ship a real basic thing + SEO surface |
| Premium docs | **≥ 12** | internals, architecture, deep dives |
| Labs (premium, full solutions) | **≥ 4** | each with a complete worked solution |
| Case studies (premium) | **≥ 3** | named company + real numbers |
| Cheatsheets (premium) | **≥ 2** | incident-grade reference |
| Interview/revision doc | **≥ 1** | premium |
| Runnable code dirs (`src/**`) | **≥ 5** | each with `README.md` |
| Mermaid diagrams | **≥ 1 per doc** | first-class in the reader |
| Total substantive words | **≥ 40,000** | docs + labs + case studies combined |
| Phases in `toc.json` | **5–7** | drives the overview |
| Sidebar sections | **6–10** | semantic, not numeric |

A course under these floors is not a ₹99 course — expand the plan before implementing.

---

## Scoring (Phase 6) — 5 axes, 0–4 each; ship at ≥ 16/20 with no axis < 3

**1. Depth & correctness.** Chapters teach *why*, not just *how*. Numbers not adjectives.
Worked solutions are complete and correct. No hand-waving in premium content.
`0` = wikipedia-level summary · `4` = a staff engineer learns something.

**2. Pedagogical arc.** Clear progression: foundations → working knowledge → internals →
architecture → mastery. Free tier is genuinely useful alone. Cross-links form a graph.
`0` = disconnected pages · `4` = a deliberate learning path.

**3. Practitioner value.** Labs are buildable, case studies are believable, cheatsheets are
usable under pressure, anti-patterns are named and real. Someone could apply this Monday.
`0` = theory only · `4` = changes how the reader works.

**4. Render quality.** Every file obeys `consumer-render.md`: pure GFM, mermaid, absolute
images, known code langs, honest counts, real banner. Displays beautifully in the viewer.
`0` = broken rendering · `4` = polished in-app.

**5. Contract integrity.** `validate-local.sh` exits 0. Counts honest. Keys consistent.
Premium value is inside `docs/premium/**` (delivered), not in dark folders.
`0` = validator fails · `4` = zero drift.

---

## Red flags (any one blocks "done")

- `free_content_count`/`premium_content_count` don't match disk (run the builder).
- A `contentKey` appears in `sidebar.json`/`toc.json` but not `content-index.json`.
- Premium value (labs/case studies/cheatsheets) sits outside `docs/premium/**` (won't ship).
- A "lab" or "worked example" ends with a stub or `TODO` instead of a full solution.
- Raw HTML, relative image paths, or unlabeled code fences anywhere.
- No `assets/banner.svg`, or a banner with no legible title in the 7:2 safe area.
- `toc.json` uses `phases`/`entries` where the phase-form `toc[]` is expected, or items use
  `access` instead of `accessLevel`.
- Fewer than 5 mermaid diagrams total, or a "deep dive" with none.

---

## Value multipliers (cheap ways to feel more premium)

- A **"napkin math"** free chapter (latency numbers, powers of two, capacity estimates) — high
  perceived value, low cost, great SEO.
- One **cohesive running system** the whole course builds toward (e.g. "design a URL shortener /
  a feed / a ledger") so labs and chapters reinforce each other.
- A **decision matrix / "when to use what"** cheatsheet — the thing engineers screenshot.
- An **interview-revision** doc with 40–60 graded questions mapped to chapters.
- Consistent **named anti-patterns** the reader will actually repeat to teammates.
