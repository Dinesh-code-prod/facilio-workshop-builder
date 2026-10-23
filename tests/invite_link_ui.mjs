// Private invite link: owner creates it in Project Settings; customer joins with link + name only; pasted link works; admin stays closed.
import { setup } from './lib.mjs';
const BASE = process.argv[2]; const t = await setup(BASE);
await t.nav(t.page, 'settings'); await t.page.click('[data-act=setTab][data-v=access]');
await t.page.waitForSelector('[data-act=caInvite]'); await t.page.click('[data-act=caInvite]'); await t.page.click('.dialog [data-r="1"]');
await t.page.waitForSelector('#cust_link'); const link = await t.page.inputValue('#cust_link'); t.ok(/#\/c\/p_[^~]+~[A-Za-z0-9_-]{15,}/.test(link), 'invite link carries project and code: ' + link.replace(/~.*/, '~***'));
// 1) open the link: only a name is asked
const c = await (await t.browser.newContext({ viewport: { width: 1300, height: 900 } })).newPage(); c.on('pageerror', e => t.errors.push(e.message));
await c.goto(link); await c.waitForSelector('#c_name'); t.ok(await c.$('input#c_code[type=hidden]') !== null && await c.$('input#c_code[type=password]') === null, 'no code field when using the link');
await c.fill('#c_name', 'Priya'); await c.click('[data-act=doCustomer]'); await c.waitForSelector('.sidebar', { timeout: 15000 }); t.ok(await c.$('[data-act=openAdmin]') === null, 'customer joined, no admin');
// 2) paste the link into the plain login page
const d = await (await t.browser.newContext()).newPage(); await d.goto(BASE.replace(/\/$/, '') + '/'); await d.waitForSelector('.auth-box'); await d.click('[data-act=authTab][data-v=customer]'); await d.fill('#c_name', 'Ravi'); await d.fill('#c_code', link); await d.click('[data-act=doCustomer]'); await d.waitForSelector('.sidebar', { timeout: 15000 }); t.ok(true, 'pasting the link on the login page works');
// 3) link without code is refused with a clear message
const e = await (await t.browser.newContext()).newPage(); await e.goto(BASE.replace(/\/$/, '') + '/'); await e.waitForSelector('.auth-box'); await e.click('[data-act=authTab][data-v=customer]'); await e.fill('#c_name', 'X'); await e.fill('#c_code', link.replace(/~.*/, '')); await e.click('[data-act=doCustomer]'); await e.waitForSelector('.notice.err'); t.ok(/no code/i.test(await e.textContent('.notice.err')), 'link without code refused');
await t.done('invite_link_ui');
