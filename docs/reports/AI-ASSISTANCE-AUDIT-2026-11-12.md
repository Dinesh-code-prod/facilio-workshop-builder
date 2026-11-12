# AI assistance: audit and first revamp step, 12 Nov 2026

Goal (user brief, 12 Nov 2026): one AI ecosystem where Project AI knows the project, DeepSeek does routine work, and Claude routes, reasons, delegates and validates. The person never has to pick a model; an advanced option stays.

## What exists (before this step)

| Piece | Where | Engine | State |
|---|---|---|---|
| AI service | `work/server/_ai.mjs` | DeepSeek (facilio.work platform model, no key), Claude API only if an admin saved an Anthropic key | works; one 25 s call per request |
| Project AI (answers from the records) | `POST /ai/ask` in `api.mjs`, `askDeepSeek` in `src/assistant.js` | DeepSeek + `aiContext` (only the records for the asked area, one project) | works; cached 24 h per question and records |
| Router | `POST /assistant/route` | DeepSeek classifies lookup / help / small / heavy / unclear, splits multi-part messages; plain rules when DeepSeek is down | worked, but had no levels and no engine choice; "rewrite" counted as heavy |
| Quick facts | `src/quickfacts.js` | none (exact answers from the records) | works |
| Claude | job queue (`project_jobs`) picked up by the person's own scheduled task in Claude desktop, through the Studio connector | the person's Claude subscription | works while Claude desktop is open; pick-up wait ~3 min; idle pause needs one approval |
| Open in Claude buttons | `src/claudehand.js` (7 pages: whiteboard, tasks, minutes, guide draft, plan calendar, command bar, viewers) | job queue first, Open in Claude panel as fallback, pictures via the panel | works |
| Page jobs | 12 pages post jobs (kick-off, solution, design, mockup, guides, WSR, UAT/FTR, mail, requirements, lifecycle, workshop plan) | Claude | works |
| Drafts by DeepSeek | `/ai/run`, `/ai/job`, `/ai/mom`, `/ai/kickoff` | DeepSeek | works |

## What this step adds

- **Levels and engines** (`work/server/_route.mjs`, pure): every request gets a level (simple, standard, advanced, complex, critical) from six dimensions (steps, project context, reasoning, technical depth, risk, size) plus the model's first reading, and an engine: Project AI, DeepSeek or Claude. Only the ask decides (text pasted after a colon is material). Risky changes (customer, money, sign-off, delete) are at least advanced; heavy work at least complex.
- **DeepSeek routine work**: `POST /assistant/do` does rewrite, summarise, reformat, extract and classify on the text given, at once. If it fails, the request goes to Claude. The reply offers "Ask Claude to check this".
- **Claude orchestrates**: `project_jobs` action `delegate` (no new connector tool) lets Claude hand a routine sub-part to DeepSeek and get the answer back at once, with a reminder to check it. The chat job's instructions now say when to delegate, never to pass another project's data, to redo what falls short, and that reasoning, validation, configuration and anything the customer sees stay with Claude.
- **One entry point**: Auto picks the engine. The menu under the box keeps the advanced choice: Project AI, DeepSeek, Claude. Each reply is labelled Project AI, DeepSeek or Claude.
- **Evaluation**: `tests/route_eval.mjs` (in `npm test`) holds representative requests from the brief and the engine and level each must get; add a row whenever a request is routed badly. The server counts calls per day and engine (calls, failures, time, levels; no message text) and admins read them at `GET /api/admin/ai-routing`.

## What the current architecture cannot do (said plainly)

- **Claude cannot answer synchronously.** There is no Anthropic API key by default and a Claude subscription is not an API. Claude works through the queue in the person's own Claude desktop, so the first decision (which engine) is made by DeepSeek plus rules in the Studio, not by Claude. Claude takes over for everything routed to it and can re-judge the size, and it delegates from there.
- **Claude does not review every DeepSeek answer.** That would put a 3-minute queue wait in front of every quick answer. Instead, a DeepSeek or Project AI answer offers "Ask Claude to check this" / "Ask Claude to look deeper", and Project AI escalates by itself when the records do not settle a question.
- **Nothing runs when Claude desktop is closed.** Jobs wait (state kept: waiting, claimed, needs_input, done, failed), and the chat says Claude is paused and offers Activate Claude.
- **Comparing engines on the same task** can only be done for DeepSeek automatically; Claude's side has to be run through its queue. Accuracy is not scored automatically yet.

## Not done yet (next steps, in order)

1. Pass the level to Claude in the job (today only small or heavy), so the brief says "critical: show the plan and ask before saving".
2. A small Admin card that reads `/api/admin/ai-routing` (calls, failures, average time per engine and level).
3. The contextual AI boxes in the BRD editor, Form Builder, State Flow Builder and Process Whiteboard use their own buttons; route their free-text boxes through the same `assess` so they also pick Project AI, DeepSeek or Claude.
4. A hand-run comparison script: the evaluation set sent to DeepSeek through `/assistant/do` and to Claude through the queue, with a person scoring accuracy and completeness.

Checked: `npm test` (with the routing set), the three engines in the local preview (rewrite to DeepSeek, a pending-inputs question to Project AI, a BRD comparison to Claude). Not checked: the live DeepSeek classifier's readings against the set, a real Claude run using `delegate`.
