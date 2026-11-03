// Data Onboarding now sits in Workshops & Requirements (a tab of the first entry); the sheet opened in its own tab is the whole page; Bring your project in has one drop box per kind of file plus Drop anything.
// Usage: PW_CHANNEL=msedge node tests/ui/workshop-onboarding-check.mjs [baseUrl]
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173'; const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
const id = await p.evaluate(async () => (await (await fetch('/api/fn/api/demo-project', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()).id);
// menu and hub tab
await p.goto(`${BASE}/?nointro#/p/${id}/transcripts`); await p.reload(); await p.waitForSelector('.hub-tabs', { timeout: 30000 });
const menu = await p.evaluate(() => ({ nav: [...document.querySelectorAll('#projNav [data-act="nav"]')].map(e => e.textContent.trim().replace(/\s+/g, ' ')), tabs: [...document.querySelectorAll('.hub-tabs .tab')].map(e => e.textContent.trim().replace(/\s*\d+$/, '')) }));
check('the first Workshops & Requirements entry carries the Data onboarding tab', menu.tabs[0] === 'Data onboarding' && menu.tabs.includes('Transcripts & requirements') && menu.tabs.includes('Use cases'), menu.tabs.join(' | '));
check('Data Onboarding is no longer its own entry in Solution Design', !menu.nav.some(x => /^Data Onboarding$/.test(x)), menu.nav.filter(x => /onboarding/i.test(x)).join(' | '));
await p.evaluate(() => document.querySelector('.hub-tabs [data-v="onboarding"]').click()); await p.waitForTimeout(1500);
check('the Data onboarding tab shows the onboarding page', await p.evaluate(() => /Data Onboarding/.test(document.querySelector('.main').innerText) && !!document.querySelector('.ob-tabs')));
// the sheet in its own tab
const q = await ctx.newPage(); q.on('pageerror', e => errs.push(e.message));
await q.goto(`${BASE}/?focus=excel&nointro#/p/${id}/onboarding`); await q.waitForSelector('#onbFrame', { timeout: 30000 }); await q.waitForTimeout(1500);
const full = await q.evaluate(() => { const f = document.getElementById('onbFrame').getBoundingClientRect(); return { nav: !!document.querySelector('.navbar, header.nav, .crumb, .phase-strip, .sidebar'), top: Math.round(f.top), h: Math.round(f.height), vh: innerHeight, w: Math.round(f.width), vw: innerWidth, text: document.getElementById('app') ? document.getElementById('app').innerText.slice(0, 60) : '' }; });
check('the sheet in its own tab has no header, breadcrumb or menu around it', !full.nav, JSON.stringify(full));
check('and fills the whole window', full.top <= 1 && full.h >= full.vh - 2 && full.w >= full.vw - 2, JSON.stringify(full));
// drop boxes
await p.goto(`${BASE}/?nointro#/p/${id}/transition`); await p.reload(); await p.waitForSelector('.tr-zone', { timeout: 30000 });
const zones = await p.evaluate(() => [...document.querySelectorAll('.tr-zone')].map(z => z.querySelector('b').textContent));
check('there is one box per kind of file and a last Drop anything box', zones.length === 13 && zones[zones.length - 1] === 'Drop anything' && zones.includes('Contract or MSA') && zones.includes('Customer data'), zones.join(' | '));
await p.locator('.tr-zone[data-zone="msa"] input').setInputFiles({ name: 'agreement.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') }); await p.waitForTimeout(800);
check('a file dropped in a box goes where the box says', await p.evaluate(() => { const s = document.querySelector('select[data-change="trCat"]'); return !!s && s.value === 'msa'; }));
await p.locator('.tr-zone[data-zone="msa"] input').setInputFiles({ name: 'plan.xlsx', mimeType: 'application/vnd.ms-excel', buffer: Buffer.from('x') }); await p.waitForTimeout(800);
check('a type the box cannot take is sorted by the usual guess, with a reason', await p.evaluate(() => /cannot go in the "Contract or MSA" box/.test(document.querySelector('.main').innerText)));
await p.locator('.tr-zone.wide input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello workshop transcript') }); await p.waitForTimeout(800);
check('Drop anything still sorts by the usual guess', (await p.locator('select[data-change="trCat"]').count()) === 3);
check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
await b.close(); const ok = res.filter(Boolean).length; console.log(`${ok}/${res.length} checks passed`); process.exit(ok === res.length ? 0 : 1);
