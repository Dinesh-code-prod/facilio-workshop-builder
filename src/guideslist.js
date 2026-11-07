/* Training (stage 5): one simple page: make a guide with Claude (four kinds), the Comet videos (a row per prototype of the Mockup tab and per test scenario of UAT, with the brief and the link), what exists, and the two tools (User Guide Builder, Video to Guide).
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
  const WHAT = { user: 'For the people who use the system: how to do each task, step by step.', uat: 'For the testers: what to try and what should happen, module by module.', training: 'A training plan by role: who learns what, and in what order.', video: 'A script for a recording or a Comet walkthrough.' };
  const tile = (k, cur) => '<button type="button" class="tr-tile' + (k[0] === cur ? ' on' : '') + '" aria-pressed="' + (k[0] === cur) + '" data-act="tgKind" data-v="' + esc(k[0]) + '"><b>' + esc(k[1]) + '</b><span>' + esc(WHAT[k[0]] || k[2]) + '</span></button>';
  const row = r => '<div class="ev-row" style="align-items:center"><span class="ev-t"><b>' + esc(r.label) + '</b> <span class="muted">' + (r.count ? r.count : 'none') + '</span><div class="xs muted">' + esc(r.detail) + '</div></span>' + (r.act ? '<button class="btn link sm" data-act="' + esc(r.act) + '">Download</button>' : '<button class="btn link sm" data-act="nav" data-view="' + esc(r.view) + '">Open</button>') + '</div>';
  /** the videos of the project: a row per prototype (the cards of the Mockup tab) and a row per test scenario (UAT), each with the link of the Comet video; both keep their links where they always were */
  function videoRows() {
    const M = V.mockupLogic; const items = M && M.gather && M.buildItems ? M.buildItems(M.gather()) : []; const store = (F.S.ws && F.S.ws.walkthroughs) || {};
    return items.map(it => ({ proto: true, key: it.key, label: it.label, sub: 'Prototype', url: M.videoOf ? M.videoOf(it.key) : '' })).concat((V.uatWalkthroughs ? V.uatWalkthroughs() : []).map(w => ({ proto: false, key: w.key, label: w.label, sub: w.count + ' test case' + (w.count === 1 ? '' : 's'), url: (store[w.key] || {}).url || '' })));
  }
  function videoRow(v, ro) {
    const dis = ro ? ' disabled' : ''; const fr = V.mockupLogic && V.mockupLogic.framable && v.url && V.mockupLogic.framable(v.url);
    return '<details class="wt"><summary><b>' + esc(v.label) + '</b> <span class="xs muted">' + esc(v.sub) + '</span> ' + (v.url ? '<span class="tag green">Video added</span>' : '<span class="xs muted">No video yet</span>') + '</summary><div class="wt-b"><div class="mk-link"><input type="url" class="' + (v.proto ? 'mk-vid' : 'wt-url') + '" data-key="' + esc(v.key) + '" placeholder="Paste the link of the video Comet made" value="' + esc(v.url) + '"' + dis + '><button class="btn sm" data-act="' + (v.proto ? 'mkVidCopy' : 'utcWtCopy') + '" data-key="' + esc(v.key) + '">Copy the Comet brief</button><button class="btn sm primary" data-act="' + (v.proto ? 'mkVidSave' : 'utcWtSave') + '" data-key="' + esc(v.key) + '"' + dis + '>Save link</button>' + (v.url ? '<a class="btn sm" href="' + esc(v.url) + '" target="_blank" rel="noopener">Open</a>' : '') + '</div>'
      + (fr ? '<iframe class="mk-frame" src="' + esc(v.url) + '" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" title="Video: ' + esc(v.label) + '"></iframe>' : (v.url ? '<p class="xs muted">This link is not on Comet, so it cannot be shown here. Use Open.</p>' : '')) + '</div></details>';
  }
  V.guides = { html() {
    if (V.isCustomer()) return ''; I().load(['ugd', 'vid', 'utc']); const head = '<div class="page-header"><div class="t"><h1>Training</h1><p>Guides and videos for the people who will use the system. Claude drafts them; you read them and approve.</p></div></div>';
    if (!I().ready(['ugd', 'vid', 'utc'])) return head + '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
    const t = st(), ro = !!F.S.readonly; const vids = videoRows(); const have = vids.filter(v => v.url).length;
    const s = summary({ userGuides: I().list('ugd'), recordings: I().list('vid'), testCases: I().list('utc').length, walkthroughs: 0, mockupVideos: 0 });
    const kinds = ASK.map(x => tile(x, t.kind)).join('');
    const make = '<div class="card"><div class="card-h"><b>Make a guide</b><span class="seg" role="group"><button type="button" class="' + (t.mode === 'make' ? 'on' : '') + '" aria-pressed="' + (t.mode === 'make') + '" data-act="tgMode" data-v="make">New</button><button type="button" class="' + (t.mode === 'change' ? 'on' : '') + '" aria-pressed="' + (t.mode === 'change') + '" data-act="tgMode" data-v="change">Change one</button></span></div><div class="card-b tr-make"><div class="tr-tiles">' + kinds + '</div>'
      + '<textarea id="tgNote" rows="3" maxlength="600" placeholder="' + (t.mode === 'change' ? 'What should change? For example: add a step for rejecting a request.' : 'Anything it must cover? Leave empty for everything in scope.') + '"' + (ro ? ' disabled' : '') + '>' + esc(t.note || '') + '</textarea><div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><button type="button" class="btn primary" data-act="tgSend"' + (ro ? ' disabled' : '') + '>Ask Claude</button><span class="small muted">The draft appears in the Assistant panel, and nothing is overwritten.</span></div></div></div>';
    const videos = '<div class="card"><div class="card-h"><b>Videos</b><span class="small muted">' + have + ' of ' + vids.length + ' have one</span></div><div class="card-b"><p class="small muted" style="margin-top:0">Videos are made in Comet. Open a row, copy its brief, paste it in Comet, and paste the link of the finished video back.</p><div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:8px"><button type="button" class="btn sm" data-act="mkComet">Open Comet</button>' + (V.wfDockButton ? V.wfDockButton('comet') : '') + (ro || !vids.some(v => v.proto && !v.url) ? '' : '<button type="button" class="btn sm" data-act="trBring" title="Claude finds the finished videos in Comet and brings them here">Ask Claude to bring the finished videos</button>') + '</div>'
      + (vids.length ? vids.map(v => videoRow(v, ro)).join('') : '<p class="small">No prototype or test scenario yet. Prototypes come from the Mockup tab, scenarios from the test cases on the UAT page.</p>') + '</div></div>';
    const exists = '<div class="card"><div class="card-h"><b>What exists</b><span class="small muted">' + s.total + ' in all</span></div><div class="card-b">' + s.rows.filter(r => r.id !== 'wt' && r.id !== 'mv').map(row).join('') + '</div></div>';
    const tools = '<div class="card"><div class="card-h"><b>Tools</b></div><div class="card-b tr-tools"><button type="button" class="btn" data-act="nav" data-view="guidebuilder">User Guide Builder</button><span class="small muted">Write or edit a user guide step by step.</span><button type="button" class="btn" data-act="nav" data-view="vidguide">Video to Guide</button><span class="small muted">Turn a screen recording into guide steps.</span></div></div>';
    return head + '<div class="page-body tr">' + make + videos + exists + tools + '</div>';
  }, mount() { I().load(['ugd', 'vid', 'utc']); } };
  const ACT = V.ACT;
  ACT.trBring = a => V.busy(a, async () => { const J = V.studioJobs; if (!J || J.guard()) return; let n = 0; for (const v of videoRows().filter(x => x.proto && !x.url).slice(0, 20)) { const r = await J.post('/jobs', { kind: 'send_video', note: v.label, ref: v.key }); if (!r.duplicate) n++; } V.toast(n ? 'Asked Claude for ' + n + ' video' + (n === 1 ? '' : 's') + '. It brings the finished ones here; anything not made yet stays as it is.' : 'Claude already has these requests.', 7000); });
  ACT.tgMode = a => { st().note = (document.getElementById('tgNote') || {}).value || ''; st().mode = a.getAttribute('data-v'); V.render(); };
  ACT.tgKind = a => { st().note = (document.getElementById('tgNote') || {}).value || ''; st().kind = a.getAttribute('data-v'); V.render(); };
  ACT.tgSend = a => V.busy(a, async () => { const J = V.studioJobs; if (!J || J.guard()) return; const t = st(); const note = (document.getElementById('tgNote') || {}).value || ''; const r = askJob(t.mode, t.kind, note); if (!r.ok) { V.toast(r.error, 5000, true); return; }
    const out = await J.post('/jobs', r.job); t.note = ''; V.toast(out && out.duplicate ? 'Claude already has this request.' : 'Sent. The draft from Claude will show in the Assistant panel and in Deliverables & AI when it is ready.', 6000); V.render(); });
})(typeof window !== 'undefined' ? window : globalThis);
