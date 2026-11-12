/* Admin assistant (Admin > Assistant): a chat over the whole portfolio for administrators, not one project.
   Answers come from the computed portfolio (POST /api/admin/assistant/ask: health, signals with evidence, workload) by DeepSeek, at once.
   What needs attention now is listed on top (GET /api/admin/alerts). Reminders to project owners go out through Otto (Teams) and the bell only when the
   admin presses Send (POST /api/admin/assistant/nudge). "Ask Claude" copies a connector prompt for deeper work in the admin's own Claude. */
(function (root) {
  'use strict';
  const F = root.FWB; const { esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi;
  const T = { msgs: [], alerts: null, busy: false, loaded: false };
  const md = t => (V.md ? V.md(t) : esc(t).replace(/\n/g, '<br>'));
  const SUGGEST = ['Which projects need my attention this week?', 'Who has the most overdue tasks?', 'Which projects are waiting on the customer?', 'Remind the owners of the late projects'];
  function alertsHtml() {
    const a = T.alerts; if (!a) return '<p class="small muted">Loading what needs attention…</p>';
    const top = a.alerts || []; const c = a.counts || {};
    return '<div class="aa-alerts"><div class="aa-ah"><b>Needs attention now</b><span class="xs muted">' + (c.critical || 0) + ' critical · ' + (c.high || 0) + ' high · ' + (c.blocked || 0) + ' blocked · ' + (c.overdue || 0) + ' overdue' + (a.aiFailsToday ? ' · ' + a.aiFailsToday + ' AI calls failed today' : '') + '</span></div>'
      + (top.length ? '<ul class="aa-list">' + top.map(x => '<li><span class="aa-sev ' + esc(x.sev) + '">' + esc(x.sev) + '</span><div><b>' + esc(x.project) + '</b>: ' + esc(x.title) + '<div class="xs muted">' + esc(x.action) + (x.owner ? ' · Owner: ' + esc(x.owner) : '') + '</div></div></li>').join('') + '</ul>' : '<p class="small muted" style="margin:6px 0 0">Nothing critical or high across the active projects.</p>') + '</div>';
  }
  function msgHtml(m, i) {
    if (m.who === 'you') return '<div class="aa-m you"><div class="aa-b">' + esc(m.text) + '</div></div>';
    const acts = (m.actions || []).map((x, j) => '<button class="btn sm primary" data-act="aaNudge" data-i="' + i + '" data-j="' + j + '">' + esc(x.label) + '</button>').join('');
    return '<div class="aa-m ai' + (m.bad ? ' bad' : '') + '"><div class="aa-via">' + esc(m.via || 'DeepSeek') + '</div><div class="aa-b">' + (m.typing ? '<span class="muted">' + esc(m.text) + '</span>' : md(m.text)) + '</div>'
      + (m.typing || m.bad ? '' : '<div class="aa-acts">' + acts + (m.claudePrompt ? '<button class="btn sm" data-act="aaClaude" data-i="' + i + '">Ask Claude to go deeper</button>' : '') + '</div>') + '</div>';
  }
  function html() {
    return '<div class="adm-card aa-card">' + alertsHtml() + '</div><div class="adm-card aa-card"><div class="adm-h"><h3>Ask about your portfolio</h3><span class="muted xs">Across every project you oversee · answers from the project records, never one customer\'s data in another\'s answer</span></div>'
      + '<div class="aa-thread" id="aaThread">' + (T.msgs.length ? T.msgs.map(msgHtml).join('') : '<div class="aa-sugg">' + SUGGEST.map(q => '<button class="btn sm" data-act="aaAsk" data-q="' + esc(q) + '">' + esc(q) + '</button>').join('') + '</div>') + '</div>'
      + '<div class="aa-in"><textarea id="aaM" rows="2" placeholder="Ask about projects, owners, risks, overdue work, customers…" aria-label="Ask the admin assistant"></textarea><button class="btn primary" data-act="aaSend"' + (T.busy ? ' disabled' : '') + '>Send</button></div>'
      + '<p class="xs muted" style="margin:8px 0 0">DeepSeek answers from the portfolio health the Studio computes. Reminders go to project owners through Otto (Teams) and the bell only when you press Send. For deeper work, Ask Claude copies a prompt for your own Claude with the Studio connector.</p></div>';
  }
  const paint = () => { if (V.adminShow) V.adminShow(); else V.render(); const th = document.getElementById('aaThread'); if (th) th.scrollTop = th.scrollHeight; };
  async function load() { if (T.loaded) return; T.loaded = true; try { T.alerts = await API.get('/api/admin/alerts', { noAuthRedirect: true }); } catch (e) { T.alerts = { alerts: [], counts: {}, error: e.message }; } paint(); }
  async function ask(q) {
    q = String(q || '').trim(); if (!q || T.busy) return; T.busy = true; T.msgs.push({ who: 'you', text: q }); const wait = { who: 'ai', via: 'DeepSeek', text: 'Reading the portfolio…', typing: true }; T.msgs.push(wait); paint();
    try { const r = await API.post('/api/admin/assistant/ask', { message: q.slice(0, 800), history: T.msgs.filter(m => !m.typing && m !== wait).slice(-6).map(m => ({ who: m.who === 'you' ? 'you' : 'assistant', text: String(m.text).slice(0, 300) })) });
      Object.assign(wait, { typing: false, text: r.text + (r.notice ? '\n\n' + r.notice : ''), via: r.provider || 'DeepSeek', actions: r.actions || [], claudePrompt: r.claudePrompt || '' }); }
    catch (e) { Object.assign(wait, { typing: false, bad: true, text: 'The assistant could not answer: ' + (e.message || 'try again') }); }
    T.busy = false; paint();
  }
  ACT.aaSend = () => { const b = document.getElementById('aaM'); const q = b ? b.value : ''; if (b) b.value = ''; return ask(q); };
  ACT.aaAsk = a => ask(a.getAttribute('data-q'));
  ACT.aaClaude = async a => { const m = T.msgs[+a.getAttribute('data-i')]; if (!m || !m.claudePrompt) return; const okc = V.claudeCopy ? await V.claudeCopy(m.claudePrompt) : false; V.toast(okc ? 'Prompt copied. Paste it in your Claude (with the Delivery Studio connector added) and send.' : 'This browser blocked copying.', 6000); if (okc) root.open('https://claude.ai/new', '_blank', 'noopener'); };
  ACT.aaNudge = async a => {
    const m = T.msgs[+a.getAttribute('data-i')]; const x = m && (m.actions || [])[+a.getAttribute('data-j')]; if (!x) return;
    if (V.confirmDialog && !(await V.confirmDialog('Send reminders through Otto', 'The owners of ' + x.ids.length + ' project(s) get a private Teams message from Otto and a note in their bell, saying what needs attention. Owners already told about the same signals in the last three days are skipped.', 'Send'))) return;
    try { const r = await API.post('/api/admin/assistant/nudge', { ids: x.ids }); m.actions = m.actions.filter(y => y !== x); T.msgs.push({ who: 'ai', via: 'Otto', text: r.sent ? 'Sent ' + r.sent + ' reminder(s) to the owners of ' + r.projects + ' project(s) through Otto and the bell.' : r.note || 'Nothing was sent.' }); }
    catch (e) { T.msgs.push({ who: 'ai', via: 'Otto', bad: true, text: 'The reminders were not sent: ' + (e.message || 'try again') }); }
    paint();
  };
  V.adminAssist = { html, load, ready: () => T.loaded };
})(typeof window !== 'undefined' ? window : globalThis);
