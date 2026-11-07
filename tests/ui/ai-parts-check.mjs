// On this PC run with the Edge channel: PW_CHANNEL=msedge node tests/ui/ai-parts-check.mjs
// Deliverables & AI in the browser: a full document is written part by part (each server call inside the 25 s limit), with progress, and lands as a draft.
import { chromium } from 'playwright'; import JSZip from 'jszip'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4175'; const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const bctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await bctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const calls = []; let jobBody = null; p.on('request', r => { if (/\/ai\//.test(r.url())) { calls.push(r.url().replace(/^.*\/api\/projects\/[^/]+/, '')); if (/\/ai\/job$/.test(r.url())) jobBody = JSON.parse(r.postData() || '{}'); } });
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const api = (m, path, body) => p.evaluate(async ({ m, path, body }) => { const r = await fetch('/api/fn/api' + path, { method: m, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json().catch(() => ({})) }; }, { m, path, body });
const pid = (await api('POST', '/projects', { name: 'AI parts check', customer: 'Acme' })).data.project.id;
await api('PUT', `/projects/${pid}/items/action/a1`, { data: { title: 'Send asset register', status: 'Open', owner: 'Acme' } });
await p.goto(BASE + `/#/p/${pid}/aiwork`); await p.reload(); await p.waitForSelector('[data-act="aiRun"]', { timeout: 20000 });
await p.click('[data-act="aiRun"][data-task="brd"]').catch(async () => p.click('[data-act="aiRun"] >> nth=0'));
await p.waitForSelector('[data-act="aiGo"]'); await p.click('[data-act="aiGo"]');
let msgs = new Set(); const t0 = Date.now(); while (Date.now() - t0 < 60000) { const m = await p.textContent('#loadingMsg').catch(() => ''); if (m) msgs.add(m.trim()); if (await p.$('#ai_c')) break; await p.waitForTimeout(100); }
check('progress messages shown while it writes', msgs.size >= 2, [...msgs].slice(0, 3).join(' | '));
const parts = calls.filter(c => /\/part$/.test(c)).length; check('the document was written in several short calls', parts >= 4 && calls.some(c => /\/ai\/job$/.test(c)) && calls.some(c => /\/finish$/.test(c)), parts + ' parts');
const txt = await p.inputValue('#ai_c').catch(() => ''); check('the draft opens for review with its sections', (txt.match(/^## /gm) || []).length >= 4, (txt.match(/^## /gm) || []).length + ' sections');
check('the BRD draft follows the project\'s own BRD outline', jobBody && Array.isArray(jobBody.headings) && jobBody.headings.some(h => /Introduction/.test(h)) && jobBody.headings.some(h => /Project Information/i.test(h)), jobBody && jobBody.headings ? jobBody.headings.slice(0, 4).join(' | ').slice(0, 160) : 'no headings');
const hh = (txt.match(/^## .*/gm) || []).slice(0, 3).join(' | '); check('its sections carry the BRD headings', /Project Information|Document Control|Introduction/i.test(txt), hh.slice(0, 120));
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('[data-act="aiExport"]')]); await dl.saveAs('tests/ui/out/ai-draft.docx'); const zx = await JSZip.loadAsync(fs.readFileSync(await dl.path())); const xml = await zx.file('word/document.xml').async('string'); const hdr = Object.keys(zx.files).filter(f => /word\/(header|footer)\d*\.xml/.test(f));
check('Word export is in the Facilio format (cover, document control, numbered sections, header and footer)', /Facilio CAFM Implementation/.test(xml) && /Prepared by/.test(xml) && /1\. Project Information/.test(xml) && /8DB3E2/i.test(xml) && hdr.length >= 2, hdr.join(','));
check('no page errors', !errs.length, errs.join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
