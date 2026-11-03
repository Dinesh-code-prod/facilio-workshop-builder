/* Team Guide: a page (not a drawer) that walks a Facilio teammate through a project in the same order as the menu, from kick-off to hypercare and closure.
   Each stage says what to do, which page to open, what "done" looks like and what to watch for. Steps sit under the same sub-headings as the menu (Part > Stage > Sub-heading > Page),
   and "The menu at a glance" is drawn from the live menu (V.navBase), so it cannot drift from what the sidebar shows.
   The tick-boxes are kept per person and project in this browser. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const CONNECTOR = 'https://mcp.facilio.work/facilio-delivery-studio';
  const CODE_CMD = 'claude mcp add --transport http facilio-delivery-studio ' + CONNECTOR;
  // [stage, group in the menu, goal, [[page id, label, how, sub-heading in the menu]], done when, watch out]
  const PHASES = [
    ['1', 'Kick-off & Planning', 'Agree what is being delivered, by when, and who does what.', [
      ['msaflow', 'Contract', 'Upload the MSA and order form. Check the extracted scope, fees and dates before you rely on them.'],
      ['kickoff', 'Kick-off Deck', 'Build the deck from the contract and present it. Record who attended.'],
      ['plan', 'Project Plan', 'Import the plan workbook. The timeline, "current phase" and reminders all read from it.']],
      'The customer has seen the scope and plan, and the plan has dates.', 'Plan dates drive every reminder. A plan with no dates means nothing is ever "late".'],
    ['2', 'Workshops & Requirements', 'Run the sessions, turn what was said into requirements the customer has confirmed, and check them before design.', [
      ['demokit', 'Facilio Screens', 'Show the customer real Facilio screens during the session so they can say what fits and what does not.', 'Run the sessions'],
      ['transcripts', 'Requirements & Use Cases', 'Two tabs. Transcripts & requirements: paste or upload each transcript and confirm the drafts that come out. Use cases: group confirmed requirements into scenarios the customer recognises.', 'Capture and confirm'],
      ['checks', 'Checks & Validations', 'Two tabs. Validations & readiness: fix conflicts, gaps and missing sources. MSA scope check: compare what was asked with what was sold.', 'Check before design']],
      'Every requirement is Confirmed or Rejected. Nothing stays Draft.', 'A requirement with no source is a guess. Keep the transcript link on each one.'],
    ['3', 'Solution Design & Configuration', 'Design and build from confirmed requirements, record all of it in the Configuration Hub, then write the BRD last and get it signed.', [
      ['modules', 'System Modules & Form Builder', 'Define modules and fields. New fields come from requirements, not from memory.', 'Build the solution'],
      ['flow', 'State Flow Builder', 'Draw each module\'s statuses and transitions, with who may press each button.', 'Build the solution'],
      ['whiteboard', 'Process Whiteboard', 'Draw the process with the customer so the flows have a picture behind them.', 'Build the solution'],
      ['roles', 'Roles & Access Permissions', 'Map people to roles and what each role can see and do.', 'Set up access, alerts and data'],
      ['notifications', 'Notifications', 'Say who is told what and when. Email rules are written into the package.', 'Set up access, alerts and data'],
      ['onboarding', 'Data Onboarding', 'Send data sheets, validate what comes back, ask for fixes.', 'Set up access, alerts and data'],
      ['agents', 'Agent Setup', 'Agent projects only: choose and set up the Facilio AI agents.', 'Agents'],
      ['agentdata', 'Connection & Data', 'Agent projects only: what each agent connects to and reads.', 'Agents'],
      ['agentrules', 'Rules & Guardrails', 'Agent projects only: what each agent may and may not do.', 'Agents'],
      ['cfginputs', 'Configuration Hub', 'Describe everything configured for this customer in one place: modules, relationships, connected apps and tabs. Guides, test plans and handover read from it.', 'Record all configuration'],
      ['brd', 'BRD Draft', 'Last step. Generate the BRD from the confirmed requirements and the Hub, review it, then ask the customer to sign off.', 'Write the BRD']],
      'The configuration is recorded in the Hub, the BRD matches it and the BRD is signed off.', 'Sign-off counts only when the customer signs or you record the evidence. Exporting a document is never sign-off.'],
    ['4', 'UAT & Go-Live', 'Prove it works for the customer and launch.', [
      ['delivery', 'Build, UAT & Go-Live', 'Three tabs. Build: track each module. UAT: tester guide, test cases and the issues board. Go-live: readiness verdict and checklist.'],
      ['agenttest', 'Agent Testing', 'Agent projects only: run each agent\'s test questions and mark the answers.'],
      ['ftr', 'FTR Report (Excel)', 'Import the FTR workbook and map its columns.'],
      ['kpi', 'KPI Workbooks', 'Prepare the KPI workbooks the customer will report on.']],
      'UAT sign-off is recorded and the go-live checklist is complete.', 'Do not start go-live with open critical defects. Raise them in Governance.'],
    ['5', 'Training & Guides', 'Leave the customer able to run it without you. Four separate tabs: each does one job and shows only its own work. Switch with the tab bar at the top of the page.', [
      ['vstudio', 'Guides & Video Studio', 'Write the brief for a video, walkthrough, step-by-step guide or training outline about one module. Inner tabs: Create, Product Tour, Story ideas and tips.'],
      ['guidebuilder', 'User Guide Builder', 'Write the customer\'s written guide section by section, review each one, then export to Word or PDF. Inner tabs: Content, Update from configuration, Version history, Branding, Quality checks, Export.'],
      ['vidguide', 'Video to Guide', 'Turn a screen recording you already have into guide steps. The video stays on your computer. Needs the transcript.'],
      ['resources', 'Notes & Links', 'Keep notes and links with the project. Inner tabs: Notes, Links & resources.']],
      'Customers have the guides they need and training dates are set.', 'AI drafts need a human read. Check every screen name against the real configuration.'],
    ['6', 'Hypercare, Handover & Closure', 'Stay close after launch, then hand over cleanly.', [
      ['hypercare', 'Hypercare', 'Log issues raised after launch and their fixes. Share the status.'],
      ['handover', 'Handover & Closure', 'Record who owns what, hand over to support, review lessons learned, close the project.']],
      'Support owns the steady state and the project is formally closed.', 'Closing with open actions loses the history. Close or move every open item first.']
  ];
  // the Project group of the menu: [page, label, what it is for, sub-heading]
  const RUN = [
    ['projdash', 'Dashboard', 'How the project stands today, in numbers.', 'Where are we?'],
    ['overview', 'Project Overview', 'Current phase, what is due next, the lifecycle and roadmap.', 'Where are we?'],
    ['tasks', 'Tasks', 'One register for everything to do. List view or Board view: drag a card to change its status.', 'Run the project'],
    ['governance', 'Governance & RAID', 'Sign-offs, risks, decisions, actions and minutes, shared with the customer.', 'Run the project'],
    ['changes', 'Change Requests', 'Anything outside the signed scope. Never change scope silently.', 'Run the project'],
    ['aiwork', 'Deliverables & AI', 'Draft documents with AI, or with Open in Claude on your own account. Drafts are never final until reviewed.', 'Run the project'],
    ['reports', 'Status Reports (WSR / Monthly)', 'Weekly and monthly reports, prepared and tracked here.', 'Run the project'],
    ['trace', 'Traceability & Quality', 'Follow each requirement through the BRD, configuration, guides and UAT, and see what is missing.', 'Run the project']];
  const WITH = [
    ['Preview as customer', 'The button at the top shows exactly what the customer sees. Nothing is saved while previewing. Use it before every customer meeting.', null],
    ['Customer View menu', 'Switch on only the pages the customer needs: Customer Introduction, Learn & Prepare, Product Tour, Module guides, Customer User Guide, Dashboard Gallery, Discover more and the Customer Portal.', 'custintro'],
    ['Discover more', 'Facilio modules outside the contract. When the customer taps "I am interested" you get an action to follow up.', 'explore']];
  // set up your own Claude: what to add, why, and which job it is for
  const SETUP = [
    ['Connector: Facilio Delivery Studio', 'Needed. Lets your own Claude read the projects you can open and save drafts back to them. In Claude: Settings > Connectors > Add custom connector. Name it Facilio Delivery Studio, use the address below and sign in with your Facilio account. On a Team or Enterprise plan the owner of the Claude organisation must allow custom connectors first.', ['Copy address', CONNECTOR]],
    ['Claude Code', 'If you use Claude Code, add the same connector with this command, then type /mcp and sign in.', ['Copy command', CODE_CMD]],
    ['One Claude account', 'Use the same Claude account in the browser and the desktop app, or Claude shows "Account mismatch". The work counts against your own Claude plan; there is no extra key or charge.', null],
    ['Skills: recommended', 'Small add-ons for your Claude. Add video-to-user-guide if you turn recordings into guides, excel-analysis for workbooks, and the video skills if you make videos. Pick, copy the command for Mac or Windows and run it once.', 'skills'],
    ['Facilio implementation skills', 'Install the Facilio toolbox once (/facilio-impl-toolbox: FTR Generator, UAT Guide Generator, Configuration Builder and more). The step-by-step guide is in Claude setup (Help group of the menu), tab Facilio skills. Fetch both repositories in GitHub Desktop before you use it, every day you work.', null],
    ['Check the connector is really added', 'Claude setup (Help group of the menu) shows the last time your Claude used the connector. Open in Claude then opens a chat that confirms the project with you, asks what you need if it is not clear, and reads the project itself.', null],
    ['Plugins: none needed', 'The connector and the skills do everything this app asks of Claude. The old Claude Desktop extension was removed on 2 November 2026: do not install it, use the connector. Ask your Claude administrator before adding any other plugin.', null],
    ['Deploying: owners and collaborators only', 'Only the app owner and collaborators publish changes, using the separate facilio work connector (https://mcp.facilio.work/mcp) in a Claude Code session and the /deploy command. Everyone else can ignore this.', null]];
  // job -> what to use
  const JOBS = [
    ['Draft the BRD, UAT plan, guides, reports, handover or closure pack', 'Connector', 'Use the Open in Claude buttons, or ask Claude for a task pack (brd, uat, guide, ftr, gaps, workshop, golive, hypercare, handover, wsr, monthly, config, pkg, training, closure). Drafts arrive unapproved.'],
    ['Ask what is open on a project, or find one', 'Connector', 'Ask Claude for a project overview, the open questions, the requirements or the latest activity.'],
    ['See where a project stands: tasks, overdue, UAT, risks, org id', 'Connector', 'Ask Claude for the project overview. It now includes task and overdue counts, UAT test cases, risks and issues, change requests, sign-offs and the org id.'],
    ['Carry on a deliverable with the Facilio tools (FTR, UAT guide, configuration)', 'Skills: Facilio toolbox', 'Ask Claude "which Facilio skill fits this?". It asks the connector (get_impl_skills), then you start it with /facilio-impl-toolbox. Needs the one-time setup in Project Settings > Implementation skills.'],
    ['Raise or suggest a support ticket', 'Connector', 'Ask Claude to suggest a ticket first; it creates it only when you confirm.'],
    ['Guide steps from a recording you already have', 'Skill: video-to-user-guide', 'Then bring the steps into the Video to Guide tab.'],
    ['Make a video or a walkthrough clip', 'Skills: demo-video, ui-mockup-video, video-editing, remotion-create, remotion-captions, remotion-multimedia, remotion-render', 'Start from the brief in Guides & Video Studio.'],
    ['Work with FTR, KPI or UAT spreadsheets', 'Skill: excel-analysis', 'Reads workbooks, pivots and summaries.'],
    ['Make sense of a big org package or document folder', 'Skill: graphify', 'Builds a graph so questions are answered from it.'],
    ['A short launch video of a web page', 'Skill: brag', 'Optional.']];
  const RULES = [
    ['Do', ['Confirm requirements with the customer before generating the BRD.', 'Keep a source (transcript, email, document) on every requirement and decision.', 'Record sign-offs with evidence.', 'Use a change request for anything outside the signed scope.', 'Give every action an owner and a due date.']],
    ['Do not', ['Do not treat an AI draft as final. Read it and fix it.', 'Do not export the organisation package before the BRD is signed off, except as a draft.', 'Do not paste customer passwords or keys into notes, tasks or AI prompts.', 'Do not close a task with a customer question unless the final answer is recorded.']]];
  const key = () => 'fwb_tguide_' + (S.project && S.project.id) + '_' + ((S.user && S.user.id) || '');
  const getDone = () => { try { return new Set(JSON.parse(localStorage.getItem(key()) || '[]')); } catch (e) { return new Set(); } };
  const setDone = s => { try { localStorage.setItem(key(), JSON.stringify([...s])); } catch (e) { } };
  const valid = id => !V.navBase || V.navBase().some(g => g.items.some(i => i[0] === id));
  // Part > Stage > Sub-heading > Page, straight from the menu the sidebar uses
  function menuMap() {
    const nb = V.navBase ? V.navBase() : []; if (!nb.length) return '';
    const sec = {}; const order = []; nb.forEach(g => { const s = g.sec || 'More'; if (!sec[s]) { sec[s] = []; order.push(s); } sec[s].push(g); });
    return order.map(s => `<div class="tg2-part"><h3>${esc(s)}</h3><div class="tg2-stages">${sec[s].map(g => { let last = null; return `<div class="tg2-stage"><h4>${esc(g.g)}</h4>${g.items.map(it => { const sub = it[3] || ''; const head = sub && sub !== last ? `<div class="tg2-lvl">${esc(sub)}</div>` : ''; last = sub || last; return head + `<button type="button" class="tg2-pg" data-act="tgGo" data-view="${esc(it[0])}">${esc(it[1])}</button>`; }).join('')}</div>`; }).join('')}</div></div>`).join('');
  }

  V.teamhelp = {
    html() {
      const done = getDone(); const total = PHASES.reduce((n, p) => n + p[3].length, 0); const got = PHASES.reduce((n, p) => n + p[3].filter(s => done.has(s[0] + ':' + s[1])).length, 0); const pct = Math.round(got / total * 100);
      const head = `<div class="page-header"><div class="t"><h1>Team Guide</h1><p>How to run a Facilio project in Delivery Studio, in the same order as the menu: kick-off, workshops, design, UAT, training, hypercare and closure. Tick a step when it is done for this project.</p></div><div class="row"><button class="btn" data-act="tgReset">Clear ticks</button></div></div>`;
      const prog = `<div class="tg2-prog"><div><b>${got} of ${total}</b> steps done <span class="muted">for this project, on this device</span></div><div class="tg2-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div></div>`;
      const chips = `<nav class="tg2-chips" aria-label="Guide sections"><a href="#tg2-setup" data-act="tgJump" data-id="tg2-setup">Set up Claude</a>${PHASES.map(p => `<a href="#tg2-${p[0]}" data-act="tgJump" data-id="tg2-${p[0]}">${p[0]}. ${esc(p[1].split(' & ')[0].split(',')[0])}</a>`).join('')}<a href="#tg2-run" data-act="tgJump" data-id="tg2-run">Run the project</a><a href="#tg2-with" data-act="tgJump" data-id="tg2-with">With the customer</a><a href="#tg2-map" data-act="tgJump" data-id="tg2-map">Menu map</a><a href="#tg2-rules" data-act="tgJump" data-id="tg2-rules">Working rules</a></nav>`;
      const first = `<section class="tg2-first"><h2>Your first hour</h2><ol><li><b>Set up your Claude</b> with the connector below, so Open in Claude works.</li><li><b>Open Project Overview</b> and read the current phase and what is due next.</li><li><b>Check Contract</b> so you know the scope, fees and dates you are delivering.</li><li><b>Open Tasks</b> and Governance &amp; RAID to see what is already owed and by whom.</li><li><b>Preview as customer</b> once, so you know what they see.</li></ol><div class="row"><button class="btn primary" data-act="tgGo" data-view="overview">Open Project Overview</button><button class="btn" data-act="tgGo" data-view="tasks">Open Tasks</button></div></section>`;
      const setup = `<section class="tg2-box" id="tg2-setup"><h2>Set up your Claude: connector, skills and plugins</h2><p class="tg2-sub">Do this once. It takes about five minutes and makes every Open in Claude button work.</p>
        <div class="tg2-grid">${SETUP.map(s => `<div class="tg2-tile"><b>${esc(s[0])}</b><span>${esc(s[1])}</span>${Array.isArray(s[2]) ? `<span><button type="button" class="btn sm" data-act="tgCopy" data-text="${esc(s[2][1])}">${esc(s[2][0])}</button> <code class="tg2-code">${esc(s[2][1].length > 70 ? s[2][1].slice(0, 67) + '...' : s[2][1])}</code></span>` : s[2] === 'skills' ? '<span><button type="button" class="btn sm" data-act="skillsHelp">Install the skills</button></span>' : ''}</div>`).join('')}</div>
        <h3 class="tg2-h3">Which one for which job</h3><div class="tg2-jobs">${JOBS.map(j => `<div class="tg2-job"><b>${esc(j[0])}</b><em>${esc(j[1])}</em><span>${esc(j[2])}</span></div>`).join('')}</div>
        <div class="row" style="margin-top:12px;gap:8px;flex-wrap:wrap"><button class="btn" data-act="tgGo" data-view="claudesetup">Open Claude setup</button><span class="xs muted" style="align-self:center">Tick "I added the connector" there once it is done. Ask Claude for connector_help to see what it can do.</span></div></section>`;
      const stage = p => { let last = null; return `<section class="tg2-ph" id="tg2-${p[0]}"><header><span class="tg2-n">${p[0]}</span><div><h2>${esc(p[1])}</h2><p>${esc(p[2])}</p></div></header>
        <ul class="tg2-steps">${p[3].map(s => { const k = s[0] + ':' + s[1]; const on = done.has(k); const head = s[3] && s[3] !== last ? `<li class="tg2-lv">${esc(s[3])}</li>` : ''; last = s[3] || last; return head + `<li class="${on ? 'on' : ''}"><label class="tg2-ck"><input type="checkbox" data-change="tgTick" data-k="${esc(k)}"${on ? ' checked' : ''}><span class="sr-only">Done: ${esc(s[1])}</span></label><div><b>${esc(s[1])}</b><span>${esc(s[2])}</span></div>${valid(s[0]) ? `<button class="btn sm" data-act="tgGo" data-view="${esc(s[0])}">Open</button>` : ''}</li>`; }).join('')}</ul>
        <div class="tg2-foot"><div class="tg2-done"><i aria-hidden="true">&#10003;</i><span><b>Done when</b> ${esc(p[4])}</span></div><div class="tg2-warn"><i aria-hidden="true">!</i><span><b>Watch out</b> ${esc(p[5])}</span></div></div></section>`; };
      const run = `<section class="tg2-box" id="tg2-run"><h2>Run the project, every week</h2><p class="tg2-sub">The Project group sits above the stages because you use it all the way through.</p><div class="tg2-grid">${RUN.map(r => `<button type="button" class="tg2-tile" data-act="tgGo" data-view="${r[0]}"><em>${esc(r[3])}</em><b>${esc(r[1])}</b><span>${esc(r[2])}</span></button>`).join('')}</div></section>`;
      const withc = `<section class="tg2-box" id="tg2-with"><h2>Working with the customer</h2><div class="tg2-grid">${WITH.map(w => `<${w[2] ? 'button type="button" data-act="tgGo" data-view="' + w[2] + '"' : 'div'} class="tg2-tile"><b>${esc(w[0])}</b><span>${esc(w[1])}</span></${w[2] ? 'button' : 'div'}>`).join('')}</div></section>`;
      const map = `<section class="tg2-box" id="tg2-map"><h2>The menu at a glance</h2><p class="tg2-sub">Four levels: Part, Stage, Sub-heading, Page. This is the standard menu as it is today; your team's Tabs &amp; Layouts can rename or reorder it per project.</p><div class="tg2-map">${menuMap()}</div></section>`;
      const rules = `<section class="tg2-box" id="tg2-rules"><h2>Working rules</h2><div class="tg2-rules">${RULES.map(r => `<div class="tg2-rule ${r[0] === 'Do' ? 'do' : 'dont'}"><h3>${r[0]}</h3><ul>${r[1].map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div></section>`;
      return head + `<div class="page-body tg2">${prog}${chips}${first}${setup}${PHASES.map(stage).join('')}${run}${withc}${map}${rules}</div>`;
    }
  };
  ACT.tgTick = el => { const s = getDone(); const k = el.getAttribute('data-k'); el.checked ? s.add(k) : s.delete(k); setDone(s); V.render(); };
  ACT.tgReset = () => { setDone(new Set()); V.render(); };
  ACT.tgJump = a => { const e = document.getElementById(a.getAttribute('data-id')); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  ACT.tgCopy = async a => { try { await navigator.clipboard.writeText(a.getAttribute('data-text') || ''); V.toast('Copied'); } catch (e) { V.toast('Copy was blocked. Select the text and copy it by hand.', 4000); } };
  // inside a project the guide is a page. On the projects home (no project open) the same guide shows in place of the project list, with a way back.
  const drawerGo = ACT.tgGo;
  V.homeGuideHtml = () => `<main class="main"><div class="page"><div style="margin:0 0 10px"><button type="button" class="btn sm" data-act="tgBack">&larr; Back to projects</button></div>${V.teamhelp.html()}</div></main>`;
  ACT.tgBack = () => { S.ui.homeGuide = false; V.render(); };
  ACT.tgGo = a => { if (!S.project && drawerGo) { S.ui.homeGuide = false; return drawerGo(a); } if (ACT.closeDrawer) ACT.closeDrawer(); const v = a.getAttribute('data-view'); if (v && V.go) V.go(v); };
  V.teamGuide = () => { if (S.project) return V.go('teamhelp'); S.ui.homeGuide = true; V.render(); try { root.scrollTo(0, 0); } catch (e) { } };
  ACT.teamGuide = () => V.teamGuide();
})(typeof window !== 'undefined' ? window : globalThis);
