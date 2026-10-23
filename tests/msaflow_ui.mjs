// Contract & Workshop Planning: MSA upload validation, contract extraction with sources, scope review, session proposals, live Excel two-way sync.
import { setup } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const FX = 'tests/fixtures/'; const { page, ok, nav, done } = await setup(BASE);
const D = () => page.evaluate(() => JSON.parse(JSON.stringify(window.FWB.doc('planner'))));
const upload = async f => { await page.click('[data-act=mfStep][data-v=upload]'); await page.waitForSelector('[data-act=uploadMsa]'); const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act=uploadMsa]')]); await fc.setFiles(FX + f); await page.waitForFunction(() => !document.querySelector('.loading-overlay,.loading'), null, { timeout: 90000 }).catch(() => { }); await page.waitForTimeout(1800); };
await nav(page, 'msaflow'); await page.waitForSelector('.mf-steps');
ok((await page.$$('.mf-step')).length === 6, 'six workflow steps');
ok(!(await page.$('.sidebar [data-view=contract]')) && !(await page.$('.sidebar [data-view=scope]')) && !(await page.$('.sidebar [data-view=planner]')) && await page.$('.sidebar [data-view=msaflow]'), 'Contract is the single sidebar entry');
for (const [st, sub, sel] of [['contract', 'know', '.mf-embed'], ['scope', 'page', '.mf-embed'], ['scope', 'msa', '[data-act=uploadMsa]'], ['sessions', 'list', '[data-act=sesImport]'], ['sessions', 'dist', '.page-body .card, .page-body .empty'], ['sessions', 'att', '#att_new'], ['sessions', 'changes', '#spGenerate'], ['schedule', 'export', '.xls-table']]) { await page.evaluate(([a, b]) => { window.FWBViews.ACT.mfStep({ getAttribute: () => a }); }, [st]); await page.click(`[data-act=mfSub][data-s=${st}][data-v=${sub}]`); ok(await page.waitForSelector(sel, { timeout: 8000 }).then(() => true).catch(() => false), `Contract › ${st} › ${sub} shows its original screen`); }
// ---- invalid files: nothing is filled in
for (const [f, re] of [['empty.pdf', /empty/i], ['corrupt.pdf', /not a readable PDF|corrupt/i], ['msa_encrypted.pdf', /password|encrypt/i]]) {
  await upload(f); const d = await D(); ok(d.msaFail && re.test(d.msaFail.reason) && !d.msa && !d.contractX, f + ' rejected: ' + (d.msaFail || {}).reason);
  ok(/Failed/.test(await page.textContent('.page-body')) && /Nothing was filled in/.test(await page.textContent('.page-body')), f + ': failed state shown'); }
// ---- a good MSA
await upload('msa_full.pdf'); let d = await D(); ok(d.msa && d.msa.pages.length === 3 && !d.msaFail, 'MSA processed: 3 pages recorded'); ok(/Processed successfully/.test(await page.textContent('.page-body')), 'status shows Processed successfully');
const f = d.contractX.fields; const V = k => f[k] && f[k].value;
ok(V('reference') === 'MSA-2026-014' && f.reference.page === 1, 'reference found on page 1: ' + V('reference'));
ok(V('signed') === '2026-03-15' && V('effective') === '2026-04-01', 'signed and effective dates parsed: ' + V('signed') + ' / ' + V('effective'));
ok(V('termMonths') === 36 && f.termMonths.page === 1 && f.termMonths.section === '1.2', 'term 36 months with page 1 §1.2: ' + V('termMonths') + ' §' + f.termMonths.section);
ok(V('noticeDays') === 90, 'renewal notice 90 days: ' + V('noticeDays')); ok(/renew automatically/.test(V('renewal')) && /material breach/.test(V('exit')), 'renewal and termination sentences captured');
ok(V('paymentDays') === 45 && f.paymentDays.page === 3, 'payment terms 45 days from page 3'); ok(/250,000/.test(V('value')) && f.value.noApply, 'value shown but never auto-applied');
ok(Array.isArray(V('parties')) && V('parties').length === 2 && /Marina Properties/.test(V('parties')[0].name) && /Facilio/.test(V('parties')[1].name), 'parties: ' + JSON.stringify(V('parties')));
ok(V('obligations').some(o => o.side === 'Customer' && /subject matter experts/.test(o.text)) && V('obligations').some(o => o.side === 'Facilio'), 'obligations for both sides found');
ok(f.endDate.status === 'missing', 'end date not stated → marked Missing, not invented');
// ---- step 2: review and apply
await page.click('[data-act=mfStep][data-v=contract]'); await page.waitForSelector('[data-act=mfApplyContract]'); ok(/Missing from source/.test(await page.textContent('.page-body')), 'missing fields are labelled');
await page.click('[data-act=mfVerify][data-k=termMonths]'); d = await D(); ok(d.contractX.fields.termMonths.status === 'verified', 'user can verify a field');
await page.fill('[data-k=noticeDays]', '60'); await page.dispatchEvent('[data-k=noticeDays]', 'change'); d = await D(); ok(d.contractX.fields.noticeDays.value === 60 && d.contractX.fields.noticeDays.status === 'uncertain', 'editing a value marks it for review');
await page.fill('[data-k=noticeDays]', '90'); await page.dispatchEvent('[data-k=noticeDays]', 'change'); await page.click('[data-act=mfVerify][data-k=noticeDays]');
await page.click('[data-act=mfApplyContract]'); await page.click('.dialog [data-r="1"]'); await page.waitForTimeout(1500);
const core = await page.evaluate(() => window.FWBViews.items.get('ctrcore', 'main')); const fees = await page.evaluate(() => window.FWBViews.items.get('ctrfees', 'main'));
ok(core && core.termMonths === 36 && core.signed === '2026-03-15' && core.noticeDays === 90 && core.startDate === '2026-04-01' && /material breach/.test(core.exit) && fees.paymentDays === 45, 'values written to Know Your Contract: ' + JSON.stringify([core && core.termMonths, core && core.signed, core && core.noticeDays, fees && fees.paymentDays]));
ok(!fees.oneTime && !fees.subscription, 'contract value was not written');
await nav(page, 'contract'); ok(/36 months/.test(await page.textContent('.page-body')), 'Know Your Contract shows the extracted term'); await nav(page, 'msaflow'); await page.click('[data-act=mfStep][data-v=scope]');
// ---- step 3: scope
await page.waitForSelector('[data-act=mfApplyScope]'); d = await D(); const wo = d.scope.find(x => /work order/i.test(x.text)); ok(wo && wo.page === 2 && /^2\.1/.test(wo.section) && wo.module === 'workorder', 'scope item has page 2 and §2.1: ' + JSON.stringify(wo && [wo.page, wo.section, wo.module]));
ok(d.contractX.scopeX.exclusions.some(x => /ERP/.test(x.text) && x.page === 2) && d.contractX.scopeX.responsibilities.length && d.contractX.scopeX.assumptions.length, 'exclusions, responsibilities and assumptions captured with pages');
const i0 = d.scope.indexOf(d.scope.find(x => /work order/i.test(x.text))); await page.click(`[data-act=mfScope][data-i="${i0}"][data-s=matched]`);
const iPm = d.scope.findIndex(x => /planned maintenance/i.test(x.text)); await page.click(`[data-act=mfScope][data-i="${iPm}"][data-s=matched]`); const iSr = d.scope.findIndex(x => /service request/i.test(x.text)); if (iSr >= 0) await page.click(`[data-act=mfScope][data-i="${iSr}"][data-s=excluded]`);
d = await D(); ok(d.scope[i0].status === 'matched' && (iSr < 0 || d.scope[iSr].status === 'excluded'), 'scope items can be confirmed and rejected');
await page.click('[data-act=mfApplyScope]'); await page.waitForTimeout(1200); const sc = await page.evaluate(() => window.FWBViews.items.get('scope', 'main'));
ok(sc.inclusions.some(x => /Work Order/i.test(x) && /MSA p\.2/.test(x)) && sc.exclusions.some(x => /ERP/.test(x) && /p\.2/.test(x)) && (sc.assumptions || []).length && (sc.responsibilities || []).length, 'Scope page filled with MSA page references; assumptions kept in their own list');
// ---- step 4: sessions
await page.click('[data-act=mfStep][data-v=sessions]'); await page.waitForSelector('[data-act=mfPropose]'); const before = (await D()).sessions.length; await page.click('[data-act=mfPropose]'); await page.waitForTimeout(800); d = await D();
const prop = d.sessions.filter(s => s.proposed); ok(prop.length >= 2 && prop.every(s => s.scopeIds.length && /MSA p\.2/.test(s.why) && s.status === 'planned'), 'proposed sessions with scope links and reasons: ' + prop.map(s => s.title).join(' | '));
ok(!prop.some(s => (s.modules || []).includes('servicerequest')), 'rejected scope did not create a session'); const n1 = d.sessions.length; await page.click('[data-act=mfPropose]'); await page.waitForTimeout(400); ok((await D()).sessions.length === n1, 'proposing again does not duplicate'); 
// manual edit survives regeneration
await page.evaluate(() => { const d = window.FWB.doc('planner'); const s = d.sessions.find(x => x.proposed); s.title = 'Custom edited title'; s.date = '2026-11-25'; window.FWB.markDirty('planner'); }); await page.click('[data-act=mfPropose]'); await page.waitForTimeout(300); d = await D(); ok(d.sessions.some(s => s.title === 'Custom edited title' && s.date === '2026-11-25'), 'manual edits survive regeneration');
// ---- step 5: live schedule
await page.click('[data-act=mfStep][data-v=schedule]'); await page.waitForSelector('#mfxHost .xe-grid', { timeout: 30000 }); await page.waitForTimeout(800);
const grid = () => page.evaluate(() => [...document.querySelectorAll('#mfxHost .xls-table tr')].map(r => [...r.querySelectorAll('td')].map(c => c.textContent.trim())));
let g = await grid(); ok(g.some(r => r.some(c => c.includes('Custom edited title'))), 'Excel preview shows the session titles'); ok(g.some(r => r.includes('25-Nov-2026') || r.some(c => /25.?Nov.?2026/i.test(c))), 'Excel preview shows the date');
const sh = await page.evaluate(() => { const E = document.querySelector('#mfxHost'); return !!E; }); 
// planner -> excel: edit the session through the form drawer
const sid = (await D()).sessions.find(s => s.title === 'Custom edited title').id; await page.evaluate(id => window.FWBViews.ACT.editSession({ getAttribute: () => id }), sid); await page.waitForSelector('#ss_title'); await page.fill('#ss_title', 'Renamed from the planner'); await page.fill('#ss_date', '2026-12-02'); await page.click('[data-act=saveSession]'); await page.waitForTimeout(1200);
console.log('  dbg0', await page.evaluate(() => { const d = window.FWB.doc('planner'); return [d.sessions.length, d.sessions.map(x => x.status + ':' + x.title).join('|').slice(0, 200), window.FWB.S.docs.planner.dirty, window.FWB.S.docs.planner.version]; }));
console.log('  dbg', await page.evaluate(() => { const L = window.FWBViews.msaflowLive(); return [!!L, L && (L.sig || '').slice(0, 60), JSON.stringify(window.FWBViews.sessionRows().map(r => r.b)).slice(0, 200), document.getElementById('ss_title') ? 'drawer open' : 'drawer closed']; }));
g = await grid(); ok(g.some(r => r.some(c => c.includes('Renamed from the planner'))) && g.some(r => r.some(c => /02.?Dec.?2026/i.test(c))), 'planner edit appears in the Excel preview without a reload');
// excel -> planner: type into a cell
const cellOf = async txt => page.evaluate(t => { const td = [...document.querySelectorAll('#mfxHost .xls-table td')].find(c => c.textContent.trim().includes(t)); if (!td) return null; const r = td.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, txt);
const typeCell = async (txt, val) => { const c = await cellOf(txt); if (!c) throw new Error('cell not found ' + txt); await page.mouse.dblclick(c.x, c.y); await page.keyboard.press('Control+A'); await page.keyboard.type(val); await page.keyboard.press('Enter'); await page.waitForTimeout(900); };
await typeCell('Renamed from the planner', 'Edited in Excel'); d = await D(); ok(d.sessions.some(s => s.id === sid && s.title === 'Edited in Excel'), 'Excel title edit updates the session, id kept: ' + JSON.stringify(d.sessions.find(s => s.id === sid).title));
const dc = await page.evaluate(() => { const rows = [...document.querySelectorAll('#mfxHost .xls-table tr')]; const r = rows.find(x => [...x.querySelectorAll('td')].some(c => c.textContent.trim().includes('Edited in Excel'))); const tds = [...r.querySelectorAll('td')]; const c = tds.find(t => /02.?Dec.?2026/i.test(t.textContent)); const b = c.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, t: c.textContent.trim() }; });
await page.mouse.dblclick(dc.x, dc.y); await page.keyboard.press('Control+A'); await page.keyboard.type('05-Dec-2026'); await page.keyboard.press('Enter'); await page.waitForTimeout(900); d = await D(); ok(d.sessions.find(s => s.id === sid).date === '2026-12-05', 'Excel date edit updates the session: ' + d.sessions.find(s => s.id === sid).date);
// invalid date is rejected and restored
const dc2 = await page.evaluate(() => { const rows = [...document.querySelectorAll('#mfxHost .xls-table tr')]; const r = rows.find(x => [...x.querySelectorAll('td')].some(c => c.textContent.trim().includes('Edited in Excel'))); const c = [...r.querySelectorAll('td')].find(t => /05.?Dec.?2026/i.test(t.textContent)); const b = c.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
await page.mouse.dblclick(dc2.x, dc2.y); await page.keyboard.press('Control+A'); await page.keyboard.type('not a date'); await page.keyboard.press('Enter'); await page.waitForTimeout(900); d = await D(); g = await grid();
ok(d.sessions.find(s => s.id === sid).date === '2026-12-05' && g.some(r => r.some(c => /05.?Dec.?2026/i.test(c))), 'invalid date rejected: session unchanged and the cell is restored'); ok(/Not saved/.test(await page.textContent('.toast, #toast, body')), 'user is told it was not saved');
// no recursive loop: rebuild count stable
const h1 = JSON.stringify((await D()).sessions); await page.waitForTimeout(1500); ok(JSON.stringify((await D()).sessions) === h1, 'no update loop: data stable after the edits');
// ---- step 6
await page.click('[data-act=mfStep][data-v=final]'); await page.waitForSelector('[data-act=mfFinalise]'); await page.click('[data-act=mfFinalise]'); if (await page.$('.dialog [data-r="1"]')) await page.click('.dialog [data-r="1"]'); await page.waitForTimeout(800); d = await D(); ok(d.final && d.final.sig, 'schedule finalised');
// scope change after finalising: warning, schedule untouched
const before2 = JSON.stringify(d.sessions.map(s => [s.id, s.title, s.date])); await page.evaluate(() => { const d = window.FWB.doc('planner'); const x = d.scope.find(z => z.status === 'matched'); x.status = 'excluded'; window.FWB.markDirty('planner'); window.FWBViews.render(); }); await page.waitForTimeout(500);
ok(/scope has changed since the schedule was finalised/i.test(await page.textContent('.page-body')), 'scope change after finalising shows a warning'); ok(JSON.stringify((await D()).sessions.map(s => [s.id, s.title, s.date])) === before2, 'finalised schedule not overwritten');
await done();
