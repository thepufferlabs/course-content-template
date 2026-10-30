# Rich-block snippets — copy, fill, keep the fence language

See `../references/rich-content.md` for the rules. Everything here is plain Markdown.

## Discussion (clarifying requirements)

```callout type=discussion title="Discussion"
Candidate: <scope question>

Interviewer: <answer that fixes an assumption>

Candidate: <scale question>

Interviewer: <numbers: users, QPS, retention>
```

## Concept box

```callout type=concept title="What is <X>?"
<One paragraph. Define it, give one concrete example, say why it matters here.>
```

## Alerts

> [!NOTE] <Scope note title>
> <What is deliberately out of scope and where it is covered: [Title](contentKey).>

> [!WARNING]
> <The sharp edge a reader will hit in production.>

> [!TIP]
> <The cheap win.>

## Flow diagram (four colours: blue entry, green service, amber decision, purple external)

```flow title="<What this flow shows>"
A[<Entry point>]:::blue --> B[<Service>]
B --> C{<Decision?>}
C -- yes --> D[<Service>]
C -- no --> E[(<Store>)]
D --> F[<External system>]:::purple
```

## Sequence with step narration

```sequence title="<Request timeline>"
participant C as Client
participant S as Service
participant D as Store
C->>S: <request>
%% step 1: <What the reader should notice at this step.>
S->>D: <query>
%% step 2: <...>
D-->>S: <result>
%% step 3: <...>
S-->>C: <response>
%% step 4: <...>
```

## Code (default window: one pane, three languages)

````codetabs title="<What this code does>" default=TypeScript
```ts tab="TypeScript"
<TypeScript>
```
```csharp tab="C#"
<C#>
```
```python tab="Python"
<Python>
```
````

## Pros / cons (one block per option)

```proscons title="<Option A> vs. <Option B>"
pros:
  - "<Benefit: with the number that proves it>"
  - <Benefit>
cons:
  - "<Cost: with the number that proves it>"
  - <Cost>
```

## Request parameters

```params title="Request Parameters"
rows:
  - [<param>, "Yes", <what it is>]
  - [<param>, "No", "<what it is (default: x, max: y)>"]
```

## Interactive demo

```demo title="<Widget title>"
widget: autocomplete
description: <One sentence on what to try.>
words: [<word>, <word>, <word>]
```

## End-of-chapter quiz (4–8 questions, every one explained)

```quiz title="<Chapter> Quiz"
questions:
  - question: <Interview-grade question>
    options:
      - <Correct>
      - <Plausible distractor>
      - <Plausible distractor>
      - <Plausible distractor>
    answer: A
    explanation: <Why A, and why the distractors fail.>
  - question: <Select-all question>
    type: multiple
    options: [<a>, <b>, <c>]
    answer: [A, C]
    explanation: <...>
  - question: <Statement>
    answer: false
    explanation: <...>
```
