/* Transfers (roadmap E4, E10 step 1): the page for the push and pull engine. One table of what was read from or sent to other systems, a drawer for one transfer, and the
   Holding tab for contracts Claude read before any project exists, with Start project from this contract. The rules live on the server: every button comes from the record's next[]
   and calls the existing route with baseVersion; a refusal (409, 403) is shown as the server worded it. The pure parts are in src/transferslogic.js (tested by tests/transfers_page.mjs). */
(function (root) {
  'use strict';
  const F = root.FWB; const { S } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi; const T = root.FWBTransfers; const { toast } = V;
  const FRESH_MS = 30000;
  const X = () => S.ui.xf || (S.ui.xf = { tab: 'project', status: '', kind: '', proj: null, hold: null, holdId: '', open: null, started: null });
  const pid = () => (S.project && S.project.id) || '';
  const spaceOf = tab => (tab === 'holding' ? X().holdId : pid());
  const url = (space, id, q) => `/api/projects/${encodeURIComponent(space)}/transfers${id ? '/' + encodeURIComponent(id) : ''}${q || ''}`;

  async function loadOne(key, force) {
    const x = X(); const p = pid(); const st = x[key]; if (!p) return;
    if (!force && st && st.pid === p && (st.loading || (st.at && Date.now() - st.at < FRESH_MS))) return;
    x[key] = { pid: p, loading: true, list: st && st.pid === p ? st.list : null, at: 0 };
    try { if (key === 'hold' && !x.holdId) x.holdId = (await API.get('/api/me/holding')).id; const r = await API.get(url(key === 'hold' ? x.holdId : p)); x[key] = { pid: p, list: r.transfers || [], at: Date.now() }; }
    catch (e) { x[key] = { pid: p, list: [], at: Date.now(), err: e.message || 'The list could not be loaded' }; }
    if (S.ui.view === 'transfers') V.render();
  }
  const loadAll = force => Promise.all([loadOne('proj', force), loadOne('hold', force)]);

  const page = () => { const x = X(); const ok = k => (x[k] && x[k].pid === pid() ? x[k] : null); return T.pageHtml({ tab: x.tab, status: x.status, kind: x.kind, proj: ok('proj'), hold: ok('hold'), started: x.started }); };
  V.transfers = { html: page, mount: () => { loadAll(false); } };

  // ---------- drawer ----------
  function paint() {
    const o = X().open; if (!o) return; const html = T.drawerHtml(Object.assign({}, o, { started: o.started && o.started.id === o.id ? o.started : null })); const el = document.getElementById('xfDrawer');
    if (el) el.innerHTML = html; else V.drawer('Transfer: ' + (o.title || ''), `<div id="xfDrawer">${html}</div>`, '<span class="spacer"></span><button class="btn" data-act="closeDrawer">Close</button>', { wide: true });
  }
  const say = (text, bad) => { const o = X().open; if (o) { o.msg = { text, bad: !!bad }; o.note = (document.getElementById('xfNote') || {}).value || o.note || ''; paint(); } };
  async function fetchOne(ver) {
    const o = X().open; const q = ver != null ? '?ver=' + encodeURIComponent(ver) : '';
    const r = await API.get(url(o.space, o.id, q)); o.transfer = r.transfer; if (r.version) { o.version = r.version; o.content = r.content; o.intact = r.intact; } return r;
  }
  ACT.xfOpen = async a => {
    const x = X(); const tab = a.getAttribute('data-sp') === 'holding' ? 'holding' : 'project'; const id = a.getAttribute('data-id'); const row = ((x[tab === 'holding' ? 'hold' : 'proj'] || {}).list || []).find(t => t.id === id) || {};
    x.open = { id, space: spaceOf(tab), tab, title: T.rowOf(row).what, loading: true }; paint();
    try { await fetchOne(row.ver ? 'latest' : null); } catch (e) { x.open.msg = { text: e.message || 'The transfer could not be loaded', bad: true }; }
    x.open.loading = false; paint();
  };
  ACT.xfVer = a => V.busy(a, async () => { const o = X().open; if (!o) return; o.loading = true; paint(); try { await fetchOne(a.getAttribute('data-v')); o.msg = null; } catch (e) { o.msg = { text: e.message || 'That version could not be loaded', bad: true }; } o.loading = false; paint(); });
  ACT.xfNote = el => { const o = X().open; if (o) o.note = el.value; };
  ACT.xfDo = a => V.busy(a, async () => {
    const x = X(); const o = x.open; if (!o || !o.transfer) return; const t = o.transfer; const act = T.actionsFor(t).find(k => k.k === a.getAttribute('data-k')); if (!act) { say('That action is not open any more. The transfer was refreshed.', true); await fetchOne().catch(() => { }); paint(); return; }
    const sel = document.getElementById('xfTo'); const to = act.choices && sel && act.choices.indexOf(sel.value) >= 0 ? sel.value : act.to; const note = ((document.getElementById('xfNote') || {}).value || '').trim(); o.note = note;
    if (act.note && note.length < 3) { say(act.label + ' needs a short note: say why in the note box.', true); return; }
    try {
      const r = await API.post(url(o.space, o.id) + '/transition', { to, note, baseVersion: t.ver, ver: to === 'Approved' ? t.ver : undefined });
      o.transfer = r.transfer; o.note = ''; o.msg = { text: act.label + ' done. The transfer is now ' + r.transfer.status + '.', bad: false }; toast(act.label + ' done', 3000); paint(); loadAll(true);
    } catch (e) { say(e.message || 'The server refused this.', true); toast(e.message || 'The server refused this.', 6000, true); try { await fetchOne(); paint(); } catch (e2) { /* the message stays */ } }
  });
  ACT.xfStart = a => V.busy(a, async () => {
    const x = X(); const id = a.getAttribute('data-id'); const tab = a.getAttribute('data-sp') === 'holding' ? 'holding' : 'project'; const space = spaceOf(tab);
    if (!(await V.confirmDialog('Start project from this contract', 'A new project is made from the approved extraction. Nothing that exists is changed. If one was already made from it, you are shown that one.', 'Start project'))) return;
    try { const r = await API.post(url(space, id) + '/start-project', {}); x.started = Object.assign({ id }, r); if (x.open && x.open.id === id) { x.open.started = x.started; try { await fetchOne(); } catch (e) { } } toast(r.created === false ? 'A project was already created from this contract' : 'Project created', 4000); }
    catch (e) { say(e.message || 'The project could not be created', true); toast(e.message || 'The project could not be created', 7000, true); }
    paint(); V.render(); loadAll(true);
  });
  ACT.xfImport = a => V.busy(a, async () => {   // an approved transcript becomes a transcript record (src/transcriptimport.js); the same version is never imported twice
    const o = X().open; if (!o || !o.transfer || !V.trImportTransfer) return;
    try { const r = await V.trImportTransfer(o.transfer, async n => { const x = await API.get(url(o.space, o.id, '?ver=' + encodeURIComponent(n))); return { version: x.version, content: x.content, intact: x.intact }; });
      toast(r.existing ? 'Already imported: showing that transcript' : 'Transcript imported. Review the suggested statements.', 5000); V.closeDrawer(); V.go('transcripts', { reqTab: 'transcripts', trTab: 'review', trFilter: { transcript: r.item.id } });
    } catch (e) { say(e.message || 'The transcript could not be imported', true); toast(e.message || 'The transcript could not be imported', 6000, true); }
  });
  ACT.xfClaude = async () => { const o = X().open; if (!o || !o.transfer) return; const r = await V.claudeOpenSimple(T.claudePrompt(o.transfer, o.tab === 'holding' ? 'holding' : o.space), { title: 'Continue a transfer', task: 'transfer', module: 'Transfers', destination: 'Claude reads and stores through the connector; a person approves in Delivery Studio' }); toast(r.said, 8000); };

  // ---------- page ----------
  ACT.xfTab = a => { X().tab = a.getAttribute('data-v') === 'holding' ? 'holding' : 'project'; X().status = ''; X().kind = ''; V.render(); };
  ACT.xfFilter = el => { X()[el.getAttribute('data-f') === 'kind' ? 'kind' : 'status'] = el.value; V.render(); };
  ACT.xfRefresh = a => V.busy(a, async () => { await loadAll(true); });
})(typeof window !== 'undefined' ? window : globalThis);
