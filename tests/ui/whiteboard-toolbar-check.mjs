// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/whiteboard-toolbar-check.mjs [baseUrl] [outDir]
// Whiteboard selection toolbar (src/whiteboard.js, 25 Nov 2026): with the selection near the bottom of the board, the "..." menu opens clear of the
// toolbar (it used to cover it), and every toolbar control does something: each click is recorded with what changed. No page errors.
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Whiteboard toolbar check', customer: 'Acme' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/whiteboard`); await p.reload(); await p.waitForTimeout(2500);
await p.click('[data-act="wbNew"]'); await p.fill('#wbName', 'Toolbar'); await p.click('#drawer .btn.primary'); await p.waitForSelector('#wbSvg'); await p.waitForTimeout(600);
const bb = await p.locator('#wbSvg').boundingBox();
// a shape low on the board, so its toolbar sits near the bottom edge
await p.click('#wbShapesB'); await p.click('#wbShapes [data-wbtool="rect"]'); await p.mouse.click(bb.x + bb.width / 2 - 190, bb.y + bb.height / 2 + 50); await p.waitForTimeout(300);
await p.keyboard.type('Low shape'); await p.click('#wbSvg', { position: { x: 700, y: 120 } }); await p.waitForTimeout(300);
// pan the board so the shape sits near the bottom edge (where the menu used to cover the toolbar)
await p.evaluate(() => { const S = window.FWBViews.whiteboardState, n = S.B.nodes[0], v = S.B.view, h = document.getElementById('wbSvg').getBoundingClientRect().height; v.y += (h - 170) - (v.y + (n.y + n.h) * v.z); window.FWBViews.render(); }); await p.waitForTimeout(500);
const st = () => p.evaluate(() => JSON.stringify(window.FWBViews.whiteboardState.B.nodes.map(n => { const o = Object.assign({}, n); delete o.text; return o; })) + '|' + window.FWBViews.whiteboardState.B.nodes.length);
const selectShape = async () => { const c = await p.evaluate(() => { const S = window.FWBViews.whiteboardState, n = S.B.nodes.find(x => x.text === 'Low shape') || S.B.nodes[0], v = S.B.view, r = document.getElementById('wbSvg').getBoundingClientRect(); return { x: r.left + v.x + (n.x + n.w / 2) * v.z, y: r.top + v.y + (n.y + n.h / 2) * v.z }; }); await p.mouse.click(c.x, c.y); await p.waitForTimeout(300); };
await selectShape();
check('the selection toolbar shows', await p.evaluate(() => { const t = document.getElementById('wbCtxBar'); return !!t && !t.hidden; }));
await p.click('#wbCtxBar [data-act="wbMore"]'); await p.waitForSelector('#wbCtx');
const ov = await p.evaluate(() => { const a = document.getElementById('wbCtx').getBoundingClientRect(), t = document.getElementById('wbCtxBar').getBoundingClientRect(); const x = Math.max(0, Math.min(a.right, t.right) - Math.max(a.left, t.left)), y = Math.max(0, Math.min(a.bottom, t.bottom) - Math.max(a.top, t.top)); return { overlap: Math.round(x * y), menuTop: Math.round(a.top), barTop: Math.round(t.top), barBottom: Math.round(t.bottom) }; });
check('the "..." menu opens clear of the toolbar', ov.overlap === 0, JSON.stringify(ov));
await p.screenshot({ path: OUT + '/wb-more-menu.png' });
// no room below: the shape right at the bottom edge, the menu must open above the toolbar
await p.keyboard.press('Escape'); await p.evaluate(() => { const S = window.FWBViews.whiteboardState, n = S.B.nodes[0], v = S.B.view, h = document.getElementById('wbSvg').getBoundingClientRect().height; v.y += (h - 75) - (v.y + (n.y + n.h) * v.z); window.FWBViews.render(); }); await p.waitForTimeout(500);
await selectShape(); await p.click('#wbCtxBar [data-act="wbMore"]'); await p.waitForSelector('#wbCtx');
const ov2 = await p.evaluate(() => { const a = document.getElementById('wbCtx').getBoundingClientRect(), t = document.getElementById('wbCtxBar').getBoundingClientRect(); return { menuBottom: Math.round(a.bottom), barTop: Math.round(t.top), barBottom: Math.round(t.bottom), menuTop: Math.round(a.top) }; });
check('with no room below, the menu opens above the toolbar, clear of it', ov2.menuBottom <= ov2.barTop || ov2.menuTop >= ov2.barBottom, JSON.stringify(ov2));
await p.screenshot({ path: OUT + '/wb-more-menu-above.png' });
await p.keyboard.press('Escape'); await p.waitForTimeout(200); if (await p.$('#wbCtx')) await p.mouse.click(bb.x + 80, bb.y + 80);
// every control of the toolbar, one by one: what did it do?
await selectShape();
const ctrls = await p.$$eval('#wbCtxBar [data-act], #wbCtxBar select[data-change], #wbCtxBar [data-change]', els => els.filter(e => e.offsetParent).map(e => ({ act: e.getAttribute('data-act') || '', ch: e.getAttribute('data-change') || '', tag: e.tagName, label: (e.getAttribute('aria-label') || e.title || e.textContent || '').trim().slice(0, 40) })));
for (const c of ctrls) {
  if (['wbMore', 'wbDel'].includes(c.act)) continue;
  await selectShape(); const before = await st(), pops0 = await p.evaluate(() => [...document.querySelectorAll('[id^="wbPop_"], #wbCtx, #drawer, [role="dialog"]')].filter(e => e.offsetParent).map(e => e.id || e.className.split(' ')[0])); const nErr = errs.length; let effect = '';
  const sel = c.act ? `#wbCtxBar [data-act="${c.act}"]` : `#wbCtxBar [data-change="${c.ch}"]`;
  if (c.tag === 'SELECT') { const opts = await p.$$eval(sel + ' option', os => os.map(o => o.value)); const cur = await p.$eval(sel, s => s.value); const to = opts.find(o => o !== cur); if (to != null) await p.selectOption(sel, to); await p.waitForTimeout(400); }
  else { const dl = p.waitForEvent('download', { timeout: 1500 }).catch(() => null); await p.click(sel).catch(e => { effect = 'click failed: ' + e.message.slice(0, 60); }); const d = await dl; if (d) effect = 'download ' + d.suggestedFilename(); await p.waitForTimeout(400); }
  const after = await st(); const pop = (await p.evaluate(() => [...document.querySelectorAll('[id^="wbPop_"], #wbCtx, #drawer, [role="dialog"]')].filter(e => e.offsetParent).map(e => e.id || e.className.split(' ')[0]))).filter(x => !pops0.includes(x)).join(',');
  if (!effect) effect = before !== after ? 'changed the shape' : pop ? 'opened ' + pop : 'NOTHING VISIBLE';
  check(`toolbar "${c.label || c.act || c.ch}" works`, errs.length === nErr && !/NOTHING|failed/.test(effect), effect);
  if (pop && c.act) { await p.click(sel).catch(() => { }); await p.waitForTimeout(150); }   // a colour popover closes with its own button
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
}
// delete last: the shape goes (unlock it first: Lock was clicked above, and a locked shape is not deleted)
await p.evaluate(() => window.FWBViews.whiteboardState.B.nodes.forEach(n => { delete n.lock; })); await selectShape(); const n0 = await p.evaluate(() => window.FWBViews.whiteboardState.B.nodes.length); await p.click('#wbCtxBar [data-act="wbDel"]'); await p.waitForTimeout(400);
check('toolbar Delete removes the shape', (await p.evaluate(() => window.FWBViews.whiteboardState.B.nodes.length)) < n0);
check('no page errors', !errs.length, errs.join(' | '));
await b.close(); console.log(res.filter(Boolean).length + '/' + res.length + ' whiteboard toolbar checks passed'); process.exit(res.every(Boolean) ? 0 : 1);
