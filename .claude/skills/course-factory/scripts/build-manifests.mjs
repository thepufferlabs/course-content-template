#!/usr/bin/env node
/**
 * build-manifests.mjs — the drift killer.
 *
 * Scans a course repo's on-disk content and DERIVES every manifest the pipeline reads:
 *   docs/shared/content-index.json   (→ product_content rows)
 *   docs/shared/sidebar.json         (→ course_details.sidebar_data)
 *   docs/shared/toc.json             (→ course_details.toc_data)
 *   data/tags.json                   (tag taxonomy)
 * and rewrites the derived fields of meta.json:
 *   freeContentCount, premiumContentCount, previewDocPaths, premiumDocPaths,
 *   publicBlogPaths, premiumBlogPaths, sampleCodePaths, premiumCodePaths.
 *
 * Manifests are a pure function of the files, so they can never drift from the content.
 * Zero dependencies (Node >= 18 built-ins only). Idempotent.
 *
 * Optional input: spec/structure.json describes section titles/icons and phases:
 *   {
 *     "sections": [{ "id": "foundations", "title": "Foundations", "icon": "layers" }],
 *     "phases":   [{ "phase": "Phase 1 — Foundations", "description": "...",
 *                    "sections": ["getting-started","foundations"] }]
 *   }
 * If absent, sections/phases are derived from frontmatter (`section`, `phase`) with sensible
 * titles/icons. Per-doc frontmatter `phase:` also feeds the TOC when structure.json omits it.
 *
 * Usage:  node scripts/build-manifests.mjs [repoRoot]   (default: cwd)
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, relative, basename, dirname } from "node:path";

const ROOT = process.argv[2] || process.cwd();
const p = (...s) => join(ROOT, ...s);
const rel = (abs) => relative(ROOT, abs).split("\\").join("/");

// ---------- helpers ----------
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}
function titleCase(s) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
const ICONS = {
  "getting-started": "rocket", foundations: "layers", core: "boxes", traffic: "route",
  storage: "database", data: "database", consistency: "git-branch", performance: "zap",
  reliability: "shield", "deep-dive": "zap", architecture: "network", distributed: "network",
  labs: "wrench", "case-studies": "book-open", cheatsheets: "list", interview: "graduation-cap",
  scaling: "trending-up", security: "lock", observability: "activity",
};
const iconFor = (id) => ICONS[id] || "circle";

// ---------- frontmatter (line-based; our format is known) ----------
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!mm) continue;
    let [, k, v] = mm;
    v = v.trim();
    if (v === "null" || v === "") { fm[k] = v === "null" ? null : ""; continue; }
    if (v.startsWith("[")) { try { fm[k] = JSON.parse(v.replace(/'/g, '"')); continue; } catch {} }
    if (/^-?\d+$/.test(v)) { fm[k] = Number(v); continue; }
    fm[k] = v.replace(/^["']|["']$/g, "");
  }
  return fm;
}
function firstH1(text) {
  const m = text.replace(/^---[\s\S]*?---/, "").match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

// ---------- load meta ----------
if (!existsSync(p("meta.json"))) { console.error("✗ meta.json not found at", ROOT); process.exit(2); }
const meta = JSON.parse(readFileSync(p("meta.json"), "utf8"));
const slug = meta.slug;
if (!slug) { console.error("✗ meta.json missing slug"); process.exit(2); }

const structure = existsSync(p("spec/structure.json"))
  ? JSON.parse(readFileSync(p("spec/structure.json"), "utf8")) : { sections: [], phases: [] };
const sectionMeta = new Map((structure.sections || []).map((s) => [s.id, s]));

// ---------- collect items ----------
const items = [];

function addDoc(abs, accessLevel) {
  const text = readFileSync(abs, "utf8");
  const fm = parseFrontmatter(text);
  const file = basename(abs);
  if (file.toLowerCase() === "readme.md") return;
  const sourcePath = rel(abs);
  const stem = file.replace(/\.md$/, "");
  const key = fm.contentKey || stem.replace(/^\d+[-_]/, "");
  const order = typeof fm.order === "number" ? fm.order
    : (parseInt((stem.match(/^(\d+)/) || [])[1] || "0", 10));
  const section = fm.section || basename(dirname(abs));
  const contentType = fm.contentType || (sourcePath.includes("/blog/") ? "blog" : "doc");
  const bucket = accessLevel === "free" ? "free-content" : "premium-content";
  const routeKind = contentType === "blog" ? "blog" : "learn";
  items.push({
    contentKey: key,
    title: fm.title || firstH1(text) || titleCase(key),
    section,
    accessLevel,
    contentType,
    sourceType: "same_repo",
    sourcePath,
    storagePath: `${bucket}/${slug}/${sourcePath}`,
    routePath: `/project/${slug}/${routeKind}/${key.replace(/^blog-/, "")}`,
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    order,
    phase: fm.phase || null,
    isPublished: fm.isPublished !== false,
    migrationTargetPath: fm.migrationTargetPath ?? null,
  });
}

function addCodeDirs(base, accessLevel) {
  if (!existsSync(p(base))) return;
  for (const name of readdirSync(p(base))) {
    const abs = p(base, name);
    if (!statSync(abs).isDirectory()) continue;
    const sourcePath = `${base}/${name}`;
    const key = name.replace(/^\d+[-_]/, "");
    const order = parseInt((name.match(/^(\d+)/) || [])[1] || "0", 10);
    const bucket = accessLevel === "free" ? "free-content" : "premium-content";
    if (!existsSync(join(abs, "README.md")))
      console.warn(`⚠ code dir has no README.md (won't render): ${sourcePath}`);
    items.push({
      contentKey: `code-${key}`, title: titleCase(key), section: "code",
      accessLevel, contentType: "code", sourceType: "same_repo",
      sourcePath, storagePath: `${bucket}/${slug}/${sourcePath}`,
      routePath: `/project/${slug}/code/${key}`, tags: ["code"], order,
      phase: null, isPublished: true, migrationTargetPath: null,
    });
  }
}

walk(p("docs/free")).filter((f) => f.endsWith(".md")).forEach((f) => addDoc(f, "free"));
walk(p("docs/premium")).filter((f) => f.endsWith(".md")).forEach((f) => addDoc(f, "premium"));
walk(p("blog/public")).filter((f) => f.endsWith(".md")).forEach((f) => addDoc(f, "free"));
walk(p("blog/premium")).filter((f) => f.endsWith(".md")).forEach((f) => addDoc(f, "premium"));
addCodeDirs("src/samples", "free");
addCodeDirs("src/premium", "premium");

// dedupe check
const seen = new Map();
for (const it of items) {
  if (seen.has(it.contentKey)) {
    console.error(`✗ duplicate contentKey "${it.contentKey}" in ${it.sourcePath} and ${seen.get(it.contentKey)}`);
    process.exit(1);
  }
  seen.set(it.contentKey, it.sourcePath);
}
items.sort((a, b) => a.order - b.order);

// ---------- content-index.json ----------
const contentIndex = items.map(({ phase, ...rest }) => rest);
writeFileSync(p("docs/shared/content-index.json"), JSON.stringify(contentIndex, null, 2) + "\n");

// ---------- sidebar.json ----------
const bySection = new Map();
for (const it of items) {
  if (it.contentType === "code") continue; // code not in sidebar by default
  if (!bySection.has(it.section)) bySection.set(it.section, []);
  bySection.get(it.section).push(it);
}
// section order: structure.json order first, then first-appearance
const orderedSections = [];
for (const s of structure.sections || []) if (bySection.has(s.id)) orderedSections.push(s.id);
for (const id of bySection.keys()) if (!orderedSections.includes(id)) orderedSections.push(id);

const sidebar = {
  projectSlug: slug,
  sections: orderedSections.map((id) => {
    const its = bySection.get(id).sort((a, b) => a.order - b.order);
    const sm = sectionMeta.get(id) || {};
    return {
      id,
      title: sm.title || titleCase(id),
      icon: sm.icon || iconFor(id),
      premium: its.every((i) => i.accessLevel === "premium"),
      items: its.map((i) => ({
        contentKey: i.contentKey, title: i.title, routePath: i.routePath,
        accessLevel: i.accessLevel, order: i.order,
      })),
    };
  }),
};
writeFileSync(p("docs/shared/sidebar.json"), JSON.stringify(sidebar, null, 2) + "\n");

// ---------- toc.json (phase form) ----------
const docItems = items.filter((i) => i.contentType !== "code");
let tocPhases;
if (structure.phases && structure.phases.length) {
  tocPhases = structure.phases.map((ph) => {
    const secs = ph.sections || [];
    const its = docItems.filter((i) => secs.includes(i.section)).sort((a, b) => a.order - b.order);
    return {
      phase: ph.phase, description: ph.description || "",
      items: its.map((i) => ({ order: i.order, contentKey: i.contentKey, title: i.title, accessLevel: i.accessLevel })),
    };
  }).filter((ph) => ph.items.length);
} else if (docItems.some((i) => i.phase)) {
  const byPhase = new Map();
  for (const i of docItems) {
    const ph = i.phase || "Learning Path";
    if (!byPhase.has(ph)) byPhase.set(ph, []);
    byPhase.get(ph).push(i);
  }
  tocPhases = [...byPhase.entries()].map(([phase, its]) => ({
    phase, description: "",
    items: its.sort((a, b) => a.order - b.order).map((i) => ({ order: i.order, contentKey: i.contentKey, title: i.title, accessLevel: i.accessLevel })),
  }));
} else {
  tocPhases = [{
    phase: "Learning Path", description: "",
    items: docItems.map((i) => ({ order: i.order, contentKey: i.contentKey, title: i.title, accessLevel: i.accessLevel })),
  }];
}
const toc = { projectSlug: slug, title: `${meta.title} — Learning Path`, toc: tocPhases };
writeFileSync(p("docs/shared/toc.json"), JSON.stringify(toc, null, 2) + "\n");

// ---------- tags.json ----------
const tagCount = new Map();
for (const it of items) for (const t of it.tags) tagCount.set(t, (tagCount.get(t) || 0) + 1);
const tags = {
  projectSlug: slug,
  tags: [...tagCount.entries()].sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count, category: "topic" })),
};
writeFileSync(p("data/tags.json"), JSON.stringify(tags, null, 2) + "\n");

// ---------- rewrite derived meta fields ----------
const freeDocs = items.filter((i) => i.accessLevel === "free" && i.contentType === "doc");
const premiumDocs = items.filter((i) => i.accessLevel === "premium" && i.contentType === "doc");
meta.freeContentCount = freeDocs.length;
meta.premiumContentCount = premiumDocs.length;
meta.previewDocPaths = freeDocs.map((i) => i.sourcePath);
meta.premiumDocPaths = premiumDocs.map((i) => i.sourcePath);
meta.publicBlogPaths = items.filter((i) => i.contentType === "blog" && i.accessLevel === "free").map((i) => i.sourcePath);
meta.premiumBlogPaths = items.filter((i) => i.contentType === "blog" && i.accessLevel === "premium").map((i) => i.sourcePath);
meta.sampleCodePaths = items.filter((i) => i.contentType === "code" && i.accessLevel === "free").map((i) => i.sourcePath);
meta.premiumCodePaths = items.filter((i) => i.contentType === "code" && i.accessLevel === "premium").map((i) => i.sourcePath);
writeFileSync(p("meta.json"), JSON.stringify(meta, null, 2) + "\n");

// ---------- report ----------
const codeCount = items.filter((i) => i.contentType === "code").length;
console.log("✓ manifests built");
console.log(`  items: ${items.length}  (free docs ${freeDocs.length}, premium docs ${premiumDocs.length}, code ${codeCount})`);
console.log(`  sidebar sections: ${sidebar.sections.length}   toc phases: ${toc.toc.length}   tags: ${tags.tags.length}`);
console.log("  wrote content-index.json, sidebar.json, toc.json, data/tags.json, and updated meta.json counts");
