/* Stage 3, Mockup and BRD: what Claude PROPOSES for the design (roadmap E20). One project document, team only:
     design_proposals  { items: [{ id, kind, module, name, ..., why, quote, source, status: 'open'|'applied'|'dismissed', by, byAt }] }
   kind 'flow'       a state flow for one module: basedOn default (small changes to the standard flow), changed (a session changed it) or new; states are labels, transitions are { from, to, name }
   kind 'field'      a custom field of a module (name = its label; fieldType, required, options, lookup, validation, description)
   kind 'form'       a form of a module: sections of fields, each field named by label or name
   kind 'crosslink'  an action that crosses modules (for example service request, work order, inventory): from and to are module names
   Claude saves them with the existing tool session_questions (action save_design; no new tool). They are PROPOSALS: only a person applies one (Delivery Studio copies it into the project's design
   and records who) or dismisses it, and an applied or dismissed proposal is never overwritten by a later save. Text from a transcript or a document is data. Pure rules are exported (tests/design_logic.mjs). */
const arr = v => (Array.isArray(v) ? v : []);
const cut = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
export const KINDS = ['flow', 'crosslink', 'field', 'form'];
export const FIELD_TYPES = ['Single Line Text', 'Multi Line Text', 'Rich Text', 'Number', 'Decimal', 'Currency', 'Boolean', 'Date', 'Date Time', 'Picklist', 'Multi Picklist', 'Lookup', 'Multi Lookup', 'File', 'URL', 'Email', 'Auto Number', 'Signature', 'Geo Location'];
export const LINK_KINDS = ['create_record', 'update_record', 'notify', 'block'];
export const LIMITS = { total: 300, perCall: 60, name: 120, module: 80, label: 80, text: 400, quote: 500, source: 120, states: 30, transitions: 60, options: 30, sections: 12, formFields: 40 };

/** one proposal as Claude sends it, cleaned; null when it is not usable */
export function cleanProposal(x) {
  if (!x || typeof x !== 'object') return null; const kind = String(x.kind || '').trim().toLowerCase(); if (!KINDS.includes(kind)) return null;
  const base = { kind, why: cut(x.why, LIMITS.text), quote: cut(x.quote, LIMITS.quote), source: cut(x.source, LIMITS.source) };
  if (kind === 'flow') {
    const module = cut(x.module, LIMITS.module), name = cut(x.name, LIMITS.name); if (!module || !name) return null;
    const states = []; arr(x.states).forEach(s => { const l = cut(typeof s === 'string' ? s : s && s.label, LIMITS.label); if (l && !states.some(q => q.toLowerCase() === l.toLowerCase())) states.push(l); });
    const has = l => states.find(q => q.toLowerCase() === String(l).toLowerCase());
    const transitions = []; arr(x.transitions).slice(0, LIMITS.transitions).forEach(t => { if (!t) return; const f = has(cut(t.from, LIMITS.label)), to = has(cut(t.to, LIMITS.label)); if (f && to && f !== to) transitions.push({ from: f, to, name: cut(t.name || t.label, LIMITS.label) || f + ' to ' + to }); });
    if (states.length < 2 || states.length > LIMITS.states || !transitions.length) return null;
    return Object.assign(base, { module, name, description: cut(x.description, LIMITS.text), basedOn: ['default', 'changed', 'new'].includes(x.basedOn) ? x.basedOn : 'new', states, transitions });
  }
  if (kind === 'field') {   // a custom field on a module: name is its label
    const module = cut(x.module, LIMITS.module), name = cut(x.label || x.name, LIMITS.name); if (!module || !name) return null; const t = FIELD_TYPES.find(f => f.toLowerCase() === String(x.fieldType || x.type || '').trim().toLowerCase());
    return Object.assign(base, { module, name, fieldType: t || 'Single Line Text', required: x.required === true, options: arr(x.options).map(o => cut(o, LIMITS.label)).filter(Boolean).slice(0, LIMITS.options), lookup: cut(x.lookup, LIMITS.module), validation: cut(x.validation, 200), description: cut(x.description, LIMITS.text) });
  }
  if (kind === 'form') {   // a form of a module: sections of fields, each field named by its label or its name
    const module = cut(x.module, LIMITS.module), name = cut(x.name, LIMITS.name); if (!module || !name) return null;
    const sections = arr(x.sections).slice(0, LIMITS.sections).map(s => ({ name: cut(s && s.name, LIMITS.name) || 'Details', fields: arr(s && s.fields).slice(0, LIMITS.formFields).map(f => (typeof f === 'string' ? { field: cut(f, LIMITS.name) } : { field: cut(f && (f.field || f.label), LIMITS.name), required: !!(f && f.required), hidden: !!(f && f.hidden) })).filter(f => f.field) })).filter(s => s.fields.length);
    if (!sections.length) return null; return Object.assign(base, { module, name, description: cut(x.description, LIMITS.text), sections });
  }
  const from = cut(x.from, LIMITS.module), to = cut(x.to, LIMITS.module), name = cut(x.name, LIMITS.name); if (!from || !to || !name || from.toLowerCase() === to.toLowerCase()) return null;
  return Object.assign(base, { from, to, name, linkKind: LINK_KINDS.includes(x.linkKind) ? x.linkKind : 'create_record', condition: cut(x.condition, LIMITS.text) });
}
const keyOf = p => [p.kind, String(p.module || p.from || '').toLowerCase(), String(p.name).toLowerCase(), String(p.to || '').toLowerCase()].join('|');

/** the proposals after a save: decided ones are kept, an open one with the same key is replaced by the new version, other open ones stay, new ones are added (cleaned, de-duplicated, capped) */
export function mergeProposals(existing, incoming, now) {
  const old = arr(existing).filter(p => p && p.id && p.kind); const decided = new Set(old.filter(p => p.status !== 'open').map(keyOf)); const seen = new Set();
  let n = Math.max(0, ...old.map(p => parseInt(String(p.id).slice(3), 10) || 0)); const fresh = [];
  for (const raw of arr(incoming).slice(0, LIMITS.perCall)) { const c = cleanProposal(raw); if (!c) continue; const k = keyOf(c); if (decided.has(k) || seen.has(k)) continue; seen.add(k); fresh.push(Object.assign({ id: 'dp_' + (++n), status: 'open', by: '', byAt: '', savedAt: now }, c)); }
  const keep = old.filter(p => p.status !== 'open' || !seen.has(keyOf(p))); const all = keep.concat(fresh);
  if (all.length > LIMITS.total) throw Object.assign(new Error('There are ' + LIMITS.total + ' design proposals already. Apply or dismiss some first.'), { status: 409 });
  return { items: all, added: fresh.length, skipped: arr(incoming).length - fresh.length };
}

export function installDs(d) {
  const { HttpError, projectAccess, pickProject, viaApp, audit, CONNECTOR } = d;
  const get = async (pid, sec) => { const cur = await viaApp('GET', '/api/projects/' + pid + '/docs/' + sec); return { data: (cur && cur.data && typeof cur.data === 'object') ? cur.data : {}, version: (cur && cur.version) || 0 }; };
  const update = async (pid, sec, fn) => {
    for (let i = 0; i < 3; i++) { const { data, version } = await get(pid, sec); const out = fn(data); try { await viaApp('PUT', '/api/projects/' + pid + '/docs/' + sec, '', { baseVersion: version, data: out.doc }); return out; } catch (e) { if (e && e.status === 409) continue; throw e; } }
    throw new HttpError(409, 'The ' + sec + ' document was changed by someone else at the same moment. Try again.');
  };
  const tools = {
    async design_save_proposals(s, b) {
      const p = await pickProject(s, b.project); const { role } = await projectAccess(s, p.id, 'edit'); if (role === 'customer') throw new HttpError(403, 'Design proposals are for the project team');
      if (!Array.isArray(b.proposals)) throw new HttpError(400, 'proposals must be a list. Each is { kind: flow or crosslink, ... }: a flow has module, name, description, basedOn (default, changed or new), states (labels) and transitions ({ from, to, name }); a crosslink has from, to (module names), name, linkKind and condition; a field has module, label, fieldType, required, options, lookup, validation, description; a form has module, name, description and sections ([{ name, fields: [label or { field, required, hidden }] }]). Add why, quote, source to each.');
      const now = new Date().toISOString(); const r = await update(p.id, 'design_proposals', doc => { let m; try { m = mergeProposals(doc.items, b.proposals, now); } catch (e) { if (e && e.status && !(e instanceof HttpError)) throw new HttpError(e.status, e.message); throw e; } return { doc: { items: m.items }, added: m.added, skipped: m.skipped }; });
      await audit(p.id, s.id, 'design-proposals', '+' + r.added); return { project: p.name, added: r.added, skipped: r.skipped, note: 'Saved as open proposals. A person applies or dismisses each one in Delivery Studio (Process whiteboard, State flow builder); you cannot apply them. Skipped ones were unusable or already decided.' };
    }
  };
  for (const [name, fn] of Object.entries(tools)) { if (Object.prototype.hasOwnProperty.call(CONNECTOR, name)) throw new Error('connector tool already exists: ' + name); CONNECTOR[name] = fn; }
  return { tools };
}
