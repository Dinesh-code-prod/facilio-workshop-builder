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
  V.guidesLogic = { summary };
  if (!F || !F.S) return;   // the page below needs the browser app
  const row = r => '<div class="ev-row" style="align-items:center"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:8px;background:' + (r.count ? '#1AA34A' : '#CBD6EE') + '"></span><span class="ev-t"><b>' + esc(r.label) + '</b> <span class="muted">' + (r.count ? r.count : 'none') + '</span><div class="xs muted">' + esc(r.detail) + '</div></span>' + (r.act ? '<button class="btn sm" data-act="' + esc(r.act) + '">' + esc(r.button) + '</button>' : '<button class="btn sm" data-act="nav" data-view="' + esc(r.view) + '">' + esc(r.button) + '</button>') + '</div>';
  V.guides = { html() {
    if (V.isCustomer()) return ''; I().load(['ugd', 'vid', 'utc']); const head = '<div class="page-header"><div class="t"><h1>Training guides</h1><p>Every guide and video this project holds, and the tool that makes each kind.</p></div></div>';
    if (!I().ready(['ugd', 'vid', 'utc'])) return head + '<div class="page-body"><div class="muted" style="padding:20px">Loading…</div></div>';
    const st = (F.S.ws && F.S.ws.mockups) || {}; const s = summary({ userGuides: I().list('ugd'), recordings: I().list('vid'), testCases: I().list('utc').length, walkthroughs: Object.keys((F.S.ws && F.S.ws.walkthroughs) || {}).length, mockupVideos: Object.keys(st).filter(k => st[k] && st[k].video).length });
    return head + '<div class="page-body"><div class="card"><div class="card-h"><h3>What exists</h3><span class="small muted">' + s.total + ' in all</span></div><div class="card-b">' + s.rows.map(row).join('') + '<p class="xs muted" style="margin:8px 0 0">The Customer User Guide and Guides &amp; Video Studio stay in their own pages; this list only shows what is made and where to make more.</p></div></div></div>';
  }, mount() { I().load(['ugd', 'vid', 'utc']); } };
})(typeof window !== 'undefined' ? window : globalThis);
