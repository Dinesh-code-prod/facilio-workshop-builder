// The BRD draft carries what the requirement sessions captured (9 Nov 2026): open questions from the Questions tab, the questions answered with the client's response, and the decisions,
// assumptions, dependencies and actions of the saved call summaries; Checks & validations lists the unanswered Must questions. Data goes in as the two project documents, the BRD is built by the real builder.
// Usage: node tests/ui/brd-sessions-check.mjs [baseUrl]   (set PLAYWRIGHT_BROWSERS_PATH if the browser is not in the default place)
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:4173';
const b = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined }); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); const res = []; const check = (n, ok, d) => { res.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); };
await p.goto(BASE + '/?nointro'); await p.waitForSelector('[data-act]');
const pid = await p.evaluate(async () => (await (await fetch('/api/fn/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'BRD sessions', customer: 'Acme' }) })).json()).project.id);
const putDoc = (name, data) => p.evaluate(async ({ pid, name, data }) => { const g = await (await fetch(`/api/fn/api/projects/${pid}/docs/${name}`, { headers: { 'x-requested-with': 'fwb' } })).json().catch(() => ({})); const r = await fetch(`/api/fn/api/projects/${pid}/docs/${name}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-requested-with': 'fwb' }, body: JSON.stringify({ data, baseVersion: g && g.version != null ? g.version : -1 }) }); return r.status; }, { pid, name, data });
const s1 = await putDoc('rs_questions', { items: [
  { id: 'q1', text: 'Who approves a work order above 500?', category: 'workflow', priority: 'must', state: 'kept', order: 1 }, { id: 'q2', text: 'Which SLA applies to critical requests?', category: 'sla', priority: 'must', state: 'kept', order: 2 }, { id: 'q3', text: 'Is the data migrated from Excel?', category: 'data', priority: 'should', state: 'kept', order: 3 }],
  summaries: [{ at: '2026-11-06T10:00:00.000Z', decisions: ['Approvals above 500 need two levels.'], assumptions: ['Assets are loaded before go-live.'], dependencies: ['The customer supplies the asset list.'], actions: [{ text: 'Send the asset template', owner: 'Dinesh' }] }] });
const s2 = await putDoc('workshop_room', { q: { q1: { status: 'answered', note: 'Supervisor, then the site manager.', made: {} }, q2: { status: 'asked' }, q3: { status: 'answered', note: 'Yes, two Excel files.', made: { requirement: 'r1' } } } });
const s3 = await putDoc('solutions', { items: { 'area:integrations': { text: 'Integrate with the customer ERP every night.', status: 'Draft' }, 'area:apps': { text: 'A tenant portal app is in scope.', status: 'Agreed' } } });
const s4 = await putDoc('workshop', { modules: { workorder: { inScope: true } } });
check('the sessions, the solution and a module in scope are stored as project documents', s1 === 200 && s2 === 200 && s3 === 200 && s4 === 200, s1 + ', ' + s2 + ', ' + s3 + ', ' + s4);
await p.goto(BASE + `/?nointro#/p/${pid}/brd`); await p.reload(); await p.waitForSelector('main.main', { state: 'attached' }); await p.waitForTimeout(2500);
const out = await p.evaluate(() => { const B = window.FWBBrd.buildBlocks(); const blocks = B.blocks || []; const heads = blocks.filter(x => x.t === 'h').map(x => x.text); const text = JSON.stringify(blocks); const v = window.FWBViews.validation ? window.FWBViews.validation() : []; const openRows = JSON.stringify(blocks.filter(x => x.t === 'table' && x.headers && x.headers[2] === 'Question / item to be confirmed').map(x => x.rows)); return { heads, text, openRows, sess: v.filter(x => x.area === 'Sessions').map(x => x.item), sol: v.filter(x => x.area === 'Solution').map(x => x.item) }; });
const has = s => out.text.includes(s);
check('the BRD has a Decisions, Assumptions & Dependencies section', out.heads.some(h => /Decisions, Assumptions & Dependencies/.test(h)), out.heads.filter(h => /^\d+\./.test(h)).slice(-6).join(' | '));
check('a decision, an assumption, a dependency and an action reach it', ['Approvals above 500 need two levels.', 'Assets are loaded before go-live.', 'The customer supplies the asset list.', 'Send the asset template'].every(has));
check('the unanswered Must question is in Open Questions & Items to Be Confirmed, marked Must', out.openRows.includes('Which SLA applies to critical requests?') && out.openRows.includes('must be confirmed in the sessions'));
check('the answered questions are listed with the client response', out.heads.some(h => /Answered in the Requirement Sessions/.test(h)) && has('Supervisor, then the site manager.') && has('Yes, two Excel files.'));
check('an answered question is not also listed as open', !out.openRows.includes('Who approves a work order above 500?'));
check('Checks & validations shows the unanswered Must question and the answer without a requirement', out.sess.some(x => /must-ask question/.test(x)) && out.sess.some(x => /without a requirement/.test(x)), out.sess.join(' | '));
const drafts = out.text.split('draft, not yet agreed with the customer.').length - 1;
check('a Draft solution is written into the BRD marked as draft, an Agreed one is not', has('Integrate with the customer ERP every night.') && has('A tenant portal app is in scope.') && drafts === 1, drafts + ' draft marks');
check('Checks & validations says how many solution areas are still Draft', out.sol.some(x => /1 solution area is still Draft/.test(x)), out.sol.join(' | '));
// Draft with AI on the module heading of the BRD (the AI answer is stubbed): the draft is shown for review, nothing changes until it is accepted, then the BRD carries it
const reqs = []; await p.route('**/solution/draft', r => { reqs.push(r.request().postData()); r.fulfill({ contentType: 'application/json', body: JSON.stringify({ proposals: [{ kind: 'solution', module: 'module:workorder', name: 'Work Order', text: 'Work orders above 500 need two approval levels.', rows: [{ cells: { topic: 'Approvals', solution: 'Supervisor, then the site manager', who: 'Supervisor, site manager', reqs: 'WO-001' }, status: 'Agreed' }, { cells: { topic: 'Statuses', solution: 'To be confirmed' }, status: 'Open question' }], why: 'The client answered who approves.' }], area: 'module:workorder', provider: 'test', truncated: false }) }); });
const btn = p.locator('button.blk-draft[data-key="module:workorder"]'); check('the module heading of the BRD has a Draft with AI button', (await btn.count()) >= 1, (await btn.count()) + ' found');
if (await btn.count()) {
  await btn.first().click(); await p.waitForSelector('[data-act="brdDraftAccept"]', { timeout: 8000 }).catch(() => { });
  check('the AI was asked for exactly this area', reqs.length === 1 && JSON.parse(reqs[0]).key === 'module:workorder', reqs[0]);
  const shown = await p.evaluate(() => (document.getElementById('drawer') || {}).innerText || ''); check('the draft is shown for review (overview, rows, an Open question row, Accept)', /two approval levels/.test(shown) && /Supervisor, then the site manager/.test(shown) && /Open question/.test(shown) && /Accept into the BRD/.test(shown));
  const before = await p.evaluate(() => JSON.stringify(window.FWB.doc('solutions').items || {})); check('nothing is in the solution before it is accepted', !/two approval levels/.test(before));
  await p.click('[data-act="brdDraftAccept"]'); await p.waitForTimeout(1500);
  const after = await p.evaluate(() => { const t = JSON.stringify(window.FWBBrd.buildBlocks().blocks); return { sol: JSON.stringify(window.FWB.doc('solutions').items || {}), brd: t }; });
  check('after Accept the solution holds the draft and the BRD carries it', /two approval levels/.test(after.sol) && /two approval levels/.test(after.brd) && /Supervisor, then the site manager/.test(after.brd));
}
const onb = await p.evaluate(() => { window.FWBViews.onboardingSheetsFor = n => (n === 'workorder' ? ['Work Order Types'] : []); const bl = window.FWBBrd.buildBlocks().blocks; return { head: bl.filter(x => x.t === 'h').map(x => x.text).filter(h => /Data Migration/.test(h)), tbl: JSON.stringify(bl.filter(x => x.t === 'table' && x.headers && x.headers[1] === 'Data sheet').map(x => x.rows)) }; });
check('the BRD lists the data each module needs from the customer, with its status', onb.head.length === 1 && /Work Order Types/.test(onb.tbl) && /Not started/.test(onb.tbl), onb.head.join(' | ') + ' ' + onb.tbl);
check('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
console.log(res.filter(Boolean).length + '/' + res.length + ' checks passed'); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
