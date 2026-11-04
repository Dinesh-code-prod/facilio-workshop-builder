// Project Plan > Calendar tab: the four views load, the controls work (month step, Today, search, month picker, Filter, opening an event), the search box is readable,
// and the calendar fits the screen at phone, tablet and desktop width. Usage: PW_CHANNEL=msedge node tests/ui/plan-cal-check.mjs [baseUrl]
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const errs = [];
async function open(w, h) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
  const id = await p.evaluate(async () => (await (await fetch('/api/fn/api/demo-project', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()).id);
  await p.goto(`${BASE}/?nointro#/p/${id}/plan`); await p.reload(); await p.waitForSelector('[data-act="planTab"][data-t="cal"]', { timeout: 30000 });
  await p.evaluate(() => document.querySelector('[data-act="planTab"][data-t="cal"]').click()); await p.waitForSelector('.cal-title'); await p.waitForTimeout(1500); return p;
}
const mode = async (p, m) => { await p.evaluate(m => { const s = document.querySelector(`.cal-seg [data-m="${m}"], .cal-seg button[data-v="${m}"]`); if (s) s.click(); }, m); await p.waitForTimeout(700); };
const title = p => p.evaluate(() => document.querySelector('.cal-title').textContent.trim()); const evs = p => p.evaluate(() => document.querySelectorAll('.cal-ev,.cal-chip,.cal-row').length);
const p = await open(1500, 950); const t0 = await title(p);
check('month view shows plan items', (await evs(p)) > 0, String(await evs(p)));
for (const m of ['week', 'day', 'year', 'month']) { await mode(p, m); check(`${m} view loads`, !!(await title(p))); }
await p.click('[data-act="calStep"][data-s="1"]'); await p.waitForTimeout(400); check('next month moves forward', (await title(p)) !== t0);
await p.click('[data-act="calToday"]'); await p.waitForTimeout(500); check('Today comes back to the current month', (await title(p)) === t0);
const n0 = await evs(p); await p.fill('.cal-q', 'workshop'); await p.dispatchEvent('.cal-q', 'change'); await p.waitForTimeout(700); const n1 = await evs(p); check('search narrows the items', n1 > 0 && n1 < n0, `${n0} -> ${n1}`);
await p.fill('.cal-q', 'zzzz-no-match'); await p.dispatchEvent('.cal-q', 'change'); await p.waitForTimeout(600); check('a search with no match shows nothing', (await evs(p)) === 0);
const ink = await p.evaluate(() => { const q = document.querySelector('.cal-q'); const rgb = c => (c.match(/\d+/g) || []).map(Number); const lum = c => { const [r, g, b] = rgb(c).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; }; const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }; const bg = getComputedStyle(q).backgroundColor; return { text: ratio(getComputedStyle(q).color, bg), hint: ratio(getComputedStyle(q, '::placeholder').color, bg) }; });
check('typed text and the hint in the search box are readable (contrast 4.5 or more)', ink.text >= 4.5 && ink.hint >= 4.5, JSON.stringify(ink));
await p.fill('.cal-q', ''); await p.dispatchEvent('.cal-q', 'change'); await p.waitForTimeout(500);
await p.click('.cal-title'); await p.waitForTimeout(400); check('the month and year picker opens', !!(await p.$('.cal-pop[aria-label="Go to a month or year"]'))); await p.keyboard.press('Escape'); await p.waitForTimeout(300); check('Escape closes the picker', !(await p.$('.cal-pop[aria-label="Go to a month or year"]')));
await p.click('.cal-fb'); await p.waitForTimeout(400); check('Filter opens', !!(await p.$('.cal-fp'))); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await mode(p, 'week'); const first = await p.$('[data-act="calOpen"]'); if (first) { await first.scrollIntoViewIfNeeded(); await first.click(); await p.waitForTimeout(900); }
check('clicking an item opens it', await p.evaluate(() => !!document.querySelector('#drawer .drawer, .modal, [role="dialog"]:not(.cal-pop)')));
await p.close();
// measures the calendar itself: the top bar spilling sideways at tablet width is a separate, page-wide matter (see the roadmap)
for (const w of [390, 768, 1500]) { const q = await open(w, 900); const bad = []; for (const m of ['month', 'week', 'day', 'year']) { await mode(q, m); if (await q.evaluate(() => { const c = document.querySelector('.cal'); return c.getBoundingClientRect().right > innerWidth + 1 || c.scrollWidth > c.clientWidth + 1; })) bad.push(m); } check(`the calendar fits the screen at ${w}px in every view`, !bad.length, bad.join(', ')); await q.close(); }
check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
await b.close(); const ok = res.filter(Boolean).length; console.log(`${ok}/${res.length} checks passed`); process.exit(ok === res.length ? 0 : 1);
