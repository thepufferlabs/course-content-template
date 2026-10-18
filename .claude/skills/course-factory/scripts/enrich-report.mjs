#!/usr/bin/env node
/**
 * enrich-report.mjs - audit a course's lessons for rich-block coverage and candidates.
 *
 * Zero dependencies. Scans docs/** (and blog/**) *.md, lists which rich fences each lesson already
 * has and what could become one:
 *   mermaid→flow / mermaid→sequence / mermaid→diagram   ```mermaid fences by diagram type
 *   table→params / table→proscons                         GFM tables by header words
 *   note→callout                                          "Note:" / "Tip:" / "Warning:" lines and blockquotes
 *   fences→codetabs                                       adjacent code fences in different languages
 *   missing quiz / missing discussion-or-concept          rubric floors
 *   html / wiki-link                                      render defects
 *
 * Usage:  node enrich-report.mjs [--json] [file.md ...]      (run from the course repo root)
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const files = args.filter((a) => !a.startsWith("--"));
const ROOT = process.cwd();
const RICH = ["callout", "flow", "sequence", "quiz", "proscons", "params", "demo", "codetabs", "diagram"];
const PARAM_HEADERS = /\b(parameter|param|field|option|flag|key|argument|arg|property|prop|setting|env|variable|header|column)s?\b/i;
const PROSCONS_HEADERS = /\b(pros?|cons?|advantages?|disadvantages?|benefits?|drawbacks?|strengths?|weaknesses?)\b/i;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".md") && !/readme\.md$/i.test(p)) out.push(p);
  }
  return out;
}

/** Top-level fences with line numbers; nested fences stay inside their parent body. */
function scanFences(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const open = /^(\s{0,3})(`{3,}|~{3,})\s*([\w+#-]+)?\s*(.*)$/.exec(lines[i]);
    if (!open) { i += 1; continue; }
    const fence = open[2], start = i;
    i += 1;
    const body = [];
    while (i < lines.length && !new RegExp(`^\\s{0,3}${fence[0]}{${fence.length},}\\s*$`).test(lines[i])) { body.push(lines[i]); i += 1; }
    i += 1;
    out.push({ lang: (open[3] || "").toLowerCase(), meta: open[4] || "", body, start, end: i });
  }
  return out;
}

function mermaidKind(body) {
  const first = body.find((l) => l.trim() && !l.trim().startsWith("%%")) || "";
  if (/^\s*(flowchart|graph)\b/i.test(first)) return "flow";
  if (/^\s*sequenceDiagram\b/i.test(first)) return "sequence";
  const m = /^\s*([A-Za-z-]+)/.exec(first);
  return m ? m[1].toLowerCase() : "unknown";
}

function analyse(file) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  const fences = scanFences(lines);
  const inFence = new Array(lines.length).fill(false);
  for (const f of fences) for (let k = f.start; k < f.end; k++) inFence[k] = true;

  const present = Object.fromEntries(RICH.map((k) => [k, 0]));
  const candidates = [];
  const defects = [];
  let alerts = 0;

  for (const f of fences) {
    if (RICH.includes(f.lang)) present[f.lang] += 1;
    if (f.lang === "mermaid") {
      const kind = mermaidKind(f.body);
      const target = kind === "flow" ? "flow" : kind === "sequence" ? "sequence" : "diagram";
      candidates.push({ kind: `mermaid→${target}`, line: f.start + 1, detail: kind });
    }
    if (f.lang === "callout" && /type=(discussion|concept)/.test(f.meta)) present[`callout:${/type=(discussion|concept)/.exec(f.meta)[1]}`] = (present[`callout:${/type=(discussion|concept)/.exec(f.meta)[1]}`] || 0) + 1;
    if (f.lang === "quiz") {
      const n = f.body.filter((l) => /^\s*-\s*question\s*:/.test(l)).length;
      const e = f.body.filter((l) => /^\s*explanation\s*:/.test(l)).length;
      if (n && e < n) defects.push({ kind: "quiz without explanations", line: f.start + 1, detail: `${n - e} of ${n}` });
    }
    if (["flow", "sequence", "diagram"].includes(f.lang)) {
      for (const l of f.body) for (const m of l.matchAll(/:::([\w-]+)/g)) if (!["blue", "green", "amber", "purple"].includes(m[1])) defects.push({ kind: "colour outside the four", line: f.start + 1, detail: m[1] });
    }
  }

  // adjacent code fences in different languages → codetabs candidate
  const codeFences = fences.filter((f) => f.lang && !RICH.includes(f.lang) && f.lang !== "mermaid");
  for (let k = 0; k + 1 < codeFences.length; k++) {
    const a = codeFences[k], b = codeFences[k + 1];
    const between = lines.slice(a.end, b.start).every((l) => !l.trim());
    if (between && a.lang !== b.lang) candidates.push({ kind: "fences→codetabs", line: a.start + 1, detail: `${a.lang} + ${b.lang}` });
  }

  // prose-level scans (outside fences)
  for (let k = 0; k < lines.length; k++) {
    if (inFence[k]) continue;
    const l = lines[k];
    if (/^\s*>\s*\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION|CONCEPT|DISCUSSION)\]/i.test(l)) { alerts += 1; continue; }
    if (/^\s*(>\s*)?\*{0,2}(Note|Tip|Warning|Important|Caution)\*{0,2}\s*:/i.test(l)) candidates.push({ kind: "note→callout", line: k + 1, detail: l.trim().slice(0, 60) });
    if (/^\s*\|/.test(l) && /^\s*\|?\s*:?-{3,}/.test(lines[k + 1] || "")) {
      const header = l;
      if (PROSCONS_HEADERS.test(header)) candidates.push({ kind: "table→proscons", line: k + 1, detail: header.trim().slice(0, 60) });
      else if (PARAM_HEADERS.test(header)) candidates.push({ kind: "table→params", line: k + 1, detail: header.trim().slice(0, 60) });
    }
    if (/<\/?(div|br|details|summary|img|span|sub|sup|kbd|table|b|i|u)\b[^>]*>/i.test(l)) defects.push({ kind: "html", line: k + 1, detail: l.trim().slice(0, 60) });
    if (/\[\[[^\]]+\]\]/.test(l)) defects.push({ kind: "wiki-link", line: k + 1, detail: l.trim().slice(0, 60) });
  }

  const isDoc = /(^|\/)docs\/(free|premium)\//.test(relative(ROOT, file));
  const diagrams = present.flow + present.sequence + present.diagram;
  const missing = [];
  if (isDoc && !present.quiz) missing.push("quiz");
  if (isDoc && !(present["callout:discussion"] || present["callout:concept"])) missing.push("discussion-or-concept callout");
  if (isDoc && diagrams === 0 && !candidates.some((c) => c.kind.startsWith("mermaid"))) missing.push("flow-or-sequence diagram");

  const words = text.replace(/^---[\s\S]*?---/, "").split(/\s+/).filter(Boolean).length;
  return { file: relative(ROOT, file), isDoc, words, present: { ...present, alerts }, candidates, missing, defects };
}

const targets = files.length ? files.map((f) => join(ROOT, f)) : [...walk(join(ROOT, "docs")), ...walk(join(ROOT, "blog"))].filter((f) => !f.includes("/shared/"));
const results = targets.map(analyse);

if (asJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  const total = results.length;
  const docs = results.filter((r) => r.isDoc);
  const withQuiz = docs.filter((r) => r.present.quiz).length;
  const withDiagram = docs.filter((r) => r.present.flow + r.present.sequence + r.present.diagram > 0).length;
  const candTotal = results.reduce((n, r) => n + r.candidates.length, 0);
  console.log(`# Rich-block audit: ${total} lessons (${docs.length} docs)\n`);
  console.log(`docs with a closing quiz: ${withQuiz}/${docs.length} · docs with a flow/sequence/diagram: ${withDiagram}/${docs.length} · candidates: ${candTotal}\n`);
  for (const r of results) {
    const have = Object.entries(r.present).filter(([, v]) => v > 0).map(([k, v]) => `${k}×${v}`).join(" ") || "none";
    console.log(`## ${r.file}  (${r.words} words)`);
    console.log(`- has: ${have}`);
    if (r.missing.length) console.log(`- MISSING: ${r.missing.join(", ")}`);
    for (const c of r.candidates) console.log(`- candidate ${c.kind} @${c.line}: ${c.detail}`);
    for (const d of r.defects) console.log(`- DEFECT ${d.kind} @${d.line}: ${d.detail}`);
    console.log("");
  }
}
