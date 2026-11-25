// Film capture (25 Nov 2026; plan docs/plans/TEAM-GUIDE-FILMS-PLAN-2026-11-25.md): takes the real Delivery Studio screens a guide film shows, as 1280x720
// JPEGs (quality 50 or the shot list's quality, about 30 to 70 KB each) in public/films/<id>/, and where on them the film points (element boxes [x, y, w, h] in screen pixels), written
// to tools/film-shots/<id>.pos.json to paste into the film's POS. The shot list is tools/film-shots/<id>.mjs: export default { id, shots: [{ key, view,
// prep(p, h), top, pos: { name: selector | ['text', words, within] } }] }. It uses the demo project (Demo: Riverside Towers) and may change its data
// (a contract, a date), so ALWAYS serve a copy of the local data:
//   node build.mjs; cp tests/ui/.devdata.json <scratch>/devdata.json; node tests/ui/devserver.mjs 4391 <scratch>/devdata.json
//   PW_CHANNEL=msedge node tools/film-capture.mjs tour [http://localhost:4391] [key,key]
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [id, BASE = 'http://localhost:4391', only] = process.argv.slice(2);
if (!id) { console.log('usage: node tools/film-capture.mjs <film id> [baseUrl] [key,key]'); process.exit(1); }
const spec = (await import(pathToFileURL(path.join(root, 'tools/film-shots', id + '.mjs')).href)).default;
const OUT = path.join(root, 'public/films', id), POSF = path.join(root, 'tools/film-shots', id + '.pos.json'); fs.mkdirSync(OUT, { recursive: true });
const pos = fs.existsSync(POSF) ? JSON.parse(fs.readFileSync(POSF, 'utf8')) : {};
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' }); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const settle = ms => p.waitForTimeout(ms);
// the welcome page (Open workspace) can show on any full load; press it and wait for the app
const enter = async url => { if (url) await p.goto(url); else await p.reload(); await p.waitForSelector('[data-act="runEnter"], header.navbar', { timeout: 30000 }); if (await p.$('[data-act="runEnter"]')) { await p.click('[data-act="runEnter"]'); await p.waitForSelector('header.navbar', { timeout: 30000 }); } await settle(2000);
  if (await p.$('[data-act="custPreviewExit"]')) { await p.click('[data-act="custPreviewExit"]'); await settle(1500); } };   // a customer preview left on by an earlier run
await enter(BASE + '/?nointro');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/demo-project')).json()).id);
if (!pid) throw new Error('no demo project on ' + BASE);
// helpers for a shot's prep: the project's API, a doc write that keeps the version, closing pop-ups
const h = {
  pid, settle,
  api: (m, u, body) => p.evaluate(async ([pid, m, u, body]) => { const r = await fetch(`/api/fn/api/projects/${pid}${u}`, { method: m, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return r.ok ? r.json() : { error: r.status }; }, [pid, m, u, body]),
  async putDoc(k, data) { const r = await h.api('GET', '/docs/' + k); return h.api('PUT', '/docs/' + k, { data, baseVersion: r.version == null ? -1 : r.version }); },
  reload: () => enter(),   // after writing a doc through the API: the page reads it again
  go: async v => { await p.evaluate(v => FWBViews.go(v), v); await settle(2200); },
  clean: () => p.evaluate(() => { document.querySelectorAll('.nt-pop, .hp-banner, .fx-qpop, .toast, .toasts').forEach(e => e.remove()); }) };
await enter(`${BASE}/?nointro#/p/${pid}/projdash`); await p.evaluate(() => FWBViews.setNavPref('side', 'staff')); await settle(1200);
// one finder for pos and top: a CSS selector, or ['text', words, within] (the last element whose text starts with the words)
const find = sel => { if (!Array.isArray(sel)) return document.querySelector(sel); const [, words, within] = sel; return [...document.querySelectorAll((within || 'body') + ' *')].filter(x => x.children.length < 3 && (x.textContent || '').trim().replace(/\s+/g, ' ').startsWith(words)).pop(); };
const FIND = `(${find})`;
for (const s of spec.shots) {
  if (only && !only.split(',').includes(s.key)) continue;
  if (s.view) { if (await p.evaluate(() => !!(window.FWB && FWB.S && FWB.S.project))) await h.go(s.view); else await enter(`${BASE}/?nointro#/p/${pid}/${s.view}`); }   // a shot may have left the project (the projects home)
  if (s.prep) await s.prep(p, h);
  await p.evaluate(() => document.scrollingElement.scrollTo(0, 0));
  if (s.top) { await p.evaluate(([F, sel]) => { const e = eval(F)(sel); if (e) e.scrollIntoView({ block: 'start' }); }, [FIND, s.top[0]]); await p.evaluate(dy => { document.scrollingElement.scrollBy(0, dy); }, -(s.top[1] || 0)); }
  await settle(700); await h.clean(); await p.mouse.move(1279, 719);
  for (const [n, sel] of Object.entries(s.pos || {})) {
    pos[n] = await p.evaluate(([F, sel]) => { const e = eval(F)(sel); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }, [FIND, sel]);
    if (!pos[n]) console.log(`  ${s.key}: ${n} not found (${JSON.stringify(sel)})`);
  }
  await p.screenshot({ path: path.join(OUT, s.key + '.jpg'), type: 'jpeg', quality: spec.quality || 50 });
  console.log(s.key, (fs.statSync(path.join(OUT, s.key + '.jpg')).size / 1024).toFixed(0) + ' KB');
}
fs.writeFileSync(POSF, JSON.stringify(pos) + '\n');
const total = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`screens ${(total / 1024).toFixed(0)} KB in public/films/${id}/ · positions in tools/film-shots/${id}.pos.json` + (errs.length ? '\npage errors: ' + errs.slice(0, 3).join(' | ') : ''));
console.log('POS = ' + JSON.stringify(pos));
await b.close();
