// BRD editor: edit, save, reload/reopen, regenerate after the source data changes — edits are kept and flagged stale, never silently overwritten.
import { setup } from './lib.mjs';

const BASE = process.argv[2] || 'http://127.0.0.1:8899/'; const { page, ok, nav, done } = await setup(BASE);
const paper = () => page.$$eval('.paper', e => e.map(x => x.textContent).join(' '));
await page.evaluate(() => { window.FWB.S.ws.project.client = 'Acme Estates'; window.FWB.markDirty('workshop'); });
await nav(page, 'brd'); await page.waitForSelector('.paper'); await page.waitForTimeout(800);
const sel = '.paper p[data-blk]:has-text("This document records the business requirements")'; await page.waitForSelector(sel); const key = await page.$eval(sel, e => e.getAttribute('data-blk'));
const span = await page.$(`${sel} [data-txt]`) || await page.$(sel); await span.click(); await page.keyboard.press('End'); await page.keyboard.type(' [Agreed with the PMO on 12 Nov.]'); await page.click('.ribbon'); await page.waitForTimeout(1800);
const ed = await page.evaluate(k => window.FWB.doc('brddoc').edits[k] || Object.entries(window.FWB.doc('brddoc').edits).find(([x]) => x.startsWith(k))?.[1], key); ok(ed && /Agreed with the PMO/.test(ed.text) && ed.base, 'edit is stored with the generated text it was based on');
await page.evaluate(() => window.FWB.flush()); await page.waitForTimeout(1200);
await page.reload(); await page.waitForSelector('.shell'); await nav(page, 'brd'); await page.waitForSelector('.paper'); await page.waitForTimeout(800);
ok(/Agreed with the PMO on 12 Nov/.test(await paper()), 'the edit is still there after reloading and reopening the BRD');
// regeneration: the customer name changes in the project data, so the generated sentence changes
await page.evaluate(() => { window.FWB.S.ws.project.client = 'Acme Estates Holdings'; window.FWB.changed('Edited', 'client name'); window.FWBViews.render(); }); await page.waitForTimeout(800);
const txt = await paper(); ok(/Agreed with the PMO on 12 Nov/.test(txt), 'regeneration did not overwrite the hand edit'); ok(!/Acme Estates Holdings during the requirement workshops/.test(txt), 'the edited paragraph still shows the edited wording, not the regenerated one');
ok((await page.$$('.paper .stale')).length >= 1 && /stale|changed/i.test(await page.textContent('.ribbon, .notice').catch(() => '')) || (await page.$$('.paper .stale')).length >= 1, 'the paragraph is marked as stale so the reviewer sees the source moved on');
// revert brings back the regenerated text
await page.click(`.paper p.stale [data-act=brdBlockMenu], .paper [data-blk="${key}"] ~ .blk-tools [data-act=brdBlockMenu], [data-act=brdBlockMenu][data-id="${key}"]`).catch(async () => { await page.evaluate(k => window.FWBViews.ACT.brdBlockMenu({ getAttribute: () => k }), key); }); await page.waitForSelector('#drawer [data-act=brdRevert]'); await page.click('#drawer [data-act=brdRevert]'); await page.waitForTimeout(600);
ok(/Acme Estates Holdings during the requirement workshops/.test(await paper()) && !/Agreed with the PMO/.test(await paper()), 'reverting an edit returns the regenerated text');
done();
