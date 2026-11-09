/* Workshop plan import (tests/workshop_plan.mjs). Pure: no browser, no network.
   A team member gives Claude a workshop plan in any layout (Excel, Word, PDF, an e-mail). Claude reads it and saves a DRAFT (save_draft, task workshop) whose content holds ONE json block:
   { "workshopPlan": 1, "sessions": [ { no, title, items:[module names], details:[{ heading, points:[...] }], stakeholders:[...], date:"YYYY-MM-DD" or "", time, duration, mode, status:"planned"|"optional", prep } ], "planNotes": [ { item, text } ] }
   parseDraft(content) checks and cleans that block (what Claude wrote is untrusted: text only, fixed fields, short); apply(existing, incoming, mode) adds the sessions to the plan or replaces it. */
(function (root) {
  'use strict';
  const arr = x => (Array.isArray(x) ? x : []);
  const txt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const SCHEMA = '{ "workshopPlan": 1, "sessions": [ { "no": 1, "title": "Session title", "items": ["Module"], "details": [ { "heading": "Module", "points": ["Agenda point"] } ], "stakeholders": ["Role"], "date": "YYYY-MM-DD or empty", "time": "10:00 am", "duration": "2 hours", "mode": "Virtual", "status": "planned or optional", "prep": "" } ], "planNotes": [ { "item": "Schedule", "text": "" } ] }';
  function parseDraft(content) {
    const raw = String(content || ''); const m = /```(?:json)?\s*([\s\S]*?)```/.exec(raw); const t = m ? m[1] : raw; const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0 || b < a) return null;
    let j; try { j = JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; } const list = Array.isArray(j) ? j : Array.isArray(j.sessions) ? j.sessions : null; if (!list) return null;
    const sessions = list.slice(0, 40).map((s, i) => { s = s || {}; return { no: Number(s.no) > 0 ? Math.round(Number(s.no)) : i + 1, title: txt(s.title, 160), items: arr(s.items).map(x => txt(x, 80)).filter(Boolean).slice(0, 20), itemsText: txt(s.itemsText, 300),
      details: arr(s.details).slice(0, 20).map(g => ({ heading: txt(g && g.heading, 80), points: arr(g && g.points).map(p => txt(p, 300)).filter(Boolean).slice(0, 40) })).filter(g => g.points.length),
      stakeholders: arr(s.stakeholders).map(x => txt(x, 80)).filter(Boolean).slice(0, 20), date: /^\d{4}-\d{2}-\d{2}$/.test(String(s.date || '')) ? s.date : '', time: txt(s.time, 40), duration: txt(s.duration, 40), mode: txt(s.mode, 30), status: s.status === 'optional' ? 'optional' : 'planned', prep: txt(s.prep, 400), notes: txt(s.notes, 400) }; }).filter(s => s.title);
    if (!sessions.length) return null; return { sessions, planNotes: arr(j.planNotes).slice(0, 20).map(r => ({ item: txt(r && r.item, 80), text: txt(r && r.text, 400) })).filter(r => r.item || r.text) };
  }
  /** mode 'add': the new sessions are numbered after the last one; 'replace': only the new sessions stay. uid makes a session id. Sessions made here carry no fromPack mark, so the contract draft never overwrites them. */
  function apply(existing, inc, mode, uid) {
    const keep = mode === 'replace' ? [] : arr(existing).slice(); let no = keep.reduce((m, s) => Math.max(m, Number(s.no) || 0), 0);
    const added = inc.sessions.map(s => Object.assign({}, s, { id: uid('ses'), no: mode === 'replace' ? s.no : ++no, imported: true, notes: s.notes || '' }));
    return { sessions: keep.concat(added), added: added.length };
  }
  const api = { parseDraft, apply, SCHEMA };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBWsPlan = api;
})(typeof window !== 'undefined' ? window : globalThis);
