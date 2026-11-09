# Workflow: make a course Ask AI ready

Brings one course repo up to the standard in `references/ai-tutor.md`. Do this one repo at a time.
Run it from the course repo's root.

## Phase 1: report (automatic, all repos)

The template's `validate.yml` runs the readiness report on every push and writes it to the job
summary. Nothing blocks. Locally:

```
node .claude/skills/course-factory/scripts/ai-readiness.mjs          # text
node .claude/skills/course-factory/scripts/ai-readiness.mjs --json   # per-lesson detail
```

Scores: 90+ ready, 75–89 nearly ready, below 75 needs work.

## Phase 2: fix lessons (per repo)

Work from the lowest-scoring lessons up. The rules are the same as for enrichment: **prose
meaning, `contentKey`s and links stay as they are.**

- Split very long sections at a natural sub-topic with `###`.
- Make repeated headings descriptive (`## Symptoms` → `## Symptoms: …`). If a heading changes,
  search the repo for links to its old anchor and update them.
- Add a language to every code fence (`text` for output and plain logs).
- Add missing quiz `explanation:` lines; rename any quiz title that starts with `Practice:`.
- Move long intros under a `##` heading.

Then run, as for every change:

```
node scripts/build-manifests.mjs && bash scripts/validate-local.sh
node .claude/skills/course-factory/scripts/ai-readiness.mjs
```

## Phase 3: golden questions (per repo)

Write `ai/eval.json` (format in `references/ai-tutor.md`), with at least 10 questions per course.
Choose questions a real learner would ask, spread across the course. Take every `expect.point`
from the lesson text itself, and get each anchor from the report's `--json` output, never by
guessing. The report must show no `ai/eval.json` errors. Commit:

```
git add ai/eval.json && git commit -m "Ask AI: golden questions" && git push
```

## Phase 4: embeddings (separate, later)

Not part of this workflow or of CI. A Claude session (browser or local) generates embeddings
course by course, following the chunking contract in `references/ai-tutor.md`. Start it only
for repos whose report is 90+ with a valid `ai/eval.json`, so the eval can confirm that retrieval
improved.
