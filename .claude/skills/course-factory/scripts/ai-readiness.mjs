#!/usr/bin/env node
/**
 * ai-readiness.mjs — how well this course works with Ask AI (the site's course tutor).
 *
 * Ask AI answers from the lesson the learner is reading and from course tools
 * (outline, search, read another lesson, the learner's progress). It cites
 * sections by their heading anchors and builds quizzes and diagrams with the
 * course-ui blocks. This report checks the things that make those answers precise:
 * citable sections, unique anchors, quizzes that teach, typed code, and the
 * course's golden question set (ai/eval.json). See
 * .claude/skills/course-factory/references/ai-tutor.md.
 *
 * REPORT ONLY: it never fails CI unless --strict is passed. Courses are brought
 * up to standard one repo at a time (workflows/ai-readiness.md).
 *
 * Usage:
 *   node .claude/skills/course-factory/scripts/ai-readiness.mjs              # text report
 *   node .claude/skills/course-factory/scripts/ai-readiness.mjs --json       # machine-readable
 *   node .claude/skills/course-factory/scripts/ai-readiness.mjs --summary "$GITHUB_STEP_SUMMARY"
 *   node .claude/skills/course-factory/scripts/ai-readiness.mjs --strict     # exit 1 on errors
 * No dependencies (Node 18+).
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const ROOT = process.cwd();

// ─── Inventory ───────────────────────────────────────────────────────────────

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
  } catch {
    return null;
  }
}

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

const index = readJson("docs/shared/content-index.json");
let lessons = [];
if (Array.isArray(index)) {
  for (const e of index) {
    if (!e?.contentKey || !e?.sourcePath) continue;
    const file = e.contentType === "code" ? path.join(e.sourcePath, "README.md") : e.sourcePath;
    if (fs.existsSync(path.join(ROOT, file))) lessons.push({ key: e.contentKey, title: e.title ?? e.contentKey, file, access: e.accessLevel ?? "free", type: e.contentType ?? "doc" });
  }
} else {
  for (const f of [...walk(path.join(ROOT, "docs/free")), ...walk(path.join(ROOT, "docs/premium"))]) {
    const rel = path.relative(ROOT, f);
    lessons.push({ key: path.basename(f, ".md").replace(/^\d+-/, ""), title: path.basename(f, ".md"), file: rel, access: rel.includes("premium") ? "premium" : "free", type: "doc" });
  }
}

if (lessons.length === 0) {
  console.log("• No course lessons yet (un-filled scaffold): nothing to check.");
  if (opt("--summary")) fs.appendFileSync(opt("--summary"), "### Ask AI readiness\n\nNo lessons yet.\n");
  process.exitCode = 0;
  process.exit();
}

// ─── Markdown helpers (line based; fence aware) ──────────────────────────────

function stripFrontmatter(md) {
  if (!md.startsWith("---")) return md;
  const end = md.indexOf("\n---", 3);
  return end === -1 ? md : md.slice(end + 4);
}

/** github-slugger, which rehype-slug (the site's heading ids) uses. */
function slugBase(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{Nd}\p{Nl}\p{Pc}\- ]/gu, "")
    .replace(/ /g, "-");
}

function plainHeading(raw) {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__|\*|_|~~)/g, "")
    .replace(/\\(.)/g, "$1")
    .trim();
}

const words = (s) => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) ?? []).length;

function parse(md) {
  const lines = stripFrontmatter(md).split("\n");
  const headings = [];
  const fences = [];
  const prose = []; // { line, text } outside fences
  let open = null;
  lines.forEach((line, i) => {
    const m = /^\s{0,3}(`{3,}|~{3,})\s*([^\s`]*)(.*)$/.exec(line);
    if (!open) {
      if (m) {
        open = { marker: m[1], lang: m[2].toLowerCase(), info: m[3].trim(), start: i, body: [] };
        return;
      }
      const h = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (h) headings.push({ depth: h[1].length, text: plainHeading(h[2]), line: i });
      prose.push({ line: i, text: line });
    } else if (m && m[1][0] === open.marker[0] && m[1].length >= open.marker.length && line.trim() === m[1]) {
      fences.push({ ...open, end: i });
      open = null;
    } else {
      open.body.push(line);
    }
  });
  if (open) fences.push({ ...open, end: lines.length, unclosed: true });
  return { lines, headings, fences, prose };
}

const RICH = new Set(["callout", "flow", "sequence", "diagram", "quiz", "proscons", "params", "demo", "codetabs", "mermaid"]);

// ─── Per-lesson checks ───────────────────────────────────────────────────────

function check(lesson) {
  const md = fs.readFileSync(path.join(ROOT, lesson.file), "utf8");
  const { headings, fences, prose } = parse(md);
  const issues = []; // { sev: "error"|"warn"|"info", code, msg }
  const add = (sev, code, msg) => issues.push({ sev, code, msg });

  // Anchors exactly as the site computes them (document order, -1/-2 for repeats).
  const seen = new Map();
  const anchors = new Map();
  const dupes = new Set();
  for (const h of headings) {
    const base = slugBase(h.text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    if (n > 0 && h.depth >= 2) dupes.add(h.text);
    const id = n === 0 ? base : `${base}-${n}`;
    h.anchor = id;
    anchors.set(id, h.text);
  }

  const h1 = headings.filter((h) => h.depth === 1);
  if (h1.length === 0) add("warn", "no-h1", "no # title heading");
  if (h1.length > 1) add("warn", "many-h1", `${h1.length} # headings (keep one title; use ## for sections)`);
  for (const d of dupes) add("info", "duplicate-heading", `heading "${d}" repeats (its anchors become -1, -2…; a descriptive heading makes the citation readable)`);

  // Sections: prose words between ## / ### headings.
  const cuts = headings.filter((h) => h.depth === 2 || h.depth === 3);
  const total = words(prose.map((p) => p.text).join(" "));
  if (cuts.length === 0 && total > 600) add("warn", "no-sections", `${total} words and no ## sections: nothing precise to cite`);
  const bounds = [...cuts.map((h) => h.line), Infinity];
  const firstCut = cuts[0]?.line ?? Infinity;
  const intro = words(prose.filter((p) => p.line < firstCut && !/^#\s/.test(p.text)).map((p) => p.text).join(" "));
  if (intro > 450) add("info", "long-intro", `${intro} words before the first ## section (uncitable; move it under a heading)`);
  cuts.forEach((h, i) => {
    const w = words(prose.filter((p) => p.line > h.line && p.line < bounds[i + 1]).map((p) => p.text).join(" "));
    if (w > 1500) add("warn", "long-section", `section "${h.text}" has ${w} words (split it so answers can cite the exact part)`);
  });

  // Fences.
  for (const f of fences) {
    if (f.unclosed) add("error", "unclosed-fence", `fence opened on line ${f.start + 1} never closes`);
    if (!f.lang) add("warn", "untyped-code", `code fence on line ${f.start + 1} has no language`);
    if (f.lang === "quiz") {
      const title = /title="([^"]*)"/.exec(f.info)?.[1] ?? "";
      if (/^practice:/i.test(title)) add("error", "reserved-quiz-title", `quiz title "${title}": titles starting with "Practice:" are reserved for Ask AI quizzes`);
      const body = f.body.join("\n");
      const q = (body.match(/^\s*-\s*question:/gm) ?? []).length;
      const ex = (body.match(/^\s*explanation:/gm) ?? []).length;
      if (q === 0) add("error", "empty-quiz", `quiz on line ${f.start + 1} has no questions`);
      else if (ex < q) add("warn", "quiz-no-explanation", `quiz on line ${f.start + 1}: ${q - ex} of ${q} questions have no explanation (the tutor reuses explanations when it reviews mistakes)`);
    }
  }
  const quizzes = fences.filter((f) => f.lang === "quiz").length;
  if (lesson.type === "doc" && quizzes === 0 && total > 800) add("info", "no-quiz", "no closing quiz");

  // Prose details.
  for (const p of prose) {
    for (const m of p.text.matchAll(/!\[\s*\]\(/g)) add("warn", "image-no-alt", `image without alt text on line ${p.line + 1}`);
    for (const m of p.text.matchAll(/\[(here|click here|this|link|this link|read more)\]\(/gi)) add("info", "vague-link", `link text "${m[1]}" on line ${p.line + 1} (say what it points to)`);
    if (/<\/?[a-z][^>]*>/i.test(p.text.replace(/`[^`]*`/g, ""))) add("info", "raw-html", `raw HTML on line ${p.line + 1}`);
  }

  // Score: 100 minus capped penalties.
  const pen = { "no-h1": 10, "many-h1": 5, "duplicate-heading": 2, "no-sections": 15, "long-intro": 5, "long-section": 5, "unclosed-fence": 20, "untyped-code": 2, "reserved-quiz-title": 10, "empty-quiz": 10, "quiz-no-explanation": 8, "no-quiz": 5, "image-no-alt": 2, "vague-link": 1, "raw-html": 2 };
  const cap = { "duplicate-heading": 8, "long-section": 15, "untyped-code": 10, "image-no-alt": 6, "vague-link": 5, "raw-html": 6 };
  const byCode = {};
  for (const i of issues) byCode[i.code] = (byCode[i.code] ?? 0) + (pen[i.code] ?? 0);
  const lost = Object.entries(byCode).reduce((n, [c, v]) => n + Math.min(v, cap[c] ?? v), 0);
  const score = Math.max(0, 100 - lost);
  return { ...lesson, words: total, sections: cuts.length, quizzes, anchors, issues, score };
}

const results = lessons.map(check);

// ─── Golden question set (ai/eval.json) ──────────────────────────────────────

const KINDS = new Set(["lesson", "cross-lesson", "progress", "out-of-scope", "quiz", "diagram", "code"]);
const evalIssues = [];
let evalItems = 0;
const evalPath = "ai/eval.json";
if (fs.existsSync(path.join(ROOT, evalPath))) {
  const ev = readJson(evalPath);
  const byKey = new Map(results.map((r) => [r.key, r]));
  if (!ev || !Array.isArray(ev.items)) evalIssues.push({ sev: "error", msg: `${evalPath} must be JSON with an "items" array` });
  else {
    const ids = new Set();
    ev.items.forEach((it, n) => {
      const where = `${evalPath} item ${it?.id ?? n + 1}`;
      if (!it || typeof it !== "object") return evalIssues.push({ sev: "error", msg: `${where}: not an object` });
      evalItems++;
      if (!it.id || ids.has(it.id)) evalIssues.push({ sev: "error", msg: `${where}: id missing or repeated` });
      ids.add(it.id);
      if (typeof it.question !== "string" || it.question.trim().length < 8) evalIssues.push({ sev: "error", msg: `${where}: question missing` });
      if (!KINDS.has(it.kind)) evalIssues.push({ sev: "error", msg: `${where}: kind must be one of ${[...KINDS].join(", ")}` });
      if (!byKey.has(it.lesson)) evalIssues.push({ sev: "error", msg: `${where}: lesson "${it.lesson}" is not a contentKey of this course` });
      for (const c of it.expect?.cite ?? []) {
        const target = byKey.get(c.lesson);
        if (!target) evalIssues.push({ sev: "error", msg: `${where}: cites unknown lesson "${c.lesson}"` });
        else if (c.anchor && !target.anchors.has(c.anchor)) evalIssues.push({ sev: "error", msg: `${where}: anchor #${c.anchor} does not exist in ${c.lesson}` });
      }
      if (it.kind !== "out-of-scope" && !(it.expect?.points?.length > 0)) evalIssues.push({ sev: "warn", msg: `${where}: no expect.points (what a correct answer must say)` });
    });
    const kinds = new Set(ev.items.map((i) => i?.kind));
    if (evalItems < 10) evalIssues.push({ sev: "warn", msg: `${evalPath}: ${evalItems} questions (aim for at least 10)` });
    for (const k of ["lesson", "cross-lesson", "out-of-scope"]) if (!kinds.has(k)) evalIssues.push({ sev: "warn", msg: `${evalPath}: no "${k}" question` });
  }
} else {
  evalIssues.push({ sev: "info", msg: `no ${evalPath} yet (golden questions; see workflows/ai-readiness.md)` });
}

// ─── Report ──────────────────────────────────────────────────────────────────

const avg = Math.round(results.reduce((n, r) => n + r.score, 0) / results.length);
const counts = {};
for (const r of results) for (const i of r.issues) counts[i.code] = (counts[i.code] ?? 0) + 1;
const errors = results.reduce((n, r) => n + r.issues.filter((i) => i.sev === "error").length, 0) + evalIssues.filter((i) => i.sev === "error").length;
const worst = [...results].sort((a, b) => a.score - b.score).slice(0, 10);
const band = avg >= 90 ? "ready" : avg >= 75 ? "nearly ready" : "needs work";

if (flag("--json")) {
  console.log(
    JSON.stringify(
      {
        score: avg,
        band,
        lessons: results.map((r) => ({ key: r.key, file: r.file, score: r.score, words: r.words, sections: r.sections, quizzes: r.quizzes, issues: r.issues })),
        eval: { items: evalItems, issues: evalIssues },
        issueCounts: counts,
        errors,
      },
      null,
      2
    )
  );
} else {
  console.log(`== Ask AI readiness: ${avg}/100 (${band}) over ${results.length} lessons ==`);
  for (const [c, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${c}`);
  console.log("\nLowest-scoring lessons:");
  for (const r of worst) {
    console.log(`  ${String(r.score).padStart(3)}  ${r.file}`);
    for (const i of r.issues.slice(0, 4)) console.log(`         ${i.sev === "error" ? "✗" : i.sev === "warn" ? "⚠" : "•"} ${i.msg}`);
  }
  console.log(`\nGolden questions (${evalPath}): ${evalItems}`);
  for (const i of evalIssues) console.log(`  ${i.sev === "error" ? "✗" : i.sev === "warn" ? "⚠" : "•"} ${i.msg}`);
}

const summary = opt("--summary");
if (summary) {
  const rows = worst.map((r) => `| ${r.score} | \`${r.file}\` | ${r.issues.slice(0, 2).map((i) => i.msg.replace(/\|/g, "\\|")).join("; ") || "—"} |`).join("\n");
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `\`${c}\` ×${n}`)
    .join(", ");
  fs.appendFileSync(
    summary,
    `### Ask AI readiness: ${avg}/100 (${band})\n\n${results.length} lessons · golden questions: ${evalItems}${errors ? ` · ${errors} error(s)` : ""}\n\n${top ? `Issues: ${top}\n\n` : ""}| Score | Lesson | Top issues |\n|---:|---|---|\n${rows}\n\n${evalIssues.map((i) => `- ${i.msg}`).join("\n")}\n\n_Report only. Guide: .claude/skills/course-factory/references/ai-tutor.md_\n`
  );
}

process.exitCode = flag("--strict") && errors > 0 ? 1 : 0;
