// Data onboarding sheet rules (public/onboarding-tool/04-rules.js + 05-engine.js): run the real checker on small workbooks and see that good data passes and each kind of mistake is caught.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import vm from 'node:vm';
const dir = new URL('../public/onboarding-tool/', import.meta.url); const ctx = { console }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(new URL(f, dir), 'utf8'), ctx, { filename: f });
load('02-part.js'); load('04-rules.js'); load('05-engine.js');
const X = ctx.XLSX; assert.ok(X && X.utils, 'the spreadsheet reader loads'); const V = ctx.OnboardingValidator, R = vm.runInContext('RULES', ctx);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const book = sheets => { const wb = X.utils.book_new(); Object.entries(sheets).forEach(([name, aoa]) => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(aoa), name)); return wb; };
const SITE_H = ['Site Name', 'Total Built Area', 'Site Type', 'No. Of Buildings', 'Site Managed By', 'Address', 'Latitude', 'Longitude'];
const run = sheets => V.validate(book(sheets), R); const has = (res, check, sheet) => res.issues.some(i => i.check === check && (!sheet || i.sheet === sheet));   // the other template sheets are missing in these small workbooks, which is itself reported (structure), so each check looks at the sheet under test
const good = [['Site Overview'], SITE_H, ['Name of the site'], ['Alpha Tower', 1200, 'Offices', 2, 'Ravi', '1 Main Street', 12.5, 77.5], ['Beta Plaza', 800, 'Hospital', 1, 'Asha', '2 Side Road', 13.1, 77.6]];
t('a clean Site sheet has no critical problems', () => { const r = run({ Site: good }); const bad = r.issues.filter(i => i.sheet === 'Site' && i.severity === 'Critical'); assert.equal(bad.length, 0, JSON.stringify(bad.slice(0, 3))); });
t('a missing template sheet is reported', () => { assert.ok(has(run({ Site: good }), 'structure', 'Building')); });
t('a missing required value is caught', () => { const r = run({ Site: [good[0], SITE_H, good[2], ['', 100, 'Offices', 1, '', '', '', '']] }); assert.ok(has(r, 'required', 'Site')); });
t('a duplicate site name is caught', () => { const r = run({ Site: good.concat([['Alpha Tower', 10, 'Offices', 1, '', '', '', '']]) }); assert.ok(has(r, 'unique', 'Site')); });
t('a site type outside the list is caught', () => { const r = run({ Site: [good[0], SITE_H, good[2], ['Gamma', 10, 'Castle', 1, '', '', '', '']] }); assert.ok(has(r, 'list', 'Site')); });
t('a negative or text area and a latitude out of range are caught', () => { const r = run({ Site: [good[0], SITE_H, good[2], ['Delta', -5, 'Offices', 1, '', '', 120, 77], ['Echo', 'big', 'Offices', 1, '', '', '', '']] }); assert.ok(has(r, 'number', 'Site')); assert.ok(has(r, 'geo', 'Site')); });
t('extra spaces in a name are caught', () => { const r = run({ Site: [good[0], SITE_H, good[2], ['  Foxtrot  Tower', 10, 'Offices', 1, '', '', '', '']] }); assert.ok(has(r, 'spaces', 'Site')); });
t('a building that names a site that does not exist is caught', () => { const r = run({ Site: good, Building: [['Building'], ['Building Name', 'Site', 'Total Square Footage', 'Occupancy', 'No of Floors', 'Engineer'], ['Name'], ['B1', 'Nowhere', 100, 5, 3, '']] }); assert.ok(has(r, 'location', 'Building') || has(r, 'reference', 'Building')); });
console.log(`${n} onboarding rule checks passed`);
