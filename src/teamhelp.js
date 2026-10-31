/* Team Guide: a page (not a drawer) that walks a Facilio teammate through a project in the same order as the menu, from kick-off to hypercare and closure.
   Each stage says what to do, which page to open, what "done" looks like and what to watch for. The tick-boxes are kept per person and project in this browser. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  // [stage, group in the menu, goal, [[page id, label, how]], done when, watch out]
  const PHASES = [
    ['1', 'Kick-off & Planning', 'Agree what is being delivered, by when, and who does what.', [
      ['msaflow', 'Contract', 'Upload the MSA and order form. Check the extracted scope, fees and dates before you rely on them.'],
      ['kickoff', 'Kick-off Deck', 'Build the deck from the contract and present it. Record who attended.'],
      ['plan', 'Project Plan', 'Import the plan workbook. The timeline, "current phase" and reminders all read from it.']],
      'The customer has seen the scope and plan, and the plan has dates.', 'Plan dates drive every reminder. A plan with no dates means nothing is ever "late".'],
    ['2', 'Workshops & Requirements', 'Turn conversations into requirements the customer has confirmed.', [
      ['transcripts', 'Transcripts & Requirements', 'Paste or upload each workshop transcript. Requirements are pulled out as drafts for you to confirm.'],
      ['usecases', 'Use Cases', 'Group confirmed requirements into the business scenarios the customer will recognise.'],
      ['checks', 'Checks & Validation', 'Fix conflicts, gaps and missing sources before moving on.']],
      'Every requirement is Confirmed or Rejected. Nothing stays Draft.', 'A requirement with no source is a guess. Keep the transcript link on each one.'],
    ['3', 'Solution Design & Configuration', 'Design the system from confirmed requirements and get the BRD signed.', [
      ['brd', 'BRD Draft', 'Generate the BRD from confirmed requirements, review it, then ask the customer to sign off.'],
      ['modules', 'System Modules & Form Builder', 'Define modules and fields. New fields come from requirements, not from memory.'],
      ['flow', 'State Flow Builder', 'Draw each module\'s statuses and transitions, with who may press each button.'],
      ['cfginputs', 'Configuration Inputs', 'Collect the values the customer must provide (sites, teams, SLAs).'],
      ['roles', 'Roles & Access', 'Map people to roles and what each role can see and do.'],
      ['notifications', 'Notifications', 'Say who is told what and when. Email rules are written into the package.'],
      ['onboarding', 'Data Onboarding', 'Send data sheets, validate what comes back, ask for fixes.']],
      'The BRD is signed off and the configuration matches it.', 'Sign-off counts only when the customer signs or you record the evidence. Exporting a document is never sign-off.'],
    ['4', 'UAT & Go-Live', 'Prove it works for the customer and launch.', [
      ['delivery', 'Build, UAT & Go-Live', 'Run the build checklist, log UAT findings and defects, track fixes to retest.'],
      ['ftr', 'FTR Report', 'Import the FTR workbook and map its columns.'],
      ['kpi', 'KPI Workbooks', 'Prepare the KPI workbooks the customer will report on.']],
      'UAT sign-off is recorded and the go-live checklist is complete.', 'Do not start go-live with open critical defects. Raise them in Governance.'],
    ['5', 'Training & Guides', 'Leave the customer able to run it without you.', [
      ['guidebuilder', 'User Guide Builder', 'Write guides one section at a time from the confirmed configuration. Review before publishing.'],
      ['vstudio', 'Guides & Video Studio', 'Create a video or walkthrough brief from the customer\'s own fields and flows.'],
      ['vidguide', 'Video Guide', 'Turn a screen recording into a step-by-step guide.'],
      ['resources', 'Resources', 'Keep the files and links the customer needs in one place.']],
      'Customers have the guides they need and training dates are set.', 'AI drafts need a human read. Check every screen name against the real configuration.'],
    ['6', 'Hypercare, Handover & Closure', 'Stay close after launch, then hand over cleanly.', [
      ['hypercare', 'Hypercare', 'Log issues raised after launch and their fixes. Share the status.'],
      ['handover', 'Handover & Closure', 'Record who owns what, hand over to support, review lessons learned, close the project.']],
      'Support owns the steady state and the project is formally closed.', 'Closing with open actions loses the history. Close or move every open item first.']
  ];
  const RUN = [
    ['governance', 'Governance & RAID', 'Sign-offs, risks, decisions, actions and minutes, shared with the customer.'],
    ['changes', 'Change Requests', 'Anything outside the signed scope. Never change scope silently.'],
    ['tasks', 'Tasks', 'One register for everything to do. List view or Board view: drag a card to change its status.'],
    ['aiwork', 'Deliverables & AI', 'Draft documents with AI, or with Open in Claude on your own account. Drafts are never final until reviewed.'],
    ['reports', 'Status Reports', 'Weekly and monthly reports, prepared and tracked here.']];
  const WITH = [
    ['Preview as customer', 'The button at the top shows exactly what the customer sees. Nothing is saved while previewing. Use it before every customer meeting.', null],
    ['Customer View menu', 'Switch on only the pages the customer needs. Product Tour, Module guides and Discover more are good for sessions.', 'custintro'],
    ['Discover more', 'Facilio modules outside the contract. When the customer taps "I am interested" you get an action to follow up.', 'explore']];
  const RULES = [
    ['Do', ['Confirm requirements with the customer before generating the BRD.', 'Keep a source (transcript, email, document) on every requirement and decision.', 'Record sign-offs with evidence.', 'Use a change request for anything outside the signed scope.', 'Give every action an owner and a due date.']],
    ['Do not', ['Do not treat an AI draft as final. Read it and fix it.', 'Do not export the organisation package before the BRD is signed off, except as a draft.', 'Do not paste customer passwords or keys into notes, tasks or AI prompts.', 'Do not close a task with a customer question unless the final answer is recorded.']]];
  const key = () => 'fwb_tguide_' + (S.project && S.project.id) + '_' + ((S.user && S.user.id) || '');
  const getDone = () => { try { return new Set(JSON.parse(localStorage.getItem(key()) || '[]')); } catch (e) { return new Set(); } };
  const setDone = s => { try { localStorage.setItem(key(), JSON.stringify([...s])); } catch (e) { } };
  const valid = id => !V.navBase || V.navBase().some(g => g.items.some(i => i[0] === id)) || ['governance', 'changes', 'tasks', 'aiwork', 'reports'].includes(id);

  V.teamhelp = {
    html() {
      const done = getDone(); const total = PHASES.reduce((n, p) => n + p[3].length, 0); const got = PHASES.reduce((n, p) => n + p[3].filter(s => done.has(s[0] + ':' + s[1])).length, 0); const pct = Math.round(got / total * 100);
      const head = `<div class="page-header"><div class="t"><h1>Team Guide</h1><p>How to run a Facilio project in Delivery Studio, in the same order as the menu: kick-off, workshops, design, UAT, training, hypercare and closure. Tick a step when it is done for this project.</p></div><div class="row"><button class="btn" data-act="tgReset">Clear ticks</button></div></div>`;
      const prog = `<div class="tg2-prog"><div><b>${got} of ${total}</b> steps done <span class="muted">for this project, on this device</span></div><div class="tg2-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div></div>`;
      const chips = `<nav class="tg2-chips" aria-label="Guide sections">${PHASES.map(p => `<a href="#tg2-${p[0]}" data-act="tgJump" data-id="tg2-${p[0]}">${p[0]}. ${esc(p[1].split(' & ')[0].split(',')[0])}</a>`).join('')}<a href="#tg2-run" data-act="tgJump" data-id="tg2-run">Run the project</a><a href="#tg2-with" data-act="tgJump" data-id="tg2-with">With the customer</a><a href="#tg2-rules" data-act="tgJump" data-id="tg2-rules">Working rules</a></nav>`;
      const first = `<section class="tg2-first"><h2>Your first hour</h2><ol><li><b>Open Project Overview</b> and read the current phase and what is due next.</li><li><b>Check Contract</b> so you know the scope, fees and dates you are delivering.</li><li><b>Open Tasks</b> and Governance &amp; RAID to see what is already owed and by whom.</li><li><b>Preview as customer</b> once, so you know what they see.</li></ol><div class="row"><button class="btn primary" data-act="tgGo" data-view="overview">Open Project Overview</button><button class="btn" data-act="tgGo" data-view="tasks">Open Tasks</button></div></section>`;
      const stage = p => `<section class="tg2-ph" id="tg2-${p[0]}"><header><span class="tg2-n">${p[0]}</span><div><h2>${esc(p[1])}</h2><p>${esc(p[2])}</p></div></header>
        <ul class="tg2-steps">${p[3].map(s => { const k = s[0] + ':' + s[1]; const on = done.has(k); return `<li class="${on ? 'on' : ''}"><label class="tg2-ck"><input type="checkbox" data-change="tgTick" data-k="${esc(k)}"${on ? ' checked' : ''}><span class="sr-only">Done: ${esc(s[1])}</span></label><div><b>${esc(s[1])}</b><span>${esc(s[2])}</span></div>${valid(s[0]) ? `<button class="btn sm" data-act="tgGo" data-view="${esc(s[0])}">Open</button>` : ''}</li>`; }).join('')}</ul>
        <div class="tg2-foot"><div class="tg2-done"><i aria-hidden="true">&#10003;</i><span><b>Done when</b> ${esc(p[4])}</span></div><div class="tg2-warn"><i aria-hidden="true">!</i><span><b>Watch out</b> ${esc(p[5])}</span></div></div></section>`;
      const run = `<section class="tg2-box" id="tg2-run"><h2>Run the project, every week</h2><p class="tg2-sub">These pages sit above the stages because you use them all the way through.</p><div class="tg2-grid">${RUN.map(r => `<button type="button" class="tg2-tile" data-act="tgGo" data-view="${r[0]}"><b>${esc(r[1])}</b><span>${esc(r[2])}</span></button>`).join('')}</div></section>`;
      const withc = `<section class="tg2-box" id="tg2-with"><h2>Working with the customer</h2><div class="tg2-grid">${WITH.map(w => `<${w[2] ? 'button type="button" data-act="tgGo" data-view="' + w[2] + '"' : 'div'} class="tg2-tile"><b>${esc(w[0])}</b><span>${esc(w[1])}</span></${w[2] ? 'button' : 'div'}>`).join('')}</div></section>`;
      const rules = `<section class="tg2-box" id="tg2-rules"><h2>Working rules</h2><div class="tg2-rules">${RULES.map(r => `<div class="tg2-rule ${r[0] === 'Do' ? 'do' : 'dont'}"><h3>${r[0]}</h3><ul>${r[1].map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div></section>`;
      return head + `<div class="page-body tg2">${prog}${chips}${first}${PHASES.map(stage).join('')}${run}${withc}${rules}</div>`;
    }
  };
  ACT.tgTick = el => { const s = getDone(); const k = el.getAttribute('data-k'); el.checked ? s.add(k) : s.delete(k); setDone(s); V.render(); };
  ACT.tgReset = () => { setDone(new Set()); V.render(); };
  ACT.tgJump = a => { const e = document.getElementById(a.getAttribute('data-id')); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  // inside a project the guide is a page. On the projects home (no project open) the same guide shows in place of the project list, with a way back.
  const drawerGo = ACT.tgGo;
  V.homeGuideHtml = () => `<main class="main"><div class="page"><div style="margin:0 0 10px"><button type="button" class="btn sm" data-act="tgBack">&larr; Back to projects</button></div>${V.teamhelp.html()}</div></main>`;
  ACT.tgBack = () => { S.ui.homeGuide = false; V.render(); };
  ACT.tgGo = a => { if (!S.project && drawerGo) { S.ui.homeGuide = false; return drawerGo(a); } if (ACT.closeDrawer) ACT.closeDrawer(); const v = a.getAttribute('data-view'); if (v && V.go) V.go(v); };
  V.teamGuide = () => { if (S.project) return V.go('teamhelp'); S.ui.homeGuide = true; V.render(); try { root.scrollTo(0, 0); } catch (e) { } };
  ACT.teamGuide = () => V.teamGuide();
})(typeof window !== 'undefined' ? window : globalThis);
