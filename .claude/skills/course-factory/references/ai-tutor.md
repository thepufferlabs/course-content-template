# Ask AI — writing lessons the course tutor can use well

Every lesson page on the site has **Ask AI**, a tutor that answers from the course. This page
explains how it reads your content, so you can write lessons that give precise, well-cited answers
and fewer hallucinations. Check a repo with:

```
node .claude/skills/course-factory/scripts/ai-readiness.mjs
```

CI runs the same report on every push (`validate.yml`, report only; it never blocks).

---

## How the tutor reads a course

| What it uses | Where it comes from | What that means for authors |
| --- | --- | --- |
| The lesson on screen | The lesson's Markdown, split into sections at `##` / `###` headings | A section is the unit of citation. Every answer links to the sections it used. |
| Section anchors | The heading text, slugged exactly like GitHub (`## Retry budgets` → `#retry-budgets`; repeats get `-1`, `-2`) | Renaming a heading breaks old citations and eval anchors. Make headings descriptive and unique. |
| `get_course_outline` | `docs/shared/content-index.json` (titles, sections, order, access) | Lesson titles and section names are how the tutor finds the right lesson. Name them for the topic. |
| `search_course` | Keyword match on titles, sections, tags, then on section text | Use the exact terms a learner would type (the API name, the flag, the error code) in headings and the first sentence of a section. Put real keywords in `tags`. |
| `read_lesson` | Another lesson's Markdown, by `contentKey` and optional anchor | Cross-lesson answers cite `/courses/<slug>/<contentKey>#anchor`. Keep `contentKey`s stable. |
| `get_my_progress` | The learner's completed lessons and quiz scores | "Quiz me on what I've completed" reads your lessons' content, so every lesson must stand on its own. |
| Skills | Built-in playbooks for quizzes, diagrams, visual blocks, code, study plans and debugging | The tutor writes the same nine rich blocks as `rich-content.md`. Lesson examples teach it the house style. |

Premium lessons are only shown to learners who can open them. The tutor never sees content a
learner cannot read, so don't put free-tier answers only in premium lessons.

## Authoring rules

1. **One `#` title, then `##` sections.** A lesson with no sections can only be cited as a whole.
   Keep sections under about 1,500 words. Split longer ones at a natural sub-topic (`###`).
2. **Descriptive, unique headings.** `## Why retries amplify outages` beats `## Overview`. Repeated
   template headings (`Symptoms`, `Fix`) are allowed, but each one becomes `#symptoms-1`,
   `#symptoms-2` and reads poorly in a citation. Prefer `## Symptoms: pods stuck Pending`.
3. **Lead each section with its claim.** The first one or two sentences of a section are what
   search shows and what the tutor quotes. State the rule, then explain it.
4. **Keep intros short.** Text before the first `##` can't be cited precisely; keep it under
   about 450 words.
5. **Typed code.** Every fence names a language (`ts`, `bash`, `yaml`, `text` …). Untyped code
   is harder to explain and to search.
6. **Quizzes teach.** Every question has an `explanation:`. When it reviews a learner's mistakes,
   the tutor reuses your explanation and cites the section.
7. **Reserved quiz title.** Quiz titles starting with `Practice:` belong to Ask AI's generated
   quizzes and are not recorded as lesson scores. Never start a lesson quiz title with it.
8. **Self-contained lessons.** Define a term where it is first needed, or link the lesson that
   defines it (`[Retry budgets](retry-budgets)`). The tutor may read this lesson alone.
9. **Exact facts.** Version numbers, defaults, limits, error codes and flag names should appear
   verbatim in prose or tables (`params`), not only in screenshots or diagrams. The tutor quotes
   text, and it is told never to invent numbers.
10. **Alt text and link text.** `![Request path through the gateway](…)`, not `![](…)`;
    `[the gateway lesson](gateway)`, not `[here](gateway)`.
11. **Labs.** Labs are full worked solutions and the tutor may cite them. If a lab must hide its
    solution later, mark it in frontmatter (`aiTutor: hide-solution`, reserved) instead of
    leaving the answer out of the repo.

## Golden questions: `ai/eval.json`

Each course keeps a small set of questions with known good answers. They are used to measure the
tutor on that course (retrieval, citations, abstention) before and after changes. The report
validates the file. Aim for **at least 10** per course:

- 5–6 `lesson`: answered by one section of one lesson;
- 2 `cross-lesson`: need a section of another lesson;
- 1 `progress`: depends on what the learner completed (e.g. "what should I study next?");
- 1 `out-of-scope`: the course doesn't cover it; a correct answer says so;
- optionally `quiz`, `diagram` or `code` items that should produce that block.

```json
{
  "version": 1,
  "items": [
    {
      "id": "ids-unique-per-request",
      "kind": "lesson",
      "lesson": "json-rpc-for-mcp-engineers",
      "question": "Why is int(time.time()) a bad request id?",
      "expect": {
        "cite": [{ "lesson": "json-rpc-for-mcp-engineers", "anchor": "request-ids" }],
        "points": ["ids must be unique per in-flight request", "two calls in the same second collide"],
        "mustNotClaim": ["null is a valid request id"]
      }
    },
    {
      "id": "kafka-out-of-scope",
      "kind": "out-of-scope",
      "lesson": "json-rpc-for-mcp-engineers",
      "question": "How do I tune Kafka consumer lag?",
      "expect": { "points": ["says the course doesn't cover it"] }
    }
  ]
}
```

- `lesson` is the `contentKey` the learner is on when they ask.
- `expect.cite` lists the sections a good answer cites. Every anchor must exist; the report checks it.
- `expect.points` are the facts a correct answer must contain; `mustNotClaim` lists known wrong answers.

## Embeddings (later, separate phase)

Course-wide semantic search will add vector embeddings. They are **not** generated in CI or by
this template. A Claude session (in the browser or a local Claude Code) runs the embedding step
per course, in phases, after a repo's readiness report is clean. The chunking contract it will
follow is fixed now, so lessons written today are already chunk-ready:

- one chunk per `##`/`###` section (heading path as a prefix), about 500–800 tokens, splitting
  only between paragraphs;
- code fences and rich blocks are never split;
- `quiz` blocks are excluded, so answers never leak into search;
- the chunk id is derived from the course, `contentKey`, anchor and chunk number, so only changed
  sections are re-embedded.
