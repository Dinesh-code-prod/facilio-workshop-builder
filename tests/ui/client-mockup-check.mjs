// Opens the generated client mockup in a real browser and clicks through it: menu, list, record, state move, process, connected app, new record.
// Run: node tests/ui/client-mockup-check.mjs   (PW_CHANNEL=msedge on this PC if Chrome is missing)
import { chromium } from 'playwright'; import { createRequire } from 'node:module'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
globalThis.FWBViews = { ACT: {}, toast() { } }; createRequire(import.meta.url)(fileURLToPath(new URL('../../src/mockuphtml.js', import.meta.url))); const { toClientHtml } = globalThis.FWBViews.mockupClient;
const data = { customer: 'Al Moallam', project: 'Rollout', modules: [
  { name: 'workorder', label: 'Work Order', requirements: [{ id: 'WO-1', title: 'Weekly report' }], fields: [{ label: 'Priority', type: 'dropdown', options: ['Low', 'High'], required: true }, { label: 'Cost', type: 'number', options: [] }], forms: [{ label: 'WO', sections: [{ name: 'Basics', fields: ['Priority', 'Cost', 'Notes'] }] }], flows: [{ name: 'WO flow', states: ['New', 'Approved', 'Done'], transitions: [{ name: 'Approve', from: 'New', to: 'Approved' }, { name: 'Complete', from: 'Approved', to: 'Done' }] }] },
  { name: 'site', label: 'Site', requirements: [], fields: [{ label: 'Region', type: 'text', options: [] }], forms: [], flows: [] }, { name: 'asset', label: 'Asset', requirements: [], fields: [], forms: [], flows: [] }],
  crosslinks: [{ from: 'Work Order', to: 'Asset', name: 'Create asset', condition: 'approved' }], apps: [{ name: 'Tool kit', module: 'Work Order', trigger: 'button', purpose: 'Pick tools', shows: 'tool list' }] };
const file = path.join(os.tmpdir(), 'client-mockup-check.html'); fs.writeFileSync(file, toClientHtml(data));
let b; try { b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); } catch (e) { b = await chromium.launch({ channel: 'msedge' }); }
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => d.accept());
await p.goto(pathToFileURL(file).href); const txt = async s => (await p.innerText(s || 'body')).replace(/\s+/g, ' ').slice(0, 240);
console.log('MENU:', (await p.$$eval('.gh, .ni', els => els.map(e => e.textContent))).join(' | '));
console.log('1 opens on the first module:', await txt('main'));
await p.click('.ni:has-text("Work Order")'); console.log('2 list:', await txt('main'));
await p.click('tbody tr'); console.log('3 record:', await txt('main'));
await p.click('button:has-text("Approve")'); await p.waitForTimeout(200); console.log('4 after Approve, ribbon:', await txt('.ribbon'), '| title:', await txt('h1'));
await p.click('.tb:has-text("Process")'); await p.click('button.btn.p:has-text("Create asset")'); await p.waitForTimeout(200); console.log('5 toast:', await txt('.toast'));
await p.click('.tb:has-text("Apps")'); await p.click('button:has-text("Open button")'); console.log('6 connected app:', await txt('.modal'));
await p.click('.modal button:has-text("Close")'); await p.click('.ni:has-text("Asset")'); console.log('7 asset list now holds the created record:', await txt('tbody'));
await p.click('.ni:has-text("Work Order")'); await p.click('button:has-text("+ New")'); await p.click('button:has-text("Save")'); console.log('8 rows after New and Save:', (await p.$$('tbody tr')).length);
console.log('errors:', errs.length ? errs : 'none'); await b.close();
