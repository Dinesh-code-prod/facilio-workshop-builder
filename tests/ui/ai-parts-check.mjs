// Deliverables & AI in the browser: a full document is written part by part (each server call inside the 25 s limit), with progress, and lands as a draft.
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4175'; const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
const calls = []; p.on('request', r => { if (/\/ai\//.test(r.url())) calls.push(r.url().replace(/^.*\/api\/projects\/[^/]+/, '')); });
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
check('no page errors', !errs.length, errs.join(' | ')); console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
