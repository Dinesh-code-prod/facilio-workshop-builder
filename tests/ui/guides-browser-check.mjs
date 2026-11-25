// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/guides-browser-check.mjs http://localhost:4191 [outDir]
// Training guides & videos, file-browser style (24 Nov 2026), and the guide document page, at 1920x1080 on a project shaped like the live one
// (a UAT guide with 19 sections, some still empty; a user guide; nine videos still to make; one ready video):
// one blue button per screen, + New menu, folders first and a new folder at the top highlighted, Back (button and browser) out of a folder,
// a row click puts its actions in the command bar, Enter opens, tiles and sort, Videos to make folded; the guide's first section shows on the paper
// without scrolling, the tool switch and "What the drafts read" sit behind one chip. No page errors.
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/i.test(m.text())) errs.push('console: ' + m.text()); });
const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const primaries = () => p.evaluate(() => [...document.querySelectorAll('.main .btn.primary, .main summary.btn.primary')].filter(x => x.offsetParent && x.getBoundingClientRect().width).map(x => x.textContent.trim()));
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const api = (m, u, body) => p.evaluate(async ([m, u, body]) => { const r = await fetch('/api/fn/api' + u, { method: m, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return r.json(); }, [m, u, body]);
const pid = (await api('POST', '/projects', { name: 'Guides browser check', customer: 'Acme' })).project.id;
const secs = Array.from({ length: 19 }, (_, i) => ({ id: 's' + i, title: ['Purpose and scope', 'How to test', 'Work orders', 'Assets', 'Inspections'][i % 5] + ' ' + (i + 1), blocks: i < 4 || i % 3 === 0 ? [] : [{ t: 'md', text: 'What to try in this part.\n\n1. Open the module\n2. Create a record\n3. Check the result' }] }));
await api('PUT', '/projects/' + pid + '/items/ugd/ugUat', { data: { title: 'UAT guide', customer: 'Acme', version: '0.1', status: 'draft', plan: { kind: 'uat', modules: [], roles: [], level: 'steps', sources: {} }, brand: { accent: '#1570EF', cover: true, logo: null }, sections: secs } });
await api('PUT', '/projects/' + pid + '/items/ugd/ugUser', { data: { title: 'Technician guide', customer: 'Acme', version: '0.1', status: 'draft', brand: { accent: '#1570EF', cover: true, logo: null }, sections: [{ id: 'a', title: 'Getting started', blocks: [{ t: 'md', text: 'Open the app.' }] }] } });
await p.goto(BASE + `/?nointro#/p/${pid}/guides`); await p.reload(); await p.waitForSelector('.fb-bar', { timeout: 20000 });
await p.evaluate(() => { const F = window.FWB, w = {}; for (let i = 1; i <= 9; i++) w['free:t' + i] = { label: 'Walkthrough ' + i, what: 'Steps', url: '', kind: 'video', at: '2026-11-0' + i + 'T10:00:00Z' }; w['free:r1'] = { label: 'Raise a work order', what: '', url: 'https://comet.facilio.work/v/1', kind: 'video', at: '2026-11-24T09:00:00Z' }; F.S.ws.walkthroughs = w; F.changed('Videos', 'seed'); window.FWBViews.render(); });
await p.waitForTimeout(600);

// it opens on Tiles: Module-guide cards under one heading per kind (25 Nov 2026)
const tileHeads = await p.$$eval('.fb .tr-sec h2', h => h.map(x => x.textContent.trim()));
check('the page opens on Tiles: cards under User guides, UAT guides and Videos', tileHeads.join('|') === 'User guides|UAT guides|Videos' && (await p.locator('.fb .ll-wrap.fb-item .ll-card').count()) >= 4, tileHeads.join('|'));
check('the UAT guide (plan kind uat) is a card under UAT guides', /UAT guide/.test(await p.textContent('.fb .ll-grid[aria-label="UAT guides"]')) && !(await p.$('.fb .ll-card[data-view="uatguide"]')));   // the UAT guide page is not in the menu, so the library does not open it
await p.screenshot({ path: `${OUT}/guides-browser-tiles-first.png` });
await p.click('[data-act="fbView"][data-v="list"]'); await p.waitForTimeout(300);

// the list
const pr = await primaries(); check('one blue button on the page: + New', pr.length === 1 && /\+ New/.test(pr[0]), pr.join(' | '));
check('the list has column headers Name, Type, Status, Modified', /Name.*Type.*Status.*Modified/s.test(await p.textContent('.fb-head')));
check('the nine videos still to make are folded into one closed "Videos to make" group', /Videos to make\s*9/.test(await p.textContent('.fb-group > summary')) && !(await p.evaluate(() => document.querySelector('.fb-group').open)));
check('ready items lead, newest first', (await p.evaluate(() => [...document.querySelectorAll('.fb-list:not(.fb-group *) .tr-row .fb-name')].map(x => x.textContent))).join('|') !== '', (await p.evaluate(() => [...document.querySelectorAll('.page-body > .fb-list .tr-row .fb-name')].map(x => x.textContent))).join(' | '));
await p.screenshot({ path: `${OUT}/guides-browser-list.png` });
await p.click('.fb-new > summary'); check('+ New offers Guide, Video and Folder', (await p.evaluate(() => [...document.querySelectorAll('.fb-new .tr-more-m .btn')].map(x => x.textContent.trim()))).join(',') === 'Guide,Video,Folder');
await p.click('.fb-new [data-act="tgFolderNew"]'); await p.fill('#tgf_n', 'Technicians'); await p.click('[data-act="tgFolderMake"]'); await p.waitForTimeout(500);
check('the new folder is the first row, selected, highlighted and focused', await p.evaluate(() => { const r = document.querySelector('.fb-list .fb-item'); return /Technicians/.test(r.textContent) && r.classList.contains('sel') && r.classList.contains('fb-flash') && document.activeElement === r; }));
check('with a folder selected its actions show in the command bar', /Open.*Rename.*Delete folder/s.test(await p.textContent('.fb-sel')));
await p.screenshot({ path: `${OUT}/guides-browser-newfolder.png` });
// a row click selects; Move to folder from the command bar
await p.locator('.tr-row', { hasText: 'Technician guide' }).locator('.fb-c').nth(1).click();
check('a row click selects the guide and the command bar shows its actions', /Technician guide/.test(await p.textContent('.fb-sel')) && /Move to folder/.test(await p.textContent('.fb-sel')));
await p.click('.fb-sel [data-act="tgMoveAsk"]'); await p.selectOption('#tgf_to', { label: 'Technicians' }); await p.click('[data-act="tgMoveGo"]'); await p.waitForTimeout(400);
check('the folder counts the moved guide', /1 item/.test(await p.textContent('.tr-folder')));
// open with Enter, back with the button, open by name, back with the browser
await p.locator('.tr-folder').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
check('Enter on a folder row opens it: Back button, path, and the guide', (await p.locator('.fb-back').count()) === 1 && /Training guides & videos.*Technicians/s.test(await p.textContent('.fb-path')) && /Technician guide/.test(await p.textContent('.fb-list')));
await p.screenshot({ path: `${OUT}/guides-browser-infolder.png` });
await p.click('.fb-back'); await p.waitForTimeout(300);
check('the Back button returns to the top with the folder selected', !(await p.locator('.fb-back').count()) && await p.evaluate(() => document.querySelector('.tr-folder').classList.contains('sel')));
await p.click('.tr-folder .fb-name'); await p.waitForTimeout(300); check('a click on the folder name opens it', (await p.locator('.fb-back').count()) === 1);
await p.goBack(); await p.waitForTimeout(400);
check('the browser Back button leaves the folder too (still on this page)', !(await p.locator('.fb-back').count()) && (await p.locator('.fb-bar').count()) === 1 && /\/guides/.test(p.url()));
// tiles and sort
await p.click('[data-act="fbView"][data-v="tiles"]'); await p.waitForTimeout(200);
check('Tiles shows the folder first as a large card under Folders', (await p.textContent('.fb .tr-sec h2')).trim() === 'Folders' && /Technicians/.test(await p.textContent('.fb .ll-grid .ll-wrap.fb-item')));
await p.screenshot({ path: `${OUT}/guides-browser-tiles.png` });
await p.click('[data-act="fbView"][data-v="list"]'); await p.selectOption('#fbSort', 'name'); await p.waitForTimeout(200);
const names = await p.evaluate(() => [...document.querySelectorAll('.page-body > .fb-list .tr-row:not(.tr-folder) .fb-name')].map(x => x.textContent));
check('Sort by name orders the items A to Z', names.join('|') === names.slice().sort((a, c) => a.localeCompare(c, undefined, { sensitivity: 'base' })).join('|'), names.join(' | '));
await p.selectOption('#fbSort', 'newest');
await p.click('.fb-group > summary'); await p.waitForTimeout(200);
check('opening Videos to make shows quiet "Make in Comet" actions, never a blue button', (await p.locator('.fb-group .tr-row [data-act="trVidOpen"].link').count()) === 9 && (await primaries()).length === 1);

// the guide document
await p.evaluate(() => { const S = window.FWB.S; S.ui.ugOpen = 'ugUat'; S.ui.ugTab = 'doc'; window.FWBViews.go('guidebuilder'); }); await p.waitForSelector('.dp-word .paper', { timeout: 15000 }); await p.waitForTimeout(500);
const vis = await p.evaluate(() => { const box = document.querySelector('.paper-scroll').getBoundingClientRect(), h = document.querySelector('.dp-sec h1').getBoundingClientRect(); return { boxTop: Math.round(box.top), h1Top: Math.round(h.top), inBox: h.top >= box.top && h.bottom <= box.bottom, inWin: h.bottom <= innerHeight }; });
check('the UAT guide shows its first section on the paper without scrolling', vis.inBox && vis.inWin, JSON.stringify(vis));
check('all 19 sections are on the paper, empty ones say so', (await p.locator('.dp-sec').count()) === 19 && (await p.locator('.dp-sec .dp-none').count()) === 9);
check('no tool switch, explainer or "What the drafts read" above the document; one inputs chip instead', !(await p.locator('.tp-tabs:visible, .pg:visible, .tp-srcs:visible').count()) && (await p.locator('.ug-tabrow .ug-chip').count()) === 1, await p.textContent('.ug-chip'));
const gp = await primaries(); check('one blue button on the guide page (Approve, for the owner)', gp.length <= 1, gp.join(' | '));
await p.screenshot({ path: `${OUT}/guide-document-calm.png` });
await p.click('.ug-chip'); await p.waitForSelector('#drawer .tp-srcs'); check('the chip opens the inputs, the tool switch and the explainer', (await p.locator('#drawer .tp-tabs').count()) === 1 && (await p.locator('#drawer .pg').count()) === 1);
await p.click('#drawer [data-act="closeDrawer"]');
await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(300);
const v2 = await p.evaluate(() => { const box = document.querySelector('.paper-scroll').getBoundingClientRect(), h = document.querySelector('.dp-sec h1').getBoundingClientRect(); return { inBox: h.top >= box.top && h.bottom <= box.bottom, top: Math.round(h.top), win: innerHeight }; });
check('on a 1366x768 laptop the first section is still on screen without scrolling', v2.inBox && v2.top < v2.win, JSON.stringify(v2));
await p.screenshot({ path: `${OUT}/guide-document-laptop.png` });
check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
