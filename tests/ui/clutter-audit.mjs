// Clutter audit (24 Nov 2026): opens every side-menu entry in the staff and customer (Preview as customer) views and every Admin entry, then every
// first-level page tab, and counts what competes for attention on each screen: visible buttons, solid (primary) buttons,
// badges/pills/chips, boxes and boxes inside boxes, banners and callouts, tab rows, gradient surfaces, help-text words and tables.
// Read-only: it clicks menu entries and tabs only (never an element whose label or action reads like save/send/delete). Writes a JSON and a CSV inventory.
// Usage: node build.mjs; node tests/ui/devserver.mjs 4311 <copy of .devdata.json>; node tests/ui/clutter-audit.mjs [baseUrl] [outDir] [--views=staff,customer,admin] [--no-subtabs]
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--')), flag = n => (args.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1];
const BASE = pos[0] || 'http://localhost:4311', OUT = pos[1] || 'tests/ui/out/clutter', VIEWS = (flag('views') || 'staff,customer,admin').split(','), SUB = !args.includes('--no-subtabs');
fs.mkdirSync(OUT, { recursive: true });

// runs in the page: measures the open screen (the project main area, or the Admin main area)
function measure(root) {
  const R = document.querySelector(root) || document.body;
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const all = q => [...R.querySelectorAll(q)].filter(vis);
  const btns = all('button, a.btn, [role="button"], .btn').filter(e => !e.closest('[role="tablist"], .tabs, .seg, nav.mt-bar'));
  const solid = btns.filter(e => { const m = getComputedStyle(e).backgroundColor.match(/[\d.]+/g); if (!m) return false; const [r, g, bl, a = 1] = m.map(Number); return a > 0.5 && (bl - r > 90) && r + g + bl < 520; });
  const pills = all('.tag, .pill, .badge, .chip, .st, [class*="pill"], [class*="badge"], [class*="chip"], [class*="-tag"], .count').filter(e => e.textContent.trim().length < 40 && !e.closest('button, [role="tab"]') && !e.querySelector('.tag, .pill, .badge, .chip'));
  const boxy = e => { const cs = getComputedStyle(e); const bg = cs.backgroundColor; const filled = bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg) && bg !== 'rgb(255, 255, 255)'; const border = parseFloat(cs.borderTopWidth) > 0 && parseFloat(cs.borderLeftWidth) > 0; const sh = cs.boxShadow && cs.boxShadow !== 'none'; return (border || sh || filled) && parseFloat(cs.borderTopLeftRadius) >= 6; };
  const boxes = all('div, section, article, aside, li').filter(e => { const r = e.getBoundingClientRect(); return r.width > 120 && r.height > 48 && boxy(e); });
  const bset = new Set(boxes); const nested = boxes.filter(e => { let q = e.parentElement; while (q && q !== R) { if (bset.has(q)) return true; q = q.parentElement; } return false; });
  const banners = all('.banner, .callout, .alert, .note, .hint, .notice, .tip, .warn, [class*="banner"], [class*="callout"], [class*="notice"], [class*="-hint"], [role="note"], [role="alert"]').filter(e => e.getBoundingClientRect().width > 240 && e.textContent.trim().length > 12);
  const tablists = all('[role="tablist"], .tabs, .seg, [class$="-tabs"], [class*="-tabs "], .subtabs').filter(e => !e.closest('nav.mt-bar, nav.sidebar') && e.querySelectorAll('button, a, [role="tab"]').length > 1);
  const top = tablists.filter(t => !tablists.some(o => o !== t && o.contains(t)));
  const tabRows = top.map(t => [...t.querySelectorAll('[role="tab"], button, a')].filter(vis).map(x => x.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)).filter(Boolean));
  const grads = all('*').filter(e => /gradient\(/.test(getComputedStyle(e).backgroundImage) && e.getBoundingClientRect().width > 60).length;
  const words = all('p, .desc, .lead, .sub, .muted, .help, small, .hint, .page-desc, [class*="desc"]').filter(e => !e.closest('table, button')).reduce((n, e) => n + (e.textContent.trim().match(/\S+/g) || []).length, 0);
  const tables = all('table'), rows = tables.reduce((n, t) => n + t.querySelectorAll('tbody tr').length, 0);
  const title = (R.querySelector('h1, .page-header h2, .adm-h h1, .adm-h h2') || {}).textContent || '';
  const hdrBtns = all('.page-header button, .page-header .btn, .adm-h button, .adm-h .btn').length;
  const sc = document.querySelector('.main, .adm-main'); const height = sc ? sc.scrollHeight : document.body.scrollHeight;
  return { title: title.trim().replace(/\s+/g, ' ').slice(0, 60), buttons: btns.length, solid: solid.length, hdrBtns, pills: pills.length, boxes: boxes.length, nested: nested.length, banners: banners.length, tabRows, grads, words, tables: tables.length, rows, height };
}
const TABQ = '[role="tablist"], .tabs, .seg, [class$="-tabs"], [class*="-tabs "]';
// the tabs inside the open page that are safe to click (navigation only)
function tabTargets([root, TABQ]) {
  const R = document.querySelector(root) || document.body; const bad = /save|send|delete|remove|approve|reject|submit|create|generate|run|import|upload|publish|sign|reset|clear|archive|deploy|email|post|push|sync|new|add/i;
  const lists = [...R.querySelectorAll(TABQ)].filter(e => !e.closest('nav.mt-bar, nav.sidebar') && e.offsetParent);
  const top = lists.filter(t => !lists.some(o => o !== t && o.contains(t)));
  const out = []; top.forEach((t, li) => [...t.querySelectorAll('[role="tab"], button, a')].forEach((x, i) => { if (!x.offsetParent || x.matches('[aria-selected="true"], .active, .on') || bad.test((x.getAttribute('data-act') || '') + ' ' + x.textContent)) return; out.push({ li, i, label: x.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) }); }));
  return out.slice(0, 14);
}
function clickTab([root, TABQ, { li, i }]) {
  const R = document.querySelector(root) || document.body;
  const lists = [...R.querySelectorAll(TABQ)].filter(e => !e.closest('nav.mt-bar, nav.sidebar') && e.offsetParent);
  const top = lists.filter(t => !lists.some(o => o !== t && o.contains(t))); const x = top[li] && [...top[li].querySelectorAll('[role="tab"], button, a')][i]; if (x) x.click(); return !!x;
}

const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const settle = ms => p.waitForTimeout(ms);
p.on('dialog', d => d.dismiss().catch(() => {}));
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
const rows = []; const add = (view, group, id, label, sub, m) => rows.push({ view, group, id, label, sub, ...m, err: errs.splice(0).join(' | ') });
const enter = async () => { await p.goto(BASE + '/?nointro'); await settle(2200); if (await p.$('[data-act="runEnter"]')) { await p.click('[data-act="runEnter"]'); await settle(1500); } };
await enter();
const pid = process.env.CHECK_PID || await p.evaluate(async () => ((await (await fetch('/api/fn/api/projects')).json()).projects || [])[0].id);
const before = await p.evaluate(() => ({ staff: FWBViews.navPref('staff'), customer: FWBViews.navPref('customer'), admin: FWBViews.navPref('admin') }));

async function screen(view, group, id, label, root, reopen) {
  const m = await p.evaluate(measure, root); add(view, group, id, label, '', m);
  if (!SUB) return;
  const tabs = await p.evaluate(tabTargets, [root, TABQ]);
  for (const t of tabs) { if (!await p.evaluate(clickTab, [root, TABQ, t]).catch(() => false)) continue; await settle(600); await p.keyboard.press('Escape'); const mm = await p.evaluate(measure, root).catch(() => null); if (mm) add(view, group, id, label, t.label, mm); }
  if (tabs.length && reopen) await reopen();
}
async function project(view) {
  await p.evaluate(v => FWBViews.setNavPref('side', v), view); await settle(1000); await p.keyboard.press('Escape');
  const list = await p.evaluate(() => FWBViews.navFor().flatMap(g => g.items.filter(i => FWBViews[i[0]]).map(i => [g.g, i[0], i[1]])));
  for (const [g, v, label] of list) {
    const open = async () => { await p.evaluate(v => FWBViews.go(v), v).catch(() => {}); await settle(1100); await p.keyboard.press('Escape'); };
    await open(); await screen(view, g, v, label, '.main');
    console.log(view, v, rows.length);
  }
}
if (VIEWS.includes('staff') || VIEWS.includes('customer')) {
  await p.goto(`${BASE}/?nointro#/p/${pid}/projdash`); await settle(2800); await p.keyboard.press('Escape');
  if (VIEWS.includes('staff')) await project('staff');
  if (VIEWS.includes('customer')) { await p.evaluate(() => FWBViews.go('projdash')); await settle(1200); await p.evaluate(() => { if (!document.querySelector('[data-act="custPreview"]')) window.FWBViews.setNavPref('side'); }); await p.waitForTimeout(600); const cp = await p.$('[data-act="custPreview"]'); if (cp) { await cp.click(); await settle(2500); await project('customer'); await p.click('[data-act="custPreviewExit"]').catch(() => {}); await settle(1500); } else console.log('no Preview as customer button'); }
}
if (VIEWS.includes('admin')) {
  await enter(); await p.click('[data-act="openAdmin"]'); await settle(2500); await p.evaluate(() => FWBViews.setNavPref('side', 'admin')); await settle(1000);
  const n = await p.evaluate(() => document.querySelectorAll('.adm-nav .adm-ni').length);
  for (let i = 0; i < n; i++) { const lab = await p.evaluate(i => { const e = document.querySelectorAll('.adm-nav .adm-ni')[i]; e.click(); return (e.getAttribute('title') || e.textContent).trim().replace(/\s+/g, ' ').slice(0, 40); }, i); await settle(1200); await screen('admin', 'Admin', 'admin' + i, lab, '.adm-main'); console.log('admin', lab); }
}
await p.evaluate(bf => { for (const [v, l] of Object.entries(bf)) FWBViews.setNavPref(l, v); }, before).catch(() => {});
await b.close();
fs.writeFileSync(path.join(OUT, 'clutter.json'), JSON.stringify(rows, null, 1));
const cols = ['view', 'group', 'id', 'label', 'sub', 'title', 'buttons', 'solid', 'hdrBtns', 'pills', 'boxes', 'nested', 'banners', 'grads', 'words', 'tables', 'rows', 'height', 'err'];
const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
fs.writeFileSync(path.join(OUT, 'clutter.csv'), [cols.concat('tabRows').join(','), ...rows.map(r => cols.map(c => esc(r[c])).concat(esc(r.tabRows.map(t => t.join(' / ')).join(' || '))).join(','))].join('\n'));
console.log('screens measured', rows.length, '->', OUT);
