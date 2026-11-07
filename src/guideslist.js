/* Training guides overview (stage 5): one page that lists every guide and video the project holds, with a button to the tool that makes each kind.
   It reads only: user guides (ugd), recordings turned into steps (vid), the UAT guide (made on demand from the test cases), the Comet walkthrough links and the mockup videos. It adds no content of its own.
   `summary` is the pure rule (tests/guides_list.mjs). */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; const I = () => V.items;
  const arr = v => (Array.isArray(v) ? v : []);
  const esc = F ? F.esc : (s => String(s == null ? '' : s));
  /** in: { userGuides: [{ title, updatedAt }], recordings: [{ title }], testCases: n, walkthroughs: n, mockupVideos: n }
      out: { rows: [{ id, label, count, detail, view, act }], total } */
  function summary(d) {
    const ug = arr(d.userGuides), rec = arr(d.recordings), tc = Number(d.testCases) || 0, wt = Number(d.walkthroughs) || 0, mv = Number(d.mockupVideos) || 0;
    const rows = [
      { id: 'user', label: 'User guides', count: ug.length, detail: ug.length ? ug.slice(0, 3).map(g => g.title || 'Untitled').join(', ') + (ug.length > 3 ? ' and ' + (ug.length - 3) + ' more' : '') : 'None made yet.', view: 'guidebuilder', button: 'Open the guide builder' },
      { id: 'uat', label: 'UAT guide', count: tc ? 1 : 0, detail: tc ? 'Made from ' + tc + ' test case' + (tc === 1 ? '' : 's') + ' whenever you press download.' : 'Needs test cases first.', act: 'utcGuide', button: 'Download the UAT guide' },
      { id: 'rec', label: 'Recordings turned into steps', count: rec.length, detail: rec.length ? rec.slice(0, 3).map(g => g.title || 'Untitled').join(', ') : 'None yet.', view: 'vidguide', button: 'Open Video to Guide' },
      { id: 'wt', label: 'Walkthrough videos (Comet)', count: wt, detail: wt ? wt + ' scenario' + (wt === 1 ? '' : 's') + ' with a video.' : 'None yet.', view: 'delivery', button: 'Open the UAT page' },
      { id: 'mv', label: 'Mockup videos', count: mv, detail: mv ? mv + ' mockup card' + (mv === 1 ? '' : 's') + ' with a video.' : 'None yet.', view: 'mockup', button: 'Open the Mockup tab' }
    ];
    return { rows, total: rows.reduce((n, r) => n + r.count, 0) };
  }
  /** what a person can ask Claude for; the same words go to the job (work/server/_jobs.mjs make_guide and change_guide) */
  const ASK = [['user', 'User guide', 'for the people who use the system'], ['uat', 'UAT guide', 'for the testers'], ['training', 'Training guide', 'by role'], ['video', 'Video script', 'for a recording or a Comet walkthrough']];
  /** the request for Claude: { ok, job } or { ok: false, error }. mode make needs only the kind; mode change needs the words. */
  function askJob(mode, kind, note) {
    const k = ASK.find(x => x[0] === kind); if (!k) return { ok: false, error: 'Choose what you want: a user guide, UAT guide, training guide or video script.' }; const n = String(note || '').replace(/\s+/g, ' ').trim().slice(0, 600);
    if (mode === 'change') return n ? { ok: true, job: { kind: 'change_guide', section: kind, note: n } } : { ok: false, error: 'Write what should change, in your own words.' };
    return { ok: true, job: { kind: 'make_guide', section: kind, note: n || 'Everything in scope: ' + k[1].toLowerCase() } };
  }
  V.guidesLogic = { summary, askJob, ASK };
  if (!F || !F.S) return;   // the page below needs the browser app
  const st = () => F.S.ui.tg || (F.S.ui.tg = { mode: 'make', kind: 'user' });
  const row = r => '<div class="ev-row" style="align-items:center"><span class="ev-t"><b>' + esc(r.label) + '</b> <span class="muted">' + (r.count ? r.count : 'none') + '</span><div class="xs muted">' + esc(r.detail) + '</div></span>' + (r.act ? '<button class="btn link sm" data-act="' + esc(r.act) + '">Download</button>' : '<button class="btn link sm" data-act="nav" data-view="' + esc(r.view) + '">Open</button>') + '</div>';
  const sec = (t, d, inner) => '<section class="st-sec"><div class="st-side"><h3>' + t + '</h3>' + (d ? '<p>' + d + '</p>' : '') + '</div><div class="card st-card">' + inner + '</div></section>';
  V.guides = { html() {
    if (V.isCustomer()) return ''; I().load(['ugd', 'vid', 'utc']); const head = '<div class="page-header"><div class="t"><h1>Training guides</h1><p>Ask Claude for a guide, a training outline or a video script. Everything it writes comes back as a draft for you to read and approve.</p></div></div>';
    if (!I().ready(['ugd', 'vid', 'utc'])) return head + '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
    const t = st(), ro = F.S.readonly; const stm = (F.S.ws && F.S.ws.mockups) || {}; const s = summary({ userGuides: I().list('ugd'), recordings: I().list('vid'), testCases: I().list('utc').length, walkthroughs: Object.keys((F.S.ws && F.S.ws.walkthroughs) || {}).length, mockupVideos: Object.keys(stm).filter(k => stm[k] && stm[k].video).length });
    const seg = (items, cur, act) => '<div class="seg" role="group">' + items.map(x => '<button type="button" class="' + (x[0] === cur ? 'on' : '') + '" aria-pressed="' + (x[0] === cur) + '" data-act="' + act + '" data-v="' + esc(x[0]) + '">' + esc(x[1]) + '</button>').join('') + '</div>';
    const ask = '<div class="card-b" style="display:grid;gap:12px">' + seg([['make', 'Make a new one'], ['change', 'Change one']], t.mode, 'tgMode') + seg(ASK.map(x => [x[0], x[1]]), t.kind, 'tgKind') + '<p class="small muted" style="margin:0">' + esc(ASK.find(x => x[0] === t.kind)[2].replace(/^./, c => c.toUpperCase())) + '.</p>'
      + '<textarea id="tgNote" rows="3" maxlength="600" placeholder="' + (t.mode === 'change' ? 'What should change? For example: add a step for rejecting a request.' : 'Anything it must cover? Leave empty for everything in scope.') + '"' + (ro ? ' disabled' : '') + '>' + esc(t.note || '') + '</textarea></div><div class="st-foot"><span class="small muted">Claude works in your own Claude app; the answer shows in the Assistant panel.</span>' + (t.kind === 'video' ? (V.wfDockButton ? V.wfDockButton('comet') : '') + '<button class="btn sm" data-act="mkComet">Open Comet</button>' : '') + '<button class="btn primary" data-act="tgSend"' + (ro ? ' disabled' : '') + '>' + (t.mode === 'change' ? 'Change with Claude' : 'Ask Claude') + '</button></div>';
    return head + '<div class="page-body st-page st-wrap">' + sec('Ask Claude', 'One place for every guide. To change something later, pick Change one, say what to change and send it: Claude writes a new draft; nothing is overwritten.', ask)
      + sec('What exists', s.total + ' in all. Videos and recordings are turned into steps in Video to Guide.', '<div class="card-b">' + s.rows.map(row).join('') + '<p class="xs muted" style="margin:8px 0 0">The Customer User Guide and the User Guide Builder keep their own pages.</p></div>') + '</div>';
  }, mount() { I().load(['ugd', 'vid', 'utc']); } };
  const ACT = V.ACT;
  ACT.tgMode = a => { st().note = (document.getElementById('tgNote') || {}).value || ''; st().mode = a.getAttribute('data-v'); V.render(); };
  ACT.tgKind = a => { st().note = (document.getElementById('tgNote') || {}).value || ''; st().kind = a.getAttribute('data-v'); V.render(); };
  ACT.tgSend = a => V.busy(a, async () => { const J = V.studioJobs; if (!J || J.guard()) return; const t = st(); const note = (document.getElementById('tgNote') || {}).value || ''; const r = askJob(t.mode, t.kind, note); if (!r.ok) { V.toast(r.error, 5000, true); return; }
    const out = await J.post('/jobs', r.job); t.note = ''; V.toast(out && out.duplicate ? 'Claude already has this request.' : 'Sent. The draft from Claude will show in the Assistant panel and in Deliverables & AI when it is ready.', 6000); V.render(); });
})(typeof window !== 'undefined' ? window : globalThis);
