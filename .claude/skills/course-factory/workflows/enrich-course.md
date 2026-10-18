# Workflow - Enrich an existing course with rich blocks

For the courses that were generated before the rich blocks existed: keep every lesson's prose,
structure and keys, and add the interactive blocks where they earn their place. This is a
**migration, not a rewrite**. Run it per repository; batch it across the catalogue in waves.

Read first: [`../references/rich-content.md`](../references/rich-content.md) (the eight fences
and their exact syntax) and [`../references/chapter-playbook.md`](../references/chapter-playbook.md)
(where each block belongs in a chapter).

---

## 0 · Preconditions

- The repo is on the template layout: `.claude/skills/course-factory/`, `scripts/build-manifests.mjs`,
  `scripts/validate-local.sh` exist (they arrive by template sync, or copy them from the template:
  the paths in `template-sync.json → managedPaths`). If the repo is still legacy (no
  `docs/free` / `docs/premium`, no `meta.json` with `slug`), mold it to schema v1.0 first
  (the "migrate/repair" mode of this skill), then come back here.
- Work on a branch: `git switch -c chore/rich-blocks`.
- Nothing is changed by hand in `docs/shared/*.json`; the builder regenerates them.

## 1 · Audit (deterministic, no agents)

```bash
node .claude/skills/course-factory/scripts/enrich-report.mjs            # markdown report, all docs
node .claude/skills/course-factory/scripts/enrich-report.mjs --json     # same, machine-readable
node .claude/skills/course-factory/scripts/enrich-report.mjs docs/free/03-foo.md   # one file
```

The report lists, per lesson, what is already there (`callout`, `flow`, `sequence`, `quiz`,
`proscons`, `params`, `demo`, `codetabs`, alerts) and the **candidates**:

| Candidate | Found by | Becomes |
| --- | --- | --- |
| `mermaid→flow` | ` ```mermaid ` whose first line is `flowchart`/`graph` | ` ```flow ` (drop the header, keep direction as `dir=`), tag nodes with the four colours |
| `mermaid→sequence` | ` ```mermaid ` whose first line is `sequenceDiagram` | ` ```sequence ` (drop the header) + one `%% step N:` line per message |
| `mermaid→diagram` | any other Mermaid type | ` ```diagram ` (class, state, ER, gantt, …) in the four-colour theme |
| `table→params` | GFM table whose header is Parameter/Field/Option/Flag/Key/Argument … | ` ```params ` |
| `table→proscons` | GFM table with Pros/Cons (or Advantages/Disadvantages) columns | ` ```proscons ` |
| `note→callout` | paragraph or blockquote starting with Note:/Tip:/Warning:/Important: | `> [!NOTE]` style alert |
| `fences→codetabs` | 2+ adjacent code fences in different languages with no prose between | ` ````codetabs ` |
| `missing quiz` | no ` ```quiz ` in the doc | a closing quiz, 4-8 questions, each with `explanation:` |
| `missing discussion/concept` | no `callout` of type discussion or concept | a `discussion` dialogue after the hook or a `concept` box in the mental-model section |
| `html` / `wiki-link` | raw `<tag>` or `[[link]]` | plain Markdown / `[Title](contentKey)` (render defects, fix while you are there) |

## 2 · Enrich (fan out, one subagent per lesson)

Give every writer subagent, inline (it has no shared memory):

1. The lesson file path and its **full current text**.
2. Its **report entry** (what exists, what the candidates are).
3. `references/rich-content.md` and `templates/rich-blocks.snippets.md` verbatim.
4. These rules:

**Rules of enrichment**

- Never change the meaning of a sentence. Add blocks, convert tables/fences/notes; do not rewrite prose.
- Keep the frontmatter, the `# H1`, every heading, the `contentKey`, and all cross-links exactly as they are.
- One ` ```quiz ` per doc, at the end, before any "Next" link: 4-8 questions, every one with `explanation:`, answers spread across A-D.
- A `discussion` callout only where the lesson already poses the problem (hook / requirements); a `concept` box for the one definition the chapter rests on. Do not add a callout to every paragraph.
- Convert **every** ` ```mermaid ` flowchart to ` ```flow ` and every sequence to ` ```sequence `; other Mermaid types to ` ```diagram `. Tag nodes with the four colours by role (blue entry/clients, green services/main path, amber decisions/queues/notes, purple external/async). Never use any other colour.
- A sequence gets a `%% step N:` narration line per message, in the reader's voice.
- `params` for contract tables, `proscons` for comparison tables; leave ordinary data tables as GFM tables.
- `codetabs` only when the stacked fences are the **same example** in several languages.
- `demo` only with a registered widget (`autocomplete`). Do not invent widgets.
- Quote YAML strings containing `:`; two-space indent; no tabs.
- No raw HTML, no `[[wiki-links]]`, no new relative image paths.

The subagent writes the file in place and returns one line: path, blocks added by type, candidates skipped and why.

## 3 · Assemble and verify (the gate)

```bash
node scripts/build-manifests.mjs      # counts, sidebar, toc, content-index are derived
bash scripts/validate-local.sh        # must exit 0: catches invalid YAML, bad colours, missing quizzes
node .claude/skills/course-factory/scripts/enrich-report.mjs   # re-audit: candidates should be gone
```

Fix every `✗`. A `⚠` for a doc without a diagram is acceptable only for pure reference docs
(cheatsheets, interview guides) - say so in the summary.

## 4 · Preview in the real lesson UI before pushing

In the site repo (`thepufferlabs-2`), set `LOCAL_COURSE_DIRS=/abs/path/to/this/course` in
`.env.local`, run `npm run dev`, open `http://localhost:3000/courses/<slug>` and read three lessons:
one free doc, one premium doc, one lab. Every block must render (no red "Invalid block" box, no
literal fence text). Diagram colours must be the four palette colours only.

## 5 · Ship

```bash
git add -A
git commit -m "Rich blocks: callouts, four-colour diagrams, quizzes, params/proscons, codetabs"
git push -u origin chore/rich-blocks
gh pr create --fill --title "Rich blocks for every lesson"
```

The `Validate` workflow runs on the PR. Merge to `main` triggers `sync-to-supabase`, and the
lessons are live. Content first is safe: a viewer without the component library shows the
blocks as readable code.

## Batch: the whole catalogue

Run repositories in waves of about eight. For each repo, in a clean clone:

```bash
git switch -c chore/rich-blocks
claude -p "Follow .claude/skills/course-factory/workflows/enrich-course.md end to end on this repository. Stop before step 5 and print the summary."
node scripts/build-manifests.mjs && bash scripts/validate-local.sh && git add -A && git commit -m "Rich blocks for every lesson" && git push -u origin chore/rich-blocks && gh pr create --fill
```

Spot-check each PR with the local preview (step 4) before merging. Keep a sheet of slug →
PR → merged, so a wave that is interrupted resumes from the sheet, not from memory.

## Summary to print at the end (always)

- Docs enriched / docs total; blocks added per type; mermaid fences converted.
- Candidates skipped, with the reason.
- Validator status and the re-audit result.
- The branch and PR URL.
