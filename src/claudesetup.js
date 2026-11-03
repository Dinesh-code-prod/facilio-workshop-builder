/* Claude setup: one page in the Help group with everything about Claude for this project. Connect (the connector, the project id, ready-made lines, whether it has been seen),
   Facilio skills (the toolbox setup guide, src/implskills.js), and How it works (what Open in Claude does, what to ask). The parts are built in src/claudehand.js and src/implskills.js. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const TABS = [['connect', '1. Connect Claude'], ['skills', '2. Facilio skills'], ['how', '3. How it works']];
  const card = (h, b) => `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>${h}</h3></div><div class="card-b">${b}</div></div>`;
  const ASK = ['Where are we on this project? What is overdue and what is at risk?', 'What are the open questions and the requirements still in Draft?', 'Which UAT test cases failed, and what is blocking go-live?', 'Draft the UAT plan for the modules in scope.', 'Which Facilio skill fits this deliverable, and how do I start it?', 'Summarise the open tickets, including the ones that came in by e-mail.'];
  const body = tab => {
    if (tab === 'skills') return V.implSkillsHtml ? V.implSkillsHtml() : '';
    if (tab === 'how') return card('What Open in Claude does', `<ul class="small" style="line-height:1.7;margin:0 0 0 18px"><li>It opens Claude with this project and the page you were on. Claude confirms the project with you and asks what you need if it is not clear.</li><li>With the connector, Claude reads the project itself (requirements, UAT, tickets, risks, tasks, org id). It never asks you to paste what the project already holds.</li><li>Anything Claude writes comes back as an <b>unapproved draft</b> that a person confirms here.</li><li>It runs as you, with your project access, on your own Claude plan. Pictures cannot go through the connector: use Copy the image.</li><li>Without the connector the full prompt is copied instead, and you paste Claude's reply back.</li></ul>`)
      + card('Things to ask once the connector is added', `<ul class="small" style="line-height:1.8;margin:0 0 6px 18px">${ASK.map(q => `<li>${esc(q)}</li>`).join('')}</ul><p class="xs muted" style="margin:0">Name the project (or paste the project name and id from the Connect tab). Ask Claude for <code>connector_help</code> to see everything it can do.</p>`);
    return card('Connect Claude to this project', V.claudeProjectHtml ? V.claudeProjectHtml() : '');
  };
  ACT.clTab = a => { S.ui.clTab = a.getAttribute('data-v'); V.render(); };
  V.claudesetup = {
    html() {
      if (!S.project) return `<div class="page-header"><div class="t"><h1>Claude setup</h1><p>Open a project first.</p></div></div>`;
      const tab = TABS.some(t => t[0] === S.ui.clTab) ? S.ui.clTab : 'connect';
      return `<div class="page-header"><div class="t"><h1>Claude setup</h1><p>Everything about Claude for this project in one place: add the connector once, install the Facilio skills if you use them, then use Open in Claude on any page.</p></div></div>
        <div class="tabs">${TABS.map(([k, l]) => `<button class="tab${tab === k ? ' active' : ''}" data-act="clTab" data-v="${k}">${esc(l)}</button>`).join('')}</div><div class="page-body">${body(tab)}</div>`;
    },
    mount() { if ((S.ui.clTab || 'connect') === 'connect' && V.claudeConnCheck) V.claudeConnCheck(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
