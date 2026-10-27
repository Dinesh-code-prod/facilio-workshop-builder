// Process Whiteboard, end to end in a browser against the local preview (start it with FAKE_CLAUDE=1 to exercise the image import review with the
// local test double; without it the import must explain that Claude is needed). Usage: node tests/ui/whiteboard-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => { const have = (await (await fetch('/api/fn/api/projects')).json()).projects || []; if (have.length) return have[0].id; const r = await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Whiteboard test', customer: 'Acme' }) }); return (await r.json()).project.id; });
await p.goto(BASE + `/#/p/${pid}/whiteboard`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(1500);
check('menu has Process Whiteboard under Process & State Flows', await p.evaluate(() => window.FWBViews.navFor().some(g => g.g === 'Process & State Flows' && g.items.some(i => i[0] === 'whiteboard'))));
const W = () => p.evaluate(() => { const s = window.FWBViews.whiteboardState; return s.B ? { nodes: s.B.nodes.length, edges: s.B.edges.length, frames: s.B.nodes.filter(n => n.t === 'frame').length, states: s.B.nodes.filter(n => n.t === 'state').length, sel: s.sel.size, undo: s.undo.length, name: s.B.name } : null; });
// new board
await p.click('[data-act="wbNew"]'); await p.fill('#wbName', 'Order to cash'); await p.click('#drawer .btn.primary'); await p.waitForSelector('#wbSvg'); await p.waitForTimeout(600);
check('a new board is created and opened', (await W())?.name === 'Order to cash');
// notes, shapes, text editing
await p.click('[data-act="wbAdd"][data-t="note"]'); await p.waitForSelector('.wb-edit'); await p.keyboard.type('Customer raises a request'); await p.click('#wbSvg', { position: { x: 30, y: 30 } }); await p.waitForTimeout(200);
await p.click('[data-act="wbAdd"][data-t="rect"]'); await p.waitForTimeout(200); await p.click('[data-act="wbAdd"][data-t="diamond"]'); await p.waitForTimeout(200);
let s = await W(); check('sticky note, box and decision added', s.nodes === 3, JSON.stringify(s));
check('note text is saved as plain text', await p.evaluate(() => window.FWBViews.whiteboardState.B.nodes[0].text === 'Customer raises a request'));
// move the decision apart, then connect note -> decision with the Connect tool by dragging between them
const box = id => p.evaluate(i => { const n = window.FWBViews.whiteboardState.B.nodes[i]; const v = window.FWBViews.whiteboardState.B.view; const r = document.getElementById('wbSvg').getBoundingClientRect(); return { x: r.left + v.x + (n.x + n.w / 2) * v.z, y: r.top + v.y + (n.y + n.h / 2) * v.z }; }, id);
let c2 = await box(2); await p.mouse.move(c2.x, c2.y); await p.mouse.down(); await p.mouse.move(c2.x + 260, c2.y + 140, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200);
await p.click('[data-act="wbTool"][data-wbtool="connect"]'); const c0 = await box(0); c2 = await box(2);
await p.mouse.move(c0.x, c0.y); await p.mouse.down(); await p.mouse.move(c2.x, c2.y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
s = await W(); check('connector drawn with the Connect tool', s.edges === 1, JSON.stringify(s));
await p.click('[data-act="wbTool"][data-wbtool="select"]');
// undo / redo
await p.click('#wbUndo'); await p.waitForTimeout(150); const u1 = await W(); await p.click('#wbRedo'); await p.waitForTimeout(150); const u2 = await W();
check('undo removes the connector and redo brings it back', u1.edges === 0 && u2.edges === 1);
// add real state flows from the project
await p.click('[data-act="wbFlows"]'); await p.waitForSelector('#wbFlist .wb-fi'); const total = await p.$$eval('#wbFlist .wb-fi', e => e.length);
await p.fill('#wbFq', 'work order'); await p.waitForTimeout(150); const shown = await p.$$eval('#wbFlist .wb-fi', e => e.filter(x => !x.hidden).length);
check('state flow list comes from the project and is searchable', total > 3 && shown >= 1 && shown < total, `${total} flows, ${shown} match "work order"`);
const picks = await p.$$('#wbFlist .wb-fi:not([hidden]) input'); await picks[0].check(); await p.fill('#wbFq', ''); await p.waitForTimeout(100); const all = await p.$$('#wbFlist .wb-fi input'); await all[0].check(); await p.waitForTimeout(200);
check('a preview of the picked flow is shown', !!(await p.$('#wbPrev svg')));
const want = await p.evaluate(() => [...document.querySelectorAll('#wbFlist input:checked')].map(i => i.value));
const before = await p.evaluate(ids => ids.map(id => JSON.stringify(window.FWB.flowModel(id))), want);
await p.click('#wbFlowsGo'); await p.waitForTimeout(600);
s = await W(); const expect = await p.evaluate(ids => ids.reduce((a, id) => a + window.FWB.flowModel(id).states.length, 0), want);
check('picked flows are placed with their real states and transitions', s.frames === want.length && s.states === expect, `${s.frames} frames, ${s.states} states (expected ${expect})`);
// move a state on the board and confirm the original flow is unchanged
await p.evaluate(() => { const st = window.FWBViews.whiteboardState.B.nodes.find(n => n.t === 'state'); st.x += 200; st.text = 'Renamed on the board'; });
const after = await p.evaluate(ids => ids.map(id => JSON.stringify(window.FWB.flowModel(id))), want);
check('the original state flows are not changed by the board', JSON.stringify(before) === JSON.stringify(after));
await p.screenshot({ path: `${OUT}/whiteboard-flows.png` });
// align and group two notes
await p.evaluate(() => { const W = window.FWBViews.whiteboardState; W.sel = new Set(W.B.nodes.filter(n => n.t === 'note' || n.t === 'rect').map(n => n.id)); window.FWBViews.render(); });
await p.waitForTimeout(400); await p.selectOption('[data-change="wbAlign"]', 't'); await p.waitForTimeout(150);
const al = await p.evaluate(() => { const ns = window.FWBViews.whiteboardState.B.nodes.filter(n => n.t === 'note' || n.t === 'rect'); return ns.map(n => n.y); });
check('align top edges', new Set(al).size === 1, al.join(','));
await p.click('[data-act="wbGroup"]'); await p.waitForTimeout(150); check('group', await p.evaluate(() => { const ns = window.FWBViews.whiteboardState.B.nodes.filter(n => n.t === 'note' || n.t === 'rect'); return ns[0].g && ns.every(n => n.g === ns[0].g); }));
// image import (with the local test double when FAKE_CLAUDE=1)
await p.click('[data-act="wbImg"]'); await p.waitForSelector('#drawer');
const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-act="wbImgPick"]')]);
const png = Buffer.from(await p.evaluate(async () => { const c = document.createElement('canvas'); c.width = 400; c.height = 200; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 400, 200); g.strokeRect(20, 60, 100, 40); g.strokeRect(250, 60, 100, 40); g.fillText('Submitted', 40, 85); g.fillText('Closed', 280, 85); return [...new Uint8Array(await (await new Promise(r => c.toBlob(r, 'image/png'))).arrayBuffer())]; }));
await chooser.setFiles({ name: 'flow.png', mimeType: 'image/png', buffer: png }); await p.waitForTimeout(300);
await p.click('#wbImgRead'); await p.waitForSelector('#wbImgOut .tbl, #wbImgOut .notice.err', { timeout: 20000 });
const rv = await p.evaluate(() => ({ rows: document.querySelectorAll('#wbImgOut [data-wbn]').length, uncertain: document.querySelectorAll('#wbImgOut .tag.red').length, err: (document.querySelector('#wbImgOut .notice.err') || {}).textContent || '', dropped: (document.querySelector('#wbImgOut .notice.warn') || {}).textContent || '', script: document.querySelector('#wbImgOut').innerHTML.includes('<script') }));
if (rv.err) check('image import explains that Claude is needed when no key is set', /needs Claude/.test(rv.err), rv.err.slice(0, 90));
else {
  check('image import shows a review with unsure parts marked', rv.rows === 5 && rv.uncertain >= 1, JSON.stringify(rv));
  check('a connection to a missing step is dropped and reported', /not in the diagram/.test(rv.dropped));
  check('markup in a label is not rendered', !rv.script);
  await p.screenshot({ path: `${OUT}/whiteboard-import-review.png` });
  const n0 = (await W()).nodes; await p.click('#drawer .drawer-f .btn.primary'); await p.waitForTimeout(1500);
  const s2 = await p.evaluate(() => { const B = window.FWBViews.whiteboardState.B; return { img: B.nodes.filter(n => n.t === 'image').length, dashed: B.nodes.filter(n => n.conf && n.conf !== 'detected').length, nodes: B.nodes.length }; });
  check('accepted steps become board elements, with the image kept as a reference layer', s2.nodes - n0 === 7 && s2.img === 1 && s2.dashed >= 2, JSON.stringify(s2));
}
await p.keyboard.press('Escape');
// persistence: reload and reopen
await p.waitForTimeout(1500); const n1 = (await W()).nodes; await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(1500);
await p.evaluate(() => window.FWBViews.go('whiteboard')); await p.waitForTimeout(1200);
check('the board is saved and reopens after a reload', (await W())?.nodes === n1, `${n1} elements`);
await p.click('[data-act="wbFit"]'); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/whiteboard-board.png` });
// PNG export: decode the downloaded file and check size and that it is not blank
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.page-header [data-act="wbExport"]')]); const f = `${OUT}/${dl.suggestedFilename()}`; await dl.saveAs(f);
const img = await p.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let ink = 0; for (let i = 0; i < d.length; i += 16) if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200) ink++; return { w: im.width, h: im.height, ink }; }, fs.readFileSync(f).toString('base64'));
check('board PNG export holds the whole board, not just the view', img.w > 1500 && img.ink > 2000, JSON.stringify(img));
// selection export (one frame = one diagram)
await p.evaluate(() => { const W = window.FWBViews.whiteboardState; const fr = W.B.nodes.find(n => n.t === 'frame'); W.sel = new Set([fr.id]); window.FWBViews.render(); }); await p.waitForTimeout(400);
const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('.wb-tb [data-act="wbExport"][data-scope="sel"]')]); check('a single diagram exports on its own', /_selection\.png$/.test(dl2.suggestedFilename()));
// Miro link: only real Miro board links are accepted
await p.click('[data-act="wbMiro"]'); await p.fill('#wbMiroUrl', 'javascript:alert(1)'); await p.click('[data-act="wbMiroSave"]'); await p.waitForTimeout(200);
const bad = await p.evaluate(() => window.FWBViews.whiteboardState.B.miro); await p.fill('#wbMiroUrl', 'https://miro.com/app/board/uXjVKExample=/'); await p.click('[data-act="wbMiroSave"]'); await p.waitForTimeout(200);
check('Miro link: unsafe links refused, a board link saved', bad !== 'javascript:alert(1)' && await p.evaluate(() => window.FWBViews.whiteboardState.B.miro) === 'https://miro.com/app/board/uXjVKExample=/');
// phone width: the board stays usable
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400); check('phone width: no sideways page scrolling', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
await p.screenshot({ path: `${OUT}/whiteboard-phone.png` });
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
