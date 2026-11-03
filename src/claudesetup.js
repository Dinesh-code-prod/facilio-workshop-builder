/* Claude setup: one page in the Help group with everything about Claude for this project. Connect (the connector, the project id, ready-made lines, whether it has been seen),
   Facilio skills (the toolbox setup guide, src/implskills.js), and How it works (what Open in Claude does, what to ask). The parts are built in src/claudehand.js and src/implskills.js. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  const TABS = [['connect', '1. Connect Claude'], ['skills', '2. Facilio skills'], ['how', '3. How it works'], ['answers', '4. Answers waiting']];
  const API = root.FWBApi; const toast = (...a) => V.toast && V.toast(...a); let AW = null;   // answers Claude finished while the page was not waiting (kept a day on the server)
  const card = (h, b) => `<div class="card" style="margin-bottom:14px"><div class="card-h"><h3>${h}</h3></div><div class="card-b">${b}</div></div>`;
  const ASK = ['Where are we on this project? What is overdue and what is at risk?', 'What are the open questions and the requirements still in Draft?', 'Which UAT test cases failed, and what is blocking go-live?', 'Draft the UAT plan for the modules in scope.', 'Which Facilio skill fits this deliverable, and how do I start it?', 'Summarise the open tickets, including the ones that came in by e-mail.'];
  const answers = () => {
    if (AW === null) return card('Answers waiting', '<div class="small muted">Loading…</div>');
    if (AW.error) return card('Answers waiting', `<div class="notice warn small">${esc(AW.error)}</div>`);
    if (!AW.length) return card('Answers waiting', '<p class="small muted" style="margin:0">Nothing is waiting. When Claude finishes a task after you closed its panel, the answer is kept here for a day.</p>');
    return card('Answers waiting', `<p class="small" style="margin-top:0">Claude finished these while the page was not waiting. Copy an answer, or save it as an unapproved draft in Deliverables &amp; AI.</p>${AW.map(a => `<div class="row" style="gap:8px;padding:8px 0;border-top:1px solid #eef1f7;align-items:center"><div style="flex:1"><b>${esc(a.title || 'Task')}</b><div class="xs muted">${esc(a.task || '')} · kept until ${esc(new Date(a.until).toLocaleString())}</div></div><button type="button" class="btn sm" data-act="clAnsCopy" data-id="${esc(a.id)}">Copy answer</button><button type="button" class="btn sm primary" data-act="clAnsSave" data-id="${esc(a.id)}" data-task="${esc(a.task || '')}">Save as draft</button></div>`).join('')}`);
  };
  const body = tab => {
    if (tab === 'answers') return answers();
    if (tab === 'skills') return V.implSkillsHtml ? V.implSkillsHtml() : '';
    if (tab === 'how') return card('What Open in Claude does', `<ul class="small" style="line-height:1.7;margin:0 0 0 18px"><li>It opens Claude with this project and the page you were on. Claude confirms the project with you and asks what you need if it is not clear.</li><li>With the connector, Claude reads the project itself (requirements, UAT, tickets, risks, tasks, org id). It never asks you to paste what the project already holds.</li><li>Anything Claude writes comes back as an <b>unapproved draft</b> that a person confirms here.</li><li>It runs as you, with your project access, on your own Claude plan. Pictures cannot go through the connector: use Copy the image.</li><li>Without the connector the full prompt is copied instead, and you paste Claude's reply back.</li></ul>`)
      + card('Things to ask once the connector is added', `<ul class="small" style="line-height:1.8;margin:0 0 6px 18px">${ASK.map(q => `<li>${esc(q)}</li>`).join('')}</ul><p class="xs muted" style="margin:0">Name the project (or paste the project name and id from the Connect tab). Ask Claude for <code>connector_help</code> to see everything it can do.</p>`);
    return card('Connect Claude to this project', V.claudeProjectHtml ? V.claudeProjectHtml() : '');
  };
  ACT.clTab = a => { S.ui.clTab = a.getAttribute('data-v'); if (S.ui.clTab === 'answers') AW = null; V.render(); };
  const answerText = async id => { const g = await API.get(`/api/projects/${S.project.id}/handoff/${id}`); if (g.status !== 'done' || !g.result) throw new Error('That answer is no longer available.'); return g.result; };
  ACT.clAnsCopy = a => V.busy(a, async () => { try { const ok = V.claudeCopy ? await V.claudeCopy(await answerText(a.getAttribute('data-id'))) : false; toast(ok ? 'Answer copied' : 'Copy was blocked by the browser', 3000, !ok); } catch (e) { toast(e.message, 5000, true); } });
  ACT.clAnsSave = a => V.busy(a, async () => { try { await API.post(`/api/projects/${S.project.id}/ai/import`, { task: a.getAttribute('data-task'), content: await answerText(a.getAttribute('data-id')) }); toast('Saved as an unapproved draft in Deliverables & AI', 5000); } catch (e) { toast(e.message || 'It could not be saved as a draft', 6000, true); } });
  V.claudesetup = {
    html() {
      if (!S.project) return `<div class="page-header"><div class="t"><h1>Claude setup</h1><p>Open a project first.</p></div></div>`;
      const tab = TABS.some(t => t[0] === S.ui.clTab) ? S.ui.clTab : 'connect';
      return `<div class="page-header"><div class="t"><h1>Claude setup</h1><p>Everything about Claude for this project in one place: add the connector once, install the Facilio skills if you use them, then use Open in Claude on any page.</p></div></div>
        <div class="tabs">${TABS.map(([k, l]) => `<button class="tab${tab === k ? ' active' : ''}" data-act="clTab" data-v="${k}">${esc(l)}</button>`).join('')}</div><div class="page-body">${body(tab)}</div>`;
    },
    mount() { const t = S.ui.clTab || 'connect'; if (t === 'connect' && V.claudeConnCheck) V.claudeConnCheck(); if (t === 'answers' && AW === null && S.project) { AW = []; AW.pending = true; API.get(`/api/projects/${S.project.id}/handoffs`).then(r => { AW = r.answers || []; V.render(); }).catch(e => { AW = []; AW.error = e.message || 'The list could not be read.'; V.render(); }); } }
  };
})(typeof window !== 'undefined' ? window : globalThis);
