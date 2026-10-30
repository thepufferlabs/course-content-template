# Rich Content — interactive blocks authored in plain Markdown

The viewer renders lessons with `@thepufferlabs/course-ui`. Besides GFM it understands
**nine fenced-block languages**. A rich block is an ordinary fenced code block whose
language is one of `callout`, `flow`, `sequence`, `diagram`, `quiz`, `proscons`, `params`, `demo`, `codetabs`.
Nothing else changes: files stay `.md`, the sync pipeline copies them as-is, `validate-local.sh`
still passes (no raw HTML), and GitHub shows a readable code block where the viewer shows a
component. Options go on the fence info string after the language:
`key="quoted value"`, `key=value`, or a bare `flag`.

| Fence      | Body is  | Renders as                                                                 |
| ---------- | -------- | -------------------------------------------------------------------------- |
| `callout`  | Markdown | Boxed note. `type=concept\|discussion\|note\|tip\|warning\|important`       |
| `flow`     | Mermaid  | Flowchart in the fixed four-colour palette, fullscreen zoom/pan            |
| `sequence` | Mermaid  | Sequence diagram with a **step player** (play / prev / next / playlist)    |
| `quiz`     | YAML     | MCQ card: `1 / N` counter, Previous/Next, instant reveal, results screen   |
| `proscons` | YAML     | Green Pros card above red Cons card, each the full width of the column     |
| `params`   | YAML     | "Request Parameters" table: green header, code chips, zebra rows          |
| `demo`     | YAML     | Framed interactive widget (`widget: autocomplete` ships; more by name)     |
| `codetabs` | fences   | One code block with a **tab per language** (outer fence = 4 backticks)     |
| `diagram`  | Mermaid  | Any other Mermaid type (class, state, ER, gantt, pie, mindmap, timeline, git, journey, quadrant, requirement, C4, sankey, xychart, block, packet, kanban, architecture) in the four colours |

GitHub alerts also work and render as callouts: `> [!NOTE] Title`, `> [!TIP]`, `> [!WARNING]`,
`> [!IMPORTANT]`, `> [!CAUTION]`.

---

## Where each block belongs in the chapter spine

| Spine step                  | Use                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| Hook / clarifying scope     | `callout type=discussion` — a Candidate/Interviewer dialogue that pins the requirements           |
| Mental model                | `callout type=concept title="What is X?"` for the one-paragraph definition, then a `flow` diagram |
| Core mechanics / APIs       | `params` for every request/response contract; ordinary ```` ```json ```` for sample payloads; **every implementation listing is one `codetabs` pane with TypeScript, C# and Python tabs** (the default code window, see below) |
| What happens internally     | `sequence` with `%% step N:` narration — the reader plays the request through step by step       |
| Production tradeoffs        | `proscons` per option being weighed (one block per option, 3–5 bullets each)                     |
| Anti-patterns / boundaries  | `> [!WARNING]` for the sharp edge; `> [!TIP]` for the cheap win                                   |
| Hands-on                    | `demo` when a registered widget exists for the idea (autocomplete, …)                            |
| Revision                    | `quiz` — 4–8 questions, every one with an `explanation:`                                         |

Floors per DOC chapter: ≥1 `flow` **or** `sequence`, ≥1 `callout`, exactly 1 `quiz` at the end
(before "Next"). Labs add ≥1 `sequence`. Cheatsheets use `params` tables.

---

## Exact syntax

### callout

````md
```callout type=concept title="What is a search autocomplete system?"
A search autocomplete system suggests possible queries as users type. Typing "best re"
might prompt **best restaurants near me** or **best recipes for dinner**.
```

```callout type=discussion title="Discussion"
Candidate: Should suggestions come from historical queries or trending data?

Interviewer: Both. Trending searches should be prioritised.

Candidate: Do we need to personalise per user?

Interviewer: Useful, but focus first on generic suggestions.
```
````

- `discussion` is collapsible by default and bolds `Name:` speaker prefixes (one exchange per paragraph, blank line between).
- `concept` is the green titled box (`title=` required). `note`/`tip`/`warning`/`important` take an optional title.
- `collapsible` / `open=false` fold any callout. Inline Markdown, lists and code fences are allowed inside.

### flow

````md
```flow title="Message send path"
A[User A sends message]:::blue --> B[Chat Server]
B --> M[Message Service]
M --> DB[(Database)]
B --> S{Session Service: is User B online?}
S -- Online --> R[Route to chat server]
S -- Offline --> Q[Message queue]
Q --> P[Push Notification Service]:::purple
P --> X[APNs / FCM]:::purple
```
````

- Body is Mermaid flowchart syntax. Omit the `flowchart TD` header (added automatically; `dir=LR` for left-to-right).
- **Exactly four colours.** Tag a node with `:::blue` (entry points, clients), `:::green` (services, the main path), `:::amber` (decisions, queues) or `:::purple` (external systems, async). Untagged: rectangles are green, `{diamonds}` amber, `[(cylinders)]` purple. Edges and arrowheads are always green.
- Add `legend` to the info string to print the colour key. ≤ 15 nodes; split larger flows. No HTML in labels.

### sequence

````md
```sequence title="Delivering to an offline user" interval=1400
participant A as User A
participant CS as Chat Server
participant SS as Session Service
A->>CS: message.send (client_msg_id)
%% step 1: The client sends over its open WebSocket with an idempotency key.
CS->>SS: is User B online?
%% step 2: The chat server asks which server, if any, holds User B's socket.
SS-->>CS: offline
%% step 3: No live socket, so the message cannot be pushed directly.
Note over CS: queued for delivery
%% step 4: The note is a step too — narrate it.
```
````

- Body is Mermaid `sequenceDiagram` syntax (header added automatically). Participants cycle through the four colours in order of appearance.
- Every message **and every note** is a step. `%% step N: text` is the narration shown while step N is highlighted — write one per step, in the reader's voice ("The client…"). `autoplay` starts playing on view; `interval=ms` sets the pace.
- Keep to 6–12 steps. Longer stories become two diagrams.

### diagram

Every Mermaid diagram type that is not a flowchart or a sequence. The body is the Mermaid
source **with its header line** (the viewer needs it to pick the renderer). Same four colours,
same source toggle, same fullscreen zoom as `flow`.

````md
```diagram title="Order domain model" legend
classDiagram
  class Order:::blue {
    +String id
    +place()
  }
  class LineItem:::green
  class PaymentGateway:::purple
  Order "1" *-- "many" LineItem : contains
  Order ..> PaymentGateway : charges
```

```diagram title="Ticket lifecycle"
stateDiagram-v2
  [*] --> Open
  Open --> InProgress : assign
  InProgress --> Done : resolve
  Done --> [*]
```
````

- Supported first lines: `classDiagram`, `stateDiagram-v2`, `erDiagram`, `gantt`, `pie`, `mindmap`,
  `timeline`, `gitGraph`, `journey`, `quadrantChart`, `requirementDiagram`, `C4Context` (and the other
  C4 kinds), `sankey-beta`, `xychart-beta`, `block-beta`, `packet-beta`, `kanban`, `architecture-beta`.
  A `flowchart`/`graph` or `sequenceDiagram` body inside ` ```diagram ` is rendered by the flow /
  sequence component, so the fence is safe to use for any Mermaid source.
- Colours: `:::blue|green|amber|purple` tags work on class and state nodes exactly as in `flow`;
  pie slices, git branches, mind-map/timeline sections and journey tasks cycle through the four
  colours automatically. Never add `classDef`/`style` lines with other colours.
- Text inside a coloured shape is always dark; labels on the page background follow the theme.
- `title="…"` is the header; `legend` prints the colour key. Keep diagrams small (a class diagram
  of 4-8 classes, a state machine of 5-10 states); split bigger models across sections.

### quiz

````md
```quiz title="Design WhatsApp Quiz"
questions:
  - question: Main benefit of a persistent connection for online users?
    options:
      - Enables low-latency server push for incoming messages
      - Removes the need for load balancers entirely
      - Eliminates the need to store messages for offline users
      - Guarantees global message ordering across all chats
    answer: A
    explanation: The server pushes the instant a message arrives; the rest are still needed.
  - question: Select every reason to persist a message before acknowledging it.
    type: multiple
    options: [Recipient may be offline, Server may crash after the ack, Smaller payload]
    answer: [A, B]
    explanation: Durability first; payload size is unrelated.
  - question: One grey tick means the recipient has read the message.
    answer: false
    explanation: One tick = server has it, two = delivered, blue = read.
```
````

- `answer:` is a letter (`B`), a 1-based number (`2`), the option text, a list for multi-select, or `true`/`false` (makes a True/False question).
- `type:` is `single` (default), `multiple`, or `truefalse`. `reveal: check` (top-level) waits for a Check button; `shuffle: true` randomises order.
- Always include `explanation:` — it is what the reader learns from a miss. Quote YAML strings containing `:`.

### proscons

````md
```proscons title="WebSocket vs. long polling"
pros:
  - "True bidirectional communication: either side can initiate a message at any time"
  - "Minimal overhead after connection: just the WebSocket frame header (as small as 2 bytes)"
  - Lowest possible latency — messages are pushed instantly
cons:
  - "Stateful nature complicates scaling: you need to track which server each user is on"
  - Requires WebSocket-aware load balancers and proxies
  - Connection management requires heartbeats, reconnection logic, and careful error handling
```
````

Inline Markdown allowed in items. `prosTitle:` / `consTitle:` rename the headers.

### params

````md
```params title="Request Parameters"
rows:
  - [conversation_id, "Yes", ID of the conversation to fetch]
  - [cursor, "No", Pagination cursor for fetching older messages]
  - [limit, "No", "Number of messages to return (default: 50, max: 100)"]
```
````

- Default columns `Parameter | Required | Description`; set `columns: [Name, Type, Default, Description]` for other shapes.
- The first column renders as a code chip (`codeColumn: 1` moves it, `-1` disables). Quote `Yes`/`No` and any cell containing `:` or `,`.

### demo

````md
```demo title="Search Autocomplete"
widget: autocomplete
description: Type a prefix; the trie walk returns every completion under it.
words: [apple, application, apply, app, banana, band, bank, cat, car, card]
```
````

`widget:` must be a registered widget name (currently: `autocomplete`). Every other key is passed
to the widget. Do not invent widget names — an unknown widget renders a visible "unknown widget"
notice. Propose new widgets in the course spec; they are built in `@thepufferlabs/course-ui`.

---

### codetabs

**The default code window is one pane with three languages: TypeScript, C# and Python.**
Implementation listings, worked solutions and tests are written once per language and shown
in a single `codetabs` pane, never as separate fences in separate sections. The viewer draws
up to four languages as an editor-style tab strip; the reader's choice is remembered and
switches every pane in the lesson, so use the same labels everywhere:

`````md
````codetabs title="Validate the Mcp-Method header" default=TypeScript
```ts tab="TypeScript"
export function checkMethod(header: string | undefined, body: { method: string }): number | null {
  return header === body.method ? null : -32020;
}
```
```csharp tab="C#"
public static int? CheckMethod(string? header, JsonRpcRequest body) =>
    header == body.Method ? null : -32020;
```
```python tab="Python"
def check_method(header: str | None, body: dict) -> int | None:
    return None if header == body["method"] else -32020
```
````
`````

- Order TypeScript, C#, Python; labels exactly `tab="TypeScript"`, `tab="C#"`, `tab="Python"`;
  `default=TypeScript`. Each tab must compile and run; if a language genuinely has no
  equivalent, use a two-tab pane and say why in the prose.
- Code that exists in one language only (a CLI helper, a Dockerfile, YAML, PromQL) stays an
  ordinary fence: panes are for the same behaviour in several languages.
- For a course written for one other set of languages, keep the same rule with that set.

When a chapter shows the same snippet in more than one form (SDKs, CLI vs HTTP, two
runtimes), do **not** stack separate fences: wrap them in one `codetabs` block. The reader
gets a tab per language, and choosing a language switches every tabbed block in the lesson.
The outer fence uses **four** backticks so the inner three-backtick fences nest (five if a
listing itself contains a three-backtick line).

`````md
````codetabs title="Create a client" default=python
```ts
const client = new Client({ apiKey: process.env.API_KEY });
```
```python tab="Python 3"
client = Client(api_key=os.environ["API_KEY"])
```
```sh tab="cURL"
curl -H "Authorization: Bearer $API_KEY" https://api.example.com/v1/clients
```
````
`````

- Tab label = `tab="…"` on the inner fence, else the language's display name (ts → TypeScript).
- `title="…"` on the outer fence is the block's heading; `default=<label|language|N>` picks the
  tab shown first. Inner fences keep their own options (`filename=…`).
- Same example, same behaviour in every tab — never different examples under one block.
- Lighter form: consecutive ordinary fences each carrying `tab="…"` (and `group="Title"` on the
  first) are grouped by the viewer. Prefer the explicit `codetabs` form in generated content.
- GitHub renders the outer block as one code block containing the inner snippets — still readable.

---

## Failure modes (what the validator and the viewer catch)

| Mistake                                        | What happens                                     | Fix                                      |
| ---------------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| YAML with an unquoted `:` in a string          | Block renders as a red "Invalid ```quiz block"   | Quote the string                         |
| `answer:` missing or out of range              | Invalid block                                    | Use A/B/C, 1-based number, or text       |
| `options:` with < 2 entries                    | Invalid block                                    | Give at least two                        |
| `flowchart TD` **and** `dir=` both given       | Header wins; `dir` ignored                       | Pick one                                 |
| `:::teal` or any colour outside the four       | Falls back to the default colour for the shape   | Use blue / green / amber / purple only   |
| Mermaid syntax error                           | Diagram shows the error and the source           | Run it through the Mermaid live editor   |
| `widget:` not registered                       | "Unknown demo widget" notice                     | Use `autocomplete` or request a widget   |
| Tabs in YAML                                   | YAML error                                       | Two-space indent                         |
