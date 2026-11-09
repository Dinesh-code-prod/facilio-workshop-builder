// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/drawer-forms-check.mjs [baseUrl] [--max=N] [--shots]
// Side forms (the drawer that slides in from the right): opens every one the crawl can reach, page by page, on the demo project, and measures how the fields are arranged:
//  gap  a label sits less than 10 px under the block above it (cramped)           lab  the gap between a label and its field is outside 3 to 10 px
//  ovf  something sticks out sideways                                              ovl  two fields overlap
//  nar  a field is under 60% of the form width with nothing beside it   fnt  labels in one form use different sizes or weights                          stk  two fields are stacked with less than 8 px between them
// Prints the list and exits with 1 when there are more than --max issues (default 0).
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv.find(a => /^https?:/.test(a)) || 'http://localhost:4173'; const MAX = +((process.argv.find(a => a.startsWith('--max=')) || '--max=0').slice(6)); const SHOTS = process.argv.includes('--shots');
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => { const r = await (await fetch('/api/fn/api/demo-project')).json(); return (r.project || r.item || r).id; });
await p.goto(BASE + '/?nointro#/p/' + pid + '/overview'); await p.reload(); await p.waitForTimeout(2500);
const views = await p.evaluate(() => [...new Set(window.FWBViews.navFor().flatMap(g => g.items.map(i => i[0])))]);
const OPEN = /./, SKIP = /(del|remove|reset|logout|signout|revoke|clear|archive|reject|publish|push|send|approve|sign|confirm|apply|accept|submit|mark|decide|stop|run|export|^dl|download|sync|refresh|reload|copy|print|close|save|cancel|done|complete|finish|restore|undo|toggle|nav$|sort|page|prev|next|dismiss|pwtoggle|claude|^ai)/i;
const measure = () => {
  const d = document.querySelector('#drawer .drawer'); if (!d) return null; const body = d.querySelector('.drawer-b'); if (!body) return { title: '', issues: [] }; const R = e => e.getBoundingClientRect(); const vis = e => { const r = R(e); return r.width > 2 && r.height > 2 && getComputedStyle(e).visibility !== 'hidden'; };
  const title = (d.querySelector('.drawer-h h2') || {}).textContent || ''; const issues = []; const add = (k, m) => issues.push(k + ': ' + m);
  const labels = [...body.querySelectorAll('label.f')].filter(vis);
  const sty = new Set(); labels.forEach(l => { const c = getComputedStyle(l); sty.add(c.fontSize + '/' + c.fontWeight); });
  if (sty.size > 1) add('fnt', [...sty].join(' vs '));
  labels.forEach(l => {
    const lr = R(l), txt = (l.textContent || '').trim().slice(0, 28);
    let prev = l.previousElementSibling; while (prev && !vis(prev)) prev = prev.previousElementSibling;
    if (prev && !/^(H[1-6])$/.test(prev.tagName)) { const g = lr.top - R(prev).bottom; if (g < 10 && g > -2 && prev.tagName !== 'LABEL') add('gap', `"${txt}" is ${Math.round(g)}px under the block above`); }
    let nx = l.nextElementSibling; while (nx && !vis(nx)) nx = nx.nextElementSibling; if (nx && /^(INPUT|SELECT|TEXTAREA)$/.test(nx.tagName)) { const g = R(nx).top - lr.bottom; if (g < 3 || g > 10) add('lab', `"${txt}" is ${Math.round(g)}px above its field`); }
  });
  const ctl = [...body.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]), select, textarea')].filter(vis);
  for (let i = 0; i < ctl.length; i++) for (let j = i + 1; j < ctl.length; j++) { const a = R(ctl[i]), c = R(ctl[j]); const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top); if (ox > 2 && oy > 2) add('ovl', `${ctl[i].id || ctl[i].tagName} and ${ctl[j].id || ctl[j].tagName} overlap`); else if (ox > 8 && c.top - a.bottom >= 0 && c.top - a.bottom < 8 && ctl[i].parentElement === ctl[j].parentElement && !(ctl[j].previousElementSibling && ctl[j].previousElementSibling.matches('label'))) add('stk', `${ctl[i].id || ctl[i].tagName} and ${ctl[j].id || ctl[j].tagName} are ${Math.round(c.top - a.bottom)}px apart`); }
  { const bw = R(body).width; ctl.forEach(c => { const r = R(c); if (r.width < bw * .6 && r.width > 20 && !/^(number|time|date|datetime-local)$/.test(c.type) && ![...body.querySelectorAll("input, select, textarea, button")].filter(vis).some(o => o !== c && Math.min(R(o).bottom, r.bottom) - Math.max(R(o).top, r.top) > 4 && Math.abs(R(o).left - r.left) > 4)) add('nar', (c.id || c.tagName) + ' is only ' + Math.round(r.width) + 'px wide (' + Math.round(100 * r.width / bw) + '% of the form) with nothing beside it'); }); }
  const br = R(body); [...body.querySelectorAll('*')].filter(vis).forEach(e => { const r = R(e); if (r.right > br.right + 2 && !e.closest('.tbl-wrap, table, pre, code, [style*="overflow"]') && getComputedStyle(e).position !== 'fixed') { if (!issues.some(x => x.startsWith('ovf'))) add('ovf', `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} reaches ${Math.round(r.right - br.right)}px past the form`); } });
  return { title: title.trim().slice(0, 50), issues };
};
const go = async v => { for (let t = 0; t < 2; t++) { try { await p.evaluate(v => window.FWBViews.go(v), v); return; } catch (e) { await p.goto(BASE + '/?nointro#/p/' + pid + '/overview'); await p.reload(); await p.waitForTimeout(1800); } } };
const seen = new Set(), report = []; let opened = 0, tried = 0;
for (const v of views) {
  await go(v); await p.waitForTimeout(900);
  const acts = await p.evaluate(([OP, SK]) => { const o = new RegExp(OP, 'i'), s = new RegExp(SK, 'i'); const m = new Map(); document.querySelectorAll('.main [data-act]').forEach(e => { const a = e.getAttribute('data-act'); const r = e.getBoundingClientRect(); if (!a || m.has(a) || r.width < 4 || r.height < 4 || e.disabled || e.closest('#drawer, .sidebar, #asst')) return; if (o.test(a) && !s.test(a)) m.set(a, [...document.querySelectorAll('.main [data-act]')].indexOf(e)); }); return [...m.entries()]; }, [OPEN.source, SKIP.source]);
  for (const [act] of acts.slice(0, 40)) {
    const key = v + ':' + act; if (seen.has(key)) continue; seen.add(key); tried++;
    await go(v); await p.waitForTimeout(500);   // every opener starts from a fresh page so one click cannot spoil the next
    await p.evaluate(a => { const e = [...document.querySelectorAll('.main [data-act]')].find(x => x.getAttribute('data-act') === a && x.getBoundingClientRect().width > 3); if (e) { e.scrollIntoView({ block: 'center' }); e.click(); } }, act).catch(() => { }); await p.waitForTimeout(400);
    const m = await p.evaluate(measure).catch(() => null);
    if (m) { opened++; report.push({ view: v, act, title: m.title, issues: m.issues }); if (SHOTS) { await p.waitForTimeout(500); fs.mkdirSync('tests/ui/out/drawers', { recursive: true }); await p.locator('#drawer .drawer').screenshot({ path: `tests/ui/out/drawers/${v}-${act}.png` }).catch(() => { }); } }
    await p.evaluate(() => { const c = window.FWBViews.closeDrawer; if (c) c(); document.querySelectorAll('.dialog, .modal, .scrim').forEach(e => e.remove()); }).catch(() => { }); await p.waitForTimeout(150);
    if (!(await p.evaluate(() => !!document.querySelector('.main')))) { await p.goto(BASE + '/?nointro#/p/' + pid + '/overview'); await p.reload(); await p.waitForTimeout(1500); await go(v); await p.waitForTimeout(700); }
  }
}
const uniq = new Map(); report.forEach(r => { const k = r.title + '|' + r.issues.join('|'); if (!uniq.has(k)) uniq.set(k, r); });
const bad = [...uniq.values()].filter(r => r.issues.length); const total = bad.reduce((n, r) => n + r.issues.length, 0);
const byRule = {}; bad.forEach(r => r.issues.forEach(i => { const k = i.split(':')[0]; byRule[k] = (byRule[k] || 0) + 1; }));
console.log(`${views.length} pages, ${tried} openers tried, ${opened} side forms opened (${new Set(report.map(r => r.title)).size} different)`);
bad.forEach(r => console.log(`\n${r.view} > ${r.act} > "${r.title}"\n  ` + r.issues.slice(0, 6).join('\n  ')));
console.log(`\n${bad.length} forms with issues, ${total} issues:`, JSON.stringify(byRule), errs.length ? '\npage errors: ' + errs.slice(0, 2).join(' | ') : '');
fs.mkdirSync('tests/ui/out', { recursive: true }); fs.writeFileSync('tests/ui/out/drawer-audit.json', JSON.stringify({ opened, tried, bad }, null, 1));
await b.close(); process.exit(total > MAX ? 1 : 0);
