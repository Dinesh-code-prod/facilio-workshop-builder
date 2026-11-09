// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/drawer-forms-check.mjs [baseUrl] [--max=N] [--shots]
// Side forms (the drawer that slides in from the right): opens every one the crawl can reach, page by page, on the demo project, and measures how the fields are arranged:
//  gap  a label sits less than 10 px under the block above it (cramped)           lab  the gap between a label and its field is outside 3 to 10 px
//  ovf  something sticks out sideways                                              ovl  two fields overlap
//  unl  a field with no label   hgt  fields in one row have different heights   aln  fields in one row start at different heights   btn  two buttons touch
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
  ctl.forEach(c => { const t = c.type; const named = c.getAttribute('aria-label') || (c.id && body.querySelector('label[for="' + c.id + '"]')) || c.closest('label') || (c.parentElement && c.parentElement.querySelector(':scope > label, :scope > .f')) || (c.previousElementSibling && /^(LABEL)$/.test(c.previousElementSibling.tagName)) || (c.parentElement && c.parentElement.classList.contains('pw-wrap') && c.parentElement.previousElementSibling && c.parentElement.previousElementSibling.tagName === 'LABEL') || (c.previousElementSibling && c.previousElementSibling.previousElementSibling && c.previousElementSibling.previousElementSibling.tagName === 'LABEL'); if (!named) add('unl', (c.id || c.tagName) + ' has no label'); });
  for (let i = 0; i < ctl.length; i++) for (let j = i + 1; j < ctl.length; j++) { const a2 = R(ctl[i]), c2 = R(ctl[j]); if (Math.min(a2.bottom, c2.bottom) - Math.max(a2.top, c2.top) > 4 && Math.abs(a2.left - c2.left) > 4 && ctl[i].tagName !== 'TEXTAREA' && ctl[j].tagName !== 'TEXTAREA') { if (Math.abs(a2.height - c2.height) > 4) add('hgt', (ctl[i].id || ctl[i].tagName) + ' is ' + Math.round(a2.height) + 'px high, ' + (ctl[j].id || ctl[j].tagName) + ' ' + Math.round(c2.height) + 'px, in one row'); else if (Math.abs(a2.top - c2.top) > 3) add('aln', (ctl[i].id || ctl[i].tagName) + ' and ' + (ctl[j].id || ctl[j].tagName) + ' share a row but their tops differ by ' + Math.round(Math.abs(a2.top - c2.top)) + 'px'); } }
  const btns = [...body.querySelectorAll('button')].filter(b2 => vis(b2) && (b2.textContent || '').trim() && !b2.closest('.tabs, .seg, [role=tablist], .kb-seg, .chips')); for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) { const a2 = R(btns[i]), c2 = R(btns[j]); const gx = Math.max(a2.left, c2.left) - Math.min(a2.right, c2.right), gy = Math.max(a2.top, c2.top) - Math.min(a2.bottom, c2.bottom); const sameRow = Math.min(a2.bottom, c2.bottom) - Math.max(a2.top, c2.top) > 4, sameCol = Math.min(a2.right, c2.right) - Math.max(a2.left, c2.left) > 4; if ((sameRow && gx >= 0 && gx < 5) || (sameCol && gy >= 0 && gy < 5)) add('btn', 'buttons "' + (btns[i].textContent || '').trim().slice(0, 12) + '" and "' + (btns[j].textContent || '').trim().slice(0, 12) + '" are ' + Math.round(sameRow ? gx : gy) + 'px apart'); }
  const br = R(body); [...body.querySelectorAll('*')].filter(vis).forEach(e => { const r = R(e); if (r.right > br.right + 2 && !e.closest('.tbl-wrap, table, pre, code, [style*="overflow"]') && getComputedStyle(e).position !== 'fixed') { if (!issues.some(x => x.startsWith('ovf'))) add('ovf', `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} reaches ${Math.round(r.right - br.right)}px past the form`); } });
  return { title: title.trim().slice(0, 50), issues };
};
const go = async v => { for (let t = 0; t < 2; t++) { try { await p.evaluate(v => window.FWBViews.go(v), v); return; } catch (e) { await p.goto(BASE + '/?nointro#/p/' + pid + '/overview'); await p.reload(); await p.waitForTimeout(1800); } } };
const byAct = {}; const seen = new Set(), report = []; let opened = 0, tried = 0;
for (const v of views) {
  await go(v); await p.waitForTimeout(900);
  Object.assign(byAct, await p.evaluate(() => { const o = {}; document.querySelectorAll('.main [data-act]').forEach(e => { const a = e.getAttribute('data-act'); const at = {}; [...e.attributes].forEach(x => { if (x.name.startsWith('data-') && x.name !== 'data-act') at[x.name] = x.value; }); (o[a] = o[a] || []).length < 3 && o[a].push(at); }); return o; }).then(o => { Object.keys(o).forEach(k => { byAct[k] = (byAct[k] || []).concat(o[k]).slice(0, 4); delete o[k]; }); return {}; }));
  const acts = await p.evaluate(([OP, SK]) => { const o = new RegExp(OP, 'i'), s = new RegExp(SK, 'i'); const m = new Map(); document.querySelectorAll('.main [data-act]').forEach(e => { const a = e.getAttribute('data-act'); const r = e.getBoundingClientRect(); if (!a || m.has(a) || r.width < 4 || r.height < 4 || e.disabled || e.closest('#drawer, .sidebar, #asst')) return; if (o.test(a) && !s.test(a)) m.set(a, [...document.querySelectorAll('.main [data-act]')].indexOf(e)); }); return [...m.entries()]; }, [OPEN.source, SKIP.source]);
  for (const [act] of acts.slice(0, 40)) {
    const key = v + ':' + act; if (seen.has(key)) continue; seen.add(key); tried++;
    await go(v); await p.waitForTimeout(500);   // every opener starts from a fresh page so one click cannot spoil the next
    await p.evaluate(a => { const e = [...document.querySelectorAll('.main [data-act]')].find(x => x.getAttribute('data-act') === a && x.getBoundingClientRect().width > 3); if (e) { e.scrollIntoView({ block: 'center' }); e.click(); } }, act).catch(() => { }); await p.waitForTimeout(400);
    const m = await p.evaluate(measure).catch(() => null);
    if (m) { opened++; report.push({ view: v, act, title: m.title, issues: m.issues }); if (SHOTS) { await p.waitForTimeout(500); fs.mkdirSync('tests/ui/out/drawers', { recursive: true }); await p.locator('#drawer .drawer').screenshot({ path: `tests/ui/out/drawers/${v}-${act}.png` }).catch(() => { }); } }
    await p.evaluate(() => { const c = window.FWBViews.closeDrawer; if (c) c(); document.querySelectorAll('.dialog, .modal, .scrim').forEach(e => e.remove()); [...document.body.children].filter(e => e.tagName === 'DIV' && !['app', 'drawer'].includes(e.id)).forEach(e => e.remove());   /* an action that starts a full-screen intro or tour must not cover the next form */ }).catch(() => { }); await p.waitForTimeout(150);
    if (!(await p.evaluate(() => !!document.querySelector('.main')))) { await p.goto(BASE + '/?nointro#/p/' + pid + '/overview'); await p.reload(); await p.waitForTimeout(1500); await go(v); await p.waitForTimeout(700); }
  }
}

// direct pass (--direct): calls every action that builds a side form itself, with the attributes of a real button when one was seen, so forms behind states the crawl cannot click are reached too
if (process.argv.includes('--direct')) {
  const DANGER = /^(deleteProjectForGood|admDelete|admClone|admOwnerHand|admPw|upgradeGuest|tkExport|ftrSaveTpl|wsGroupDel)$/;
  const names = await p.evaluate(() => Object.keys(window.FWBViews.ACT).filter(n => String(window.FWBViews.ACT[n]).includes('drawer(')));
  const glob = await p.evaluate(() => { const o = {}; document.querySelectorAll('[data-id]').forEach(e => { o['data-id'] = o['data-id'] || e.getAttribute('data-id'); }); return o; });
  const KINDS = 'action agreement ai build cal capp cfgrel cflow checklist close cmodx cr decision digest discrepancy hc ho interest kpi lcstage lesson mfind minutes modbrief news note onb owner pnote raid rep res scope signoff task uat ugd utc utr vid wb tpl'.split(' ');
  const recs = await p.evaluate(async KINDS => { try { await window.FWBViews.items.load(KINDS, true); } catch (e) { } return KINDS.map(k => { const l = window.FWBViews.items.list(k); return l.length ? ['data-id', l[0].id] : null; }).filter(Boolean); }, KINDS);
  let direct = 0;
  for (const n of names) {
    if (DANGER.test(n)) continue; const tries = (byAct[n] && byAct[n].length ? byAct[n].slice(0, 2) : [{}]).concat(recs.map(([k, v]) => ({ [k]: v, 'data-i': '0', 'data-k': '0' }))).slice(0, 12);
    for (const at of tries) {
      await go('overview'); await p.waitForTimeout(250);
      await p.evaluate(async ([n, at, glob]) => { const attrs = Object.assign({}, glob, at); const el = { getAttribute: k => (k in attrs ? attrs[k] : (k.startsWith('data-') ? '' : null)), setAttribute() { }, closest: () => null, querySelector: () => null, querySelectorAll: () => [], classList: { contains: () => false, add() { }, remove() { } }, dataset: {}, value: '', checked: false, disabled: false, textContent: '', tagName: 'BUTTON', style: {}, focus() { }, blur() { } }; try { await Promise.race([window.FWBViews.ACT[n](el), new Promise(r => setTimeout(r, 1500))]); } catch (e) { } }, [n, at, glob]).catch(() => { });
      await p.waitForTimeout(350);
      const m = await p.evaluate(measure).catch(() => null);
      if (m) { direct++; report.push({ view: 'direct', act: n, title: m.title, issues: m.issues }); if (SHOTS) { await p.waitForTimeout(400); fs.mkdirSync('tests/ui/out/drawers', { recursive: true }); await p.locator('#drawer .drawer').screenshot({ path: 'tests/ui/out/drawers/direct-' + n + '.png' }).catch(() => { }); } }
      await p.evaluate(() => { const c = window.FWBViews.closeDrawer; if (c) c(); document.querySelectorAll('.dialog, .modal, .scrim').forEach(e => e.remove()); [...document.body.children].filter(e => e.tagName === 'DIV' && !['app', 'drawer'].includes(e.id)).forEach(e => e.remove());   /* an action that starts a full-screen intro or tour must not cover the next form */ }).catch(() => { });
      if (m) break;
    }
  }
  const got = new Set(report.filter(r => r.view === 'direct').map(r => r.act)); console.log('not opened by the direct pass (need a record or a state of their own): ' + names.filter(n => !got.has(n) && !DANGER.test(n)).join(' ')); opened += direct; console.log('direct pass: ' + direct + ' more side forms opened from ' + names.length + ' form-building actions');
}
const uniq = new Map(); report.forEach(r => { const k = r.title + '|' + r.issues.join('|'); if (!uniq.has(k)) uniq.set(k, r); });
const bad = [...uniq.values()].filter(r => r.issues.length); const total = bad.reduce((n, r) => n + r.issues.length, 0);
const byRule = {}; bad.forEach(r => r.issues.forEach(i => { const k = i.split(':')[0]; byRule[k] = (byRule[k] || 0) + 1; }));
console.log(`${views.length} pages, ${tried} openers tried, ${opened} side forms opened (${new Set(report.map(r => r.title)).size} different)`);
bad.forEach(r => console.log(`\n${r.view} > ${r.act} > "${r.title}"\n  ` + r.issues.slice(0, 6).join('\n  ')));
console.log(`\n${bad.length} forms with issues, ${total} issues:`, JSON.stringify(byRule), errs.length ? '\npage errors: ' + errs.slice(0, 2).join(' | ') : '');
fs.mkdirSync('tests/ui/out', { recursive: true }); fs.writeFileSync('tests/ui/out/drawer-audit.json', JSON.stringify({ opened, tried, bad }, null, 1));
await b.close(); process.exit(total > MAX ? 1 : 0);
