#!/usr/bin/env bash
# validate-local.sh — the drift + render gate. Run before declaring a course "done".
# Checks the VERIFIED contract (what the pipeline + Next.js viewer actually read), not the
# older aspirational schema. Exit 0 = shippable. Any ✗ = blocking error.
#
# Usage:  bash scripts/validate-local.sh [repoRoot]     (default: cwd)
#         STRICT=1 bash scripts/validate-local.sh        (warnings become errors)

set -uo pipefail
ROOT="${1:-$(pwd)}"
cd "$ROOT" || { echo "✗ cannot cd $ROOT"; exit 2; }
ERRORS=0; WARN=0
err()  { echo "✗ $1"; ERRORS=$((ERRORS+1)); }
warn() { echo "⚠ $1"; WARN=$((WARN+1)); }
ok()   { echo "✓ $1"; }

# Un-filled scaffold (the template repo, or a fresh "Use this template" repo before the course is
# generated) — there is nothing to validate yet. Exit clean so template/CI stays green until real
# content exists. Once any doc is written, full validation runs.
DOC_COUNT=$(find docs/free docs/premium -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
if [ "${DOC_COUNT:-0}" = "0" ]; then
  echo "• No course docs yet (un-filled scaffold) — skipping validation. Generate the course, then re-run."
  exit 0
fi

echo "== structural =="
for f in meta.json .content-repo docs/shared/content-index.json docs/shared/sidebar.json docs/shared/toc.json data/tags.json; do
  [ -e "$f" ] && ok "$f" || err "missing $f (run build-manifests.mjs first?)"
done
BANNER=$(node -e 'try{process.stdout.write(require("./meta.json").banner||"")}catch{}' 2>/dev/null)
[ -n "$BANNER" ] && [ -e "$BANNER" ] && ok "banner: $BANNER" || err "banner missing or file absent (catalog card will be an empty box)"

echo "== cross-file invariants =="
node <<'NODE'
const fs=require("fs");
const R=process.cwd();
const rd=(f)=>JSON.parse(fs.readFileSync(f,"utf8"));
let E=0; const bad=(m)=>{console.log("✗ "+m);E++;};
const meta=rd("meta.json");
const idx=rd("docs/shared/content-index.json");
const sb=rd("docs/shared/sidebar.json");
const toc=rd("docs/shared/toc.json");
const slug=meta.slug;

// meta gates
if(meta.status!=="published") bad(`meta.status="${meta.status}" (must be "published")`);
if(meta.productType!=="course") bad(`meta.productType="${meta.productType}" (must be "course")`);
if(!meta.shortDescription) bad("meta.shortDescription empty (card subtitle)");
["$schema","schemaVersion","repoType"].forEach(k=>{if(!meta[k])bad(`meta.${k} missing`)});

// counts honest
const freeDocs=idx.filter(i=>i.accessLevel==="free"&&i.contentType==="doc").length;
const premDocs=idx.filter(i=>i.accessLevel==="premium"&&i.contentType==="doc").length;
if(meta.freeContentCount!==freeDocs) bad(`meta.freeContentCount=${meta.freeContentCount} but disk has ${freeDocs} (run builder)`);
if(meta.premiumContentCount!==premDocs) bad(`meta.premiumContentCount=${meta.premiumContentCount} but disk has ${premDocs} (run builder)`);

// per-item checks
const keys=new Set();
for(const it of idx){
  if(keys.has(it.contentKey)) bad(`duplicate contentKey ${it.contentKey}`);
  keys.add(it.contentKey);
  const stem=it.sourcePath.split("/").pop().replace(/\.md$/,"").replace(/^\d+[-_]/,"");
  if(it.contentType!=="code" && it.contentKey!==stem) bad(`contentKey "${it.contentKey}" != filename stem "${stem}" (${it.sourcePath})`);
  if(it.accessLevel==="free" && it.sourcePath.includes("/premium/")) bad(`free item in premium folder: ${it.sourcePath}`);
  if(it.accessLevel==="premium" && it.sourcePath.includes("/free/")) bad(`premium item in free folder: ${it.sourcePath}`);
  const wantBucket=it.accessLevel==="free"?"free-content/":"premium-content/";
  if(!it.storagePath.startsWith(wantBucket)) bad(`storagePath bucket prefix wrong for ${it.contentKey}: ${it.storagePath}`);
  const rp=new RegExp(`^/project/${slug}/(learn|blog|code)/`);
  if(!rp.test(it.routePath)) bad(`routePath format wrong: ${it.routePath}`);
  if(it.contentType!=="code" && !fs.existsSync(it.sourcePath)) bad(`sourcePath missing on disk: ${it.sourcePath}`);
  if(it.contentType==="code" && !fs.existsSync(it.sourcePath+"/README.md")) bad(`code dir lacks README.md: ${it.sourcePath}`);
}

// sidebar/toc keys ⊆ index keys ; and use accessLevel not access
if(!Array.isArray(sb.sections)) bad("sidebar.sections not an array");
for(const s of sb.sections||[]) for(const i of s.items||[]){
  if(!keys.has(i.contentKey)) bad(`sidebar key not in index: ${i.contentKey}`);
  if(i.access!==undefined) bad(`sidebar item uses "access" — must be "accessLevel" (${i.contentKey})`);
  if(i.accessLevel===undefined) bad(`sidebar item missing accessLevel: ${i.contentKey}`);
}
if(!Array.isArray(toc.toc)) bad('toc.json must have a "toc" array (phase form), not "phases"/"entries"');
for(const ph of toc.toc||[]) for(const i of ph.items||[]){
  if(!keys.has(i.contentKey)) bad(`toc key not in index: ${i.contentKey}`);
}
if((toc.toc?.[0]?.items?.[0]?.contentKey)===undefined) bad("toc[0].items[0] missing → overview 'Start Learning' CTA won't render");

console.log(E?`   ${E} invariant error(s)`:"✓ cross-file invariants pass");
process.exit(E?1:0);
NODE
[ $? -ne 0 ] && ERRORS=$((ERRORS+1))

echo "== render red flags (docs) =="
# raw HTML tags (the reader has no rehype-raw)
if grep -RIlnE '<(div|span|br|details|summary|sub|sup|kbd|img|table|iframe|style|script)[ >/]' docs --include=*.md 2>/dev/null | grep -q .; then
  grep -RIlnE '<(div|span|br|details|summary|sub|sup|kbd|img|table|iframe|style|script)[ >/]' docs --include=*.md 2>/dev/null | sed 's/^/   raw HTML: /'
  err "raw HTML found in docs (renders as literal text — use pure markdown)"
else ok "no raw HTML"; fi
# relative image paths
if grep -RInE '!\[[^]]*\]\((\.|/docs|/assets|assets/|\.\.)' docs --include=*.md 2>/dev/null | grep -q .; then
  grep -RInE '!\[[^]]*\]\((\.|/docs|/assets|assets/|\.\.)' docs --include=*.md 2>/dev/null | sed 's/^/   rel img: /'
  err "relative image path(s) (won't resolve — use absolute course-assets URL)"
else ok "no relative image paths"; fi
# wiki-links (no wiki-link plugin in the reader → render as literal text)
if grep -RInE '\[\[[a-z0-9-]+' docs 2>/dev/null | grep -q .; then
  grep -RInE '\[\[[a-z0-9-]+' docs 2>/dev/null | sed 's/^/   wiki-link: /'
  err "wiki-link [[...]] found (renders as literal text — use [text](contentKey))"
else ok "no wiki-links"; fi
# mermaid presence
MERM=$(grep -RIl '```mermaid' docs --include=*.md 2>/dev/null | wc -l | tr -d ' ')
[ "${MERM:-0}" -ge 5 ] && ok "mermaid diagrams in $MERM files" || warn "only $MERM files with mermaid (rubric wants ≥1/doc)"
# stub solutions
if grep -RInE 'TODO|FIXME|<!-- *TODO|\.\.\. *$' docs --include=*.md 2>/dev/null | grep -qi 'todo\|fixme'; then
  warn "TODO/FIXME markers left in docs (finish worked solutions)"
fi

echo "== summary =="
echo "errors: $ERRORS   warnings: $WARN"
if [ "$ERRORS" -gt 0 ]; then echo "✗ NOT shippable — fix errors above"; exit 1; fi
if [ "${STRICT:-0}" = "1" ] && [ "$WARN" -gt 0 ]; then echo "✗ STRICT: warnings present"; exit 1; fi
echo "✓ shippable"
