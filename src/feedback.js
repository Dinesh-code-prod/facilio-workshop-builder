/* Feedback tab (Help menu, team only; server: work/server/_feedback.mjs). A team member sends feedback or a feature request; it is kept in the app and recorded as a GitHub issue (when the owner has granted the
   github_feedback credential), so it can be picked up every day. Everyone on the team sees the list, so the same idea is not sent twice; "Download for Excel" saves the shown rows as a sheet (CSV, opens in Excel). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi;
  const KINDS = { feature: 'Feature request', idea: 'Idea', bug: 'Something is wrong', other: 'Other' };
  const st = () => S.ui.fb || (S.ui.fb = { items: null, kind: 'feature', range: 'today', busy: false, err: '' });
  const day = d => new Date(d).toISOString().slice(0, 10);
  const range = () => { const r = st().range, t = day(Date.now()); return r === 'today' ? { from: t, to: t } : r === 'week' ? { from: day(Date.now() - 6 * 864e5), to: t } : { from: '', to: '' }; };
  async function load() { const s = st(); const r = range(); try { const q = (r.from ? '?from=' + r.from + '&to=' + r.to : ''); const res = await API.get('/api/feedback' + q); s.items = res.items || []; s.err = ''; } catch (e) { s.err = e.message || 'Could not load the feedback'; s.items = s.items || []; } V.render(); }
  const row = r => `<li class="fb-row"><div class="fb-top"><b>${esc(r.title)}</b><span class="fb-chip ${esc(r.kind)}">${esc(KINDS[r.kind] || r.kind)}</span></div>${r.text ? `<p class="small">${esc(r.text)}</p>` : ''}<div class="xs muted">${esc(r.name || r.by)} · ${esc(String(r.at).slice(0, 16).replace('T', ' '))} UTC${r.project && r.project.name ? ' · ' + esc(r.project.name) : ''} · ${r.gh && r.gh.url ? `<a href="${esc(r.gh.url)}" target="_blank" rel="noopener">GitHub #${esc(r.gh.number)}</a>` : 'not in GitHub yet'}</div></li>`;
  V.feedback = {
    html() {
      const s = st(); const items = s.items;
      const seg = (k, l) => `<button type="button" class="fb-seg${s.kind === k ? ' on' : ''}" data-act="fbKind" data-k="${k}" aria-pressed="${s.kind === k}">${esc(l)}</button>`;
      const rg = (k, l) => `<button type="button" class="fb-seg${s.range === k ? ' on' : ''}" data-act="fbRange" data-r="${k}" aria-pressed="${s.range === k}">${esc(l)}</button>`;
      const miss = (items || []).filter(r => !(r.gh && r.gh.number)).length;
      return `<div class="page-header"><div class="t"><h1>Feedback</h1><p>Tell us what would make Delivery Studio better: something missing, something wrong, an idea. Every note is recorded and reviewed every day.</p></div></div>
      <div class="page-body"><div class="card"><div class="card-b fb-form"><div class="fb-segs" role="group" aria-label="Type">${Object.keys(KINDS).map(k => seg(k, KINDS[k])).join('')}</div>
        <label class="fb-l" for="fbTitle">In one line</label><input id="fbTitle" maxlength="120" placeholder="For example: let me export the BRD as Word" aria-label="Feedback in one line">
        <label class="fb-l" for="fbText">Details (optional): what you were doing, what you expected, which page</label><textarea id="fbText" rows="4" maxlength="2000" aria-label="Details"></textarea>
        <div class="row" style="justify-content:flex-end"><button type="button" class="btn primary" data-act="fbSend">Send feedback</button></div></div></div>
      <div class="card" style="margin-top:14px"><div class="card-h"><b>What the team has sent</b><span class="spacer"></span><div class="fb-segs">${rg('today', 'Today')}${rg('week', 'Last 7 days')}${rg('all', 'All')}</div></div><div class="card-b">
        ${s.err ? `<div class="notice err small">${esc(s.err)}</div>` : ''}
        ${items == null ? '<p class="muted">Loading…</p>' : items.length ? `<ul class="fb-list">${items.map(row).join('')}</ul>` : '<p class="muted">Nothing here yet. Be the first.</p>'}
        <div class="row" style="gap:8px;margin-top:10px"><button type="button" class="btn sm" data-act="fbCsv"${items && items.length ? '' : ' disabled'}>Download for Excel</button>${miss ? `<button type="button" class="btn sm" data-act="fbSync">Send ${miss} missing to GitHub</button>` : ''}</div></div></div></div>`;
    },
    mount() { const s = st(); if (s.items == null) load(); }
  };
  ACT.fbKind = a => { st().kind = a.getAttribute('data-k') || 'feature'; V.render(); };
  ACT.fbRange = a => { const s = st(); s.range = a.getAttribute('data-r') || 'today'; s.items = null; V.render(); load(); };
  ACT.fbSend = a => V.busy(a, async () => {
    const t = (document.getElementById('fbTitle') || {}).value || '', x = (document.getElementById('fbText') || {}).value || ''; if (t.trim().length < 3) { V.toast('Write the feedback in one line first.', 3500, true); return; }
    const r = await API.post('/api/feedback', { kind: st().kind, title: t, text: x, project: S.project ? { id: S.project.id, name: S.project.name } : null, page: 'feedback' });
    V.toast(r.item && r.item.gh && r.item.gh.number ? 'Thank you. Sent, and recorded in GitHub.' : 'Thank you. Saved; it reaches GitHub when the connection is set up.', 5000); const s = st(); s.range = s.range === 'all' ? 'all' : 'today'; s.items = null; await load();
  });
  ACT.fbSync = a => V.busy(a, async () => { const r = await API.post('/api/feedback/sync', {}); V.toast(r.sent ? r.sent + ' sent to GitHub.' : 'Nothing could be sent: the GitHub credential is not set up yet.', 5000, !r.sent); st().items = null; await load(); });
  ACT.fbCsv = () => {
    const rows = st().items || []; const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; const head = ['Date', 'Time (UTC)', 'Who', 'Email', 'Type', 'Feedback', 'Details', 'Project', 'GitHub'];
    const lines = [head.map(q).join(',')].concat(rows.slice().reverse().map(r => [String(r.day), String(r.at).slice(11, 16), r.name || r.by, r.by, KINDS[r.kind] || r.kind, r.title, r.text, (r.project && r.project.name) || '', (r.gh && r.gh.url) || ''].map(q).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'feedback-' + (range().from || 'all') + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
})(typeof window !== 'undefined' ? window : globalThis);
