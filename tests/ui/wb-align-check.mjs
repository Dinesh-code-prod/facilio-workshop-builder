// Whiteboard: every Align option lines up the selected items (edges, centres, middles, even spacing), also with a locked item and state pills.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Align', customer: 'A' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/whiteboard`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(1200);
await p.click('[data-act="wbNew"]'); await p.fill('#wbName', 'Align test'); await p.click('#drawer .btn.primary'); await p.waitForSelector('#wbSvg'); await p.waitForTimeout(400);
const setup = () => p.evaluate(() => { const W = window.FWBViews.whiteboardState; W.B.nodes.length = 0; [['a', 100, 80, 120, 40, 't'], ['b', 330, 200, 180, 60, 'state'], ['c', 640, 120, 140, 40, 'rect'], ['d', 900, 330, 160, 50, 'state']].forEach(([id, x, y, w, h, t]) => W.B.nodes.push({ id, t, stype: 'open', x, y, w, h, text: id })); W.B.nodes[0].t = 'rect'; W.sel = new Set(['a', 'b', 'c', 'd']); window.FWBViews.render(); });
const pos = () => p.evaluate(() => window.FWBViews.whiteboardState.B.nodes.map(n => ({ id: n.id, x: n.x, y: n.y, w: n.w, h: n.h })));
const run = async v => { await setup(); await p.waitForTimeout(300); await p.selectOption('[data-change="wbAlign"]', v); await p.waitForTimeout(250); return pos(); };
const same = (a) => new Set(a).size === 1;
let r = await run('l'); check('left edges', same(r.map(n => n.x)));
r = await run('r'); check('right edges', same(r.map(n => n.x + n.w)));
r = await run('c'); check('centres', same(r.map(n => n.x + n.w / 2)), r.map(n => n.x + n.w / 2).join(','));
r = await run('t'); check('top edges', same(r.map(n => n.y)));
r = await run('b'); check('bottom edges', same(r.map(n => n.y + n.h)));
r = await run('m'); check('middles', same(r.map(n => n.y + n.h / 2)), r.map(n => n.y + n.h / 2).join(','));
r = await run('dh'); const gaps = r.slice().sort((a, b) => a.x - b.x).map((n, i, a) => i ? n.x - (a[i - 1].x + a[i - 1].w) : null).slice(1); check('distribute across: equal gaps', Math.max(...gaps) - Math.min(...gaps) <= 1, gaps.join(','));
r = await run('dv'); const gv = r.slice().sort((a, b) => a.y - b.y).map((n, i, a) => i ? n.y - (a[i - 1].y + a[i - 1].h) : null).slice(1); check('distribute down: equal gaps', Math.max(...gv) - Math.min(...gv) <= 1, gv.join(','));
// two whole flows (frames with states inside) align as blocks and keep their contents
await p.evaluate(() => { const W = window.FWBViews.whiteboardState; W.B.nodes.length = 0; W.B.nodes.push({ id: 'f1', t: 'frame', x: 100, y: 100, w: 300, h: 200, text: 'F1' }, { id: 's1', t: 'state', stype: 'open', fr: 'f1', x: 130, y: 160, w: 120, h: 40, text: 's1' }, { id: 'f2', t: 'frame', x: 600, y: 400, w: 300, h: 200, text: 'F2' }, { id: 's2', t: 'state', stype: 'open', fr: 'f2', x: 630, y: 460, w: 120, h: 40, text: 's2' }); W.sel = new Set(['f1', 'f2']); window.FWBViews.render(); });
await p.waitForTimeout(300); await p.selectOption('[data-change="wbAlign"]', 't'); await p.waitForTimeout(250); r = await pos(); const g = id => r.find(n => n.id === id);
check('align top edges works on whole flows and carries their states', g('f1').y === g('f2').y && g('s2').y - g('f2').y === 60 && g('s1').y - g('f1').y === 60, r.map(n => n.id + ':' + n.y).join(' '));
// a flow described in words is drawn like the State Flow Builder: state pills, last one closed, straight connections
await p.route('**/ai/flow-text', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ graph: { title: 'Request flow', nodes: [{ id: 'n1', label: 'Client raises request', kind: 'start', confidence: 'detected' }, { id: 'n2', label: 'Approver approves?', kind: 'decision', confidence: 'detected' }, { id: 'n3', label: 'Rejected', kind: 'end', confidence: 'detected' }, { id: 'n4', label: 'Work order created', kind: 'process', confidence: 'detected' }], edges: [{ from: 'n1', to: 'n2', label: '', confidence: 'detected' }, { from: 'n2', to: 'n3', label: 'Rejected', confidence: 'detected' }, { from: 'n2', to: 'n4', label: 'Approved', confidence: 'detected' }] }, useFlows: [], provider: 'test' }) }));
await p.evaluate(() => { window.FWBViews.whiteboardState.B.nodes.length = 0; }); await p.click('[data-act="wbAiText"]'); await p.fill('#wbAiT', 'Client raises a request, the approver approves or rejects it, approved becomes a work order.'); await p.click('[data-act="wbAiBuild"]'); await p.waitForSelector('[data-wbn]'); await p.click('[data-act="wbAiAdd"]'); await p.waitForTimeout(500);
const ai = await p.evaluate(() => { const W = window.FWBViews.whiteboardState; return { kinds: W.B.nodes.filter(n => n.t !== 'frame').map(n => n.t + ':' + n.stype), routes: W.B.edges.map(e => e.route) }; });
check('described flow uses State Flow Builder pills (last step closed) and straight connections', ai.kinds.length === 4 && ai.kinds.every(k => k.startsWith('state:')) && ai.kinds.includes('state:closed') && ai.routes.every(x => x === 'straight'), ai.kinds.join(' '));
await setup(); await p.evaluate(() => { const W = window.FWBViews.whiteboardState; W.sel = new Set(['a', 'b']); window.FWBViews.render(); }); await p.waitForTimeout(300); await p.selectOption('[data-change="wbAlign"]', 'dh'); await p.waitForTimeout(200);
check('distribute with two items does nothing but says why', /three/i.test(await p.evaluate(() => document.body.innerText)));
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
