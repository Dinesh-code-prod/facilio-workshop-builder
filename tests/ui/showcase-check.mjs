// Explore Facilio in a browser against the local preview: start an entry from a module (only configuration facts are filled), save a draft,
// upload an image, publishing needs a named source and a confirmation, the customer's view lists only published entries, an "I'm interested"
// request is stored with its author and opens a Facilio action (and, with FAKE_GRAPH=1, a Teams notice), the team updates the request, and entry text is shown as text.
// Usage: node tests/ui/showcase-check.mjs [baseUrl] [outDir]   (start the preview first: npm run preview)
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => { const r = await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Showcase test', customer: 'Gulf Towers' }) }); return (await r.json()).project.id; });
await p.goto(BASE + `/#/p/${pid}/showcase`); await p.reload(); await p.waitForSelector('.page-header h1'); await p.waitForTimeout(1200);
check('Explore Facilio is in the menu', await p.evaluate(() => window.FWBViews.navFor().some(g => g.items.some(i => i[0] === 'showcase'))));
check('empty state explains what to do', /No entries yet/.test(await p.textContent('.page-body')));
// new entry from a module
await p.click('.page-header [data-act="xfEdit"]'); await p.waitForSelector('#sc_mod');
const mod = await p.evaluate(() => { const o = [...document.querySelectorAll('#sc_mod option')].find(x => /in this project/.test(x.textContent)) || document.querySelectorAll('#sc_mod option')[1]; return o.value; });
await p.selectOption('#sc_mod', mod); await p.click('[data-act="xfFromMod"]'); await p.waitForTimeout(200);
const filled = await p.evaluate(() => ({ t: document.getElementById('sc_t').value, a: document.getElementById('sc_a').value, c: document.getElementById('sc_c').value, u: document.getElementById('sc_u').value }));
check('starting from a module fills the name and availability only', filled.t && ['enabled', 'optional'].includes(filled.a) && !filled.c && !filled.u, JSON.stringify(filled));
await p.fill('#sc_t', 'Mobile inspections <b>now</b>'); await p.fill('#sc_c', '- Offline checklists\n- Photo evidence'); await p.fill('#sc_src', '');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'); fs.writeFileSync(OUT + '/sc.png', png);
const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-act="xfImg"]')]); await fc.setFiles(OUT + '/sc.png'); await p.waitForFunction(() => /sc\.png/.test((document.getElementById('sc_imgn') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => { });
check('an image uploads', /sc\.png/.test(await p.textContent('#sc_imgn')));
await p.click('[data-act="xfSave"]'); await p.waitForSelector('.sc-card'); await p.waitForTimeout(400);
check('saved as a draft card', (await p.$$('.sc-card.draft')).length === 1);
check('markup in a title is shown as text', await p.evaluate(() => { const h = document.querySelector('.sc-card h3'); return h.textContent.includes('<b>now</b>') && !h.querySelector('b'); }));
// publishing needs a source
await p.click('[data-act="xfPub"]'); await p.waitForTimeout(300); check('publishing without a named source is refused', /Name the source/.test(await p.textContent('body')));
await p.click('[data-act="xfEdit"][data-id]'); await p.waitForSelector('#sc_src'); await p.fill('#sc_src', 'Facilio product notes, October 2026'); await p.click('[data-act="xfSave"]'); await p.waitForTimeout(500);
await p.click('[data-act="xfPub"]'); await p.waitForSelector('.dialog, [role="dialog"], .confirm', { timeout: 4000 }).catch(() => { }); await p.click('.dialog .btn.primary, [role="dialog"] .btn.primary, .confirm .btn.primary').catch(() => { }); await p.waitForTimeout(600);
check('published after confirming', await p.evaluate(() => window.FWBViews.items.list('news')[0].status === 'published'));
await p.click('.page-header [data-act="xfEdit"]'); await p.waitForSelector('#sc_t'); await p.fill('#sc_t', 'Draft only entry'); await p.click('[data-act="xfSave"]'); await p.waitForTimeout(500);
await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/showcase-team.png` });
// the customer's view (the page is switched to the customer mode inside this browser; the server still applies the project rules)
await p.evaluate(() => { window.__k = window.FWB.S.user.kind; window.FWB.S.user.kind = 'customer'; window.FWBViews.go('explore'); }); await p.waitForTimeout(1500);   // the customer's page is Discover more (the scroll story), which shows published entries only
const custText = await p.evaluate(() => document.querySelector('main').innerText);
check('the customer sees the published entry and not the draft one', /Mobile inspections/.test(custText) && !/Draft only entry/.test(custText), custText.replace(/\s+/g, ' ').slice(0, 120));
const teamsOn = await fetch(BASE + '/__teams').then(r => r.ok && /json/.test(r.headers.get('content-type') || ''), () => false); if (teamsOn) await p.evaluate(async () => fetch('/api/fn/api/mail/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ teamsOn: true, teamsChannel: 'delivery-sales' }) }));
await p.click('[data-act="xfOpen"]'); await p.waitForSelector('#drawer .sc-ul'); check('details show the capabilities, not the internal source', /Offline checklists/.test(await p.textContent('#drawer')) && !/product notes/.test(await p.textContent('#drawer')));
await p.click('#drawer [data-act="xfAsk"]'); await p.waitForSelector('#sc_note'); await p.fill('#sc_note', 'Demo for the maintenance team please'); await p.click('[data-act="xfAskGo"]'); await p.waitForTimeout(800);
check('after asking, the card says the request was sent', /Request sent/.test(await p.textContent('.sc-card')));
await p.screenshot({ path: `${OUT}/showcase-customer.png` });
await p.evaluate(() => { window.FWB.S.user.kind = window.__k; window.FWBViews.render(); }); await p.waitForTimeout(300);
const st = await p.evaluate(() => ({ i: window.FWBViews.items.list('interest'), a: window.FWBViews.items.list('action') }));
check('the request is stored with its author from the session', st.i.length === 1 && st.i[0].by === 'dinesh.r@facilio.com' && st.i[0].status === 'new', JSON.stringify(st.i[0] && { by: st.i[0].by, st: st.i[0].status }));
if (teamsOn) { const tl = await (await fetch(BASE + '/__teams')).json(); const m = tl.find(x => /Interest in Mobile inspections/.test(x.title)); check('a Teams notice is posted to the channel and the project owners', m && m.channel === 'delivery-sales' && Array.isArray(m.to) && m.to.includes('dinesh.r@facilio.com') && /\/showcase$/.test(m.actions[0].url), m ? m.channel + ' · ' + (m.to || []).join(',') : 'none'); }
else console.log('skip Teams notice check (start the preview with FAKE_GRAPH=1 to include it)');
check('a Facilio follow-up action is opened', st.a.some(a => a.side === 'facilio' && /asked about/.test(a.text) && a.status === 'Open'));
await p.click('[data-act="xfTab"][data-v="requests"]'); await p.waitForSelector('[data-change="xfReqSt"]'); await p.selectOption('[data-change="xfReqSt"]', 'demo'); await p.waitForTimeout(600);
check('the team updates the request status', await p.evaluate(() => window.FWBViews.items.list('interest')[0].status === 'demo'));
await p.screenshot({ path: `${OUT}/showcase-requests.png` });
const ph = await b.newPage({ viewport: { width: 390, height: 844 } }); await ph.goto(BASE + `/#/p/${pid}/showcase`); await ph.reload(); await ph.waitForSelector('.sc-card', { timeout: 15000 }).catch(() => { });
check('phone: no sideways scrolling', await ph.evaluate(() => document.documentElement.scrollWidth - window.innerWidth <= 1)); await ph.close();
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
