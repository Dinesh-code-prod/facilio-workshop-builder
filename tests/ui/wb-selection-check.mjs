// Process whiteboard in a real browser (8 Nov 2026, user): a mouse box around a flow selects the boxes AND the arrows with their blue labels; Delete and Undo take them together;
// curved connectors; "Describe with Claude" turns a description into steps on the board (the AI answer is stubbed); every button of the top bar and the left rail is pressed once and must not throw.
// Usage: node tests/ui/wb-selection-check.mjs [baseUrl]   (set PLAYWRIGHT_BROWSERS_PATH if the browser is not in the default place)
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1500, height: 900 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Whiteboard selection', customer: 'WB' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/whiteboard`); await p.reload(); await p.waitForSelector('[data-act="wbNew"]'); await p.click('[data-act="wbNew"] >> nth=0'); await p.fill('#wbName', 'Request flow'); await p.click('[data-act="wbNewGo"]'); await p.waitForSelector('.wb-rail');
const WS = () => p.evaluate(() => { const W = window.FWBViews.whiteboardState; return { nodes: W.B.nodes.length, edges: W.B.edges.length, sel: [...W.sel].length, ids: [...W.sel].join(','), routes: W.B.edges.map(e => e.route || 'straight') }; });
// a flow built in the board model: 3 boxes and 2 labelled arrows
await p.evaluate(() => { const W = window.FWBViews.whiteboardState; W.B.nodes.push({ id: 'n1', t: 'rect', x: 200, y: 120, w: 150, h: 54, text: 'Submitted' }, { id: 'n2', t: 'rect', x: 200, y: 280, w: 150, h: 54, text: 'Assigned' }, { id: 'n3', t: 'rect', x: 480, y: 280, w: 150, h: 54, text: 'Closed' }); W.B.edges.push({ id: 'e1', from: 'n1', to: 'n2', label: 'Assign' }, { id: 'e2', from: 'n2', to: 'n3', label: 'Close' }); window.FWBViews.render(); });
await p.waitForTimeout(600);
check('3 boxes and 2 arrows with labels are drawn', (await p.locator('#wbSvg [data-id]').count()) >= 3 && (await p.locator('#wbSvg [data-e]').count()) >= 2);
// 1. mouse box over the whole flow
const getBox = () => p.evaluate(() => { const r = document.getElementById('wbSvg').getBoundingClientRect(); const v = window.FWBViews.whiteboardState.B.view; return { x: r.x + v.x, y: r.y + v.y, z: v.z }; }); let box = await getBox();
const pt = (wx, wy) => [box.x + wx * box.z, box.y + wy * box.z];
const [x0, y0] = pt(150, 70), [x1, y1] = pt(700, 400);
await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 6 }); await p.mouse.move(x1, y1, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400);
let s = await WS(); check('a mouse box around the flow selects the 3 boxes and the 2 arrows with their labels', s.sel === 5, s.sel + ' selected');
// 2. Delete takes boxes and arrows, Undo brings them all back
await p.keyboard.press('Delete'); await p.waitForTimeout(400); s = await WS(); check('Delete removes the boxes and their arrows together', s.nodes === 0 && s.edges === 0, s.nodes + ' boxes, ' + s.edges + ' arrows');
await p.click('#wbUndo'); await p.waitForTimeout(400); s = await WS(); check('Undo brings the boxes and arrows back', s.nodes === 3 && s.edges === 2, s.nodes + ' boxes, ' + s.edges + ' arrows');
// 3. a box that only holds part of the flow takes only the arrows that are between selected boxes
await p.keyboard.press('Escape'); box = await getBox(); const [a0, b0] = pt(150, 70), [a1, b1] = pt(400, 360); await p.mouse.move(a0, b0); await p.mouse.down(); await p.mouse.move(a1, b1, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
s = await WS(); check('a smaller box takes its 2 boxes and the one arrow between them (3 selected)', s.sel === 3, s.sel + ' selected: ' + s.ids); await p.keyboard.press('Escape');
// 4. curved connector: pick an arrow, press the Curved button on its bar; it is drawn as a curve and stored
await p.evaluate(() => { const W = window.FWBViews.whiteboardState; W.sel = new Set(['e1']); window.FWBViews.render(); }); await p.waitForTimeout(400);
const curveBtn = p.locator('[data-act="wbEdgeRoute"][data-v="curve"]'); check('the bar over a selected arrow offers Curved next to Straight and Right-angle', (await curveBtn.count()) === 1);
await curveBtn.click(); await p.waitForTimeout(300); s = await WS(); const d = await p.evaluate(() => { const el = document.querySelector('#wbSvg [data-e="e1"] path:not([stroke="transparent"])'); return el ? el.getAttribute('d') : ''; });
check('the arrow is stored as curved and drawn with a curve', s.routes[0] === 'curve' && /C/.test(d || ''), s.routes[0] + ' ' + (d || '').slice(0, 40));
// 5. Describe with Claude: the description becomes steps on the board (AI answer stubbed)
await p.route('**/ai/flow-text', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ provider: 'test', graph: { title: 'Purchase request', nodes: [{ id: 'a', label: 'Request raised', kind: 'start', confidence: 'detected' }, { id: 'b', label: 'Manager approves', kind: 'decision', confidence: 'inferred' }, { id: 'c', label: 'Order placed', kind: 'end', confidence: 'detected' }], edges: [{ from: 'a', to: 'b', label: 'Submit', confidence: 'detected' }, { from: 'b', to: 'c', label: 'Approve', confidence: 'inferred' }], notes: '' } }) }));
const before = await WS(); await p.click('[data-act="wbAiText"]'); await p.fill('#wbAiT', 'A staff member raises a purchase request, the manager approves it, then the order is placed.'); await p.click('[data-act="wbAiBuild"]');
await p.waitForSelector('[data-act="wbAiAdd"]', { timeout: 8000 }).catch(() => { }); check('Describe with Claude shows the steps for review with a button to add them', (await p.locator('[data-act="wbAiAdd"]').count()) === 1 && (await p.locator('[data-wbn]').count()) === 3);
await p.click('[data-act="wbAiAdd"]'); await p.waitForTimeout(900); const after = await WS(); check('the reviewed steps and arrows are added to the board', after.nodes >= before.nodes + 3 && after.edges >= before.edges + 2, before.nodes + ' -> ' + after.nodes + ' boxes, ' + before.edges + ' -> ' + after.edges + ' arrows');
// 5b. keyboard: Ctrl + click adds and removes from the selection, the selection is drawn in the app blue (not red), Ctrl+A selects everything
await p.keyboard.press('Escape'); await p.evaluate(() => { const W = window.FWBViews.whiteboardState; W.sel = new Set(); window.FWBViews.render(); }); await p.waitForTimeout(300); box = await getBox();
const click1 = async (wx, wy, mods) => { const [cx, cy] = pt(wx, wy); await p.keyboard.down('Control'); if (!mods) await p.keyboard.up('Control'); await p.mouse.click(cx, cy); if (mods) await p.keyboard.up('Control'); await p.waitForTimeout(250); };
await click1(275, 147, false); s = await WS(); const one = s.sel; await click1(275, 307, true); s = await WS(); const two = s.sel; await click1(275, 147, true); s = await WS();
check('Ctrl + click adds a box to the selection and Ctrl + click again removes it (1, 2, then 1 selected)', one === 1 && two === 2 && s.sel === 1, one + ', ' + two + ', ' + s.sel);
const stroke = await p.evaluate(() => { const w = window.FWBViews.whiteboardState; const id = [...w.sel][0]; const r = document.querySelector('#wbSvg [data-id="' + id + '"] rect'); return r ? r.getAttribute('stroke') : ''; }); check('a selected box is outlined in the app blue, not red', /1570ef/i.test(stroke), stroke);
await p.keyboard.press('Escape'); await p.focus('#wbHost'); await p.keyboard.press('Control+a'); await p.waitForTimeout(250); s = await WS(); check('Ctrl+A selects every box and arrow', s.sel === s.nodes + s.edges, s.sel + ' of ' + (s.nodes + s.edges)); await p.keyboard.press('Escape');
// 5c. exports: PDF (a real one-page PDF), PNG and JPG
for (const [fmt, ext, magic] of [['pdf', '.pdf', '%PDF-'], ['jpg', '.jpg', '\xff\xd8'], ['png', '.png', '\x89PNG']]) {
  const sel = fmt === 'png' ? '[data-act="wbExport"][data-scope="board"]:not([data-fmt])' : `[data-act="wbExport"][data-fmt="${fmt}"]`; const dl = p.waitForEvent('download', { timeout: 20000 }).catch(() => null); await p.locator(sel).first().click(); const d = await dl;
  let ok = false, info = ''; if (d) { const path = await d.path(); const fs = await import('node:fs'); const buf = fs.readFileSync(path); ok = d.suggestedFilename().endsWith(ext) && buf.slice(0, magic.length).toString('latin1') === magic && buf.length > 1500; info = d.suggestedFilename() + ' ' + buf.length + ' bytes'; if (fmt === 'pdf') { const t = buf.toString('latin1'); ok = ok && /\/Type\/Page\b/.test(t) && /DCTDecode/.test(t) && /%%EOF\s*$/.test(t); } }
  check('Export ' + fmt.toUpperCase() + ' downloads a real ' + fmt.toUpperCase() + ' file', ok, info || 'no download');
}
// 6. every button of the top bar and the left rail once
const acts = await p.evaluate(() => [...new Set([...document.querySelectorAll('.wb-page [data-act^="wb"], .wb-rail [data-act^="wb"]')].filter(e => !e.disabled).map(e => e.getAttribute('data-act')))]);
const SKIP = new Set(['wbDel', 'wbReset', 'wbPop', 'wbFull', 'wbExport', 'wbImgPick', 'wbImg', 'wbImgRead', 'wbAiText', 'wbAiBuild', 'wbAiAdd', 'wbAiClaude']);   // delete and reset change data, the others open a tab, a download or the file picker, or were tested above
let pressed = 0; for (const a of acts) { if (SKIP.has(a)) continue; const el = p.locator(`.wb-page [data-act="${a}"], .wb-rail [data-act="${a}"]`).first(); if (!(await el.isVisible().catch(() => false))) continue; await el.click({ timeout: 3000 }).catch(() => { }); pressed++; await p.waitForTimeout(150); await p.keyboard.press('Escape'); await p.evaluate(() => { if (document.getElementById('drawer') && window.FWBViews.closeDrawer) window.FWBViews.closeDrawer(); }); }
check('the duplicate "New state flow" button is gone and "Add State Flow" stays', (await p.locator('[data-act="wbNewFlow"]').count()) === 0 && (await p.locator('[data-act="wbFlows"]').count()) === 1);
check('every whiteboard button was pressed once (' + pressed + ' of ' + acts.length + ') and nothing threw', pressed >= 10 && errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(res.filter(Boolean).length + '/' + res.length + ' checks passed'); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
