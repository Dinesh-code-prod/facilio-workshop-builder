/* Change tracks, the pure rules (plan: docs/plans/CR-AFTER-GOLIVE-2026-11-23.md; run by tests/cr_track.mjs, used by src/crtrack.js).
   A new contract after the kick-off is approved (a CR MSA, an integration MSA, an amendment, a renewal) gets its own track on its change request (record cr):
   Claude reads the new document(s) and saves a delta (pull transfer kind cr_delta, scope = the CR record id); once the project owner approves it,
   setup() turns it into scope lines, requirement sessions, a plan phase and a BRD addendum, all tagged with the CR number. The approved kick-off, the existing plan rows,
   sessions and BRDs are never changed, and setup() only adds what is not there yet, so running it again is safe. */
(function (root) {
  'use strict';
  const KIND = 'cr_delta';
  const arr = v => (Array.isArray(v) ? v : []);
  const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const crNo = c => 'CR-' + String((c && c.n) || 0).padStart(3, '0');
  const DAY = 864e5, ms = s => Date.parse(s + 'T00:00:00Z'), iso = t => new Date(t).toISOString().slice(0, 10);
  /** the next weekday on or after the date (Saturday and Sunday skipped) */
  const workday = s => { let t = ms(s); while ([0, 6].includes(new Date(t).getUTCDay())) t += DAY; return iso(t); };
  const plus = (s, n) => iso(ms(s) + n * DAY);

  /** the delta Claude saved (JSON text) -> { title, documents, added, changed, removed, modules, start, end, conflicts } or { error } */
  function parseDelta(text) {
    let d; try { d = JSON.parse(String(text || '')); } catch (e) { return { error: 'The change reading is not valid JSON.' }; }
    if (!d || typeof d !== 'object' || Array.isArray(d)) return { error: 'The change reading must be one object.' };
    const item = x => (x && typeof x === 'object' ? { text: clean(x.text, 600), module: clean(x.module, 80), was: clean(x.was, 600), doc: clean(x.document || x.doc, 160), page: Number(x.page) > 0 ? Math.floor(Number(x.page)) : null, quote: clean(x.quote, 300) } : null);
    const list = k => arr(d[k]).map(item).filter(x => x && x.text).slice(0, 200);
    const out = { title: clean(d.title, 160), documents: arr(d.documents).map(x => clean(typeof x === 'string' ? x : x && (x.name || x.label), 200)).filter(Boolean).slice(0, 20),
      added: list('added'), changed: list('changed'), removed: list('removed'), start: ISO.test(d.start) ? d.start : '', end: ISO.test(d.end) ? d.end : '',
      conflicts: arr(d.conflicts).map(x => clean(typeof x === 'string' ? x : x && x.text, 400)).filter(Boolean).slice(0, 50) };
    out.modules = [...new Set(arr(d.modules).map(m => clean(typeof m === 'string' ? m : m && m.name, 80)).concat(out.added.concat(out.changed).map(x => x.module)).filter(Boolean))];
    if (!out.added.length && !out.changed.length && !out.removed.length) return { error: 'The change reading lists nothing added, changed or removed.' };
    return out;
  }

  /** what approving the delta sets up. ctx: { cr, today 'YYYY-MM-DD', scope (planner.scope), sessions (planner.sessions), rows (plan_struct.rows), brds (brddoc.list),
      sessionPlan (FWBKickoffLogic.sessionPlan), uid (prefix -> id), modKey (module label -> module key, or '') } -> { no, scope, sessions, rows, brd, notes } (only what is new) */
  function setup(delta, ctx) {
    const c = ctx || {}, no = crNo(c.cr), uid = c.uid || (p => p + '_' + Math.random().toString(36).slice(2, 10)), notes = [];
    const key = (k, x) => no + ':' + k + ':' + x.module.toLowerCase() + ':' + x.text.toLowerCase().slice(0, 80);
    const had = new Set(arr(c.scope).filter(s => s && s.cr === no).map(s => s.crKey));
    const scope = [].concat(delta.added.map(x => ['added', x]), delta.changed.map(x => ['changed', x]), delta.removed.map(x => ['removed', x]))
      .map(([k, x]) => ({ id: uid('sc'), crKey: key(k, x), cr: no, text: (k === 'removed' ? 'Removed by ' + no + ': ' : k === 'changed' ? 'Changed by ' + no + ': ' : '') + x.text, module: x.module, status: k === 'removed' ? 'excluded' : 'matched', source: 'cr', page: x.page, section: x.doc, ctx: x.quote, confidence: 'high' }))
      .filter(s => !had.has(s.crKey));
    // the change starts on its contract start date, or the next working day from today when that date has passed or is not given
    const start = workday(delta.start && delta.start > c.today ? delta.start : plus(c.today, 1));
    const mods = [...new Set(delta.added.concat(delta.changed).map(x => x.module).filter(Boolean).concat(delta.modules.filter(m => !delta.removed.some(r => r.module === m))))];
    let sessions = [];
    if (arr(c.sessions).some(s => s && s.cr === no)) notes.push('The requirement sessions of ' + no + ' already exist, so none were added.');
    else if (!mods.length) notes.push('The change names no modules, so no requirement sessions were drafted. Add them in the Requirement Session Planner.');
    else if (c.sessionPlan) {
      const pack = { status: 'draft', plan: { milestones: [{ id: 'workshops', name: 'Requirement sessions', start, end: plus(start, 13), deliverables: ['Modules in scope: ' + mods.join(', ')] }] }, deck: { outOfScope: delta.removed.map(x => 'Removed: ' + x.text) } };
      const r = c.sessionPlan(pack); sessions = arr(r.sessions).map(s => Object.assign({ id: uid('ses'), mode: 'online', notes: '', prep: '', modules: [] }, s, { title: no + ' · ' + s.title, cr: no }));
    }
    let rows = [];
    if (arr(c.rows).some(r => r && r.cr === no)) notes.push('The plan already has the ' + no + ' phase, so no rows were added.');
    else {
      const t = clean(delta.title || (c.cr && c.cr.title) || 'Change', 120), phase = no + ': ' + t;
      const row = (title, a, b, ms2) => ({ id: uid('row'), title, phase, start: a, end: b, owner: '', status: 'Not started', pct: 0, ms: !!ms2, origin: 'cr', dep: [], isPhase: false, cr: no });
      const s1 = start, e1 = plus(s1, 13), s2 = workday(plus(e1, 1)), e2 = plus(s2, 9), s3 = workday(plus(e2, 1)), e3 = plus(s3, 20), s4 = workday(plus(e3, 1)), e4 = plus(s4, 9), live = workday(plus(e4, 1));
      rows = [Object.assign(row(phase, s1, live), { isPhase: true }), row('Requirement sessions for ' + no, s1, e1), row('BRD addendum and sign-off for ' + no, s2, e2), row('Configuration of ' + no, s3, e3), row('UAT of ' + no, s4, e4), row('Go-live of ' + no, live, live, true)];
      if (delta.end && delta.end < live) notes.push('The contract asks for ' + no + ' by ' + delta.end + ', but the standard steps end on ' + live + '. Shorten the steps in the plan.');
    }
    let brd = null; const keys = [...new Set(mods.map(m => (c.modKey ? c.modKey(m) : m)).filter(Boolean))];
    if (arr(c.brds).some(b => b && b.cr === no)) notes.push('The BRD addendum of ' + no + ' already exists.');
    else if (mods.length) { brd = { id: uid('brd'), name: no + ' addendum: ' + clean(delta.title || (c.cr && c.cr.title) || 'Change', 120), type: 'addendum', modules: keys, cr: no, system: '', direction: '', notes: 'Only the scope of ' + no + '. Modules: ' + mods.join(', ') + '.' }; if (keys.length < mods.length) notes.push('Some modules of the change are not in this project\'s module list; add them to the BRD addendum by hand.'); }
    if (delta.conflicts.length) notes.push(delta.conflicts.length + ' conflict' + (delta.conflicts.length === 1 ? '' : 's') + ' with the original contract: settle ' + (delta.conflicts.length === 1 ? 'it' : 'them') + ' before the BRD addendum is signed.');
    return { no, scope, sessions, rows, brd, notes };
  }

  /** where a change stands, worked out from what is linked to it. x: { delta (transfer row or null), sessions, brds, brdStatus (id -> status), utc } */
  function steps(cr, x) {
    const no = crNo(cr), o = x || {}, ses = arr(o.sessions).filter(s => s && s.cr === no), brd = arr(o.brds).find(b => b && b.cr === no), tc = arr(o.utc).filter(t => t && t.cr === no);
    const held = s => /^(held|done|completed|complete)$/i.test(String(s.status || ''));
    return [
      { key: 'read', label: 'New contract read', done: !!o.delta },
      { key: 'approved', label: 'Change approved', done: !!(o.delta && o.delta.approvedVer) },
      { key: 'setup', label: 'Sessions, plan and BRD addendum set up', done: !!(cr && cr.setupAt) },
      { key: 'sessions', label: 'Requirement sessions held', done: ses.length > 0 && ses.every(held) },
      { key: 'brd', label: 'BRD addendum approved', done: !!brd && (o.brdStatus || {})[brd.id] === 'approved' },
      { key: 'uat', label: 'UAT passed', done: tc.length > 0 && tc.every(t => ['Passed', 'Approved'].includes(t.status)) },
      { key: 'live', label: 'Live', done: !!cr && cr.status === 'Delivered' }
    ];
  }

  /** the chat words that mean "read the new contract"; kickoffApproved picks the job */
  function chatJob(raw, kickoffApproved) {
    const t = String(raw || '').toLowerCase();
    if (!/\b(pull|get|fetch|bring|read|import|find|load)\b/.test(t) || !/\b(msa|contract|amendment|addendum|change request|cr|sow|order form|service order|renewal)\b/.test(t)) return null;
    return kickoffApproved ? { type: 'job', job: { kind: 'pull_cr', note: String(raw).slice(0, 500) }, label: 'Read the new contract and start a change track' }
      : { type: 'job', job: { kind: 'pull_msa', note: String(raw).slice(0, 500) }, label: 'Read the contract and draft the kick-off' };
  }

  const api = { KIND, crNo, parseDelta, setup, steps, chatJob, workday };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBCrTrack = api;
})(typeof window !== 'undefined' ? window : globalThis);
