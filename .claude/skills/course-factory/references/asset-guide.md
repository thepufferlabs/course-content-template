# Asset Guide — SVGs the catalog and reader actually use

Assets live in `assets/` and sync to the public `course-assets` bucket. They are the first thing
a buyer sees, and the #1 "looks cheap vs. looks premium" lever. All assets are **pure SVG** — no
raster embeds, no external font URLs (fonts won't load; use system font stacks or draw text as
`<text>` with a websafe family).

---

## Files to generate

| File | Size (viewBox) | Where it shows | Must contain |
|---|---|---|---|
| `assets/banner.svg` | **1400 × 400** (7:2) | catalog card (`aspect-[7/2] object-cover`) + overview header | course title, one-line tagline, a topic motif |
| `assets/thumbnail.svg` | **600 × 400** (3:2) | fallback image, cart, small contexts | short title + motif, readable at 120px wide |
| `assets/preview/<section-id>.svg` | **800 × 450** (16:9) | one per sidebar section (soft requirement) | section title + a glyph for the theme |

The **banner is mandatory** — without it the card is an empty navy rectangle. Design the title to
sit inside the central 7:2 safe area so `object-cover` never crops it.

---

## Palette

Use exactly the three colors from the course spec's identity block:
`primary` (structure/large fills), `accent` (highlights/one word of the title), `bg` (dark
background). Aim for AA contrast of title text on `bg`. A typical premium-dark palette:
`bg #0B1020`, `primary #1E40AF`, `accent #F59E0B`.

---

## Banner template (adapt colors, title, motif)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 400" width="1400" height="400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0B1020"/>
      <stop offset="1" stop-color="#111a3a"/>
    </linearGradient>
  </defs>
  <rect width="1400" height="400" fill="url(#bg)"/>
  <!-- topic motif: a light, on-brand geometric pattern in the right third -->
  <g stroke="#1E40AF" stroke-width="2" fill="none" opacity="0.5">
    <!-- e.g. nodes+edges for a systems course, grid for data, braces for a language -->
  </g>
  <text x="80" y="180" font-family="Inter, Segoe UI, system-ui, sans-serif"
        font-size="64" font-weight="800" fill="#F8FAFC">Course Title</text>
  <text x="82" y="180" font-family="Inter, Segoe UI, system-ui, sans-serif"
        font-size="64" font-weight="800" fill="#F59E0B" opacity="0"><!-- accent one word --></text>
  <text x="80" y="240" font-family="Inter, Segoe UI, system-ui, sans-serif"
        font-size="26" font-weight="500" fill="#94A3B8">From zero to Staff Engineer</text>
  <text x="80" y="320" font-family="Inter, Segoe UI, system-ui, sans-serif"
        font-size="18" fill="#F59E0B">thepufferlabs</text>
</svg>
```

## Thumbnail template

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <rect width="600" height="400" fill="#0B1020"/>
  <g stroke="#1E40AF" stroke-width="2" fill="none" opacity="0.5"><!-- motif --></g>
  <text x="40" y="210" font-family="Inter, system-ui, sans-serif" font-size="44"
        font-weight="800" fill="#F8FAFC">Short</text>
  <text x="40" y="262" font-family="Inter, system-ui, sans-serif" font-size="44"
        font-weight="800" fill="#F59E0B">Title</text>
</svg>
```

## Section preview template

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <rect width="800" height="450" fill="#0B1020"/>
  <g stroke="#1E40AF" stroke-width="2" fill="none" opacity="0.45"><!-- section glyph --></g>
  <text x="48" y="240" font-family="Inter, system-ui, sans-serif" font-size="40"
        font-weight="700" fill="#F8FAFC">Section Title</text>
</svg>
```

---

## Motif ideas by category

- **systems / distributed** — nodes + edges (a small graph), or stacked layers with arrows.
- **backend / data** — a grid/table, a B-tree, or a pipeline of boxes.
- **frontend** — nested rectangles (component tree), a cursor, a viewport frame.
- **language (TS/Go/Rust)** — braces `{ }`, angle brackets `< >`, a type-tree.
- **search / ml** — a magnifier over a grid, or vectors radiating from a point.

Keep motifs light (opacity ~0.4–0.5), geometric, and in the primary color so the title stays the
hero. Do not embed emojis or clip-art. One accent color, used sparingly, reads as premium.

## Constraints (validator/render)

- Pure SVG, `viewBox` set, explicit `width`/`height`. No `<image href>`, no `<foreignObject>`,
  no external CSS/font `@import`.
- In-content images referenced from markdown must use the **absolute** course-assets URL, never a
  relative path (see `consumer-render.md`).
