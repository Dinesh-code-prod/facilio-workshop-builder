/* Learn & Prepare: the first thing a customer reads before the requirement sessions. Plain language, no project data beyond the customer's name:
   what Facilio is, how the project runs, how to get ready for a session, what to bring, and the words they will hear. The team sees the same page
   (it is part of the customer view). Links go to pages that already exist: schedule, guide, dashboards, contract. Nothing here is stored. */
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
  const isC = () => !!(V.isCustomer && V.isCustomer());
  // customers and the team reach the same content through different pages
  const VIEW = { schedule: ['msaflow', 'schedule'], plan: ['plan', 'timeline'], contract: ['msaflow', 'contract'] };
  const go = (view, label, note) => { view = VIEW[view] ? VIEW[view][isC() ? 1 : 0] : view; return `<button class="btn" data-act="nav" data-view="${view}">${esc(label)}</button>${note ? `<span class="small muted">${esc(note)}</span>` : ''}` };
  V.prepare = {
    html() {
      const cust = (S.project && S.project.customer) || 'your team';
      const hasJourney = !!ACT.replayRoadmap;
      return `<div class="page-header"><div class="t"><h1>Learn &amp; Prepare</h1><p>Everything ${esc(cust)} needs to know before the requirement sessions. About five minutes to read.</p></div></div>
      <div class="page-body">
        <div class="card" style="padding:18px"><div class="sec-k"><p>Start here</p><h2>What Facilio is</h2></div>
          <p>Facilio is the platform your facilities team will use to manage assets, work orders, planned maintenance, service requests, inspections and reports in one place. This project sets it up around how <b>${esc(cust)}</b> works.</p>
          <div class="row" style="gap:10px;flex-wrap:wrap;margin-top:8px">${hasJourney ? '<button class="btn" data-act="replayRoadmap">Watch the project journey</button>' : ''}${go('guide', 'Open the user guide')}${go('dashboards', 'See example dashboards')}</div></div>
        <div class="sec-k" style="margin-top:22px"><p>The road ahead</p><h2>How the project runs</h2></div>
        <div class="grid g3">${STAGES.map((s, i) => `<div class="card" style="padding:14px"><div class="xs muted">Step ${i + 1}</div><h3 style="margin:2px 0 6px">${esc(s[0])}</h3><p class="small">${esc(s[1])}</p></div>`).join('')}</div>
        <div class="grid g2" style="margin-top:22px">
          <div class="card" style="padding:18px"><div class="sec-k"><p>For every session</p><h2>How to prepare</h2></div><ol class="small" style="padding-left:18px;line-height:1.7">${CHECK.map(c => `<li>${esc(c)}</li>`).join('')}</ol>
            <div class="row" style="gap:10px;flex-wrap:wrap;margin-top:8px">${go('schedule', 'See the session schedule')}</div></div>
          <div class="card" style="padding:18px"><div class="sec-k"><p>It saves time</p><h2>What to bring</h2></div><ul class="small" style="padding-left:18px;line-height:1.7">${BRING.map(b => `<li><b>${esc(b[0])}</b>: ${esc(b[1])}</li>`).join('')}</ul></div>
        </div>
        ${V.msaQuestions ? V.msaQuestions.card() : ''}
        <div class="sec-k" style="margin-top:22px"><p>No jargon</p><h2>Words you will hear</h2></div>
        <div class="grid g2">${WORDS.map(w => `<div class="card" style="padding:12px 14px"><b>${esc(w[0])}</b><div class="small muted">${esc(w[1])}</div></div>`).join('')}</div>
        <div class="card" style="padding:16px;margin-top:22px"><b>Questions at any time?</b> <span class="small">Ask your Facilio consultant. Anything you are unsure of is a good thing to raise in the next session.</span>
          <div class="row" style="gap:10px;flex-wrap:wrap;margin-top:8px">${go('contract', 'Your contract')}${go('plan', 'The project plan')}</div></div>
      </div>`;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
