---
title: "<NN> — <Human Title>"
contentKey: "<key>"
section: "<section-id>"
accessLevel: "<free|premium>"
contentType: "doc"
tags: ["<tag>", "<tag>"]
order: <NN>
sourceType: "same_repo"
sourcePath: "<docs/free/NN-key.md | docs/premium/<sub>/NN-key.md>"
routePath: "/project/<slug>/learn/<key>"
migrationTargetPath: null
isPublished: true
---

# <NN> — <Human Title>

> **Goal:** <one sentence — what the reader can DO after this chapter.>

<One-paragraph hook: a concrete, named scenario with real scale that makes this matter. Stakes first.>

---

## The problem

<The business/engineering problem, grounded in the scenario above. Numbers, not adjectives.>

```callout type=discussion title="Discussion"
Candidate: <scope question that fixes an assumption>

Interviewer: <answer with a number: users, QPS, retention, budget>

Candidate: <second question>

Interviewer: <answer>
```

## Mental model

<How to THINK about this — the part readers quote back. At least one diagram.>

```callout type=concept title="What is <X>?"
<One paragraph: define it, one concrete example, why it matters in the scenario above.>
```

```flow title="<What this flow shows>"
A[<request / entry>]:::blue --> B[<step>]
B --> C{<decision?>}
C -- yes --> D[<outcome>]
C -- no --> E[(<store>)]
```

## How it works

<Core mechanics, built in stages. Each stage runnable/annotated. Link to src/** where relevant.>

```ts
// concrete, runnable, annotated — no hand-waving
```

## What happens internally

<System-level execution path. Why it behaves as it does. Play it through step by step:>

```sequence title="<Request timeline>"
participant C as Client
participant S as <Service>
participant D as <Store>
C->>S: <request>
%% step 1: <What the reader should notice here.>
S->>D: <query>
%% step 2: <...>
D-->>S: <result>
%% step 3: <...>
S-->>C: <response>
%% step 4: <...>
```

## Production tradeoffs

<Latency, cost, ops burden, blast radius, failure modes. What a Staff Engineer weighs.>

```proscons title="<Option A> vs. <Option B>"
pros:
  - "<Benefit: with the number that proves it>"
  - <Benefit>
cons:
  - "<Cost: with the number that proves it>"
  - <Cost>
```

## When NOT to use this

<Honest boundaries. The reader should know the failure cases.>

## Anti-patterns

> [!WARNING]
> <The one sharp edge that pages people at 3 a.m.>

- **<Named anti-pattern>** — what it looks like → why it fails → what to do instead.
- **<Named anti-pattern>** — … .
- **<Named anti-pattern>** — … .

## Worked example

<A spec, then a FULL worked solution (premium) or a concrete runnable example (free). No stubs.>

## Top takeaways

1. …
2. …
3. …
4. …
5. …

## Quiz

```quiz title="<Human Title> Quiz"
questions:
  - question: <Interview-grade question>
    options:
      - <Correct>
      - <Plausible distractor>
      - <Plausible distractor>
      - <Plausible distractor>
    answer: A
    explanation: <Why A; why the distractors fail.>
  - question: <Select-all question>
    type: multiple
    options: [<a>, <b>, <c>]
    answer: [A, C]
    explanation: <...>
  - question: <Statement that is subtly wrong>
    answer: false
    explanation: <...>
```

## Revision questions

1. …
2. …
3. …

## Next

- [<Human Title>](<other-contentKey>)
- [<Human Title>](<another-contentKey>)
