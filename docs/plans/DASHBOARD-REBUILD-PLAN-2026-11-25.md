# Dashboard rebuild: plan (25 Nov 2026)

Brief: `Facilio_Delivery_Studio_Master_Dashboard_Rebuild_Prompt.md` (the user). Branch `feat/dashboard-rebuild`, stacked on #28 (UI overhaul), which is stacked on #25 (master design system). The look follows `docs/04-ui-ux-design.md`: calm slate greys, Facilio blue as the only accent, colour inside the charts only.

## 1. What exists today (inventory, 25 Nov 2026)

| View | Where | Today |
|---|---|---|
| Staff project dashboard | `projdash`: `dashboards.js` calmHero, `stagedash.js` tabs, `dashkit.js` widgets | Hero with 3 tiles. A fold with readiness bars, a 12-step strip and about 16 Overview widgets. Seven stage tabs (Kick-off … Reports). Filters on Overview only. PDF = a print of the screen. |
| Project cycle | `overview` hub: Overview, Stages (`lifecycle`), Roadmap, Plan vs actual, Report pack (`dashreport.js`) | The Report pack is the strongest part: 8 tabs, real filters, drill to records, CSV, PNG, Excel and a real pdfmake PDF. |
| Customer dashboard | `projdash` with `CUST_STG` tabs, plus `cust_home` | Overview, Requirements, BRD and sign-off, Build and UAT, Go-live and hypercare, Reports. No drill-down for customers. |
| Admin dashboard | `admin.js` → `V.adminBento`. Tabs: Overview, Stages, Delivery, Risk, People, Customers, Reports | Server `/api/admin/command` (`_portfolio.mjs` health rules). Filter bar: search, stage, health, customer, type, go-live. Customize layout. |

Charts are hand-made SVG in five places (`sdcharts.js`, `dashkit.js`, `dashboards.js`, `admin.js`, `admviz.js`). Vendored libraries: pdfmake (real PDFs), ExcelJS, FullCalendar. Nothing new is needed.

### Problems found (from the code; to be confirmed in the browser while building)
1. **Admin Reports sub-tabs can't be opened.** `ACT.admTab` is defined twice (`dashboards.js:115` overrides `admin.js:224`), so Activity, Delivery, Customers, Usage and Quality are unreachable.
2. **The Admin date filter changes nothing on the dashboard.** It only filters `/api/admin/overview`; the bento reads `/api/admin/command`.
3. **Admin KPIs mix filtered and unfiltered numbers.** Blocked, Overdue and Waiting ignore the filter bar.
4. **Signals are matched by name instead of id.** "Top risks › Main reason" is always "—", and the report prints ids.
5. **Hard-coded values:**
   - "0 projects open to customers".
   - A dead stage filter in the stage report.
   - Fixed "next 14 days" text.
6. **"Overdue" has four definitions** (tasks and actions; actions only; due only; min(due, ETA)). "Open risks" has two.
7. **Two health rules.** `admviz.rag` differs from the server health. Stage numbering also differs between 0–6 and 1–8.
8. **Widgets repeated across tabs:** health, stage pipeline, task flow, activity.
9. **Dead parts:**
   - An "Export dashboard as PDF" button that never shows.
   - Bento sections drawn and then thrown away.
   - A lifecycle warning that never fires.
10. **Widgets with no drill-down:** unowned work, concentration, signals by area, severity bands, readiness bars, every customer widget.
11. **"Today" is the UTC date** (`V.today`) while dates show in local time, so overdue and countdowns can be off by one around midnight.
12. **Customers may see each workshop twice in "Next N days",** and one link goes to a team page (to confirm).

## 2. Goal per audience

| View | The question it answers | Default scope |
|---|---|---|
| **Staff** | "What do I need to do, and is my project on track?" | My work across my projects, plus the open project |
| **Admin** | "Which projects need management attention, and why?" | All projects (portfolio), with a project filter |
| **Customer** | "Where is my project, and what is waiting on us?" | Their project only; nothing internal |

## 3. Information architecture (tabs)

**Staff, inside a project (`projdash`):**
- **Overview:**
  - A status line.
  - A slim metric strip: Plan done, Overdue, Waiting on customer, Open risks, Test pass rate.
  - "Needs attention" (my items first).
  - "Next 14 days" (sessions, milestones, due tasks).
  - Plan vs actual.
  - Work by status.
- **Delivery:** plan timeline (gantt), milestones, SPI trend, stage map.
- **Work:** tasks by status and owner (stacked bar), workload table, overdue list, a blocked or dependencies register.
- **Quality:** requirements and BRD progress, UAT funnel (planned → run → passed), defects by severity, sign-off journey.
- **Customer:** pending customer inputs, approvals queue, onboarding progress.
- **Reports:** today's status and stage reports and the Report pack, reachable from here.

The seven stage tabs become these five purpose tabs. Each stage's widgets move to the tab that owns its question; nothing is dropped. A **"My work"** strip (my tasks due soon or overdue across all my projects) uses the existing server `my_tasks` logic, so it needs no new data.

**Admin (Admin > Dashboard):**
- **Portfolio:** health matrix (project × health, stage, go-live, owner), status mix, at-risk list with reasons.
- **Delivery:** portfolio timeline, go-lives next 60 days, milestone performance.
- **Risk & exceptions:** risk map, signals by area, exception report.
- **People:** workload heatmap (owner × project), unowned work.
- **Customers:** waiting on customer, approvals and document matrix.
- **Reports:** today's Reports sub-tabs, made reachable (fix #1).

Health and the stage pipeline appear once (Portfolio); the duplicates go.

**Customer (`projdash`, customer view):**
- **Overview:**
  - Progress against the plan.
  - Next milestones.
  - "Waiting on you" (with links).
  - Upcoming sessions and training.
- **Requirements & documents:** requirement and BRD status, shared documents.
- **Testing & sign-off:** UAT progress, customer-visible defects, sign-offs.
- **Reports:** printable status report.

## 4. Shared foundation (built once, used by all three)

- **Metric definitions:** `src/dashmetrics.js`, one module. Every number on every dashboard comes from it, and the server's `_portfolio.mjs` rules are reused where they exist. A metric reference (name, meaning, calculation, source, date field, statuses, who can see it, drill-down) is written to `docs/reference/DASHBOARD-METRICS.md`. First definitions:
  - **Overdue:** open task where min(due, ETA) < today, or open action where due < today. Same rule as the server.
  - **Open risks:** RAID item whose status is not Closed (one rule).
  - **Plan done %:** `planStats().actual` (duration-weighted).
  - **Waiting on customer:** the server's `custWaiting` rule.
  - **Test pass rate:** passed / test cases run. Today's "/ all" counts cases not yet run as failures.
- **"Today" in local time,** one helper used by every dashboard (fix #11).
- **One filter bar:**
  - Scope (my projects / one project / all, for Admin).
  - Date range (this week, last 7 days, this month, last month, this quarter, previous quarter, year to date, custom).
  - The dimensions relevant to that tab.
  - Active filters as chips with "Reset filters".
  - The range and scope written in the header.
  - Tab-only filters sit inside the widget.
  - Filters change the data the metric functions read, never just the visible rows.
  - Filter state is kept on drill-down and return.
- **One chart kit:**
  - Today's `sdcharts` and `dashkit` helpers stay, joined under one API.
  - Each widget gets a title, the range and unit, a hover tooltip, "Open records" (drill-down) and "Export" (CSV / XLSX).
  - Colours, validated with the dataviz checker:
    - **Categories:** blue `#1570EF`, teal `#0D9488`, violet `#7C3AED`, pink `#DB2777`, then "Other" in slate. All checks pass.
    - **Status:** green `#16A34A`, amber `#D97706`, red `#B91C1C`. Always with a word or icon.
  - No dual axes and no rainbows.
- **Drill-down:**
  - Every KPI, bar, segment, row and timeline item opens either the filtered page that holds the records (tasks with that filter, governance, UAT…) or the record drawer used by the Report pack (`drDrill`).
  - "Back to dashboard" returns with the same tab and filters.
  - Customers drill only into pages they can open.
- **Exports:**
  - **Per widget:** CSV and XLSX (ExcelJS).
  - **Whole dashboard:** "Export dashboard (PDF)" built with **pdfmake from the same data**, not a screenshot. It includes:
    - A cover line with project, scope, range and filters.
    - Every tab in tab order, with selectable text.
    - Charts embedded as SVG, and tables with all rows and repeated headers.
    - Page numbers and the generation date.
  - A choice of "this tab" or "all tabs", with progress shown while it builds.
  - The print-of-screen PDFs go.
- **States:** loading (skeletons), empty (what fills it), error (what to try), no access.

## 5. Order of work (each phase its own commit, checked before the next)

1. **Foundation and bug fixes.**
   - The metric module and reference.
   - Local "today".
   - The filter bar.
   - The chart-kit wrappers.
   - The pdfmake dashboard PDF.
   - Problems 1–12.
2. **Staff:** the five tabs and "My work".
3. **Admin:** the six tabs, duplicates removed, reports reachable.
4. **Customer:** the four tabs, permission review (server side too).
5. **Drill-down and exports** finished everywhere.
6. **Checks:**
   - A browser sweep of every tab in all three views at 1920 / 1366 / 1100: filters change the numbers, every drill-down opens the right records, no page errors.
   - Metric totals compared against the records.
   - The generated PDFs opened and inspected.
   - `npm test`.

## 6. Needs your OK or input
- **Staff "My work" across projects:** add one read-only route that returns my open tasks and actions across my projects. It reuses the `my_tasks` logic; no data change.
- **Dropping the seven staff stage tabs** in favour of five purpose tabs. Their widgets move, none are removed.
- **Admin "team capacity":** there are no hours or estimates in the data, so workload is counts only, and capacity is marked "not available".
- **Personalisation:** keep today's Admin "Customize layout" and reset; no new drag-and-drop.
