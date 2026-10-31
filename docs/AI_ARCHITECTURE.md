# AI architecture (28 Oct 2026)

Every AI feature in Delivery Studio goes through one shared, provider-neutral service on the server: `work/server/_ai.mjs`.
Features name an **operation** (what they need), never a provider. The service picks the provider, checks it can do the
operation, calls that provider's adapter, retries once where it is safe, applies the organisation fallback policy, records
usage counters and returns one normalised result or error.

```
Pages (browser)  ──fetch──▶  /api/fn/api/...  (work/server/api.mjs: access rules, sources, prompts, validation)
                                   │  aiGen / aiJSON / aiPick (op names only)
                                   ▼
                        _ai.mjs  shared AI service
                        choose → generate / generateJSON → usage, retry, fallback, errors
                           │                         │
                    DeepSeek adapter           Claude adapter
                 (ctx.llm, platform model)   (Anthropic Messages API, owner's key)
```

The browser never calls a provider and never sees a key. `tests/ai_layer.mjs` fails if `api.mjs` or any `src/*.js`
file calls DeepSeek, Anthropic or `ctx.llm` directly.

## Operations

| Operation | Needs | Used by | Routing group |
|---|---|---|---|
| `document` | text | BRD and every other deliverable draft, part by part | Documents and drafts |
| `extract` | text, JSON | Kick-off deck reading, transcript task extraction | Reading documents and transcripts |
| `assist` | text | AI Task Assistant (and its checklist) | Task assistance and classification |
| `classify` | text, JSON | Task type suggestions | Task assistance and classification |
| `vision` | text, JSON, image | Image of a flow → diagram (Process Whiteboard) | Reading images |
| `probe` | text | Admin › AI provider › Test DeepSeek | Documents and drafts |

## Providers and capabilities

| | DeepSeek (default) | Claude (optional) |
|---|---|---|
| Where | facilio.work platform model, `ctx.llm` (Amazon Bedrock) | Anthropic Messages API, `https://api.anthropic.com/v1/messages` |
| Credentials | none (the platform charges the signed-in viewer; ~20 requests/min and a daily cap per person) | the app owner's key: plain secret `anthropic_api_key`, or a key an admin saves in the app (encrypted with the plain secret `ai_master_key`) |
| Default model | `deepseek.v3.2` (the platform default; not sent unless changed) | `claude-sonnet-5-5` |
| Text / JSON | yes / yes (JSON is asked for in the prompt and validated) | yes / yes (same) |
| Images | **no** | yes |
| Streaming | no | no — a facilio.work server function returns one response within 25 s, so streaming cannot reach the page; long documents are written part by part instead |
| Tool calling | not used | not used |
| Context used per call | about 13–14k characters of sources | about 26–60k characters |
| Output cap per call | 1,800 tokens | 8,000 tokens (in practice bounded by the 25 s server limit) |

## Inventory of AI features (audit)

Every path was traced from the button to the provider and back.

| Feature | Where (UI → route) | Op | Input context | Output and checks | Errors |
|---|---|---|---|---|---|
| Deliverable drafts: BRD, missing requirements, UAT, FTR, configuration, user guide, training, workshop intelligence, package analysis, go-live review, hypercare, handover, closure, WSR, monthly | Deliverables & AI, BRD Draft, Build/UAT & Go-Live, Hypercare, Handover, Status Reports, Templates, Configuration Inputs and Traceability shortcuts → `POST /ai/job`, `/ai/job/:job/part`, `/ai/job/:job/finish` | document | per-task document sections and records (`AI_TASKS`), sized for the provider; optional template; tasks summarised for gaps, go-live, handover, WSR and monthly | Markdown draft stored as an `ai` item with sources `[S#]`; stays a draft until a project owner approves | each part time-boxed; a part that times out is retried shorter; a part that still fails is marked in the draft |
| Short drafts and the Teams tools | `POST /ai/run` | document | as above | as above | one time-boxed call |
| FTR scenario suggestions | FTR Report → `/ai/run` (ftrrows) | document | use cases, decisions, configuration | Markdown table; rows are ticked by a person, marked AI-suggested | as above |
| Video to guide | Video to Guide → `/ai/run` (vidguide) | document | walkthrough transcript and screenshot captions | draft steps with screenshot markers | as above |
| Kick-off deck reading | Kick-off Deck → `POST /ai/kickoff` | extract | slide text | JSON rebuilt field by field (`validKickoff`); shown for review, nothing saved | invalid JSON → one repair attempt, then an error |
| Image of a flow → diagram | Process Whiteboard → `POST /ai/flow-image` | vision | the image (PNG, JPEG, WebP, signature checked) | JSON rebuilt against a fixed schema (`validFlowGraph`); review table before anything goes on the board | needs a provider that reads images (Claude) |
| AI Task Assistant (new) | Tasks › task › AI Task Assistant → `POST /tasks/:id/assist` | assist | the task, its source, comments, saved guidance, linked records, dependencies, same-module use cases, decisions, CRs and UAT tests | Markdown separating facts, recommendations and assumptions, citing `[C#]`; saved only when the person clicks Save | normal errors with a Try again button |
| Task checklist (new) | same → `POST /tasks/:id/checklist` | assist | as above | JSON list, validated; added only for ticked items after confirmation | invalid JSON → repair, then error |
| Task type suggestions (new) | Tasks › select › Suggest types → `POST /tasks/classify` | classify | task titles and descriptions | JSON per item; unknown types and ambiguous items are flagged, never guessed; applied only when ticked | as above |
| Transcript → tasks (new) | Tasks › From transcript → `POST /tasks/extract` (one call per ~10k characters) | extract | the transcript part | JSON validated per field: owner and ETA kept only when their quoted words are in the transcript; quotes not found in the transcript are flagged; nothing is saved until reviewed | invalid JSON → repair, then error; parts that fail are listed |
| Admin checks | Admin › AI provider → `/admin/ai/probe`, `/admin/ai/test`, `/admin/ai/key` | probe | none | timing and model list | — |

Rule-based, not AI (and labelled that way in the app): transcript requirement suggestions in Transcripts & Requirement
Confirmation, guide intelligence, checks and validations, ticket type guesses (mail, Teams).

### What the audit changed

- Provider calls, keys, usage counters and the fallback policy moved out of `api.mjs` into `_ai.mjs`; `api.mjs` has no provider code left.
- The image-to-flow route called Claude directly; it now asks for the `vision` operation, so the provider check and messages are shared.
- The Claude model was hard-coded; both models are now configurable and validated (DeepSeek against the platform's live model list, Claude against the models the key can use).
- Provider errors are normalised (`not_configured`, `auth`, `unsupported`, `bad_request`, `rate_limited`, `unavailable`, `timeout`, `empty`, `invalid_output`) and a retryable error is retried once when the 25 s budget allows. Before, there was no retry on the server.
- Structured answers (kick-off, flow image, tasks) go through `generateJSON`: parsed, validated, repaired once, never passed through unchecked.
- Job parts used the fallback setting captured when the job started; they now use the live policy and keep an explicit choice explicit.
- No existing prompt, source list or output format was changed, except that open tasks now feed the gaps, go-live, handover, WSR and monthly drafts.

## Configuration

Everything is in **Admin › AI provider** (admins only) and stored server-side in the `ai` collection:

| Setting | Values | Default |
|---|---|---|
| Default provider | DeepSeek, Claude (only when a key is set) | DeepSeek |
| If Claude is not available | show an error, or use DeepSeek and say so on the result | show an error |
| Routing by type of work | for each group: default provider, DeepSeek or Claude | default provider |
| DeepSeek model | any model on the platform list (`ctx.llm.models()`) | `deepseek.v3.2` |
| Claude model | any model the key can use | `claude-sonnet-5-5` |

Changes take effect on the next request; no redeploy is needed. A missing Claude key never stops the app or DeepSeek:
a default or a route pointing at Claude without a key quietly uses DeepSeek, and removing the key resets those settings.
An explicit choice of Claude by a person is either honoured or refused with a reason; it falls back to DeepSeek only when
the organisation fallback setting allows it, and the result then says so. Image reading never falls back (DeepSeek
cannot read images).

facilio.work has no environment variables for apps; secrets play that role:

| Secret (secrets.facilio.work, type plain, granted to this app) | Purpose |
|---|---|
| `anthropic_api_key` | the Claude key (preferred) |
| `ai_master_key` | any long random text; only needed to let an admin save a key inside the app (stored AES-256-GCM encrypted) |

Keys are read only on the server, never logged, returned, exported or sent to the browser. Usage counters hold request,
error and retry counts and token totals only — never prompts, answers or keys.

## Enabling Claude when the company provides a key

1. The app owner adds a plain secret `anthropic_api_key` at secrets.facilio.work and grants it to the app
   (or adds `ai_master_key` and lets an admin paste the key under Admin › AI provider; it is checked with Anthropic first).
2. Admin › AI provider › **Test Claude connection** lists the models the key can use.
3. Optionally set the Claude model, then either make Claude the default or send one type of work to it
   (for example "Task assistance and classification" or "Documents and drafts"), and choose the fallback behaviour.
4. Generate one draft and run one task assistance request; the result shows "Claude" and the model.

Billing: Anthropic API usage is billed to the account that owns the key, separately from any Claude subscription.

## Adding another provider

Write an adapter in `_ai.mjs` with `{ id, name, caps, configured(), generate({ system, messages, maxTokens, temperature, timeoutMs, model }) }`
that translates the request into the provider's own API and throws only `AIFail` errors; add it to `ADAPTERS`, `PROVIDERS`,
`NAMES` and `DEFAULT_MODEL`; add its secret. Features do not change.

## Tests

| Suite | What it covers | Result |
|---|---|---|
| `tests/ai_layer.mjs` | DeepSeek through the shared service, Anthropic request format (system apart, model, headers, caps), configuration validation, missing key, image capability, retries and normalised errors, fallback policy and its smaller context, routing, structured output repair, guard against direct provider calls | 10/10 |
| `tests/work_adapter.mjs` | every route on a mocked platform, including the AI routes above and the new task routes | 38/38 |
| `tests/ui/tasks-check.mjs` | the Tasks workspace in a browser, with local stand-ins for the model | 40/40 |

Not verified: calls to the real DeepSeek platform model from this change (the first deploy does that; use Admin › AI
provider › Test DeepSeek), and any call to the real Anthropic API (no key is available). The Anthropic adapter is
implemented and tested against mocked responses only.

## Capacity, limits and what people see when the AI is busy
- **Default provider (platform AI):** each signed-in person has their own allowance (about 20 requests a minute and a daily cap). A hundred different people generating drafts at the same moment do not compete with each other; one person firing many requests in a burst (a long document written in parts) can reach their own minute limit.
- **Organisation Claude key:** the limits are Anthropic's, and they are shared by everyone using the key. This is the one place where many people can crowd each other out; pick a tier with enough requests a minute for the team, or leave the platform AI as the default.
- **Per-person caps in the app** (`LIMITS` in `api.mjs`): 40 AI requests, 240 document parts and 15 flow-image reads per person every 10 minutes, stored in the `rl` collection and shared by every copy of the server.
- **When a limit is hit:** the AI layer fails fast (it no longer retries a rate limit that lasts a minute, which only adds load), and the answer carries `Retry-After`. The page (`src/api.js`) then waits and tries again by itself: AI requests up to three times for up to 30 seconds each, other refused requests once, reads again after a network error or a 502/503/504. Each wait shows a short note. After that the person sees the server's own wording and what to do.
- **Not retried automatically:** a 502/504 on a write (the work may have started), errors that retrying cannot fix (no key, refused request).
- **Check:** `npm run test:load` (100 projects, 100 people at once, the AI limit behaviour, and that nobody can read another project under load) and `npm run test:scale` (database calls and time for the busiest pages). `LAT=8` adds a delay to every database call to stand in for the real database.

