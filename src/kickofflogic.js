/* Kick-off page rules (roadmap E15 Stage 1, E17): pure code, no page, no network; run by tests/kickoff_logic.mjs and used by src/kickoff.js.
   The pack (project document `kickoff_pack`, written by work/server/_kickoffpack.mjs) is a DRAFT until the project owner approves it. Change requests are the project document `kickoff_cr`:
   { items: [{ id, text, by, at, status: open | applied | dismissed }] }. Claude reads them through the job queue (apply_change); a person only writes the text. */
(function (root) {
  'use strict';
  const arr = x => (Array.isArray(x) ? x : []);
  const ORIGIN = { contract: 'From the contract', interpreted: 'Interpreted from the contract', assumed: 'Facilio assumption', confirmed: 'Confirmed by a person' };
  const PACK_STATUS = { draft: 'Draft, waiting for approval', approved: 'Approved', discarded: 'Discarded' };
  const JOB_STATUS = { waiting: 'Waiting for Claude', claimed: 'Claude is working on it', needs_input: 'Claude needs your answer', done: 'Done', failed: 'Failed', cancelled: 'Cancelled' };
  const MAX_TEXT = 600, MAX_ITEMS = 100;
  const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const originLabel = o => ORIGIN[o] || ORIGIN.assumed;

  /** the stored pack as the page reads it; null when there is none (a document nobody has written reads as {} or null) */
  function packOf(d) {
    if (!d || typeof d !== 'object' || !d.plan || !d.deck) return null;
    const st = ['draft', 'approved', 'discarded'].includes(d.status) ? d.status : 'draft', p = d.plan;
    const mods = [...new Set(arr(p.milestones).flatMap(m => arr(m.deliverables)).map(x => /^Modules in scope:\s*(.+)$/.exec(String(x))).filter(Boolean).flatMap(m => m[1].split(/,\s*/)))];
    return { status: st, statusLabel: PACK_STATUS[st], builtAt: d.builtAt || '', approvedBy: d.approvedBy || '', approvedAt: d.approvedAt || '', transferId: d.from && d.from.transferId || '', window: p.window || {}, deck: d.deck,
      milestones: arr(p.milestones).map(m => ({ id: m.id, name: m.name, start: m.start, end: m.end, origin: m.origin, label: originLabel(m.origin), responsible: m.responsible || '' })),
      rows: arr(d.rows), assumptions: arr(p.assumptions), gaps: arr(p.gaps), conflicts: arr(p.conflicts).map(c => (c && c.message) || String(c)), scope: arr(d.deck.scope), modules: mods };
  }

  const itemsOf = d => arr(d && d.items).filter(x => x && x.id && x.text).map(x => ({ id: String(x.id), text: clean(x.text, MAX_TEXT), by: x.by || '', at: x.at || '', status: ['open', 'applied', 'dismissed'].includes(x.status) ? x.status : 'open' }));
  const openCount = d => itemsOf(d).filter(x => x.status === 'open').length;

  /** a new change request; returns { ok, doc, item } or { ok:false, error }. The document is copied, never changed. */
  function addChange(d, text, by, now) {
    const t = clean(text, MAX_TEXT); if (!t) return { ok: false, error: 'Write the change you want.' };
    const items = itemsOf(d); if (items.length >= MAX_ITEMS) return { ok: false, error: 'There are ' + MAX_ITEMS + ' change requests already; dismiss the old ones first.' };
    if (items.some(x => x.status === 'open' && x.text === t)) return { ok: false, error: 'The same change request is already open.' };
    const item = { id: 'cr_' + (Math.max(0, ...items.map(x => parseInt(String(x.id).slice(3), 10) || 0)) + 1), text: t, by: clean(by, 120), at: now, status: 'open' };
    return { ok: true, item, doc: { items: items.concat(item) } };
  }
  const dismissChange = (d, id) => ({ items: itemsOf(d).map(x => x.id === id && x.status === 'open' ? Object.assign({}, x, { status: 'dismissed' }) : x) });

  /** can this person approve now? Only the project owner; never while change requests are open (Claude has not applied them) or there is no pack. */
  function approvalCheck(pack, isOwner, crDoc) {
    if (!pack) return { ok: false, why: 'There is no kick-off pack yet.' };
    if (pack.status === 'approved') return { ok: false, why: 'Already approved' + (pack.approvedBy ? ' by ' + pack.approvedBy : '') + '.' };
    if (pack.status === 'discarded') return { ok: false, why: 'This draft was discarded.' };
    if (!isOwner) return { ok: false, why: 'Only the project owner or an admin can approve.' };
    const n = openCount(crDoc); if (n) return { ok: false, why: n + ' change request' + (n === 1 ? ' is' : 's are') + ' still open. Wait until Claude has applied them, or dismiss them.' };
    return { ok: true, why: '' };
  }
  /** the stored pack with the new status; the plan and deck are untouched */
  const setStatus = (stored, status, by, now) => Object.assign({}, stored, { status }, status === 'approved' ? { approvedBy: clean(by, 120), approvedAt: now } : { approvedBy: '', approvedAt: '' });

  /** the job list as the page shows it, with the questions of a job that waits for an answer */
  const jobRows = jobs => arr(jobs).map(j => ({ id: j.id, kind: j.kind, label: j.label || j.kind, status: j.status, statusLabel: JOB_STATUS[j.status] || j.status, at: j.requestedAt || '', by: j.requestedBy || '',
    claimedAt: j.claimedAt || '', progress: j.progress && j.progress.text || '', summary: j.result && j.result.summary || '', transferId: j.result && j.result.transferId || '', questions: j.status === 'needs_input' ? arr(j.result && j.result.questions) : [], open: ['waiting', 'claimed', 'needs_input'].includes(j.status) }));
  const pullRequest = (customer, project, file) => ({ kind: 'pull_msa', note: clean([customer, project].filter(Boolean).join(' / ') + (file ? ' / uploaded file: ' + file : ''), 300) });
  const changeRequest = () => ({ kind: 'apply_change', section: 'kickoff_cr' });
  /** which step the person is on, for the strip at the top */
  function stage(hasMsa, pack, jobs) {
    if (pack) return pack.status === 'approved' ? 'approved' : 'review';
    if (jobRows(jobs).some(j => j.open && j.kind === 'pull_msa')) return 'pulling';
    return hasMsa ? 'extract' : 'start';
  }
  const api = { originLabel, packOf, itemsOf, openCount, addChange, dismissChange, approvalCheck, setStatus, jobRows, pullRequest, changeRequest, stage, ORIGIN, PACK_STATUS, JOB_STATUS, MAX_TEXT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBKickoffLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
