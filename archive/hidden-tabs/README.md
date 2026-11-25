# Hidden tabs: the temp folder

Tabs taken out of the Delivery Studio menu are kept here so any of them can be brought back later and fitted to the current design (user, 13 Nov 2026).
Each file is a **copy taken on 13 Nov 2026** of the source that draws the tab. The live code in `src/` is not removed, because other features still use it (for example `roles.js` gives the BRD its role matrix, `solution.js` writes the solution text, `module.js` holds the field and form model). Only the menu entry is gone.

## How to bring a tab back
1. Add its view id back to the menu: the stage group in `NAV` in `src/shell.js`, and to `EXPOSED` in the same file.
2. Compare the copy here with the live file in `src/` (`git diff --no-index archive/hidden-tabs/<file> src/<file>`). The live file may have moved on; start from it and take what you need from the copy.
3. Restyle it to the current look (the "Direction A" block in `src/projfx.css`), run `npm test`, and update `tests/nav_exposed.mjs`.

## The hidden tabs

| View id | Tab | Who saw it | Copy here | Why it was hidden | Live code still used by |
|---|---|---|---|---|---|
| ~~modules~~ | System Modules & Form Builder (back 16 Nov 2026 as Forms & templates, stage 2 Module design) | Team | `module.js` | Stage 3 trimmed: fields and forms come from Claude's reading of the transcripts | Solution page, BRD (fields, forms), Claude jobs |
| ~~flow~~ | State Flow Builder | Team | `flowbuilder.js` | **Back in the menu on 16 Nov 2026** as "State flow builder" next to the Process whiteboard, which keeps a saved flow in step | Whiteboard, BRD, Solution page |
| rsquestions | Questions (Requirement sessions) | Team | `qbank.js` | 16 Nov 2026: folded into the Workshop room (Add a question, Import questions per session, Ask Claude for questions, Edit); old links open the Workshop room | Workshop room (its actions), floating window |
| ~~roles~~ | Roles & Access Permissions (back 16 Nov 2026 as Roles & access, stage 2 Module design) | Team | `roles.js` | Stage 3 trimmed: roles follow the whiteboard flow (who presses each arrow) | BRD role matrix, Solution page |
| ~~notifications~~ | Notifications (back 16 Nov 2026, stage 2 Module design) | Team | `notifications.js` | Stage 3 trimmed: notifications are added when a whiteboard flow is saved | BRD, Org package |
| cfginputs | Configuration & org package | Team | `cfginputs.js` | Stage 3 trimmed | Org package export |
| solution | Solution (text editor) | Team | `solution.js` | Replaced in the menu by the Solution page (`solmap.js`); still opens from "Review the solution text" | Solution page, BRD |
| ~~mailtab~~ | Customer mail (back in the menu; since 24 Nov 2026 the ONE place for project mail) | Team | `mailinbox.js` | Was hidden while the mail search was off | Customer mail page |
| tasks Email tab | Email (a tab on the Tasks page) | Team | `tasks-email-tab.js` | 24 Nov 2026: showed the same records as Customer mail; the Tasks page now links there | Customer mail page (`V.mailView`) |
| uatguide | UAT guide | Team | `uatftr.js` | Not finished in the Part E revamp | FTR and UAT pages |
| aiwork | Deliverables & AI | Team | `lifecycle.js` | Not finished in the Part E revamp | Project lifecycle |
| inbox | Inbox | Team | `inbox.js` | Kept hidden until rebuilt | none in the menu |
| overview | Project overview (old) | Team | `overview.js`, `overviewhub.js`, `overviewhub-2026-11-25.js` | Duplicated the Dashboard. **25 Nov 2026:** its Overview tab is also gone from the Project cycle hub (Stages, Roadmap, Plan vs actual, Report pack stay); old links land on Stages | Project dashboard |
| msaflow | Contract (the old guided page: Agreement, Scope check, Terms & integrations, 6 steps) | Team | `msaflow.js`, `msaflow-2026-11-25.js` | Duplicated Contract intake. **25 Nov 2026:** old links (contract, scope, planner, msaflow, msafind, contracts, the Dashboard KPI cards) still opened it; now they land on the menu pages. What only it had moved: Know Your Contract, MSA scope, Scope check, Scope document, Terms & integrations are tabs of Contract intake; Session list, Module distribution, Attendees, Schedule changes, Excel & publish (with Publish schedule to customer) are tabs of Requirement schedule. Not moved (Contract intake and the kick-off pack do them now): its own upload, rule-based extraction, Proposals & order, Live schedule, Finalise | Contract intake, Requirement schedule |
| transcripts | Requirements (old hub: Transcripts & requirement confirmation, Prepare questions, Use cases) | Team | `transcripts-2026-11-25.js`, `workshubs-2026-11-25.js` | 25 Nov 2026: duplicated Transcripts. Requirements register (with Open questions, Review history, Session → BRD), Use cases and Prepare questions are tabs of Transcripts; its own Transcripts tab, Upload transcript and three jump-away buttons are gone there (older uploads stay readable under "Older uploads" while a project has any) | Transcripts |
| checks | Checks & Validations (old page of its own) | Team | none (`src/checks.js` unchanged) | 25 Nov 2026: duplicated Checks & validations. All its tabs (Readiness, Validation, Module status, Scope coverage, Source checks, Change history) are the "Readiness & validation" tab of Checks & validations | Checks & validations |
| schedule (team) | Workshop Schedule as the team saw it | Team | none | 25 Nov 2026: the customer's page; team links now open Requirement schedule. Customers keep it | Customer menu |
| showcase | Showcase | Team | `showcase.js` | Duplicated another tab | Home |
| agentguide | Agent guide | Customer | `clientguides.js` | Duplicated another tab | Client guides |

Tabs removed earlier with no page file of their own (supportdesk, agents, agentdata, agentrules, agenttest, vstudio, transition) were routes or sub-views; their history is in git (`git log -S "<id>" -- src/shell.js`).
| guides tabs | Training: Library, Create and Review tabs | Team | `guideslist-3tabs-2026-11-24.js` | 24 Nov 2026: replaced by one list with + New guide in three steps (user: too many buttons, tabs and details) | the Training page (`src/guideslist.js`) |
| guides list | Training: the one-column row list (a big blue button per row, folders mixed into the list) | Team | `guideslist-rowlist-2026-11-24.js` | 24 Nov 2026: replaced by the file-browser style list (command bar with + New, breadcrumb with Back, Name/Type/Status/Modified columns, folders first, Videos to make folded) | the Training page (`src/guideslist.js`) |
