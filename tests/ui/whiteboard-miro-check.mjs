// Process Whiteboard, Miro-style tools: left tool rail with a shapes menu, click-to-place, pen, connector variants, the floating bar over a selection
// (fill, font size, bold, lock), the zoom bar; then "Save as combined flow" and the combined flow in the BRD (drawing, steps, connections; Word export).
import { chromium } from 'playwright'; import fs from 'node:fs'; import JSZip from 'jszip';
const BASE = process.argv[2] || 'http://localhost:4175'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Miro board check', customer: 'Acme Facilities' }) })).json()).project.id);
await p.goto(BASE + `/#/p/${pid}/whiteboard`); await p.reload(); await p.waitForSelector('[data-act="wbNew"]'); await p.click('[data-act="wbNew"] >> nth=0'); await p.fill('#wbName', 'Complaint to closure'); await p.click('[data-act="wbNewGo"]'); await p.waitForSelector('.wb-rail');
const WS = () => p.evaluate(() => { const W = window.FWBViews.whiteboardState; return { nodes: W.B.nodes.map(n => ({ id: n.id, t: n.t, x: n.x, y: n.y, fill: n.fill, size: n.size, b: n.b, lock: n.lock, text: n.text })), edges: W.B.edges.map(e => ({ route: e.route, ah: e.ah })), z: W.B.view.z, sel: [...W.sel] }; });
const bb = await p.locator('#wbSvg').boundingBox(); const at = (dx, dy) => [bb.x + bb.width / 2 + dx, bb.y + bb.height / 2 + dy];
check('a vertical tool rail with select, hand, sticky, shapes, text, connector, pen, frame, undo, redo', (await p.$$('.wb-rail .wb-rb')).length >= 10);
await p.click('#wbShapesB'); const items = await p.$$eval('#wbShapes [data-wbtool]', e => e.map(x => x.getAttribute('data-wbtool'))); check('the shapes menu has lines and shapes', items.length >= 10 && items.includes('connect-elbow') && items.includes('tri'), items.join(','));
await p.click('#wbShapes [data-wbtool="rect"]'); await p.mouse.click(...at(-300, -80)); await p.keyboard.press('Escape');
await p.click('#wbShapesB'); await p.click('#wbShapes [data-wbtool="tri"]'); await p.mouse.click(...at(0, -80));
await p.locator('#wbHost').focus(); await p.keyboard.press('Escape'); await p.keyboard.press('n'); await p.mouse.click(...at(300, -80)); await p.waitForSelector('.wb-edit'); await p.keyboard.type('Tenant raises complaint'); await p.mouse.click(...at(0, 220)); await p.waitForTimeout(150);
let s = await WS(); check('click-to-place: rectangle, triangle and a sticky note (keyboard N)', s.nodes.map(n => n.t).join() === 'rect,tri,note', s.nodes.map(n => n.t).join());
// selection bar
const nodeCentre = id => p.evaluate(id => { const W = window.FWBViews.whiteboardState; const n = W.B.nodes.find(x => x.id === id), v = W.B.view, r = document.getElementById('wbSvg').getBoundingClientRect(); return [r.left + v.x + (n.x + n.w / 2) * v.z, r.top + v.y + (n.y + n.h / 2) * v.z]; }, id);
const rect = s.nodes[0].id; await p.mouse.click(...await nodeCentre(rect)); await p.waitForSelector('#wbCtxBar:not([hidden])');
const barBox = await p.locator('#wbCtxBar').boundingBox(); const [rx, ry] = await nodeCentre(rect); check('the selection bar floats above the selected shape', barBox.y + barBox.height < ry && Math.abs(barBox.x + barBox.width / 2 - rx) < 140, `bar y ${Math.round(barBox.y)} shape y ${Math.round(ry)}`);
await p.click('#wbCtxBar [data-act="wbPopT"][data-p="fill"]'); await p.click('#wbPop_fill [data-c="#DDF4E4"]'); await p.selectOption('#wbCtxBar [data-change="wbFont"]', '24'); await p.click('#wbCtxBar [data-act="wbBold"]');
s = await WS(); const r0 = s.nodes[0]; check('fill, font size and bold from the bar', r0.fill === '#DDF4E4' && r0.size === 24 && r0.b === true, JSON.stringify(r0));
await p.click('#wbCtxBar [data-act="wbLock"]'); const c = await nodeCentre(rect); await p.mouse.move(...c); await p.mouse.down(); await p.mouse.move(c[0] + 120, c[1] + 90, { steps: 6 }); await p.mouse.up(); s = await WS();
check('a locked shape stays in place', s.nodes[0].x === r0.x && s.nodes[0].y === r0.y && s.nodes[0].lock);
await p.click('#wbCtxBar [data-act="wbLock"]');
// pen
await p.locator('#wbHost').focus(); await p.keyboard.press('p'); const [px, py] = at(-200, 150); await p.mouse.move(px, py); await p.mouse.down(); for (let i = 1; i <= 20; i++) await p.mouse.move(px + i * 8, py + Math.sin(i / 3) * 25); await p.mouse.up(); await p.waitForTimeout(150);
s = await WS(); check('the pen draws a freehand stroke', s.nodes.some(n => n.t === 'ink'));
// elbow connector between the rectangle and the note
await p.click('#wbShapesB'); await p.click('#wbShapes [data-wbtool="connect-elbow"]'); const a1 = await nodeCentre(rect), a2 = await nodeCentre(s.nodes[2].id); await p.mouse.move(...a1); await p.mouse.down(); await p.mouse.move(a2[0], a2[1], { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(150);
s = await WS(); check('an elbow arrow from the shapes menu', s.edges.length === 1 && s.edges[0].route === 'elbow', JSON.stringify(s.edges));
await p.click('.wb-rail [data-wbtool="select"]');
// zoom bar
const z0 = await p.textContent('#wbZoom'); await p.click('.wb-zoombar [data-act="wbZoomBy"][data-k="1.25"]'); const z1 = await p.textContent('#wbZoom'); check('zoom in from the bottom-right bar', parseInt(z1) > parseInt(z0), z0 + ' → ' + z1);
await p.click('.wb-zoombar [data-act="wbFit"]'); await p.waitForTimeout(200); await p.screenshot({ path: OUT + '/whiteboard-miro.png' });
// combined flow → BRD
await p.click('[data-act="wbCflowSave"]'); await p.fill('#cf_n', 'Complaint to closure (combined)'); await p.fill('#cf_d', 'From the tenant complaint to the closed work order.'); await p.click('[data-act="wbCflowGo"]'); await p.waitForTimeout(800);
const cf = await p.evaluate(async pid => (await (await fetch(`/api/fn/api/projects/${pid}/items?kinds=cflow`)).json()).items || [], pid); check('Save as combined flow stores a snapshot marked for the BRD', cf.length === 1 && cf[0].data.inBrd === true && cf[0].data.nodes.length >= 4, cf.length + ' saved');
await p.click('[data-act="wbCflows"]'); await p.waitForSelector('.cf-row'); check('the Combined flows list shows it with a preview', (await p.$$('.cf-row .cf-pv svg')).length === 1); await p.click('[data-act="closeDrawer"]');
await p.evaluate(() => window.FWBViews.go('brd')); await p.waitForSelector('.paper-scroll', { timeout: 30000 }); await p.waitForTimeout(1500);
const brd = await p.evaluate(() => { const h = [...document.querySelectorAll('.paper-scroll h2, .paper-scroll h3')].map(x => x.textContent); const figs = [...document.querySelectorAll('.paper-scroll figure')].filter(f => /combined flow/.test(f.textContent)); return { h: h.filter(x => /Complaint to closure/.test(x)), figs: figs.length, txt: figs[0] ? figs[0].querySelector('svg').textContent : '' }; });
check('the BRD shows the combined flow under End-to-End Business Processes', brd.h.length >= 1 && brd.figs === 1 && /Tenant raises/.test(brd.txt), JSON.stringify(brd).slice(0, 160));
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 150000 }), p.click('[data-act="brdDocx"]').then(() => p.waitForSelector('.dialog [data-r="1"]', { timeout: 4000 }).then(() => p.click('.dialog [data-r="1"]'), () => { }))]); const zip = await JSZip.loadAsync(fs.readFileSync(await dl.path())); const xml = await zip.file('word/document.xml').async('string'); const media = Object.keys(zip.files).filter(f => /^word\/media\//.test(f));
check('the Word export carries the combined flow (heading, figure, steps)', /Complaint to closure \(combined\)/.test(xml) && /Tenant raises complaint/.test(xml) && media.length >= 1, media.length + ' images');
// untick: it leaves the BRD
await p.click('[data-act="wbCflows"]'); await p.waitForSelector('.cf-row'); await p.click('[data-change="wbCfBrd"]'); await p.waitForTimeout(600); await p.click('[data-act="closeDrawer"]'); await p.waitForTimeout(600);
check('unticking removes it from the BRD', await p.evaluate(() => ![...document.querySelectorAll('.paper-scroll figure')].some(f => /combined flow/.test(f.textContent))));
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
