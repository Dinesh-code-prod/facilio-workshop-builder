// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/guide-library-check.mjs [baseUrl] [outDir]
// The published Customer User Guide as a library (25 Nov 2026), seen as the customer at 1366 px: it opens on Module-guide cards (Start here, Your modules),
// a card opens the guide with "All guides" to come back; and the compact rail labels (customer view) have no extra tracking and stay inside their button.
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => {
  const api = async (m, u, d) => (await fetch('/api/fn/api' + u, { method: m, headers: { 'content-type': 'application/json' }, body: d ? JSON.stringify(d) : undefined })).json();
  const pr = (await api('POST', '/projects', { name: 'Guide library check', customer: 'Acme' })).project;
  const points = Object.fromEntries((window.FWBViews.GUIDE_POINTS || []).map(x => [x[0], ['About ' + x[1].toLowerCase() + '.']]));
  const mod = (name, label) => ({ name, label, learn: null, points, flows: [], sessions: [] });
  await api('PUT', `/projects/${pr.id}/docs/guide_published`, { data: { publishedAt: new Date().toISOString(), by: 'Check', project: { name: pr.name, customer: 'Acme' }, intro: 'Read this first.', modules: [mod('workorder', 'Work Orders'), mod('asset', 'Assets')] }, baseVersion: -1 });
  return pr.id;
});
await p.goto(BASE + `/?nointro#/p/${pid}/guide`); await p.reload(); await p.waitForTimeout(2500);
await p.evaluate(() => window.FWBViews.ACT.custPreview()); await p.waitForTimeout(2500);
await p.evaluate(id => { location.hash = '#/p/' + id + '/guide'; }, pid); await p.waitForTimeout(2500);
const heads = await p.$$eval('.page-body .sec-k h2', h => h.map(x => x.textContent.trim()));
const cards = await p.$$eval('.page-body .ll-card', c => c.map(x => x.querySelector('.ll-body b').textContent));
check('the customer User Guide opens on a library: Start here, Your modules', heads.join('|') === 'Start here|Your modules', heads.join('|'));
check('one card for the introduction and one per published module', cards.join('|') === 'Introduction|Work Orders|Assets', cards.join('|'));
await p.screenshot({ path: OUT + '/customer-guide-library.png' });
await p.click('.page-body [data-act="guideMod"][data-m="asset"]'); await p.waitForTimeout(800);
check('a card opens the guide, with All guides and the module menu', !!(await p.$('[data-act="guideHome"]')) && /Assets/.test(await p.textContent('.wb-nav .wb-mod.on')));
await p.click('[data-act="guideHome"]'); await p.waitForTimeout(600);
check('All guides goes back to the cards', (await p.$$('.page-body .ll-card')).length === 3);
const rail = await p.evaluate(() => [...document.querySelectorAll('body.nav-top nav.sidebar .rl-b .rl-l')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(), bb = e.closest('.rl-b').getBoundingClientRect(); return { t: e.textContent, ls: getComputedStyle(e).letterSpacing, inside: r.left >= bb.left + 4 && r.right <= bb.right - 4 && r.bottom <= bb.bottom }; }));
check('compact rail labels: no extra tracking, inside their button with room', rail.length > 0 && rail.every(x => (x.ls === 'normal' || x.ls === '0px') && x.inside), JSON.stringify(rail));
await p.locator('nav.sidebar').screenshot({ path: OUT + '/customer-rail.png' });
check('no page errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.filter(Boolean).length + '/' + res.length + ' guide library checks passed'); process.exit(res.every(Boolean) ? 0 : 1);
