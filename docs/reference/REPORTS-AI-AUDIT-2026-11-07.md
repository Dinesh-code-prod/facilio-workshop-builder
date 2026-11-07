# Reports: DeepSeek and Open in Claude audit (7 Nov 2026, roadmap A1c)

Question for every place that makes a report or a report-like document: is there a DeepSeek draft button, an Open in Claude / Add from Claude button (one engine: `src/claudehand.js`, `src/claudelogic.js`), and an export?
Rule for all of them: the answer lands as an editable draft. Nothing is sent to the customer or saved as final until a person presses the button.

"Before" is the state found on 7 Nov 2026; "Now" is after this change (deploy number in `docs/operations/DEPLOYS.md`).

| # | Report | Where | DeepSeek (before → now) | Claude (before → now) | Export |
|---|---|---|---|---|---|
| 1 | Weekly status report (WSR) | Reports & quality, `src/lifecycle.js` (`ACT.repOpen`) | yes (`ACT.repAi`) | **no → yes** (`ACT.repClaude`, Open in Claude + Add from Claude, fills the report) | Word, `.eml`, Outlook draft, copy |
| 2 | Monthly report | same | yes | **no → yes** | same |
| 3 | Weekly update to the customer | Governance, Weekly digest, `src/governance.js` | **no → yes** (`ACT.dgAi`) | **no → yes** (`ACT.dgClaude`) | Outlook draft, e-mail link, copy; "Post to the customer Overview" stays a person's button |
| 4 | Dashboard Report | `src/dashreport.js` | **no → yes** (`ACT.drAi`, summary) | **no → yes** (`ACT.drClaude`) | CSV, PNG, PDF (existing); the AI summary opens as an editable draft with Copy |
| 5 | FTR report (written) | FTR page, `src/ftr.js` | scenarios only → yes for the report (AI panel, task `ftr`) | no → yes (same panel) | draft opens in Deliverables & AI with Export Word |
| 6 | FTR workbook (scenarios) | FTR page | yes (`ACT.ftrAi`, suggests rows) | no (not a report: a spreadsheet the testers fill) | Excel |
| 7 | KPI workbook and SLA matrix | `src/slakpi.js`, KPI page | no | no | Excel |
| 8 | Hypercare status report | `src/lifecycle.js` Hypercare | yes (`aiBtn`) | yes (Open in Claude, Add from Claude) | Word (Deliverables & AI draft) |
| 9 | Handover pack | Handover & Closure | yes | yes | Word |
| 10 | Closure report | Handover & Closure | yes | yes | Word |
| 11 | Go-live readiness review | Delivery, Go-live (`src/delivery.js`, `src/golive.js`) | yes (AI panel) | yes | Word |
| 12 | UAT plan and test cases | Delivery, UAT | yes (AI panel) | yes | Word, Excel |
| 13 | BRD | BRD page (`src/brdview.js`) | yes | yes | Word, PDF |
| 14 | Customer user guide | Training & Guides (`src/guidebuilder.js`, `src/guidedraft.js`) | yes | yes (per section) | Word, PDF |
| 15 | Configuration documentation, gap check, training outline | Deliverables & AI, Configuration inputs | yes | yes | Word |
| 16 | Calendar briefing | Project plan Calendar (`src/plancal.js`) | yes | yes | draft with Word export |
| 17 | Minutes of meeting | Transcripts (`src/mom.js`) | yes | yes | saved as records |
| 18 | Portfolio briefing | Admin Command Center (`src/command.js`) | yes (`ACT.cmdBrief`) | yes (`ACT.cmdBriefClaude`) | Copy |
| 19 | Project health (one project) | Command Center project drawer | yes (`ACT.cmdBriefP`) | **no → yes** (`ACT.cmdBriefPClaude`) | Copy |
| 20 | Solution document (Solution tab) | `src/solution.js` | no (built from records and edited by hand) | yes, through connector jobs (`update_solution`, `compare_solution`) | Word (`ACT.solWord`) |
| 21 | Traceability gap check | Reports & quality | yes (`aiButton('gaps')`) | yes | draft |

## What was added

* Two helpers in `src/lifecycle.js`: `V.reportAi` (DeepSeek) and `V.reportClaude` (Claude through the hand-off engine). Both give the draft text back to the page, which puts it in an editable box. A copy also stays under Deliverables & AI as an unapproved draft.
* Server (`work/server/api.mjs`, `AI_TASKS`): the `wsr` prompt now asks for plan versus actual; the `monthly` prompt asks for scope changes and decisions needed; two new tasks, `govupdate` (rewrite of the weekly update, using only the draft figures) and `dashsummary` (summary of the figures on screen, never computing a number). Each task reads only the record kinds that report needs (`kinds`/`docs`). `get_task_pack` and `save_draft` pick the new tasks up automatically (`PACK_TASKS`), so Claude with the connector can draft them too.
* Claude side kept in step: connector help recipe (delivery status), Claude setup "How it works", Team Guide task list (`src/teamhelp.js`).

## Not added, and why

* KPI workbook and SLA matrix (row 7) and the FTR workbook (row 6): lists the team fills in, not narrative reports. Their written reports are the BRD KPI section and the FTR report (row 5), which have both buttons.
* Solution document (row 20): no DeepSeek button on purpose. The Solution tab is edited section by section and Claude changes it through connector jobs.

## Not checked

* No real Claude Desktop or Claude on the web run (only the pasted-reply path on localhost with the connector switched off).
* No real DeepSeek call: localhost uses the local stand-in model. The click path was run for the dashboard summary; the status report and weekly update DeepSeek buttons share `V.reportAi` / the existing `ACT.repAi` and were not clicked in the browser test.
* Word files were checked as downloads (file name and extension), not opened in Word.
* Test: `tests/ui/report-ai-check.mjs` (15 checks).
