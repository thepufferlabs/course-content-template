#!/usr/bin/env node
/**
 * Template sync — push the template-owned files into every course repo.
 *
 * The course repos were created with GitHub's "Use this template", which is a one-time copy.
 * This script makes the template the source of truth afterwards: it copies the paths listed in
 * template-sync.json (`managedPaths`) into each downstream repo and commits them, so a push to the
 * template's main branch lands in every course repo without anyone touching them by hand.
 *
 * Downstream repos are discovered by GitHub topic (`downstream.topic`) under `downstream.owner`,
 * and must contain the marker file (`downstream.marker`, default `meta.json`). A repo opts out
 * by committing an empty `.template-sync-ignore` at its root.
 *
 * Usage:
 *   node scripts/template-sync/sync.mjs [--dry-run] [--mode push|pr] [--include-legacy]
 *                                       [--repo owner/name ...]
 *
 *   --dry-run         clone + apply, print the diff, commit nothing
 *   --mode push       commit straight to the repo's default branch (default)
 *   --mode pr         push a `chore/template-sync` branch and open/update a pull request
 *   --include-legacy  also sync repos whose default branch is not `main` (pre-template layout)
 *   --repo            sync only these repos (repeatable); skips topic discovery
 *
 * Needs the `gh` CLI, authenticated with access to the downstream repos. In GitHub Actions set
 * GH_TOKEN to a fine-grained PAT with Contents, Pull requests and Workflows read/write on them.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEMPLATE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STAMP_FILE = ".template-sync";
const IGNORE_FILE = ".template-sync-ignore";
const PR_BRANCH = "chore/template-sync";

// ─── args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const values = (name) => args.flatMap((a, i) => (a === name && args[i + 1] ? [args[i + 1]] : []));
const dryRun = flag("--dry-run");
const includeLegacy = flag("--include-legacy");
const mode = values("--mode")[0] ?? "push";
const onlyRepos = values("--repo");
if (!["push", "pr"].includes(mode)) die(`--mode must be push or pr (got ${mode})`);

// ─── template side ───────────────────────────────────────────────────────────
const manifest = JSON.parse(readFileSync(join(TEMPLATE_ROOT, "template-sync.json"), "utf8"));
const { owner, topic, marker = "meta.json", exclude = [] } = manifest.downstream;
const managed = manifest.managedPaths;
const templateSha = run("git", ["rev-parse", "HEAD"], TEMPLATE_ROOT).trim();
const templateShort = templateSha.slice(0, 7);
const templateRepo = run("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], TEMPLATE_ROOT).trim();

log(`template ${templateRepo}@${templateShort} · ${managed.length} managed paths · mode=${mode}${dryRun ? " · DRY RUN" : ""}`);

// ─── discover downstream repos ───────────────────────────────────────────────
const repos = onlyRepos.length ? onlyRepos.map((r) => ({ nameWithOwner: r })) : discover();
if (repos.length === 0) die("no downstream repos found");

const results = [];
for (const repo of repos) {
  try {
    results.push(await syncRepo(repo));
  } catch (err) {
    results.push({ repo: repo.nameWithOwner, status: "error", detail: String(err.message ?? err).split("\n")[0] });
  }
}

// ─── summary ─────────────────────────────────────────────────────────────────
const rows = results.map((r) => `| ${r.repo} | ${r.status} | ${r.detail ?? ""} |`);
const table = ["| repo | status | detail |", "|---|---|---|", ...rows].join("\n");
console.log("\n" + table);
if (process.env.GITHUB_STEP_SUMMARY) {
  writeFileSync(process.env.GITHUB_STEP_SUMMARY, `## Template sync ${templateRepo}@${templateShort}${dryRun ? " (dry run)" : ""}\n\n${table}\n`, { flag: "a" });
}
if (results.some((r) => r.status === "error")) process.exit(1);

// ─── per-repo ────────────────────────────────────────────────────────────────
async function syncRepo(repo) {
  const name = repo.nameWithOwner;
  if (exclude.includes(name)) return { repo: name, status: "skipped", detail: "excluded in template-sync.json" };
  if (repo.isArchived) return { repo: name, status: "skipped", detail: "archived" };

  const info = JSON.parse(run("gh", ["repo", "view", name, "--json", "defaultBranchRef,isArchived"]));
  const branch = info.defaultBranchRef?.name;
  if (!branch) return { repo: name, status: "skipped", detail: "empty repo" };
  if (branch !== "main" && !includeLegacy) return { repo: name, status: "skipped", detail: `legacy layout (default branch ${branch}); use --include-legacy` };

  const work = mkdtempSync(join(tmpdir(), "template-sync-"));
  try {
    run("gh", ["repo", "clone", name, work, "--", "--depth", "1", "--branch", branch, "--quiet"]);
    if (!existsSync(join(work, marker))) return { repo: name, status: "skipped", detail: `no ${marker} marker` };
    if (existsSync(join(work, IGNORE_FILE))) return { repo: name, status: "skipped", detail: `${IGNORE_FILE} present` };

    for (const rel of managed) applyPath(rel, work);

    let changed = run("git", ["status", "--porcelain"], work).trim();
    if (!changed) return { repo: name, status: "up-to-date" };

    writeFileSync(join(work, STAMP_FILE), `template=${templateRepo}\nsha=${templateSha}\n`);
    changed = run("git", ["status", "--porcelain"], work).trim();
    const files = changed.split("\n").length;

    if (dryRun) {
      console.log(`\n--- ${name} (dry run) ---\n${changed}`);
      return { repo: name, status: "would-update", detail: `${files} files` };
    }

    const git = (...a) => run("git", ["-c", "user.name=template-sync", "-c", "user.email=template-sync@users.noreply.github.com", ...a], work);
    const message = `chore(template): sync shared files from ${templateRepo}@${templateShort}\n\nManaged paths: ${managed.join(", ")}`;
    git("add", "-A");
    git("commit", "-q", "-m", message);

    if (mode === "push") {
      git("push", "-q", "origin", `HEAD:${branch}`);
      return { repo: name, status: "pushed", detail: `${files} files → ${branch}` };
    }

    git("push", "-q", "--force", "origin", `HEAD:refs/heads/${PR_BRANCH}`);
    const existing = run("gh", ["pr", "list", "--repo", name, "--head", PR_BRANCH, "--state", "open", "--json", "url", "-q", ".[0].url"]).trim();
    if (existing) return { repo: name, status: "pr-updated", detail: existing };
    const url = run("gh", [
      "pr", "create", "--repo", name, "--head", PR_BRANCH, "--base", branch,
      "--title", `chore(template): sync shared files (${templateShort})`,
      "--body", `Automated sync of template-owned files from ${templateRepo}@${templateSha}.\n\nManaged paths:\n${managed.map((p) => `- \`${p}\``).join("\n")}`,
    ]).trim();
    return { repo: name, status: "pr-opened", detail: url };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

/** Mirror one managed path from the template into the working copy (deletions included). */
function applyPath(rel, work) {
  const src = join(TEMPLATE_ROOT, rel);
  const dst = join(work, rel);
  rmSync(dst, { recursive: true, force: true });
  if (!existsSync(src)) return; // removed from the template → removed downstream
  mkdirSync(dirname(dst), { recursive: true });
  if (statSync(src).isDirectory()) cpSync(src, dst, { recursive: true, filter: (p) => !p.endsWith(".DS_Store") });
  else cpSync(src, dst);
}

function discover() {
  const list = JSON.parse(run("gh", ["repo", "list", owner, "--topic", topic, "--limit", "500", "--json", "nameWithOwner,isArchived"]));
  log(`found ${list.length} repos with topic "${topic}" under ${owner}`);
  return list.sort((a, b) => a.nameWithOwner.localeCompare(b.nameWithOwner));
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function run(cmd, cmdArgs, cwd = process.cwd()) {
  const res = spawnSync(cmd, cmdArgs, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (res.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(" ")} failed: ${(res.stderr || res.stdout).trim()}`);
  return res.stdout;
}
function log(msg) { console.log(`[template-sync] ${msg}`); }
function die(msg) { console.error(`[template-sync] ${msg}`); process.exit(1); }
