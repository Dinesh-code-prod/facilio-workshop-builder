// UI coverage register (27 Nov 2026; docs/plans/delivery-studio-ui-migration-plan.md): opens every UI surface the crawl can reach in the staff, customer (preview)
// and Admin views — every menu page, every page tab and mini-tab, every form / dialog opener (drawers, dialogs), the chat panel and the top-bar popovers — and measures
// each against the Facilio design system (docs/design/delivery-studio-design-system.md):
//   font  text not in Roboto          color  colours off the Facilio palette (text, fill, border)
//   pill  controls with fully round ends (Facilio uses 4 / 8 px)      tiny  text under 12 px
// Writes docs/reports/ui-coverage-register-2026-11-27.md (the register and its totals) and tests/ui/out/ui-coverage.json.
// SAFE: openers only (anything that saves, sends, deletes, exports, approves or runs is skipped); use it on a COPY of the local data:
//   copy tests/ui/.devdata.json to tests/ui/out/coverage-data.json; node tests/ui/devserver.mjs 4240 tests/ui/out/coverage-data.json; node tests/ui/ui-coverage.mjs http://localhost:4240 [--max-acts=40]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv.find(a => /^https?:/.test(a)) || 'http://localhost:4240'; const MAXA = +((process.argv.find(a => a.startsWith('--max-acts=')) || '--max-acts=40').slice(11));
const SKIP = /(del|remove|reset|logout|signout|revoke|clear|archive|reject|publish|push|send|approve|sign|confirm|apply|accept|submit|mark|decide|stop|run|export|^dl|download|sync|refresh|reload|copy|print|close|save|cancel|done|complete|finish|restore|undo|toggle|nav$|sort|page|prev|next|dismiss|pwtoggle|claude|^ai|bring|import|generate|draft|extract|analy|ask|track|seed|demo|load|upload|attach|invite|share|move|dup|clone|lock|unlock|start|play|tour|intro|replay|reveal|exit|leave|switch|navpos|custpreview|openadmin|toprojects|railgo|tab$|tktab|view$|sheet$|group|filter|qf|bulk|sel|cell)/i;
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' }); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
let errs = []; p.on('pageerror', e => errs.push(e.message)); const settle = ms => p.waitForTimeout(ms);
// ---- runs in the page: Facilio design-system findings for one surface ----
function audit(sel) {
  const root = document.querySelector(sel); if (!root) return null;
  const R = ['f3f7ff dbe9ff b5cbff 86aaff 5989ff 2e65ff 0024d6 001dae 001986 00125e', 'f0feff c6f4f8 9eebf2 64d5e0 34c0ce 168f9b 0c6068 09494f 073135 062527', 'f1fff0 cbf3c7 a7e7a1 73d06a 49b83f 29a01e 0f6f06 0a3e06 072605 061904', 'fff6f0 fad0b4 f5ac7b fd8635 ff6700 d85903 8a3f0c 64300e 3d200c 221309', 'fffbfd ffdbed ffbadc fd82b9 f5519b ed2780 ab185a 8a1549 480f28 320c1d', 'fcf2ff ebd4f3 dbb7e7 bd87cf a160b7 88439f 5b1d6f 461257 330d3f 200927', 'fff2f2 f7cccc f0a8a8 dd6c6c c93d3d b61919 870000 500000 340000 240000', 'f3f0ff ddd5fa c7baf6 9e89ed 7d63dc 5e3ed3 3c229d 311e77 251952 16102d', 'fffae0 ffed94 ffe257 ffd405 e2bc00 c6a400 8d7500 4d410a 3b330b 29240a', 'fcfeff edf5ff d8e3f1 c4d1e4 9cafca 7b91b0 607796 384a62 283648 192432', 'fafafa f5f5f5 eae9e9 dbdbdb c7c7c7 a8aaaa 898b8b 555757 414242 2d2e2e', 'ffffff 000000 d92d20 2e6ff2 0059d6 0047ab 1673f6 edf5ff 0074d1 de3500 e0e6f1'];
  const PAL = new Set(R.join(' ').split(' '));
  const hex = c => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c || ''); if (!m || (m[4] !== undefined && +m[4] < .99)) return null; return [m[1], m[2], m[3]].map(x => (+x | 0).toString(16).padStart(2, '0')).join(''); };
  const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0; };
  const skip = e => e.closest('.paper, .xls-table, .brd-doc, .word, kbd, code, pre, svg, canvas, img, video, iframe, .wb-canvas, .film, .fp-inline, [data-keep-look]');
  const out = { font: 0, color: new Map(), pill: 0, tiny: 0, n: 0, fontEx: '', pillEx: '', tinyEx: '' };
  for (const e of [root, ...root.querySelectorAll('*')].slice(0, 2500)) {
    if (!vis(e) || skip(e)) continue; out.n++; const s = getComputedStyle(e);
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own) { if (!/^"?Roboto/i.test(s.fontFamily)) { out.font++; out.fontEx = out.fontEx || (e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 2).join('.') + ' ' + s.fontFamily.split(',')[0]); }
      if (parseFloat(s.fontSize) < 12) { out.tiny++; out.tinyEx = out.tinyEx || (e.textContent.trim().slice(0, 20) + ' ' + s.fontSize); }
      const c = hex(s.color); if (c && !PAL.has(c)) out.color.set(c, (out.color.get(c) || 0) + 1); }
    for (const k of ['backgroundColor', 'borderTopColor']) { if (k === 'borderTopColor' && s.borderTopWidth === '0px') continue; const c = hex(s[k]); if (c && !PAL.has(c)) out.color.set(c, (out.color.get(c) || 0) + 1); }
    if (/^(BUTTON|A|SPAN|LABEL|INPUT|SELECT)$/.test(e.tagName)) { const r = e.getBoundingClientRect(); const rad = parseFloat(s.borderTopLeftRadius); if (rad >= Math.min(r.height / 2, 20) - 1 && rad > 12 && Math.abs(r.width - r.height) > 6 && (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.borderTopWidth !== '0px')) { out.pill++; out.pillEx = out.pillEx || (e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 3).join('.') + ' "' + e.textContent.trim().slice(0, 16) + '"'); } }
  }
  const colors = [...out.color.entries()].sort((a, b2) => b2[1] - a[1]); return { n: out.n, font: out.font, fontEx: out.fontEx, colorN: colors.length, colors: colors.slice(0, 4).map(([c, n]) => '#' + c + '×' + n), pill: out.pill, pillEx: out.pillEx, tiny: out.tiny, tinyEx: out.tinyEx };
}
const status = a => !a ? 'not opened' : (a.font === 0 && a.colorN === 0 && a.pill === 0 && a.tiny === 0 ? 'Facilio' : (a.font > 0 || a.pill > 0 || a.colorN > 3) ? 'Legacy' : 'Partly');
const existing = a => !a ? '' : [a.font ? `${a.font} non-Roboto (${a.fontEx})` : '', a.colorN ? `${a.colorN} off-palette (${a.colors.join(' ')})` : '', a.pill ? `${a.pill} pill (${a.pillEx})` : '', a.tiny ? `${a.tiny} under 12px (${a.tinyEx})` : ''].filter(Boolean).join('; ') || 'on the system';
const rows = []; const add = (pov, mod, route, tab, el, how, a, test) => rows.push({ pov, mod, route, tab, el, how, existing: existing(a), status: status(a), test, result: test.startsWith('fail') ? 'Fail' : status(a) === 'Facilio' ? 'Pass' : status(a) === 'not opened' ? 'Blocked' : 'Legacy remains', a });
const closeAll = () => p.evaluate(() => { if (window.FWBViews.closeDrawer) window.FWBViews.closeDrawer(); document.querySelectorAll('.dialog, .modal, .scrim, #userPop').forEach(e => e.remove()); [...document.body.children].filter(e => e.tagName === 'DIV' && !['app', 'drawer'].includes(e.id) && !e.classList.contains('rl-fly')).forEach(e => e.remove()); }).catch(() => { });
const surface = () => p.evaluate(() => document.querySelector('#drawer .drawer') ? '#drawer .drawer' : document.querySelector('.dialog, [role="dialog"]:not(#asst)') ? '.dialog, [role="dialog"]:not(#asst)' : '');
const title = s => p.evaluate(s => { const d = document.querySelector(s); return d ? ((d.querySelector('h1, h2, h3, .drawer-h, .dialog-h') || d).textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50) : ''; }, s);

async function crawlPages(pov, pid) {
  const nav = await p.evaluate(() => window.FWBViews.navFor().flatMap(g => g.items.map(i => [g.g.replace(/^\d+\.\s*/, ''), i[0], i[1]])).filter(([, v]) => window.FWBViews[v]));
  const go = async v => { try { await p.evaluate(v => window.FWBViews.go(v), v); } catch (e) { await p.goto(`${BASE}/?nointro#/p/${pid}/${v}`); } await settle(900); await p.keyboard.press('Escape'); };
  for (const [mod, v, label] of nav) {
    errs = []; await go(v); const a = await p.evaluate(audit, '.main'); add(pov, mod, '#/' + v, '—', 'Page: ' + label, 'menu', a, errs.length ? 'fail: page error ' + errs[0].slice(0, 60) : 'opened');
    // page tabs and mini-tabs, one by one
    const tabs = await p.evaluate(() => [...document.querySelectorAll('.main :is(.tabs [role="tab"], .tabs > .tab, .seg > button, .kb-seg > button)')].filter(e => e.offsetParent && !e.classList.contains('active') && !e.classList.contains('on')).map((e, i) => [i, (e.textContent || '').trim().slice(0, 30)]).slice(0, 14));
    for (const [, t] of tabs) {
      errs = []; await go(v); const ok = await p.evaluate(t => { const e = [...document.querySelectorAll('.main :is(.tabs [role="tab"], .tabs > .tab, .seg > button, .kb-seg > button)')].find(x => x.offsetParent && (x.textContent || '').trim().slice(0, 30) === t); if (e) { e.click(); return true; } return false; }, t).catch(() => false); await settle(600);
      const a2 = ok ? await p.evaluate(audit, '.main') : null; add(pov, mod, '#/' + v, t, 'Tab: ' + t, 'tab click', a2, !ok ? 'blocked: tab not found' : errs.length ? 'fail: page error ' + errs[0].slice(0, 60) : 'opened');
    }
    // every form / dialog opener on the page
    await go(v); const acts = await p.evaluate(SK => { const s = new RegExp(SK, 'i'); const m = new Map(); document.querySelectorAll('.main [data-act]').forEach(e => { const a = e.getAttribute('data-act'); const r = e.getBoundingClientRect(); if (!a || m.has(a) || r.width < 4 || e.disabled || e.closest('#drawer, .sidebar, #asst, header')) return; if (!s.test(a)) m.set(a, (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)); }); return [...m.entries()]; }, SKIP.source);
    for (const [act, lab] of acts.slice(0, MAXA)) {
      errs = []; await go(v); await p.evaluate(a => { const e = [...document.querySelectorAll('.main [data-act]')].find(x => x.getAttribute('data-act') === a && x.getBoundingClientRect().width > 3); if (e) { e.scrollIntoView({ block: 'center' }); e.click(); } }, act).catch(() => { }); await settle(500);
      const s = await surface(); if (!s) { await closeAll(); continue; }   // not a form opener (it changed the page in place): not a form surface
      const a3 = await p.evaluate(audit, s); const ti = await title(s); add(pov, mod, '#/' + v, '—', (s.includes('drawer') ? 'Drawer: ' : 'Dialog: ') + (ti || act), `button "${lab}" (${act})`, a3, errs.length ? 'fail: page error ' + errs[0].slice(0, 60) : 'opened and closed');
      await closeAll(); await settle(150);
    }
    console.log(pov, v, rows.length);
  }
}
async function chrome(pov) {   // the chat panel and the top-bar popovers
  for (const [el, open, sel] of [['Chat panel (Assistant)', '#asstTab', '#asst'], ['Account menu', '[data-act="userMenu"]', '#userPop'], ['Search overlay', '[data-act="gsOpen"]', '.gs-ov, .gs-panel, [role="dialog"]'], ['Notifications panel', '.bell', '.bell-pop, .upd-panel, .np-panel, [role="dialog"]']]) {
    errs = []; const ok = await p.click(open, { timeout: 2000 }).then(() => true).catch(() => false); await settle(700);
    const a = ok ? await p.evaluate(audit, sel) : null; add(pov, 'Shell', '—', '—', el, 'top bar / floating button', a, !ok ? 'blocked: opener not found' : !a ? 'blocked: panel not found' : errs.length ? 'fail: page error ' + errs[0].slice(0, 60) : 'opened and closed');
    await p.keyboard.press('Escape'); await closeAll(); await settle(300);
  }
}

await p.goto(BASE + '/?nointro'); await settle(2200); if (await p.$('[data-act="runEnter"]')) { await p.click('[data-act="runEnter"]'); await settle(1500); }
const pid = await p.evaluate(async () => { const ps = (await (await fetch('/api/fn/api/projects')).json()).projects || []; return (ps.find(x => /walkthrough/i.test(x.name)) || ps[0]).id; });
await p.goto(`${BASE}/?nointro#/p/${pid}/projdash`); await settle(2600); await p.keyboard.press('Escape');
const FMT = { top: 'Icons', side: 'Text' };   // both menu formats (user, 27 Nov 2026), set on this data copy only
for (const fm of ['top', 'side']) { await p.evaluate(f => window.FWBViews.setNavPref(f, 'staff'), fm); await settle(1200); await chrome('Staff · ' + FMT[fm]); await crawlPages('Staff · ' + FMT[fm], pid); }
await p.goto(`${BASE}/?nointro#/p/${pid}/projdash`); await settle(2200);
if (await p.$('[data-act="custPreview"]')) { await p.click('[data-act="custPreview"]'); await settle(2500); for (const fm of ['top', 'side']) { await p.evaluate(f => window.FWBViews.setNavPref(f, 'customer'), fm); await settle(1200); await crawlPages('Customer · ' + FMT[fm], pid); } await p.click('[data-act="custPreviewExit"]').catch(() => { }); await settle(1200); }
await p.goto(BASE + '/?nointro'); await settle(2000); if (await p.$('[data-act="runEnter"]')) { await p.click('[data-act="runEnter"]'); await settle(1500); } await p.evaluate(() => { const a = [...document.querySelectorAll('[data-act="openAdmin"]')].find(e => e.offsetParent); if (a) a.click(); }).catch(() => { }); await settle(2500);
const adm = await p.evaluate(() => [...document.querySelectorAll('.adm-nav .adm-ni')].map(e => (e.getAttribute('title') || e.textContent).trim().slice(0, 30)));
for (let i = 0; i < adm.length; i++) { errs = []; await p.evaluate(i => document.querySelectorAll('.adm-nav .adm-ni')[i].click(), i); await settle(1100); const a = await p.evaluate(audit, '.adm-main'); add('Admin', 'Admin', '#/admin', '—', 'Page: ' + adm[i], 'Admin menu', a, errs.length ? 'fail: page error ' + errs[0].slice(0, 60) : 'opened');
  const acts = await p.evaluate(SK => { const s = new RegExp(SK, 'i'); const m = new Map(); document.querySelectorAll('.adm-main [data-act]').forEach(e => { const a = e.getAttribute('data-act'); if (a && !m.has(a) && !s.test(a) && e.getBoundingClientRect().width > 3) m.set(a, (e.textContent || '').trim().slice(0, 40)); }); return [...m.entries()]; }, SKIP.source);
  for (const [act, lab] of acts.slice(0, MAXA)) { errs = []; await p.evaluate(i => document.querySelectorAll('.adm-nav .adm-ni')[i].click(), i); await settle(700); await p.evaluate(a => { const e = [...document.querySelectorAll('.adm-main [data-act]')].find(x => x.getAttribute('data-act') === a && x.getBoundingClientRect().width > 3); if (e) e.click(); }, act).catch(() => { }); await settle(500);
    const s = await surface(); if (!s) { await closeAll(); continue; } const a3 = await p.evaluate(audit, s); const ti = await title(s); add('Admin', 'Admin', '#/admin', adm[i], (s.includes('drawer') ? 'Drawer: ' : 'Dialog: ') + (ti || act), `button "${lab}" (${act})`, a3, errs.length ? 'fail: page error ' + errs[0].slice(0, 60) : 'opened and closed'); await closeAll(); }
}
await b.close();

// ---- the register ----
const kind = r => r.el.split(':')[0]; const cnt = f => rows.filter(f).length;
const by = k => Object.entries(rows.reduce((o, r) => { const x = k(r); (o[x] = o[x] || []).push(r); return o; }, {}));
const tot = rs => `${rs.length} | ${rs.filter(r => r.status !== 'not opened').length} | ${rs.filter(r => r.status === 'Facilio').length} | ${rs.filter(r => r.test.startsWith('opened')).length} | ${rs.filter(r => r.result === 'Pass').length} | ${rs.filter(r => r.result === 'Fail').length} | ${rs.filter(r => r.result === 'Blocked').length} | ${rs.filter(r => r.result === 'Legacy remains').length}`;
const md = ['# UI coverage register (generated ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC by tests/ui/ui-coverage.mjs)', '',
  'Every surface the crawl reached in the staff, customer (preview) and Admin views, measured against the Facilio design system. **Facilio** = no findings; **Partly** = only a few off-palette colours or small text; **Legacy** = non-Roboto text, pill controls or many off-palette colours. "Functional test" here means the surface opened, showed no page error and closed again; forms were never saved. Not reached by a crawl: states that need particular data (e.g. a record in a given state), and any action that would change data. Those are listed in the migration plan.', '',
  '## Totals', '', '| Group | Identified | Inspected | On the system | Opened OK | Passed | Failed | Blocked | Legacy remaining |', '|---|---|---|---|---|---|---|---|---|',
  `| **All** | ${tot(rows)} |`, ...by(r => r.pov).map(([k, rs]) => `| POV: ${k} | ${tot(rs)} |`), ...by(kind).map(([k, rs]) => `| ${k}s | ${tot(rs)} |`), '',
  '## Register', '', '| POV | Module | Route/Page | Tab/Subtab | UI Element | How It Opens | Existing UI | New UI Status | Functional Test | Result |', '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.pov} | ${r.mod} | ${r.route} | ${r.tab.replace(/\|/g, '/')} | ${r.el.replace(/\|/g, '/')} | ${r.how.replace(/\|/g, '/')} | ${r.existing.replace(/\|/g, '/')} | ${r.status} | ${r.test.replace(/\|/g, '/')} | ${r.result} |`)];
fs.mkdirSync('tests/ui/out', { recursive: true }); fs.writeFileSync('tests/ui/out/ui-coverage.json', JSON.stringify(rows, null, 1)); fs.writeFileSync('docs/reports/ui-coverage-register-2026-11-27.md', md.join('\n') + '\n');
console.log('surfaces', rows.length, '| Facilio', cnt(r => r.status === 'Facilio'), '| Partly', cnt(r => r.status === 'Partly'), '| Legacy', cnt(r => r.status === 'Legacy'), '| failed', cnt(r => r.result === 'Fail'), '| blocked', cnt(r => r.result === 'Blocked'));
