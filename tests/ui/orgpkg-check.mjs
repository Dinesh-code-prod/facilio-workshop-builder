// Org Package Export page in the browser (local preview): the project's new custom module, fields and state flow are listed with their
// status and source requirements; before BRD sign-off they are drafts and the package is named DRAFT_; after sign-off the package downloads,
// re-opens as a ZIP with exactly the listed files, every XML parses and passes the structural check; unsupported items and manual steps are
// listed; the report is a separate download that says the package was not imported anywhere.
// Usage: node tests/ui/orgpkg-check.mjs [baseUrl] [outDir]
import { chromium } from 'playwright'; import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const JSZip = require('jszip'); const { DOMParser } = require('@xmldom/xmldom'); const O = require('../../src/orgpkg.js');
const BASE = process.argv[2] || 'http://localhost:4173'; const OUT = process.argv[3] || 'tests/ui/out'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Org package', customer: 'Acme' }) })).json()).project.id);
await p.goto(BASE + `/#/p/${pid}/orgpkg`); await p.reload(); await p.waitForSelector('.sidebar'); await p.waitForTimeout(1200);
check('the page is in the menu under Validation & Traceability', await p.evaluate(() => { const g = window.FWBViews.navFor().find(x => x.items.some(i => i[0] === 'orgpkg')); const it = g && g.items.find(i => i[0] === 'orgpkg'); return !!it && it[3] === 'Validation & Traceability'; }));
// the project's configuration: a new custom module with fields, a new state flow, a field on Work Order, a field type not exported yet
await p.evaluate(() => { const F = window.FWB, S = F.S; S.ws.customModules.push({ name: 'custom_permittowork', label: 'Permit to Work', description: 'Hot work permits' }); Object.assign(F.wsMod('custom_permittowork'), { inScope: true });
  F.fops('custom_permittowork').add.push({ name: 'name', label: 'Name', type: 'Single Line Text', required: true, mainField: true, options: [], lookup: '', status: 'proposed' }, { name: 'worktype', label: 'Work type', type: 'Picklist', options: [{ value: 'Hot work' }, { value: 'Cold work' }], lookup: '', status: 'proposed' }, { name: 'issuedto', label: 'Issued to', type: 'Lookup', lookup: 'people', options: [], status: 'proposed' });
  F.fops('workorder').add.push({ name: 'permitref', label: 'Permit reference', type: 'Single Line Text', options: [], lookup: '', status: 'proposed' }, { name: 'sig', label: 'Supervisor signature', type: 'Signature', options: [], lookup: '', status: 'proposed' });
  S.ws.flows['custom_permittowork::proposed_x'] = { id: 'custom_permittowork::proposed_x', module: 'custom_permittowork', name: 'Permit Flow', origin: 'proposed', enabled: true, initial: 's_req', criteria: '', states: [{ id: 's_req', name: 'requested', label: 'Requested', origin: 'proposed' }, { id: 's_app', name: 'approved', label: 'Approved', origin: 'proposed' }, { id: 's_cls', name: 'closed', label: 'Closed', origin: 'proposed' }],
    transitions: [{ id: 't_a', name: 'Approve', from: 's_req', to: 's_app', type: 'user', buttonType: 0, enabled: true, actors: [{ actor: 'tbc:any' }], approval: { required: false }, actions: [], notifications: ['HSE manager'], portals: [], origin: 'proposed' }, { id: 't_c', name: 'Close', from: 's_app', to: 's_cls', type: 'user', enabled: true, actors: [], approval: { required: false }, actions: [], notifications: [], portals: [], origin: 'proposed', commentRequired: true }] };
  S.ws.requirements.push({ id: 'PTW-001', title: 'Permits need a work type', status: 'Confirmed', modules: ['custom_permittowork'], fields: ['custom_permittowork.worktype'], transitions: ['t_a'] });
  F.changed('Org package fixtures', '', { section: 'workshop' }); window.FWBViews.render(); });
await p.waitForTimeout(1200);
let txt = await p.textContent('.page-body');
check('components are listed: the module, its fields, the flow, its states and transitions', /Permit to Work \(custom_permittowork\)/.test(txt) && /Work type \(work_type_custom_permittowork\)/.test(txt) && /Permit Flow/.test(txt) && /Requested \(requested\)/.test(txt) && /Approve \(Permit Flow\)/.test(txt));
check('before BRD sign-off everything is a draft and nothing would be packaged', /BRD is not signed off/.test(txt) && await p.$eval('[data-act="opkZip"]', e => e.disabled));
check('a requirement behind a component is shown', /PTW-001/.test(txt));
check('a field type that is not exported yet says why', /Supervisor signature/.test(txt) && /Not exportable yet/.test(txt));
check('changes that are not packaged are manual steps (the new flow\'s notifications)', /Manual implementation steps/.test(txt) && /notifications to: HSE manager/.test(txt));
await p.click('[data-change="opkDrafts"]'); await p.waitForTimeout(400);
const [d1] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('[data-act="opkZip"]')]); check('with drafts included the package is named DRAFT_', /^DRAFT_delivery_studio_package_/.test(d1.suggestedFilename()), d1.suggestedFilename());
await p.click('[data-change="opkDrafts"]'); await p.waitForTimeout(300);
// BRD signed off by the owner
await p.evaluate(async pid => { await fetch(`/api/fn/api/projects/${pid}/items/signoff/brd`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: { title: 'BRD sign-off', status: 'signed', signedBy: 'Owner' } }) }); }, pid);
await p.evaluate(() => window.FWBViews.items.load(['signoff'], true)); await p.waitForTimeout(800); txt = await p.textContent('.page-body');
check('after BRD sign-off the components are ready', /BRD is signed off/.test(txt) && /Ready/.test(txt) && !(await p.$eval('[data-act="opkZip"]', e => e.disabled)));
await p.click('[data-change="opkClosed"][data-k$="|s_cls"]'); await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/orgpkg.png`, fullPage: false });
const [d2] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('[data-act="opkZip"]')]); const zp = `${OUT}/orgpkg.zip`; await d2.saveAs(zp);
check('the package is not a draft and has the organisation id in its name', /^delivery_studio_package_\d+_\d+\.zip$/.test(d2.suggestedFilename()), d2.suggestedFilename());
const z = await JSZip.loadAsync(fs.readFileSync(zp)); const names = Object.keys(z.files).filter(k => !z.files[k].dir).sort(); const files = {}; for (const k of names) files[k] = await z.file(k).async('string');
check('the ZIP has PackageConf.xml, the component files and metafiles/', names.join() === ['PackageConf.xml', 'components/FIELD.xml', 'components/MODULE.xml', 'components/STATE_FLOW.xml', 'components/STATE_TRANSITION.xml', 'components/TICKET_STATUS.xml'].join() && !!z.files['metafiles/'], names.join());
const model = await p.evaluate(() => { const B = window.FWB.S.baseline; const m = {}; Object.values(B.modules).forEach(x => { m[x.name] = { uid: x.ref && x.ref.uid, statuses: (B.statuses[x.name] || []).map(s => ({ name: s.name })), flows: B.flows.filter(f => f.module === x.name).map(f => ({ link: f.link })) }; }); return { modules: m }; });
const chk = O.verify(files, model, DOMParser); check('every file parses and the structural check passes on the downloaded ZIP', chk.ok && chk.checked >= 9, chk.errors.slice(0, 2).join('; '));
check('the field on Work Order carries the Work Order module identifier', files['components/FIELD.xml'].includes('Parent_Id="' + model.modules.workorder.uid + '"') && /permit_reference_workorder/.test(files['components/FIELD.xml']));
check('the state marked closed has typeCode 2', /<status>closed<\/status>[\s\S]*?<typeCode>2<\/typeCode>/.test(files['components/TICKET_STATUS.xml']));
check('the signature field (not exportable yet) is not in the package', !/signature/i.test(files['components/FIELD.xml']));
const [d3] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('[data-act="opkReport"]')]); const rp = `${OUT}/orgpkg-report.md`; await d3.saveAs(rp); const md = fs.readFileSync(rp, 'utf8');
check('the report is a separate file and says the package was not imported', /has NOT been imported/.test(md) && /PTW-001 \(Confirmed\)/.test(md) && /Manual implementation steps/.test(md));
check('no page errors', !errs.length, errs.slice(0, 2).join(' | '));
console.log(`${res.filter(Boolean).length}/${res.length} checks passed`); await b.close();
