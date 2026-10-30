# Chapter Playbook — how to write content people pay for

The sample course's real premium value came from a **consistent pedagogical spine** repeated
across every artifact. This playbook codifies that spine per content type. Every generated file
follows the matching skeleton in `../templates/`. Tone: a senior engineer mentoring a junior —
no marketing, no hype, no emojis. Lead with the mental model; syntax and API come after. Name
failure modes instead of warning about them. Every chapter must make the reader stronger at
**thinking** about the topic, not just **doing** it — write for someone who will be on-call for this.

---

## The universal spine (every DOC chapter)

1. **Goal line** — one sentence: what the reader can *do* after this chapter.
2. **Hook / Business problem** — a concrete, named scenario with real scale (e.g. "A payments
   API at 40k rps must never double-charge"). Stakes first; the topic is the answer to a problem.
3. **Mental model** — how to *think* about it, with **at least one mermaid diagram**. This is the
   part readers quote back to you. Spend real effort here.
4. **Core mechanics** — the actual technique, built up in stages, each stage runnable/annotated.
   Link to `src/**` code where it exists.
5. **What happens internally** — the system-level execution path. Why it behaves as it does.
6. **Production tradeoffs** — what a Staff Engineer weighs: latency, cost, ops burden, blast
   radius, failure modes, when NOT to use this.
7. **Anti-patterns** — 3–6 **named** failure modes: `**Name** — what it looks like → why it
   fails → what to do instead.` Named, not generic "be careful".
8. **Worked example / exercise** — a spec plus a *full* worked solution (not a stub). This is
   where premium chapters earn their price.
9. **Top takeaways** (5) and **Revision questions** (5–8, interview-grade).
10. **Next concepts** — `[Human Title](other-contentKey)` markdown links to build the graph.

Free chapters run this spine at "enough to ship a basic thing" depth. Premium chapters run it at
"internals + scars + staff-level architecture" depth and are typically longer.

### Depth targets (per the ₹99 value bar)
- Free foundational doc: **1,500–3,000 words**, ≥1 mermaid, ≥1 runnable example, ≥3 named anti-patterns.
- Premium deep-dive/architecture doc: **2,000–3,500 words**, ≥2 diagrams, a full worked exercise,
  a "when NOT to" section, and concrete numbers (latency/QPS/bytes), not adjectives.

---

## LAB skeleton (premium, hands-on) — `templates/lab.skeleton.md`

A buildable project brief with a full solution. Spine:
`Objective → Prerequisites → Business Context (named company + scale) → Architecture →
Implementation (Step 1 domain → Step 2 core logic → Step 3 advanced) → Performance Analysis →
Common Mistakes → Tradeoffs → Staff Engineer Discussion → Complete Solution (full, runnable)`.
A lab without a complete worked solution is worthless — always finish it.

## CASE STUDY skeleton (premium) — `templates/case-study.skeleton.md`

A production narrative that carries the "scars". Spine:
`Business Context (named company + concrete scale, e.g. "100k users, 1000 roles, 40k rps") →
Scale (a metrics table) → The Decision → Architecture → Schema/Design → Implementation →
Performance (real numbers) → Production Lessons (what broke, what they'd do differently)`.
Use fictional-but-plausible companies; make the numbers specific and internally consistent.

## CHEATSHEET skeleton (premium) — `templates/cheatsheet.skeleton.md`

Dense, scannable, no narrative. Spine: grouped **tables** (Item | When to use | Gotcha), a few
`json`/`bash` snippet blocks, "common combinations", and one-line anti-patterns. A reader should
be able to solve a real task from the cheatsheet alone during an incident.

## BLOG skeleton — `templates/blog.skeleton.md`

- **Public (lead magnet, 800–1,200 words):** one strong claim, three supporting moves, one
  memorable close. Optimized for SEO + trust; ends with a soft pointer to the course.
- **Premium (2,000+ words):** an opinion rooted in a real production scar. Name failure modes.
  Take a position the reader could disagree with.

---

## Rich blocks — where they go in the spine

The reader renders nine fenced-block languages (`callout`, `flow`, `sequence`, `diagram`, `quiz`,
`proscons`, `params`, `demo`, `codetabs`; exact syntax in [`rich-content.md`](../references/rich-content.md)).
Map them onto the spine instead of sprinkling them:

| Spine step | Block |
|---|---|
| 2 Hook / scope | ` ```callout type=discussion ` — Candidate/Interviewer dialogue that fixes requirements and numbers |
| 3 Mental model | ` ```callout type=concept title="What is X?" ` then a ` ```flow ` |
| 4 Core mechanics | ` ```params ` for every API contract; ordinary ` ```json ` for payloads; every implementation listing as one ` ````codetabs ` pane with TypeScript, C# and Python tabs |
| 5 What happens internally | ` ```sequence ` with one `%% step N:` narration line per message |
| 6 Production tradeoffs | one ` ```proscons ` per option (3–5 bullets a side, numbers in the bullets) |
| 7 Anti-patterns | `> [!WARNING]` for the sharp edge, `> [!TIP]` for the cheap win |
| 8 Worked example | ` ```demo ` only when a registered widget fits (today: `autocomplete`) |
| 9 Revision | exactly one ` ```quiz ` (4–8 questions, each with `explanation:`) before "Next" |

Floors: every DOC has ≥1 `flow` **or** `sequence`, ≥1 callout and 1 quiz; every LAB has ≥1
`sequence`; cheatsheets use `params` tables for contracts.

## Diagram conventions

- ` ```flow ` for pipelines/dataflow/decisions (omit the header; `dir=LR` for left-to-right);
  ` ```sequence ` for request/response timelines; ` ```diagram ` for every other Mermaid type (class, state, ER, gantt, …); plain ` ```mermaid ` is never written
  (lifecycles) and `classDiagram` (data models).
- **Four colours only:** `:::blue` entry points/clients, `:::green` services (default),
  `:::amber` decisions/queues, `:::purple` external systems/async. Edges are always green.
- ≤ 15 nodes per flow, 6–12 steps per sequence; split larger ones. Label edges. No inline
  HTML/`<br>` in node text — keep labels short and plain.

## Quality reflexes (apply to every file)

- Replace every adjective of magnitude with a number ("fast" → "sub-millisecond at 50k rps").
- Every claim a skeptical staff engineer could challenge gets a reason or a benchmark.
- Every technique gets a "when NOT to use this".
- Code compiles/runs as written; no `// ...` hand-waving in the *worked solution*.
- Cross-link generously with standard markdown links `[Human Title](contentKey)` — the viewer's
  linkMap resolves the `contentKey` href to the right lesson. **Never use `[[wiki-links]]`**: the
  reader has no wiki-link plugin and renders them as literal `[[text]]`. The course is a graph, not a list.
- Prefer concrete, domain-grounded scenarios (payments, feeds, chat, checkout) over toy `foo/bar`.
