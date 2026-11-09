/* Learn & Prepare: the first thing a customer reads before the requirement sessions. Plain language, no project data beyond the customer's name:
   what Facilio is, how the project runs, how to get ready for a session, what to bring, and the words they will hear. The team sees the same page
   (it is part of the customer view). Links go to pages that already exist: schedule, guide, dashboards, contract. Nothing here is stored.
   Three short tabs (Start here, Get ready, Words) so nobody meets one long page; the checklist ticks live only on the screen. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const STAGES = [
    ['Kick-off', 'We agree the goals, the people and the plan. You confirm who joins which session.'],
    ['Requirement sessions', 'Workshops where you show us how work is done today. You confirm what we heard.'],
    ['Design and configuration', 'We set Facilio up from what you confirmed. You review the design and the forms.'],
    ['Testing and go-live', 'Your team tries the real scenarios (UAT) and signs off. Then we go live together.'],
    ['Support and handover', 'We stay close while your team settles in, then hand over the guides and the support route.']
  ];
  const CHECK = [
    'Read the topic of the session in the Workshop Schedule.',
    'Bring the people who do this work every day, not only managers.',
    'Collect examples: a recent work order, a form, a report, a spreadsheet.',
    'Write down what goes wrong today. This is the most useful input we get.',
    'Note who approves what, and how fast it must happen.',
    'After the session, check the summary we share and tell us what is wrong.'
  ];
  const BRING = [
    ['Sites and locations', 'The buildings, floors and areas you maintain.'],
    ['Assets', 'A list or export of equipment, with the fields you track.'],
    ['People and roles', 'Who raises requests, who works on them, who approves.'],
    ['Your process today', 'How a request becomes a closed job, even if it is on paper.'],
    ['Approvals and SLAs', 'Who signs off, and the response and fix times you promise.'],
    ['Reports you use', 'The reports and dashboards your managers look at.'],
    ['Vendors and teams', 'Contractors, crafts and shifts that take jobs.']
  ];
  const WORDS = [
    ['Work order', 'A job to be done, from the request to the closed record.'],
    ['Asset', 'A piece of equipment or a space you maintain.'],
    ['PPM', 'Planned preventive maintenance: jobs created on a schedule.'],
    ['Service request', 'A request raised by a tenant, guest or colleague.'],
    ['Stateflow', 'The steps a record moves through, such as Assigned, In progress, Closed.'],
    ['Role', 'What a person is allowed to see and do.'],
    ['SLA', 'The response and fix time you commit to.'],
    ['Approval', 'A decision someone must give before a record moves on.'],
    ['Form', 'The screen where information is captured.'],
    ['UAT', 'User acceptance testing: your team checks Facilio against real scenarios.']
  ];
  const TABS = [['start', 'Start here'], ['prepare', 'Get ready'], ['words', 'Words you will hear']];
  const isC = () => !!(V.isCustomer && V.isCustomer());
  const tab = () => (TABS.find(t => t[0] === S.ui.prTab) || TABS[0])[0];
  const done = () => (S.ui.prDone = S.ui.prDone || {});
  // customers and the team reach the same content through different pages
  const VIEW = { schedule: ['msaflow', 'schedule'], plan: ['plan', 'timeline'], contract: ['msaflow', 'contract'] };
  const go = (view, label, note) => { view = VIEW[view] ? VIEW[view][isC() ? 1 : 0] : view; return `<button class="btn" data-act="nav" data-view="${view}">${esc(label)}</button>${note ? `<span class="small muted">${esc(note)}</span>` : ''}` };
  const start = cust => `<div class="card" style="padding:22px"><div class="sec-k"><p>Two minutes</p><h2>What Facilio is</h2></div>
      <p style="max-width:40em;margin:0 0 14px">Facilio is where your team manages assets, work orders, planned maintenance, service requests, inspections and reports. This project sets it up around how <b>${esc(cust)}</b> works.</p>
      <div class="row" style="gap:10px;flex-wrap:wrap">${ACT.replayRoadmap ? '<button class="btn primary" data-act="replayRoadmap">Watch the project journey</button>' : ''}${go('guide', 'Open the user guide')}${go('dashboards', 'See example dashboards')}</div></div>
    <div class="sec-k" style="margin-top:24px"><p>The road ahead</p><h2>Five steps, and what we ask of you</h2></div>
    <ol class="pr-steps">${STAGES.map((s, i) => `<li><span class="pr-n">${i + 1}</span><div><b>${esc(s[0])}</b><div class="small muted">${esc(s[1])}</div></div></li>`).join('')}</ol>`;
  const prepare = () => { const d = done(); const n = CHECK.filter((c, i) => d['c' + i]).length;
    return `<div class="grid g2"><div class="card" style="padding:20px"><div class="sec-k"><p>Before each session</p><h2>Your checklist</h2></div><div class="small muted" style="margin-bottom:8px">${n} of ${CHECK.length} ticked (kept only on this screen)</div>
      ${CHECK.map((c, i) => `<label class="pr-chk"><input type="checkbox" data-change="prTick" data-k="c${i}" ${d['c' + i] ? 'checked' : ''}> <span>${esc(c)}</span></label>`).join('')}
      <div class="row" style="gap:10px;flex-wrap:wrap;margin-top:12px">${go('schedule', 'See the session schedule')}</div></div>
    <div class="card" style="padding:20px"><div class="sec-k"><p>It saves time</p><h2>What to bring</h2></div>${BRING.map(b => `<div class="pr-bring"><b>${esc(b[0])}</b><span class="small muted">${esc(b[1])}</span></div>`).join('')}</div></div>
    ${V.msaQuestions ? V.msaQuestions.card() : ''}
    <div class="card" style="padding:16px;margin-top:18px"><b>Questions at any time?</b> <span class="small">Ask your Facilio consultant, or raise it in the next session.</span><div class="row" style="gap:10px;flex-wrap:wrap;margin-top:8px">${go('contract', 'Your contract')}${go('plan', 'The project plan')}</div></div>`; };
  const words = () => `<div class="card" style="padding:8px 20px">${WORDS.map(w => `<details class="pr-w"><summary><b>${esc(w[0])}</b></summary><p class="small muted" style="margin:4px 0 10px">${esc(w[1])}</p></details>`).join('')}</div>`;
  V.prepare = {
    html() {
      const cust = (S.project && S.project.customer) || 'your team'; const t = tab();
      return `<div class="page-header"><div class="t"><h1>Learn &amp; Prepare</h1><p>What ${esc(cust)} needs before the requirement sessions, one short step at a time.</p></div></div>
      <div class="page-body"><div class="seg" role="tablist" aria-label="Learn and prepare" style="margin:0 0 18px">${TABS.map(x => `<button type="button" role="tab" class="${x[0] === t ? 'on' : ''}" aria-selected="${x[0] === t}" data-act="prTab" data-v="${x[0]}">${esc(x[1])}</button>`).join('')}</div>
      ${t === 'start' ? start(cust) : t === 'prepare' ? prepare() : words()}</div>`;
    }
  };
  ACT.prTab = a => { S.ui.prTab = a.getAttribute('data-v'); V.render(); };
  ACT.prTick = el => { done()[el.getAttribute('data-k')] = el.checked; V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);
