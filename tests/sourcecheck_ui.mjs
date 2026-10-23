// Phase 7 source checks: valid, incomplete, inconsistent and missing-source scenarios; pass / needs review / confirmed error; links to records.
import { setup } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const { page, ok, nav, done } = await setup(BASE);
const lvl = async id => page.$eval(`[data-check="${id}"]`, e => e.getAttribute('data-level')).catch(() => 'missing');
// ---- clean project: everything that has nothing to check passes
await nav(page, 'checks'); await page.click('[data-act=chkTab][data-v=sources]'); await page.waitForSelector('[data-check]');
ok((await page.$$eval('[data-check]', e => e.every(x => x.getAttribute('data-level') === 'pass'))), 'an empty project passes every source check');
// ---- seed: one valid chain, then problems
await page.evaluate(async () => { const F = window.FWB, V = window.FWBViews, ws = F.S.ws, now = new Date().toISOString(); const pl = F.doc('planner'); pl.sessions = [{ id: 'ses1', no: 1, title: 'WO', date: '2026-11-02', modules: ['workorder'], status: 'planned' }];
  ws.requirements.push(
    { id: 'WO-001', title: 'Auto assign', modules: ['workorder'], classification: 'change', status: 'Confirmed', confirmedBy: 'Priya', sessionId: 'ses1', source: { agreedInSession: true, session: 'ses1' }, created: now, fields: [], transitions: [], history: [{ at: now, by: 'Dinesh R' }] },
    { id: 'WO-002', title: 'SLA clock', modules: ['workorder'], classification: 'custom', status: 'Confirmed', confirmedBy: '', created: now, fields: [], transitions: [] },
    { id: 'WO-003', title: 'Ghost session', modules: ['workorder'], classification: 'change', status: 'Draft', sessionId: 'gone', created: now, fields: [], transitions: [] },
    { id: 'XX-004', title: 'Bad module', modules: ['no_such_module'], classification: 'change', status: 'Draft', created: now, fields: [], transitions: [] },
    { id: 'WO-005', title: 'Auto assign', modules: ['workorder'], classification: 'change', status: 'Draft', created: now, fields: [], transitions: [] });
  ws.questions.push({ id: 'q1', text: 'Who approves?', area: 'Work Order', owner: 'customer', status: 'answered', answer: 'Manager', created: now }, { id: 'q2', text: 'Dangling', area: 'WO', owner: 'customer', status: 'open', reqId: 'NOPE-9', created: now }, { id: 'q3', text: 'Closed with nothing', area: 'WO', owner: 'customer', status: 'closed', created: now });
  pl.scope = [{ id: 'sc1', text: 'Work order management', module: 'workorder', confidence: 'high', status: 'matched', source: 'msa', page: 3, section: '2.1' }, { id: 'sc2', text: 'Asset register', module: 'asset', confidence: 'high', status: 'matched', source: 'msa' }];
  F.markDirty('workshop'); F.markDirty('planner');
  await V.items.put('usecase', 'ucOK', { no: 1, title: 'Valid', modules: ['workorder'], reqIds: ['WO-001'], solution: 'Configuration', confirmation: 'Customer confirmed', confBy: 'Priya', evidence: 'Session 1', impl: 'Documented' }, { silent: true });
  await V.items.put('usecase', 'ucBad', { no: 2, title: 'Broken links', modules: ['workorder'], reqIds: ['WO-777'], questionIds: ['q-none'], solution: 'Pending decision', confirmation: 'Customer confirmed', confBy: '', impl: 'Verified against configuration' }, { silent: true }); });
await nav(page, 'checks'); await page.click('[data-act=chkTab][data-v=sources]'); await page.waitForSelector('[data-check]'); await page.waitForTimeout(500);
const L = {}; for (const id of ['r_src', 'r_who', 'r_ses', 'r_tr', 'r_mod', 'r_nomod', 'r_prod', 'r_dup', 'm_uc', 'm_ucreq', 'm_ucq', 'm_ucconf', 'm_ucver', 'm_ucsol', 'm_ucev', 'q_ses', 'q_ver', 'q_cl', 's_ref', 's_map', 'c_cfg']) L[id] = await lvl(id); console.log('  ', JSON.stringify(L));
ok(L.r_who === 'error' && L.r_ses === 'error' && L.r_mod === 'error' && L.m_ucreq === 'error' && L.m_ucq === 'error' && L.m_ucconf === 'error' && L.m_ucver === 'error' && L.q_ses === 'error', 'broken links and broken rules are CONFIRMED ERRORS');
ok(L.r_src === 'review' && L.r_prod === 'review' && L.r_dup === 'review' && L.m_ucsol === 'review' && L.q_ver === 'review' && L.q_cl === 'review' && L.s_ref === 'review' && L.m_ucev === 'review', 'missing evidence, ambiguity and unverified answers are NEEDS REVIEW, not errors');
ok(L.r_tr === 'pass' && L.m_ucq !== 'pass', 'checks with nothing wrong pass (no transcript links to break)');
const txt = await page.textContent('.page-body'); ok(/confirmed error\(s\)/.test(txt) && /need human review/.test(txt) && /passed/.test(txt), 'the summary separates errors, review items and passes');
ok(/WO-002/.test(await page.textContent('[data-check=r_who]')) && !/WO-001/.test(await page.textContent('[data-check=r_who]')), 'only the requirement missing its confirmer is listed — the valid WO-001 is not flagged');
ok(!/WO-001/.test(await page.textContent('[data-check=r_src]')), 'a requirement with a source passes the traceability check');
ok(/Asset register/.test(await page.textContent('[data-check=s_ref]')) && !/Work order management/.test(await page.textContent('[data-check=s_ref]')), 'MSA item without a page or section is listed; the one with page 3 is not');
// links go to the record
await page.click('[data-check=r_who] [data-act=goNav]'); await page.waitForTimeout(500); ok((await page.textContent('h1')).includes('Transcripts'), 'a finding links to the requirements register'); await nav(page, 'checks'); await page.click('[data-act=chkTab][data-v=sources]'); await page.waitForSelector('[data-check]');
await page.click('[data-check=m_ucreq] [data-act=goNav]'); await page.waitForTimeout(500); ok((await page.textContent('h1')).includes('Use Cases'), 'a use-case finding links to Use Cases');
// the tab badge counts non-passing checks
await nav(page, 'checks'); ok(/Source checks\s*\d+/.test(await page.textContent('.tabs')), 'tab shows how many checks need attention');
// fix the errors -> they pass
await page.evaluate(async () => { const F = window.FWB, V = window.FWBViews; F.S.ws.requirements.find(r => r.id === 'WO-002').confirmedBy = 'Priya'; F.markDirty('workshop'); F.changed('Edited', 'fix'); await V.items.put('usecase', 'ucBad', { no: 2, title: 'Broken links', modules: ['workorder'], reqIds: ['WO-001'], questionIds: [], solution: 'Configuration', confirmation: 'Unconfirmed', impl: 'Documented' }); });
await page.click('[data-act=chkTab][data-v=sources]'); await page.waitForSelector('[data-check]'); await page.waitForTimeout(400); ok((await lvl('r_who')) === 'pass' && (await lvl('m_ucreq')) === 'pass' && (await lvl('m_ucconf')) === 'pass', 'after fixing the data the same checks pass');
done();
