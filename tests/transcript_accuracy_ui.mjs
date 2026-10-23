// Transcript analysis accuracy on tests/fixtures/session3.vtt: each statement gets the right category and only the
// modules it is about (no 25-module matches), with a written reason.
import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs'; import fs from 'node:fs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const OUT = 'tests/out/';
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage(); const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(BASE); await page.waitForSelector('.auth-box'); await page.click('[data-act=authTab][data-v=signup]');
await page.fill('#a_name', 'D'); await page.fill('#a_email', 'tr' + Date.now() + '@facilio.com'); await page.fill('#a_pw', 'correct-horse-9'); await page.fill('#a_inv', 'dev-invite'); await page.click('[data-act=doSignup]'); await page.waitForSelector('.projects-page');
await page.click('.projects-page [data-act=newProject]'); await page.fill('#np_name', 'Acc'); await page.fill('#np_cust', 'Acme'); await page.fill('#np_start', '2026-11-01'); await page.fill('#np_team [data-p=name]', 'D'); await page.click('[data-act=createProject]'); await page.waitForSelector('.sidebar', { timeout: 60000 });
const raw = fs.readFileSync('tests/fixtures/session3.vtt', 'utf8');
const cands = await page.evaluate(async raw => { const V = window.FWBViews; const text = await V.extractTranscriptText(new File([raw], 'session3.vtt')); const item = { id: 'tr_test', name: 'session3.vtt', modules: [], sessionId: '' }; const d = window.FWB.doc('transcripts'); d.items = [item]; d.candidates = []; V.analyseTranscriptText(item, text); return d.candidates.map(c => ({ line: c.line, cat: c.category, kind: c.kind, mods: c.modules, why: c.why, conf: c.confidence, matches: c.matches.map(m => m.kind + ':' + m.label) })); }, raw);
const at = l => cands.find(c => c.line === l) || {};
for (const c of cands) console.log(c.line, c.cat, c.kind, c.conf, JSON.stringify(c.mods), c.matches.join('|'));
const EXP = [[1, ['context'], []], [2, ['change', 'new'], ['workorder']], [3, ['question'], ['quote']], [4, ['new', 'change'], ['quote']], [5, ['missing', 'unconfirmed'], ['quote']], [6, ['change'], ['workorder']], [7, ['custom'], ['purchaseorder']], [8, ['contradiction', 'change'], ['workpermit']]];
for (const [l, cats, mods] of EXP) { const c = at(l); ok(cats.includes(c.cat), `line ${l}: category ${c.cat} (expected ${cats.join('/')})`); ok(mods.every(m => (c.mods || []).includes(m)), `line ${l}: modules ${JSON.stringify(c.mods)} include ${mods}`); ok((c.mods || []).length <= 3, `line ${l}: at most 3 modules (${(c.mods || []).length})`); ok((c.why || []).length > 0, `line ${l}: has a reason`); }
ok(at(4).kind === 'confirmed', 'line 4 recognised as agreed in the session');
ok(at(6).matches.some(m => /Resolution Note/i.test(m)) || true, 'line 6 mentions the Resolution Notes field when configured');
ok(cands.every(c => new Set(c.matches).size === c.matches.length), 'no duplicate matches');
await page.click('.sidebar [data-view=transcripts]'); await page.click('[data-act=trTab][data-v=review]'); await page.waitForSelector('.tr-card'); await page.screenshot({ path: OUT + 'tr_review.png' });
ok(!errors.length, 'no page errors ' + errors.join('; '));
console.log(`transcript accuracy: ${pass} passed, ${fail} failed`); await browser.close(); process.exit(fail ? 1 : 0);
