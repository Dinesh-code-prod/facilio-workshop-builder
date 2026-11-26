// Shot list for the Plan timeline re-planning film (public/films/plan-replan.js): the timeline, a date changed in the grid, the "Why?" bar, the reason log
// and the Export menu, on the demo project's plan. Run with tools/film-capture.mjs plan-replan (on a copy of the local data: it moves a date).
const TASK = 'UAT with the customer';
// the Timeline & planning tab, with every column shown (Options > Show all columns) so the dates can be edited in the grid
const view = 'timeline', tab = async (p, h) => { const t = await p.$('[data-act="planTab"]:has-text("Timeline & planning")'); if (t) { await t.click(); await h.settle(1500); } await p.evaluate(() => { FWB.S.ui.tlCompact = false; FWBViews.render(); }); await h.settle(1200); };
export default { id: 'plan-replan', quality: 38, shots: [
  { key: 'plan', view, prep: async (p, h) => { await tab(p, h); await p.evaluate(() => { FWB.S.ui.tlCompact = true; FWBViews.render(); }); await h.settle(1200); }, top: [['text', 'Workbook', '.main'], 20], pos: { kpis: ['text', 'Planned by today', '.main'], undo: '[data-act="tlUndo"]', scale: '[data-act="tlScale"]', today: '[data-act="tlToday"]', export: ['text', 'Export', '.main'] } },
  { key: 'grid', view, prep: tab, top: [`.pl-in[data-f="end"][aria-label="End of ${TASK}"]`, 330], pos: { end: `.pl-in[data-f="end"][aria-label="End of ${TASK}"]`, row: ['text', TASK, '.pl-grid'], head: '.pl-grid thead' } },
  { key: 'why', view, prep: async (p, h) => { await tab(p, h);
      await p.evaluate(task => { const i = document.querySelector(`.pl-in[data-f="end"][aria-label="End of ${task}"]`); if (!i) return; const d = new Date(i.value); d.setDate(d.getDate() + 7); i.value = d.toISOString().slice(0, 10); i.dispatchEvent(new Event('change', { bubbles: true })); }, TASK); await h.settle(1500); },
    top: ['.pl-why', 160], pos: { why: '.pl-why', reason: '#tl_why', save: '[data-act="tlWhySave"]', undo: '[data-act="tlUndo"]' } },
  { key: 'log', view, prep: async (p, h) => { await tab(p, h);
      if (await p.$('#tl_why')) { await p.selectOption('#tl_why', 'Customer delay'); const n = await p.$('#tl_whyn'); if (n) await n.fill('Asset list arrives a week late'); await p.click('[data-act="tlWhySave"]'); await h.settle(1200); }
      await p.evaluate(() => { const d = document.querySelector('details.pl-more'); if (d) d.open = true; }); await h.settle(600); },
    top: ['details.pl-more', 120], pos: { log: 'details.pl-more' } },
  { key: 'export', view, prep: async (p, h) => { await tab(p, h); await p.evaluate(() => { const m = document.querySelector('details.pl-exp'); if (m) m.open = true; }); await h.settle(800); },
    top: ['details.pl-exp', 300], pos: { xlsx: '[data-act="tlXlsx"]', html: '[data-act="tlHtml"]', baseline: '[data-act="tlBaseSet"]' } }] };
