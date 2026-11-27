// Design-system pilot screenshots (27 Nov 2026, docs/plans/delivery-studio-ui-migration-plan.md stage E): the representative screens of each view,
// for a before/after comparison. Read-only: opens pages and the customer preview, clicks nothing that saves. Uses the demo project if there is one.
// Usage: node build.mjs; node tests/ui/devserver.mjs 4231; node tests/ui/ds-pilot-shots.mjs [baseUrl] [outDir] [--width=1366]
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const BASE = pos[0] || 'http://localhost:4231', OUT = pos[1] || 'tests/ui/out/ds-pilot', W = +((args.find(a => a.startsWith('--width=')) || '').split('=')[1] || 1366);
const STAFF = ['msaintake', 'projdash', 'tasks', 'governance', 'settings', 'flow', 'brd'];
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' });
const p = await (await b.newContext({ viewport: { width: W, height: 900 } })).newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); const settle = ms => p.waitForTimeout(ms);
const shot = async n => { await p.keyboard.press('Escape'); await settle(300); await p.screenshot({ path: path.join(OUT, `${W}-${n}.png`) }); };
await p.goto(BASE + '/?nointro'); await settle(2200); if (await p.$('[data-act="runEnter"]')) { await p.click('[data-act="runEnter"]'); await settle(1500); }
await shot('projects-home');
const pid = process.env.CHECK_PID || await p.evaluate(async () => { const ps = (await (await fetch('/api/fn/api/projects')).json()).projects || []; return (ps.find(x => /walkthrough/i.test(x.name)) || ps[0]).id; });
for (const v of STAFF) { await p.goto(`${BASE}/?nointro#/p/${pid}/${v}`); await settle(2600); await shot(`staff-${v}`); }
await p.goto(`${BASE}/?nointro#/p/${pid}/projdash`); await settle(2500);
await p.evaluate(() => { if (!document.querySelector('[data-act="custPreview"]')) window.FWBViews.setNavPref('side'); }); await p.waitForTimeout(600); const cp = await p.$('[data-act="custPreview"]'); if (cp) { await cp.click(); await settle(2500); await shot('customer-home'); await p.click('[data-act="custPreviewExit"]').catch(() => {}); await settle(1200); }
await p.goto(BASE + '/?nointro'); await settle(2000); await p.click('[data-act="openAdmin"]').catch(() => {}); await settle(2500); await shot('admin-dashboard');
const n = await p.evaluate(() => document.querySelectorAll('.adm-nav .adm-ni').length);
await p.evaluate(i => document.querySelectorAll('.adm-nav .adm-ni')[i]?.click(), n - 1); await settle(1200); await shot('admin-last');
await b.close();
console.log(errs.length ? 'page errors:\n' + errs.join('\n') : 'no page errors', '\nshots in', OUT);
