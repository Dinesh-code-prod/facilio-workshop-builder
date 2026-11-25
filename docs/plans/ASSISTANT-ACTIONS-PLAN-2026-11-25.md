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
- Deployed as deploy 534.

## Done later the same day (the "not done" list)
- Claude and the imported flows: a scope change through the connector queues them (`pendingFlowsOff` in the workshop); the Assistant applies the switch when a team member next opens the project, says so, and marks each copy (`offBy: 'pending'`) so Undo takes it away again.
- Requirements: "… and its requirements out of scope" (or `requirements: 'out'`) sets them to "Out of scope" with a history line, only when every module of the requirement is out after the change; Undo restores the status and drops the line.
- Tasks in bulk (action `tasks`): close, cancel, reassign or re-date open, overdue or all tasks, by owner and module ("close all overdue tasks of Quote", "reassign Ravi's open tasks to Asha", "move my overdue tasks to 2026-12-05"). Each task goes through the normal task save with its version; the read-back compares every changed field; Undo puts the old values back.
- Chat attachments: the paperclip saves files as team-only project files (category `chat_attachment`); a message with files always goes to Claude with each file's id, and Claude reads them with project_jobs action file_urls.
- The project check settings (how often, last day, findings already shown) are kept on the account per project (action `watch`), so every browser agrees.
- Still not done: field changes through the Assistant (fields stay in the module page and the design proposals).

## Any tracker becomes tasks (deploy after 535)
- An Excel or CSV attached in the chat with "add these as tasks" is read in the browser (`V.readSheets`, shared with the UAT import): `src/trackerlogic.js` finds the header row under titles and blanks, matches the columns by their names (task, details, owner, due, status, priority, module), reads dates (ISO, day first, 5-Dec-2026, Excel day numbers), statuses and severities in the usual words, keeps every other column in the task's details and leaves out rows already closed.
- The server action `addtasks` previews the new tasks (a title already in the register is skipped, an owner not on the team is left unassigned and named, a module label becomes the module name), creates them through the normal task save with the tracker and row as the source, reads them back, and Undo removes only those nobody changed since.
- "add these as test cases" opens the UAT import with the file loaded. A layout the browser cannot read, a PDF, Word file or mail goes to Claude, which can call the same `addtasks` through `project_changes` after the person's yes.
