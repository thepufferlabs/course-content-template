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
  const stem=it.sourcePath.split("/").pop().replace(/\.md$/,"").replace(/^\d+[a-z]?[-_]/,"");
  if(it.contentType!=="code" && it.contentKey!==stem) bad(`contentKey "${it.contentKey}" != filename stem "${stem}" (${it.sourcePath})`);
  if(it.accessLevel==="free" && it.sourcePath.includes("/premium/")) bad(`free item in premium folder: ${it.sourcePath}`);
  if(it.accessLevel==="premium" && it.sourcePath.includes("/free/")) bad(`premium item in free folder: ${it.sourcePath}`);
  const wantBucket=it.accessLevel==="free"?"free-content/":"premium-content/";
  if(!String(it.storagePath||"").startsWith(wantBucket)) bad(`storagePath bucket prefix wrong for ${it.contentKey}: ${it.storagePath} (run builder)`);
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
process.exitCode=E?1:0;
NODE
[ $? -ne 0 ] && ERRORS=$((ERRORS+1))

echo "== render red flags (docs) =="
# raw HTML tags outside code fences (the reader has no rehype-raw; Mermaid notes may use <br/>)
HTML_HITS=$(node -e '
const fs=require("fs"),path=require("path");const re=/<\/?(div|span|br|details|summary|sub|sup|kbd|img|table|iframe|style|script)[ >\/]/i;
let files=[];(function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else if(f.endsWith(".md"))files.push(f);}})("docs");
for(const f of files){let fence=null;const lines=fs.readFileSync(f,"utf8").split("\n");lines.forEach((l,i)=>{const m=/^\s{0,3}(`{3,}|~{3,})/.exec(l);if(fence){if(m&&m[1][0]===fence[0]&&m[1].length>=fence.length)fence=null;return;}if(m){fence=m[1];return;}if(re.test(l.replace(/(`+)[^`]*?\1/g,"")))console.log(f+":"+(i+1)+": "+l.trim().slice(0,80));});}
')
if [ -n "$HTML_HITS" ]; then
  echo "$HTML_HITS" | sed 's/^/   raw HTML: /'
  err "raw HTML found in docs (renders as literal text — use pure markdown)"
else ok "no raw HTML outside code fences"; fi
# relative image paths
if grep -RInE '!\[[^]]*\]\((\.|/docs|/assets|assets/|\.\.)' docs --include=*.md 2>/dev/null | grep -q .; then
  grep -RInE '!\[[^]]*\]\((\.|/docs|/assets|assets/|\.\.)' docs --include=*.md 2>/dev/null | sed 's/^/   rel img: /'
  err "relative image path(s) (won't resolve — use absolute course-assets URL)"
else ok "no relative image paths"; fi
# wiki-links (no wiki-link plugin in the reader → render as literal text); code fences and inline code are ignored
WIKI_HITS=$(node -e '
const fs=require("fs"),path=require("path");const re=/\[\[[a-z0-9][a-z0-9-]*\]\]/;
let files=[];(function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else if(f.endsWith(".md"))files.push(f);}})("docs");
for(const f of files){let fence=null;const lines=fs.readFileSync(f,"utf8").split("\n");lines.forEach((l,i)=>{const m=/^\s{0,3}(`{3,}|~{3,})/.exec(l);if(fence){if(m&&m[1][0]===fence[0]&&m[1].length>=fence.length)fence=null;return;}if(m){fence=m[1];return;}if(re.test(l.replace(/(`+)[^`]*?\1/g,"")))console.log(f+":"+(i+1)+": "+l.trim().slice(0,100));});}
')
if [ -n "$WIKI_HITS" ]; then
  echo "$WIKI_HITS" | sed 's/^/   wiki-link: /'
  err "wiki-link [[...]] found (renders as literal text — use [text](contentKey))"
else ok "no wiki-links"; fi
# mermaid presence
MERM=$(grep -RIl '```mermaid' docs --include=*.md 2>/dev/null | wc -l | tr -d ' ')
[ "${MERM:-0}" -ge 5 ] && ok "mermaid diagrams in $MERM files" || warn "only $MERM files with mermaid (rubric wants ≥1/doc)"
# rich blocks (@thepufferlabs/course-ui fences): count them, catch the YAML/shape mistakes that render as an "Invalid block" box
node <<'NODE'
const fs=require("fs"),path=require("path");
const RICH=new Set(["callout","flow","sequence","diagram","quiz","proscons","params","demo","codetabs"]);
const KNOWN_COLOURS=new Set(["blue","green","amber","purple"]);
let files=[];(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else if(f.endsWith(".md"))files.push(f);}})("docs");
let counts={},errors=0,warns=0,docsWithQuiz=0,docsWithDiagram=0,docs=0;
const CODE3={ts:"ts",typescript:"ts",tsx:"ts",csharp:"csharp",cs:"csharp",python:"python",py:"python"};const stacked=[];
for(const f of files){
  const lines=fs.readFileSync(f,"utf8").split("\n");let i=0,hasQuiz=false,hasDiagram=false;const loose=new Set();let paned=false;const isDoc=/^docs\/(free|premium)\//.test(f);
  while(i<lines.length){
    const open=/^\s{0,3}(`{3,}|~{3,})\s*([\w+#-]+)?\s*(.*)$/.exec(lines[i]);
    if(!open){i++;continue;}
    const fence=open[1],lang=(open[2]||"").toLowerCase(),meta=open[3]||"",start=i+1;i++;const body=[];
    while(i<lines.length&&!new RegExp("^\\s{0,3}"+fence[0]+"{"+fence.length+",}\\s*$").test(lines[i])){body.push(lines[i]);i++;}
    i++;
    // Default code window: TypeScript, C# and Python in one codetabs pane, not separate fences.
    if(CODE3[lang])loose.add(CODE3[lang]);
    if(lang==="codetabs"){const inner=new Set((body.join("\n").match(/^\s{0,3}`{3,}\s*([\w+#-]+)/gm)||[]).map(s=>CODE3[s.replace(/^\s*`+\s*/,"").toLowerCase()]).filter(Boolean));if(inner.size>=2)paned=true;}
    if(!RICH.has(lang))continue;
    counts[lang]=(counts[lang]||0)+1;const text=body.join("\n");const where=f+":"+start;
    const bad=(m)=>{console.log("✗ "+where+" ```"+lang+": "+m);errors++;};
    if(lang==="quiz"){hasQuiz=true;if(!/^\s*questions\s*:/m.test(text))bad("needs a top-level `questions:` list");
      const n=(text.match(/^\s*-\s*question\s*:/gm)||[]).length,a=(text.match(/^\s*answer\s*:/gm)||[]).length,e=(text.match(/^\s*explanation\s*:/gm)||[]).length;
      if(n&&a<n)bad(n+" questions but only "+a+" `answer:` lines");
      if(n&&e<n){console.log("⚠ "+where+" quiz: "+(n-e)+" question(s) without `explanation:`");warns++;}}
    if(lang==="proscons"&&!/^\s*(pros|cons)\s*:/m.test(text))bad("needs `pros:` and/or `cons:`");
    if(lang==="params"&&!/^\s*rows\s*:/m.test(text))bad("needs a `rows:` list");
    if(lang==="demo"){const w=/^\s*widget\s*:\s*(\S+)/m.exec(text);if(!w)bad("needs `widget:`");else if(w[1]!=="autocomplete"){console.log("⚠ "+where+" demo: widget \""+w[1]+"\" is not a registered widget (known: autocomplete)");warns++;}}
    if(lang==="flow"||lang==="sequence"||lang==="diagram"){hasDiagram=true;if(lang==="diagram"&&!/^\s*(%%.*\n\s*)*[A-Za-z][\w-]*/.test(text))bad("first line must name the Mermaid diagram type (classDiagram, stateDiagram-v2, erDiagram, gantt, pie …)");for(const m of text.matchAll(/:::([\w-]+)/g))if(!KNOWN_COLOURS.has(m[1]))bad("colour `:::"+m[1]+"` is not one of blue/green/amber/purple");
      if(/<\/?[a-z]+>/i.test(text.replace(/<<[^>]*>>/g,"").replace(/<br\s*\/?>/gi,"")))bad("HTML in diagram text renders literally (only <br/> line breaks are allowed)");}
    if(lang==="codetabs"){const inner=(text.match(/^\s{0,3}(`{3,}|~{3,})\s*[\w+#-]+/gm)||[]).length;if(fence.length<4)bad("outer fence needs four backticks (````codetabs) so the inner ``` fences nest");if(inner<2)bad("needs two or more inner fenced code blocks (one per language), found "+inner);}
    if(lang==="callout"){const t=/type=([\w-]+)/.exec(meta);if(t&&!["concept","discussion","note","tip","warning","important"].includes(t[1]))bad("unknown callout type="+t[1]);}
    if(/\t/.test(text)&&["quiz","proscons","params","demo"].includes(lang))bad("tabs in YAML body (use two spaces)");
  }
  if(isDoc){docs++;if(hasQuiz)docsWithQuiz++;if(hasDiagram)docsWithDiagram++;if(loose.size>=2&&!paned)stacked.push(f);}
}
const summary=Object.entries(counts).map(([k,v])=>k+"="+v).join(" ")||"none";
console.log((errors?"✗ ":"✓ ")+"rich blocks: "+summary);
if(docs&&docsWithQuiz<docs){console.log("⚠ "+(docs-docsWithQuiz)+"/"+docs+" docs have no closing ```quiz (rubric wants one per doc)");warns++;}
if(stacked.length){console.log("⚠ "+stacked.length+" docs show TypeScript/C#/Python code as separate fences with no ````codetabs pane (default code window: one pane, three languages): "+stacked.slice(0,5).join(", ")+(stacked.length>5?", ...":""));warns++;}
if(docs&&docsWithDiagram<docs){console.log("⚠ "+(docs-docsWithDiagram)+"/"+docs+" docs have no ```flow / ```sequence diagram");warns++;}
process.exitCode=errors?1:0;
NODE
[ $? -ne 0 ] && ERRORS=$((ERRORS+1))
# stub solutions
if grep -RInE 'TODO|FIXME|<!-- *TODO|\.\.\. *$' docs --include=*.md 2>/dev/null | grep -qi 'todo\|fixme'; then
  warn "TODO/FIXME markers left in docs (finish worked solutions)"
fi

echo "== summary =="
echo "errors: $ERRORS   warnings: $WARN"
if [ "$ERRORS" -gt 0 ]; then echo "✗ NOT shippable — fix errors above"; exit 1; fi
if [ "${STRICT:-0}" = "1" ] && [ "$WARN" -gt 0 ]; then echo "✗ STRICT: warnings present"; exit 1; fi
echo "✓ shippable"
