// Regenerate schedule with diff: approved schedule untouched, added/removed/modified/unchanged shown, conflicts flagged, apply after confirmation.
import { setup } from './lib.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const { page, ok, nav, done } = await setup(BASE);
await page.evaluate(() => { const F = window.FWB; const d = F.doc('planner'); ['workorder', 'asset', 'inventoryrequest'].forEach(m => { F.wsMod(m).inScope = true; });
  d.sessions = [{ id: 's1', no: 1, title: 'Work orders', date: '2026-11-02', start: '10:00', minutes: 120, modules: ['workorder'], status: 'planned' }, { id: 's2', no: 2, title: 'Assets and requests', date: '2026-11-03', start: '10:00', minutes: 120, modules: ['asset', 'inventoryrequest'], status: 'planned' }, { id: 's3', no: 3, title: 'Material requests', date: '2026-11-04', start: '10:00', minutes: 120, modules: ['inventoryrequest'], status: 'planned' }, { id: 's4', no: 4, title: 'Wrap up', date: '2026-11-05', start: '10:00', minutes: 120, modules: ['workorder'], status: 'completed' }];
  F.markDirty('planner'); F.markDirty('workshop'); });
await nav(page, 'planner'); await page.evaluate(() => window.FWBViews.mfOpenPlTab('changes')); await page.waitForSelector('#spGenerate');
// publish the approved schedule
await page.click('[data-act=publishSchedule]'); await page.waitForSelector('.dialog'); await page.click('.dialog [data-r="1"]'); await page.waitForTimeout(600);
const pubBefore = await page.evaluate(() => JSON.stringify(window.FWB.doc('schedule_published')));
// scope changes after approval: Site and Quote come in scope, Inventory Request leaves; plus manual edits after approval
await page.evaluate(() => { const F = window.FWB; ['site', 'quote'].forEach(m => { F.wsMod(m).inScope = true; }); F.wsMod('inventoryrequest').inScope = false; const d = F.doc('planner'); d.sessions.find(s => s.id === 's1').date = '2026-11-09'; d.sessions.find(s => s.id === 's2').modules = ['asset', 'inventoryrequest', 'workorder']; F.markDirty('planner'); F.markDirty('workshop'); window.FWBViews.render(); });
await page.waitForSelector('#spGenerate'); await page.click('#spGenerate'); await page.waitForSelector('#spTable');
const rows = await page.$$eval('#spTable tbody tr', trs => trs.map(t => ({ kind: t.getAttribute('data-row'), conf: t.classList.contains('conf'), txt: t.textContent.replace(/\s+/g, ' ') })));
console.log('  rows:', rows.map(r => r.kind + (r.conf ? '!' : '') + ':' + r.txt.slice(0, 200)).join('\n'));
ok(rows.filter(r => r.kind === 'added').length >= 2, 'new sessions are proposed for the modules that came into scope'); ok(rows.some(r => r.kind === 'added' && /Site/i.test(r.txt)) && rows.some(r => r.kind === 'added' && /Quote/i.test(r.txt)), 'one for Site (portfolio) and one for Quote (operations)');
const addedRows = rows.filter(r => r.kind === 'added'); ok(addedRows.every(r => /\d{4}-\d{2}-\d{2}/.test(r.txt)) && addedRows.every(r => !/2026-11-0[2-5]/.test(r.txt.split('S')[0])) , 'proposed dates are new working days, not on existing session dates');
ok(rows.some(r => r.kind === 'added' && /Quote/i.test(r.txt) && /depends|S\d/.test(r.txt)) , 'dependencies are shown (the Quote session depends on earlier tiers)');
ok(rows.some(r => r.kind === 'removed' && /Material requests/.test(r.txt)), 'a session whose only module left scope is proposed for removal');
ok(rows.some(r => r.kind === 'modified' && /Assets and requests/.test(r.txt) && r.conf && /Conflict/.test(r.txt)), 'a session whose modules were edited by hand after approval is flagged as a conflict');
ok(rows.some(r => r.kind === 'modified' && /Work orders/.test(r.txt) && /Manual edit kept/.test(r.txt) && /2026-11-02 → 2026-11-09/.test(r.txt)), 'the manual date change shows old → new and is marked "Manual edit kept"');
ok(rows.some(r => /Wrap up/.test(r.txt) && !/modules [+−]/.test(r.txt)) && (await page.$$eval('#spTable tbody tr', t => t.filter(x => /Wrap up/.test(x.textContent)).every(x => !x.querySelector('input:checked')))), 'the completed session keeps its modules and is not selected');
ok(!(await page.isChecked('#spTable tr.conf input[type=checkbox]')), 'conflicts are not selected by default');
ok((await page.evaluate(() => JSON.stringify(window.FWB.doc('schedule_published')))) === pubBefore, 'generating a proposal does not touch the approved (published) schedule');
ok((await page.evaluate(() => window.FWB.doc('planner').sessions.length)) === 4, 'nor the planner');
// apply selected after confirmation (conflict stays out)
await page.click('#spApply'); await page.waitForSelector('.dialog'); ok(/conflict/i.test(await page.textContent('.dialog')) === false && /added/.test(await page.textContent('.dialog')), 'confirmation lists what will change'); await page.click('.dialog [data-r="0"]'); ok((await page.evaluate(() => window.FWB.doc('planner').sessions.length)) === 4, 'cancelling the confirmation applies nothing');
await page.click('#spApply'); await page.waitForSelector('.dialog'); await page.click('.dialog [data-r="1"]'); await page.waitForTimeout(500);
const after = await page.evaluate(() => window.FWB.doc('planner').sessions.map(s => [s.id, s.status, s.modules.join('+'), s.date]));
ok(after.length >= 6 && after.some(a => /site/.test(a[2])) && after.some(a => /quote/.test(a[2])), 'added sessions are in the planner'); ok(after.find(a => a[0] === 's3')[1] === 'cancelled', 'the removed session is cancelled, not deleted'); ok(after.find(a => a[0] === 's2')[2] === 'asset+inventoryrequest+workorder', 'the conflicting session kept its manual modules'); ok(after.find(a => a[0] === 's1')[3] === '2026-11-09', 'manual date edit preserved');
ok((await page.evaluate(() => JSON.stringify(window.FWB.doc('schedule_published')))) === pubBefore, 'applying still leaves the published schedule alone until it is published again');
ok(await page.evaluate(() => (window.FWB.doc('planner').scheduleChanges || []).length === 1), 'the application is recorded');
done();
