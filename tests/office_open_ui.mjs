// Office open mode (OFFICE_OPEN_MODE=1): opens on the project home, no sign-in, projects shared, access-management UI hidden.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const BASE = process.argv[2]; let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const browser = await chromium.launch(); const errors = [];
const mk = async () => { const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } }); const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); }); return p; };
const a = await mk(); await a.goto(BASE); await a.waitForSelector('.projects-page', { timeout: 20000 });
ok(!(await a.$('.auth-box')), 'no sign-in or sign-up screen'); ok(!!(await a.$('[data-act=newProject]')), 'Create project is on the landing page');
ok(!(await a.$('[data-act=userMenu]')), 'no account menu'); ok(!!(await a.$('.nav-out')), 'Log out button beside Admin');
await a.click('.projects-page [data-act=newProject]'); await a.fill('#np_name', 'Open Demo'); await a.fill('#np_cust', 'Office Co'); await a.fill('#np_start', '2026-11-01'); await a.fill('#np_team [data-p=name]', 'Dinesh R');
ok(!(await a.isVisible('#np_code')), 'customer access code field hidden');
await a.click('[data-act=createProject]'); await a.waitForSelector('.sidebar', { timeout: 60000 }); await a.waitForTimeout(500);
const side = await a.textContent('.sidebar'); ok(!/Roles & Access/.test(side), 'Roles & Access Permissions entry hidden'); ok(/Data Onboarding/.test(side) && /Transcripts/.test(side), 'builder modules still present');
await a.click('.sidebar [data-view=onboarding]'); await a.waitForSelector('.ob-tabs'); await a.click('.ob-tabs [data-v=excel]'); await a.waitForSelector('#onbFrame');
await a.waitForTimeout(1500); const f = a.frames().find(x => x.url().includes('onboarding-tool')); await f.waitForSelector('.ribbon', { timeout: 20000 }); ok(true, 'Excel Data Onboarding opens without login');
await a.click('.sidebar [data-view=settings]').catch(() => {}); await a.waitForTimeout(600); ok(!/Project members|Customer access/.test(await a.textContent('.main')), 'project members and customer access cards hidden');
// a colleague in a fresh browser session sees the same project and a refresh keeps the home page
const b = await mk(); await b.goto(BASE); await b.waitForSelector('.projects-page', { timeout: 20000 }); ok((await b.textContent('.projects-page')).includes('Open Demo'), 'a second browser session sees the shared project');
await b.reload(); await b.waitForSelector('.projects-page'); ok(!(await b.$('.auth-box')), 'refresh stays on the home page');
await b.click('.projects-page .project-card, .projects-page [data-act=openProject]').catch(() => {}); await b.waitForSelector('.sidebar', { timeout: 20000 }); ok(true, 'existing project opens');
ok(!errors.length, 'no page errors: ' + errors.slice(0, 3).join(' | ')); console.log(`office_open_ui: ${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0);
