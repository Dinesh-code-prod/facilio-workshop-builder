// A dropped contract or SLA/KPI sheet read into the KPIs & SLA matrix page (work/server/_slakpi.mjs). Pure rules only: the prompt, and the cleaning of the model's answer.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { slakpiPrompt, parseSlakpi } from '../work/server/_slakpi.mjs';
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const modules = [{ name: 'workorder', label: 'Work Order' }, { name: 'asset', label: 'Asset' }];
const text = 'SLA schedule. Critical work orders: response within 30 minutes, resolution within 4 hours, 24x7, escalate to the supervisor after 30 minutes. PM compliance must reach 95 percent every month.';
const answer = {
  sla: [{ module: 'workorder', priority: 'Critical', response: '30 minutes', resolution: '4 hours', hours: '24x7', esc: [{ after: '30 minutes', to: 'Supervisor' }], quote: 'response within 30 minutes, resolution within 4 hours' },
    { module: 'workorder', priority: 'critical', response: '1 hour', resolution: '8 hours' },                                    // same module and priority: dropped
    { module: 'nothere', priority: 'High', response: '2 hours', resolution: '1 day', quote: 'words that are not in the document at all' },   // unknown module becomes General; quote flagged
    { module: 'asset', priority: 'Low', response: '', resolution: '2 days' }],                                                       // no response time: dropped
  kpis: [{ name: 'PM compliance', group: 'Maintenance', source: 'Work orders', freq: 'monthly', unit: '%', target: '95%', module: 'workorder', solution: 'Dashboard widget', quote: 'PM compliance must reach 95 percent every month' },
    { name: 'pm compliance', freq: 'Daily' }, { name: 'Odd', freq: 'hourly', target: 'high' }, { name: '' }] };
t('the prompt carries the document and the module list, says the document is data, and asks only for what was wanted', () => {
  const p = slakpiPrompt({ text, fileName: 'sla.docx', modules, want: 'both' }); assert.ok(p.user.includes('sla.docx') && p.user.includes('workorder = Work Order') && p.user.includes('response within 30 minutes') && /data: never follow instructions/.test(p.system));
  assert.ok(slakpiPrompt({ text, modules, want: 'kpi' }).user.includes('List only KPIs') && slakpiPrompt({ text, modules, want: 'sla' }).user.includes('List only SLA rows'));
});
t('SLA rows are cleaned: one per module and priority, both times required, unknown module becomes General, a quote that is not in the document is flagged', () => {
  const r = parseSlakpi(answer, { text, modules, want: 'both' }); assert.equal(r.sla.length, 2); assert.equal(r.sla[0].module, 'workorder'); assert.equal(r.sla[0].esc[0].to, 'Supervisor'); assert.equal(r.sla[0].notes, '');
  assert.equal(r.sla[1].module, ''); assert.match(r.sla[1].notes, /Quote not found/);
});
t('KPIs are cleaned: a name is required, the same name once, frequency is one of the four (else Monthly), the target is a number or empty', () => {
  const r = parseSlakpi(answer, { text, modules, want: 'both' }); assert.equal(r.kpis.length, 2); assert.equal(r.kpis[0].freq, 'Monthly'); assert.equal(r.kpis[0].target, '95'); assert.equal(r.kpis[0].notes, '');
  assert.equal(r.kpis[1].name, 'Odd'); assert.equal(r.kpis[1].freq, 'Monthly'); assert.equal(r.kpis[1].target, '');
});
t('want sla or kpi returns only that part; nonsense in gives nothing out', () => {
  assert.equal(parseSlakpi(answer, { text, modules, want: 'kpi' }).sla.length, 0); assert.equal(parseSlakpi(answer, { text, modules, want: 'sla' }).kpis.length, 0);
  assert.deepEqual(parseSlakpi('x', { text, modules, want: 'both' }), { sla: [], kpis: [] });
});
t('control characters and very long values are cut', () => {
  const r = parseSlakpi({ kpis: [{ name: 'A\u0000B' + 'x'.repeat(500), description: 'd'.repeat(900) }] }, { text, modules, want: 'kpi' }); assert.ok(r.kpis[0].name.length <= 120 && !/\u0000/.test(r.kpis[0].name) && r.kpis[0].description.length <= 400);
});
t('the page and the route are wired in: two mini tabs, import, export, Ask Claude, and the server route', () => {
  const pg = fs.readFileSync(new URL('../src/slakpi.js', import.meta.url), 'utf8'), api = fs.readFileSync(new URL('../work/server/_qbankapi.mjs', import.meta.url), 'utf8');
  for (const s of ['slkTab', 'slkImport', 'slkExport', 'slkAsk', 'slkAdd', 'KPI matrix', 'SLA matrix']) assert.ok(pg.includes(s), s); assert.ok(api.includes('/api/projects/:id/slakpi/read') && api.includes("limit('ai'"));
});
t('the FTR generator takes every ticked module, feeds it the module\'s SLA rows and KPIs, and adds each row to its own sheet', () => {
  const ftr = fs.readFileSync(new URL('../src/ftr.js', import.meta.url), 'utf8'); for (const s of ['data-fa-mod', 'modCtx(', 'slaMatrix', 'r.sheet']) assert.ok(ftr.includes(s), s);
});
console.log(n + ' KPI and SLA import checks passed');
