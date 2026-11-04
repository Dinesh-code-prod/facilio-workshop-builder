# Delivery Studio: pending work and master requirements

Written 4 Nov 2026. This is the one list to work from, one item at a time. When an item is done, tick it, add the deploy number in the log at the end, and say what was not checked.
Live is deploy 142 (3 Nov 2026). Commits: `b5acdbf`, `df9039a`.

## How to work through this file
1. Part A first (small, known leftovers). Then Part B in the phase order of section B0.
2. For each item: look at what already exists first (Part 1 of the master prompt: audit, do not rebuild what works), make the smallest change, test, commit, push `main` and `feat/simpler-studio`, deploy, check live, tick it here.
3. Rules that never change (also in `CLAUDE.md`): Facilio colours only (navy #1D1A5E, blue #1570EF, pink #E5197F, sky #8DB8FF; no violet or purple, no neon or glow); DeepSeek stays the default AI; no Anthropic API key or billing; never invent a Facilio capability or an XML schema; AI output is a draft until a person approves it; keep the customer's original words; never sign in for the user; never print secrets.

---

## Part A. Pending and not checked

### A1. Not checked yet (3 Nov 2026 sessions)
- [x] Customer's own view of the Customer User Guide: checked 4 Nov 2026 on localhost (guide published, previewed as the customer): module list, section links and answers strip are in Facilio colours, no overlapping names, no page errors (`tests/ui/guide-customer-check.mjs`, 5 of 5). Not checked on live. Small leftover: the "What your team will see" picture frame has a pale lilac tint (goes with the violet pass in A2).
- [x] Live check that a file dropped in a box is really sent and stored: checked 4 Nov 2026 on facilio.work (deploy 142), test project "ZZ Walkthrough Test": a 68-byte file `live-upload-check.txt` put in the Workshop transcripts box went to category `transcript`, was sent with Send, showed "Stored", and the project's file list returned it. Not checked: a large file (16 MB parts), an e-mail (.eml) or the "Drop anything" guess on live. The test file is still in that project (delete it there if you want it gone).
- [x] Live check of lag days on a timeline link: checked 4 Nov 2026 on facilio.work (deploy 142), test project "ZZ Walkthrough Test". Two test tasks ("Lag check A" 10-12 Nov, "Lag check B" 13-14 Nov, B waits for A). Opened the link box and set Lag 3: the line shows `+3d`, B moved to 16-17 Nov (A ends 12th, next day 13th, plus 3), the page said "Lag set to 3 days. 1 task moved.", and after a reload the lag and new dates were still there. Not checked live: pressing Enter on a focused line with the keyboard (works in the localhost test), a negative lag, and the critical-path length with lag. The two test tasks stay in that project.
- [ ] Data onboarding sheet rules: `tests/onboarding_rules.mjs` covers the Site sheet, a missing sheet and a building pointing at a missing site. Not yet covered: Floors, Spaces, Asset, Users and the PM sheets, near-duplicate names, dates and e-mails, import value rules.
- [ ] Calendar tab of the Project Plan (`src/plancal.js`): not reviewed after the timeline work.
- [ ] Customers see the timeline lines but cannot edit them (decide: stay read-only, or allow).

### A1b. Open Claude and Analyse with Claude buttons: still to investigate (added 4 Nov 2026, same work as Part 13)
Find out, by reading the code and then testing on real Claude Desktop and Claude on the web (not assuming), for every "Open Claude", "Open in Claude" and "Analyse with Claude" button:
- [ ] What opens: Claude Desktop (deep link), the browser (claude.ai), or nothing when the link is blocked. Which button uses which, and what happens when Desktop is not installed or the browser blocks the pop-up.
- [ ] How the prompt reaches Claude: put in the link, copied to the clipboard for Ctrl+V, or fetched by the connector. What the length limit is (about 6,500 characters encoded today) and what happens above it (copy only). Whether the right task text arrives, so Claude gives the output the page expects.
- [ ] Whether Claude uses the connector by itself or needs to be told to call its tools; what context (project, requirements, documents, images) it can actually read; what it cannot.
- [ ] How the result comes back: pasted reply or connector write-back, and that it lands as a draft in the right place for approval.
- [ ] How the work lands directly inside the Claude **Project** (the Claude projects folder the team uses): can a link or the connector start the chat inside a chosen Claude Project (with that project's instructions and files) instead of a loose new chat? If a link cannot choose the project, say so and write down the smallest workable step (for example the project's own link, or a prompt line telling the user which project to open). Check what is possible on a normal subscription, with no API key and no extra hosting.
- [ ] Write the findings in `docs/reference/CLAUDE-HANDOFF-FINDINGS.md` (what was tested, on which app and version, result), then fix the buttons so each one opens the right place with the right prompt and says clearly what the user must do next.

### A1c. Every report gets DeepSeek and Open Claude (added 4 Nov 2026)
Wherever the project makes a report or a report-like document (weekly status report WSR, monthly report, status reports, this week's update in Governance, dashboard report, FTR report, KPI workbooks, hypercare and handover reports, closure report, admin and portfolio reports, and any other we find), each must offer both: a DeepSeek draft button (the default provider) and an Open Claude / Analyse with Claude button, through the one handoff engine (Part 13), with the result coming back as a draft the user approves.
- [ ] List every place that generates a report (start with `src/lifecycle.js`, `src/governance.js`, `src/dashreport.js`, the FTR and KPI pages, hypercare and handover, admin and portfolio reports) and mark for each: has DeepSeek draft? has Open Claude? exports to Word, PDF, Excel? Known so far: Status reports in `src/lifecycle.js` already have a DeepSeek draft (`ACT.repAi`) and a Claude handoff ("Draft with Claude"); confirm both work live and check the rest.
- [ ] Add the missing DeepSeek and Open Claude buttons to each report, with a prompt written for that report type (WSR: progress, plan vs actual, risks, next week; monthly: month summary, milestones, risks, scope changes, decisions needed, next month), sending only the data that report needs.
- [ ] Draft text always lands as an editable draft; nothing is sent to the customer or saved as final without the user pressing the button.
- [ ] Test each report: the button shows, the prompt holds the right project data, a pasted or returned reply fills the report, and the export still works.

### A2. Known leftovers
- [ ] **Postponed by the user on 4 Nov 2026 ("the current UI is fine, check this later"): violet colour pass.** Notes for later: an inventory of the CSS found about 312 violet hex uses (53 distinct; most are `#e6e2f2`, `#f1ecff`, `#6a3df0`, `#f4f0ff`, `#f6f4fb`, `#ebe8f5`, `#623cf6`; by file: `styles.css` 188, `polish.css` 24, `taskboard.css` 17, `guidestyle.css` 15, `teamhelp.css` 15, `bell.css` 12, `tourplayer.css` 8, `public/onboarding-tool/app.css` 8, `uistate.css` 7, `dashboards.css` 6), about 69 violet `rgba()` values (mostly `rgba(60,40,140,..)`), 13 inline colours in JS (`shell.js`, `timeline.js`, `dashboards.js`, `brd.js`, `flowbuilder.js`), and indigo-ish ones such as `#6b4ee6` (26 uses) that need a decision. Idea: strong violets to Facilio blue `#1570EF`, dark ones to navy `#1D1A5E`, light tints to blue tints (`#eef4ff`, `#dbe6fb`), lavender greys to cool greys (`#e3e9f5`, `#f6f8fd`), then screenshot the main pages. Only the Customer User Guide is done (`src/guidefix.css`). The lilac frame under "What your team will see" in the guide belongs here.
- [ ] `tests/ui/tabs-layouts-check.mjs` still expects the old menu names (4 checks fail, before and after the 3 Nov change). Update it to the current menu.
- [ ] `tests/ui/smoke.mjs` and `tests/ui/whiteboard-check.mjs` already failed before (probably clicks hidden by the sticky top bar). Centre the element before clicking, then confirm.
- [ ] `tests/ui/kickoff-check.mjs` needs a fixture that is missing (`D:\tmp\claude-0\fx\kickoff.pptx`). Add a fixture in `tests/fixtures/`.
- [ ] UI checks need the Edge channel on this PC: `PW_CHANNEL=msedge node tests/ui/<file>.mjs` (or `node --import ./tests/ui/use-edge.mjs ...`). Note it in the file headers.
- [ ] Untracked scratch files in the folder: `HANDOFF-NEXT.md`, `tests/ui/_exp.mjs`, `_metrics.mjs`, `_overdraw.mjs`, `_set.mjs`, `_spikes.mjs`, `intro-perf.mjs`, `intro-profile.mjs`. Decide: commit, move, or delete (ask first).
- [ ] The "Not published, waiting for review" banner on the live app comes from the platform. It goes away only when the review passes (cannot be removed in code).

### A3. Postponed by the user (do not start unless asked)
- [ ] Mail receiving (Microsoft returns 403).
- [ ] The full UI sweep session.
- [ ] The violet colour pass (see A2).

### A4. Carried over from `docs/reports/pending-2026-11-02.md` (status unknown: confirm each one, some may be done since)
- [ ] BRD: Word and PDF exports opened in real Word and a PDF viewer (only the XML was checked); import of PDF, Markdown and text files (only Word was tested; scanned PDFs have no text); phone width of the BRD toolbar; the "Fix this" banner links.
- [ ] Describe with AI (Process Whiteboard) against the real DeepSeek model (only a stubbed answer was tested); live log check for "The AI service could not be reached".
- [ ] Open in Claude with the extension in real Claude Desktop (signed hand-off link in production); show whether the extension is really installed instead of a tick box; long prompts (over about 6,500 characters encoded) are copied, not put in the link: decide whether to raise the limit.
- [ ] BRD ideas not built: bold and italic inside headings, list items and table cells; delete table rows or columns; numbered lists; move a block up or down. (Most of this is covered by Part 9 below.)
- [ ] Whiteboard idea: let the AI name actors (swimlanes) and suggest the module for each step.

---

## Part B. Master product enhancement (the requirement, in the order to build it)

Goal: one connected lifecycle. Customer Discussion → Requirement → Analysis → KPI → Solution → BRD → Configuration → Organization Export → Deployment Handover. AI helps and people decide. Capture once, understand once, validate once, reuse everywhere.

### B0. Phase order (change it only after saying why)
1. Foundation: audit, data model, traceability, workshops and sources, KPI register, Q&A register.
2. Solution and configuration intelligence: solution design, automation register, configuration inventory, configuration questions, dependencies, org ZIP analysis.
3. BRD document experience: custom BRD, section choice, rich editor, tables and screenshots, DOCX and PDF export and import, version comparison.
4. Documentation export and Claude handoff: project documentation package, task-specific context, connector, Claude solution document import with approval.
5. Organization export: configuration-to-export mapping, package builder, dependency validation, versioning, validation report.
6. Admin and executive intelligence: dashboards, teams, KPIs, risk, scope deviation, AI reporting, report export, scheduled reports, admin Claude handoff.
7. Testing and tuning: end to end, permissions, data integrity, import and export, large documents, AI accuracy, ZIP validation, regression.

### Part 1. Audit first (deliverable before any build)
- [ ] Review: architecture and stack; navigation and tabs; project lifecycle; Requirements and Configuration data; BRD Draft; State Flow Builder and Process Whiteboard; DeepSeek integration; Open Claude (Desktop, Web, Copy Prompt); connector and MCP; org export; portfolio, team and admin data; dashboards; document import and export; roles and permissions.
- [ ] Write a feature gap analysis: requirement, existing implementation, limits, proposed change, dependencies, priority, acceptance criteria. Mark each item exists / partial / missing / duplicated. List what a change could break.
- [ ] Save it as `docs/reference/AUDIT-<date>.md`. Do not redesign the app; build on what is there.

### Part 2. Requirements intelligence
- [ ] Sources: Word, Excel, PDF, PowerPoint, images and screenshots, meeting and workshop notes, audio and transcripts, customer e-mails, existing BRDs, process and use-case documents, manual entry, workshop Q&A. Many files per project and per requirement.
- [ ] On upload: extract content; split into separate requirement records (never one record per document), each keeping its source. Find business problems and outcomes; functional and non-functional needs; KPIs and reporting; workflows and automation; integrations; approvals; custom screens, fields, forms and data; unclear, missing or conflicting statements.
- [ ] Categories (administrators can add more): Business, Functional, Non-Functional, Process, Workflow, Automation, KPI, Reporting, Integration, Data, Module, Customization, Notification, Security and Access, User Experience, Migration, Deployment, Training.
- [ ] Record fields: ID, title, customer description, business objective, detailed requirement, category, module, submodule, source, workshop session, customer priority, business impact, complexity, dependencies, owner, status, open questions, proposed solution, configuration references, BRD section reference, approval status, version history.
- [ ] Four separate text fields so AI never silently changes the customer's meaning: original customer statement, AI-interpreted, consultant-reviewed, approved.
- [ ] Traceability by link: Workshop → Transcript → REQ → KPI → SOL → BRD section → CFG. Click through in both directions.
- [ ] Completeness: AI says what is missing for this requirement (for a vendor dashboard: indicators, period, vendors, targets, calculation, data sources, access, refresh). Questions must be about the real requirement, not generic. Show a completeness measure and the open items.

### Part 3. Workshops, transcripts, questions
- [ ] Workshop sessions: name, number, date and time, participants (customer and Facilio), modules, topics, documents, audio, transcript, questions, answers, decisions, pending clarifications, actions with owners. Several sessions per project.
- [ ] Transcript analysis: separate customer from consultant where speakers are known; extract requirements, customer questions, Facilio answers, commitments and decisions, unresolved questions, dependencies and assumptions, things discussed but not documented, possible scope changes. Every statement links to transcript, speaker and timestamp where possible. A suggestion is not an approved requirement; an unanswered question is not a confirmed solution.
- [ ] Question and answer register: ID, question, related requirement and module, workshop, source timestamp, answer, answered by, AI interpretation, consultant-reviewed answer, final approved answer, clarification status. AI may suggest answers from project context and must label each as: confirmed Facilio functionality, existing project configuration, proposed configuration, custom development, third-party integration, unsupported, needs technical validation. Never invent a product capability.

### Part 4. KPI requirements (own area inside Requirements)
- [ ] KPI record: ID, name, business objective, customer's original description, formula, numerator, denominator, unit, target, threshold, frequency, reporting period, data source, module, fields, filters, grouping, chart type, dashboard audience, refresh, dependencies, validation status, proposed implementation. Keep the original request and the final definition apart.
- [ ] AI checks: possible with standard Facilio? existing report or dashboard? custom fields? workflow or automation? custom calculation? missing data? external source? Never assume what "vendor performance" means: ask for the exact indicators (response time, resolution time, SLA compliance, completion rate, repeat complaints, pending work orders, satisfaction).
- [ ] BRD gets a KPI and Reporting section with definition, formula, target, frequency, filters, source module and reporting solution (not just names).

### Part 5. Solution design and Facilio capability mapping
- [ ] Solution types (configurable): standard functionality, configuration, workflow automation, custom module, custom field or subform, custom screen or view, custom script, scheduler script, e-mail or notification, connected app, API integration, external dependency, custom development, not supported or needs validation.
- [ ] Solution record: ID, requirement, customer problem, proposed solution, module, submodule, standard functionality, configuration, workflow, automation, scripts, integrations, customization, dependencies, business rules, assumptions, limits, technical validation, complexity, effort, comments, approval.
- [ ] AI recommendation from requirement, documents, workshops, answers, project configuration, available modules, org export references, examples. Never claim a feature or invent XML without evidence. Show a confidence level and what a person must validate.
- [ ] Several approaches where it makes sense (standard, configuration plus workflow, custom module, integration), compared on complexity, dependencies, upkeep and impact. Consultants can pick, edit, reject or combine.

### Part 6. Workflow, automation and notification register
- [ ] Capture: workflow rules, approvals, conditional workflows, form rules, field updates, assignment, escalation, SLA automation, auto-closure, status transitions, scheduled automation, scheduler scripts, workflow and event scripts, API-triggered automation, e-mail templates and notifications, in-app and push notifications, connected app actions, background jobs, data sync, integration triggers.
- [ ] Automation record: ID, name, objective, requirement, module, trigger, trigger and execution conditions, actions, fields affected, status changes, notifications, recipients, script and integration dependencies, frequency, error handling, expected result, configuration status, testing status, BRD reference, export reference.
- [ ] Show how automations connect (for example request created → assignment → SLA → notification → work order → approval → completion notice), built only from approved requirements and decisions.
- [ ] A requirement is not "fully designed" until its workflows, scripts, notifications and automation are identified.

### Part 7. Organization ZIP analysis and configuration inventory
- [ ] Inspect the supplied Facilio org ZIP (do not guess from file names). Record folder structure and which of these are present, partial or absent: XML files, module configuration, views, layouts, fields, custom modules, relationships, subforms, form rules, workflows, workflow scripts, scheduler scripts, e-mail templates and notifications, in-app notifications, connected apps, statuses, approvals, other artifacts. The ZIP is the source of truth; do not invent schemas. (Existing: `src/orgpkg*`, `tests/orgpkg*.mjs`: audit first.)
- [ ] Inventory record: ID, name, category, module, submodule, purpose, requirement, solution, details, dependencies, source, implementation status, validation status, BRD section, export mapping.
- [ ] Coverage: modules (standard, custom, views, relationships, related lists, parent-child, cross-module, statuses); fields and forms (types, mandatory conditions, defaults, dependencies, subforms, layouts, form rules, visibility, validation); workflow and automation; connected apps and integrations (purpose, API, mapping, triggers, authentication, errors, modules).
- [ ] Dependency map (custom module → fields → subforms → relationships → workflows → scripts → notifications → reports). An item with missing dependencies is not complete. Validate before export.

### Part 8. Configuration tab as the team's workspace
- [ ] 20 areas: module configuration; views and layouts; custom modules; relationships; fields and subforms; form rules; status and transitions; workflow rules; workflow scripts; scheduler scripts; approval workflows; e-mail templates; e-mail notifications; in-app notifications; push notifications; connected apps; integrations; reports and dashboards; data import and migration; other customer-specific. Each item traces to its requirement and solution.
- [ ] Questions per type, not one generic list: custom module (problem solved, fields, relationships, access, workflows, reports); workflow (trigger, conditions, actions, fields updated, what if conditions fail, notifications); scheduler (frequency, records, eligibility, failure, duplicate runs); notification (trigger, recipients, template, content, channels).
- [ ] Readiness indicator: missing information, unanswered questions, missing dependencies, unapproved decisions, missing scripts, templates, relationships, validation, testing. "Ready" only when everything needed is present and validated.

### Part 9. BRD Draft as a real document editor
- [ ] Build the BRD from approved requirements, Q&A, workshops, KPIs, solutions, workflows, automation, configuration, relationships, state flow and process diagrams, reports, assumptions, dependencies, exclusions, open items (not just project name and module list).
- [ ] Start from the template or from scratch; pick modules and sections; add state flows, process diagrams, tables, KPI and automation sections, custom sections; reorder, duplicate, delete, rename; save custom templates; whole project or selected modules.
- [ ] Editor features: rich text, headings, paragraph styles, tables, images, screenshots, page breaks, headers and footers, page numbers, table of contents, outline, drag-and-drop sections, orientation and page size, margins, fonts, lists, links, captions, cross-references, undo and redo, autosave, versions, comments, review and approval. Formatting must survive DOCX and PDF export. First check which editor library is already in the app (not a plain textarea).
- [ ] Custom screen documentation: name, purpose, screenshots or wireframes (several), description, required fields, buttons and actions, roles, behaviour, link to requirement and configuration. The screenshot appears in its BRD section; the screen spec stays a separate record.
- [ ] Everything stays editable; AI never overwrites approved content without a confirmation.
- [ ] Import and export: DOCX and PDF export; DOCX import; version comparison; revision tracking. Importing an externally edited document: analyse structure, find changed, new, removed and conflicting content, map to records, show a comparison, approve change by change, update only after approval. Never replace the BRD blindly.

### Part 10. Documentation export for Claude, and import back
- [ ] Project documentation package: requirements, categories, KPIs, workshops, transcripts, Q&A, approved solutions, pending clarifications, workflow and automation specs, configuration inventory, relationships, screen specs, state flow and process diagrams, BRD, dependencies. Readable documents plus structured data (DOCX, PDF, XLSX, CSV, JSON, images), source references, metadata, version information.
- [ ] Import a Claude-prepared solution document: map it to requirements, KPIs, modules, workflows, automations, fields, subforms, relationships, scripts, notifications, connected apps, BRD sections, export specs; show a mapping and validation report; apply only after approval. Works from the BRD Draft and Configuration tabs.

### Part 11. Traceability engine
- [ ] Lifecycle: requirement → record → KPI → solution → BRD section → configuration → workflow or script → test case → export artifact → deployment status.
- [ ] Views for gaps: requirements without solutions; solutions without BRD references; BRD sections without approved requirements; requirements without configuration; configuration without requirements; automations without objectives; KPIs without formulas; incomplete dependencies; configuration missing from the export. No silent omissions.

### Part 12. Organization export package builder
- [ ] Scope (only where the real Facilio format supports it): portfolio, modules, custom modules, views, layouts, fields, subforms, relationships, statuses, form rules, workflows, scripts, scheduler scripts, approvals, e-mail templates and notifications, in-app notifications, connected apps, other artifacts.
- [ ] Each configuration record has an export state: documented only / designed / generated by Delivery Studio / imported from a ZIP / validated against schema / ready for deployment.
- [ ] Validation before the ZIP: required fields, dependencies, relationships, references, workflow dependencies, scripts and templates, missing files, duplicate identifiers, unsupported types, conflicts, items needing manual deployment. Produce a report. Do not call something deployable just because it is in the ZIP; where it cannot be generated reliably, say so instead of writing invalid XML.
- [ ] Package versioning: name, version, project, organization, date, created by, included and excluded items, validation result, deployment status, history. Export selected modules or the whole scope.

### Part 13. Open Claude: context handoff
- [ ] First find out what really happens today on every Open Claude button (prompt generated? copied? deep link prefilled? connector triggered? project context, documents and images reachable? result returned? long prompt? file that cannot move? sign-in limits?). Do not assume attachments travel. Write the findings down. (Existing: `src/claudehand.js`, `claudeimport.js`, `claudesetup.js`, `claudelogic.js`, the connector in `work/server/api.mjs`, `tests/claude_launch.mjs`, `tests/connector_skills.mjs`.)
- [ ] One handoff engine builds a task-specific context: project, customer, module, page, record, intended task, relevant requirements, KPIs, workshops, documents, screenshots, solutions, configuration, expected output, instructions. Not the whole project each time; the user can add more.
- [ ] Task prompts: Requirements (analyse selected requirements, find gaps, ask questions, recommend a Facilio solution); KPI (find missing calculation logic, how to build the dashboard); Configuration (required fields, workflows, scripts, notifications, dependencies); BRD (write a section from approved requirements); Organization Export (validate relationships and dependencies, find missing artifacts); Admin Dashboard (executive report from current data).
- [ ] Check what the connector can fetch (context, requirements, workshops, KPIs, configuration, BRD sections, documents, images, export information) and whether it can submit results back; say whether the connector starts by itself or Claude must call tools. If Claude Web needs a different setup, document the limit instead of adding hosting. Keep DeepSeek default; no Anthropic API key or billing; use the existing Claude subscription.
- [ ] Claude results return as a draft showing content, sources used, related records, suggested changes, conflicts and warnings. A person approves before anything approved changes.

### Part 14. AI Workspace (project chat)
- [ ] A tab where users ask about the project, upload documents, screenshots and transcripts, reference records, and ask for requirement analysis, solutions, KPIs, workflows, configuration guidance, BRD text, export validation, across modules.
- [ ] Context choice: current project, module, requirement, workshop, configuration, whole project, several projects where allowed. Show which sources were used.
- [ ] Provider choice: DeepSeek (default) or Claude; the answer says which one produced it.
- [ ] Answers can propose drafts (requirements, KPIs, solutions, workflows, configuration, BRD sections, questions, reports) with approve controls.

### Part 15. Executive admin dashboard
- [ ] Overview counts: total, active, completed, on hold, at risk, delayed, waiting for customer, waiting for internal action, near go-live, overdue milestones.
- [ ] Project health green, amber or red with the reason. Defined metrics (schedule deviation, milestones, requirements, BRD approval, configuration, UAT, defects, overdue tasks, customer dependencies, resources, readiness). Documented calculation, weights set by authorised administrators, no arbitrary AI scores.
- [ ] Delivery metrics with numerator, denominator, period and source for each: on-time delivery, completion, go-live success, BRD approval time, requirement closure, configuration completion, UAT pass, rework, delayed, sign-off.
- [ ] Churn and customer risk: confirmed churn only where lifecycle data exists; keep risk indicators and predictions separate; never call a customer churned because a project is inactive.
- [ ] Scope deviation (original scope, approved changes, added and removed requirements, module scope changes, effort, schedule, budget if known, custom requests) per project and portfolio.
- [ ] Risk and escalation list with source, owner, severity, impact and recommended action.

### Part 16. Teams and resources (Admin)
- [ ] Teams, leaders, members, reporting lines, role, assigned projects, ownership, workload, availability, allocation percentage; people on several projects.
- [ ] Team dashboard, team leader dashboard, individual KPI dashboard (measures beyond task counts: complexity, responsibility, quality, outcomes; KPIs and weights configurable).
- [ ] Privacy: leaders see their team, people see their own, senior managers see the portfolio, no needless HR data, every admin action audited.

### Part 17. Admin AI reporting assistant
- [ ] Natural-language questions answered from real data (high-risk projects, likely to miss go-live, team comparison, workload, scope deviation, pending BRD approvals, quarter comparison, unresolved escalations, executive summary). Never invented figures.
- [ ] Reports: executive summary, project health, team performance, individual KPI, resource use, customer risk, scope deviation, delivery performance, custom. Export PDF, Excel, Word with title, date range, selections, filters, grouping, charts, tables, summary, findings, recommendations, sources.
- [ ] Scheduled reports: type, recipients, frequency, time, format, scope; delivery history and failures.

### Part 18. Admin Claude handoff
- [ ] Open Claude from the Admin dashboard: find the request, fetch only the data the user is allowed to see, build a reporting context and prompt, open Claude, let it fetch more through the connector, return the report for preview and export. Never send data the user is not authorised to see.

### Part 19. Cross-project intelligence
- [ ] Patterns across projects (delayed modules, blockers, requirement gaps, configuration issues, repeated UAT defects, workload imbalance, integration dependencies, scope changes, similar risks). Compare by customer, project, module, team, leader, employee, period, stage, with consistent definitions; do not mix incompatible metrics without saying so.

### Part 20. UX and navigation
- [ ] Fit the current design system and Facilio colours; no disconnected screens. Review the present menu and avoid duplication and deep nesting. Proposed structure (adapt to what exists): Project: Overview, Requirements (register, KPIs, Q&A, workshops, automation), Solution Design, Configuration (inventory, modules and views, fields and forms, relationships, workflows and scripts, scheduler scripts, notifications and templates, connected apps), Process Whiteboard, State Flow Builder, BRD Draft, Documentation Export, Organization Export, AI Workspace. Admin: Executive Dashboard, Projects Portfolio, Teams and Resources, Team KPI, Team Leader, Individual KPI, Customer Risk, Scope Deviation, Reports, AI Reporting Assistant, Scheduled Reports, Administration and Permissions.

### Part 21. Data architecture
- [ ] Design the model before building: organization, customer, project, project module, requirement, requirement source, workshop, transcript, question, answer, KPI, solution, configuration item, automation, workflow, script, notification template, custom screen, screenshot, document, BRD, BRD section, BRD version, configuration dependency, export package, export artifact, test case, team, leader, employee, assignment, employee KPI, team KPI, project risk, scope change, report, scheduled report, AI interaction, approval record. Relations, unique IDs, versioning, permissions, audit history. Structured records for anything filtered, reported or traced; JSON only where fitting. Check the platform database limits first (the app already watches the 128 KB value limit).

### Part 22. AI governance
- [ ] Rules in code and screens: never turn a suggestion into an approved requirement; never invent a Facilio capability or a configuration schema; never say something is deployed unless confirmed; never make up KPI values or health scores; keep the customer's words; record where AI content came from; show confidence and warnings; keep human approval; keep manual edits; keep a history of AI and human revisions.
- [ ] Check what the configured DeepSeek model can do with documents, images and structured output. Do not assume a text-only model reads screenshots or scans; if it cannot, propose a way and say so.

### Part 24. Acceptance scenarios (all must pass at the end)
1. Upload an Excel, a Word file and a transcript: requirements split out with sources, questions found, gaps flagged, consultants review and approve.
2. A customer KPI request becomes its own KPI record, with gaps found, linked to module and solution, shown in the BRD.
3. A complex requirement gets an AI solution that separates standard, configuration and customization, lists dependencies, and is approved by a consultant.
4. A BRD for selected modules and sections: only those sections, requirements and solutions reflected, KPIs and automation included, diagrams and screenshots added, free editing, DOCX and PDF export correct.
5. Export documentation, let Claude write a solution document, import it: changes found, mapped, conflicts shown, applied only after approval.
6. Capture a custom module, fields, relationships, workflow, script and notifications: structured, dependencies mapped, gaps flagged, supported items mapped to the ZIP structure, validation reports incomplete or unsupported items.
7. Several projects, teams, leaders and assignments: executive, team, leader and individual dashboards correct; AI answers management questions from authorised data; reports export to PDF, Excel, Word.
8. Open Claude from Requirements, Configuration, BRD and Admin: right prompt, context passed by supported means, file and image handling verified, connector behaviour documented, results returned through a controlled workflow, DeepSeek still default.

### Deliverables to produce
- Before building: audit, gap analysis, information architecture, data model, requirements lifecycle, KPI design, solution structure, configuration inventory design, automation data model, BRD editor architecture, Claude handoff architecture, org ZIP analysis, configuration-to-export mapping, admin and team KPI definitions, roadmap, dependencies and risks.
- After building: features done, features kept, database changes, components, API changes, AI workflow changes, import and export results, ZIP validation results, security and permission tests, end-to-end results, known limits, what remains.

---

## Part C. Added requirements (after the master prompt)

### C1. Facilio Vibe apps connected to Delivery Studio, as Connected Apps (added 4 Nov 2026)
Goal: a Facilio Vibe app (an app built and hosted on facilio.work, like Delivery Studio itself) can be linked to a Delivery Studio project, created as a Facilio Connected App for the customer's org, and described in the project's Configuration tab so the team and the BRD know what it is.
- [ ] Investigate first (read, then test; do not assume): how a Vibe app becomes a Facilio Connected App (what the Vibe platform and its connected-app and connection features really do; start from the installed `facilio-vibe` skills such as `vibe-connectedapp`, `vibe-connection`, `vibe-connections`, `vibe-accounts`, and `platform_docs` of the facilio.work connector). Write the findings, with what is supported and what is not, in `docs/reference/VIBE-CONNECTED-APP-FINDINGS.md`.
- [ ] Decide the link: how a Delivery Studio project points to a Vibe app (app name and URL, owner, the Facilio org it is connected to), and whether Delivery Studio can create the Connected App itself or only prepare the details for a person to create it (do not claim anything is created unless it is confirmed).
- [ ] Connected App record in the Configuration tab (area 16, "Connected Apps", and Part 7 and Part 8 of Part B): name; what it does; purpose and business reason; the requirement and solution it serves; the Vibe app it links to (name, URL, owner); the Facilio org and modules it touches; who uses it (roles); how it signs in or connects (authentication type, no secrets stored); triggers and data it reads or writes; API or connection dependencies; error handling; status (idea, designed, built, connected, tested, live); BRD section; export mapping.
- [ ] Show the same record in the BRD (Connected Apps section) and in the documentation package for Claude, so one entry feeds all of them.
- [ ] Reuse what exists: check what the Configuration Hub (`src/cfginputs.js`) already records about connected apps and tabs, and extend that instead of adding a second place.
- [ ] Safety: never store or show passwords, keys or tokens in these records; link to where the secret lives instead.
- [ ] Test: add a Connected App record for a real Vibe app (for example Delivery Studio itself), see it in the Configuration tab, the BRD and the export, and say what was not checked.

### C2. Microsoft 365 connector guide for Claude (e-mail and access), in the Team Guide (added 4 Nov 2026)
Goal: a short, plain guide so each team member can add the Microsoft 365 connector to their own Claude and read e-mail, calendar, Teams and SharePoint from Claude more easily, and a clear place in Delivery Studio that tells them how.
- [ ] Find out the real steps first (do not guess): where in Claude it is added (Settings > Connectors), who must allow it (the Microsoft 365 admin for Facilio office accounts; the earlier note says Facilio's developers or admins must allow the connector for Office accounts), what each permission gives (mail, calendar, Teams chats and channels, SharePoint files), which sign-in the user sees, and what to do when Microsoft returns 403 or "needs admin approval". Test on a real office account and write down what was tested.
- [ ] Write the guide in plain words with numbered steps and the common errors (account mismatch between browser and desktop, admin approval needed, 403), for both Claude on the web and Claude Desktop. Say what it is for: finding project e-mails, meeting notes and shared documents, and bringing them into Delivery Studio through the Inbox or Bring your project in.
- [ ] Place it in the **Team Guide**, in the "set up your own Claude" list (`src/teamhelp.js`, next to "Connector: Facilio Delivery Studio" and "One Claude account"), as a new row "Microsoft 365 connector: for e-mail and files". Also link it from the **Claude setup** page (`src/claudesetup.js`), and from the Inbox page where mail receiving is explained, so people find it where they need it.
- [ ] Keep the privacy line: Claude reads only what the user's own Microsoft account allows; nothing is stored in Delivery Studio unless the user saves it; never put passwords or tokens in the guide.
- [ ] Note the link with the postponed mail work (A3: Microsoft returns 403 when receiving mail): this guide covers the user's own Claude only, it does not fix server-side mail receiving.
- [ ] Test: the new row shows in the Team Guide and on Claude setup, the copy and links work, and the wording matches what really happens on a test account.

### C3. Use the Microsoft 365 connector to help Delivery Studio, and connect the two (added 4 Nov 2026)
Goal: beyond the how-to guide (C2), find the best way for the Microsoft 365 connector (Outlook mail and calendar, Teams chats and meetings, SharePoint and OneDrive files) to feed and support Delivery Studio projects, and build the chosen way.
- [ ] Compare the ways before building, and write the result in `docs/reference/M365-INTEGRATION-OPTIONS.md`:
  1. **In Claude, with both connectors on** (Microsoft 365 plus Facilio Delivery Studio): the person asks Claude, Claude reads Microsoft 365 with the person's own permissions and saves the result into the project as a draft through the Delivery Studio connector. No new hosting, no API key, uses the existing Claude subscription. Check that the Delivery Studio connector's write tools are enough, and add the missing ones.
  2. **Delivery Studio calling Microsoft itself** (Microsoft Graph with a server sign-in): needs Microsoft admin consent and a stored credential, and ties to the postponed mail-receiving work that returns 403 (A3). Describe what it would need and why it is harder; do not start it unless asked.
  3. **Manual**: download from Microsoft and use Bring your project in or Inbox. This is the fallback that already works.
  Recommend one; the first looks most likely, but confirm it.
- [ ] Candidate uses to check for real, one by one (build only the ones that work and are worth it):
  - Customer e-mails in a project's mailbox or folder → Inbox records, then requirements or actions (as drafts).
  - Teams meeting recordings and transcripts → workshop transcripts in Requirements (Part 3), ready for requirement extraction.
  - Outlook calendar → the Workshop Schedule and workshop sessions (dates, attendees); and booking or proposing slots only as a draft the person confirms.
  - SharePoint and OneDrive files (contracts, plans, decks, data sheets) → the right drop box in Bring your project in.
  - Weekly status report and monthly report (A1c): draft the covering e-mail in Outlook for the person to review and send; never send automatically.
  - Find who is who: use people search to fill project contacts and attendees.
- [ ] Rules: every item arrives as a draft with its source (mail subject and date, meeting, file path) kept; the person approves before it becomes a requirement or goes to the customer; nothing is sent from the person's mailbox without their own action; Claude reads only what that person's Microsoft account can already open; no credentials or tokens stored in Delivery Studio.
- [ ] Add a "Use with Microsoft 365" action or prompt to the relevant pages (Inbox, Workshops, Bring your project in, Reports) through the one Claude handoff engine (Part 13), so the right prompt and project context are ready, and tell the person to turn on the Microsoft 365 connector first (link to the C2 guide).
- [ ] Show in the Claude setup page and Team Guide which connectors a person needs for which job (Delivery Studio: always; Microsoft 365: mail, meetings, files).
- [ ] Test on a real office account with both connectors on: one e-mail, one meeting transcript, one calendar event and one SharePoint file each reach the project as a draft with its source; say what was not checked.

---

## Progress log (add a line each time something is finished)
| Date | Item | Deploy | Not checked |
|---|---|---|---|
| 3 Nov 2026 | Timeline lag days, drawer above top bar, drop boxes plus Drop anything, Data Onboarding in Workshops, full-page sheet, guide colours | 142 | see Part A |
