// Only System modules and Custom modules are Facilio modules (src/core.js): custom ones that only keep files or settings for a connected app (the PDF builder, document stores) are listed apart, and a person can overrule the guess.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module'; import zlib from 'node:zlib'; import { REFERENCE_GZ_B64 } from '../data/reference-data.mjs';
const req = createRequire(import.meta.url); globalThis.FWBParser = req('../src/parser.js'); req('../src/core.js'); const F = globalThis.FWB; const S = F.S;
S.baseline = JSON.parse(zlib.gunzipSync(Buffer.from(REFERENCE_GZ_B64, 'base64')).toString());
const names = l => l.map(m => m.name).sort();
const SUPPORT = ['custom_brddocument', 'custom_implementationcostestimator', 'custom_modulelist', 'custom_onboardingtemplate', 'custom_others', 'custom_pdfbuildertemplates', 'custom_pdftemplatesettings', 'custom_projectplantemplate', 'custom_testcasedocument', 'custom_trainingguides', 'custom_vbafiles'];
assert.deepEqual(names(F.supportModules()), SUPPORT, 'the eleven file and settings stores are not modules');
assert.deepEqual(names(F.allModules().filter(m => !m.system)), ['custom_incidentmanagement', 'custom_nonconformityreport'], 'the two real custom modules stay');
assert.equal(F.allModules().filter(m => m.system).length, 485, 'system modules are untouched'); assert.ok(!F.allModules().some(m => SUPPORT.includes(m.name)), 'allModules leaves the support ones out, so the BRD, scope and mockup never list them');
assert.ok(F.moduleView('custom_pdfbuildertemplates'), 'a support module can still be opened by name');
F.wsMod('custom_pdfbuildertemplates').kind = 'module'; assert.ok(F.allModules().some(m => m.name === 'custom_pdfbuildertemplates') && !F.supportModules().some(m => m.name === 'custom_pdfbuildertemplates'), 'a person can say: this is a module');
F.wsMod('custom_incidentmanagement').kind = 'support'; assert.ok(F.supportModules().some(m => m.name === 'custom_incidentmanagement'), 'a person can say: this is not a module'); delete S.ws.modules.custom_incidentmanagement.kind; delete S.ws.modules.custom_pdfbuildertemplates.kind;
S.ws.customModules.push({ name: 'custom_pdfreport', label: 'PDF Report', description: 'proposed in the workshop' }); assert.ok(F.allModules().some(m => m.name === 'custom_pdfreport'), 'a module the team proposes is always a module, whatever its name');
assert.equal(F.supportGuess(S.baseline.modules.workorder), false, 'a system module is never support');
console.log('6 module classification checks passed');
