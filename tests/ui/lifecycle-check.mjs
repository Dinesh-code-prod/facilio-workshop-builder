// Requirements-to-delivery lifecycle in the browser (controlled fixtures, local preview):
// the BRD engine includes Confirmed requirements as requirements, keeps unconfirmed ones apart, leaves rejected ones out and lists open
// questions as questions; a consultant's BRD edit survives a change to its source and is flagged stale; approving a change request keeps
// the whole record (title, description, price) and is dated; the change's impact list names the requirements, use cases, tasks, user
// guides and BRD/FTR sections in the same area; marking the impact reviewed keeps the record too.
// Usage: node tests/ui/lifecycle-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Lifecycle check', customer: 'Acme' }) })).json()).project.id);
await p.goto(BASE + `/#/p/${pid}/brd`); await p.reload(); await p.waitForSelector('.sidebar'); await p.waitForTimeout(1500);
const MOD = await p.evaluate(() => { const m = window.FWB.allModules().filter(x => x.inScope)[0]; return { name: m.name, label: m.label }; });
await p.evaluate(M => { const S = window.FWB.S; S.ws.requirements.push(
  { id: 'REQ-101', title: 'Two approval levels for every permit', objective: 'Supervisor then HSE manager', status: 'Confirmed', modules: [M.name], acceptance: 'Both approvals recorded' },
  { id: 'REQ-102', title: 'Auto-close after thirty days', objective: 'Suggested, not agreed', status: 'Draft', modules: [M.name] },
  { id: 'REQ-103', title: 'SMS alerts to contractors', objective: 'Declined by the customer', status: 'Rejected', modules: [M.name] });
  S.ws.questions.push({ id: 'Q-9', text: 'Does a night supervisor replace the HSE approval?', status: 'open', area: M.label });
  window.FWB.changed('Lifecycle fixtures', '', { section: 'workshop' }); window.FWBViews.render(); }, MOD);
await p.waitForTimeout(800);
const blocks = () => p.evaluate(() => { const r = window.FWBBrd.buildBlocks(); return window.FWBBrd.applyEdits(r.blocks).map(b => ({ id: b.id, t: b.t, text: b.text || (b.items || []).join(' | ') || (b.rows || []).map(r => Array.isArray(r) ? r.map(c => (c && c.text) || c).join(' ; ') : '').join(' || '), edited: b.edited, stale: b.stale })); });
let bl = await blocks(); const headingOf = s => { let h = ''; for (const x of bl) { if (x.t === 'h') h = x.text; if (String(x.text).includes(s)) return h; } return null; };
check('the confirmed requirement is in the BRD', bl.some(x => String(x.text).includes('Two approval levels for every permit')));
const hDraft = headingOf('Auto-close after thirty days'); const hConf = headingOf('Two approval levels for every permit');
check('the draft requirement is not listed with the confirmed requirements', hDraft !== hConf || !bl.some(x => String(x.text).includes('Auto-close after thirty days')), `confirmed under "${hConf}", draft under "${hDraft}"`);
check('the rejected requirement is not in the BRD', !bl.some(x => String(x.text).includes('SMS alerts to contractors')));
const hQ = headingOf('night supervisor replace'); check('the open question appears as a question, not a decision', !!hQ && /question|open|pending|confirm/i.test(hQ), String(hQ));
// a consultant's edit of a generated paragraph survives a source change and is flagged stale
const target = bl.find(x => x.t === 'p' && String(x.text).includes('Two approval levels') ) || bl.find(x => x.t === 'p' && x.text && x.text.length > 30);
await p.evaluate(id => { const B = window.FWBBrd; const st = B.state(); const r = B.buildBlocks().blocks.find(b => b.id === id); st.edits = st.edits || {}; st.edits[id] = { text: 'Consultant wording kept on purpose.', base: r.text }; }, target.id);
await p.evaluate(() => { const r = window.FWB.S.ws.requirements.find(x => x.id === 'REQ-101'); r.title = 'Two approval levels for every hot-work permit'; r.objective = 'Supervisor, then HSE manager, then site owner'; });
bl = await blocks(); const after = bl.find(x => x.id === target.id);
check('a BRD edit is kept when its source changes', after && after.text === 'Consultant wording kept on purpose.' && after.edited, JSON.stringify(after));
check('…and flagged as stale so the consultant can review it', after && after.stale === true);

// change request: approve from the review dialog keeps the whole record; impact list
await p.evaluate(async ([pid, M]) => { const api = (k, id, d) => fetch(`/api/fn/api/projects/${pid}/items/${k}/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: d }) });
  await api('cr', 'crx', { title: 'Escalate permits after four hours', description: 'Notify the HSE manager', price: 1200, effort: 2, status: 'Proposed', mod: M.name });
  await api('usecase', 'uc1', { title: 'Approve a hot-work permit', modules: [M.name] });
  await api('task', 'tk1', { title: 'Configure the escalation rule', type: 'Implementation Task', status: 'To Do', module: M.label });
  await api('ugd', 'ug1', { title: 'Permit guide', status: 'draft', plan: { modules: [M.label], roles: [], level: 'steps', sources: { cfg: true } }, sections: [] }); }, [pid, MOD]);
await p.goto(BASE + `/#/p/${pid}/changes`); await p.reload(); await p.waitForSelector('[data-act="crImpact"]', { timeout: 20000 }); await p.waitForTimeout(600);
await p.evaluate(() => window.FWBViews.ACT.crDecide({ getAttribute: () => 'crx' })); await p.waitForSelector('#cr_by'); await p.fill('#cr_by', 'Owner One'); await p.click('[data-act="crDecideSave"][data-v="CR Converted"]'); await p.waitForTimeout(900);
let cr = await p.evaluate(async pid => (await (await fetch(`/api/fn/api/projects/${pid}/items?kinds=cr`)).json()).items.find(i => i.id === 'crx').data, pid);
check('approving keeps the title, description and price of the change request', cr.title === 'Escalate permits after four hours' && cr.description === 'Notify the HSE manager' && cr.price === 1200 && cr.status === 'CR Converted', JSON.stringify(cr).slice(0, 160));
check('the decision is dated and named', !!cr.decidedAt && cr.decisionBy === 'Owner One');
check('an agreed change shows "Impact review pending"', /Impact review pending/.test(await p.textContent('.tbl')));
await p.click('[data-act="crImpact"][data-id="crx"]'); await p.waitForSelector('#drawer .tbl'); const imp = await p.textContent('#drawer');
check('the impact list names the requirements in the area (not the rejected one)', /REQ-101/.test(imp) && /REQ-102/.test(imp) && !/REQ-103/.test(imp));
check('…the use case, the task, the user guide and the BRD / FTR sections', /Approve a hot-work permit/.test(imp) && /Configure the escalation rule/.test(imp) && /Permit guide/.test(imp) && /BRD/.test(imp) && /FTR/.test(imp), [/Approve a hot-work permit/.test(imp), /Configure the escalation rule/.test(imp), /Permit guide/.test(imp), /BRD/.test(imp), /FTR/.test(imp)].join());
await p.screenshot({ path: `${OUT}/lifecycle-impact.png` });
await p.click('[data-act="crImpactDone"]'); await p.waitForTimeout(800);
cr = await p.evaluate(async pid => (await (await fetch(`/api/fn/api/projects/${pid}/items?kinds=cr`)).json()).items.find(i => i.id === 'crx').data, pid);
check('marking the impact reviewed keeps the record and records who and when', cr.title === 'Escalate permits after four hours' && cr.price === 1200 && !!cr.impactReviewedAt && cr.status === 'CR Converted');
check('the pending tag is gone', !/Impact review pending/.test(await p.textContent('.tbl')));
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
