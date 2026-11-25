# UI/UX overhaul: final report (24 Nov 2026)

Branch `feat/ux-overhaul`, stacked on PR #25 (`feat/master-design-system`), with the latest `main` merged in. Audit: `UI-UX-OVERHAUL-AUDIT-2026-11-24.md`. Plan and your answers: `docs/plans/UI-UX-OVERHAUL-PLAN-2026-11-24.md`. Not deployed.

## 1. Routes and screens discovered

| Menu | Entries |
|---|---|
| Staff menu (`NAV`) | 53 |
| Customer menu (`CUSTOMER_NAV`) | 19 |
| Admin sections | 9 |
| **Total** | **81** |

Not reachable in the demo project:
- `uatguide` and `aiwork` are hidden as not built.
- 7 customer-share pages are switched off for the project.

## 2. Routes and screens reviewed

- **Pages.** 70 pages were opened by the crawler:
  - 45 staff;
  - 16 customer;
  - 9 Admin.
- **Screens measured.** 162 screens before the changes and 159 after (the Traceability figure tiles are gone, so there is less to click).
- **Looked at by eye.** Checks & validations, Traceability, Governance sign-offs, Handover, UAT (staff and customer), Dashboard, State flow, Admin Users.

## 3. Nested tabs and mini-tabs reviewed

- **Opened by the crawler:** 92 first-level tabs and switches (72 staff, 14 customer, 6 Admin).
- **Recorded but not clicked:** tabs inside those tabs (when visible).
- **Not opened:** drawers, modals and record pages.

## 4. Skills discovered and used

**Used:**
- **ui-ux-pro-max** (invoked; UX searches). Rules taken from it:
  - status is never shown by colour alone;
  - wide tables scroll inside their wrapper;
  - a checkbox column plus a bulk bar;
  - visible focus.
- **#25's design system:** its tokens are reused.

**Checked, not used:**
- The Facilio skills in `D:\facilio-impl-ai-skills`: none covers UI work.
- No project-level skills exist.

## 5. Major clutter patterns

These are P1 to P12 in the audit. The main ones:
- the location was shown four times;
- a Back button and two pop-ups on every load;
- findings shown as stacks of cards;
- large figure tiles;
- several solid buttons per page;
- stacked tab rows;
- a pill on every table row.

## 6. Review and approval workflows improved

- **Checks & validations** (one table grouped by kind).
  - **Kept:** bulk confirm/dismiss, the per-group select-all tick, auto-confirm, read-only mode and every Claude run (now in a "Run a check" menu).
  - **Changed:** status filter as a count line; source and kind as selects.
- **Traceability.**
  - The tabs carry the counts.
  - Gaps are a table: priority, what is missing, area, do this, "Why" behind a fold, Open.
- **Governance sign-offs.**
  - One row per sign-off, with every action: Request, Email client, Record signature, Sign, Raise a concern, Reopen and history.
  - The evidence rule stays above the table.
  - A count line replaces the figure cards on every Governance tab.
- **Handover checklist.**
  - One table grouped by area: tick, status, who and when, evidence.
  - Closure rules are unchanged.
- **UAT** (staff and customer).
  - A count line replaces the cards, and the plan figures are one line.
  - Test cases / Issues is a plain switch; its descriptions moved to the tooltips.

No approval rule, permission, audit entry or data write changed. Every action still calls the same handler.

## 7. Shared components and tokens changed

- `V.countStrip` and `V.rvSt` (`src/shell.js`).
- A "Review tables and the count strip" block at the end of `src/masterds.css`:
  - `.rv-table`, `.rv-toolbar`, `.rv-menu`, `.rv-st`;
  - calm table statuses: `.tag` green, verified, system, blue or low, and Admin `.hchip.h-healthy`, show as a dot and a word;
  - the quiet Back link;
  - the one-line Claude helper reminder;
  - visible keyboard focus.

## 8. Pages and modules updated

- **Shell, every project page.**
  - No "You are here" box.
  - No stage card row in the Expanded layout (Compact keeps it).
  - Back is a quiet text link.
  - One pop-up a session (`src/bell.js`).
- **Review pages:** the screens in section 6 (`requirements.js`, `traceability.js`, `governance.js`, `lifecycle.js`, `delivery.js`, `uat.js`).
- **Project cycle:** a stage card is solid blue only when it waits to be closed (`lifenav.js`).
- **Training guides:** row actions are secondary (`guideslist.js`).
- **Forms & templates:** the priority filter is a select (`module.js`).
- **Claude helper reminder:** one line (`helper.js`).
- **Bug fix (already on main):** the customer UAT tab showed the word "false" next to its switch (`delivery.js`).

## 9. Functional tests and results

All passed:

| Check | Result |
|---|---|
| `npm test` | passes |
| `node tests/claude_launch.mjs` | 6 passed |
| `node tests/connector_skills.mjs` | 25 passed |
| `tests/ui/claude-handoff-check.mjs` | 9 of 9 |
| `tests/ui/master-ds-check.mjs` at 1440 and 1100 px | no problems in 316 checks (staff, customer and Admin; Expanded and Compact) |
| `tests/ui/clutter-audit.mjs` | 0 page errors |

**Clicked in the browser on Checks & validations** (findings injected into the page only, nothing saved):
- ticking a row shows the bulk bar ("1 selected, Confirm 1, Dismiss 1, Clear");
- the kind select narrows the table;
- the "to review" count filters the table;
- the Run a check menu lists all four runs;
- no stray tick boxes.

Checked by measurement:
- the combined pop-up appears once ("12 required steps past due and 20 new updates");
- the Back link lines up with the page title.

**Per page, before → after** (from the crawl):

| Page | Before → after |
|---|---|
| Training guides | solid buttons 11 → 2 |
| Project cycle | solid buttons 8 → 1 |
| UAT | boxes in boxes 12 → 4 |
| Handover | boxes in boxes 2 → 0 |
| Traceability | solid buttons 1 → 0 |

The app-wide totals are not like-for-like. In the "after" run the existing Claude helper reminder showed on every page (+3 buttons and +1 line each); in the "before" run it did not show. The badge count also does not see the calm-status change, because that change is CSS only.

## 10. Known gaps and remaining work

**Not changed (kept on purpose):**
- The Tasks saved-view tabs: they are the board's own navigation.
- The Status report Make / From Claude / On record switch, and the Notes & Links filters.
- The BRD Draft and Solution document editors (100+ buttons each): a separate piece of work.
- The duplicate menu entries, as you chose.

**Not tested:**
- Any real save from the new tables (confirm, sign, tick, add evidence). The handlers are unchanged, but no click was saved.
- Widths below 1100 px.
- Screen readers.
- The live Claude app.
- Change Requests (it was not reworked).

**Seen, not fixed:**
- In the Admin top bar at 1440 px, the Updates button touches the avatar. This branch does not change the top bar.
