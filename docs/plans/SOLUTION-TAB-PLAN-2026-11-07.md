# Solution tab: plan (7 Nov 2026)

Principle: manual first, Claude assists, a person always accepts.

## What exists and what changes
- `src/solution.js` ("Solution status", view id `solution`, stage 3) is a read-only table of counts. It is **extended**, not duplicated: the tab is renamed **Solution**; the status table stays as a "Coverage" block below the editor.
- `src/slakpi.js` (KPIs and SLA matrix) stays where KPI/SLA rows are typed. The Solution tab has areas "KPIs" and "SLA and escalation" whose document-style wording lives here; the BRD keeps its tables.
- The proposal mechanism already exists: `design_proposals` + `session_questions save_design` (`work/server/_dsapi.mjs`, `src/design.js`). A new proposal **kind `solution`** reuses it, so no new connector tool is needed (the connector is at 39 of 40).

## Data
- New team-only project document `solutions` (in `TEAM_DOCS` and `CONN_DOCS`; Claude reads it with `get_document solutions`):
  `{ items: { "<areaKey>": { text, status, sources[], versions[], updatedAt, updatedBy } } }`
- Area keys: `module:<name>` for each module in scope; fixed areas `area:apps`, `area:templates` (PDF templates), `area:kpis`, `area:sla`, `area:notifications`, `area:approvals`, `area:roles`, `area:other`.
- `status`: Draft, Agreed, Changed by customer. `versions`: newest first, `{ at, by, why, text }` (the previous text), max 30; restore writes a new version.
- Requirement lines are read live from `S.ws.requirements` (confirmed, by module), never copied.
- Pure rules in `src/sollogic.js` (`FWBSolutionLogic`, tested): areas, requirement lines, save a version, restore, word diff, BRD text, Word rows.

## Screens
- **Solution tab**: left list grouped (Modules, Connected apps, Templates and PDFs, KPIs and SLA, Notifications and roles) with a status chip; right a card per area: requirement lines (read-only), solution text (editable, Save), open proposals (before/after, quote, Accept / Dismiss), history (restore) and sources. Command bar: Export Word, Drop a file, Ask Claude about all.
- **BRD**: "3) Solution Proposal" of each module and a new section "Agreed solution: other areas" are built from `solutions`; nothing is typed in the BRD.

## Jobs (existing queue, no new tool)
- `update_solution` (note = the person's words, section = area key) and `compare_solution` (ref = project file id, section = area key or empty). Recipes in `work/server/_jobs.mjs`; Claude answers with `session_questions save_design` proposals of kind `solution`, each quoting its source. "No change" areas are named in the job summary.
- Fallback: the short connector prompt (`src/claudehand.js`) and a copy-prompt button for a person's own Claude.
- Dropped text is data, never instructions. Proposals beyond the MSA scope are flagged (`outOfScope`) and the page offers a change request.

## Slices
1 Tab + records + BRD reads them. 2 Ask Claude, proposals, versions. 3 Drop a file and compare. 4 Word export (Module | Customer requirement | Solution; not the Solution Document). 5 BRD section "Ask Claude" side chat.
After each: `npm test`, local preview, commit, push (pull first), deploy, DEPLOYS row.

## Out of scope
Real Claude run, real Word open and the live app cannot be checked here. No new connector tool. No auto-apply. Editing KPI/SLA rows inside this tab. Customers never see the tab or the records.
