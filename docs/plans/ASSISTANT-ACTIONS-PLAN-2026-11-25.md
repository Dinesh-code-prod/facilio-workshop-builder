# The assistant that does the work: actions, confirmation, verification, watcher (25 Nov 2026)

Goal: when a person asks the in-app assistant (or their own Claude through the connector) to change the project, it prepares the change, shows what it touches, asks before anything destructive, makes the change through the server, reads it back and reports, instead of saying which tab to open.

## Stage 1 and 2: what exists (audit, 25 Nov 2026)
- Assistant: `src/assistant.js` (panel), `src/chatcmds.js` (pattern commands), `src/quickfacts.js` (answers from records); server `/ai/ask`, `/assistant/route` (DeepSeek picks lookup/help/small/heavy), `/assistant/do`; heavy work goes to the person's own Claude as a `chat` job (`_jobs.mjs`, `project_jobs`).
- Actions the assistant runs today: open a page, open Meteor or Comet, create a task (asks first, Undo), add a guide folder, queue FTR / guide / WSR jobs, open a draft. Nothing edits module scope or flows; for "mark Purchase Order out of scope" Claude gets a chat job but no tool that changes scope.
- AI: DeepSeek through the platform (`ctx.llm`, `_ai.mjs`), JSON by instruction (no tool calling), per-person limits (40 per 10 min, 300 a day). Claude runs in each person's own Claude through the connector (MCP); the web app cannot drive that conversation.
- Writes: items (`PUT/DELETE /items/:kind/:item`, sanitized, audited for some kinds), docs (`PUT /docs/:section`, version check, no audit, no history), project info (`PATCH /api/projects/:id`). Module scope and state flows live in the workshop doc (`modules[name].inScope`, `flows[id].module`, `enabled`).
- Connector: about 30 read tools; direct writes for tickets, task replies, private to-dos, session findings, pushes with a nonce, project from MSA with confirm; proposals for drafts, minutes, task suggestions, design proposals.
- Checks to reuse for a watcher: `_portfolio.mjs` signals, `_missed.mjs`, `_nudges.mjs`, the task rules (`_taskrules.mjs`), BRD readiness (`checks.js`, browser only), the daily sweep.

## Design
- One server execution layer, used by the in-app assistant and by Claude: `POST /api/projects/:id/actions/:name` with `{ dryRun }`. A dry run returns the plan (records touched, dependencies, consequences, destructive or not, reversible or not) and a `token`. The real run needs that token, writes, reads the record back to verify, keeps a before-snapshot for Undo and writes an audit line. Every run checks the person's own access (`projectAccess`, edit).
- First operations: `scope` (modules in or out of scope; optionally switch off their state flows) and `undo` (puts the snapshot back). Tasks already have routes and the assistant's task command.
- The assistant: a message that asks for a change ("mark X, Y out of scope", "remove the flows of Z") becomes an action (fixed list of actions, matched against the project's real module names); the panel shows the plan card; Confirm runs it; the card shows what changed, what was verified and an Undo.
- Connector: `project_changes` with an `action` (dry run first, then run with the token) so a person's Claude can do the same with their own access. (Folded into the existing tool: the platform allows at most 40 tools.)
- Watcher: "Check this project" built from the existing signals and readiness checks, grouped by severity with the action that fixes each where one exists; how often it runs is set per person.
- Not done here: arbitrary database access, any use of Claude subscription credentials outside the connector, actions the server cannot verify.

## Done, 25 Nov 2026 (not deployed yet)
- `work/server/_actions.mjs`: actions scope, undo, history and check at `POST /api/projects/:id/actions/:name`. Previews are kept 15 minutes (collection `actp.<pid>`), runs with their old values in `acts.<pid>`, an audit line per run and undo. Tested in `tests/project_actions.mjs`.
- In the Assistant (`src/chatcmds.js`, `src/assistant.js`): "Purchase Order, Purchase Request and Quote are not required ... remove their flows and mark them out of scope" shows the plan, waits for Confirm, saves, reads back, reloads the page and offers Undo. The page sends the state flows of the imported configuration with their design, since only the page has that configuration. A question ("what is in scope?") is never an action.
- Project check: "check this project" (and the same each day, on open, or never, per person and project in this browser). It speaks by itself only about critical or high findings it has not shown before. Built from `assess()` (`_portfolio.mjs`) and the missed steps (`_missed.mjs`).
- Chat: messages up to 4000 characters (the router reads the first 600). Enter sends and Shift+Enter makes a new line, as before. A spoken request is always previewed and confirmed before it changes anything.
- Not done: attachments in the chat, more operations (requirements, tasks in bulk, fields), and Claude switching off flows that only exist in the imported configuration (it is told to use the Studio Assistant for those).
