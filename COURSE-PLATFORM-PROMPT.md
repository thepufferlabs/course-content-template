# PROMPT: Add Online Course Platform to Existing Next.js App

You are a senior full-stack engineer. I have an existing Next.js (App Router) website and I want to add a new `/courses` section that serves paid courses.

Course content is synced from GitHub repos into Supabase by a CI/CD pipeline. The pipeline uploads markdown files to Supabase Storage and metadata to Supabase DB tables. Your Next.js code reads from Supabase — NOT from the GitHub API.

> This prompt is **content-agnostic**. It works for any course-content repo that follows the standard `premium-content-repo` layout (see `MASTER-COURSE-REPO-PROMPT.md`). Course slugs, titles, tags, and counts come from data — never hardcoded in the platform code.

## IMPORTANT CONSTRAINTS

1. This is an EXISTING Next.js app — do NOT scaffold a new project. Add routes and components to the existing app.
2. NO Supabase auth yet — that is a future increment. For now, all content renders (free content fully, premium content shows a lock/paywall placeholder).
3. NO Razorpay or payment integration yet — that is a separate plan entirely.
4. Data comes from **Supabase** (DB tables + Storage buckets) — NOT from GitHub API.
5. Use the Next.js App Router (not Pages Router).
6. Use TypeScript throughout.
7. Use Tailwind CSS for styling (assume it's already configured in the app).
8. Server Components by default, Client Components only when needed (interactivity).
9. Supabase client is already configured in the app (assume `lib/supabase/server.ts` and `lib/supabase/client.ts` exist).

---

## DATA SOURCE: Supabase Schema

A GitHub Actions pipeline syncs content from course repos into Supabase. Here's what exists:

### Database Tables

**`products`** (one row per course)
```sql
slug              TEXT UNIQUE       -- e.g. "elasticsearch-dsl-mastery"
product_type      TEXT              -- "course"
title             TEXT              -- "Elasticsearch Query DSL — From Zero to Staff Engineer"
short_description TEXT
category          TEXT              -- "search-systems", "devops", ...
level             TEXT              -- "beginner-to-staff"
tags              TEXT[]            -- ["elasticsearch", "dsl", ...]
status            TEXT              -- "published" | "draft"
version           TEXT              -- "1.0.0"
banner_path       TEXT              -- "{slug}/assets/banner.svg"
thumbnail_path    TEXT              -- "{slug}/assets/thumbnail.svg"
github_owner      TEXT
github_repo       TEXT
github_branch     TEXT
storage_prefix    TEXT              -- "{slug}/"
free_content_count    INT
premium_content_count INT
last_synced_at    TIMESTAMPTZ
```

**`product_content`** (one row per content item — doc, blog, or code)
```sql
product_id        UUID FK → products
content_key       TEXT              -- "bool-query-mastery", "query-dsl-cheatsheet"
title             TEXT
section           TEXT              -- "query-dsl", "deep-dive", "cheatsheets"
access_level      TEXT              -- "free" | "premium"
content_type      TEXT              -- "doc" | "blog" | "code"
storage_path      TEXT              -- "free-content/{slug}/docs/free/06-bool-query-mastery.md"
tags              TEXT[]
sort_order        INT
is_published      BOOLEAN
```

**`course_details`** (one row per course — extended metadata)
```sql
product_id        UUID FK → products (UNIQUE)
sidebar_data      JSONB             -- Full sidebar.json
toc_data          JSONB             -- Full toc.json
blog_count        INT
code_sample_count INT
cheatsheet_count  INT
has_interview_prep BOOLEAN
estimated_hours   NUMERIC
last_content_update TIMESTAMPTZ
```

### Database Views

**`course_catalog`** — use for the `/courses` listing page:
```sql
-- Returns: slug, title, short_description, category, level, tags,
--          banner_path, thumbnail_path, free_content_count,
--          premium_content_count, blog_count, code_sample_count,
--          cheatsheet_count, has_interview_prep, estimated_hours
-- Filters: status = 'published' AND product_type = 'course'
```

**`course_content_view`** — use for content pages:
```sql
-- Returns: course_slug, content_key, title, section, access_level,
--          content_type, storage_path, tags, sort_order
-- Filters: is_published = TRUE
```

### Storage Buckets

| Bucket | Public | Contains |
|--------|--------|----------|
| `free-content` | Yes | Free docs, blogs, code, metadata JSONs |
| `premium-content` | No | Premium docs, blogs, code |
| `course-assets` | Yes | Banners, thumbnails, preview card SVGs |

**Path pattern**: `{slug}/{original-file-path}`

Examples (with slug `elasticsearch-dsl-mastery`):
- `free-content/elasticsearch-dsl-mastery/docs/free/06-bool-query-mastery.md`
- `premium-content/elasticsearch-dsl-mastery/docs/premium/deep-dive/08-scoring-and-relevance.md`
- `course-assets/elasticsearch-dsl-mastery/assets/banner.svg`

---

## WHAT TO BUILD

### Page 1: Course Catalog (`/courses`)

A page that lists all available courses as card tiles.

**Data source**: Query the `course_catalog` view from Supabase.

```typescript
const { data: courses } = await supabase.from("course_catalog").select("*");
```

**Each card shows:**
- Thumbnail image (from `course-assets` bucket using `thumbnail_path`)
- Course title
- Short description
- Category badge (colored by category)
- Level badge
- Tag pills (first 4-5 tags)
- Stats: "{free_content_count} free · {premium_content_count} premium"
- Extra stats if available: "{estimated_hours}h · {blog_count} blogs · {code_sample_count} examples"
- "Start Learning" CTA button

**Thumbnail URL**: Use Supabase Storage public URL:
```typescript
const thumbnailUrl = supabase.storage
  .from("course-assets")
  .getPublicUrl(course.thumbnail_path).data.publicUrl;
```

**Card click → navigates to** `/courses/[slug]`

### Page 2: Course Viewer (`/courses/[slug]`)

A two-panel layout:
- **Left sidebar**: Collapsible navigation tree with lock icons
- **Right main area**: The selected document rendered as HTML

#### Left Sidebar

**Data source**: Query `course_details` for `sidebar_data`.

```typescript
const { data: details } = await supabase
  .from("course_details")
  .select("sidebar_data, toc_data")
  .eq("product_id", productId)
  .single();
```

The `sidebar_data` JSONB has the shape:
```json
{
  "projectSlug": "elasticsearch-dsl-mastery",
  "sections": [
    {
      "id": "getting-started",
      "title": "Getting Started",
      "icon": "rocket",
      "items": [
        {
          "contentKey": "learning-path",
          "title": "Learning Path",
          "routePath": "/project/elasticsearch-dsl-mastery/learn/learning-path",
          "accessLevel": "free",
          "order": 0
        }
      ]
    },
    {
      "id": "deep-dive",
      "title": "Deep Dive",
      "icon": "search",
      "premium": true,
      "items": [
        {
          "contentKey": "scoring-and-relevance",
          "title": "Scoring and Relevance (BM25)",
          "routePath": "/project/elasticsearch-dsl-mastery/learn/scoring-and-relevance",
          "accessLevel": "premium",
          "order": 8
        }
      ]
    }
  ]
}
```

**Sidebar rendering rules:**
- Group items by section with section title as header
- Each item is a nav link to `/courses/[slug]/[contentKey]`
- If `item.accessLevel === "free"` → normal link (no icon, or an open/check icon)
- If `item.accessLevel === "premium"` → show a **lock icon** next to the title
- If the section has `"premium": true` → show a subtle "Premium" badge on the section header
- Highlight the currently active item
- Scrollable independently from main content
- Mobile: collapses to a hamburger menu

**IMPORTANT**: Remap the `routePath` from sidebar_data. The repo uses `/project/{slug}/learn/{contentKey}` but our app uses `/courses/{slug}/{contentKey}`. Do this mapping in the component — do NOT modify the stored data.

#### Right Content Area

When a sidebar item is clicked → `/courses/[slug]/[contentKey]`:

1. Query `course_content_view` to get the content entry:
```typescript
const { data: entry } = await supabase
  .from("course_content_view")
  .select("*")
  .eq("course_slug", slug)
  .eq("content_key", contentKey)
  .single();
```

2. **If `access_level === "free"`**:
   - Download markdown from `free-content` bucket:
   ```typescript
   const { data: blob } = await supabase.storage
     .from("free-content")
     .download(entry.storage_path);
   const markdown = await blob.text();
   ```
   - Strip YAML frontmatter (everything between first `---` and second `---`)
   - Render markdown to HTML
   - Display with Mermaid diagrams and syntax highlighting

3. **If `access_level === "premium"`** (no auth yet):
   - Do NOT download the markdown
   - Render the **paywall placeholder** instead:
     - Show the document title (from `entry.title`)
     - Show tags (from `entry.tags`)
     - Show a lock icon
     - Show: "This is premium content. Unlock access to continue learning."
     - Show a "Get Premium Access" button (does nothing yet)
     - Visually clean — an upgrade opportunity, not a punishment

### Page 3: Course Landing (`/courses/[slug]` with no content key)

When no content key is selected, show:
- Banner image from `course-assets` bucket
- Course title, description
- Learning path overview from `toc_data` (phases with free/premium badges)
- Stats: X free lessons, Y premium lessons, Z blogs, W code examples, N estimated hours
- "Start Learning" button → navigates to the first free doc

---

## ROUTE STRUCTURE

```
app/
├── courses/
│   ├── page.tsx                          ← Course catalog grid
│   └── [slug]/
│       ├── layout.tsx                    ← Sidebar + content layout
│       ├── page.tsx                      ← Course landing/overview
│       └── [contentKey]/
│           └── page.tsx                  ← Document viewer
```

---

## DATA LAYER

### Supabase Client

Assume `lib/supabase/server.ts` already exists and exports `createServerClient()`.
If it doesn't exist, create it using the Supabase SSR pattern:

```typescript
import { createServerClient as createClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerClient() {
  const cookieStore = await cookies();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* cookie adapter */ } }
  );
}
```

### Course Data Functions

Create `lib/courses/data.ts`:

```typescript
// Catalog
export async function getCourses() {
  const supabase = await createServerClient();
  const { data } = await supabase.from("course_catalog").select("*");
  return data ?? [];
}

// Product by slug
export async function getCourseBySlug(slug: string) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("products")
    .select("*, course_details(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data;
}

// Content entries for a course
export async function getCourseContent(slug: string) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("course_content_view")
    .select("*")
    .eq("course_slug", slug)
    .order("sort_order");
  return data ?? [];
}

// Single content entry
export async function getContentEntry(slug: string, contentKey: string) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("course_content_view")
    .select("*")
    .eq("course_slug", slug)
    .eq("content_key", contentKey)
    .single();
  return data;
}

// Download markdown from storage
export async function getContentMarkdown(storagePath: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase.storage
    .from("free-content")
    .download(storagePath);
  if (error || !data) return null;
  return await data.text();
}

// Get public URL for assets
export function getAssetUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/course-assets/${path}`;
}
```

### TypeScript Types

Create `lib/courses/types.ts`:

```typescript
export interface CourseCatalogItem {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  category: string;
  level: string;
  tags: string[];
  banner_path: string | null;
  thumbnail_path: string | null;
  status: string;
  free_content_count: number;
  premium_content_count: number;
  blog_count: number;
  code_sample_count: number;
  cheatsheet_count: number;
  has_interview_prep: boolean;
  estimated_hours: number;
  storage_prefix: string;
  last_synced_at: string;
}

export interface CourseContentEntry {
  course_slug: string;
  content_key: string;
  title: string;
  section: string;
  access_level: "free" | "premium";
  content_type: "doc" | "blog" | "code";
  storage_path: string;
  tags: string[];
  sort_order: number;
}

export interface SidebarSection {
  id: string;
  title: string;
  icon: string;
  premium?: boolean;
  items: SidebarItem[];
}

export interface SidebarItem {
  contentKey: string;
  title: string;
  routePath: string;
  accessLevel: "free" | "premium";
  order: number;
}

export interface SidebarData {
  projectSlug: string;
  sections: SidebarSection[];
}

export interface TocPhase {
  phase: string;
  description: string;
  items: {
    order: number;
    contentKey: string;
    title: string;
    accessLevel: "free" | "premium";
  }[];
}

export interface TocData {
  projectSlug: string;
  title: string;
  toc: TocPhase[];
}

export interface CourseWithDetails {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  category: string;
  level: string;
  tags: string[];
  banner_path: string | null;
  thumbnail_path: string | null;
  free_content_count: number;
  premium_content_count: number;
  storage_prefix: string;
  course_details: {
    sidebar_data: SidebarData;
    toc_data: TocData;
    blog_count: number;
    code_sample_count: number;
    cheatsheet_count: number;
    has_interview_prep: boolean;
    estimated_hours: number;
  } | null;
}
```

---

## MARKDOWN RENDERING

Create `lib/markdown/renderer.ts`:

**Dependencies to install:**
```bash
npm install gray-matter remark remark-gfm remark-rehype rehype-stringify rehype-slug rehype-autolink-headings rehype-pretty-code shiki
```

**For Mermaid diagrams** (client-side only):
```bash
npm install mermaid
```

**Rendering pipeline:**
1. Strip YAML frontmatter using `gray-matter`
2. Parse markdown with `remark`
3. Apply `remark-gfm` (tables, strikethrough, task lists)
4. Convert mermaid code blocks to `<div class="mermaid">` divs (custom remark plugin)
5. Convert to HTML with `remark-rehype`
6. Add heading IDs with `rehype-slug`
7. Syntax highlight code with `rehype-pretty-code` (uses shiki)
8. Stringify with `rehype-stringify`
9. Return HTML string

**Mermaid client component:**
Create a `MermaidRenderer` client component that:
- Uses `useEffect` to find all `.mermaid` divs after mount
- Calls `mermaid.init()` to render them
- Has a loading state while diagrams render

---

## UI COMPONENTS

### `components/courses/course-card.tsx`
- Receives `CourseCatalogItem` as props
- Renders the card tile for the catalog page
- Shows: thumbnail, title, description, category/level badges, tag pills, stats
- Links to `/courses/{slug}`

### `components/courses/course-sidebar.tsx` (Client Component)
- Receives `SidebarData` and current `contentKey` as props
- Renders collapsible section navigation
- Lock icon for premium items
- "Premium" badge on premium sections
- Highlights active item
- Mobile: hamburger toggle

### `components/courses/content-viewer.tsx`
- Receives rendered HTML string as prop
- Renders with `dangerouslySetInnerHTML` (trusted server-rendered content)
- Includes `MermaidRenderer` client component
- Uses Tailwind `prose` classes from `@tailwindcss/typography`

### `components/courses/premium-gate.tsx`
- Shown instead of content for premium items
- Shows: title, tags, lock icon, message, "Get Premium Access" CTA button
- CTA button does nothing yet (placeholder)
- Clean, inviting design — an upgrade opportunity

### `components/courses/course-overview.tsx`
- For `/courses/[slug]` landing page (no content key)
- Shows: banner, title, description, TOC phases, stats, start button

---

## ENVIRONMENT VARIABLES

These should already exist if Supabase is configured:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

No GitHub PAT needed — content comes from Supabase, not GitHub.

---

## CACHING STRATEGY

Since data comes from Supabase (not GitHub API), caching is simpler:

- Supabase queries from Server Components are automatically deduped per request
- Use `unstable_cache` or `revalidateTag` for cross-request caching if needed
- Static generation with `revalidate` for catalog and free content pages
- Dynamic rendering for premium content pages (future: auth check)

---

## STYLING GUIDELINES

- Dark theme preferred (dark background, light text)
- Sidebar: fixed left panel, ~280px wide, dark background, scrollable
- Content area: max-width ~800px, centered, generous padding
- Code blocks: dark theme syntax highlighting ("one-dark-pro" or "github-dark")
- Mermaid diagrams: use mermaid's dark theme
- Lock icons: subtle, muted gray — not aggressive
- Premium gate: clean, centered, inviting CTA
- Course cards: consistent height, hover effect, category badges colored by type
- Mobile: sidebar collapses to hamburger, content goes full-width
- Use `@tailwindcss/typography` plugin for `prose` class on rendered markdown

---

## WHAT NOT TO BUILD YET

1. Authentication (Supabase Auth) — future increment
2. Payment (Razorpay) — separate plan
3. User progress tracking — needs auth first
4. Search/filter on catalog page — nice-to-have later
5. Comments or discussions — not needed yet
6. Premium content download from `premium-content` bucket — needs auth first

For premium content, show the paywall placeholder. The actual gating (verify purchase → download from `premium-content` bucket) will be wired when auth and payment are integrated.

---

## IMPLEMENTATION ORDER

Build in this sequence:

1. **Types** — `lib/courses/types.ts`
2. **Data functions** — `lib/courses/data.ts`
3. **Catalog page** — `app/courses/page.tsx` + `CourseCard` component
4. **Course layout** — `app/courses/[slug]/layout.tsx` + `CourseSidebar` component
5. **Course overview** — `app/courses/[slug]/page.tsx` + `CourseOverview` component
6. **Markdown renderer** — `lib/markdown/renderer.ts`
7. **Content viewer** — `app/courses/[slug]/[contentKey]/page.tsx` + `ContentViewer` + `PremiumGate`
8. **Mermaid client component** — `components/courses/mermaid-renderer.tsx`
9. **Polish** — mobile responsiveness, loading states, error states

---

## FUTURE INCREMENTS (DO NOT BUILD NOW, just be aware)

### Increment 2: Supabase Auth
- Add sign-in/sign-up
- Premium content check: is user authenticated?
- Show "Sign in to access" for unauthenticated users

### Increment 3: Razorpay Payment
- Course purchase flow
- After payment → record purchase in Supabase
- Premium content: download from `premium-content` bucket after verifying purchase
- Premium content check becomes: authenticated AND has purchased

### Increment 4: Progress Tracking
- Track completed lessons in Supabase
- Show progress bar on sidebar
- Resume where user left off

The architecture you build now should make these increments easy to add. The `access_level` field and the split between `free-content` and `premium-content` buckets are the key enablers.
