// Admin console: owner setup, dashboard insights, projects section, access panel (Admin / Sub admin), role enforcement, members, archive, users, activity.
import { setup } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8911/';
const { browser, page, ok, done, projectId, errors } = await setup(BASE, { name: 'Marina CAFM' });
const call = (pg, m, u, b) => pg.evaluate(async ([m, u, b]) => { const r = await fetch(u, { method: m, headers: { 'x-fwb-csrf': '1', 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); let j = null; try { j = await r.json(); } catch (e) { } return { s: r.status, j }; }, [m, u, b]);
ok((await call(page, 'GET', '/api/admin/overview')).s === 403, 'normal consultant cannot use the admin API');
ok((await call(page, 'GET', '/api/auth/me')).j.user.adminRole === null, 'normal consultant has no admin role');
ok((await call(page, 'POST', '/api/auth/signup', { inviteCode: 'dev-invite', email: 'dinesh.r@facilio.com', name: 'X', password: 'correct-horse-9' })).s === 403, 'owner email cannot be claimed through normal sign-up');
// owner sets up through the UI
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } }); const ap = await ctx.newPage(); ap.on('pageerror', e => errors.push('ADMIN PAGEERROR ' + e.message));
await ap.goto(BASE); await ap.waitForSelector('.auth-box');
ok((await call(ap, 'POST', '/api/admin/setup', { email: 'dinesh.r@facilio.com', password: 'long-enough-pw-1', setupCode: 'wrong' })).s === 403, 'wrong setup code refused');
await ap.click('[data-act=adminSetup]'); await ap.waitForSelector('#ad_code'); await ap.fill('#ad_pw', 'long-enough-pw-1'); await ap.fill('#ad_code', 'setup-code-xyz'); await ap.click('[data-act=adminSignIn]');
await ap.waitForSelector('.adm-wrap', { timeout: 15000 }); ok(true, 'admin console opens for the platform owner');
// dashboard tabs: Delivery, Customers, Team & usage, Quality & records all render real content
for (const [t, probe] of [['delivery', 'Progress by project'], ['customers', 'Customer roll-up'], ['usage', 'When the team works'], ['quality', 'Storage growth'], ['overview', 'Delivery pipeline']]) {
  await ap.click(`[data-act=admTab][data-t=${t}]`); await ap.waitForFunction(p => document.querySelector('.adm-main') && document.querySelector('.adm-main').innerText.includes(p), probe, { timeout: 8000 }).then(() => ok(true, 'dashboard tab ' + t + ' shows ' + probe), () => ok(false, 'dashboard tab ' + t + ' shows ' + probe));
}
await ap.click('[data-act=admTab][data-t=usage]'); await ap.waitForSelector('.heat'); ok(await ap.locator('.heat i').count() === 168, 'activity heatmap has 7 x 24 cells');
if (process.env.ADM_SHOT) { for (const t of ['delivery', 'customers', 'usage', 'quality']) { await ap.click(`[data-act=admTab][data-t=${t}]`); await ap.waitForTimeout(1200); await ap.screenshot({ path: '/tmp/adm_' + t + '.png', fullPage: true }); } }
await ap.click('[data-act=admTab][data-t=overview]');
// dashboard
ok((await ap.$$('.kpi')).length >= 8, 'dashboard shows KPI cards'); const dtxt = await ap.textContent('.adm-main');
ok(/Active projects/.test(dtxt) && /Delivery pipeline/.test(dtxt) && /Project health/.test(dtxt) && /Platform activity/.test(dtxt) && /Needs attention/.test(dtxt), 'dashboard has pipeline, health, activity and attention panels');
ok((await ap.$$('.fn-row')).length === 7, 'pipeline shows all stages'); ok((await ap.textContent('.adm-me')).includes('Platform owner'), 'role shown in the side panel');
const ov = await call(ap, 'GET', '/api/admin/overview'); ok(ov.s === 200 && ov.j.kpis.active === 1 && ov.j.projects[0].name === 'Marina CAFM', 'overview API has the project and KPIs');
// projects section
await ap.click('[data-act=admSec][data-s=projects]'); await ap.waitForSelector('.adm-tbl'); ok((await ap.textContent('.adm-tbl')).includes('Marina CAFM'), 'projects section lists the project');
await ap.fill('#admQ', 'zzz-nothing'); await ap.waitForSelector('.adm-empty'); await ap.fill('#admQ', 'marina'); await ap.waitForSelector('.adm-tbl'); ok(true, 'project search filters');
await ap.click('.adm-tbl tr.click'); await ap.waitForSelector('#drawer .stepper'); ok((await ap.textContent('#drawer')).includes('Project insights') || (await ap.textContent('#drawer')).includes('Marina CAFM'), 'project detail drawer shows insights');
await ap.click('#drawer [data-act=admOpen]'); await ap.waitForSelector('.sidebar', { timeout: 60000 }); ok(true, 'owner can open any project');
await ap.evaluate(() => window.FWBViews.ACT.toProjects()); await ap.waitForSelector('.proj-card'); await ap.click('[data-act=openAdmin]'); await ap.waitForSelector('.adm-wrap');
// CSV export
const dl = ap.waitForEvent('download'); await ap.click('[data-act=admSec][data-s=projects]'); await ap.click('[data-act=admExport]'); const f = await dl; ok(/\.csv$/.test(f.suggestedFilename()), 'projects export to CSV');
// access panel: grant sub admin (no account yet -> temp password)
await ap.click('[data-act=admSec][data-s=access]'); await ap.waitForSelector('#gr_email');
ok((await ap.textContent('.role-cards')).includes('Sub admin'), 'access panel explains the roles');
await ap.fill('#gr_email', 'sub.person@facilio.com'); await ap.selectOption('#gr_role', 'sub'); await ap.click('[data-act=admGrant]'); await ap.waitForSelector('#cr_pw'); const subPw = await ap.textContent('#cr_pw'); ok(subPw.length >= 12, 'temporary password shown once');
await ap.click('#drawer [data-act=closeDrawer]'); ok((await ap.textContent('.adm-main')).includes('sub.person@facilio.com'), 'grant listed');
const g2 = await call(ap, 'POST', '/api/admin/access', { email: 'admin.person@facilio.com', role: 'admin', name: 'Admin Person' }); ok(g2.s === 200 && g2.j.tempPassword, 'admin grant created an account');
ok((await call(ap, 'POST', '/api/admin/access', { email: 'dinesh.r@facilio.com', role: 'admin' })).s === 400, 'owner email cannot be granted a lower role');
ok((await call(ap, 'POST', '/api/auth/signup', { inviteCode: 'dev-invite', email: 'admin.person@facilio.com', name: 'Y', password: 'correct-horse-9' })).s === 403, 'granted email cannot be re-registered');
// sub admin: read-only
const sc = await browser.newContext(); const sp = await sc.newPage(); await sp.goto(BASE);
ok((await call(sp, 'POST', '/api/auth/login', { email: 'sub.person@facilio.com', password: subPw })).s === 200, 'sub admin signs in with the temporary password');
ok((await call(sp, 'GET', '/api/auth/me')).j.user.adminRole === 'sub', 'me reports the sub admin role');
ok((await call(sp, 'GET', '/api/admin/overview')).s === 200 && (await call(sp, 'GET', '/api/admin/users')).s === 200 && (await call(sp, 'GET', '/api/admin/audit')).s === 200, 'sub admin can view dashboard, users and activity');
ok((await call(sp, 'PATCH', '/api/admin/projects/' + projectId, { archived: true })).s === 403, 'sub admin cannot archive');
ok((await call(sp, 'POST', `/api/admin/projects/${projectId}/members`, { email: 'x@y.com', role: 'viewer' })).s === 403, 'sub admin cannot change members');
ok((await call(sp, 'GET', '/api/admin/access')).s === 403 && (await call(sp, 'POST', '/api/admin/access', { email: 'z@facilio.com', role: 'admin' })).s === 403, 'sub admin cannot manage access');
const sl = await call(sp, 'GET', '/api/projects'); ok(sl.j.projects.length === 1 && sl.j.projects[0].role === 'viewer', 'sub admin sees every project as viewer');
ok((await call(sp, 'GET', '/api/projects/' + projectId)).s === 200, 'sub admin can open a project to look');
ok((await call(sp, 'PUT', `/api/projects/${projectId}/docs/workshop`, { data: {}, baseVersion: 0 })).s === 403, 'sub admin cannot edit project data');
// admin: manage but not access
const ac = await browser.newContext(); const adp = await ac.newPage(); await adp.goto(BASE);
ok((await call(adp, 'POST', '/api/auth/login', { email: 'admin.person@facilio.com', password: g2.j.tempPassword })).s === 200, 'admin signs in');
ok((await call(adp, 'GET', '/api/auth/me')).j.user.adminRole === 'admin', 'me reports the admin role');
ok((await call(adp, 'GET', '/api/admin/access')).s === 403 && (await call(adp, 'POST', '/api/admin/access', { email: 'z@facilio.com', role: 'admin' })).s === 403, 'admin cannot manage access');
ok((await call(adp, 'PATCH', '/api/admin/users/' + (await call(adp, 'GET', '/api/admin/users')).j.users.find(u => u.role === 'sub').id, { disabled: true })).s === 403, 'admin cannot disable another admin');
// members through the owner UI
const second = 'second' + Date.now() + '@facilio.com'; const c2 = await browser.newContext(); const p2 = await c2.newPage(); await p2.goto(BASE);
ok((await call(p2, 'POST', '/api/auth/signup', { inviteCode: 'dev-invite', email: second, name: 'Second Person', password: 'correct-horse-9' })).s === 201, 'second account created');
await ap.click('[data-act=admSec][data-s=projects]'); await ap.waitForSelector('.adm-tbl'); await ap.click('.adm-tbl tr.click'); await ap.waitForSelector('#drawer [data-act=admMembers]'); await ap.click('#drawer [data-act=admMembers]');
await ap.waitForSelector('#am_email'); await ap.fill('#am_email', second); await ap.selectOption('#am_role', 'viewer'); await ap.click('[data-act=adminAddMember]');
await ap.waitForFunction(s => document.getElementById('drawer') && document.getElementById('drawer').textContent.includes(s), second); ok(true, 'member added through the panel');
ok((await call(p2, 'GET', '/api/projects')).j.projects.length === 1, 'added member now sees the project');
const owners = await call(ap, 'GET', `/api/admin/projects/${projectId}/members`); const ownerRow = owners.j.members.find(m => m.role === 'owner');
ok((await call(ap, 'DELETE', `/api/admin/projects/${projectId}/members/${ownerRow.id}`)).s === 400, 'last owner cannot be removed');
await ap.click('#drawer [data-act=closeDrawer]');
// archive & restore (admin can)
ok((await call(adp, 'PATCH', '/api/admin/projects/' + projectId, { archived: true })).s === 200, 'admin can archive'); ok((await call(page, 'GET', '/api/projects')).j.projects.length === 0, 'archived project disappears for the team');
await ap.click('[data-act=admRefresh]'); await ap.waitForTimeout(500); await ap.click('[data-act=admFilter][data-f=archived]'); await ap.waitForSelector('.adm-tbl'); ok(true, 'archived filter shows it');
ok((await call(adp, 'PATCH', '/api/admin/projects/' + projectId, { archived: false })).s === 200, 'admin can restore');
// role change, reset, revoke
ok((await call(ap, 'POST', '/api/admin/access', { email: 'sub.person@facilio.com', role: 'admin' })).s === 200 && (await call(sp, 'GET', '/api/auth/me')).j.user.adminRole === 'admin', 'role change applies immediately');
const rs = await call(ap, 'POST', '/api/admin/access/reset', { email: 'sub.person@facilio.com' }); ok(rs.s === 200 && rs.j.tempPassword, 'password reset returns a new temporary password'); ok((await call(sp, 'GET', '/api/projects')).s === 401, 'reset signs the person out');
ok((await call(sp, 'POST', '/api/auth/login', { email: 'sub.person@facilio.com', password: subPw })).s === 401, 'old password stops working');
ok((await call(sp, 'POST', '/api/auth/login', { email: 'sub.person@facilio.com', password: rs.j.tempPassword })).s === 200, 'new temporary password works');
ok((await call(sp, 'POST', '/api/auth/password', { current: 'wrong-password-1', next: 'brand-new-password-1' })).s === 403, 'password change needs the current password'); ok((await call(sp, 'POST', '/api/auth/password', { current: rs.j.tempPassword, next: 'brand-new-password-1' })).s === 200, 'person changes their own password');
ok((await call(ap, 'POST', '/api/admin/access/revoke', { email: 'sub.person@facilio.com' })).s === 200 && (await call(sp, 'GET', '/api/admin/overview')).s === 403, 'revoked access stops working at once');
// dashboard data after activity
const ov2 = (await call(ap, 'GET', '/api/admin/overview')).j; ok(ov2.weekly.length === 8 && ov2.monthly.length === 6 && ov2.stages.length === 7, 'dashboard series are complete');
// users + disable
await ap.click('[data-act=admSec][data-s=users]'); await ap.waitForSelector('.tbl td:has-text("Second Person")');
await ap.click('tr:has-text("Second Person") [data-act=admUserToggle]'); await ap.click('.dialog [data-r="1"]'); await ap.waitForSelector('tr:has-text("Second Person"):has-text("Disabled")'); ok(true, 'user disabled'); ok((await call(p2, 'GET', '/api/projects')).s === 401, 'disabled user is signed out');
// activity
await ap.click('[data-act=admSec][data-s=activity]'); await ap.waitForSelector('.tbl td:has-text("admin grant")'); ok(true, 'activity log records admin actions');
await done('admin_ui');
