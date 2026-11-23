// Button colour audit (user, 23 Nov 2026: "make sure all button colours are updated in tabs, forms and layout"): opens every team page of the first project
// at 1600x900 and records each visible button's background, text colour, height and corner radius, then prints each distinct look with the pages it
// appears on, so looks outside the house set (main: Facilio blue #1570EF with white text; secondary: white with a hairline ring) stand out. Read-only.
// Usage: node build.mjs; node tests/ui/devserver.mjs 4196; PW_CHANNEL=msedge node tests/ui/button-colour-audit.mjs [baseUrl]
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4196';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const settle = ms => p.waitForTimeout(ms || 900);
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached', timeout: 30000 }); await settle(1200);
if (await p.$('[data-act="runEnter"]')) { await p.click('[data-act="runEnter"]'); await settle(1500); }
const pid = await p.evaluate(async () => ((await (await fetch('/api/fn/api/projects')).json()).projects || [])[0]?.id);
await p.goto(`${BASE}/?nointro#/p/${pid}/projdash`); await p.reload(); await p.waitForSelector('.main', { timeout: 30000 }); await settle(2000); await p.keyboard.press('Escape');
const views = await p.evaluate(() => { const V = window.FWBViews; return [...new Set(V.navFor().flatMap(g => g.items.map(i => i[0])))].filter(v => V[v]); });
const seen = new Map();   // look -> { n, pages, sample }
for (const v of views) {
  await p.evaluate(v => { location.hash = location.hash.replace(/(#\/p\/[^/]+)\/.*/, '$1/' + v); }, v); await settle();
  const rows = await p.evaluate(() => [...document.querySelectorAll('.main .btn, .main button')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 18 && !e.closest('svg, .mt-bar, [role="tab"], .seg, .tp-root'); }).map(e => {
    const cs = getComputedStyle(e); const bg = cs.backgroundImage !== 'none' ? 'gradient' : cs.backgroundColor;
    return { look: `${bg} | ${cs.color} | h${Math.round(e.getBoundingClientRect().height)} | r${parseFloat(cs.borderTopLeftRadius) > 15 ? 'pill' : Math.round(parseFloat(cs.borderTopLeftRadius))}`, cls: e.className.toString().slice(0, 40), text: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24) };
  }));
  rows.forEach(r => { const s = seen.get(r.look) || { n: 0, pages: new Set(), sample: r.cls + ' "' + r.text + '"' }; s.n++; s.pages.add(v); seen.set(r.look, s); });
}
const list = [...seen.entries()].sort((a, b) => b[1].n - a[1].n);
console.log(views.length, 'pages,', list.length, 'distinct button looks');
list.forEach(([look, s]) => console.log(String(s.n).padStart(4), look.padEnd(70), [...s.pages].slice(0, 4).join(',') + (s.pages.size > 4 ? ' +' + (s.pages.size - 4) : ''), '|', s.sample));
await b.close();
