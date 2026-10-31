// Admin › Access: the platform owner hands ownership to another Facilio email from the admin panel. Afterwards the previous owner has no admin
// access (console refused, no admin menu), and the new owner has it. Runs against a fresh local preview (it changes the owner).
// Usage: node tests/ui/owner-handover-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const NEW = 'next.owner@facilio.com';
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]'); await p.evaluate(() => window.FWBViews.ACT.openAdmin()); await p.waitForSelector('.adm-nav', { timeout: 20000 }); await p.click('[data-act="admSec"][data-s="access"]'); await p.waitForSelector('[data-act="admOwnerHand"]', { timeout: 15000 });
const txt = await p.textContent('.adm-main');
check('Access shows the owner with a "Hand over ownership" button, and no password buttons', /Hand over ownership/.test(txt) && !/Reset password/.test(txt) && !/SUPER_ADMIN_EMAILS|temporary password/.test(txt));
await p.click('[data-act="admOwnerHand"]'); await p.waitForSelector('#ow_email');
check('the dialog warns that the current owner loses all admin access', /lose all admin access/.test(await p.textContent('#drawer')));
await p.fill('#ow_email', NEW); await p.fill('#ow_confirm', 'someone@facilio.com'); await p.click('[data-act="admOwnerHandGo"]'); await p.waitForTimeout(400);
check('mismatched confirmation is refused and nothing changes', !!(await p.$('#ow_email')) && (await p.evaluate(async () => (await fetch('/api/fn/api/admin/access')).status)) === 200);
await p.screenshot({ path: `${OUT}/owner-handover.png` });
await p.fill('#ow_confirm', NEW); await Promise.all([p.waitForNavigation({ timeout: 15000 }).catch(() => { }), p.click('[data-act="admOwnerHandGo"]')]); await p.waitForTimeout(2500);
const st = await p.evaluate(async () => ({ access: (await fetch('/api/fn/api/admin/access')).status, overview: (await fetch('/api/fn/api/admin/overview')).status, me: (await (await fetch('/api/fn/api/auth/me')).json()).user }));
check('after the handover the previous owner is refused by the admin console', st.access === 403 && st.overview === 403 && st.me.adminRole === null, JSON.stringify(st).slice(0, 160));
check('the previous owner no longer sees the Admin switch', !(await p.$('.ws-switch a[data-act="openAdmin"]')));
const n = await b.newContext({ viewport: { width: 1440, height: 900 } }); await n.addCookies([{ name: 'dev_user', value: NEW, url: BASE }]); const np = await n.newPage();
await np.goto(BASE + '/'); await np.waitForSelector('[data-act]'); const ns = await np.evaluate(async () => ({ access: (await fetch('/api/fn/api/admin/access')).status, owners: ((await (await fetch('/api/fn/api/admin/access')).json()).owners || []).map(o => o.email) }));
check('the new owner has the admin console and is the only owner', ns.access === 200 && ns.owners.join() === 'next.owner@facilio.com', JSON.stringify(ns));
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
