# Tasks that create and resolve themselves, with Otto in Teams (plan, 7 Nov 2026)

User direction (7 Nov 2026): Support and Tickets are gone; **Tasks is the one tab that tracks work.** Tasks must be added automatically and resolved automatically, so no person has to touch the task section by hand (a person can still create or resolve one). It needs a Kanban board, and it must work with Otto (the Teams bot): a task with a deadline reaches the owner as a personal Teams message; when the owner tells Otto it is done, the task is updated in the Studio. Extends [TASKS-TODAY-PLAN-2026-11-06](TASKS-TODAY-PLAN-2026-11-06.md) (nudges, replies, Today board). Nothing here is built yet.

## What already exists (read from the code)
- **One task register** per project (`kind task`: owner, due, status, source, comments; UAT issues are tasks). Statuses: To Do, In Progress, Blocked, Awaiting Customer, Awaiting Internal Input, In Review, Done, Cancelled.
- **A Kanban board** on the Tasks page (Jira-style: one column per status, drag a card to change its status) next to the list and sheets.
- **Teams:** `my_tasks`, `send_task_digest`, an assignment message (`ctx.teams.send`, off until the secret `teams_notify = on`), and the pure rules in `work/server/_taskwatch.mjs`.
- **Claude tracking:** `task_evidence` and `save_task_suggestions` propose changes; a person accepts them.
- **Otto calls the Studio through `work/work.json`** (the connector tool list). So Otto can send a reply to the Studio the same way Claude does, as a tool action. Not yet tried for a Teams reply.

## 1. Tasks that create themselves
One engine, `reconcile`, turns the facts the Studio already holds into the list of tasks that **should** exist right now, and compares it with the tasks that do. Each automatic task has a stable key (`source: { auto: true, rule, key }`) and a task id derived from that key, so running the engine twice can never make a duplicate, and any team member's browser or the scheduled Claude run can do it.

| Rule | Task it creates | Owner | Resolves itself when |
|---|---|---|---|
| Items waiting on Checks & validations | "Review N items from <transcript>" | Project lead | none left in To review |
| BRD review ticks missing (six parts) | "Review the BRD: <part>" | Project lead | the part is ticked |
| BRD approval pending | "Approve the BRD" | BRD approver | approved |
| Confirmed requirement without a test case | "Write test cases for <module>" | Module consultant | a test case names the requirement |
| Failed or blocked test case | "Fix and retest <case>" | Module consultant | the case passes |
| Open UAT issue | already a task (kept as is) | its owner | issue closed |
| Change request waiting | "Decide change request <id>" | Approver | decided |
| Claude job waiting for an answer | "Answer Claude: <question>" | Requester | answered |
| KPI without a solution, SLA row incomplete | "Write how Facilio delivers <KPI>" | Module consultant | written |
| Go-live readiness gap | one task per gap | Project lead | the check turns green |
| Hypercare issue open | already an issue (kept as is) | owner | resolved |
| Handover item not done | "Hand over: <item>" | Project lead | ticked |
| Plan task due soon (existing plan tasks) | the plan task itself | its owner | marked done |

Rules for the engine: it never edits a task a person created, never reopens a task a person closed or cancelled, never deletes (an automatic task whose reason is gone is moved to Done with the note "Resolved automatically: <why>"), writes who and why into the task history, and runs on opening the Tasks page, after any confirmation that changes the facts, and from the scheduled Claude run.

## 2. The Kanban board
- Same board, columns grouped as **To do, In progress, Waiting (blocked, awaiting customer or internal), In review, Done**.
- Every card shows an **Auto** badge when the engine made it, the owner, the due date (red when overdue) and its reason (one line).
- A card moves to Done by itself when its rule says so; a person can still drag any card. Filters: mine, overdue, auto, by stage (the eight stages) and by module.
- A column "Needs a person" for the few tasks only a human can do (approvals, customer decisions).

## 3. Otto in Teams
1. **Deadline message.** Each morning, and the day before a deadline: one personal Teams message per project member (never customers) listing what is due or overdue, each with the deadline, the reason and a link. Nothing is sent while `teams_notify` is off. One message per person per day.
2. **The reply.** The owner answers Otto in plain words ("T-12 is done, file sent") or with a button (Done, Blocked, Snooze). Otto passes it to the Studio with a connector action (`task_tracking`, action `reply`: task, text, who). The Studio accepts it **only from the task's own owner** (Teams identity matched to the project member), sets the task to Done, and stores the words as evidence. Unclear words are stored as a reply and Claude matches them in the next run.
3. **Manager line.** Anything blocked, or silent for two reminders, appears on the Today board for the project lead; an overdue task can also notify the lead.
4. **Official records** (BRD approval, sign-offs, customer-facing output) are never closed by a reply alone: Otto asks the owner to confirm in the Studio.

## Build order
1. **Engine** (`reconcile`, pure, tests), the Auto badge and the board grouping. Value on its own; no Teams needed.
2. **Rules one by one**, starting with the ones that already have clean data: Checks & validations, BRD review ticks, test case coverage, failed test cases, change requests.
3. **Deadline message** through the existing digest tool and the scheduled run.
4. **Reply from Otto** (`task_tracking` action `reply`, owner check, evidence, board update).
5. **Today board** for the project lead; quiet hours and mute.
Each slice also updates `work/work.json`, the Team Guide and the tests (the connector stays at 39 tools: new actions go on `task_tracking`).

## Decisions and tests needed from you
1. **Does Otto receive a Teams message and call a Studio tool with it?** I can write the tool; the answer needs one real test in Teams with Otto.
2. **Who turns on `teams_notify`** (an app owner adds the secret) and are Teams messages allowed while the app review is pending?
3. **What triggers the daily message?** The platform has no scheduler. Option A: the scheduled Claude task on one person's computer (stops when Claude Desktop is closed). Option B: Otto's own schedule, if it has one. Option C: sent when anyone opens the Studio each morning (weakest).
4. **Owner by rule:** who is the "project lead", the "module consultant" and the "BRD approver" of a project? Today a project has an owner and members; module consultants are not recorded.
5. **Automatic tasks for customers?** I assumed none: customers never get automatic tasks or Teams messages.

## Not checked
No Teams message has been sent or received. The engine is not written.

## Status at the end of 7 Nov 2026 (what the engine does now)
Rules built in `src/taskengine.js`: Checks & validations (findings), BRD review ticks (brd), BRD in review (brdapp: Approve the BRD), test case coverage (cover), failed or blocked case (fail), KPI without a solution (kpi), change request waiting (cr), Claude question waiting (ask), stage ready to close (stage), go-live gaps once testing has started (gl: tests run, open issues, guides made), and customer mail (mail, see MAIL-TO-TASKS-PLAN). Each creates its task with a stable key and resolves it with "Resolved automatically: <why>" when the fact is gone; a rule whose data is not loaded is left alone (`unknownRules`); a task a person made or closed is never touched.
Also built (later on 7 Nov): SLA row missing a response or resolution time (sla), handover item not ticked once go-live is approved (ho), and a Facilio or shared plan task due within a week (plan, with its due date). Hypercare and UAT issues are already tasks, so the engine adds nothing for them. Every rule in the table above now exists.
The loop with Teams: the assignment message and the daily digest carry a Done button (runs `task_reply` as whoever presses it, so only the owner can); plain words to Otto ("T-12 is done") go through `task_tracking` action `reply`, which the Studio accepts only from the task owner and never for approvals or sign-offs. The task then shows Done in the Studio with the reply as a comment. Not checked: a real Teams message or Otto reply.
Efficiency: the engine saves its changes five at a time, loads the extra record kinds only once per page, and runs at most once a minute per project.
