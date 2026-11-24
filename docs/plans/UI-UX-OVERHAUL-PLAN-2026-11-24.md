# UI/UX overhaul plan (24 Nov 2026)

The findings are in `docs/reports/UI-UX-OVERHAUL-AUDIT-2026-11-24.md`. Branch `feat/ux-overhaul` is stacked on PR #25 (`feat/master-design-system`). The pull request goes to `main`; it is not deployed and not merged.

**Rule for every batch:** clean the presentation, never the capability. Every route, permission, approval rule, audit entry, import/export, AI job and Microsoft 365 action stays. Actions move into a menu or a row, but they are not deleted. Anything that would change behaviour is listed under "Your call" and waits for a yes.

## Foundation (batch 0)

Shared pieces, each used by more than one page. The JS helpers go in `src/projfx.js`, next to `skel()`. The CSS is one "Review tables and count strip" block at the end of `src/masterds.css`, so it inherits #25's tokens.

| Piece | What it is |
|---|---|
| `V.countStrip(items)` | One quiet line of counts ("3 to review · 12 confirmed · 2 dismissed"). Each count can be a filter button with `aria-pressed`. It replaces the large figure tiles on review pages. |
| `.rv-table` | The review table. It reuses `.tbl` and `.tbl-wrap` (sideways scroll inside the wrapper), and adds: a sticky head; group header rows (`tr.rv-group`); a status cell as dot plus word (`.rv-st.ok / warn / bad / muted`, never colour alone); a right-aligned action cell with text buttons (`.btn.ghost`); and an expandable detail row (`details` inside a cell). |
| `.rv-toolbar` | One line above the table: search, one or two selects, and the bulk bar on the right that appears only while rows are selected. |
| Button rule | On review pages, row actions are secondary or text buttons. The only solid button is the page's main header action, plus bulk Confirm while rows are selected. |

## Batches

Each batch is one commit, verified before the next starts:
- `npm test`;
- the build;
- a headless browser pass in staff, customer and Admin and in both side-menu layouts;
- a clutter-audit rerun compared with the "before" numbers;
- screenshots before and after.

| Batch | Scope | Files | Expected effect |
|---|---|---|---|
| **1. Page chrome** (P1–P3) | Drop the "You are here" box. The Back button becomes a text link on the caption line. The two load pop-ups merge into one, once per session. The stage card row is hidden in the Expanded layout (only if you agree, see Q1). | `src/shell.js`, `src/notifyclient.js`, `masterds.css` | Every project page loses 1 to 3 repeated blocks |
| **2. Review screens** (P4–P6) | Review tables on Checks & validations, Traceability gaps, Governance sign-offs, Handover checklist, and UAT (staff `delivery`, customer `uatrun`). Count strips instead of tiles on these pages and on Governance RAID, Decisions and Actions. Change Requests is checked and, if card-based, gets the same table. | `requirements.js`, `traceability.js`, `governance.js`, `lifecycle.js`, `delivery.js`, `uat.js` | The main table becomes the focus; one solid button per page |
| **3. Dashboard and Project cycle** (P5, P10) | The Claude set-up banner becomes one line with one link. Figure tiles become a count strip on the Project cycle sub-tabs. Extra solid buttons are demoted. | `dashboards.js`, `stagedash.js`, `lifecycle.js` | Calmer first screen |
| **4. Stacked tab rows** (P8) | Forms & templates (3 rows), Tasks, Status report, Notes & Links, and the customer Dashboard and UAT: one tab row, with the filters as a toolbar. | `modules`/`forms` views, `tasks*.js`, `statusrep`, `resources`, customer views | 28 screens become a single tab row |
| **5. Status pills and Admin** (P7, P12) | Admin Users, Roles, Forms and State flow lists show status as text, with colour only for attention states. Nested boxes on the Admin dashboard Reports and Delivery tabs are flattened. | `admin.js`, `roles`, `flow` lists, `masterds.css` | About 300 pills fewer |
| **6. Sweep and report** | Rerun the clutter audit on every screen; check keyboard and focus on the new tables and the toolbar; check contrast; screenshots at 1440 and 1100. Write the final report (brief section 14) as `docs/reports/UI-UX-OVERHAUL-REPORT-2026-11-24.md`; open the PR. | – | – |

BRD Draft and Solution document (the document editors) only get the button and help-text rules in batch 3. A full rework of them is a separate piece of work.

## Claude integration

No feature, record type or connector tool changes, so the connector, hand-off prompts and skills text stay as they are. `node tests/claude_launch.mjs`, `node tests/connector_skills.mjs` and `tests/ui/claude-handoff-check.mjs` are run anyway, because the Open in Claude buttons sit in the toolbars being moved.

## Your call (asked before the batch that needs it)

- **Q1 (batch 1).** In the Expanded side menu, hide the stage card row above the page title? The menu already lists the same pages; Compact keeps the row.
- **Q2 (batch 1).** Merge the two pop-ups shown on every project load into one, shown once per browser session? Nothing is lost: the bell and the Updates panel keep every item.
- **Q3 (not planned).** Merge the duplicate menu entries: Support Desk and Facilio tools; customer "Build, UAT & Go-Live" and "UAT Testing". These are left alone unless you say so.

## Not in scope

- Sign-in, the intro, Discover more, the projects home banner and the Showcase pages (kept as designed).
- Mobile layouts below 1100 px (report only).
- Deploying.
