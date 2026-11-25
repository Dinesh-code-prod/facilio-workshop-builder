# Tasks from project creation to handover: the daily task run (24 Nov 2026)

Follows docs/plans/TASKS-AUTOMATION-PLAN-2026-11-07.md (the task engine). People approve: Claude and the rules propose tasks, owners and closures; a person accepts them. Standard stage tasks are added by a person (Tasks > Stage tasks); each phase has an on/off switch per project.

## What existed
- One task register per project (`src/tasks.js`, validated by `taskSanitize` in `work/server/api.mjs`).
- The task engine (`src/taskengine.js`) creates and resolves its own tasks from Studio facts, but only in the browser, on the open project, when the Tasks page opens.
- Chasing: due-soon, overdue (every 2 days), escalation after 5 days, morning brief, Otto replies; all run from the daily sweep that starts when the first team member opens the Studio.
- Claude proposes task changes (`task_tracking` evidence then save); a person accepts them on the Tasks page.

## Phase 1, done 24 Nov 2026
- Fixed: the task engine wrote stage names the server refuses ("Requirement sessions", "Solution design & BRD", "UAT & FTR", lifecycle names), so those tasks and the rest of that pass failed; "Hypercare Issue" and the `uat` source were refused. One stage list now: the server's seven task stages, with the lifecycle stage mapped to them (`LIFE_STAGE` in `src/taskengine.js`); `tests/stage_tasks.mjs` keeps them in step.
- Delivery role per team member (Settings > Access, Implementation team): Project manager, Implementation consultant, Solution architect, Integration consultant, UAT lead, Trainer, Support lead (`people.team[].drole`).
- Stage tasks: a template type in Templates (one "# Stage" heading per stage, one task per line: Title | Delivery role | Days until due | Task type), plus the Facilio standard list in `src/stagetasks.js`. Tasks > Stage tasks adds a stage's tasks, each owned by the member with that Delivery role (else the project manager), due the given number of days later; a task already added is skipped (task key `tpl:<stage>:<title>`).

## Phase 2, done 24 Nov 2026: the daily run on the server
- Tasks > Daily task run (off until a person switches it on, per project; GET/POST /api/projects/:id/task-run, record trcfg). Once a day, in the daily sweep, the server adds the standard tasks of the stage the project is in (the first lifecycle stage not closed), from the project's published Stage tasks template or the Facilio standard, each owned by the member with its Delivery role; a task already added is never added again. Switching it on adds the current stage's tasks at once.
- The rules are shared by the browser and the server: `work/server/_stagetasks.mjs`.
- Due dates follow the project plan: a task is due its number of days after the start of its stage in the plan (the plan rows whose title or phase belongs to that stage, the same words as src/lifelogic.js), never after the stage end and never before today; without plan dates, days after the day it is added.
- The task engine (its rules read many pages, so they run in the browser) now starts whenever a team member opens a project, not only on the Tasks page. Its rules now live in `work/server/_taskrules.mjs`, and the daily task run also runs them on the server (engineRun in api.mjs) for the rules whose facts the server reads exactly as the page does: open session findings, failed or blocked test cases, KPIs without a solution, change requests waiting for a decision, the BRD waiting for approval and Facilio plan tasks due within a week. The other rules (BRD review, test coverage, stage close, SLA, handover, go-live, Claude questions, customer mail) still need the open page and are left to the browser engine, so the two never undo each other.

### First outline of phase 2
- Run the task engine rules on the server for every project in the daily sweep, not only in the open browser.
- When a project enters a stage, add that stage's standard tasks (as Stage tasks does), with due dates from the project plan.
- Keep the existing chasing.
- Limit: facilio.work has no scheduler; the run starts with the first team member who opens the Studio that day, or a Claude Desktop scheduled task.

## Phase 3: Claude's daily review
- A `task_review` job per project each morning: Claude reads the day's minutes, transcripts, mail and UAT results and proposes new tasks (with an owner by Delivery role), closures where the evidence shows the work is done, and reassignments, each with its reason and source.
- The project lead accepts or dismisses them on the Tasks page (with Accept all); a short summary goes to the project's Teams channel.

## Phase 4: the lead's view
- Today's run: created, proposed, closed and overdue, per stage.
- Workload per person, to balance owners.
- On/off per project.
