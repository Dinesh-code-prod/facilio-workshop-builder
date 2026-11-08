# Daily task follow-up: Today board and Teams replies (plan, 6 Nov 2026)

Extends roadmap E12 (tasks tracked and chased through Teams). Nothing here is built yet. Principle: the consultant stays in charge; a task changes only through the assignee's own click or words, or the manager's decision.

## Goal
A project manager opens one page each morning and sees where every milestone and delivery stands, without anyone retyping status. People are reminded in Teams, answer in Teams, and the answer reaches the task.

## What exists (read in the code)
- One task register per project (`kind task`: owner, due, eta, status, blocker, source). `GET /api/my/work`.
- `my_tasks` and `send_task_digest` connector tools, the assignment DM, the pure rules in `work/server/_taskwatch.mjs`, `ctx.teams.send` gated by the secret `teams_notify = on`.
- Claude tracking (slice 2 of E12): `task_evidence`, `save_task_suggestions`, a suggestions panel on the Tasks page.
- Not built: receiving anything from Teams, any scheduled trigger, a manager's Today board. Not verified: a real Teams delivery.

## The loop
1. **Morning nudge.** Once a day per person: one Teams message listing tasks due today or overdue, with deadlines and a link. Project members only (never customers), skipping people who muted the app, nothing sent unless `teams_notify` is on. The result reports what Teams really returned.
2. **Reply.** Two ways, both by the assignee:
   - Buttons in the message (Done, Blocked, Snooze one day). The press is the confirmation; it updates the task at once and stores who, when and how.
   - Free text ("finished, sent the file"). Stored as a **reply** with the text as evidence. It does not change the task by itself.
3. **Matching.** A scheduled Claude run (stage `tasks`, reads only the tasks documents and the replies) matches each reply to the task it answers and proposes the change as a suggestion with the quote. A reply from the assignee that clearly says done becomes a one-click confirmation for the assignee in Teams ("Mark T-12 done? Yes / No"); anything unclear goes to the manager. Claude never closes a task on its own reading.
4. **Today board** (manager). Per person and per project: due today, overdue, blocked, replied, silent. Each line shows the evidence (reply, button, source) and who confirmed it. A manager can confirm, reopen or reassign.

## Slices (build in this order)
1. **Today board** (read-only, from the existing register): `src/today.js` + pure `src/todaylogic.js`, view `today`, tests. Value on its own; no Teams needed.
2. **Nudge**: schedule the morning digest through the same scheduled-task pattern as `studio-job-queue` (job kind `send_nudges`, stage `tasks`); once-a-day key, mute, preview before sending for the first week.
3. **Buttons**: Done / Blocked / Snooze through Teams actions (`{ title, fn, data }`); a server route that accepts the press only from the task's owner; audit line.
4. **Replies**: store free-text replies (`task_reply` records) and the matching step; folded into `task_tracking` as a new action so the connector stays at or under 40 tools (it is at 39).
5. **Preferences and polish**: quiet hours, per-person mute, weekly summary, customer-owned actions kept separate.

Each slice also updates `work/work.json`, `CONNECTOR_HELP`, the Team Guide and the tests (rule in CLAUDE.md).

## Data
- Task keeps its fields; adds `lastNudgeAt`, `snoozedUntil`, `evidence: [{ at, by, via: 'button'|'teams_reply'|'manager', text }]` (capped).
- `task_reply`: `{ id, project, taskId?, from, text, at, status: 'new'|'matched'|'applied'|'dismissed' }`. The reply text is data, never an instruction.
- Status changes record who made them and how.

## Safety
- A reply counts only from the assignee's own Teams identity (matched to the project member's e-mail).
- Reply text from anyone is data: no instruction in it is followed.
- A task changes only by the assignee's click or confirmed reply, or a manager's action.
- One nudge per person per day; nothing sent when `teams_notify` is off.

## Open questions (need an answer or a test before slices 2 to 4)
1. Is "O2" the Teams bot Otto? Can Otto pass a person's reply or a button press to the Studio (a tool call on the connector, or a webhook)? Not verified.
2. Who adds the secret `teams_notify = on`, and are Teams notices allowed for this app while its review is pending?
3. How is the morning run triggered: a scheduled Claude task on one person's computer (same limits as today) or something Facilio runs? The platform has no scheduler.
4. How Milova tasks and these tasks relate: run side by side first, then decide on import.

## Not checked
No Teams message has been sent or received. No reply path exists yet.
