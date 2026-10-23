// Customer/guest access: roadmap shows, then Continue lands on the customer's project (not the internal list).
import { setup } from './lib.mjs';
const BASE = process.argv[2]; const t = await setup(BASE);
const c = await t.browser.newContext({ viewport: { width: 1400, height: 900 } }); const p = await c.newPage(); p.on('pageerror', e => t.errors.push(e.message));
await p.goto(BASE.replace(/\/$/, '') + '/?roadmap=1#/c/' + t.projectId); await p.waitForSelector('#c_name'); await p.fill('#c_name', 'Priya'); await p.fill('#c_code', 'marina-access-2026'); await p.click('[data-act=doCustomer]');
await p.waitForSelector('.rm', { timeout: 15000 }); t.ok(true, 'customer sees roadmap'); t.ok(/Your project, all in one place/.test(await p.locator('#rmCap').innerText()) && /Your contract/.test(await p.locator('.rm-stage').innerText().catch(() => '') + await p.locator('.rm-stage').textContent()), 'customer sees the client wording, not the team one'); t.ok(/Continue to your project/.test(await p.locator('.rm-go').textContent()), 'client button wording'); t.ok(await p.$('.sidebar') === null, 'workspace not visible behind roadmap');
await p.click('[data-r=skip]'); await p.waitForSelector('.sidebar', { timeout: 15000 }); t.ok(await p.$('.projects-page') === null, 'customer lands in the project, not the project list');
t.ok(await p.$('[data-act=openAdmin]') === null, 'no admin entry for customer');
const st = await p.evaluate(() => fetch('/api/admin/overview').then(r => r.status)); t.ok(st === 401 || st === 403, 'admin API refused for customer: ' + st);
// returning customer (live session, new browser tab) sees it once per visit, and not again on refresh
const p2 = await c.newPage(); p2.on('pageerror', e => t.errors.push(e.message)); await p2.goto(BASE.replace(/\/$/, '') + '/?roadmap=1'); await p2.waitForSelector('.rm', { timeout: 15000 }); t.ok(true, 'returning customer in a new tab sees the roadmap');
await p2.click('[data-r=skip]'); await p2.waitForSelector('.sidebar'); await p2.reload(); await p2.waitForSelector('.sidebar'); await p2.waitForTimeout(800); t.ok(await p2.$('.rm') === null, 'refresh does not replay');
await t.done('roadmap_customer_ui');
