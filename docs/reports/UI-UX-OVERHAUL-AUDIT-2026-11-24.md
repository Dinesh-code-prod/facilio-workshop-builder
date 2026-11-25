# UI/UX overhaul: inventory and audit (24 Nov 2026)

Brief: the "Ultra UI/UX Overhaul" prompt (clutter elimination, review tables, one button system, navigation clean-up). Branch `feat/ux-overhaul`, stacked on `feat/master-design-system` (PR #25) with the latest `main` merged in. The plan is in `docs/plans/UI-UX-OVERHAUL-PLAN-2026-11-24.md`.

Decisions taken before the audit (user, 24 Nov 2026):
- Build on #25.
- Calm look: white compact page headers, white stat tiles, one grey icon family. The projects home banner keeps its gradient.

## 1. How it was audited

- **Crawl.** `tests/ui/clutter-audit.mjs` (new, read-only) works on the local build with a copy of the local data, at 1440 x 900, in all three views (staff, customer via Preview as customer, Admin).
  - It opens every side-menu entry, then every first-level page tab and segmented switch inside each page.
  - It never clicks anything whose label or action reads like save, send, delete, approve, create or generate.
  - On each screen it counts:
    - visible buttons, and solid (primary) buttons;
    - badges, pills and chips;
    - boxes inside boxes;
    - banners and callouts;
    - tab rows;
    - surfaces with a gradient;
    - help-text words;
    - tables and their rows.
  - The score in section 6 weighs these, so the noisiest screens surface first. It is a guide, not a grade.
- **Screenshots.** The review and approval screens were checked by eye in screenshots: Checks & validations, Traceability gaps, Governance sign-offs, Handover checklist, Build & test tracker (UAT), and Dashboard.
- **Code.** The renderers of those screens were read: `src/requirements.js`, `traceability.js`, `governance.js`, `lifecycle.js`, `delivery.js`, `uat.js`, and the shell chrome in `src/shell.js`.

### Coverage

| | Menu entries | Opened | Sub-tabs / mini-tabs opened | Not opened, and why |
|---|---|---|---|---|
| Staff | 53 in `NAV` | 45 | 72 | `uatguide` and `aiwork` are hidden by `EXPOSED` (not built). 7 customer-share pages (`custintro`, `prepare`, `learnlib`, `demokit`, `integguide`, `guide`, `portal`) are switched off for the demo project; `prepare`, `learnlib` and `guide` were covered in the customer view. |
| Customer | 19 in `CUSTOMER_NAV` | 16 | 14 | 3 entries are switched off for this project (portal tabs). |
| Admin | 9 sections | 9 | 6 | none |
| **Total** | **81** | **70 pages** | **92** | **162 screens measured** |

Limits of the coverage:
- Only the first level of tabs inside a page was clicked; mini-tabs inside a sub-tab were recorded only when visible.
- Drawers, modals and record detail views were not opened by the crawl.
- The local data has no Checks & validations findings, so that page was read in code and will be checked with test findings added to the scratch data copy.
- Mobile and tablet widths are not in this pass; #25's check covers 1100 to 1920 px.

## 2. Skills used

- **ui-ux-pro-max** (invoked).
  - Priority order: accessibility, interaction, layout, then type and colour.
  - UX searches on data tables, button hierarchy, colour-only status, progressive disclosure and tab hierarchy.
  - Rules taken from it:
    - do not show status by colour alone;
    - wide tables scroll inside a wrapper;
    - checkbox column plus action bar for bulk work;
    - sequential headings.
- **#25's design system** (`docs/design/master-design-system/`): the token and component base this work builds on.
- **Facilio skills** (`D:\facilio-impl-ai-skills`): checked. They cover implementation (scripts, imports, UAT guides, FTR). None covers UI design, so none was used for this pass.
- **Not used:**
  - No project-level skills exist (`.claude/skills` or `.agents/skills`).
  - The design plugin's critique and accessibility skills, and webapp-testing, are planned for the verification stage.

## 3. Totals across the 162 screens

| Measure | Count | Note |
|---|---|---|
| Visible buttons | 3,460 | about 21 a screen |
| Solid (primary-looking) buttons | 723 | 42 screens show more than one |
| Badges / pills / chips | 848 | Admin Users alone: 165 |
| Boxes inside boxes | 892 | Admin Reports 57, Discover more 52 |
| Gradient surfaces | 687 | mostly Discover more (62 a screen, kept as designed), Plan vs actual bars (23), Admin Delivery (12) |
| Screens with two or more tab rows | 28 | Forms & templates has three |
| Page errors | 0 | |

## 4. Cross-cutting clutter patterns (by impact)

P1 to P3 are on every project page, so fixing them once fixes about 120 screens.

| # | Pattern | Where | Proposal | Must stay |
|---|---|---|---|---|
| P1 | **Location shown four times.** The Expanded side menu marks the page. A "You are here" box at the top of the menu repeats it. The stage card row above the title lists the same pages again. The grey caption "Stage 2 · Process & checks" repeats it a fourth time. | every project page | Drop the "You are here" box. In the Expanded layout, hide the stage card row, since the side menu already lists those pages; Compact keeps it, because there it is the page navigation. Keep the caption. | All pages reachable; Compact layout unchanged |
| P2 | **"← Back to <last page>" button** at the top of every page, styled as a bordered button | every page after the first | Make it a quiet text link on the caption line. | Back trail (`navBack`) |
| P3 | **Two pop-ups on every load** ("12 required steps are past their due date", "You have 20 new notifications") cover the page header actions | every project load | Show one combined pop-up, once per session, below the header actions. | Bell count, Updates panel, the overdue rule |
| P4 | **Review findings drawn as cards**, each with a pill, a type label, "Why it matters", "Do this" and a button | Traceability gaps, Handover checklist, Governance sign-offs | Use structured review tables (section 5). | Every finding, its reason and its action |
| P5 | **Figure tiles as large boxes** (4 tiles, a coloured edge, uppercase labels) above every review page | Governance, Traceability, UAT, Handover, Dashboard | Use one compact count strip ("0 of 3 signed · 3 open RAID · 0 high · 1 meeting") that filters the table when clicked. | The numbers |
| P6 | **Several solid buttons on one screen** | 42 screens (Guides 11, Project cycle 8, Checks & validations has Confirm on every row) | One solid action per page header. Row actions are secondary or text. Bulk Confirm is the solid one only while rows are selected. | Every action |
| P7 | **Status pill on every row**, even when all rows share one state | Admin Users (165), Roles (56), Forms (50), State flow (30) | Show plain text, with colour only for attention states (overdue, blocked, failed). Use a dot plus a word, never colour alone. | The status value |
| P8 | **Two or three tab rows** stacked (tabs, then a segmented filter, then chips) | 28 screens: Forms & templates, Tasks, Status report, Notes & Links, customer Dashboard, customer UAT | One tab row, with the filters in one toolbar line (search, selects) beside the table. | Every filter |
| P9 | **Long page descriptions** cut with "More", plus explanatory callouts in the body | BRD Draft (458 words), Solution document (511), Team Guide (451), Checks & validations | One line under the title. The rest goes behind "More" or into the Team Guide. | The help text (moved, not deleted) |
| P10 | **Claude set-up banner** with 3 buttons on top of the Dashboard | Dashboard | Show one line with one link while Claude is not connected. | Set-up entry point |
| P11 | **Duplicate destinations** | Support Desk and Facilio tools (`webframe`) show the same five tabs. Customer "Build, UAT & Go-Live" and "UAT Testing" both open the delivery tab. | Report only. Merging menu entries changes navigation, so it needs your call. | – |
| P12 | **Nested boxes** (a card in a card in a panel) | Admin Reports, Governance, Handover, Dashboard sub-tabs | Flatten to one surface with hairline sections. | – |

**Kept as designed** (CLAUDE.md "keep as designed", and the #25 decision): sign-in scene, intro animation, Discover more, projects home banner, Showcase pages. They are listed in the inventory, but no changes are proposed.

## 5. Review, validation and approval screens

| Screen | Today | Proposed review table | Columns | Approval / rules kept |
|---|---|---|---|---|
| **Checks & validations** (`rschecks`, `src/requirements.js`) | Status chips as a tab row, 5-button command bar, one to four status notes, group tabs, an "All checks at a glance" table with pills, a bulk bar, then one card per kind with its own table. Each row has a pill plus Confirm (solid) and Dismiss. | One toolbar: search; Status select (To review / Confirmed / Dismissed / All, with counts); Group select. The command buttons go into a "Run a check" menu, with "Add a check" as the one solid header action. One table grouped by kind (group header rows, not separate cards). | ☐, Finding, What was said, Source, Status (word + dot), Owner/when, Action (Confirm / Dismiss as text buttons, Edit answer) | Auto-confirm of agreed items (`autoAgree`), bulk confirm/dismiss with its question, read-only mode, BRD link, Shift-select |
| **Traceability: Gaps to fix** (`trace`) | One card per gap: pill, title, type, "Why it matters", "Do this", Open | Table grouped by area. Why/Do this go in an expandable row. | Requirement, Gap, Severity, Do this, Action (Open) | All gaps, filter by direction |
| **Governance: Sign-offs** (`governance`) | 4 large tiles, a callout, then one card per sign-off with a pill and 2–3 buttons | Count strip, then a table with one row per sign-off. The rule callout becomes one line above the table. | Sign-off, Confirms (step), Document, Status, Signed by / date, Actions (Request, Email client, Record signature) | Evidence rule: generating a document is never a sign-off; record-signature flow unchanged |
| **Governance: RAID, Decisions, Actions** | tables already; tiles above | Count strip instead of tiles | unchanged | unchanged |
| **Handover: Checklist** (`handover`, `src/lifecycle.js`) | Progress ring, 3 figure boxes, then one card per group with a coloured icon, progress bar and items with pills | Count strip with progress. One table grouped by area. | Item, Area, Status, Evidence, Ticked by / date, Action (Add evidence / tick) | Closure blocked until every check and approval is recorded |
| **Build & test tracker: UAT** (`delivery`) and customer **UAT Testing** (`uatrun`) | Explainer callout, 4 tiles, plan table, two segmented tabs with descriptions, then test cases | Count strip. One tab row (Test cases / Issues) without the descriptions. Explainer behind "More". | unchanged tables | Pass/fail recording, issues |
| **Change Requests** (`changes`) | to be checked in batch 2 | – | – | approval flow unchanged |
| **BRD review / Solution document** (`brd`, `soldoc`) | 100+ buttons, 19 small tables, 450–510 help words | Out of the first batches: it is the document editor. Only the button hierarchy and help text are touched. | – | – |

## 6. Per-page inventory (from the crawl)

Each row shows the worst of the page and its opened sub-tabs.
- **Buttons / solid:** visible buttons, and how many of them are solid.
- **Boxes in boxes:** bordered or shadowed boxes inside another box.
- **Tab rows:** separate tab or switch rows on the screen.
- **Priority** follows from section 4. P1 to P3 apply to every project page and are not repeated per row.

### Staff (team) view

| Menu group | Page (id) | Tabs, sub-tabs opened | Buttons / solid | Badges | Boxes in boxes | Tab rows | Gradients | Help words | Score |
|---|---|---|---|---|---|---|---|---|---|
| Home | Dashboard (projdash) | Overview, Kick-off, Requirements, BRD and sign-off, Build and UAT, Go-live and hypercare, Handover, Reports (6 opened) | 59 / 2 | 1 | 1 | 1 | 0 | 151 | 72 |
| Home | Project cycle (lifecycle) | Overview, Stages, Roadmap, Plan vs actual, Report pack (4 opened) | 62 / 5 | 1 | 6 | 1 | 23 | 65 | 133 |
| 1. Project introduction | Contract intake (msaintake) | – | 7 / 1 | 0 | 4 | 0 | 0 | 72 | 15 |
| 1. Project introduction | Kick-off, plan and schedule (intro) | Kick-off and agreed scope, Project plan, Requirement schedule (2 opened) | 16 / 1 | 5 | 0 | 2 | 0 | 82 | 27 |
| 2. Requirement sessions | Data onboarding (onboarding) | Data Onboarding, Excel Data Onboarding (1 opened) | 17 / 1 | 3 | 0 | 1 | 0 | 75 | 24 |
| 2. Requirement sessions | Workshop room (live call) (workshop) | – | 31 / 2 | 1 | 0 | 0 | 0 | 139 | 39 |
| 2. Requirement sessions | Transcripts (rstrans) | – | 5 / 1 | 0 | 2 | 0 | 0 | 38 | 10 |
| 2. Process & checks | Process whiteboard (whiteboard) | – | 10 / 1 | 0 | 1 | 0 | 0 | 53 | 14 |
| 2. Process & checks | Checks & validations (rschecks) | – | 8 / 1 | 0 | 0 | 0 | 0 | 124 | 13 |
| 2. Module design | State flow builder (flow) | Stateflows, States, All modules (2 opened) | 16 / 1 | 23 | 1 | 1 | 0 | 38 | 43 |
| 2. Module design | Forms & templates (modules) | System485, Custom2, Settings and connected apps11 ‖ In use, In scope, All ‖ Any priority, High, Medium, Low (7 opened) | 10 / 0 | 50 | 1 | 3 | 0 | 63 | 67 |
| 2. Module design | Roles & access (roles) | Who can do what, Roles36, Permission checks (2 opened) | 5 / 1 | 56 | 0 | 2 | 0 | 58 | 66 |
| 2. Module design | Notifications (notifications) | – | 3 / 2 | 0 | 0 | 0 | 0 | 27 | 8 |
| 3. Solution design & BRD | Solution (solmap) | – | 10 / 1 | 0 | 0 | 0 | 0 | 49 | 13 |
| 3. Solution design & BRD | Mockup (Meteor) (mockup) | – | 10 / 2 | 0 | 1 | 0 | 0 | 109 | 18 |
| 3. Solution design & BRD | KPIs & SLA (slakpi) | SLA matrix 0, KPI matrix 0 (1 opened) | 11 / 2 | 0 | 4 | 1 | 0 | 111 | 22 |
| 3. BRD & sign-off | BRD Draft (brd) | Main BRDCore CAFM · Draft, + New BRD, Import a BRD, BRD settings (1 opened) | 104 / 6 | 0 | 7 | 1 | 0 | 458 | 134 |
| 3. BRD & sign-off | Governance & RAID (governance) | PMO overview, Sign-offs, RAID log, Decisions, Actions, Meeting minutes, Module owners, Weekly digest (6 opened) | 20 / 1 | 11 | 4 | 1 | 0 | 77 | 39 |
| 3. BRD & sign-off | Change Requests (changes) | – | 12 / 1 | 2 | 0 | 0 | 0 | 60 | 18 |
| 4. UAT & FTR | FTR Report (ftr) | Report (HTML), Excel (1 opened) | 8 / 2 | 0 | 0 | 1 | 0 | 151 | 16 |
| 4. UAT & FTR | Build & test tracker (delivery) | Build & Test, UAT (1 opened) | 21 / 1 | 2 | 12 | 2 | 0 | 140 | 46 |
| 4. UAT & FTR | KPI Workbooks (kpi) | – | 7 / 2 | 0 | 1 | 0 | 0 | 55 | 13 |
| 5. Training guides | Guides & Videos (guides) | – | 15 / 11 | 10 | 0 | 0 | 0 | 71 | 49 |
| Tasks & mail | Tasks (tasks) | Tasks 10, My private tasks ‖ All Tasks10, BRD & Requirements2, Customer Questions1, Responses Pending2, Change Requests0, Implementation1, UAT & Defec (1 opened) | 36 / 1 | 0 | 0 | 2 | 0 | 63 | 42 |
| Tasks & mail | Customer mail (mailtab) | All 0, Unread 0, Tasks made (2 opened) | 9 / 0 | 0 | 0 | 1 | 0 | 32 | 10 |
| Tasks & mail | Support Desk (supportdesk) | Support Desk, Meteor, Comet, facilio.com ↗, Facilio Run directory ↗ (3 opened) | 5 / 1 | 0 | 0 | 1 | 0 | 24 | 8 |
| Tasks & mail | Transfers (transfers) | This project, Holding (1 opened) | 2 / 0 | 0 | 0 | 1 | 0 | 44 | 3 |
| Tasks & mail | Go-live & hypercare (golivehc) | Go-live, Hypercare (1 opened) | 14 / 2 | 4 | 3 | 1 | 0 | 45 | 26 |
| 8. Project handover | Handover & Closure (handover) | Checklist 2/5, Acceptance and closure 0/2, Packs and reports (2 opened) | 8 / 0 | 0 | 2 | 1 | 0 | 32 | 11 |
| 8. Project handover | Solution document (soldoc) | Solution DocumentCore CAFM · Draft, + New solution document, Import a solution document, Solution document settings (1 opened) | 100 / 3 | 0 | 1 | 1 | 0 | 511 | 120 |
| Reports | Status report (WSR) & monthly report (statusrep) | Weekly report (WSR), Monthly report ‖ Make, From Claude, On record 2 (3 opened) | 5 / 2 | 2 | 2 | 2 | 0 | 49 | 16 |
| Reports | Traceability & quality (trace) | Coverage, Gaps to fix (8), Lessons learned (2 opened) | 16 / 1 | 8 | 8 | 1 | 0 | 339 | 45 |
| Notes & Links | Notes & Links (resources) | Notes 1, Links & resources 1 ‖ All, Team, Only me 0 (1 opened) | 15 / 1 | 0 | 0 | 2 | 0 | 54 | 20 |
| Show Facilio | Product Tour (seefacilio) | – | 44 / 1 | 0 | 0 | 0 | 0 | 101 | 52 |
| Show Facilio | Dashboard Gallery (dashboards) | – | 4 / 1 | 0 | 0 | 0 | 0 | 28 | 7 |
| Show Facilio | Discover more (explore) | Visitors and security, Tenant and employee engagement, Health, safety and risk, Workplace and space, Energy, meters and utilities, Finance and budgets (9 opened) | 110 / 57 | 11 | 52 | 1 | 62 | 855 | 432 |
| Help | Team Guide (teamhelp) | – | 98 / 3 | 0 | 0 | 0 | 0 | 451 | 115 |
| Help | What's new (whatsnew) | – | 4 / 0 | 2 | 0 | 0 | 0 | 28 | 7 |
| Help | Feedback (feedback) | – | 10 / 1 | 0 | 0 | 0 | 0 | 28 | 13 |
| Help | Privacy & data (privacy) | – | 3 / 1 | 0 | 0 | 0 | 0 | 115 | 8 |
| Claude & tools | Claude setup (claudesetup) | Start here, 1. Connect Claude, 2. Waiting jobs, 3. Facilio skills, 4. How it works, Answers waiting, Claude use (6 opened) | 5 / 1 | 0 | 0 | 1 | 0 | 412 | 17 |
| Claude & tools | Facilio tools (webframe) | Support Desk, Meteor, Comet, facilio.com ↗, Facilio Run directory ↗ (3 opened) | 5 / 1 | 0 | 0 | 1 | 0 | 24 | 8 |
| Settings | Project Settings (settings) | Project details, People & access, History (2 opened) | 6 / 3 | 0 | 4 | 1 | 0 | 95 | 18 |
| Settings | Templates (templates) | – | 3 / 1 | 0 | 1 | 0 | 0 | 40 | 7 |
| Settings | Tabs & Layouts (workspace) | Expanded, Compact (1 opened) | 38 / 1 | 0 | 5 | 1 | 0 | 165 | 49 |

### Customer view (Preview as customer)

| Menu group | Page (id) | Tabs, sub-tabs opened | Buttons / solid | Badges | Boxes in boxes | Tab rows | Gradients | Help words | Score |
|---|---|---|---|---|---|---|---|---|---|
| Your project | Dashboard (projdash) | Overview, Requirements, BRD and sign-off, Build and UAT, Go-live and hypercare, Reports ‖ Status report, Stage report (4 opened) | 9 / 0 | 1 | 15 | 1 | 0 | 147 | 29 |
| Your project | Welcome (cust_home) | – | 9 / 0 | 12 | 9 | 0 | 0 | 90 | 32 |
| Your project | Introduction deck (kickoff) | – | 1 / 0 | 0 | 1 | 0 | 0 | 33 | 3 |
| Your project | Contract (contract) | – | 1 / 0 | 0 | 0 | 0 | 0 | 24 | 2 |
| Your project | Scope (scope) | – | 1 / 0 | 0 | 0 | 0 | 0 | 18 | 1 |
| Your project | Plan Timeline (timeline) | – | 54 / 4 | 1 | 6 | 0 | 23 | 49 | 122 |
| Prepare for sessions | Workshop Schedule (schedule) | – | 1 / 0 | 0 | 0 | 0 | 0 | 9 | 1 |
| Prepare for sessions | Learn & Prepare (prepare) | Start here, Get ready, Words you will hear (2 opened) | 4 / 1 | 0 | 0 | 1 | 0 | 124 | 9 |
| Prepare for sessions | Data Onboarding (onboarding) | Data Onboarding, Excel Data Onboarding (1 opened) | 2 / 0 | 0 | 0 | 1 | 0 | 45 | 3 |
| Learn Facilio | Module guides (learnlib) | – | 11 / 0 | 0 | 0 | 0 | 9 | 33 | 30 |
| Learn Facilio | Customer User Guide (guide) | – | 1 / 0 | 0 | 0 | 0 | 0 | 13 | 1 |
| Learn Facilio | Dashboard Gallery (dashboards) | – | 2 / 0 | 0 | 0 | 0 | 0 | 25 | 3 |
| Review and sign off | Sign-offs & Decisions (governance) | PMO overview, Sign-offs, RAID log, Decisions, Actions, Meeting minutes, Module owners (6 opened) | 4 / 0 | 11 | 4 | 1 | 0 | 58 | 20 |
| Review and sign off | Change Requests (changes) | – | 2 / 1 | 2 | 0 | 0 | 0 | 16 | 6 |
| Review and sign off | Build, UAT & Go-Live (delivery) | Build & Test, UAT ‖ Test casesWrite the tests and record pas, IssuesProblems found while testing (1 opened) | 3 / 0 | 3 | 6 | 1 | 0 | 35 | 13 |
| Review and sign off | UAT Testing (uatrun) | – | 1 / 0 | 0 | 0 | 0 | 0 | 31 | 2 |

### Admin

| Menu group | Page (id) | Tabs, sub-tabs opened | Buttons / solid | Badges | Boxes in boxes | Tab rows | Gradients | Help words | Score |
|---|---|---|---|---|---|---|---|---|---|
| Admin | Dashboard (admin) | Overview, Stages, Delivery, Risk, People, Customers, Reports (6 opened) | 308 / 1 | 213 | 57 | 3 | 0 | 1781 | 629 |
| Admin | Assistant (admin) | – | 6 / 1 | 0 | 0 | 0 | 0 | 231 | 14 |
| Admin | Projects (admin) | – | 16 / 0 | 165 | 0 | 0 | 0 | 13 | 181 |
| Admin | Users (admin) | – | 7 / 0 | 5 | 0 | 0 | 0 | 6 | 12 |
| Admin | Access (admin) | – | 3 / 1 | 5 | 1 | 0 | 0 | 89 | 13 |
| Admin | AI provider (admin) | – | 5 / 1 | 2 | 1 | 0 | 0 | 325 | 21 |
| Admin | Integrations (admin) | – | 5 / 0 | 0 | 0 | 0 | 0 | 98 | 22 |
| Admin | Discover more (admin) | – | 3 / 1 | 0 | 1 | 0 | 0 | 59 | 7 |
| Admin | Activity (admin) | – | 1 / 0 | 0 | 0 | 0 | 0 | 8 | 1 |
