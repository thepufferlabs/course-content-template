# Workflow — Agentic AFK Course Generation

How an orchestrating agent turns a filled `spec/` into a complete, validated course **without a
human in the loop**. This is the "reusable factory" that Claude agents invoke. The unit of
parallelism is a **task** from `spec/tasks.md`; the unit of truth is the **spec**.

---

## Preconditions (the orchestrator checks these first)

- `spec/course-spec.md` filled (no `<FILL>`), §5 clears `quality-rubric.md` floors.
- `spec/curriculum-plan.md` filled; its §10 rubric checkbox passes.
- `spec/tasks.md` enumerates one task per artifact.
- `spec/structure.json` lists sections (id/title/icon) and phases (phase/description/sections)
  so `build-manifests.mjs` can build a good sidebar + TOC.
- Repo scaffolded (`new-course.sh` has run): dirs, CI, markers, vendored scripts present.

If any precondition fails, **stop and complete the spec** — never generate against a broken spec.

---

## The fan-out (Phase 4)

Content tasks (T1–T8: docs, labs, case studies, cheatsheets, blogs, code READMEs) are
**independent** — each writes one file. Generate them concurrently. Derived files (T10) and
assets (T9) come after. Verify (T11) is the gate.

### Option A — subagents (Agent tool), the default
For each content task, spawn a subagent with a **self-contained brief** (below). Batch
independent spawns in one turn so they run in parallel. Collect, then assemble.

### Option B — Workflow tool (when the user opted into orchestration)
Model the same fan-out as a pipeline; one stage generates a file, a second stage self-reviews it
against the playbook. Pseudocode:
```
pipeline(contentTasks,
  t => agent(briefFor(t), {label:`write:${t.contentKey}`, phase:'Write'}),
  (text, t) => agent(reviewBrief(t), {label:`review:${t.contentKey}`, phase:'Review'})
)
```
Then run `build-manifests.mjs` + `validate-local.sh` after the barrier.

### The per-chapter brief (give every writer subagent ALL of this)
A subagent has no shared memory — inline everything it needs:

1. **Role + tone:** "Staff/Principal engineer mentoring a junior. No marketing, no emojis, no
   raw HTML. Numbers not adjectives."
2. **The exact file to write** (path) and its **frontmatter block** (copy from the task line +
   `schema-contract.md`) — contentKey, section, accessLevel, order, tags, routePath must be exact.
3. **The skeleton** for its type (`doc.skeleton.md` / `lab.skeleton.md` / `case-study.skeleton.md`
   / `cheatsheet.skeleton.md`) and the **spine** from `chapter-playbook.md`.
4. **The render rules** from `consumer-render.md` (pure GFM, ` ```mermaid `, absolute image URLs,
   known code langs, no HTML).
5. **The depth target** from `quality-rubric.md` for that type (word count, diagrams, worked
   solution required for labs).
6. **Context for coherence:** the course promise (spec §2), the one cohesive system it builds
   toward (spec §5), the list of sibling `contentKey`s so it can cross-link with `[Title](contentKey)` correctly, and
   the 1-line summary of adjacent chapters so it doesn't duplicate them.
7. **Acceptance:** "Write ONLY the file. It must pass: frontmatter matches the task; ≥N words;
   ≥K mermaid; named anti-patterns; (labs) a complete runnable solution, no stubs."

Tell each subagent its output is the file on disk (have it Write the file), and to return a
one-line status (path + word count + diagram count), not the prose.

---

## Assemble (Phase 5) — deterministic, no agents

```bash
node scripts/build-manifests.mjs      # derives content-index/sidebar/toc/tags + meta counts
```
Then generate assets (T9): banner + thumbnail + one preview per section, per `asset-guide.md`,
using the spec's palette. (Assets can also be a small parallel subagent batch.)

## Verify (Phase 6) — the gate

```bash
bash scripts/validate-local.sh        # must exit 0
```
Fix every `✗`. Then score against `quality-rubric.md` (≥16/20, no axis <3). Cheap way to score
without a human: spawn one **adversarial reviewer** subagent per rubric axis, each returning a
0–4 with a one-line justification and the single highest-value fix. Apply fixes, re-validate.

If verification reveals a **structural** problem (wrong split, thin phase, duplicate scope), fix
the **spec/plan**, regenerate the affected tasks, and re-assemble — do not patch output in place.

---

## AFK resilience

- **Idempotent:** re-running a task overwrites its one file; re-running the builder/validator is
  safe. A crashed run resumes by regenerating only unchecked `tasks.md` items.
- **Checkpoint:** check off each task in `spec/tasks.md` as its file lands, so a resumed/AFK run
  knows exactly what remains.
- **Bounded fan-out:** cap concurrent writer subagents (~8–12) to stay within limits; queue the rest.
- **No silent truncation:** if you cap or skip anything (e.g. defer blogs), say so in the final
  summary — a partial course must not read as complete.

## Final output (always print)

- Counts: free docs / premium docs / labs / case studies / cheatsheets / code dirs / diagrams / words.
- Rubric score (x/20) and validator status.
- The exact publish steps: `git add -A && git commit -m "..." && git push` → triggers
  `sync-to-supabase.yml` → Supabase → live at `/courses/<slug>`.
