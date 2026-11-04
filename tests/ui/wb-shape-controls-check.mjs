// Process Whiteboard: resize from every side and corner (Shift keeps the proportions), rotate, border (colour, width, dashed) and opacity, and that they are saved with the board.
// Usage: PW_CHANNEL=msedge node tests/ui/wb-shape-controls-check.mjs [baseUrl]
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Shape controls', customer: 'Acme' }) })).json()).project.id);
await p.goto(`${BASE}/?nointro#/p/${pid}/whiteboard`); await p.reload(); await p.waitForSelector('[data-act="wbNew"]', { timeout: 30000 }); await p.click('[data-act="wbNew"] >> nth=0'); await p.fill('#wbName', 'Shapes'); await p.click('[data-act="wbNewGo"]'); await p.waitForSelector('.wb-rail');
const r = await p.locator('#wbHost').boundingBox();
const N = () => p.evaluate(() => { const n = window.FWBViews.whiteboardState.B.nodes[0]; return { x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.w), h: Math.round(n.h), rot: n.rot, op: n.op, bc: n.bc, bw: n.bw, bd: n.bd }; });
const ctr = () => p.evaluate(() => { const w = window.FWBViews.whiteboardState; const x = w.B.nodes[0], v = w.B.view; return [v.x + (x.x + x.w / 2) * v.z, v.y + (x.y + x.h / 2) * v.z]; });
const at = hd => p.evaluate(hd => { const q = document.querySelector(`.wb-h[data-hd="${hd}"]`).getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; }, hd);
const drag = async (hd, dx, dy, shift) => { const q = await at(hd); if (shift) await p.keyboard.down('Shift'); await p.mouse.move(q[0], q[1]); await p.mouse.down(); await p.mouse.move(q[0] + dx, q[1] + dy, { steps: 6 }); await p.mouse.up(); if (shift) await p.keyboard.up('Shift'); await p.waitForTimeout(250); };
try {
  await p.focus('#wbHost'); await p.keyboard.press('r'); await p.waitForTimeout(450); await p.mouse.click(r.x + 400, r.y + 280); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  let c = await ctr(); await p.mouse.click(r.x + c[0], r.y + c[1]); await p.waitForTimeout(400);
  const hds = await p.evaluate(() => [...document.querySelectorAll('.wb-h')].map(h => h.dataset.hd).sort().join(','));
  check('a selected shape has eight resize handles and a rotate handle', hds === 'e,n,ne,nw,s,se,sw,w' && (await p.$$('.wb-rot')).length === 1, hds);
  let a = await N(); await drag('e', 60, 0); let z = await N(); check('the right side widens it', z.w > a.w && z.x === a.x, `${a.w} -> ${z.w}`);
  a = z; await drag('w', -40, 0); z = await N(); check('the left side widens it and moves its left edge', z.w > a.w && z.x < a.x, `${a.x},${a.w} -> ${z.x},${z.w}`);
  a = z; await drag('s', 0, 30); z = await N(); check('the bottom side makes it taller', z.h > a.h && z.y === a.y, `${a.h} -> ${z.h}`);
  a = z; await drag('n', 0, -20); z = await N(); check('the top side makes it taller and moves its top edge', z.h > a.h && z.y < a.y, `${a.y},${a.h} -> ${z.y},${z.h}`);
  a = z; await drag('se', 60, 10, true); z = await N(); check('Shift + a corner keeps the proportions', Math.abs(a.w / a.h - z.w / z.h) < .12, `${(a.w / a.h).toFixed(2)} -> ${(z.w / z.h).toFixed(2)}`);
  const q = await p.evaluate(() => { const g = document.querySelector('.wb-rot').getBoundingClientRect(); return [g.x + g.width / 2, g.y + g.height / 2]; }); c = await ctr();
  await p.mouse.move(q[0], q[1]); await p.mouse.down(); await p.mouse.move(r.x + c[0] + 120, r.y + c[1], { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400); z = await N();
  check('dragging the round handle rotates it (to the right = about 90 degrees)', z.rot >= 80 && z.rot <= 100, String(z.rot));
  await p.waitForSelector('#wbCtxBar:not([hidden])', { timeout: 5000 });
  await p.selectOption('#wbCtxBar [data-change="wbOpacity"]', '0.5'); await p.waitForTimeout(200);
  await p.click('#wbCtxBar [data-act="wbPopT"][data-p="bc"]'); await p.locator('#wbPop_bc [data-act="wbBColor"]').nth(1).click(); await p.waitForTimeout(200);
  await p.selectOption('#wbCtxBar [data-change="wbBorder"]', '4'); await p.waitForTimeout(150); z = await N(); check('opacity, border colour and thick border are set', z.op === .5 && !!z.bc && z.bw === 4, JSON.stringify([z.op, z.bc, z.bw]));
  await p.selectOption('#wbCtxBar [data-change="wbBorder"]', 'dash'); await p.waitForTimeout(250); z = await N(); check('a dashed border is set', z.bd === 'dash', String(z.bd));
  const svg = await p.evaluate(() => { const g = document.querySelector('#wbWorld .wb-n'); return { op: g.getAttribute('opacity'), rot: /rotate\(/.test(g.getAttribute('transform') || ''), dash: !!g.querySelector('[stroke-dasharray]') }; });
  check('the board draws them (opacity, rotation, dashes)', svg.op === '0.5' && svg.rot && svg.dash, JSON.stringify(svg));
  await p.waitForTimeout(3500); await p.reload(); await p.waitForSelector('#wbHost', { timeout: 30000 }); await p.waitForTimeout(2500); const after = await N();
  check('all of it is still there after a reload', after.rot === z.rot && after.op === .5 && after.bd === 'dash' && !!after.bc, JSON.stringify(after));
} catch (e) { check('the run finished', false, String(e.message).split('\n')[0].slice(0, 140)); }
check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
await b.close(); const ok = res.filter(Boolean).length; console.log(`${ok}/${res.length} checks passed`); process.exit(ok === res.length ? 0 : 1);
