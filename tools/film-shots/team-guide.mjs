// Shot list for the Team Guide film (public/films/team-guide.js; plan docs/plans/GUIDE-FILMS-CLAUDE-AND-TEAM-PLAN-2026-11-26.md): the projects home, the
// New project drawer, every menu page (Expanded sidebar, so the page's entry is marked), what a click on a page's main button opens (<id>+), the Assistant
// and the customer preview (last: the preview stays on). Boxes per page: <id>:nav (its sidebar entry), <id>:h (the title), <id>:act (the page's main
// button). The film moves the mouse to these boxes and clicks them. Run with tools/film-capture.mjs team-guide on a copy of the local data.
const PAGES = ['projdash', 'lifecycle', 'msaintake', 'intro', 'onboarding', 'workshop', 'rstrans', 'whiteboard', 'rschecks', 'flow', 'modules', 'roles', 'notifications', 'solmap', 'mockup',
  'slakpi', 'brd', 'governance', 'changes', 'ftr', 'delivery', 'kpi', 'guides', 'tasks', 'mailtab', 'supportdesk', 'transfers', 'golivehc', 'handover', 'soldoc', 'statusrep', 'trace',
  'resources', 'docs', 'seefacilio', 'learnlib', 'teamhelp', 'claudesetup', 'settings', 'workspace'];
// pages whose main button opens something worth showing: the film clicks it and cuts to this screen
const OPENS = ['tasks', 'changes', 'resources'];
const boxes = id => ({ [id + ':nav']: 'nav.sidebar .sb-item.active', [id + ':h']: '.main h1', [id + ':act']: '.main .page-header .btn.primary' });
// the sidebar scrolls on its own: bring the open group into view at the same height for each of its pages (its title 170 px below the sidebar's top),
// so the film clicks the next tab where it really is and the menu does not jump between the tabs of one group
const menuTo = async (p, h) => { await p.evaluate(() => { const a = document.querySelector('nav.sidebar .sb-item.active'), n = document.querySelector('nav.sidebar'); if (!a || !n) return; const s = [n, ...n.querySelectorAll('*')].find(x => x.scrollHeight > x.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(x).overflowY)); if (!s) return;
  const t = (a.closest('.sb-group') || a).querySelector('.sb-title') || a; s.scrollTop = 0; const d = t.getBoundingClientRect().top - s.getBoundingClientRect().top - 170; if (d > 0) s.scrollTop = d; }); await h.settle(300); };
const page = id => ({ key: id, view: id, prep: menuTo, pos: boxes(id) });
const opened = id => ({ key: id + '+', view: id, prep: async (p, h) => { await menuTo(p, h); const b = await p.$('.main .page-header .btn.primary'); if (b) { await b.click(); await h.settle(1800); } }, pos: { [id + '+:drawer']: '.drawer' } });
const fab = async (p, h) => { await p.evaluate(() => { const f = document.querySelector('.as-fab-i'); const b = f && f.closest('button, [data-act]'); if (b) b.click(); }); await h.settle(1200); };
const home = async (p, h) => { await p.click('header.navbar >> text=Projects'); await h.settle(2500); };
export default { id: 'team-guide', format: 'webp', quality: 30, shots: [
  { key: 'projects', view: 'projdash', prep: home, pos: { 'projects:new': '[data-act="newProject"]', 'projects:guide': ['text', 'Team guide'], 'projects:demo': ['text', 'Demo: Riverside Towers'] } },
  { key: 'newproj', view: 'projdash', prep: async (p, h) => { await home(p, h); await p.click('[data-act="newProject"]'); await h.settle(1500); },
    pos: { 'newproj:drawer': '.drawer', 'newproj:name': ['text', 'Project name', '.drawer'], 'newproj:what': ['text', 'What are you delivering', '.drawer'] } },
  { key: 'newproj2', view: 'projdash', prep: async (p, h) => { await home(p, h); await p.click('[data-act="newProject"]'); await h.settle(1500);
      await p.evaluate(() => { const e = [...document.querySelectorAll('.drawer *')].find(x => /^Contract/.test((x.textContent || '').trim()) && x.children.length < 3); if (e) e.scrollIntoView({ block: 'start' }); }); await h.settle(800); },
    pos: { 'newproj2:msa': ['text', 'Contract', '.drawer'], 'newproj2:create': ['text', 'Create project', '.drawer'] } },
  ...PAGES.flatMap(id => OPENS.includes(id) ? [page(id), opened(id)] : [page(id)]),
  { key: 'assistant', view: 'projdash', prep: fab, pos: { 'assistant:ask': '.as-panel [data-act*="Claude"], [data-act="asstAskClaude"]', 'assistant:msg': 'textarea[placeholder="Message Claude"]' } },
  { key: 'customer', view: 'projdash', prep: async (p, h) => { await fab(p, h); await p.click('[data-act="custPreview"]'); await h.settle(2500); await p.click('text=Your project'); await h.settle(2500); },
    pos: { 'customer:badge': ['text', 'Customer preview', 'header'], 'customer:exit': ['text', 'Exit preview', 'header'], 'customer:rail': 'nav.sidebar' } }] };
