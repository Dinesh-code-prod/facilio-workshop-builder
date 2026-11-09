# What a new project plan version changes (9 Nov 2026)

Test and scenario: `tests/plan_reimport.mjs`. Code: `src/planmerge.js`, `src/timeline.js` (`importFromFile`), `src/plan.js` (`planUpload`).

## How the plan feeds the Studio
- The uploaded Excel file (Project Plan, Workbook tab) is only a file with versions. Nothing reads it except the import.
- The **timeline rows** (`plan_struct`) are what everything else reads: the current stage and phase strip (`phaseNow`), the dashboards and progress figures, the calendar, WSR and monthly reports, the customer's journey, the task engine (plan rows that fall due), and the admin portfolio health (`work/server/_portfolio.mjs`, `planInfo`).
- The **current stage** is the latest of the 12 standard steps whose first task has started (start date on or before today), unless a person fixed the phase by hand (phase strip). Steps are found by task title (BRD, UAT, Go-live, Training ...); a title no step matches is not counted.
- **Closed stages** (Project cycle, `lcstage`) are recorded by people and do not depend on the plan. A re-import never closes or reopens a stage. Tasks, records, approvals and sign-offs are not touched.

## What changed in this release
- Before: uploading a new version only stored the file. The timeline, stage, dashboards and customer view stayed on the old plan until someone found the notice on the Timeline tab and pressed Update. The update then **replaced every row with a new id**, so progress recorded on the Timeline was lost and the slip against the baseline broke.
- Now: after an upload the Studio asks "Update the timeline from this version?". The update **merges**: a task still in the plan keeps its id, owner and progress (unless the sheet has status or % columns, then the sheet wins; a finished task is not reopened silently). The message says how many tasks were kept, moved, new or dropped, and the stage before and after.

## Scenario in the test
Today 9 Nov 2026. Old plan: implementation has started, so the project is in **Stage 3, Solution design & BRD**. The customer delays the BRD sign-off to 20 Nov and implementation to 21 Nov; training is dropped and a data task is added. After the import the BRD task still shows 60% and its owner. Because the dates decide the stage, the project moves **back to Stage 2, Requirement sessions**, and the message says so. If the phase was fixed by hand, the stage does not move and the message says that too.

## Known limits
- A stage that moves back is shown as is; nobody is asked to confirm it. Fix the phase by hand if the team does not want the dates to decide.
- Tasks are matched by title (and phase). A task renamed in the new sheet counts as dropped plus new.
- The customer sees the new dates as soon as the timeline is updated (the customer view reads the same rows).
