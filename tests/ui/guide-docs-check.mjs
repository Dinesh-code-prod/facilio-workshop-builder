// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/guide-docs-check.mjs http://localhost:4187
// Training guides as documents (24 Nov 2026): make a folder, move a guide into it, open the guide as a document (BRD paper), edit a section in place,
// export it as HTML; then open the FTR report as an editable document, change a cell and a result, export it as HTML. No page errors.
// Usage: node tests/ui/guide-docs-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await b.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/i.test(m.text())) errs.push('console: ' + m.text()); });
const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const api = (m, u, body) => p.evaluate(async ([m, u, body]) => { const r = await fetch('/api/fn/api' + u, { method: m, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return r.json(); }, [m, u, body]);
const pid = (await api('POST', '/projects', { name: 'Guide docs check', customer: 'Acme' })).project.id;
await api('PUT', '/projects/' + pid + '/items/ugd/ug1', { data: { title: 'Technician guide', customer: 'Acme', audience: 'Technicians', version: '0.1', status: 'draft', brand: { accent: '#1570EF', cover: true, logo: null }, sections: [{ id: 's1', title: 'Getting started', blocks: [{ t: 'md', text: 'Open the app.\n\n1. Sign in\n2. Pick the site' }] }, { id: 's2', title: 'Close a work order', blocks: [{ t: 'md', text: '- Open the order\n- Press Close' }] }] } });
await api('POST', '/projects/' + pid + '/ai/import', { task: 'ftr', content: '## Work Orders\n### Use case: Raise and close\n| ID | Test case | Steps | Expected | Result | Evidence |\n|---|---|---|---|---|---|\n| WO-1 | Raise a WO | Open, fill, save | Saved | Pass | |\n| WO-2 | Close a WO | Close it | Closed | | |\n' });
await p.goto(BASE + `/?nointro#/p/${pid}/guides`); await p.reload(); await p.waitForSelector('.fb-bar', { timeout: 20000 }); await p.click('[data-act="fbView"][data-v="list"]'); await p.waitForSelector('.tr-list, .tr-empty', { timeout: 20000 }); await p.waitForTimeout(800);   // the page opens on Tiles (25 Nov 2026); these checks use the list

// folders
await p.click('.fb-new > summary'); await p.click('.fb-new [data-act="tgFolderNew"]'); await p.fill('#tgf_n', 'Technicians'); await p.click('[data-act="tgFolderMake"]'); await p.waitForTimeout(500);
check('New folder makes a folder row at the top of the list, selected and highlighted', /Technicians/.test(await p.locator('.fb-list .fb-item').first().textContent()) && await p.evaluate(() => { const r = document.querySelector('.fb-list .tr-folder'); return r.classList.contains('sel') && document.activeElement === r; }));
await p.screenshot({ path: `${OUT}/guides-folders.png` });
const rowOf = t => p.locator('.tr-row', { hasText: t }).first();
await rowOf('Technician guide').locator('.tr-more summary').click(); await p.click('[data-act="tgMoveAsk"][data-k="ugd:ug1"]'); await p.selectOption('#tgf_to', { label: 'Technicians' }); await p.click('[data-act="tgMoveGo"]'); await p.waitForTimeout(500);
check('the moved guide leaves the main list and the folder counts it', !(await p.$('.tr-row:not(.tr-folder) >> text=Technician guide')) && /1 item/.test(await p.textContent('.tr-folder')));
await p.click('[data-act="tgFolderOpen"]'); await p.waitForTimeout(400);
check('inside the folder: a Back button, the path and the guide', /Training guides & videos/.test(await p.textContent('.tr-crumb')) && (await p.locator('.fb-back').count()) === 1 && /Technician guide/.test(await p.textContent('.tr-list')));
await p.screenshot({ path: `${OUT}/guides-in-folder.png` });
check('the folder is kept in the workshop document', await p.evaluate(() => { const f = window.FWB.S.ws.guideFolders; return f.list.length === 1 && f.of['ugd:ug1'] === f.list[0].id; }));

// the guide as a document
await p.click('[data-act="trGuideOpen"][data-id="ug1"]'); await p.waitForSelector('.dp-word .paper', { timeout: 15000 });
check('Open shows the guide on paper like the BRD (cover and sections)', /Technician guide/.test(await p.textContent('.dp-cover')) && /Close a work order/.test(await p.textContent('.dp-body')));
const box = p.locator('[data-dpm="0.0"]'); await box.click(); await p.keyboard.press('End'); await p.keyboard.press('Control+End'); await p.keyboard.type(' Then check the dashboard.'); await p.waitForTimeout(2200);
const txt = await p.evaluate(() => window.FWBViews.ugCtx.W().sections[0].blocks[0].text);
check('typing on the paper changes the guide (kept as Markdown, steps keep their shape)', /check the dashboard/.test(txt) && /1\. Sign in/.test(txt), txt.replace(/\n/g, ' / '));
await p.locator('[data-dpt="1"]').click(); await p.keyboard.press('End'); await p.keyboard.type(' (mobile)'); await p.waitForTimeout(1500);
check('a section title is edited in place', await p.evaluate(() => window.FWBViews.ugCtx.W().sections[1].title) === 'Close a work order (mobile)');
await p.screenshot({ path: `${OUT}/guide-document.png` });
await p.click('.dp-word .dp-dl > summary'); let [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('.dp-word [data-act="ugHtml"]')]); let html = fs.readFileSync(await dl.path(), 'utf8');
check('HTML export: one self-contained page with the title, the edited text and the sections', /^<!DOCTYPE html>/.test(html) && /Technician guide/.test(html) && /check the dashboard/.test(html) && /Close a work order \(mobile\)/.test(html) && !/contenteditable|<script/.test(html), dl.suggestedFilename());
await p.waitForTimeout(1200);
const saved = await api('GET', '/projects/' + pid + '/items?kinds=ugd'); check('the edit is saved to the project', /check the dashboard/.test(JSON.stringify(saved.items.find(x => x.id === 'ug1').data.sections)));

// the FTR report as a document
await p.evaluate(() => window.FWBViews.go('ftr')); await p.waitForSelector('.dp-word .paper', { timeout: 15000 });
check('the FTR report opens as a document with its modules and test cases', /Work Orders/.test(await p.textContent('.dp-body')) && /Raise a WO/.test(await p.textContent('.dp-body')));
const cell = p.locator('[data-ftc="0.0.1.steps"]'); await cell.click(); await p.keyboard.press('End'); await p.keyboard.type(' and confirm'); await p.selectOption('select[data-k="0.0.1"]', 'pass'); await p.waitForTimeout(2200);
const ftr = await api('GET', '/projects/' + pid + '/items?kinds=ai'); const c = ftr.items.find(x => x.data.task === 'ftr').data.content;
check('a cell and a result are saved back into the FTR draft', /Close it and confirm/.test(c) && /\| WO-2 \| Close a WO \| Close it and confirm \| Closed \| Passed \|/.test(c), c.split('\n').find(l => /WO-2/.test(l)));
check('the summary counts follow the result', /<td>2<\/td><td>2<\/td><td>0<\/td>/.test(await p.innerHTML('.dp-body')));
await p.screenshot({ path: `${OUT}/ftr-document.png` });
[dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('[data-act="ftrDlHtml"]')]); html = fs.readFileSync(await dl.path(), 'utf8');
check('FTR HTML export: self-contained, with the edited cell and both results passed', /^<!DOCTYPE html>/.test(html) && /Close it and confirm/.test(html) && (html.match(/fr-pass">Passed/g) || []).length === 2 && !/<select|contenteditable/.test(html), dl.suggestedFilename());
check('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
