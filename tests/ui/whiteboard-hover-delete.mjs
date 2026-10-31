// Whiteboard, Miro-style deletion and editing: hovering an element shows a delete button without deleting anything, the button deletes
// only that element (and the connectors on it) without starting a drag, Delete/Backspace delete the selection, undo/redo restore it,
// Shift+click multi-select moves several elements with their connectors attached, zoom keeps the button on the element, a large
// selection asks before deleting, the board persists after a reload, and a state of an imported State Flow can be selected and deleted
// on its own while the State Flow itself is left unchanged.
// Usage: node tests/ui/whiteboard-hover-delete.mjs [baseUrl] [outDir]   (start the preview first: npm run preview)
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => { const r = await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Whiteboard delete', customer: 'Acme' }) }); return (await r.json()).project.id; });
await p.goto(BASE + `/#/p/${pid}/whiteboard`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(1200);
await p.click('[data-act="wbNew"]'); await p.fill('#wbName', 'Delete test'); await p.click('#drawer .btn.primary'); await p.waitForSelector('#wbSvg'); await p.waitForTimeout(500);

const ST = () => p.evaluate(() => { const s = window.FWBViews.whiteboardState; return JSON.parse(JSON.stringify({ nodes: s.B.nodes, edges: s.B.edges, sel: [...s.sel], undo: s.undo.length })); });
const centre = id => p.evaluate(i => { const s = window.FWBViews.whiteboardState; const n = s.B.nodes.find(x => x.id === i); const v = s.B.view; const r = document.getElementById('wbSvg').getBoundingClientRect(); return { x: r.left + v.x + (n.x + n.w / 2) * v.z, y: r.top + v.y + (n.y + n.h / 2) * v.z }; }, id);
const chip = () => p.evaluate(() => { const g = document.querySelector('#wbSvg [data-del]'); if (!g) return null; const r = g.getBoundingClientRect(); return { id: g.getAttribute('data-del'), x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
// three shapes in a row, placed by the API the toolbar uses, then two connectors a→b→c
await p.evaluate(() => { const s = window.FWBViews.whiteboardState; const mk = (id, x) => ({ id, t: 'rect', x, y: 100, w: 160, h: 80, text: id.toUpperCase() }); s.B.nodes.push(mk('na', 100), mk('nb', 400), mk('nc', 700)); s.B.edges.push({ id: 'e1', from: 'na', to: 'nb', label: '' }, { id: 'e2', from: 'nb', to: 'nc', label: '' }); s.B.view = { x: 40, y: 120, z: 1 }; });
await p.evaluate(() => window.FWBViews.render()); await p.waitForTimeout(400);

let c = await centre('nb'); await p.mouse.move(c.x, c.y); await p.waitForTimeout(250);
let k = await chip(); check('hovering a shape shows a delete button on it', k && k.id === 'nb', JSON.stringify(k));
let s = await ST(); check('hovering deletes nothing', s.nodes.length === 3 && s.edges.length === 2);
await p.mouse.move(c.x + 400, c.y + 300); await p.waitForTimeout(250); check('moving away hides the button again', !(await chip()));
await p.mouse.move(c.x, c.y); await p.waitForTimeout(200); k = await chip(); const before = (await ST()).nodes.find(n => n.id === 'nb');
await p.mouse.move(k.x, k.y); await p.waitForTimeout(150); await p.mouse.down(); await p.mouse.move(k.x + 60, k.y + 40, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(250);
s = await ST(); check('clicking the button deletes only that shape and its connectors', s.nodes.map(n => n.id).join() === 'na,nc' && s.edges.length === 0, JSON.stringify(s.nodes.map(n => n.id)));
check('pressing on the button never drags anything', s.nodes.find(n => n.id === 'na').x === 100 && s.nodes.find(n => n.id === 'nc').x === 700);
await p.keyboard.press('Control+z'); await p.waitForTimeout(250); s = await ST();
check('Ctrl+Z restores the shape and both connectors in place', s.nodes.length === 3 && s.edges.length === 2 && s.nodes.find(n => n.id === 'nb').x === before.x);
await p.keyboard.press('Control+Shift+z'); await p.waitForTimeout(250); s = await ST(); check('redo deletes it again', s.nodes.length === 2 && s.edges.length === 0);
await p.keyboard.press('Control+z'); await p.waitForTimeout(250);

// a connector: hover, delete button, delete only the connector
const ec = await p.evaluate(() => { const g = document.querySelector('#wbSvg [data-e="e1"]'); const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
await p.mouse.move(ec.x, ec.y); await p.waitForTimeout(250); k = await chip(); check('hovering a connector shows a delete button for it', k && k.id === 'e1', JSON.stringify(k));
await p.mouse.click(k.x, k.y); await p.waitForTimeout(250); s = await ST(); check('the connector is deleted, its shapes stay', s.edges.map(e => e.id).join() === 'e2' && s.nodes.length === 3);
await p.keyboard.press('Control+z'); await p.waitForTimeout(250);

// click to select, Delete key, click empty canvas to deselect
c = await centre('nc'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(150); s = await ST(); check('a click selects the shape', s.sel.join() === 'nc');
await p.keyboard.press('Delete'); await p.waitForTimeout(250); s = await ST(); check('Delete removes the selected shape', !s.nodes.some(n => n.id === 'nc') && s.edges.length === 1);
await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
c = await centre('na'); await p.mouse.click(c.x, c.y); await p.waitForTimeout(100); await p.keyboard.press('Backspace'); await p.waitForTimeout(250); s = await ST(); check('Backspace removes it too', !s.nodes.some(n => n.id === 'na')); await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
const box = await p.locator('#wbSvg').boundingBox(); await p.mouse.click(box.x + box.width - 60, box.y + box.height - 160); await p.waitForTimeout(150); s = await ST(); check('a click on empty canvas clears the selection', s.sel.length === 0);

// multi-select with Shift and move together; connectors follow
c = await centre('na'); await p.mouse.click(c.x, c.y); const cb = await centre('nb'); await p.keyboard.down('Shift'); await p.mouse.click(cb.x, cb.y); await p.keyboard.up('Shift'); await p.waitForTimeout(150);
s = await ST(); check('Shift+click adds to the selection', s.sel.sort().join() === 'na,nb');
const pathBefore = await p.evaluate(() => document.querySelector('#wbSvg [data-e="e2"] path:nth-of-type(2)').getAttribute('d'));
await p.mouse.move(cb.x, cb.y); await p.mouse.down(); await p.mouse.move(cb.x + 40, cb.y + 80, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250);
s = await ST(); const na = s.nodes.find(n => n.id === 'na'), nb = s.nodes.find(n => n.id === 'nb'), nc = s.nodes.find(n => n.id === 'nc');
check('both selected shapes move together; the other stays', na.y > 100 && nb.y > 100 && na.y === nb.y && nc.y === 100, `${na.y} ${nb.y} ${nc.y}`);
const pathAfter = await p.evaluate(() => document.querySelector('#wbSvg [data-e="e2"] path:nth-of-type(2)').getAttribute('d'));
check('the connector to the shape that stayed is redrawn (still attached)', pathBefore !== pathAfter && (await ST()).edges.find(e => e.id === 'e2').to === 'nc');

// zoom: the button stays on the element and keeps its size on screen
await p.evaluate(() => { const s = window.FWBViews.whiteboardState; s.sel.clear(); s.B.view = { x: -500, y: 40, z: 1.6 }; }); await p.evaluate(() => window.FWBViews.render()); await p.waitForTimeout(300);
c = await centre('nc'); await p.mouse.move(c.x, c.y); await p.waitForTimeout(250); k = await chip();
const corner = await p.evaluate(() => { const s = window.FWBViews.whiteboardState; const n = s.B.nodes.find(x => x.id === 'nc'); const v = s.B.view; const r = document.getElementById('wbSvg').getBoundingClientRect(); return { x: r.left + v.x + (n.x + n.w) * v.z, y: r.top + v.y + n.y * v.z }; });
check('zoomed in, the button sits on the corner of the shape and keeps its size', k && Math.abs(k.x - corner.x) < 3 && Math.abs(k.y - corner.y) < 3 && k.w > 20 && k.w < 28, JSON.stringify({ k, corner }));

// a large selection asks first
await p.evaluate(() => { const s = window.FWBViews.whiteboardState; for (let i = 0; i < 9; i++) s.B.nodes.push({ id: 'm' + i, t: 'note', x: 100 + i * 30, y: 500, w: 120, h: 80, text: 'n' + i }); s.sel = new Set(s.B.nodes.filter(n => /^m/.test(n.id)).map(n => n.id)); s.B.view.z = 1; }); await p.evaluate(() => window.FWBViews.render()); await p.waitForTimeout(300);
await p.locator('#wbHost').focus(); await p.keyboard.press('Delete'); await p.waitForTimeout(300);
const asked = await p.$('.dialog, [role="alertdialog"], .confirm'); check('deleting 9 elements asks for confirmation first', !!asked && (await ST()).nodes.length === 12);
await p.keyboard.press('Escape'); await p.waitForTimeout(200); check('cancelling keeps them', (await ST()).nodes.length === 12);
await p.locator('#wbHost').focus(); await p.keyboard.press('Delete'); await p.waitForTimeout(300); await p.locator('.scrim.is-open .btn.danger').last().click(); await p.waitForTimeout(300);
check('confirming deletes them (with one undo step)', (await ST()).nodes.length === 3);

// save, reload: positions kept
await p.waitForTimeout(2500);
await p.reload(); await p.waitForSelector('#wbSvg'); await p.waitForTimeout(900); s = await ST();
check('after a reload the board shows the edited diagram', s.nodes.length === 3 && s.edges.length === 2 && s.nodes.find(n => n.id === 'nb').y === nb.y, JSON.stringify(s.nodes.map(n => [n.id, n.y])));

// imported State Flow: a single state is selectable and deletable, the State Flow itself is unchanged
await p.click('[data-act="wbFlows"]'); await p.waitForSelector('#wbFlist .wb-fi'); await p.fill('#wbFq', 'work order'); await p.waitForTimeout(150); const ins = await p.$$('#wbFlist .wb-fi:not([hidden]) input'); await ins[0].check(); await p.click('#wbFlowsGo'); await p.waitForTimeout(800);
s = await ST(); const st = s.nodes.find(n => n.ref && n.ref.state && n.t !== 'frame'); const flowBefore = await p.evaluate(() => JSON.stringify(window.FWB.doc('flows') || null));
check('the imported flow brings its states as separate elements', !!st && s.nodes.filter(n => n.ref && n.ref.state).length > 2);
c = await centre(st.id); await p.mouse.click(c.x, c.y); await p.waitForTimeout(150); await p.mouse.click(c.x, c.y); await p.waitForTimeout(150); s = await ST();
check('clicking a state (again, inside the flow group) selects just that state', s.sel.length === 1 && s.sel[0] === st.id, s.sel.join());
await p.mouse.move(c.x + 1, c.y + 1); await p.waitForTimeout(200); k = await chip(); check('the delete button is offered for that one state', k && k.id === st.id);
await p.mouse.click(k.x, k.y); await p.waitForTimeout(300); s = await ST();
check('deleting the state removes only that state and its connectors on the board', !s.nodes.some(n => n.id === st.id) && s.nodes.filter(n => n.ref && n.ref.state).length > 1 && !s.edges.some(e => e.from === st.id || e.to === st.id));
check('the State Flow in the State Flow Builder is unchanged', await p.evaluate(() => JSON.stringify(window.FWB.doc('flows') || null)) === flowBefore);
await p.screenshot({ path: `${OUT}/whiteboard-hover-delete.png` });
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
