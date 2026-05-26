# course-content-template

> GitHub template repository. Click **"Use this template"** to create a new course repo with everything pre-wired.

This repo provides the bootstrap scaffold for any new `premium-content-repo` (schema v1.0). After clicking *Use this template*:

1. Rename your new repo and set its slug.
2. Replace `<COURSE_SLUG>` in `.github/workflows/sync-to-supabase.yml`.
3. Copy `COURSE-BRIEF.template.md` → `COURSE-BRIEF.md` and fill it in.
4. Ask Claude: *"Generate the course repo from `COURSE-BRIEF.md` per `MASTER-COURSE-REPO-PROMPT.md`."*
5. Add the required GitHub Actions secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

That's it.

## What's in here

| Path | What it does | Edit? |
|---|---|---|
| `MASTER-COURSE-REPO-PROMPT.md` | The prompt Claude reads to scaffold the course | No |
| `COURSE-BRIEF.template.md` | Fill-in form: course identity, chapters, depth notes, code samples | Copy → `COURSE-BRIEF.md`, then yes |
| `COURSE-PLATFORM-PROMPT.md` | Reference for the platform side (Next.js + Supabase) | No |
| `scripts/validate.sh` | Thin stub — fetches and runs the real validator from `senapatisantosh/course-tooling` | No |
| `.github/workflows/validate.yml` | CI: runs the validator on every push/PR via the central action | No |
| `.github/workflows/sync-to-supabase.yml` | CI: pushes content to Supabase on merges to `main` | **Yes** — swap `<COURSE_SLUG>` |
| `.content-repo` | Empty marker file; triggers the sync workflow | No |
| `.gitignore` | Standard ignores | No |

## How updates flow

- **Prompts** (`MASTER-*`, `COURSE-*`): copied once at init. If they change in this template, you can `git pull` them in manually or just live with the version you bootstrapped against.
- **Validator** (`scripts/validate.sh`): the stub here fetches the real script from `senapatisantosh/course-tooling@v1`. When that repo ships a fix and re-tags `v1`, your next CI run picks it up automatically. No copy-paste.

Pin to a specific version any time:

```bash
COURSE_TOOLING_REF=v1.2.3 bash scripts/validate.sh
```

## Local development on a course repo

```bash
# Generate course content (Claude writes the docs/, src/, data/ files)
# ... follow the brief ...

# Validate
bash scripts/validate.sh
bash scripts/validate.sh --strict    # fail on warnings too
```
