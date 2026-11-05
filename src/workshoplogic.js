/* Workshop room logic (roadmap E2 workspace 3): pure code for the browser and for Node, run by tests/workshop_logic.mjs. No DOM, no network, no model.
   It turns the prepared questions (work/server/_sessionquestions.mjs) plus the person's own status and notes into one list, merges what liveAsk found in a pasted transcript
   (only ever 'possible' or 'likely', never certain, and it never changes a status: a person does), and builds the DRAFT records for the quick-capture buttons.
   Rule: a spoken statement never becomes an approved requirement. Every record made here is unapproved (requirement Draft + classification confirm, decision Proposed,
   open question open, action Open) and carries its source: the prepared question, and when there is evidence the speaker, the time and the quoted words. Nothing is invented. */
(function (root) {
  'use strict';
  const STATUSES = ['toask', 'asked', 'answered', 'skipped'];
  const LABEL = { toask: 'To ask', asked: 'Asked', answered: 'Answered', skipped: 'Skipped' };
  const KINDS = ['requirement', 'decision', 'action', 'question'];
  const own = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
  const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const arr = v => (Array.isArray(v) ? v : []);
  const str = (v, n) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').replace(/\s+/g, ' ').trim().slice(0, n || 600);
  const multi = (v, n) => (typeof v === 'string' ? v : '').replace(/\r\n?/g, '\n').slice(0, n || 2000);   // a note keeps its line breaks
  const fmtAt = at => { if (typeof at !== 'number') return typeof at === 'string' ? at.slice(0, 40) : ''; const t = Math.floor(at); const p = n => String(n).padStart(2, '0'); return Math.floor(t / 3600) + ':' + p(Math.floor(t % 3600 / 60)) + ':' + p(t % 60); };

  /** the notes document: { q: { [questionId]: { status, note, evidence, made, at, by } } } */
  const notesOf = doc => { const d = obj(doc); if (!own(d, 'q') || !d.q || typeof d.q !== 'object' || Array.isArray(d.q)) d.q = {}; return d; };
  const entry = (notes, id) => (own(notes.q, id) && notes.q[id] && typeof notes.q[id] === 'object' ? notes.q[id] : null);

  /** a safe copy of liveAsk evidence: { speaker, at, quote, confidence } or null */
  function cleanEvidence(ev, confidence) {
    ev = obj(ev); const quote = str(ev.quote, 240); if (!quote) return null;
    return { speaker: str(ev.speaker, 80), at: fmtAt(ev.at), quote, confidence: confidence === 'likely' ? 'likely' : 'possible' };
  }

  /** the flat question list: prepared questions + the person's status and note + what the live check found (live: id -> { confidence, evidence }) */
  function questionList(prepared, notes, live) {
    const n = notesOf(notes); const lv = obj(live); const out = [];
    arr(obj(prepared).byModule).forEach(g => { g = obj(g); arr(g.questions).forEach(q => { q = obj(q); const id = str(q.id, 80); if (!id) return;
      const e = entry(n, id) || {}; const l = own(lv, id) ? lv[id] : null;
      out.push({ id, module: str(g.module, 120), moduleLabel: str(g.label || g.module, 160) || 'General', text: str(q.text, 600), why: str(q.why, 600), priority: str(q.priority, 20), kind: str(q.kind, 40),
        sources: arr(q.sources).slice(0, 6).map(s => ({ type: str(obj(s).type, 40), ref: str(obj(s).ref, 160), quote: str(obj(s).quote, 240) })),
        status: STATUSES.includes(e.status) ? e.status : 'toask', note: multi(e.note), evidence: e.evidence ? cleanEvidence(e.evidence, obj(e.evidence).confidence) : null, made: obj(e.made),
        live: l ? cleanEvidence(l.evidence, l.confidence) : null }); }); });
    return out;
  }

  /** liveAsk's answer as { byId, next }: byId has only 'possible' and 'likely' (nothing is ever certain); next is at most 3 questions still to ask, with the reason */
  function mergeLive(list, result) {
    const r = obj(result); const byId = {}; const ids = new Set(arr(list).map(q => q.id));
    arr(r.answered).forEach(a => { a = obj(a); if (ids.has(a.id) && (a.confidence === 'likely' || a.confidence === 'possible')) byId[a.id] = { confidence: a.confidence, evidence: a.evidence }; });
    const open = new Set(arr(list).filter(q => q.status === 'toask').map(q => q.id));
    const next = arr(r.nextSuggested).filter(x => ids.has(obj(x).id) && open.has(x.id) && !byId[x.id]).slice(0, 3).map(x => ({ id: x.id, why: str(x.why, 300) }));
    return { byId, next };
  }

  const counts = list => { const c = { total: 0, toask: 0, asked: 0, answered: 0, skipped: 0, possible: 0, likely: 0 }; arr(list).forEach(q => { c.total++; c[q.status]++; if (q.live) c[q.live.confidence]++; }); return c; };

  /** a change to one question's notes (status, note, evidence, made); anything else is ignored. Returns the entry. */
  function setNote(doc, id, patch, by, now) {
    const n = notesOf(doc); id = str(id, 80); if (!id || id === '__proto__') return null;
    const e = entry(n, id) || (n.q[id] = {}); const p = obj(patch);
    if (own(p, 'status') && STATUSES.includes(p.status)) e.status = p.status;
    if (own(p, 'note')) e.note = multi(p.note);
    if (own(p, 'evidence')) e.evidence = p.evidence ? cleanEvidence(p.evidence, obj(p.evidence).confidence) : null;
    if (own(p, 'made') && KINDS.includes(p.made && p.made.kind)) { e.made = Object.assign({}, obj(e.made)); e.made[p.made.kind] = str(p.made.id, 80); }
    e.at = str(now, 40); e.by = str(by, 120); return e;
  }
  /** what to write in the note when a person accepts a suggested answer */
  const evidenceLine = ev => (ev ? 'Said' + (ev.speaker ? ' by ' + ev.speaker : '') + (ev.at ? ' (' + ev.at + ')' : '') + ': "' + ev.quote + '"' : '');

  // ---------- the draft records ----------
  const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  /** the words a record is written from: the person's note, else the quoted words, else the question itself. `basis` says which, so nobody mistakes a question for a statement. */
  function basisOf(q) { const note = str(q.note, 1000); if (note) return { text: note, basis: 'note' }; if (q.live && q.live.quote) return { text: q.live.quote, basis: 'quote' }; return { text: str(q.text, 600), basis: 'question' }; }
  /** the source kept on a record: the question and what it rests on, and the speaker, time and quote when there is evidence */
  function sourceOf(q, ctx) {
    const c = obj(ctx); const b = basisOf(q); const ev = q.live || null; const s = { workshopRoom: true, basis: b.basis, question: { id: q.id, text: str(q.text, 300), why: str(q.why, 300), kind: q.kind, priority: q.priority, sources: arr(q.sources).filter(x => x.type !== 'statement').slice(0, 4).map(x => ({ type: x.type, ref: x.ref })) }, by: str(c.by, 120), at: str(c.now, 40) };
    if (ev) { s.transcript = str(c.transcript, 160) || 'Workshop room live transcript'; s.speaker = ev.speaker; s.timestamp = ev.at; s.quote = ev.quote; s.confidence = ev.confidence; }
    return s;
  }
  const sourceText = (q, src) => 'Workshop room, question "' + cut(str(q.text, 160), 120) + '"' + (src.quote ? '; ' + (src.speaker || 'speaker not named') + (src.timestamp ? ' at ' + src.timestamp : '') + ': "' + cut(src.quote, 160) + '" (' + src.confidence + ' match, not confirmed)' : '');

  /** one draft record for the quick-capture buttons. kind: requirement | decision | action | question. ctx: { id, now, today, by, sessionId, transcript }.
      Returns { store, record } (store: 'requirement' in S.ws.requirements, 'decision' or 'action' as project records, 'question' in S.ws.questions) or null. */
  function draftRecord(kind, q, ctx) {
    q = obj(q); const c = obj(ctx); if (!KINDS.includes(kind) || !str(q.id, 80) || !str(c.id, 80)) return null;
    const src = sourceOf(q, c); const b = basisOf(q); const now = str(c.now, 40); const mods = q.module ? [q.module] : [];
    if (kind === 'requirement') return { store: 'requirement', record: { id: c.id, created: now, title: cut(b.text, 120), objective: b.text, modules: mods, classification: 'confirm', status: 'Draft', fields: [], transitions: [], sessionId: str(c.sessionId, 80), brdSection: 'module',
      openQuestions: b.basis === 'question' ? str(q.text, 600) : '', source: src, history: [{ at: now, by: str(c.by, 120), change: 'Created as a draft from the Workshop room (not confirmed)' }] } };
    if (kind === 'decision') return { store: 'decision', record: { id: c.id, title: cut(b.basis === 'question' ? 'To decide: ' + b.text : b.text, 200), detail: b.basis === 'quote' ? 'Quoted: ' + b.text : '', why: str(q.why, 500), mod: q.module || 'project', date: str(c.today, 10), status: 'Proposed', source: sourceText(q, src), reqIds: [], draft: true, origin: src } };
    if (kind === 'action') return { store: 'action', record: { id: c.id, text: cut(b.basis === 'note' ? b.text : 'Follow up: ' + b.text, 300), mod: q.module || 'project', owner: '', due: '', status: 'Open', side: 'facilio', draft: true, source: sourceText(q, src), origin: src } };
    // an open question is the question or the person's own words, never a customer's quote
    return { store: 'question', record: { id: c.id, text: cut(b.basis === 'quote' ? str(q.text, 600) : b.text, 600), area: str(q.moduleLabel, 160), owner: 'customer', status: 'open', created: now, draft: true, source: src } };
  }
  /** true when an open question with the same words is already recorded (so the button does not add a copy) */
  const sameQuestion = (existing, text) => { const k = str(text, 600).toLowerCase(); return !!k && arr(existing).some(x => str(obj(x).text, 600).toLowerCase() === k); };

  /** the planned sessions in date order for the agenda panel */
  function agendaOf(sessions) {
    return arr(sessions).filter(s => s && typeof s === 'object' && str(s.title, 200)).slice(0, 100).map(s => ({ id: str(s.id, 80), no: s.no == null ? '' : str(s.no, 10), title: str(s.title, 200), date: str(s.date, 10), start: str(s.start, 8), minutes: Number(s.minutes) > 0 ? Math.min(Number(s.minutes), 1440) : 0, status: str(s.status, 30) || 'planned', modules: arr(s.modules).map(m => str(m, 120)).filter(Boolean).slice(0, 12), topics: str(s.topics, 600) }))
      .sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : (a.date || '9999') > (b.date || '9999') ? 1 : String(a.no).localeCompare(String(b.no), undefined, { numeric: true }));
  }
  /** a clock from milliseconds: m:ss, or h:mm:ss from an hour on */
  function fmtClock(ms) { const t = Math.max(0, Math.floor((Number(ms) || 0) / 1000)); const p = n => String(n).padStart(2, '0'); return t >= 3600 ? Math.floor(t / 3600) + ':' + p(Math.floor(t % 3600 / 60)) + ':' + p(t % 60) : Math.floor(t / 60) + ':' + p(t % 60); }

  const api = { STATUSES, LABEL, KINDS, notesOf, questionList, mergeLive, counts, setNote, evidenceLine, basisOf, sourceOf, draftRecord, sameQuestion, agendaOf, fmtClock };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBWorkshopLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
