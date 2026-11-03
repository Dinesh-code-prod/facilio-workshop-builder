// Menu inventory: walks the side panel of a team project and records, for every page, its title, its tabs, the mini-tabs inside each tab, and the card headings. Read-only; run against the local preview.
// Usage: PW_CHANNEL=msedge node tests/ui/nav-inventory.mjs [baseUrl] [outDir]   -> outDir/nav-inventory.json and nav-inventory.txt
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173', OUT = process.argv[3] || 'tests/ui/out-nav'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Nav Inventory', customer: 'Inventory Co' }) })).json()).project.id);
await p.goto(`${BASE}/?nointro#/p/${pid}/overview`); await p.reload(); await p.waitForSelector('.sb-item', { state: 'attached', timeout: 30000 }); await p.waitForTimeout(1500);
// the side panel in order: section > group > sub-heading > page
const menu = await p.evaluate(() => { const out = []; let sec = '', grp = '', sub = ''; document.querySelectorAll('.sidebar .sb-sec, .sidebar .sb-title, .sidebar .sb-sub, .sidebar .sb-item').forEach(e => { const c = e.className; if (/\bsb-sec\b/.test(c)) { sec = e.textContent.trim(); sub = ''; } else if (/\bsb-title\b/.test(c)) { grp = e.textContent.trim(); sub = ''; } else if (/\bsb-sub\b/.test(c)) sub = e.textContent.trim(); else out.push({ sec, group: grp, sub, view: e.getAttribute('data-view'), label: e.textContent.trim() }); }); return out; });
const read = () => p.evaluate(() => { const m = document.querySelector('main') || document.body; const tabsets = [...m.querySelectorAll('.tabs, .subtabs, .pills, .seg')].map(t => [...t.querySelectorAll('.tab, button, a')].map(x => x.textContent.trim()).filter(Boolean)).filter(a => a.length > 1); return { title: (m.querySelector('h1') || {}).textContent || '', lead: ((m.querySelector('.page-header p') || {}).textContent || '').trim().slice(0, 140), tabsets, cards: [...m.querySelectorAll('.card-h h3, h2')].map(x => x.textContent.trim()).filter(Boolean).slice(0, 14), actions: m.querySelectorAll('[data-act]').length }; });
const pages = [];
for (const it of menu) {
  const rec = Object.assign({}, it); try {
    await p.evaluate(v => { location.hash = '#/p/' + location.hash.split('/')[2] + '/' + v; }, it.view); await p.waitForTimeout(900); rec.page = await read(); rec.tabs = [];
    const first = rec.page.tabsets[0] || [];
    if (first.length > 1 && first.length <= 12) for (let i = 0; i < first.length; i++) { try { await p.locator('main .tabs').first().locator('.tab, button').nth(i).click({ timeout: 2000 }); await p.waitForTimeout(500); rec.tabs.push(Object.assign({ tab: first[i] }, await read())); } catch (e) { rec.tabs.push({ tab: first[i], error: String(e.message).slice(0, 60) }); } }
  } catch (e) { rec.error = String(e.message).slice(0, 80); } pages.push(rec); process.stdout.write('.');
}
console.log(); fs.writeFileSync(OUT + '/nav-inventory.json', JSON.stringify({ menu: menu.length, pages, errors: errs.slice(0, 5) }, null, 1));
let t = ''; let last = ''; for (const r of pages) { const g = r.sec + ' > ' + r.group; if (g !== last) { t += '\n## ' + g + '\n'; last = g; } t += `- ${r.sub ? '[' + r.sub + '] ' : ''}${r.label}  (${r.view})${r.page ? '  -> "' + r.page.title.trim() + '"' : ''}${r.error ? ' ERROR ' + r.error : ''}\n`; if (r.page) { const ts = r.page.tabsets; if (ts.length) t += '    tabs: ' + ts.map(a => a.join(' | ')).join('   //   ') + '\n'; (r.tabs || []).forEach(x => { if (x.tabsets && x.tabsets.length > 1) t += `    in "${x.tab}": mini-tabs ${x.tabsets.slice(1).map(a => a.join(' | ')).join(' // ')}\n`; }); if (!ts.length && r.page.cards.length) t += '    cards: ' + r.page.cards.slice(0, 8).join(' | ') + '\n'; } }
fs.writeFileSync(OUT + '/nav-inventory.txt', t); console.log(`${pages.length} pages, ${pages.filter(x => x.error).length} errors, page errors: ${errs.length}`); await b.close();
