// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/intro-small-check.mjs
// The opening animation must not throw on a small window (a negative canvas radius used to stop it and leave the page stuck behind it).
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const errs = [];
for (const [w, h] of [[120, 60], [400, 227], [390, 700], [800, 454], [1440, 900]]) { const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); p.on('pageerror', e => errs.push(w + 'x' + h + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(w + 'x' + h + ' ' + m.text().slice(0, 120)); });
  await p.goto(BASE + '/?intro=1'); await p.waitForTimeout(9000); await p.close(); }
console.log(errs.length ? 'FAIL ' + errs.slice(0, 4).join(' | ') : 'ok   the intro runs on small and large windows without errors'); await b.close();
