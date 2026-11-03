// Bring your project in: files are sorted into areas, a 25 MB file is sent in parts, nothing is sent before Send, a type that cannot be stored is skipped; and the org folder link in Project details.
// Usage: PW_CHANNEL=msedge node tests/ui/transition-check.mjs [baseUrl] [shotsDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173', OUT = process.argv[3] || ''; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const errs = []; const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]', { state: 'attached' });
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Bring In Demo', customer: 'Acme Facilities' }) })).json()).project.id);
await p.goto(BASE + `/?nointro#/p/${pid}/transition`); await p.reload(); await p.waitForSelector('#trFile', { state: 'attached', timeout: 30000 });
const pdf = n => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(n, 0x20)]); const zip = Buffer.concat([Buffer.from([0x50, 0x4B, 0x03, 0x04]), Buffer.alloc(2000)]);
await p.setInputFiles('#trFile', [{ name: 'Acme MSA signed.pdf', mimeType: 'application/pdf', buffer: pdf(5000) }, { name: 'workshop1.vtt', mimeType: 'text/vtt', buffer: Buffer.from('WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello\n') }, { name: 'Project plan v3.xlsx', mimeType: 'application/octet-stream', buffer: zip }, { name: 'Kickoff deck.pdf', mimeType: 'application/pdf', buffer: pdf(25e6) }, { name: 'setup.exe', mimeType: 'application/octet-stream', buffer: Buffer.alloc(100) }]);
await p.waitForSelector('table.tbl tbody tr', { timeout: 30000 }); await p.waitForTimeout(500);
const cats = await p.$$eval('select[data-change="trCat"]', s => s.map(x => x.value));
check('each file is sorted by name', JSON.stringify(cats) === JSON.stringify(['msa', 'transcript', 'plan', 'kickoff', '']), cats.join(','));
check('a file that cannot be stored says so and is skipped', /cannot be stored/.test(await p.textContent('table.tbl')) && (await p.locator('button[data-act="trSend"]').textContent()).includes('Send 4 files'));
check('nothing is sent before Send', (await p.evaluate(async id => (await (await fetch(`/api/fn/api/projects/${id}/files`)).json()).files.length, pid)) === 0);
if (OUT) await p.screenshot({ path: `${OUT}/bring-in-review.png` });
await p.click('button[data-act="trSend"]'); await p.waitForFunction(() => /4 files stored/.test(document.body.innerText), null, { timeout: 180000 }); await p.waitForTimeout(500);
const files = await p.evaluate(async id => (await (await fetch(`/api/fn/api/projects/${id}/files`)).json()).files.map(f => f.category + ':' + f.size), pid);
check('the four files are stored under their areas, the 25 MB one in full', ['msa:', 'transcript:', 'plan:', 'kickoff:' + (25e6 + 9)].every(x => files.some(f => f.startsWith(x))), files.join(' '));
check('the page then says which area to open next', /Next: open each area/.test(await p.textContent('.page-body')));
if (OUT) await p.screenshot({ path: `${OUT}/bring-in-done.png` });
// org folder link
await p.goto(BASE + `/?nointro#/p/${pid}/settings`); await p.reload(); await p.waitForSelector('[data-bind="project.orgId"]', { timeout: 30000 });
await p.fill('[data-bind="project.orgId"]', '400000077'); await p.waitForTimeout(300);
const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-act="orgPick"]')]);
await fc.setFiles({ name: 'repo_index.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ US: ['400000077-Acme', '400000099-Other'], AE: ['400000039-Zed'] })) }); await p.waitForTimeout(1200);
check('the org folder is found by the org id and filled in', (await p.inputValue('[data-bind="project.orgFolder"]')) === 'us/400000077-Acme', await p.inputValue('[data-bind="project.orgFolder"]'));
check('the page says the org agrees', /Org 400000077/.test(await p.textContent('.page-body')));
await p.fill('[data-bind="project.orgId"]', '400000039'); await p.waitForTimeout(500);
check('a different org id is flagged as a mismatch', /do not agree/.test(await p.textContent('.page-body')));
check('no page errors', !errs.length, errs.slice(0, 2).join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
