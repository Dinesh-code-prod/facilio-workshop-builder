/* What's new: every version of Delivery Studio, newest first, so a team member or customer can see what changed and when.
   To announce a change, add one entry at the TOP of RELEASES when it ships. `all: true` shows the entry to customers too (keep those in plain
   language); other entries are for the Facilio team. Nothing is stored; the only thing kept in the browser is the version you last opened. */
(function (root) {
  'use strict';
  const F = root.FWB; const { esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  // kind: UPDATE (a new capability) or FIXES (something that was wrong now works)
  const RELEASES = [
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
