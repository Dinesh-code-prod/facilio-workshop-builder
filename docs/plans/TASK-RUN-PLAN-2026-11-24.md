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

## Phase 2: the daily run on the server
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
