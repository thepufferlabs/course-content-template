---
title: "<NN> — Lab: <Human Title>"
contentKey: "lab-<key>"
section: "labs"
accessLevel: "premium"
contentType: "doc"
tags: ["lab", "<tag>"]
order: <NN>
sourceType: "same_repo"
sourcePath: "docs/premium/labs/NN-lab-<key>.md"
routePath: "/project/<slug>/learn/lab-<key>"
migrationTargetPath: null
isPublished: true
---

# Lab: <Human Title>

> **You will build:** <the concrete artifact — a working X that does Y at Z scale.>
> **Time:** <N hours.>  **Prereqs:** <chapters/contentKeys.>

## Objective

<What "done" looks like, as an observable outcome.>

## Business context

<Named (fictional) company + concrete scale. The reason this lab exists.>

## Architecture

```flow title="<Lab system>"
Client[<Client>]:::blue --> API[<API>]
API --> Store[(<Store>)]
API --> Ext[<External system>]:::purple
```

<Short description of the pieces and why.>

```sequence title="<The main request, step by step>"
participant C as Client
participant A as API
participant S as Store
C->>A: <request>
%% step 1: <What to notice.>
A->>S: <write/read>
%% step 2: <...>
S-->>A: <result>
%% step 3: <...>
A-->>C: <response>
%% step 4: <...>
```

## Implementation

### Step 1 — Model the domain
```ts
// types / schema
```

### Step 2 — Core logic
```ts
// the heart of the lab
```

### Step 3 — Advanced (scale / failure / edge cases)
```ts
// what makes it staff-level
```

## Performance analysis

<Real numbers: complexity, latency, memory, QPS. A small table.>

## Common mistakes

- **<Named>** — … .
- **<Named>** — … .

## Tradeoffs

<What you gave up; when a different approach wins.>

## Staff Engineer discussion

<The design-review conversation: alternatives, scaling limits, what breaks first.>

## Complete solution

<The FULL, runnable solution — every step assembled. This section is mandatory and must not be a
stub. A reader could paste this and run it.>

```ts
// complete, self-contained solution
```
