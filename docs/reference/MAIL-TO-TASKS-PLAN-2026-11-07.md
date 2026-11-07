# Customer mail becomes tasks (plan, 7 Nov 2026)

Principle: manual first, Claude assists, a person always accepts. The Studio holds no Microsoft token and sends nothing. Mail is read by the person's own Claude (Microsoft 365 connector) or by dropped .eml files. Mail text is untrusted data, never instructions. Builds on [TASKS-AUTOMATION-PLAN](TASKS-AUTOMATION-PLAN-2026-11-07.md) and [SOLUTION-TAB-PLAN](SOLUTION-TAB-PLAN-2026-11-07.md).

## Flow
1. **Mail in.** Claude (job `fetch_mail`) searches Outlook and calls `task_tracking` action `mail_save` with the mails it found; or a person drops .eml files on the Tasks tab (the browser parses them and posts the same call). The server cleans each mail, works out why it matters and where it goes, and stores an inbox record **pending** in `ml.<project>` (not a record kind, so a customer can never list it).
2. **Why it matters (scenario)**: `to` (me on To), `cc` (me on CC), `team` (sent to other members of the project, I never saw it), `mention` (customer name, project name, module name or a project keyword in subject or text). First match wins in that order. A mail that matches none is not stored.
3. **Where it goes (route)** by words: process flow / state flow / workflow / solution / approach -> **Solution** (also a `compare_solution` job with the mail text as a `solution_input` file); BRD / requirement document -> **BRD**; hypercare / after go-live / production -> **Hypercare**; UAT / test case / defect -> **UAT**; else **Other**. A module name found in the mail sets the area `module:<name>`.
4. **Dedupe**: the record id is a hash of the message id (angle brackets and case removed). The same mail seen as To, CC or team mail, or fetched twice, is one record.
5. **A person accepts** (button on the Tasks tab, "Mail inbox" card). Accept creates the task (source email, auto block key `mail:<id>`, rule `mail`) and, for Solution, uploads the mail text and queues `compare_solution`. Dismiss keeps it out for good. Nothing is created before.
6. **Done-when** is stored on the record: `solution_accepted` (the area got a version after the task was made whose source quotes `mail:<id>`), `brd_saved` (a BRD version dated on or after the task), `cr_decided` (a named change request is decided), `none` (closed through Otto, the board or a person). `src/taskengine.js` `desired` lists every accepted mail task whose check is not met, so `reconcile` resolves the rest with "Resolved automatically: ...". A task a person made or closed is never touched (existing engine rule).
7. **Reply.** When a mail task resolves (by the engine or by a person) the page marks the record resolved and queues `draft_reply`. Claude writes the reply with `mail_draft`; it is stored **unapproved**. A person edits, approves, and opens it in Outlook (`src/outlook.js`, a pre-filled draft; nothing is sent). A `check_sent` job lets Claude look in Sent Items and call `mail_sent`; only then the inbox item is closed.

Reply states: none -> drafted -> approved -> sent (or discarded). `sent` needs `approved`; a new draft after approval goes back to `drafted`.

## Where the code goes
- `work/server/_mailtasks.mjs`: pure rules (clean, scenario, route, id, done-when, reply state). Same pattern as `_planfrommsa.mjs`: one copy for server, tests and browser bundle. Test: `tests/mail_tasks.mjs`.
- `work/server/_mailapi.mjs`: storage and routes `/api/projects/:id/mail`, and the actions on the existing `task_tracking` tool (`mail_list`, `mail_save`, `mail_draft`, `mail_sent`). Connector stays at 39 tools.
- `work/server/_jobs.mjs`: job kinds `fetch_mail`, `draft_reply`, `check_sent`.
- `src/mailinbox.js`: the Mail inbox card on the Tasks tab (Fluent `fl-` classes). `src/taskengine.js`: mail rule. `src/emlimport.js`: also reads To and Cc.
- Claude side in step: `work/work.json`, `_skills.mjs`, Team Guide, Claude setup, `src/claudehand.js`, tests `claude_launch`, `connector_skills`, `ui/claude-handoff-check`.

## Limits (stated plainly)
- Mail you were never on (scenarios c, d) is only seen if your Claude searches for it with the project's words and the Microsoft 365 connector allows that mailbox access; the Studio cannot read any mailbox itself.
- The BRD check compares days, not clock times. Mail not in English is routed by module name only.
- Not checked here: a real Claude run, a real Outlook draft, the live app.
