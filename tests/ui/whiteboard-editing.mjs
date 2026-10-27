// Whiteboard editing like Miro: every state of an imported State Flow moves on its own, connectors stay attached, multi-select,
// group drill-in, alignment guides, context menu, copy/paste, connector re-attach, link verification, persistence, boards saved
// before the fix (flow grouped as one block), the original flow left unchanged, and a large board staying responsive.
// Usage: node tests/ui/whiteboard-editing.mjs [baseUrl] [outDir]   (start the preview first: npm run preview)
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => { const r = await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Whiteboard editing', customer: 'Acme' }) }); return (await r.json()).project.id; });
await p.goto(BASE + `/#/p/${pid}/whiteboard`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(1200);
await p.click('[data-act="wbNew"]'); await p.fill('#wbName', 'Editing test'); await p.click('#drawer .btn.primary'); await p.waitForSelector('#wbSvg'); await p.waitForTimeout(500);

const ST = () => p.evaluate(() => { const s = window.FWBViews.whiteboardState; return JSON.parse(JSON.stringify({ nodes: s.B.nodes, edges: s.B.edges, sel: [...s.sel] })); });
const screen = id => p.evaluate(i => { const s = window.FWBViews.whiteboardState; const n = s.B.nodes.find(x => x.id === i); const v = s.B.view; const r = document.getElementById('wbSvg').getBoundingClientRect(); return { x: r.left + v.x + (n.x + n.w / 2) * v.z, y: r.top + v.y + (n.y + n.h / 2) * v.z }; }, id);
const pathOf = eid => p.evaluate(i => { const g = document.querySelector(`#wbSvg [data-e="${i}"] path:nth-of-type(2)`); return g ? g.getAttribute('d') : null; }, eid);
async function dragNode(id, dx, dy, mods) { const c = await screen(id); if (mods) await p.keyboard.down(mods); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x + dx / 2, c.y + dy / 2, { steps: 4 }); await p.mouse.move(c.x + dx, c.y + dy, { steps: 4 }); await p.mouse.up(); if (mods) await p.keyboard.up(mods); await p.waitForTimeout(150); }
async function addFlows(q, n) { await p.click('[data-act="wbFlows"]'); await p.waitForSelector('#wbFlist .wb-fi'); await p.fill('#wbFq', q); await p.waitForTimeout(150); const ins = await p.$$('#wbFlist .wb-fi:not([hidden]) input'); for (const i of ins.slice(0, n)) await i.check(); await p.click('#wbFlowsGo'); await p.waitForTimeout(600); }

// one work order flow
await addFlows('work order', 1);
let s = await ST(); const frame = s.nodes.find(n => n.t === 'frame'); const states = s.nodes.filter(n => n.t === 'state');
const fid = frame.src.flowId; const origBefore = await p.evaluate(id => JSON.stringify(window.FWB.flowModel(id)), fid);
check('the flow is placed as separate states and transitions inside a frame', states.length >= 3 && s.edges.length >= 2 && states.every(n => !n.g), `${states.length} states, ${s.edges.length} transitions`);
// pick a state that has transitions
const target = states.find(n => s.edges.some(e => e.from === n.id || e.to === n.id)); const touching = s.edges.filter(e => e.from === target.id || e.to === target.id).map(e => e.id); const other = s.edges.find(e => !touching.includes(e.id));
await p.click('#wbSvg', { position: { x: 10, y: 10 } }); await p.waitForTimeout(100);
const pBefore = await Promise.all(touching.map(pathOf)); const oBefore = other ? await pathOf(other.id) : null;
await dragNode(target.id, 140, 100);
let s2 = await ST(); const moved = s2.nodes.find(n => n.id === target.id); const rest = s2.nodes.filter(n => n.id !== target.id);
check('1. a single state moves on its own', moved.x !== target.x || moved.y !== target.y, `${target.x},${target.y} -> ${moved.x},${moved.y}`);
check('2. the other states and the frame stay where they were', rest.every(n => { const o = s.nodes.find(x => x.id === n.id); return o.x === n.x && o.y === n.y; }));
check('   only the state was selected by the click', s2.sel.length === 1 && s2.sel[0] === target.id, s2.sel.length + ' selected');
const pAfter = await Promise.all(touching.map(pathOf));
check('3. its connectors follow it and stay attached', pAfter.every((d, i) => d && d !== pBefore[i]) && s2.edges.filter(e => touching.includes(e.id)).every(e => e.from === target.id || e.to === target.id), touching.length + ' connectors redrawn');
if (other) check('   connectors between other states are untouched', (await pathOf(other.id)) === oBefore);
await p.screenshot({ path: `${OUT}/wb-edit-single-move.png` });

// multi-select with shift-click, move together
const a2 = states.filter(n => n.id !== target.id).slice(0, 2);
await p.click('[data-act="wbFit"]'); await p.waitForTimeout(150); await p.click('#wbSvg', { position: { x: 10, y: 10 } }); const c1 = await screen(a2[0].id), c2 = await screen(a2[1].id); await p.mouse.click(c1.x, c1.y); await p.keyboard.down('Shift'); await p.mouse.click(c2.x, c2.y); await p.keyboard.up('Shift');
const pre = await ST(); await dragNode(a2[0].id, 0, 120); const post = await ST();
const d0 = post.nodes.find(n => n.id === a2[0].id).y - pre.nodes.find(n => n.id === a2[0].id).y, d1 = post.nodes.find(n => n.id === a2[1].id).y - pre.nodes.find(n => n.id === a2[1].id).y;
check('4. several selected states move together by the same amount', pre.sel.length === 2 && d0 > 0 && d0 === d1, `moved ${d0} and ${d1}`);
// marquee
await p.click('#wbSvg', { position: { x: 10, y: 10 } }); const fr = await p.evaluate(id => { const s = window.FWBViews.whiteboardState; const n = s.B.nodes.find(x => x.id === id); const v = s.B.view; const r = document.getElementById('wbSvg').getBoundingClientRect(); return { x0: r.left + v.x + (n.x - 10) * v.z, y0: r.top + v.y + (n.y - 10) * v.z, x1: r.left + v.x + (n.x + n.w + 400) * v.z, y1: r.top + v.y + (n.y + n.h + 400) * v.z }; }, frame.id);
await p.keyboard.down('Shift'); await p.mouse.move(fr.x0, fr.y0); await p.mouse.down(); await p.mouse.move(fr.x1, fr.y1, { steps: 6 }); await p.mouse.up(); await p.keyboard.up('Shift');
check('   a selection rectangle picks up several shapes', (await ST()).sel.length >= 2, (await ST()).sel.length + ' selected');

// group drill-in: group two, first click selects group, second click selects one
await p.click('[data-act="wbFit"]'); await p.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove())); await p.waitForTimeout(150); await p.click('#wbSvg', { position: { x: 10, y: 10 } }); const c1b = await screen(a2[0].id); await p.mouse.click(c1b.x, c1b.y); await p.keyboard.down('Shift'); const c2b = await screen(a2[1].id); await p.mouse.click(c2b.x, c2b.y); await p.keyboard.up('Shift');
await p.keyboard.press('Control+g'); await p.waitForTimeout(100); await p.click('#wbSvg', { position: { x: 10, y: 10 } });
const g1 = await screen(a2[1].id); await p.mouse.click(g1.x, g1.y); const selA = (await ST()).sel.length; await p.mouse.click(g1.x, g1.y); const selB = (await ST()).sel;
check('   groups: first click selects the group, a second click selects one member', selA === 2 && selB.length === 1 && selB[0] === a2[1].id, `${selA} then ${selB.length}`);

// alignment guides during a drag
await p.click('#wbSvg', { position: { x: 10, y: 10 } });
const note = await p.evaluate(() => { const s = window.FWBViews.whiteboardState; const st = s.B.nodes.find(n => n.t === 'state'); return { id: st.id }; });
await p.click('[data-act="wbAdd"][data-t="rect"]'); await p.waitForTimeout(150); const rectId = (await ST()).sel[0];
const tgt = (await ST()).nodes.find(n => n.id === note.id); const rc = (await ST()).nodes.find(n => n.id === rectId);
const z = await p.evaluate(() => window.FWBViews.whiteboardState.B.view.z);
const start = await screen(rectId); const dxW = (tgt.x + tgt.w / 2) - (rc.x + rc.w / 2) + 3, dyW = 300;   // 3 units off the state's centre line
await p.mouse.move(start.x, start.y); await p.mouse.down(); await p.mouse.move(start.x + dxW * z / 2, start.y + dyW * z / 2, { steps: 4 }); await p.mouse.move(start.x + dxW * z, start.y + dyW * z, { steps: 4 });
const guides = await p.$$eval('#wbSvg .wb-guide', e => e.length); await p.screenshot({ path: `${OUT}/wb-edit-guides.png` }); await p.mouse.up(); await p.waitForTimeout(100);
const all2 = (await ST()).nodes; const rcAfter = all2.find(n => n.id === rectId); const lines = n => [n.x, n.x + n.w / 2, n.x + n.w];
const aligned = all2.filter(n => n.id !== rectId).some(n => lines(n).some(a => lines(rcAfter).some(b => Math.abs(a - b) < 0.5)));
check('   alignment guides show while dragging and snap edges or centres into line', guides >= 1 && aligned, guides + ' guide(s)');

// context menu, copy / paste
await p.click('[data-act="wbFit"]'); await p.waitForTimeout(150); const cs = await screen(target.id); await p.mouse.click(cs.x, cs.y, { button: 'right' }); await p.waitForSelector('#wbCtx');
const menu = await p.$$eval('#wbCtx button', e => e.map(x => x.textContent));
check('   right-click opens a context menu for the shape', menu.some(t => /Duplicate/.test(t)) && menu.some(t => /Edit the original state flow/.test(t)) && menu.some(t => /Delete/.test(t)), menu.length + ' items');
await p.keyboard.press('Escape'); const n0 = (await ST()).nodes.length; await p.mouse.click(cs.x, cs.y); await p.keyboard.press('Control+c'); await p.keyboard.press('Control+v'); await p.waitForTimeout(150);
check('   copy and paste (Ctrl+C, Ctrl+V) add a copy', (await ST()).nodes.length === n0 + 1);
await p.keyboard.press('Delete'); await p.waitForTimeout(100); check('   delete removes the pasted copy', (await ST()).nodes.length === n0);

// connector end re-attached to another shape
const e1 = (await ST()).edges.find(e => e.ref && e.ref.transition); await p.click('[data-act="wbFit"]'); await p.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove())); await p.waitForTimeout(150);   // earlier toasts would sit over the canvas
const ep = await p.evaluate(id => { const el = document.querySelector(`#wbSvg [data-e="${id}"] path`); const L = el.getTotalLength(), m = el.getScreenCTM(); for (const f of [.35, .25, .45, .6, .7, .15, .8]) { const pt = el.getPointAtLength(L * f), x = m.a * pt.x + m.e, y = m.d * pt.y + m.f, hit = document.elementFromPoint(x, y); if (hit && hit.closest && hit.closest('[data-e]') && hit.closest('[data-e]').getAttribute('data-e') === id && !hit.closest('[data-el]')) return { x, y }; } const pt = el.getPointAtLength(L / 3); return { x: m.a * pt.x + m.e, y: m.d * pt.y + m.f }; }, e1.id);   // a point on the line not covered by a shape or the label
await p.mouse.click(ep.x, ep.y); await p.waitForTimeout(150);
const h = await p.$('#wbSvg [data-eh="to"]'); let relinked = false;
if (h) { const hb = await h.boundingBox(); const dest = await screen(rectId); await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.down(); await p.mouse.move(dest.x, dest.y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(150);
  const ee = (await ST()).edges.find(e => e.id === e1.id); relinked = ee.to === rectId && !ee.ref; }
check('   a connector end can be dragged to another shape (and stops claiming to be a configured transition)', relinked);

// a hand-drawn link between two different flows is marked as not verified
await addFlows('asset', 1); s = await ST(); const frames = s.nodes.filter(n => n.t === 'frame');
const fA = frames[0].src.flowId, fB = frames[1].src.flowId; const sa = s.nodes.find(n => n.ref && n.ref.flow === fA), sb = s.nodes.find(n => n.ref && n.ref.flow === fB);
await p.evaluate(([a, b]) => { const s = window.FWBViews.whiteboardState; s.B.edges.push({ id: 'eManual1', from: a, to: b, label: '' }); }, [sa.id, sb.id]); await p.click('[data-act="wbFit"]'); await p.waitForTimeout(200);
const kind = await p.$eval('#wbSvg [data-e="eManual1"]', g => ({ cls: g.getAttribute('class'), t: g.textContent }));
check('   a hand-drawn link between two flows is marked "Not verified"', /wb-k-manual/.test(kind.cls) && /Not verified/.test(kind.t));
await p.evaluate(() => window.FWBViews.whiteboardState.B.edges = window.FWBViews.whiteboardState.B.edges.filter(e => e.id !== 'eManual1'));
await p.screenshot({ path: `${OUT}/wb-edit-board.png` });

// persistence after reload; original unchanged
const beforeSave = await ST(); await p.evaluate(() => { const s = window.FWBViews.whiteboardState; s.dirty = true; }); await p.click('[data-act="wbZoomBy"][data-k="0.8"]'); await p.waitForTimeout(2600);
await p.reload(); await p.waitForSelector('#wbSvg'); await p.waitForTimeout(1500);
const afterLoad = await ST(); const mv2 = afterLoad.nodes.find(n => n.id === target.id);
check('5. edits persist after saving and reloading', mv2 && mv2.x === moved.x && mv2.y === moved.y && afterLoad.nodes.length === beforeSave.nodes.length, `${afterLoad.nodes.length} elements`);
check('6. the original state flow is unchanged', (await p.evaluate(id => JSON.stringify(window.FWB.flowModel(id)), fid)) === origBefore);

// a board saved before the fix (frame and all states in one group) now lets a single state move
const legacyId = await p.evaluate(async () => { const s = window.FWBViews.whiteboardState; const B = JSON.parse(JSON.stringify(s.B)); const fr = B.nodes.find(n => n.t === 'frame' && n.src); const inside = B.nodes.filter(n => n.ref && n.ref.flow === fr.src.flowId);
  [fr].concat(inside).forEach(n => { n.g = 'gLegacy1'; delete n.fr; }); B.edges.forEach(e => { delete e.fr; }); const id = window.FWBViews.items.uid('wb'); await window.FWBViews.items.put('wb', id, Object.assign(B, { name: 'Legacy board' }), { silent: true }); return id; });
await p.evaluate(() => window.FWBViews.render()); await p.waitForTimeout(300); await p.selectOption('select[data-change="wbPick"]', legacyId); await p.waitForTimeout(800);
const L = await ST(); const lst = L.nodes.find(n => n.t === 'state' && n.ref); await p.click('#wbSvg', { position: { x: 10, y: 10 } }); await dragNode(lst.id, 100, 80); const L2 = await ST();
check('   boards saved before the fix: one state now moves on its own', L2.sel.length === 1 && L2.nodes.filter(n => n.id !== lst.id).every(n => { const o = L.nodes.find(x => x.id === n.id); return o.x === n.x && o.y === n.y; }) && L2.nodes.every(n => n.g !== 'gLegacy1'));

// a large board stays usable
await p.click('[data-act="wbNew"]'); await p.fill('#wbName', 'Large board'); await p.click('#drawer .btn.primary'); await p.waitForSelector('#wbSvg'); await p.waitForTimeout(400);
await p.click('[data-act="wbFlows"]'); await p.waitForSelector('#wbFlist .wb-fi'); const ins = await p.$$('#wbFlist .wb-fi input'); for (const i of ins.slice(0, 20)) await i.check(); await p.click('#wbFlowsGo'); await p.waitForTimeout(900);
const big = await ST(); const bs = big.nodes.find(n => n.t === 'state'); const t0 = Date.now(); await dragNode(bs.id, 60, 40); const ms = Date.now() - t0;
check('7. a large board (20 flows) stays responsive while dragging', big.nodes.length > 80 && ms < 3000, `${big.nodes.length} elements, ${big.edges.length} connectors, drag took ${ms} ms`);
await p.click('[data-act="wbFit"]'); await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/wb-edit-large.png` });
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
