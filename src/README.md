# src: the app

The front end of Delivery Studio. It is plain JavaScript and CSS (no framework). `build.mjs` joins these files, in the order it lists, into one script and one stylesheet in `dist/`, which is what the website serves.

**How to read this folder:** every page is a file here, named after what it shows. A file ending in `logic` holds the rules without any screen, so it can be tested alone. Files with `html` in the name build documents (Word, Excel or web files) people download.

**Where is the code for the page I see?** Open the page, find its name in the menu, then look in the matching stage group below.

## The page frame, menu and shared helpers
The shell that draws the menu and top bar, loads the project, and the helpers every page uses.

| File | What it does |
|---|---|
| [a11y.js](a11y.js) | Keyboard access, the part the shell does not do: a "Skip to content" link and an id on the main area for it to jump to. |
| [projfx.js](projfx.js) | Project pages only: marks the page with its stage (for projfx.css) and plays one short entrance when a page or tab opens. |
| [coach.js](coach.js) | Guide me: a guided walk through the menu. A ring marks what to click next and a small card says what it is for; it starts once for each person. |
| [custompage.js](custompage.js) | Custom pages (Tabs & Layouts): a page the team builds itself from blocks (text, buttons, live numbers, checklist, table, Ask Claude). |
| [features.js](features.js) | Switches for parts of the app that are built but not shown. A switch set to false hides its pages everywhere; nothing is deleted. |
| [api.js](api.js) | API client: JSON calls with CSRF header, chunked private file upload/download, reference configuration fetch. |
| [bell.js](bell.js) | Notification bell: a popover (not a drawer) with Needs you / Assistant / Activity. |
| [bigview.js](bigview.js) | "Bigger view" for every generated HTML page shown in a frame (kick-off deck, project plan, mockups, onboarding page, UAT pages...): each iframe that carries its page in srcdoc gets an Expand... |
| [command.js](command.js) | Admin Command Center (Admin › Dashboard › Command center): the portfolio from an administrator's point of view. |
| [core.js](core.js) | Core: state, immutable baseline, workshop overlay, selectors, persistence, helpers. |
| [custpreview.js](custpreview.js) | Preview as the customer (staff only). |
| [demokit-data.js](demokit-data.js) | Catalogue of the CMMS Demo Kit screens (real Facilio product screens on sample data) and the story ideas ("journeys") listed beside it. |
| [demokitview.js](demokitview.js) | Facilio screens (team): the Facilio demo library kept inside Delivery Studio, for requirement sessions: how the sign-in, a work order, an asset, planned maintenance, quotes and invoices,... |
| [diagrams.js](diagrams.js) | SVG diagrams in the Facilio State Flow Builder style (facilio-setup StateFlowsBuilder/elements): states 135×30 r3, text/border #3995e2, default state #60a9a6, transitions as straight lines #3995e2... |
| [discoverlogin.js](discoverlogin.js) | "Discover more with Facilio" on the sign-in pages: a full-screen scroll story in Facilio's art style (same kit as the Discover more tab, src/explore.js). |
| [dxart.js](dxart.js) | Isometric illustrations for the Discover more tiles: every module gets its own picture, drawn in code (no image files). |
| [ecosystem.js](ecosystem.js) | SaaS ecosystem + AI assistance around the isometric platform ("book"). |
| [explore-data.js](explore-data.js) | Discover more with Facilio: the solution areas shown to a customer, and which modules of the organisation package belong to each. |
| [explore.js](explore.js) | Discover more with Facilio: a brand page, seen by the customer and the team, showing the Facilio modules in the organisation package that are not part of this project's contract, grouped into... |
| [extras.js](extras.js) | Delivery extras: workshop completion %, session import from CSV or Excel, schedule published as a link, internal module notes, process swimlane written as text, kick-off team/governance/agreements,... |
| [feedback.js](feedback.js) | Feedback tab (Help menu, team only; server: work/server/_feedback.mjs). |
| [ficons.js](ficons.js) | Facilio icon set (https://icons.facilio.run/): web-tab symbols used for the menu. |
| [gsearch.js](gsearch.js) | Project search: a button in the top bar (separate from the menu search) that searches what the project has saved: requirements, decisions, actions, risks, change requests, UAT and build records,... |
| [guards.js](guards.js) | Confirmation guards for destructive actions that previously ran on a single click. |
| [hoverlight.js](hoverlight.js) | Hover light: tells the CSS where the pointer is inside a box (KPI tile, project card, clickable card) so a soft light can follow it. |
| [howto.js](howto.js) | "How to use this section" guides for Transcripts & Requirement Confirmation and Checks & Validations, and the short hints shown on each tab. |
| [items.js](items.js) | Shared records (project_items): actions, decisions, RAID, sign-offs, change requests, onboarding status, minutes, use cases, … One row per record, so the implementation team and the customer can... |
| [journey.js](journey.js) | Isometric delivery journey: a layered platform assembles, twelve lifecycle modules appear around it, thin connectors draw between them and each milestone is interactive. |
| [liquid.js](liquid.js) | Liquid reveal, shared by the tree intro (Facilio team, "Get started") and the road-to-go-live journey (customers, "See how Delivery Studio helps"). |
| [navmarks.js](navmarks.js) | A blinking dot on the sidebar tab where something changed: Claude finished or asked something for that tab (jobs), or a notification for it is still unread. |
| [notifications.js](notifications.js) | Notifications (team only; Solution Design & Configuration › Configuration & Access): who is told what, and when, for a module. |
| [notifyclient.js](notifyclient.js) | Notifications in the browser (server side: work/server/_notify.mjs; plan: docs/plans/NOTIFY-MAIL-STAGES-PLAN-2026-11-07.md, section 2). |
| [pageguide.js](pageguide.js) | Plain-language help on the pages that confused people: a short "what is this page for" strip (V.pageGuide), an explained AI panel that replaces rows of blue / Ask Claude buttons (V.aiPanel), and... |
| [parser.js](parser.js) | Facilio Delivery Studio — Org package parser Turns a Facilio standalone package (ZIP of components/*.xml) into the immutable baseline model. |
| [portal.js](portal.js) | Customer Portal controls: which tabs a customer sees, which sensitive blocks are released, what they may change, which modules are hidden. |
| [privacy.js](privacy.js) | Privacy and data (Help): what the app stores, who sees it, how long it is kept, the terms of use, and two requests a person can make: download my data, delete my data. |
| [pwtoggle.js](pwtoggle.js) | Show/hide button on every password field (sign-in, sign-up, admin, drawers). |
| [rangefilter.js](rangefilter.js) | Timeline filter and PDF export shared by the admin dashboard and the project pages. |
| [seefacilio.js](seefacilio.js) | Product Tour: what Facilio really looks like, shown as real product screens on sample data, grouped the way a customer thinks (raise and track work, know your assets, quotes and invoices, field... |
| [session.js](session.js) | Session expiry and keeping what a person typed. |
| [settings.js](settings.js) | Project Settings & Exports: project details, people, project members (app access), customer access, configuration source, JSON exports A–E (versioned schemas), and the audit trail. |
| [shell.js](shell.js) | Shell: authentication, project list & creation, workspace navigation, shared UI utilities, event delegation. |
| [showcase.js](showcase.js) | Explore Facilio (Customer Showcase): Facilio modules and updates the implementation team chooses to show a customer, and the customer's "I'm interested" requests. |
| [teamguide.js](teamguide.js) | Team guide: a roadmap-style walkthrough of what a teammate can do at each delivery stage, with a button that opens the right page. |
| [teamhelp.js](teamhelp.js) | Team Guide: a page (not a drawer) that walks a Facilio teammate through a project in the same order as the menu, from kick-off to hypercare and closure. |
| [templates.js](templates.js) | Templates (organisation-wide and per project, versioned, publish / retire) and the configurable workspace (rename, reorder, hide, move menu items, add custom pages, layout presets). |
| [textgen.js](textgen.js) | Business-language text generation shared by the UI previews and the BRD. |
| [tourplayer.js](tourplayer.js) | Product Tour player: a guided, full-screen walk through the real Facilio screens, chapter by chapter, with a short explanation for each one. |
| [uistate.js](uistate.js) | UI states: one shared set of panels, toasts, banners and field errors, so empty, loading, error, offline, slow, no-result, no-access, session-expired, invalid-field and success states look and... |
| [viewers.js](viewers.js) | Document viewers: Kick-off Deck (original PPTX rendered with @aiden0z/pptx-renderer, or PDF with pdf.js — not restyled) and the Dashboard Gallery (PDF references by category). |
| [views.js](views.js) | Views (module tab, team only; Solution Design & Configuration › System Modules & Form Builder › a module › Views): the list views the customer will see for a module: which app shows them, which... |
| [webframe.js](webframe.js) | Facilio tools (roadmap E13): Support Desk, Meteor, Comet, facilio.com and the Facilio Run directory shown INSIDE Delivery Studio, one tab each. |
| [webframelogic.js](webframelogic.js) | Facilio tools shown inside Delivery Studio (pure code, also run by tests/webframe.mjs; roadmap E13). |
| [welcome.js](welcome.js) | "See how Delivery Studio helps": plays the road-to-go-live journey (src/animation/roadintro.js, V.roadIntro) over the sign-in page. |
| [whatsnew.js](whatsnew.js) | What's new: every version of Delivery Studio, newest first, so a team member or customer can see what changed and when. |
| [xlseditor.js](xlseditor.js) | Spreadsheet editor — edits an ExcelJS workbook in place, so everything the editor does not touch (conditional formatting, data validation, images, print setup, defined names) is written back... |

## Project overview, dashboards and reports
Where a project stands: the dashboard, the roadmap, status reports and the admin overview.

| File | What it does |
|---|---|
| [admdiscover.js](admdiscover.js) | Admin > Discover more: one library of product highlights for all projects. |
| [adminassist.js](adminassist.js) | Admin > Assistant: a chat over the whole portfolio (not one project), what needs attention now, and Otto reminders to project owners. |
| [admin.js](admin.js) | Admin console: dashboard (portfolio KPIs and insights), projects, users, access (who may use the console) and activity. |
| [admlayout.js](admlayout.js) | Admin dashboard layout: choose which widgets show, move them and change their width, per dashboard tab. |
| [admviz.js](admviz.js) | Admin dashboard visuals: sparklines, RAG boards, donuts, pivots, delivery trackers and stacked bars. |
| [dashboards.js](dashboards.js) | Bento dashboards: one tile grid for each point of view, every number computed from saved project records (nothing invented). |
| [dashreport.js](dashreport.js) | Dashboard Report — the project analytics hub. |
| [lifecycle.js](lifecycle.js) | Delivery lifecycle + AI assistant: Deliverables & AI workspace, Hypercare, Handover & Closure. |
| [lifelogic.js](lifelogic.js) | Lifecycle tracker rules (pure code, also run by tests/life.mjs). |
| [lifenav.js](lifenav.js) | Delivery Lifecycle tracker: nine delivery stages from kickoff to closure (rules in src/lifelogic.js), used by the navigation strip and the Delivery Lifecycle page. |
| [overview.js](overview.js) | Project Overview (consultant dashboard), sidebar counters, and the customer Welcome page. |
| [overviewhub.js](overviewhub.js) | Project Overview hub (team only): the five pages that all answered "where are we?" now sit under one menu item as tabs: Overview, Delivery lifecycle, Roadmap, Plan vs actual and Reports. |
| [pmo.js](pmo.js) | PMO overview: the first tab of Governance & RAID. |
| [projectguide.js](projectguide.js) | Project Settings > Keeping the project: how to keep a project so that the BRD, UAT, guides, reports and the Claude connector give good answers. |
| [projroadmap.js](projroadmap.js) | Project roadmap: the twelve delivery stages with status taken ONLY from recorded project data (never from animation). |
| [roadmap.js](roadmap.js) | Product roadmap introduction: a short animated story shown right after sign-in (before the home page). |
| [sdcharts.js](sdcharts.js) | Small chart primitives for the stage dashboards (V.sdc): donut, gauge, sparkline, stacked bar, heat map, funnel, RAG chip and checklist. |
| [sdreports.js](sdreports.js) | Reports tab of the dashboards (V.sdReports): a status report, a stage report, and for admin a portfolio report. |
| [slakpi.js](slakpi.js) | KPIs & SLA matrix (stage 3, Solution design & BRD): where the team records what has to be tracked and how Facilio delivers it. |
| [stagedash.js](stagedash.js) | Stage dashboards: the Dashboard page gets one mini dashboard per stage of the project, as tabs inside it, a health lifecycle strip, and a Reports tab. |
| [wsr.js](wsr.js) | Status reports (Project menu): the weekly status report (WSR) and the monthly report on one page, as two tabs. |
| [wsrlogic.js](wsrlogic.js) | Status reports (weekly WSR and monthly): the pure rules (tests/wsr.mjs). |

## Stage 1: contract and kick-off
Reading the signed contract, the kick-off deck, the plan and the organisation package.

| File | What it does |
|---|---|
| [cfggap.js](cfggap.js) | Configuration gap table (roadmap E2 item 5, "Implementation and Organisation Export"). |
| [cfginputs.js](cfginputs.js) | Customer-specific configuration inputs (roadmap phase 5b): descriptions of custom modules, relationships between modules, and connected apps with their tabs. |
| [contract.js](contract.js) | Know Your Contract (Facilio enters it, the customer reads it) and Scope. |
| [contractmods.js](contractmods.js) | Which Facilio modules the contract documents are about (used by the Solution tab, src/solution.js; tests/contractmods.mjs). |
| [contracts.js](contracts.js) | Contracts & Integrations: every contract is a source of truth (original MSA, later integration MSAs, approved CRs, other). |
| [kickoff.js](kickoff.js) | Kick-off (roadmap E15 Stage 1, E17): the team's one big tab for the start of a project. |
| [introhub.js](introhub.js) | Project introduction hub: one menu entry with three sub-tabs (Kick-off and agreed scope, Project plan, Requirement schedule), each showing an existing page. |
| [kickoffhtml.js](kickoffhtml.js) | Kick-off deck as one self-contained HTML file (pure code, also run by tests/kickoff_deck.mjs). |
| [kickofflogic.js](kickofflogic.js) | Kick-off page rules (roadmap E15 Stage 1, E17): pure code, no page, no network; run by tests/kickoff_logic.mjs and used by src/kickoff.js. |
| [msadocs.js](msadocs.js) | Contract intake > Contract documents (plan: docs/plans/MSA-DOCUMENTS-PLAN-2026-11-08.md). |
| [msafind.js](msafind.js) | MSA Scope Check (Workshops & Requirements, team only): what the customer asked for and confirmed, held against what was read from the signed MSA. |
| [msaflow.js](msaflow.js) | Contract & Workshop Planning: one guided workflow over Know Your Contract, Scope and the Requirement Session Planner. |
| [msalogic.js](msalogic.js) | MSA scope check: the rules (pure code, also run by tests/msa.mjs). |
| [msaquestions.js](msaquestions.js) | Questions from the contract: every project has a different MSA, so the standard module guides get an extra section, "From your contract", and Learn & Prepare gets a card. |
| [onbhtml.js](onbhtml.js) | Data onboarding as one self-contained HTML file for the customer (pure code, also run by tests/onboarding_html.mjs). |
| [onboarding.js](onboarding.js) | Data Onboarding: Facilio's standard data templates for the modules in scope (master data only, never transactions), an Excel workbook with dropdowns for lists and lookups, a checker that validates... |
| [onbreturn.js](onbreturn.js) | Check a package returned from the customer's onboarding HTML (pure code, also run by tests/onboarding_html.mjs). |
| [orglink.js](orglink.js) | Project details > Org package folder: link the project to its folder in facilio-config-data by reading the repository's small repo_index.json (about 4 KB, picked by the person; the page never reads... |
| [orglogic.js](orglogic.js) | Link a project to its org package folder in facilio-config-data (pure code, also run by tests/org_transition.mjs). |
| [orgpkg.js](orgpkg.js) | Facilio organisation package export (pure code: no DOM, no network; runs in the browser and in Node tests). |
| [orgpkgview.js](orgpkgview.js) | Org Package Export page (3. |
| [pkganalysis.js](pkganalysis.js) | Organisation package analysis: reads the configuration already loaded into the project (the bundled reference or an imported package) and shows what is configured, how modules relate, which apps... |
| [pkgvalidate.js](pkgvalidate.js) | Static validation of a Facilio organisation package (roadmap E2 item 5): PackageConf.xml plus components/<TYPE>.xml, given as {path: text}. |
| [plan.js](plan.js) | Project Plan — imports the customer's project plan workbook (.xlsx/.xlsm) and renders it as close to Excel as the browser allows: every sheet, column widths, row heights, merged cells, fonts, fills... |
| [plancal.js](plancal.js) | Project calendar (Project Plan > Calendar): the plan, workshop sessions, UAT and go-live dates, actions and sign-offs that fall due, drawn on a Day / Week / Month / Year calendar. |
| [planhtml.js](planhtml.js) | Project plan as one self-contained HTML file (roadmap E15 Stage 1): timeline, Gantt chart, milestones with where each date comes from, and the assumptions, gaps and conflicts. |
| [planner.js](planner.js) | Requirement Session Planner: MSA scope extraction (compared with Facilio modules), sessions, module distribution with coverage guard, Excel export filled into the workshop-plan template (ExcelJS)... |
| [prepare.js](prepare.js) | Learn & Prepare: the first thing a customer reads before the requirement sessions. |
| [schedaud.js](schedaud.js) | Workshop schedule by BRD and audience. |
| [schedulediff.js](schedulediff.js) | Regenerate the workshop schedule and compare it with the approved one (Requirement Session Planner › Schedule changes). |
| [timeline.js](timeline.js) | Plan Timeline: a structured project plan (rows with dates, owner, status, % done) that can be imported from the uploaded Excel plan, generated from the project dates, or edited by hand; Gantt... |
| [tldeps.js](tldeps.js) | Plan timeline: dependency lines, like Asana's Timeline. |
| [tldepslogic.js](tldepslogic.js) | Task dependencies for the project plan timeline (pure code, also run by tests/tl_deps.mjs). |

## Stage 2: requirement sessions
Workshops, transcripts, questions, requirements, use cases and the process whiteboard.

| File | What it does |
|---|---|
| [checks.js](checks.js) | Checks & Validations: one validation list (blocking / warning / info) built from every part of the project, module statuses with confirmation records, scope coverage (MSA ↔ module scope ↔ sessions... |
| [emlimport.js](emlimport.js) | Add an email without any mailbox access: pick one or more .eml files (Outlook on the web and the new Outlook save a message this way: open it, then More actions > Download, or drag it to the... |
| [flowbuilder.js](flowbuilder.js) | State Flow Builder — modelled on facilio-setup StateFlowList.vue, StateFlowBuilder.vue (toolbar / canvas / sidebar), NewStateTransition.vue (Before \| During \| After), NewState.vue. |
| [flowimport.js](flowimport.js) | Import state flow XML (one or more STATE_FLOW / STATE_TRANSITION / TICKET_STATUS files, or a package ZIP) for a module. |
| [inbox.js](inbox.js) | Project Inbox: the client emails filed in this project by the delivery mailbox sync (server: /api/projects/:id/mail). |
| [mom.js](mom.js) | Minutes of meeting (MOM) from a call transcript. |
| [qbank.js](qbank.js) | Requirement sessions > Questions (plan: docs/plans/REQUIREMENTS-INTELLIGENCE-PLAN-2026-11-08.md). |
| [requirements.js](requirements.js) | Stage 2, Requirement sessions (roadmap E15): three tabs under one main tab. |
| [resources.js](resources.js) | Notes & Links: project notes (kind "pnote") and links to meetings, recordings, boards and trackers (kind "res"), both records on the item store, so permissions, audit and versions come from the... |
| [sessionhtml.js](sessionhtml.js) | Requirement session plan as one self-contained HTML file, in the structure of Facilio's workshop plan sheet: planned sessions (items, agenda per module, required stakeholders, date, time, duration,... |
| [sessionquestionsview.js](sessionquestionsview.js) | Requirements > Prepare questions (team only): the questions to ask in a workshop, worked out by the rules in work/server/_sessionquestions.mjs from the project's scope, requirements, open... |
| [sourcecheck.js](sourcecheck.js) | Source checks (Checks & Validations › Source checks): is every confirmed statement traceable to where it came from, and do the links between requirements, use cases, questions, sessions and the MSA... |
| [transcriptimport.js](transcriptimport.js) | Import an approved transcript transfer into Transcripts (roadmap E2 workspace 3). |
| [transcriptparse.js](transcriptparse.js) | Transcript parser (roadmap E2 workspace 3): pure code for the browser and for Node (no DOM, no network, no model). |
| [transcripts.js](transcripts.js) | Transcripts & Requirement Confirmation: upload meeting transcripts per session, rule-based analysis against the configuration, review queue (accept / reject / edit / merge / clarify) with history,... |
| [usecases.js](usecases.js) | Use Cases, Discrepancy register and the Session → BRD view. |
| [whiteboard.js](whiteboard.js) | Process Whiteboard: a pannable, zoomable board per project for composing individual processes into one end-to-end process. |
| [workshop.js](workshop.js) | Workshop room (roadmap E2 workspace 3, team only): the page the consultant keeps open during a requirements workshop. |
| [workshoplive.js](workshoplive.js) | Workshop room > Live assistant (plan: docs/plans/REQUIREMENTS-INTELLIGENCE-PLAN-2026-11-08.md, phases 3 and 4). |
| [workshoplogic.js](workshoplogic.js) | Workshop room logic (roadmap E2 workspace 3): pure code for the browser and for Node, run by tests/workshop_logic.mjs. |
| [workshopprep.js](workshopprep.js) | Workshop preparation (pure code, no DOM, no network; also run by tests/workshop_prep.mjs). |
| [workshubs.js](workshubs.js) | Page hubs (team only). |

## Stage 3: mockup, solution and BRD
The agreed solution of each module, the BRD with sign-off, mockups and traceability.

| File | What it does |
|---|---|
| [brd.js](brd.js) | BRD engine. The document is built once as a list of blocks (headings, paragraphs, bullets, tables, figures) from the shared data model; the same blocks render to the editable page view, to Word... |
| [brddraft.js](brddraft.js) | The BRD drafts itself from what the team confirmed. |
| [brdimport.js](brdimport.js) | BRD import: bring a team's own BRD (Word, PDF, text or Markdown, or a blank one) into the BRD Draft page as a new BRD with its own structure. |
| [brdreview.js](brdreview.js) | Stage 3, BRD review checklist (roadmap E20): before a BRD can be approved, a person checks each part and ticks it off with their name. |
| [brdview.js](brdview.js) | BRD Draft — Word-like editor. |
| [brdsources.js](brdsources.js) | Above the BRD draft: what the BRD is built from (sessions, solution, configuration, processes, use cases, governance), how much reaches it and what is held back, with the page to fix it. |
| [design.js](design.js) | Stage 3, Solution design and BRD: what Claude proposes for the design, shown on the Process whiteboard (Requirement sessions) and on the State flow builder (roadmap E20). |
| [mockup.js](mockup.js) | Stage 3, Mockup tab (roadmap E20): the prototype brief for Meteor, built ONLY from what the team has already applied or confirmed. |
| [mockuphtml.js](mockuphtml.js) | Client mockup: ONE self-contained HTML file built from the confirmed design (no Meteor, no sign-in, nothing outside the file), arranged the way a Facilio organisation looks: a left menu (Portfolio,... |
| [module.js](module.js) | System Modules & Form Builder — modelled on facilio-setup: ModuleList.vue (System/Custom tabs), ModuleSummaryHomepage.vue (Templates/Fields/... |
| [roles.js](roles.js) | Roles & Access Permissions — modelled on facilio-setup Roles/RolesList.vue, RoleDetailsForm.vue and NewWebTabPermission.vue (per-tab blocks of switches; Read/Update/Delete groups with All/Team/Own). |
| [sollogic.js](sollogic.js) | Solution tab rules (plan: docs/plans/SOLUTION-TAB-PLAN-2026-11-07.md). |
| [solution.js](solution.js) | Stage 3, Solution (plan: docs/plans/SOLUTION-TAB-PLAN-2026-11-07.md). |
| [traceability.js](traceability.js) | Traceability, quality checks and lessons learned (roadmap phase 7). |

## Stage 4: UAT, FTR and go-live
Test plans and cases, the FTR workbook, delivery and go-live readiness.

| File | What it does |
|---|---|
| [delivery.js](delivery.js) | Delivery: Build & Test progress per module, UAT sessions and readiness, go-live readiness checklist with a rule-based read. |
| [ftr.js](ftr.js) | FTR Report and KPI Workbooks — Excel workbooks edited in the existing spreadsheet editor (V.XlsEditor, an ExcelJS editor that writes back everything it does not touch: conditional formatting, data... |
| [ftrhtml.js](ftrhtml.js) | FTR checklist (Final Testing Review) as one self-contained HTML file a consultant works through (pure code, also run by tests/ftr_html.mjs). |
| [ftrresult.js](ftrresult.js) | The results file a consultant downloads from the FTR checklist page (src/ftrhtml.js), checked and summed (pure code, also run by tests/ftr_html.mjs). |
| [golive.js](golive.js) | Go-live readiness (stage 4, fifth tab): one read-only page that says what stands between the project and go-live, read from what the Studio already holds (confirmed requirements and their test... |
| [golivehub.js](golivehub.js) | Go-live & hypercare: one menu entry with two sub-tabs, each showing an existing page (Go-live, Hypercare). |
| [uatftr.js](uatftr.js) | UAT = the FTR report plus the UAT guide, both written by the person's Claude: the FTR Report page and the UAT guide page. |
| [ftrreport.js](ftrreport.js) | FTR report as a page and as one HTML file: modules, their use cases, test cases and results, read from the draft Claude saves. Pure code (tests/ftrreport.mjs). |
| [uat.js](uat.js) | UAT test cases (Delivery > UAT, team only): the module-wise testing workspace. |
| [uatguide.js](uatguide.js) | UAT guide, module by module, as customer-shareable HTML (pure code, also run by tests/uat_guide.mjs). |
| [uatlogic.js](uatlogic.js) | UAT test cases: the rules that do not need a page (pure code, also run by tests/uat.mjs). |

## Stage 5: training guides
The customer user guide builder, video to guide and the learning library.

| File | What it does |
|---|---|
| [clientguides.js](clientguides.js) | Customer guides for the two kinds of project, in plain language, for the customer and the team: - "Facilio AI agents" (what an agent is, what Facilio's Atom AI agents do for you, how they work with... |
| [guide.js](guide.js) | Customer User Guide — a workbook-style guide with one tab per in-scope module and 12 content points per module, read-only stateflow diagrams (existing vs proposed), a per-module feedback form saved... |
| [guidebuilder.js](guidebuilder.js) | User Guide Builder: a customer-specific procedural guide made of sections with text and screenshots. |
| [guidedraft.js](guidedraft.js) | User Guide Builder — guided drafting, modelled on the BRD Draft workflow. |
| [guideintel.js](guideintel.js) | Guide intelligence: turns a parsed organisation configuration (FWBParser.parsePackage output) into 1. |
| [guidelearn.js](guidelearn.js) | Customer User Guide — module learning sections. |
| [guidelib.js](guidelib.js) | Module learning library for the Customer User Guide — standard Facilio Connected CMMS content per business module: illustrative screens, overview, worked scenarios, standard fields, process, video... |
| [guideslist.js](guideslist.js) | Training (stage 5): one simple page: make a guide with Claude (four kinds), the Comet videos (a row per prototype of the Mockup tab and per test scenario of UAT, with the brief and the link), what... |
| [guideextra.js](guideextra.js) | Project guides: guides the team adds for one project next to the standard Module guides (Word, text, Markdown or HTML, with pictures). |
| [guideupdate.js](guideupdate.js) | Update the user guide from an organisation configuration ZIP (tabs "Update from configuration" and "Version history" in the User Guide Builder). |
| [learnlib.js](learnlib.js) | Module guides: the standard Facilio guide for each business module (work orders, service requests, field service, preventive maintenance, assets, inspections, vendors, inventory, budgets), ported... |
| [vidguide.js](vidguide.js) | Video to Guide: turn a recorded walkthrough into draft user-guide steps. |

## Governance, tasks, mail and tickets
Actions, risks, decisions, change requests, the task board, customer mail and transfers.

| File | What it does |
|---|---|
| [governance.js](governance.js) | Delivery governance shared with the customer: action items, decisions, RAID log, sign-offs (BRD / UAT / go-live) with evidence and history, meeting minutes, module owners, weekly digest, and change... |
| [mailinbox.js](mailinbox.js) | Mail inbox on the Tasks page (plan: docs/plans/MAIL-TO-TASKS-PLAN-2026-11-07.md). |
| [outlook.js](outlook.js) | Outlook hand-off. A native Outlook inbox is NOT available in this deployment (see docs/integrations/outlook-feasibility.md): the platform gives the app only the signed-in email, not a Microsoft... |
| [taskengine.js](taskengine.js) | The task engine: tasks that create themselves and resolve themselves (plan: docs/plans/TASKS-AUTOMATION-PLAN-2026-11-07.md). |
| [tasks.js](tasks.js) | Project Tasks: one task register per project (item kind "task", validated on the server) shown as a spreadsheet with saved sheets. |
| [tickets.js](tickets.js) | Tickets: client issues, incoming requests, meeting requests and follow-ups, tracked per project and across projects. |
| [transfers.js](transfers.js) | Transfers (roadmap E4, E10 step 1): the page for the push and pull engine. |
| [transferslogic.js](transferslogic.js) | Transfers page, the pure part (roadmap E4 / E10 step 1; the page is src/transfers.js, run by tests/transfers_page.mjs). |

## Claude and AI
Everything that talks to Claude or DeepSeek: the Ask Claude buttons, the Assistant box, setup pages and skills.

| File | What it does |
|---|---|
| [agents.js](agents.js) | Agent catalogue only (the Agent Setup, Connection & Data, Rules & Guardrails and Agent Testing tabs were removed on 7 Nov 2026). |
| [assistant.js](assistant.js) | Project assistant panel: ONE place, on the right of every project page, where the work Claude does for the project is shown as it happens (roadmap E15). |
| [helper.js](helper.js) | The Claude helper light in the top bar and its explanation: green while any teammate's Claude desktop is running the Studio task, amber when none is; the setup banner and the window shown after a project is created. |
| [qengine.js](qengine.js) | Question engine: reads a question about the project's records the way a person means it and answers it exactly, with no AI (tests/qengine.mjs). |
| [claudehand.js](claudehand.js) | Open in Claude: the ONE engine behind every Claude button in Delivery Studio (rules in src/claudelogic.js, server side in /api/projects/:id/handoff). |
| [claudeimport.js](claudeimport.js) | Import from Claude: one place to bring back what a team member got from Claude (their own account, via Open in Claude). |
| [claudelogic.js](claudelogic.js) | Open in Claude: the rules that every Claude button shares (pure code, also run by tests/claude_launch.mjs). |
| [claudesetup.js](claudesetup.js) | Claude setup: one page in the Help group with everything about Claude for this project. |
| [claudeskills.js](claudeskills.js) | Claude skills: small add-ons the team can install in their own Claude (Claude Desktop, claude.ai or Claude Code) so it does better work on user guides, videos, spreadsheets and code questions. |
| [implskills.js](implskills.js) | Project Settings > Implementation skills: the setup guide for the Facilio Implementation Toolbox (the facilio-impl-ai-skills repository), so a team member can install it without the Word guide. |
| [workchat.js](workchat.js) | The "Claude is working" conversation shared by every stage tab (Contract intake now; requirements, BRD, UAT and the rest later). |

## Looks: styles, theme and fonts
CSS files. The look is the coss style in ui.css (the last layer, see docs/design/UI-COSS-LIBRARY.md).

| File | What it does |
|---|---|
| [a11y.css](a11y.css) | Keyboard focus and the skip link. |
| [projfx.css](projfx.css) | Project pages only: each stage's muted colour (rail, page header, tabs, card headings, buttons, forms), the desktop top bar, the Handover checklist, the full-width Home dashboard and the tab entrance. |
| [authclay.css](authclay.css) | Welcome and sign-in screen in the Facilio palette: navy, Facilio blue, pink accents. |
| [bell.css](bell.css) | Notification bell popover |
| [brdword.css](brdword.css) | BRD Draft: tidy toolbar, menus, formatting bar and sign-off banner. |
| [dashboards.css](dashboards.css) | Admin dashboard: flat white cards, thin borders, one working colour (Facilio blue), tables first |
| [demokitview.css](demokitview.css) | Facilio Demo Kit browser |
| [design-system.css](design-system.css) | ===================================================================================================== Delivery Studio design system (loaded last; see build.mjs). |
| [explore.css](explore.css) | Discover more with Facilio (src/explore.js): the brand page, in the app's own theme (night violet, violet accent, white cards with hairlines) with calm neon and motion. |
| [explore2.css](explore2.css) | Discover more, in Facilio's own art style (as on facilio.com): black stages with a fine dot grid, isometric slabs, small pills, a condensed serif headline and black buttons with an arrow square. |
| [font-unify.css](font-unify.css) | One font (31 Oct 2026): everything uses the font of the sidebar, Inter, whatever the size: titles, numbers, small labels, badges, buttons and fields. |
| [gsearch.css](gsearch.css) | project search (src/gsearch.js) |
| [guidefix.css](guidefix.css) | Customer User Guide: module list on the left and the section chips. |
| [guidestyle.css](guidestyle.css) | Module guides: the same content, dressed in the app's violet, ink and soft clay look. |
| [homeclay.css](homeclay.css) | Projects home hero (kept as designed: the night-city banner). |
| [kickoff.css](kickoff.css) |  |
| [lifetrack.css](lifetrack.css) | Lifecycle tracker (src/lifenav.js): nine stages, status badges, owner / completion / progress, blockers, pending and upcoming lists. |
| [overviewbento.css](overviewbento.css) | Project Overview bento: deliverables, sessions, people and activity as tiles |
| [plancal.css](plancal.css) | Project calendar (src/plancal.js). |
| [plangantt.css](plangantt.css) | Plan timeline: a scaled Gantt (Day / Week / Month) that scrolls sideways, with draggable bars, a baseline ghost, weekend ticks and a sticky task column. |
| [polish.css](polish.css) | Consistency fixes found by scanning every page as team, customer and admin. |
| [projectguide.css](projectguide.css) | Project Settings > Keeping the project: the checklist rows. |
| [qbank.css](qbank.css) | Questions tab (src/qbank.js) and the live assistant (src/workshoplive.js). |
| [solution.css](solution.css) | Solution tab (src/solution.js). |
| [styles.css](styles.css) | Facilio Delivery Studio — styled after the Facilio Setup web app (facilio-setup: _common.scss, _dialog.scss, SetupNavbar.vue, SetupHome.vue, StateFlowsBuilder/elements/Common.js). |
| [taskboard.css](taskboard.css) | Tasks: List / Board switch and the Jira-style board. |
| [teamhelp.css](teamhelp.css) | Team Guide page |
| [theme.css](theme.css) | Delivery Studio theme (28 Oct 2026): the facilio.com language of the "Al Moallam Implementation Academy" reference page — white pages with hairline lines, ink text, mono uppercase eyebrows, large... |
| [tldeps.css](tldeps.css) | Plan timeline: dependency lines, link dots, critical path, and the compact table (src/tldeps.js). |
| [tourplayer.css](tourplayer.css) | Product Tour: hero, chapter cards and the full-screen player |
| [tracequal.css](tracequal.css) | Traceability & Quality, page guides, explained AI panels, Training & Guides path, UAT and Go-live sub-tabs. |
| [transfers.css](transfers.css) | Transfers page (src/transfers.js): flat table, Facilio colours only (navy #1D1A5E, blue #1570EF, pink #E5197F, sky #8DB8FF). |
| [transition.css](transition.css) | Bring your project in: one box per kind of file, and a last box that takes anything. |
| [uat.css](uat.css) | UAT issue board (src/uat.js) |
| [ui.css](ui.css) | UI layer: the one place that sets the look of the app (tokens, type, buttons, fields, cards, tabs, tables, settings sections, shared work panel). |
| [uistate.css](uistate.css) | UI states: panels, toasts, banners, skeletons and field errors, in the app's own violet, ink and soft clay look. |
| [wbtheme.css](wbtheme.css) | Process Whiteboard in the State Flow Builder's frame: the same white canvas with the pale dot grid, the same thin border and square-ish corners, and the same light grey toolbar. |
| [webframe.css](webframe.css) | Facilio tools (src/webframe.js): a slim bar over a frame that fills the page. |
| [whatsnew.css](whatsnew.css) | What's new: a release timeline in the same black dot-grid style as Discover more. |
| [whiteboard.css](whiteboard.css) | Process Whiteboard full screen: the board fills the window below the top bar (the page header and toolbar above it left only about 550 px on a 950 px screen). |
| [workshop.css](workshop.css) | Workshop room (src/workshop.js). |

## Other

| File | What it does |
|---|---|
| [README.md](README.md) | src: the app |
| [brdsessions.js](brdsessions.js) | What the requirement sessions captured, in the shape the BRD and the checks need (user, 9 Nov 2026: whatever is answered in the sessions must show in the BRD draft). |
| [dashkit.js](dashkit.js) | Dashboard widget kit (8 Nov 2026): the shapes the Overview tab of the project dashboard uses for the team, the customer and the admin. |
| [dashmodern.js](dashmodern.js) | Modern dashboards (user, 9 Nov 2026, after the Scorecard, Slingshot, Produkcia, Vora, Breeze and Lector examples): the shared look of the team, customer and admin dashboards. |
| [planmerge.js](planmerge.js) | Importing a new version of the project plan into the Timeline (tests/plan_reimport.mjs). |
| [presence.js](presence.js) | Studio-open signal: while a team member has a Studio tab open and visible, tell the server every 4 minutes. |
| [privatetasks.js](privatetasks.js) | My private tasks (Tasks and email > My private tasks): a person's own day-to-day list for the project, kept apart from the shared tasks and visible to nobody else. |
| [qimport.js](qimport.js) | Questions from a file: the extra questions a consultant already has (an Excel sheet of any layout, a Word or PDF document, plain text) become question-bank entries. |
| [quickfacts.js](quickfacts.js) | Quick facts: a question the project records answer exactly (the go-live date, where we are, the next step, a step's dates, progress, overdue and my tasks, sign-offs, open risks) is answered here at... |
| [reslinks.js](reslinks.js) | Notes & Links helpers (9 Nov 2026): turn the web addresses in a note into clickable links, guess what kind of resource a pasted address is, and apply the private-note rule. |
| [taskroute.js](taskroute.js) | Where does a task belong? Reads the words of a task (title, description, module, sheet name) and says which type and project stage fit, so an imported row or an item found in a document lands in... |
| [template.html](template.html) |  |
| [wsplan.js](wsplan.js) | Workshop plan page tools (view rsplan; the cards are drawn by src/sessionhtml.js, the sessions live in the planner document and are edited with the Requirement Session Planner drawer,... |
| [wsplanlogic.js](wsplanlogic.js) | Workshop plan import (tests/workshop_plan.mjs). |

## src/animation: opening and sign-in animations
The sign-in explainer (`loginflow.js`, drawn in SVG and sequenced with GSAP), the customer sign-in city (`loginstory.js`), the opening intros and the Discover more scroll effects.

| File | What it does |
|---|---|
| [animation/cinema.js](animation/cinema.js) | Cinematic introduction used for the opening page and for the roadmap shown after sign-in. |
| [animation/custintro.js](animation/custintro.js) | Customer introduction (prompt section 7): an optional, per-project, customer-safe page built from existing project data and exported as ONE standalone HTML file. |
| [animation/discover/core.js](animation/discover/core.js) | Discover more scroll effects, shared helpers. |
| [animation/discover/login-scroll.css](animation/discover/login-scroll.css) | Sign-in page "Discover more": pinned scenes (src/animation/discover/login-scroll.js). |
| [animation/discover/login-scroll.js](animation/discover/login-scroll.js) | Sign-in page "Discover more" (src/discoverlogin.js): pinned scenes, in the manner of Apple's product pages. |
| [animation/discover/project-scroll.css](animation/discover/project-scroll.css) | Discover more tab inside a project: pinned sideways galleries (src/animation/discover/project-scroll.js). |
| [animation/discover/project-scroll.js](animation/discover/project-scroll.js) | "Discover more" tab inside a project (src/explore.js): pinned sideways galleries, in the manner of Apple's card carousels. |
| [animation/intro.js](animation/intro.js) | Opening page (before sign-in), shown on every fresh load: the customer journey (src/animation/roadintro.js) on customer invite links, the tree intro (src/animation/treeintro.js) for everyone else. |
| [animation/loginflow.js](animation/loginflow.js) | Sign-in page, left side (team view): "How Delivery Studio works", seven short scenes in ONE product window, sequenced by one GSAP timeline (vendor/gsap.min.js, free standard licence). |
| [animation/loginstory.js](animation/loginstory.js) | Sign-in page, left side: a canvas story that fills the left column of the sign-in page (replaces the earlier CSS story). |
| [animation/motion.js](animation/motion.js) | Facilio Motion Kit integration (vanilla). |
| [animation/roadintro.js](animation/roadintro.js) | "Your road to go-live": the Delivery Studio story told along a road. |
| [animation/treeintro.js](animation/treeintro.js) | Tree-growth introduction: one continuous animation. |
