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
| modules | System Modules & Form Builder | Team | `module.js` | Stage 3 trimmed: fields and forms come from Claude's reading of the transcripts | Solution page, BRD (fields, forms), Claude jobs |
| flow | State Flow Builder | Team | `flowbuilder.js` | Stage 3 trimmed: state flows come from the Process whiteboard (Save as state flow) | Whiteboard, BRD, Solution page |
| roles | Roles & Access Permissions | Team | `roles.js` | Stage 3 trimmed: roles follow the whiteboard flow (who presses each arrow) | BRD role matrix, Solution page |
| notifications | Notifications | Team | `notifications.js` | Stage 3 trimmed: notifications are added when a whiteboard flow is saved | BRD, Org package |
| cfginputs | Configuration & org package | Team | `cfginputs.js` | Stage 3 trimmed | Org package export |
| solution | Solution (text editor) | Team | `solution.js` | Replaced in the menu by the Solution page (`solmap.js`); still opens from "Review the solution text" | Solution page, BRD |
| mailtab | Customer mail | Team | `mailinbox.js` | Customer email removed; the daily mail search is switched off (`MAIL_OFF` in `work/server/_jobsapi.mjs`) | none in the menu |
| uatguide | UAT guide | Team | `uatftr.js` | Not finished in the Part E revamp | FTR and UAT pages |
| aiwork | Deliverables & AI | Team | `lifecycle.js` | Not finished in the Part E revamp | Project lifecycle |
| inbox | Inbox | Team | `inbox.js` | Kept hidden until rebuilt | none in the menu |
| overview | Project overview (old) | Team | `overview.js`, `overviewhub.js` | Duplicated another tab | Project dashboard |
| msaflow | MSA flow | Team | `msaflow.js` | Duplicated Contract intake | Contract intake routing |
| showcase | Showcase | Team | `showcase.js` | Duplicated another tab | Home |
| agentguide | Agent guide | Customer | `clientguides.js` | Duplicated another tab | Client guides |

Tabs removed earlier with no page file of their own (supportdesk, agents, agentdata, agentrules, agenttest, vstudio, transition) were routes or sub-views; their history is in git (`git log -S "<id>" -- src/shell.js`).
