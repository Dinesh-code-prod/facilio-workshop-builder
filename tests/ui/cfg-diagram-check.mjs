// Configuration Inputs (src/cfginputs.js), roadmap phase 5b, the last two items, in a browser against the local preview:
// the read-only relationship diagram (empty register, type and status per line, modules not in the module list, incomplete rows,
// no editing controls, no record changed, usable at phone width), and reuse of the same records outside the AI drafts:
// the configuration register on Handover & Closure and the module facts, brief and role-based path in the Guides & Video Studio.
// Usage: node tests/ui/cfg-diagram-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Relationship diagram', customer: 'Acme' }) })).json()).project.id);
const openRels = async () => { await p.goto(BASE + `/#/p/${pid}/cfginputs`); await p.reload(); await p.waitForSelector('[data-act="ciTab"][data-v="rels"]', { timeout: 20000 }); await p.click('[data-act="ciTab"][data-v="rels"]'); await p.waitForSelector('.ci-rel-diagram'); };

// 1. empty register
await openRels();
check('an empty register shows a message and no diagram', !!(await p.$('.ci-rel-empty')) && !(await p.$('.ci-rel-diagram svg')));

// 2. test data: two custom modules, an app with tabs, four relationships (one confirmed, one from the package, one manual to an unknown module, one incomplete)
await p.evaluate(async pid => {
  const put = (k, id, data) => fetch(`/api/fn/api/projects/${pid}/items/${k}/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data }) });
  await put('cmodx', 'm_ptw', { name: 'permit_to_work', label: 'Permit to Work', purpose: 'Control hot work', usage: 'Raise a permit before hot work', roles: 'Supervisor approves', notes: 'No offline mode', status: 'Confirmed', source: 'manual', files: [] });
  await put('cmodx', 'm_vis', { name: 'visitor_log', label: 'Visitor Log', purpose: 'Record visitors', status: 'Proposed', source: 'manual', files: [] });
  await put('capp', 'ap1', { name: 'Field App', audience: 'Technicians', purpose: 'Mobile work', integration: 'Syncs permits to the SAP gate system nightly', status: 'Confirmed', source: 'manual', files: [], tabs: [
    { name: 'Permits', modules: 'Permit to Work', purpose: 'Raise and close permits', navigation: 'Menu › Permits', functionality: '', roles: 'Technician, Supervisor' },
    { name: 'Visitors', modules: 'Visitor Log', purpose: 'Sign visitors in', navigation: '', functionality: '', roles: '' }] });
  await put('cfgrel', 'r1', { from: 'Permit to Work', to: 'Visitor Log', type: 'Creates a record', trigger: 'Permit approved for a contractor', outcome: 'A visitor entry exists', status: 'Confirmed', source: 'manual', files: [] });
  await put('cfgrel', 'r2', { from: 'Permit to Work', to: 'Permit to Work', type: 'Parent and child', trigger: '', outcome: '', status: 'Proposed', source: 'package', files: [] });
  await put('cfgrel', 'r3', { from: 'Visitor Log', to: 'Ghost Module', type: 'Reference (lookup)', trigger: '', outcome: '', status: 'Proposed', source: 'manual', files: [] });
  await put('cfgrel', 'r4', { from: '', to: 'Visitor Log', type: 'Depends on', trigger: '', outcome: '', status: 'Proposed', source: 'import: rels.csv', files: [] });
}, pid);
const snap = () => p.evaluate(async pid => JSON.stringify(((await (await fetch(`/api/fn/api/projects/${pid}/items?kinds=cmodx,cfgrel,capp`)).json()).items || []).map(x => [x.kind, x.id, x.version, x.data]).sort()), pid);
const before = await snap();

await openRels(); await p.waitForSelector('.ci-rel-diagram svg');
const d = await p.evaluate(() => { const s = document.querySelector('.ci-rel-diagram svg'); return {
  states: s.querySelectorAll('g.state').length, unknown: [...s.querySelectorAll('g.state.unknown title')].map(t => t.textContent), edges: s.querySelectorAll('g.edge').length,
  st: [...s.querySelectorAll('g.edge')].map(e => e.getAttribute('data-rel-state')).sort().join(','), pills: [...s.querySelectorAll('g.edge .pill text')].map(t => t.textContent).join('|'),
  titles: [...s.querySelectorAll('g.edge > title')].map(t => t.textContent).join(' || '), editable: s.querySelectorAll('.anchor, .hit').length, role: s.getAttribute('role'),
  dashed: [...s.querySelectorAll('g.edge')].map(e => e.getAttribute('data-rel-state') + ':' + !!e.querySelector('path[stroke-dasharray]')).sort().join(',') }; });
check('the diagram is drawn from the cfgrel records: 2 known modules plus 1 unknown, 3 lines (the incomplete row is left out)', d.states === 3 && d.edges === 3, `${d.states} states, ${d.edges} lines`);
check('each line carries its relationship type', /Creates/.test(d.pills) && /Parent \/ child/.test(d.pills) && /Lookup/.test(d.pills), d.pills);
check('each line carries its status: confirmed, package, manual', d.st === 'confirmed,manual,package', d.st);
check('confirmed lines are solid, proposed lines are dashed', d.dashed === 'confirmed:false,manual:true,package:true', d.dashed);
check('the tooltip names both modules, the type, the status and the trigger', /Permit to Work → Visitor Log: Creates a record · Confirmed · When: Permit approved/.test(d.titles) && /From package, not confirmed/.test(d.titles) && /Manual or imported, not confirmed/.test(d.titles));
check('a module that is not in the module list is marked and listed', d.unknown.length === 1 && /Ghost Module — not in the package/.test(d.unknown[0]) && /Ghost Module/.test(await p.textContent('.ci-rel-unknown')));
check('a relationship with an empty end is reported, not drawn', /1 relationship not drawn/.test(await p.textContent('.ci-rel-incomplete')));
check('legend and the text list are shown', /Confirmed/.test(await p.textContent('.ci-rel-legend')) && (await p.$$('.ci-rel-list li')).length === 3);
check('the diagram is read only (no drag handles or click targets) and is labelled for screen readers', d.editable === 0 && d.role === 'img');
await p.screenshot({ path: `${OUT}/cfg-diagram-desktop.png`, fullPage: true });

// 3. phone width
await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(400);
const ph = await p.evaluate(() => { const sc = document.querySelector('.ci-rel-scroll'); const r = sc.getBoundingClientRect(); return { pageW: document.documentElement.scrollWidth, vw: innerWidth, boxRight: r.right, scrolls: sc.scrollWidth > sc.clientWidth, overflow: getComputedStyle(sc).overflowX }; });
check('at 390 px the page does not scroll sideways; the diagram scrolls inside its own box', ph.pageW <= ph.vw + 1 && ph.boxRight <= ph.vw + 1 && (ph.overflow === 'auto' || ph.overflow === 'scroll'), JSON.stringify(ph));
await p.screenshot({ path: `${OUT}/cfg-diagram-phone.png`, fullPage: true });
await p.setViewportSize({ width: 1440, height: 900 });
check('drawing the diagram changed no record', (await snap()) === before);

// 4. support handover: the configuration register
await p.goto(BASE + `/#/p/${pid}/handover`); await p.waitForSelector('.ho-cfg', { timeout: 20000 }); await p.waitForFunction(() => /Permit to Work/.test((document.querySelector('.ho-cfg') || {}).textContent || ''), null, { timeout: 15000 });
const ho = await p.textContent('.ho-cfg');
check('Handover shows the register: custom modules, relationships, apps and tabs', /2 custom modules · 4 relationships · 1 app, 2 tabs/.test(ho) && /Permit to Work/.test(ho) && /Ghost Module/.test(ho) && /Field App/.test(ho) && /Visitors/.test(ho), ho.slice(0, 160));
check('…with integration behaviour, known limits and open points', /Syncs permits to the SAP gate system/.test(ho) && /No offline mode/.test(ho) && /Open points to confirm/.test(ho));
check('…and statuses so proposed items are not read as fact', /Manual or imported, not confirmed/.test(ho) && /From package, not confirmed/.test(ho));
await p.screenshot({ path: `${OUT}/cfg-handover-register.png`, fullPage: true });

// 5. training: Guides & Video Studio (a workshop custom module so the studio has a module to explain)
await p.goto(BASE + `/#/p/${pid}/vstudio`); await p.waitForSelector('.page-header h1', { timeout: 20000 });
await p.evaluate(() => { const S = window.FWB.S; S.ws.customModules.push({ name: 'permit_to_work', label: 'Permit to Work', description: '' }); Object.assign(S.ui, { vsTab: 'create', vsMod: 'permit_to_work', vsOut: 'walkthrough', vsBrief: null }); window.FWBViews.render(); });
await p.waitForSelector('.vs-cfg', { timeout: 15000 });
const know = await p.textContent('.vs-cfg'); const br = await p.inputValue('#vs_brief');
check('the studio shows what Configuration Inputs records for the module', /Control hot work/.test(know) && /Field App › Permits/.test(know) && /Permit to Work → Visitor Log/.test(know));
check('the walkthrough brief carries purpose, usage, where to find it and relationships, proposed ones flagged', /From Configuration Inputs/.test(br) && /Purpose: Control hot work/.test(br) && /Where users find it: Field App › Permits/.test(br) && /Permit to Work → Visitor Log \(Creates a record\), when Permit approved/.test(br) && /\[proposed, to confirm\]/.test(br));
await p.evaluate(() => { window.FWB.S.ui.vsOut = 'training'; window.FWBViews.render(); }); await p.waitForSelector('.vs-path');
const path = await p.textContent('.vs-path');
check('the training option shows the role-based path: tabs per role, and tabs with no role', /Technician/.test(path) && /Supervisor/.test(path) && /Field App › Permits: Raise and close permits/.test(path) && /Role not recorded/.test(path));
check('the training option still uses the existing AI task, no new one', !!(await p.$('[data-act="aiRun"][data-task="training"]')));
await p.screenshot({ path: `${OUT}/cfg-studio-training.png`, fullPage: true });
check('nothing above changed a record', (await snap()) === before);
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
