# course-factory (Claude Code plugin)

A Spec-Driven Development factory for building premium, publishable **course-content repositories**
(`premium-content-repo` v1.0) for the Puffer Labs platform (GitHub → Supabase → Next.js viewer).

## Install

```bash
/plugin marketplace add <your-gh-user>/<repo>          # the marketplace repo hosting this plugin
/plugin install course-factory@puffer-course-studio
```

## Use

In any repo, just describe the task — the skill is model-invoked from its description:

> "Create a course on Redis with the course-factory skill."
> "Generate the course from `spec/course-spec.md`."
> "This course renders badly in the app — fix the drift."

It walks **Constitution → Specify → Plan → Tasks → Implement → Assemble → Verify** and produces a
repo the existing sync pipeline publishes unchanged. See `SKILL.md` for the loop and
`references/constitution.md` for the verified output contract.

## What's inside

| Path | Role |
|---|---|
| `SKILL.md` | Entry point; the SDD loop and when to read each reference. |
| `references/` | `constitution.md` (the contract), `schema-contract.md`, `consumer-render.md`, `chapter-playbook.md`, `quality-rubric.md`, `asset-guide.md`. |
| `templates/` | `course-spec`, `curriculum-plan`, `tasks` + `meta.json` + 5 content skeletons. |
| `scripts/` | `new-course.sh` (scaffold), `build-manifests.mjs` (derive manifests + counts), `validate-local.sh` (the render + contract gate). |
| `workflows/` | `generate-course.md` — the agentic fan-out playbook for generating a full course AFK. |

## What it guarantees

- Output matches what the live viewer actually parses (`accessLevel`, `toc` phase-form,
  bucket-prefixed `storagePath`, real 7:2 banner, honest counts) — not the older, drifted schema.
- Manifests are **derived from the files** by `build-manifests.mjs`, so they can't drift.
- `validate-local.sh` blocks any course that would render badly (raw HTML, wiki-links, relative
  images, key mismatches, wrong counts).

License: MIT.
