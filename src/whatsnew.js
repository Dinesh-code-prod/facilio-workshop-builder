/* What's new: every version of Delivery Studio, newest first, so a team member or customer can see what changed and when.
   To announce a change, add one entry at the TOP of RELEASES when it ships. `all: true` shows the entry to customers too (keep those in plain
   language); other entries are for the Facilio team. Nothing is stored; the only thing kept in the browser is the version you last opened. */
(function (root) {
  'use strict';
  const F = root.FWB; const { esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  // kind: UPDATE (a new capability) or FIXES (something that was wrong now works)
  const RELEASES = [
    { v: '2.8.5', date: '2026-11-02', kind: 'UPDATE', title: 'Claude connector: your own Claude can read projects and send answers back', notes: [
      'Add the Facilio Delivery Studio connector once in Claude (Settings > Connectors > Add custom connector, address https://mcp.facilio.work/facilio-delivery-studio) and sign in with your Facilio account. It works in Claude on the web, the desktop app and the phone, with nothing to download.',
      'Claude can then find your projects, read requirements, open questions and use cases, take the same task packs as Open in Claude, and save finished drafts back as unapproved drafts. Everything runs as you, with your project access.',
      'Open in Claude: tick "I added the connector" and the prompt becomes one short line. Claude reads the task from Delivery Studio and the answer comes back here as a preview. Remove and re-add the connector in Claude once to see the new tools.'
    ] },
    { v: '2.8.4', date: '2026-11-02', kind: 'UPDATE', title: 'Workshops & Requirements: three pages in working order', notes: [
      'Workshops & Requirements now has three pages: Facilio Screens (run the sessions), Requirements & Use Cases (capture and confirm), and Checks & Validations (check before design).',
      'Use Cases is now a tab next to the transcripts and requirements, and MSA Scope Check is a tab of Checks & Validations. Nothing was removed, and old links still open the right tab.'
    ] },
    { v: '2.8.3', date: '2026-11-02', kind: 'UPDATE', title: 'Process Whiteboard: Describe with AI reads your text better, Align works on whole flows', notes: [
      'Describe with AI: the AI now reads your description more carefully (spelling mistakes, short forms such as SR and WO, every approval and branch you wrote) and sees the project flows that match your words in full. If the AI service does not answer, it tries again once with a shorter request.',
      'A flow built from your description is drawn like a State Flow Builder flow: state pills, the last step closed, straight connections.',
      'Align and distribute: work on whole flows (a frame moves with the states inside it), skip locked items, and say so when there is nothing to do.'
    ] },
    { v: '2.8.2', date: '2026-11-02', kind: 'UPDATE', title: 'BRD Draft: edit like Word, import your own BRD, delete drafts', notes: [
      'BRD Draft: type directly on the page, make text bold, italic or underlined, press Enter for a new paragraph, and add headings, bullet lists and tables below any block. Edits are saved with the BRD and go into the Word and PDF exports.',
      'Import a BRD you already have (Word, PDF, text or Markdown) or start a blank one. It becomes its own tab and you edit it on the page.',
      'Any BRD can now be deleted, with a confirmation, including the Main BRD. The last one left is cleared and a fresh draft is built from the project data.',
      'A shorter toolbar (the less common actions are under More) and a clearer sign-off notice: each problem is on its own line with a link to fix it.'
    ] },
    { v: '2.8.1', date: '2026-11-02', kind: 'UPDATE', title: 'BRD fix, Configuration Hub, admin clone and delete, PDF export', notes: [
      'BRD Draft: fixed a crash that blanked the page when a combined flow contained a state with a transition back to itself (for example Inactive to Inactive).',
      'Solution Design & Configuration now follows the working order: build the solution, set up access, alerts and data, record all configuration in the Configuration Hub, then write the BRD last. Configuration Inputs became the Configuration Hub: an overview of system modules, custom modules, relationships and connected apps. Templates, documents and tools held as modules in the Facilio org (PDF templates, VBA files, the BRD document) are listed apart and left out of the checks.',
      'Admin: Clone project and Delete for good (platform owner only, archived projects only, name typed to confirm). The Integrations page now lists every connection with what it is for, who needs it and its status. Sections open at once because their data is fetched quietly after the first screen.',
      'Export PDF on the admin dashboard and project overview now prints the page exactly as shown. The project dashboard has an Export dashboard as PDF button.'] },
    { v: '2.8.0', date: '2026-11-02', kind: 'UPDATE', title: 'Clearer pages: Traceability & Quality, AI panels, Training & Guides, UAT & Go-live', notes: [
      'Traceability & Quality now starts with what it is for. It follows each requirement through use cases, module, build and testing, lists the gaps with why they matter and where to fix them (Open button), and keeps the lessons learned. It moved to Project control and shows a count in the menu.',
      'Rows of blue AI, Open in Claude and Add from Claude buttons are now one panel that explains the three ways to draft a document (Configuration Inputs, UAT, Go-live, Training and Guides).',
      'Training & Guides: a four-step path across its pages, and a panel showing what the drafts read (BRD draft, Configuration Inputs, org package, Facilio and customer logos) with buttons to load the org package and add logos.',
      'UAT and Go-live are split into sub-tabs with a one-line caption each (Test cases, Issues, Tester guide, Demos and training, What to check, Checklist and actions; Readiness, Checklist, Actions), and each page has a "What is this page for?" guide you can close.',
      'BRD draft: a section or block that cannot be drawn no longer blanks the page; it is replaced by a short note, and an error page now shows the reason.'] },
    { v: '2.7.1', date: '2026-11-02', kind: 'UPDATE', title: 'Whiteboard: select with a rectangle and move everything together; where to get the Claude extension', notes: [
      'Process Whiteboard: drag on empty space to draw a selection rectangle; everything inside it is selected. A dashed box shows the selection: drag from anywhere inside it to move all of it together. Hold Shift or Ctrl to add to a selection. To pan, hold Space and drag, use the hand tool, the middle mouse button or the scroll wheel.',
      'Moving a flow frame now carries everything that belongs to it: the states and buttons of the copied flow, and anything whose centre sits inside the frame.',
      'Claude Desktop extension: the file is facilio-delivery-studio.mcpb. Download it and see exactly where and how to install it in Project Settings and Exports, under Claude Desktop extension, or from any Open in Claude panel (Where and how to install it).'] },
    { v: '2.7.0', date: '2026-11-02', kind: 'UPDATE', title: 'Open in Claude: one hand-off for every button, and a Claude Desktop extension', notes: [
      'Every Open in Claude button in the app now uses one hand-off. Prompts say who is asking, which project, page and module, what the task is and what happens to the answer. A prompt that is too long for a link is never cut: it is copied, or sent as a hand-off.',
      'New Claude Desktop extension (download it from any Open in Claude panel, double-click it, tick the box). With it, Open Claude Desktop sends a short prompt and Claude opens your picture, PDF, Word or Excel text through the extension, then sends its answer back; the page picks it up by itself and shows a preview before anything is saved.',
      'No API key and no extra cost: it uses your own Claude subscription. The hand-off is a one-hour signed link; it can be closed early and is deleted when it expires.',
      'Claude on the web cannot read files from your computer or from Delivery Studio, and a web page cannot attach a file to another site: the prompt goes in the link and the picture is put on your clipboard, then you paste it with Ctrl+V.'] },
    { v: '2.6.0', date: '2026-11-02', kind: 'UPDATE', title: 'Whiteboard AI and Claude hand-off, state flow delete, calmer calendar', notes: [
      'Process Whiteboard now looks like the State Flow Builder: white boxes with a thin blue line, coloured pill labels, the same arrows and canvas. Export follows the same look.',
      'Describe with AI: type a process in words and the AI draws the steps and connections and points at the existing state flows of your project that belong in it. You check it before it is added.',
      'Import from image sends the picture to Claude with a ready-made prompt: Use My Claude, Open Claude Web or Desktop, or Copy Prompt. The prompt goes in the link and the picture is put on your clipboard; paste it into the chat with Ctrl+V (a web page cannot attach a file for you). Reading pictures inside the app works only if the platform accepts them: Admin > AI > Check image reading tells you.',
      'Save as state flow: turn a whiteboard flow into a new state flow, or replace an existing one.',
      'State flows can be deleted from the list and the editor. A flow proposed in a workshop is deleted; a configured flow is marked as a proposed removal, which you can take back.',
      'BRD diagram resizing (Fit page width, Full page, Landscape page, + and −, drag) no longer re-draws the whole document, so it is smooth.',
      'Calendar: four calm phase colours instead of twelve, a phase strip instead of the crowded bar, the project blue gradient in the header band, softer cells. Archive for Discover more entries, and new entries now show in the notification bell.'] },
    { v: '2.5.2', date: '2026-11-01', kind: 'UPDATE', title: 'A calmer calendar: jump to any month or year', notes: [
      'Click the month and year in the calendar title to jump straight to any month or year: pick a year, then a month, and it opens. There is also a Go to a date box.',
      'The side panel, the mini calendar and the Up next list are gone, so the calendar has the whole width. Which plan steps show is now one Filter menu instead of a long list.',
      'Keyboard: left and right arrows move between periods, T goes to today, N adds a reminder, and D, W, M and Y switch between day, week, month and year.'] },
    { v: '2.5.1', date: '2026-11-01', kind: 'UPDATE', title: 'Calendar redesign: a colour for every plan step', notes: [
      'Every plan item on the calendar now takes the colour of its plan step (Kick-Off, Workshops, BRD, Implementation and so on). Blues are discover and define, steel blues build and test, pinks are UAT and launch, slate and green are hand-over and go-live.',
      'A step ribbon above the calendar shows the whole plan in those colours, with today marked. Click a step to jump to it. The side panel lists the steps with their dates and lets you show or hide each one.',
      'Behind-schedule items are outlined in red, finished ones are dimmed with a tick, actions due are outlined bars, and your own reminders have a pink edge. Month, week, day and year views share the same look as the rest of the app.'] },
    { v: '2.5.0', date: '2026-11-01', kind: 'UPDATE', title: 'Project calendar, customer UAT testing', notes: [
      'Project Plan has a new Calendar tab with Day, Week, Month and Year views and a side panel with a month picker and what is coming up. It is drawn from the project plan, workshop sessions, UAT and go-live dates, sign-offs and actions that fall due, colour-coded by kind, with filters and search.',
      'The team can add reminders, events and deadlines on any day. They show on the calendar, and a reminder appears in the notification bell on its day. Reminders are for the team only; customers see the plan, workshop schedule and their own actions.',
      'Customer UAT testing: the team shares chosen test cases (UAT > Share test cases). The customer sees the scenario, steps and expected result on a UAT Testing page, and records Passed, Failed or Blocked with what happened and an optional link to a screenshot.',
      'Results are not mixed into the team test cases automatically: choose Bring results in to write them to the test cases, then log issues for failures as usual.',
      'Behind the scenes, the platform owner is no longer named in the code. It comes from the platform_owner secret, and, until that is set, from the person facilio.work reports as the owner of the app. A bug that would have split an owner email at the letter s is fixed.'] },
    { v: '2.4.0', date: '2026-11-01', kind: 'UPDATE', title: 'Discover more library, dashboard layouts, UAT attachments', notes: [
      'Admin > Discover more: one library of product highlights for every project. Write an entry, or paste or upload a product note and let the AI write a draft from that text only. Nothing is shown until you read it and publish it.',
      'Each entry can target every project or chosen ones, and can have start and end dates. Customers see it on Explore Facilio only while it is published and inside its dates; the dates are checked on every visit, so nothing needs a scheduler.',
      'The admin dashboard can be arranged: choose Customize layout to move widgets, change their width or hide them, per tab. Your layout is saved for you, and the platform owner can save a starting layout for each admin role.',
      'The admin dashboard now explains in plain words how project health (Blocked, Overdue, At risk, Insufficient data, On track) is worked out.',
      'UAT test cases accept attachments: screenshots, recordings and documents, for the project team only.'] },
    { v: '2.3.0', date: '2026-11-01', kind: 'UPDATE', title: 'Lifecycle tracker: nine stages with an owner and a recorded closure', notes: [
      'Delivery Lifecycle now shows nine stages: Project Kickoff, Workshops & Requirements, Solution Design & Configuration, Implementation, UAT & Go-Live, Training & Documentation, Go-Live Handover, Hypercare and Project Closure.',
      'Each stage shows its status (Completed, Current, Upcoming, Delayed, Blocked or Not applicable), owner, completion date, progress as a count of records, critical blockers, pending actions and upcoming activities.',
      'Status comes from what the project has recorded, never from a percentage. A stage with no records is Upcoming, not complete. Behind-schedule plan rows make a stage Delayed; blocked actions, high risks, customer concerns, critical UAT issues and high MSA findings make it Blocked.',
      'A project owner or admin can close a stage, mark it not applicable or reopen it, after a confirmation. Their name, the date and a note are kept in the stage history. If a stage is closed while records are still open, the page says so.',
      'Anyone on the team can set the owner of a stage. Actions and plan rows are tied to a stage by the words in their title.'] },
    { v: '2.2.0', date: '2026-11-01', kind: 'UPDATE', title: 'MSA Scope Check, a UAT issue board, kept tracker files, UAT charts', notes: [
      'New MSA Scope Check (Workshops & Requirements): confirmed requirements and use cases are held against the signed MSA, and every finding says which of five kinds it is: confirmed contractual conflict, potential scope deviation, missing contractual information, pending customer clarification, or requirement not sufficiently confirmed. Each shows the item, the MSA wording with page and section, why, and what to do next, and opens the requirement or the MSA scope.',
      'It points at wording to read; it does not decide a contract question. Missing information is a finding, never a pass. Record your decision on each finding (open, in clarification, needs change request, resolved, not an issue) with a note; your name and the date are kept. The menu shows how many findings still need a person.',
      'UAT issues now have a board (Delivery > UAT): New, Open, Assigned, In Progress, Fixed, Ready for Retesting, Retesting, Closed and Deferred. Drag a card or use its menu. Issues are tasks, so they also show in Tasks, and every move is written to the issue history. Moving an issue to retesting puts its test case into Retesting; a test case that passes its retest closes the issue.',
      'Test-case imports keep the original Excel or CSV file for the team: download it from the imported cases.',
      'UAT guides can hold charts: Add UAT chart draws progress by module, test cases by status or UAT issues by status from the saved records, with a caption that says what it counts and when.',
      'Go-live readiness also lists UAT issues that are not closed.'] },
    { v: '2.1.0', date: '2026-11-01', kind: 'UPDATE', title: 'UAT test cases by module, Excel import, issues in Tasks', notes: [
      'Delivery > UAT now starts with UAT test cases for the modules of this project: scenario, steps, expected and actual result, status, tester, date and evidence. Pick a module to see its cases; a summary shows passed, failed, blocked and not run, all counted from the saved test cases.',
      'Statuses: Not Started, Ready for Testing, In Progress, Passed, Failed, Blocked, Deferred, Retesting and Approved. Change one right in the list; the tester and date fill in when a case is run.',
      'A failed or blocked test case can raise an issue in Tasks (type Issue / Blocker, stage Testing & UAT) linked to the test case. When that issue is done, the test case says "Fix done: retest" and one click sends it to retesting.',
      'Import a test tracker from Excel or CSV: choose the sheet and header row, match the columns (suggested for you), see a preview and a report of duplicates, unknown statuses and unknown modules, then import. Columns you do not match are kept on the test case.',
      'Go-live readiness now looks at the test cases: none recorded means unknown, and failed, blocked or unfinished cases are listed as blockers.',
      'UAT demos and training sessions can hold a facilitator, a meeting link, a recording link and notes. The UAT guide and the AI drafts read the saved test cases.',
      'Test cases are for the project team; customers cannot list or change them.'] },
    { v: '2.0.2', date: '2026-11-01', kind: 'UPDATE', title: 'Project search, priority colours in the menu, more project statuses', notes: [
      'Search the whole project: the new Search button in the top bar (or Ctrl+K) looks through requirements, decisions, actions, risks, change requests, UAT and build records, tasks, guides, notes, configuration inputs, the BRD and more. Each result shows what it is, where it sits in the delivery stages and the matching text, and opens its page. For the project team.',
      'Menu markers with a meaning: Governance turns red when an action is overdue or a sign-off has a concern, orange for an open high-impact risk, yellow for a sign-off that is waiting. Change Requests shows yellow when one is waiting for a decision. Hover for the reason. Nothing shows when there is nothing to do.',
      'Project status: Churned, Not workable and Discontinued join Active, On hold, Completed and Cancelled. A reason is required and every change is kept in the project history. These projects leave the active figures and stay available for history. Nothing is deleted.',
      'BRD Draft is now the last step of Solution Design & Configuration, after the modules, flows, roles and notifications it is written from.',
      'The platform owner at first start now comes from a platform secret instead of a name fixed in the code.'] },
    { v: '2.0.1', date: '2026-11-01', kind: 'UPDATE', title: 'Org package with views, an agent brief, and Review with Claude', notes: [
      'New Views tab on every module: choose the app, the columns in order, the sort, a state filter, other filters and who the view is shared with. Views go into the organisation package as VIEW and VIEW_GROUP records in the format of the standard package.',
      'Agent brief: one JSON file, grouped by module, that tells the Org Builder agent what is inside the package, what is not and why, and what to do by hand after the import.',
      'Org Package Export opens with a readiness checklist: BRD sign-off, confirmed requirements, modules, state flows, views and notifications, each with a button to the page that fixes it.',
      'Review with Claude: your own Claude gets the brief and a careful review request; paste the reply back to save it as a draft review or turn each finding into a task. Nothing is applied automatically.',
      'Project Settings > JSON exports starts with the organisation package and its readiness.',
      'Module pages show the everyday tabs first (Templates, Fields, Buttons, Views, Requirements); Related, Automation, Review, Notes and Process are one click away under More.',
      'Longer forms keep the essentials in view and fold the rest under "More options". Nothing was removed, and anything that already has a value stays open.'] },
    { v: '2.0.0', date: '2026-11-01', kind: 'UPDATE', all: true, title: 'Discover more as a scroll story, a new opening tree, a clearer look', notes: [
      'Discover more is now a scroll-driven page in the style of facilio.com: real Facilio screens that change as you scroll, one chapter for each solution area, and a different picture for every module.',
      'The sign-in pages have a Discover more with Facilio button that opens the same story full screen, so customers can explore before they sign in.',
      'The opening animation is a real tree: a thick trunk with bark, limbs that arch up and out, and leaves in the Facilio colours, with a night sky, a skyline that lights up, wind turbines and fireflies. It runs smoothly because finished leaves are drawn once.',
      'Facilio blue replaces violet across the app, and small boxes have the same soft depth as the cards.',
      'Project Overview has a tidier layout for deliverables, upcoming sessions, people and recent activity.',
      'Transcripts: clear buttons for Analyse, Edit details, Replace file, Download and Remove.'] },
    { v: '1.9.1', date: '2026-10-31', kind: 'UPDATE', all: true, title: 'Claude project review, import from Claude, guides for agent and integration projects', notes: [
      'Add from Claude now sits beside every Open in Claude button (deliverables, task assistant, transcript tasks, guide sections, kick-off deck, flow from an image, admin briefing, project review) so a reply you already have can be brought in without starting again.',
      'Guide prompts follow the project stage: before the BRD is signed off Claude is asked for the standard Facilio guide, with project-specific points marked to confirm; after sign-off it is asked to base the guide on the confirmed process of the customer.',
      'Task filters: owner, status, priority, type, due date, needs attention and customer questions waiting, for the list and the board, with a clear button.',
      'Guides and videos in your own Claude: pick a format (document, step-by-step guide, walkthrough or video with voice-over); the prompt says what to attach (your recorded video) and which Claude skills to use. A skills pack (ZIP per skill) can be downloaded from the app, with install steps.',
      'Open in Claude now also covers guide sections, the kick-off deck reader, flow from an image and the admin briefing; the reply comes back into the same step.',
      'Facilio screens page (Workshops & Requirements): the Facilio demo library kept inside Delivery Studio, 102 real screens (sign-in, CMMS, mobile app, Atom, FM Assistant, Help desk, Vibe) to search, open full size and save as PNG during a requirement session.',
      'Use your own Claude for the task assistant: in a task, pick an action (or checklist) and Open in Claude. The prompt is the same one the built-in AI gets; paste the reply back into the same panel. Tasks from a transcript can also be run in your own Claude, part by part, with the same review step.',
      'Dashboards: a bento-grid dashboard for the team (progress, tasks, what is late, waiting on the customer, requirements, sign-offs, next 14 days), one for customers (their phase, what is waiting on them, sessions, sign-offs), and a portfolio view at the top of the Admin dashboard.',
      'Project review in Claude (Deliverables & AI): exports the whole project as one prompt with what to check and a reply format. Paste the reply back from Claude to create a task for each gap it found.',
      'Import from Claude: bring back a pasted reply or a .docx, .xlsx, .csv, .md, .txt or package file. Text becomes an unapproved draft; spreadsheets open the Tasks or plan import; nothing is saved until you confirm.',
      'New customer guides: Facilio AI Agents (what agents are, what Atom AI can do, how a project runs, what we need) and Connecting Your Systems (how Facilio integrates with ERP, building systems, helpdesk and messaging tools).',
      'Requirement sessions: Show Facilio (the guided tour of real screens) and the Requirements whiteboard are one click away on the Transcripts page. The whiteboard can now export a JPG as well as a PNG.',
      'Fixed: buttons that showed white text on white (the AI draft button and others), blue-tinted boxes, the search ring, and the file picker look.'] },
    { v: '1.9.0', date: '2026-10-31', kind: 'UPDATE', all: true, title: 'Guided Product Tour, nicer Module guides, a smarter project plan, UI states', notes: [
      'Product Tour: a guided, full-screen tour of the real Facilio screens, chapter by chapter, with a plain explanation for each. It plays on its own or with the arrow keys. The team can save a chapter as a video file made in the browser.',
      'Module guides have a cleaner look: a clear module list, a progress band and softer sections. The content is the same.',
      'Project plan timeline: Day, Week and Month scales that scroll sideways, drag a bar to move it or drag its end to change the end date, Shift moves every later task, a baseline ghost, Shift tasks by working days, and a working calendar for the weekend and holidays.',
      'Plan workbook: many more Excel functions, including IFS, SWITCH, XLOOKUP, SUMIFS, COUNTIFS, DATEDIF, WORKDAY.INTL and NETWORKDAYS.INTL with weekends and holidays.',
      'Consistent states across the app: empty, loading, error, offline, slow connection, no results, no access, required fields and success messages.',
      'Team: Tasks Board, a full Team Guide page, Agent Setup for Facilio AI agent projects, and Add email (.eml) in the Inbox.'] },
    { v: '1.8.3', date: '2026-10-31', kind: 'UPDATE', title: 'Task board and a new Team Guide', notes: [
      'Tasks now has a List and a Board view. The Board has one column per status; drag a card to another column and the list shows the same change. Each card has a status menu and Alt + Arrow keys for keyboard use.',
      'The Team Guide is now a full page in the Project menu: the stages in menu order from kick-off to closure, with what to do, which page to open, what done looks like and what to watch for, plus working rules and tick-boxes.',
      'Page headings use a dark gradient like the Up next band, with no striped edge. Admin buttons that were unreadable are fixed.'] },
    { v: '1.8.2', date: '2026-10-31', kind: 'UPDATE', all: true, title: 'A clearer notification bell', notes: [
      'The bell is now a compact panel: Needs you, Delivery assistant and Activity, with unread and mark-all-read.',
      'Every notification opens the exact page and tab it is about (for example an overdue action opens Governance, Actions).',
      'Delivery assistant (Facilio team): points out what the project cycle says is missing or late, such as plan tasks behind schedule, actions with no owner or due date, workshops with no minutes, and customer actions overdue.',
      'The menu now follows the project order from kick-off to hypercare and closure, and Checks has six tabs instead of eight.'] },
    { v: '1.8.1', date: '2026-10-31', kind: 'UPDATE', all: true, title: 'Product Tour, Module guides and Discover more', notes: [
      'Product Tour: real Facilio screens in full size, grouped by what they do (raise and track work, assets, quotes and invoices, field service, reports, setup, the mobile app). Use it in requirement sessions to see how Facilio looks and how each action works.',
      'Module guides: the standard Facilio guide for each business module, with screens, a worked example, the process, short videos, the standard fields, the questions we will ask and a preparation checklist.',
      'Discover more with Facilio: the Facilio modules that are not part of your contract, grouped into solution areas, with what each one does and a button to say you are interested. Your Facilio team follows up on every request.',
      'One font across the whole app, buttons with a slight raised look, and a soft depth on boxes and KPI tiles.'] },
    { v: '1.8.0', date: '2026-10-31', kind: 'UPDATE', title: 'Notifications, a fuller package export, Open in Claude everywhere', notes: [
      'New Notifications tab (Solution Design & Configuration): set who is told what and when for each module. Email notifications are written into the organisation package in the format of the standard package; other channels and recipients are listed as steps to do by hand.',
      'The Org Package Export report now shows the BRD sign-off, the requirements and every change request with its effect on the configuration.',
      'An Open in Claude button now sits beside every AI button. It copies the prompt for your own Claude account (web or desktop); bring the reply back with Import as draft. Deliverables & AI explains both ways.',
      'Project Overview now holds Delivery lifecycle, Roadmap, Plan vs actual and Reports as tabs, so the menu has one progress page instead of five.',
      'In the Product Tour the team can open the live, clickable screen to show how buttons and actions work. The Modules page opens on the customer\'s own modules.'] },
    { v: '1.7.0', date: '2026-10-31', kind: 'UPDATE', all: true, title: 'Simpler menus, Learn & Prepare, Guides & Video Studio', notes: [
      'The menu now follows the delivery path: kick-off, workshops, design, UAT, hypercare. Rarely needed pages moved to "More tools". Nothing was removed.',
      'Customers get a shorter menu and a new Learn & Prepare page: what Facilio is, how the project runs, how to prepare for a session, what to bring, and the words they will hear.',
      'Contract, Scope and Data Onboarding are on for new customer portals. Explore Facilio is off by default.',
      'New for the team: Guides & Video Studio writes a video or walkthrough brief from the customer\'s own configuration (fields and state flow) and names the real product screens to use.',
      'This What\'s new page.'] },
    { v: '1.6.0', date: '2026-10-31', kind: 'UPDATE', title: 'Draft in Claude', notes: [
      'In the Generate with AI drawer, Draft in Claude copies the prompt for your own Claude account, and Import as draft brings the reply back for review. No API key, no extra cost.',
      'The pasted reply stays an unapproved draft. Unknown or missing source citations are flagged.'] },
    { v: '1.5.0', date: '2026-10-31', kind: 'UPDATE', title: 'Solution design navigation and guided guides', notes: [
      'Solution design pages grouped under sub-headings.',
      'Guided user guides and UAT guides, written one section at a time from confirmed requirements.',
      'Org package export, whiteboard delete, lifecycle fixes and a smoother tree intro.'] },
    { v: '1.4.0', date: '2026-10-31', kind: 'UPDATE', title: 'Tabs & Layouts, shared AI layer, Project Tasks, Admin Command Center', notes: [
      'Tabs & Layouts like Facilio: rename, re-icon, reorder and hide menu groups per project, with the reference theme.',
      'One AI layer for DeepSeek and Claude, and Project Tasks with an AI task assistant, sheets and Excel import and export.',
      'Admin Command Center: portfolio health with evidence, drill-downs, an AI briefing and My work.'] },
    { v: '1.3.1', date: '2026-10-28', kind: 'FIXES', title: 'BRD diagram sizes', notes: [
      'Each BRD diagram can be page width, a full page, or a landscape page of its own, and resized with - and + or by dragging its corner. Word and PDF use the same size.'] },
    { v: '1.3.0', date: '2026-10-28', kind: 'UPDATE', title: 'AI documents in the Facilio format', notes: [
      'The BRD draft follows the project\'s own BRD outline. Other drafts use numbered Facilio sections or the organisation template.',
      'Word export with the BRD format: cover with logos, document control table, heading colours, header and footer with page numbers.'] },
    { v: '1.2.0', date: '2026-10-27', kind: 'UPDATE', title: 'Process Whiteboard and project plan timeline', notes: [
      'Process Whiteboard in a Miro style: shapes, pen, connectors, fill, text and zoom. Save a board as a flow and include it in the BRD.',
      'State Flow Builder: roomier transition panel, draggable states and buttons.',
      'Project Plan: a Timeline & planning tab built from the workbook.'] },
    { v: '1.1.0', date: '2026-10-27', kind: 'UPDATE', title: 'AI documents written part by part', notes: [
      'Long AI documents are written section by section so every request finishes in time.',
      'Word exports are real .docx files, so they open in Word Online, Teams and on phones. Empty exports are refused.'] }
  ];
  const seenKey = 'fwb_whatsnew_seen';
  const getSeen = () => { try { return localStorage.getItem(seenKey) || ''; } catch (e) { return ''; } };
  const setSeen = v => { try { localStorage.setItem(seenKey, v); } catch (e) { } };
  const list = () => RELEASES.filter(r => !(V.isCustomer && V.isCustomer()) || r.all);
  V.whatsnewVersion = () => (RELEASES[0] || {}).v || '';
  V.whatsnew = {
    html() {
      const all = list(), f = F.S.ui.wnFilter || 'all', seen = getSeen(); const si = all.findIndex(r => r.v === seen);
      const shown = f === 'major' ? all.filter(r => r.kind === 'UPDATE') : f === 'fixes' ? all.filter(r => r.kind === 'FIXES') : all;
      const fmt = d => { const x = new Date(d + 'T00:00:00'); return isNaN(x) ? d : x.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); };
      const nNew = seen && si > 0 ? si : 0; const nUpd = all.filter(r => r.kind === 'UPDATE').length; const cust = V.isCustomer && V.isCustomer();
      const hero = `<section class="wn-hero"><div class="wn-hero-l"><span class="dx-pill"><i></i>Release notes</span><h2>What's new in Delivery Studio</h2><p>Every change, newest first. You are on <b>v${esc(V.whatsnewVersion())}</b>${cust ? '.' : '. Entries marked For everyone are also shown to customers.'}</p></div>
        <div class="wn-stats"><div><b>${all.length}</b><span>releases</span></div><div><b>${nUpd}</b><span>new capabilities</span></div><div class="${nNew ? 'hot' : ''}"><b>${nNew}</b><span>since your last visit</span></div></div></section>`;
      const chips = `<div class="wn-chips" role="group" aria-label="Filter">${[['all', 'Everything'], ['major', 'New capabilities'], ['fixes', 'Fixes']].map(([k, l]) => `<button class="wn-chip${f === k ? ' on' : ''}" data-act="wnFilter" data-v="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div>`;
      const card = (r, i) => { const fresh = seen && si > 0 && all.indexOf(r) < si; const head = r.notes.slice(0, 5), rest = r.notes.slice(5); const li = n => `<li>${esc(n)}</li>`;
        return `<li class="wn-it${i === 0 && f === 'all' ? ' latest' : ''}"><span class="wn-dot" aria-hidden="true"></span><article class="wn-card"><header class="wn-h"><span class="wn-v">v${esc(r.v)}</span><span class="wn-d">${esc(fmt(r.date))}</span><span class="wn-k ${r.kind === 'UPDATE' ? 'up' : 'fx'}">${r.kind === 'UPDATE' ? 'New' : 'Fixes'}</span>${cust ? '' : '<span class="wn-a">' + (r.all ? 'For everyone' : 'Team') + '</span>'}${i === 0 && f === 'all' ? '<span class="wn-k now">Latest</span>' : ''}${fresh ? '<span class="wn-k now">New since your last visit</span>' : ''}</header>
          <h3>${esc(r.title)}</h3><ul class="wn-ul">${head.map(li).join('')}</ul>${rest.length ? `<details class="wn-more"><summary>Show ${rest.length} more change${rest.length === 1 ? '' : 's'}</summary><ul class="wn-ul">${rest.map(li).join('')}</ul></details>` : ''}</article></li>`; };
      setTimeout(() => setSeen(V.whatsnewVersion()), 1500);
      return `<div class="page-header"><div class="t"><h1>What's new</h1><p>New features, improvements and fixes, with the version and the date.</p></div></div>
        <div class="page-body wn">${hero}${chips}${shown.length ? '<ol class="wn-tl">' + shown.map(card).join('') + '</ol>' : '<div class="card empty"><h3>Nothing here yet</h3><p>New features and fixes will appear here.</p></div>'}</div>`;
    }
  };
  ACT.wnFilter = a => { F.S.ui.wnFilter = a.getAttribute('data-v'); V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);
