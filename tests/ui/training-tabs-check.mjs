// 5. Training & Guides: four separate tabs (Guides & Video Studio, User Guide Builder, Video to Guide, Notes & Links), each showing only its own work,
// and the Team Guide that describes them: menu levels read from the live menu, and the "Set up your Claude" section.
// Usage: PW_CHANNEL=msedge node tests/ui/training-tabs-check.mjs [baseUrl] [shotsDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173', OUT = process.argv[3] || ''; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const errs = []; const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Tabs', customer: 'T Co' }) })).json()).project.id);
const open = async v => { await p.goto(BASE + `/?nointro#/p/${pid}/${v}`); await p.reload(); await p.waitForSelector('.page-header', { timeout: 30000 }); await p.waitForTimeout(1500); };
const VIEWS = ['vstudio', 'guidebuilder', 'vidguide', 'resources'];
for (const v of VIEWS) {
  await open(v); if (OUT) await p.screenshot({ path: `${OUT}/train-${v}.png` });
  const s = await p.evaluate(() => { const body = document.querySelector('.page-body'); const bar = body.querySelector('.tp-tabs'); const rest = body.cloneNode(true); rest.querySelector('.tp-tabs') && rest.querySelector('.tp-tabs').remove(); return { n: body.querySelectorAll('.tp-tabs').length, tabs: [...bar.querySelectorAll('.tp-tab')].map(t => t.getAttribute('data-view')), on: [...bar.querySelectorAll('.tp-tab.on')].map(t => t.getAttribute('data-view')), sources: !!body.querySelector('.tp-srcs'), links: [...rest.querySelectorAll('[data-act="nav"]')].map(x => x.getAttribute('data-view')).filter(x => ['vstudio', 'guidebuilder', 'vidguide', 'resources'].includes(x)) }; });
  check(v + ': one tab bar with the four tabs, this one open', s.n === 1 && s.tabs.join() === VIEWS.join() && s.on.join() === v, s.on.join());
  check(v + ': no button pointing at another Training tab inside the page', s.links.filter(x => x !== v).length === 0, s.links.join());
  check(v + ': the "What the drafts read" panel is only on the User Guide Builder', s.sources === (v === 'guidebuilder'));
}
await open('vstudio'); await p.click('.tp-tab[data-view="resources"]'); await p.waitForTimeout(800);
check('clicking a tab opens that page', (await p.evaluate(() => location.hash)).endsWith('/resources'));
await open('vstudio'); check('the studio "What to make" list has no Document guide', !(await p.locator('select[data-k="out"] option', { hasText: 'Document guide' }).count()));
// Team Guide
await open('teamhelp'); if (OUT) await p.screenshot({ path: `${OUT}/teamguide.png`, fullPage: true });
const tg = await p.evaluate(() => { const ids = (V => V.navBase().flatMap(g => g.items.map(i => i[0])))(window.FWBViews); const inGuide = new Set([...document.querySelectorAll('.tg2-pg')].map(x => x.getAttribute('data-view'))); return { missing: ids.filter(i => !inGuide.has(i)), subs: [...document.querySelectorAll('#tg2-3 .tg2-lv')].map(x => x.textContent), setup: !!document.querySelector('#tg2-setup'), tiles: [...document.querySelectorAll('#tg2-setup .tg2-tile b')].map(x => x.textContent), violet: [...document.querySelectorAll('.tg2-n')].map(x => getComputedStyle(x).backgroundImage).join().includes('106, 61, 240') }; });
check('the menu map lists every page of the menu', tg.missing.length === 0, tg.missing.join());
check('stage 3 shows the menu sub-headings in order', tg.subs.join('|') === 'Build the solution|Set up access, alerts and data|Agents|Record all configuration|Write the BRD', tg.subs.join('|'));
check('the Set up your Claude section covers connector, skills and plugins', tg.setup && tg.tiles.some(t => /Connector/.test(t)) && tg.tiles.some(t => /Skills/.test(t)) && tg.tiles.some(t => /Plugins/.test(t)), tg.tiles.length + ' tiles');
check('no violet left in the Team Guide', !tg.violet);
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
