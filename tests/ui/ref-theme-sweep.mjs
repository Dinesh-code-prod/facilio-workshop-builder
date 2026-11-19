// Reference-theme sweep: opens every team page (V.navFor()), the customer view (Preview as customer), Admin and a few drawers at 1920x1080,
// measures what breaks the theme (button and tab heights, labels off centre, clipped or overlapping controls, fonts outside the three theme
// families, violet colours, horizontal overflow) and saves a screenshot of each. Read-only apart from one throwaway project when none exists.
// Usage: node build.mjs; node tests/ui/devserver.mjs 4196; PW_CHANNEL=msedge node tests/ui/ref-theme-sweep.mjs <outDir> [baseUrl] [--tabs] [--only=view,view] [--parts=team,customer,admin,overlays]
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
const args = process.argv.slice(2); const flags = args.filter(a => a.startsWith('--')); const pos = args.filter(a => !a.startsWith('--'));
const OUT = pos[0] || 'tests/ui/out-sweep', BASE = pos[1] || 'http://localhost:4196', TABS = flags.includes('--tabs');
const ONLY = (flags.find(f => f.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const PARTS = ((flags.find(f => f.startsWith('--parts=')) || '').slice(8) || 'team,customer,admin,overlays').split(',');
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

// runs in the page: returns counts and a few examples per kind of problem inside the given root
function measure(rootSel) {
  const R = document.querySelector(rootSel); if (!R) return null;
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cd = e.closest('details:not([open])'); if (cd && !e.closest('summary') && e !== cd) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > .05 && !e.closest('[hidden],[aria-hidden="true"]'); };
  const name = e => `${e.tagName.toLowerCase()}${e.classList.length ? '.' + [...e.classList].slice(0, 3).join('.') : ''} "${(e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28)}"`;
  const fam = e => getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim();
  const OKF = /^(inter|plus jakarta sans|ibm plex mono|system-ui|-apple-system)$/i;
  const TABSEL = '[role="tab"], .tab, .mt-t, .pt-sh, .ko-chipb, .dtab, .seg button, .kb-seg button';
  const out = { btnH: [], tabH: [], offCentre: [], clipped: [], overlap: [], edge: [], btnFont: [], font: {}, violet: [], hscroll: 0 };
  const push = (k, v) => { out[k].push(v); };
  const tabs = [...R.querySelectorAll(TABSEL)].filter(vis); const tabSet = new Set(tabs);
  const btns = [...R.querySelectorAll('.btn, button')].filter(e => vis(e) && !tabSet.has(e) && !e.closest('.sidebar, .rail, .navbar, svg, .gs-pop, .tp-root, .co-card'));
  const unionRect = el => { const g = document.createRange(); g.selectNodeContents(el); const r = g.getBoundingClientRect(); return r.width > 1 ? { L: r.left, T: r.top, R: r.right, B: r.bottom } : null; };
  const centre = (el, kind) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); if (r.width > 420 || el.querySelector('.arr') || /^(left|start)$/.test(cs.textAlign) && cs.display === 'block') return; const u = unionRect(el); if (!u) return; const cl = r.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth), cr = r.right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth); const dx = Math.abs((u.L + u.R) / 2 - (cl + cr) / 2), dy = Math.abs((u.T + u.B) / 2 - (r.top + r.bottom) / 2); if ((dx > 3 && u.R - u.L < cr - cl - 4) || dy > 3) push('offCentre', `${kind} ${name(el)} dx=${dx.toFixed(1)} dy=${dy.toFixed(1)}`); };
  for (const b of btns) {
    const r = b.getBoundingClientRect(), txt = b.textContent.trim();
    const iconOnly = b.classList.contains('icon') || !txt || (r.width < 40 && r.height < 40);
    if (!OKF.test(fam(b))) push('btnFont', `${name(b)} ${fam(b)}`);
    if (!iconOnly && b.classList.contains('btn') && !b.classList.contains('link')) { const h = Math.round(r.height); const want = b.classList.contains('primary') && !b.classList.contains('sm') ? [40, 42, 46] : [34, 40]; if (!want.includes(h)) push('btnH', `${name(b)} h=${h}`); centre(b, 'btn'); }
  }
  for (const t of tabs) { const h = Math.round(t.getBoundingClientRect().height); if (h !== 34 && !t.closest('.brd-tabs, .tp-root')) push('tabH', `${name(t)} h=${h}`); centre(t, 'tab'); }
  // clipped: a control whose own box cuts its text, or which pokes out of a clipping ancestor
  const ctl = [...btns, ...tabs, ...[...R.querySelectorAll('.chip, .tag, .pill, .sd-chip, .badge, h1, h2, h3, label')].filter(vis)];
  for (const e of ctl) {
    const cs = getComputedStyle(e); const own = /(hidden|clip)/.test(cs.overflowX + cs.overflowY) && cs.textOverflow !== 'ellipsis' && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 3);
    let anc = e.parentElement, cut = ''; const r = e.getBoundingClientRect();
    for (let i = 0; anc && anc !== R && i < 6; i++, anc = anc.parentElement) { const a = getComputedStyle(anc); if (/(hidden|clip|auto|scroll)/.test(a.overflowX + a.overflowY)) { const ar = anc.getBoundingClientRect(); const scrolls = /(auto|scroll)/.test(a.overflowX + a.overflowY); if (!scrolls && (r.left < ar.left - 1 || r.right > ar.right + 1 || r.top < ar.top - 1 || r.bottom > ar.bottom + 1)) cut = name(anc); break; } }
    if (own || cut) push('clipped', `${name(e)}${cut ? ' cut by ' + cut : ' text cut'}`);
  }
  // boxes that run into the window edge (no breathing room on the right)
  const RR = R.getBoundingClientRect(); for (const e of [...btns, ...tabs, ...R.querySelectorAll('.card, .sd-w, .sd-kpi, .cs-stat, .mt-bar, .adm-card, section, table')]) { if (!vis(e)) continue; const r = e.getBoundingClientRect(); if (r.width < innerWidth * .98 && (r.right > Math.min(innerWidth, RR.right) - 4)) push('edge', `${name(e)} right=${Math.round(r.right)}`); }
  // overlapping controls (neither inside the other)
  const ints = [...new Set([...btns, ...tabs, ...[...R.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea, a[href]')].filter(vis)])].slice(0, 500);
  const rects = ints.map(e => e.getBoundingClientRect());
  for (let i = 0; i < ints.length; i++) for (let j = i + 1; j < ints.length; j++) { const a = rects[i], b = rects[j]; const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (w > 3 && h > 3 && !ints[i].contains(ints[j]) && !ints[j].contains(ints[i])) push('overlap', `${name(ints[i])} x ${name(ints[j])}`); }
  // fonts and violet
  const hue = s => { const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); if (!m || (m[4] !== undefined && +m[4] < .2)) return null; const [r, g, b] = [m[1], m[2], m[3]].map(x => x / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < .18) return null; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return h; };
  let n = 0;
  for (const e of R.querySelectorAll('*')) {
    if (++n > 6000) break; if (e.closest('svg, .tp-root, .wb-canvas, .gl-thumb, .ll-band, iframe, .mock-screen, .md-screen')) continue;
    const direct = [...e.childNodes].some(c => c.nodeType === 3 && c.textContent.trim()); if (!direct || !vis(e)) continue;
    const f = fam(e); if (!OKF.test(f)) out.font[f] = (out.font[f] || 0) + 1;
    const cs = getComputedStyle(e); for (const [k, v] of [['color', cs.color], ['bg', cs.backgroundColor]]) { const h = hue(v); if (h !== null && h >= 250 && h <= 300) { push('violet', `${name(e)} ${k} ${v}`); break; } }
  }
  out.hscroll = Math.max(0, document.scrollingElement.scrollWidth - innerWidth);
  for (const k of Object.keys(out)) if (Array.isArray(out[k])) out[k] = { n: out[k].length, ex: [...new Set(out[k])].slice(0, 6) };
  return out;
}

const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
const settle = async (ms = 700) => { await p.waitForTimeout(ms); await p.evaluate(() => document.fonts && document.fonts.ready); };
const results = []; let shotN = 0;
async function record(group, id, label, root = 'main, .main') {
  const sel = await p.evaluate(s => s.split(',').map(x => x.trim()).find(x => document.querySelector(x)) || null, root);
  const m = sel ? await p.evaluate(measure, sel) : null; const file = `${String(++shotN).padStart(3, '0')}-${group}-${id}.jpg`.replace(/[^\w.-]/g, '_');
  await p.screenshot({ path: path.join(OUT, 'shots', file), type: 'jpeg', quality: 62 });
  const score = m ? ['btnH', 'tabH', 'offCentre', 'clipped', 'overlap', 'edge', 'btnFont', 'violet'].reduce((s, k) => s + m[k].n, 0) + Object.values(m.font).reduce((a, c) => a + c, 0) + (m.hscroll ? 1 : 0) : -1;
  results.push({ group, id, label, file, score, m }); process.stdout.write(`${group}/${id} ${score}\n`);
}
async function visitTabs(group, id) {
  if (!TABS) return; const n = await p.evaluate(() => [...document.querySelectorAll('.main .page .tabs .tab, .main .page-body .tabs .tab, .main .page-body [role=tab]')].length);
  for (let i = 1; i < Math.min(n, 8); i++) { const ok = await p.evaluate(i => { const t = [...document.querySelectorAll('.main .page .tabs .tab, .main .page-body .tabs .tab, .main .page-body [role=tab]')][i]; if (!t || t.classList.contains('active')) return null; t.click(); return t.textContent.trim().slice(0, 24); }, i); if (!ok) continue; await settle(600); await record(group, `${id}~${ok}`, ok); }
}

await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached', timeout: 30000 }); await settle(1200);
if (await p.$('[data-act="runEnter"]')) { await p.click('[data-act="runEnter"]'); await settle(1500); }
const pid = process.env.SWEEP_PID || await p.evaluate(async () => { const r = await (await fetch('/api/fn/api/projects')).json().catch(() => ({})); const list = r.projects || []; if (list.length) return list[0].id; return (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Theme Sweep', customer: 'Sweep Co' }) })).json()).project.id; });
await p.goto(`${BASE}/?nointro#/p/${pid}/projdash`); await p.reload(); await p.waitForSelector('.main', { timeout: 30000 }); await settle(2000); await p.keyboard.press('Escape'); await settle(300);
const go = async v => { await p.evaluate(v => { location.hash = location.hash.replace(/(#\/p\/[^/]+)\/.*/, '$1/' + v); }, v); await settle(900); };
const navList = () => p.evaluate(() => { const V = window.FWBViews; return [...new Map(V.navFor().flatMap(g => g.items.map(i => [i[0], i[1]]))).entries()].filter(([v]) => V[v]); });
if (PARTS.includes('team')) {
  for (const [v, label] of await navList()) { if (ONLY.length && !ONLY.includes(v)) continue; await go(v); await record('team', v, label); await visitTabs('team', v); }
}
if (PARTS.includes('overlays')) {
  // drawers and dialogs that open from a plain button on common pages; Escape closes them
  for (const [v, act] of [['tasks', '[data-act="tkNew"], [data-act="newTask"], [data-act="tkAdd"]'], ['governance', '[data-act^="raidNew"], [data-act^="addRaid"], [data-act^="raidAdd"]'], ['changes', '[data-act^="crNew"], [data-act^="newCr"], [data-act^="crAdd"]'], ['settings', '[data-act="invite"], [data-act^="stInvite"], [data-act^="addPerson"]']]) {
    if (ONLY.length && !ONLY.includes(v)) continue; await go(v); const el = await p.$(act); if (!el) { console.log('no opener on', v); continue; } await el.click().catch(() => {}); await settle(900);
    await record('overlay', v, `${v} drawer`, '.drawer, .dialog, .modal, dialog[open]'); await p.keyboard.press('Escape'); await settle(400);
  }
}
if (PARTS.includes('customer')) {
  await go('projdash'); if (await p.$('[data-act="custPreview"]')) {
    await p.click('[data-act="custPreview"]'); await settle(2500);
    for (const [v, label] of await navList()) { if (ONLY.length && !ONLY.includes(v)) continue; await go(v); await record('customer', v, label); await visitTabs('customer', v); }
    await p.click('[data-act="custPreviewExit"]').catch(() => {}); await settle(1500);
  } else console.log('no Preview as customer button');
}
if (PARTS.includes('admin')) {
  await p.goto(BASE + '/?nointro'); await p.reload(); await settle(2000); if (await p.$('[data-act="runEnter"]')) { await p.click('[data-act="runEnter"]'); await settle(2000); } await p.click('[data-act="openAdmin"]'); await settle(2500);
  const n = await p.evaluate(() => document.querySelectorAll('.adm-nav .adm-ni').length); await record('admin', '0', 'Admin home', '.adm-main');
  for (let i = 0; i < n; i++) { const lab = await p.evaluate(i => { const e = document.querySelectorAll('.adm-nav .adm-ni')[i]; e.click(); return e.textContent.trim().slice(0, 30); }, i); await settle(1000); await record('admin', String(i + 1), lab, '.adm-main'); }
}
await b.close();
fs.writeFileSync(path.join(OUT, 'sweep.json'), JSON.stringify({ when: new Date().toISOString(), errs: [...new Set(errs)].slice(0, 20), results }, null, 1));
const tot = k => results.reduce((s, r) => s + (r.m ? (k === 'font' ? Object.values(r.m.font).reduce((a, c) => a + c, 0) : k === 'hscroll' ? (r.m.hscroll ? 1 : 0) : r.m[k].n) : 0), 0);
const lines = [`pages ${results.length}, page errors ${errs.length}`, ...['btnH', 'tabH', 'offCentre', 'clipped', 'overlap', 'edge', 'btnFont', 'font', 'violet', 'hscroll'].map(k => `${k}: ${tot(k)}`), '', ...results.filter(r => r.score).map(r => `${r.group}/${r.id} (${r.label}) score ${r.score}${r.m ? '\n    ' + Object.entries(r.m).filter(([k, v]) => (v && v.n) || (k === 'font' && Object.keys(v).length) || (k === 'hscroll' && v)).map(([k, v]) => k === 'font' ? `font ${JSON.stringify(v)}` : k === 'hscroll' ? `hscroll ${v}` : `${k} ${v.n}: ${v.ex.slice(0, 3).join(' | ')}`).join('\n    ') : ''}`)];
fs.writeFileSync(path.join(OUT, 'sweep.txt'), lines.join('\n')); console.log(lines.slice(0, 11).join('\n'));
