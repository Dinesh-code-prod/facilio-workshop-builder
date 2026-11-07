// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/brd-word-check.mjs
// BRD Draft: Word-style editing (add blocks, bold, Enter for a new paragraph), import of a Word file, delete with confirm, exports keep the edits.
import { chromium } from 'playwright'; import fs from 'node:fs'; import JSZip from 'jszip';
const BASE = process.argv[2] || 'http://localhost:4175'; const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'BRD word', customer: 'Word Test Co' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/brd`); await p.reload(); await p.waitForSelector('.paper-scroll', { timeout: 30000 }); await p.waitForTimeout(800);
check('toolbar is short: at most 6 visible buttons in the top row', (await p.locator('.brd-top button:visible, .brd-top summary:visible').count()) <= 6);
// add a paragraph below the first heading, type, bold
await p.locator('.paper h1[contenteditable]').first().click(); await p.click('.fmtbar [data-kind="p"]'); await p.waitForTimeout(300);
await p.keyboard.type('Hello world'); await p.keyboard.press('Control+A'); await p.keyboard.press('Control+B'); await p.locator('.paper h1[contenteditable]').first().click(); await p.waitForTimeout(300);
check('typed paragraph with bold is kept', (await p.locator('.paper [data-txt] b, .paper [data-txt] strong').count()) === 1);
await p.click('.fmtbar [data-kind="h2"]'); await p.keyboard.type('My heading'); await p.keyboard.press('Enter'); await p.keyboard.type('After the heading'); await p.waitForTimeout(200);
await p.click('.fmtbar [data-kind="table"]'); await p.keyboard.type('Col A'); await p.waitForTimeout(300);
await p.locator('.paper [data-cell]').first().click(); await p.keyboard.type('cell one'); await p.locator('.paper h1[contenteditable]').first().click(); await p.waitForTimeout(300);
await p.reload(); await p.waitForSelector('.paper-scroll'); await p.waitForTimeout(800);
const txt = await p.locator('.paper-scroll').innerText();
check('added paragraph, heading, table and cell text survive a reload', /Hello world/.test(txt) && /My heading/.test(txt) && /After the heading/.test(txt) && /Col A/.test(txt) && /cell one/.test(txt));
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 150000 }), p.click('[data-act="brdDocx"]').then(() => p.waitForSelector('.dialog [data-r="1"]', { timeout: 4000 }).then(() => p.click('.dialog [data-r="1"]')).catch(() => { }))]);
const xml = await (await JSZip.loadAsync(fs.readFileSync(await dl.path()))).file('word/document.xml').async('string');
check('Word export has the new text, bold, heading and table text', /Hello world/.test(xml) && /<w:b\/>/.test(xml) && /My heading/.test(xml) && /cell one/.test(xml));
// import a docx
const z = new JSZip(); z.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
z.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
z.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Imported paragraph one</w:t></w:r></w:p><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Bold imported</w:t></w:r></w:p></w:body></w:document>');
const b64 = await z.generateAsync({ type: 'base64' });
await p.click('.brd-bar [data-act="brdImport"]'); await p.waitForSelector('#bi_name'); await p.fill('#bi_name', 'Their BRD');
await p.evaluate(b64 => { FWBViews.pickFile = async () => [new File([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], 'their.docx')]; }, b64);
await p.click('[data-act="brdImportFile"]'); await p.waitForTimeout(2500);
check('imported Word file shows as its own BRD tab with its text', (await p.locator('.brd-tab.on', { hasText: 'Their BRD' }).count()) === 1 && /Imported paragraph one/.test(await p.locator('.paper-scroll').innerText()));
await p.locator('.paper [data-txt]').first().click(); await p.keyboard.type(' plus edit'); await p.locator('.paper h1[contenteditable]').first().click(); await p.waitForTimeout(300);
check('imported text can be edited', /plus edit/.test(await p.locator('.paper-scroll').innerText()));
// blank + delete
await p.click('.brd-bar [data-act="brdImport"]'); await p.waitForSelector('#bi_name'); await p.fill('#bi_name', 'Empty one'); await p.click('[data-act="brdBlank"]'); await p.waitForTimeout(500);
check('blank BRD can be created', (await p.locator('.brd-tab.on', { hasText: 'Empty one' }).count()) === 1);
await p.click('.brd-top summary'); await p.click('[data-act="brdDeleteActive"]'); await p.waitForSelector('.dialog [data-r="1"]'); await p.click('.dialog [data-r="1"]'); await p.waitForTimeout(600);
check('deleting a BRD removes its tab', (await p.locator('.brd-tab', { hasText: 'Empty one' }).count()) === 0);
await p.locator('.brd-tab', { hasText: 'Main BRD' }).click(); await p.waitForTimeout(300);
await p.click('.brd-top summary'); await p.click('[data-act="brdDeleteActive"]'); await p.waitForSelector('.dialog [data-r="1"]'); await p.click('.dialog [data-r="1"]'); await p.waitForTimeout(600);
check('Main BRD can be deleted when others exist; edits are gone', (await p.locator('.brd-tab', { hasText: 'Main BRD' }).count()) === 0 && (await p.locator('.brd-tab').count()) === 1);
await p.click('.brd-top summary'); await p.click('[data-act="brdDeleteActive"]'); await p.waitForSelector('.dialog [data-r="1"]'); await p.click('.dialog [data-r="1"]'); await p.waitForTimeout(600);
check('deleting the last BRD recreates a fresh Main BRD', (await p.locator('.brd-tab', { hasText: 'Main BRD' }).count()) === 1 && !/Hello world/.test(await p.locator('.paper-scroll').innerText()));
check('no page errors', !errs.length, errs.slice(0, 3).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
