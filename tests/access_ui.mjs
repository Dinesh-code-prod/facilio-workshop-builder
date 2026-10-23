// Access model: Facilio email signup without a code; outsiders refused; guest/customer joins with name + access code only.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const BASE = (process.argv[2] || 'http://127.0.0.1:8991').replace(/\/$/, ''); const b = await chromium.launch(); let pass = 0, fail = 0; const errs = []; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const mk = async () => { const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage(); p.on('pageerror', e => errs.push(e.message)); return p; };
let p = await mk(); await p.goto(BASE + '/'); await p.waitForSelector('.auth-box');
ok((await p.$$eval('.seg button', e => e.map(x => x.textContent.trim()).join('|'))) === 'Create account|Sign in|Guest / Customer', 'tabs: Create account, Sign in, Guest / Customer');
ok(await p.$('#a_inv') === null, 'no team code field on sign-up'); ok(await p.$('#c_pid') === null, 'no project id field');
await p.fill('#a_name', 'Out Sider'); await p.fill('#a_email', 'friend@gmail.com'); await p.fill('#a_pw', 'correct-horse-9'); await p.click('[data-act=doSignup]'); await p.waitForSelector('.notice.err'); ok(/domain/i.test(await p.textContent('.notice.err')), 'outside email refused');
await p.fill('#a_name', 'Pat'); await p.fill('#a_pw', 'correct-horse-9'); await p.fill('#a_email', 'pat' + Date.now() + '@facilio.com'); await p.click('[data-act=doSignup]'); await p.waitForSelector('.projects-page', { timeout: 15000 }); ok(true, 'Facilio email signs up with password only');
await p.click('[data-act=newProject]'); await p.fill('#np_name', 'Acme CAFM'); await p.fill('#np_cust', 'Acme'); await p.fill('#np_code', 'acme-access-2026'); await p.click('[data-act=createProject]'); await p.waitForSelector('.sidebar', { timeout: 30000 });
// customer: code + name only, no link
const c = await mk(); await c.goto(BASE + '/'); await c.waitForSelector('.auth-box'); await c.click('[data-act=authTab][data-v=customer]'); await c.waitForSelector('#c_name'); ok(await c.$('#c_pid[type=hidden]') !== null, 'hidden project id only');
await c.fill('#c_name', 'Priya'); await c.fill('#c_code', 'wrong-code-123'); await c.click('[data-act=doCustomer]'); await c.waitForSelector('.notice.err'); ok(true, 'wrong code refused');
await c.fill('#c_code', 'acme-access-2026'); await c.click('[data-act=doCustomer]'); await c.waitForSelector('.sidebar', { timeout: 15000 }); ok(true, 'code + name opens the project');
ok(await c.$('[data-act=newProject]') === null && await c.$('[data-act=openAdmin]') === null, 'no project list or admin');
ok((await c.evaluate(() => fetch('/api/admin/overview').then(r => r.status))) >= 401, 'admin API refused'); ok((await c.evaluate(() => fetch('/api/projects').then(r => r.status))) !== 200 || (await c.evaluate(() => fetch('/api/projects').then(r => r.json()).then(j => JSON.stringify(j).length < 400))), 'project list not exposed');
ok(!errs.length, 'no page errors ' + errs.join('|')); console.log(`access_ui: ${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
