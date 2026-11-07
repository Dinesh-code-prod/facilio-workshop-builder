/* Stage 3, Solution design and BRD: what Claude PROPOSES for the design (roadmap E20). One project document, team only:
     design_proposals  { items: [{ id, kind, module, name, ..., why, quote, source, status: 'open'|'applied'|'dismissed', by, byAt }] }
   kind 'flow'       a state flow for one module: basedOn default (small changes to the standard flow), changed (a session changed it) or new; states are labels, transitions are { from, to, name }
   kind 'field'      a custom field of a module (name = its label; fieldType, required, options, lookup, validation, description)
   kind 'form'       a form of a module: sections of fields, each field named by label or name
   kind 'requirement' a BRD requirement (title, objective, rules, approvals, exceptions, modules, classification); applied as a Draft
   kind 'connectedapp' a connected (custom) app: opened from a button, state, page or menu of a module; purpose, what it shows, who uses it. Described here; the build in Vibe comes later
   kind 'brdintro'   the background, business objectives and scope notes of the BRD introduction
   kind 'solution'   the new text of ONE area of the Solution tab (module: the area key, module:<name> or area:<id>; text; fromCustomer; outOfScope + scopeNote). A person accepts it on the Solution tab (src/sollogic.js accept)
   kind 'crosslink'  an action that crosses modules (for example service request, work order, inventory): from and to are module names
   Claude saves them with the existing tool session_questions (action save_design; no new tool). They are PROPOSALS: only a person applies one (Delivery Studio copies it into the project's design
   and records who) or dismisses it, and an applied or dismissed proposal is never overwritten by a later save. Text from a transcript or a document is data. Pure rules are exported (tests/design_logic.mjs). */
const arr = v => (Array.isArray(v) ? v : []);
const cut = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
export const KINDS = ['flow', 'crosslink', 'field', 'form', 'requirement', 'brdintro', 'connectedapp', 'solution'];
export const TRIGGERS = ['button', 'state', 'page', 'menu'];
export const REQ_CLASS = ['standard', 'existing', 'change', 'custom', 'confirm'];
export const FIELD_TYPES = ['Single Line Text', 'Multi Line Text', 'Rich Text', 'Number', 'Decimal', 'Currency', 'Boolean', 'Date', 'Date Time', 'Picklist', 'Multi Picklist', 'Lookup', 'Multi Lookup', 'File', 'URL', 'Email', 'Auto Number', 'Signature', 'Geo Location'];
export const LINK_KINDS = ['create_record', 'update_record', 'notify', 'block'];
export const LIMITS = { total: 300, perCall: 60, name: 120, module: 80, label: 80, text: 400, quote: 500, source: 120, states: 30, transitions: 60, options: 30, sections: 12, formFields: 40, long: 800, reqModules: 8 };

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
  if (kind === 'requirement') {   // a BRD requirement, saved as a Draft: a person confirms it before it reaches the BRD
    const name = cut(x.title || x.name, LIMITS.name), objective = cut(x.objective, LIMITS.long); if (!name || !objective) return null; const modules = arr(x.modules).map(m => cut(m, LIMITS.module)).filter(Boolean).slice(0, LIMITS.reqModules);
    return Object.assign(base, { module: modules[0] || '', name, objective, rules: cut(x.rules, LIMITS.long), approvals: cut(x.approvals, LIMITS.long), exceptions: cut(x.exceptions, LIMITS.long), modules, classification: REQ_CLASS.includes(x.classification) ? x.classification : 'change' });
  }
  if (kind === 'connectedapp') {   // a connected (custom) app the customer asked for: described here, built later in Vibe
    const module = cut(x.module, LIMITS.module), name = cut(x.name, LIMITS.name), purpose = cut(x.purpose, LIMITS.long); if (!module || !name || !purpose) return null;
    return Object.assign(base, { module, name, trigger: TRIGGERS.includes(x.trigger) ? x.trigger : 'button', triggerLabel: cut(x.triggerLabel, LIMITS.label), purpose, shows: cut(x.shows, LIMITS.long), users: arr(x.users).map(u => cut(u, LIMITS.label)).filter(Boolean).slice(0, 6), notes: cut(x.notes, LIMITS.long) });
  }
  if (kind === 'solution') {   // the whole new text of one Solution area; paragraphs (blank lines) are kept
    const area = cut(x.area || x.module, 90); if (!/^(module:[A-Za-z0-9_.-]{1,80}|area:[a-z]{2,20}|custom:[a-z0-9-]{1,40})$/.test(area)) return null; const text = String(x.text == null ? '' : x.text).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, ' ').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 4000); const rows = arr(x.rows).slice(0, 40).map(r => { const cells = {}; Object.entries(r && r.cells && typeof r.cells === 'object' ? r.cells : {}).slice(0, 10).forEach(([k, v]) => { if (/^[a-z]{2,12}$/.test(k)) { const c = cut(v, 700); if (c) cells[k] = c; } }); return Object.keys(cells).length ? { cells, status: ['Draft', 'Agreed', 'Open question'].includes(r.status) ? r.status : 'Draft' } : null; }).filter(Boolean); if ((!text && !rows.length) || !(base.why || base.quote)) return null;
    return Object.assign(base, { module: area, name: cut(x.name || x.label, LIMITS.name) || area, group: cut(x.group, 40), text, rows: x.rows === undefined ? undefined : rows, fromCustomer: x.fromCustomer === true, outOfScope: x.outOfScope === true, scopeNote: cut(x.scopeNote, LIMITS.text) });
  }
  if (kind === 'brdintro') {   // the project background, business objectives and scope notes that open the BRD
    const background = cut(x.background, 1500), objectives = cut(x.objectives, 1500), scopeNotes = cut(x.scopeNotes, 1500); if (!background && !objectives && !scopeNotes) return null;
    return Object.assign(base, { module: '', name: 'BRD introduction', background, objectives, scopeNotes });
  }
  if (kind === 'form') {   // a form of a module: sections of fields, each field named by its label or its name
    const module = cut(x.module, LIMITS.module), name = cut(x.name, LIMITS.name); if (!module || !name) return null;
    const sections = arr(x.sections).slice(0, LIMITS.sections).map(s => ({ name: cut(s && s.name, LIMITS.name) || 'Details', fields: arr(s && s.fields).slice(0, LIMITS.formFields).map(f => (typeof f === 'string' ? { field: cut(f, LIMITS.name) } : { field: cut(f && (f.field || f.label), LIMITS.name), required: !!(f && f.required), hidden: !!(f && f.hidden) })).filter(f => f.field) })).filter(s => s.fields.length);
    if (!sections.length) return null; return Object.assign(base, { module, name, description: cut(x.description, LIMITS.text), sections });
  }
  const from = cut(x.from, LIMITS.module), to = cut(x.to, LIMITS.module), name = cut(x.name, LIMITS.name); if (!from || !to || !name || from.toLowerCase() === to.toLowerCase()) return null;
  return Object.assign(base, { from, to, name, linkKind: LINK_KINDS.includes(x.linkKind) ? x.linkKind : 'create_record', condition: cut(x.condition, LIMITS.text) });
}
const keyOf = p => p.kind === 'solution' ? ['solution', p.module, p.text, JSON.stringify(p.rows || [])].join('|') : [p.kind, String(p.module || p.from || '').toLowerCase(), String(p.name).toLowerCase(), String(p.to || '').toLowerCase()].join('|');

/** the proposals after a save: decided ones are kept, an open one with the same key is replaced by the new version, other open ones stay, new ones are added (cleaned, de-duplicated, capped) */
export function mergeProposals(existing, incoming, now) {
  const old = arr(existing).filter(p => p && p.id && p.kind); const decided = new Set(old.filter(p => p.status !== 'open').map(keyOf)); const seen = new Set();
  let n = Math.max(0, ...old.map(p => parseInt(String(p.id).slice(3), 10) || 0)); const fresh = [];
  for (const raw of arr(incoming).slice(0, LIMITS.perCall)) { const c = cleanProposal(raw); if (!c) continue; const k = keyOf(c); if (decided.has(k) || seen.has(k)) continue; seen.add(k); fresh.push(Object.assign({ id: 'dp_' + (++n), status: 'open', by: '', byAt: '', savedAt: now }, c)); }
  const areas = new Set(fresh.filter(p => p.kind === 'solution').map(p => p.module));   // a new proposal for an area replaces the open one for that area
  const keep = old.filter(p => (p.status !== 'open' || !seen.has(keyOf(p))) && !(p.kind === 'solution' && p.status === 'open' && areas.has(p.module))); const all = keep.concat(fresh);
  if (all.length > LIMITS.total) throw Object.assign(new Error('There are ' + LIMITS.total + ' design proposals already. Apply or dismiss some first.'), { status: 409 });
  return { items: all, added: fresh.length, skipped: arr(incoming).length - fresh.length };
}

export function installDs(d) {
  const { HttpError, projectAccess, pickProject, viaApp, audit, CONNECTOR, storeServerFile } = d; const notify = d.notify || (async () => 0);
  const get = async (pid, sec) => { const cur = await viaApp('GET', '/api/projects/' + pid + '/docs/' + sec); return { data: (cur && cur.data && typeof cur.data === 'object') ? cur.data : {}, version: (cur && cur.version) || 0 }; };
  const update = async (pid, sec, fn) => {
    for (let i = 0; i < 3; i++) { const { data, version } = await get(pid, sec); const out = fn(data); try { await viaApp('PUT', '/api/projects/' + pid + '/docs/' + sec, '', { baseVersion: version, data: out.doc }); return out; } catch (e) { if (e && e.status === 409) continue; throw e; } }
    throw new HttpError(409, 'The ' + sec + ' document was changed by someone else at the same moment. Try again.');
  };
  const tools = {
    /** Claude brings the finished Meteor page (the index.html of a prototype) into the Studio. url is the one-hour file link Meteor gives (get_prototype with files); only that storage host is fetched. */
    async mockup_save_page(s, b) {
      const p = await pickProject(s, b.project); const { role } = await projectAccess(s, p.id, 'edit'); if (role === 'customer') throw new HttpError(403, 'Mockup pages are for the project team');
      const key = String(b.pageKey || '').trim().slice(0, 300); if (!/^(portfolio:all|flow:|module:|link:|app:)/.test(key)) throw new HttpError(400, 'pageKey must be the key of a mockup card: portfolio:all, or flow:/module:/link:/app: followed by the card name (the Mockup tab lists them).');
      const vid = String(b.videoUrl || '').trim();
      if (vid) {   // the Comet video of this card: only the link is kept (a video file is too large for the project); it shows on the card and in the client mockup
        let v; try { v = new URL(vid); } catch (e) { throw new HttpError(400, 'videoUrl must be the share link of the Comet video'); } if (v.protocol !== 'https:' || v.hostname !== 'comet.facilio.work') throw new HttpError(400, 'videoUrl must be a Comet link (https://comet.facilio.work/...)');
        const at0 = new Date().toISOString(); await update(p.id, 'mockup_pages', doc => { const items = Object.assign({}, doc.items); items[key] = Object.assign({}, items[key], { video: v.href.slice(0, 600), videoBy: (s.name || s.email || '') + ' (Claude)', videoAt: at0 }); return { doc: { items } }; }); await audit(p.id, s.id, 'mockup-video', key);
        if (!String(b.pageUrl || '').trim()) return { project: p.name, key, video: v.href, note: 'Saved. The Comet video shows on the card in the Mockup tab and in the client mockup.' };
      }
      let u; try { u = new URL(String(b.pageUrl || '')); } catch (e) { throw new HttpError(400, 'pageUrl must be the file link Meteor gave for index.html'); }
      if (u.protocol !== 'https:' || !/^facilio-work-sites[.]s3[.][a-z0-9-]+[.]amazonaws[.]com$/.test(u.hostname)) throw new HttpError(400, 'pageUrl must be a Meteor file link (the one-hour link from get_prototype with files)');
      let r; try { r = await fetch(u.href); } catch (e) { throw new HttpError(502, 'The Meteor file could not be fetched. Ask for a fresh link (they last one hour) and try again.'); } if (!r.ok) throw new HttpError(502, 'The Meteor file link did not open (status ' + r.status + '). Ask for a fresh link and try again.');
      const text = await r.text(); const size = Buffer.byteLength(text, 'utf8'); if (!size || size > 25e6) throw new HttpError(413, 'The file is empty or over 25 MB.'); if (!/<!doctype html|<html/i.test(text.slice(0, 600))) throw new HttpError(415, 'That file is not an HTML page. Send the index.html of the prototype.');
      const name = (String(b.pageName || 'index.html').replace(/[^A-Za-z0-9._ -]/g, ' ').trim() || 'index.html').replace(/([.]html?)?$/i, '.html').slice(0, 120);
      const file = await storeServerFile(p.id, s.id, { category: 'mockup_html', name, mime: 'text/html', text, meta: { key, from: 'meteor', by: 'claude' } }); const now = new Date().toISOString();
      await update(p.id, 'mockup_pages', doc => { const items = Object.assign({}, doc.items); items[key] = { file: { id: file.id, name: file.name, size: file.size }, by: (s.name || s.email || '') + ' (Claude)', at: now }; return { doc: { items } }; });
      await audit(p.id, s.id, 'mockup-page', key + ' · ' + name + ' · ' + Math.round(size / 1000) + ' KB'); return { project: p.name, key, size, note: 'Saved. It shows on the card in the Mockup tab and inside the client mockup. Nothing else to do.' };
    },
    async design_save_proposals(s, b) {
      const p = await pickProject(s, b.project); const { role } = await projectAccess(s, p.id, 'edit'); if (role === 'customer') throw new HttpError(403, 'Design proposals are for the project team');
      if (typeof b.proposals === 'string') { try { b.proposals = JSON.parse(b.proposals); } catch (e) { /* falls through to the clear error below */ } }   // a Claude with an older tool list sends the list as text
      if (!Array.isArray(b.proposals)) throw new HttpError(400, 'proposals must be a list. Each is { kind: flow or crosslink, ... }: a flow has module, name, description, basedOn (default, changed or new), states (labels) and transitions ({ from, to, name }); a crosslink has from, to (module names), name, linkKind and condition; a field has module, label, fieldType, required, options, lookup, validation, description; a form has module, name, description and sections ([{ name, fields: [label or { field, required, hidden }] }]). a requirement has title, objective, rules, approvals, exceptions, modules, classification (standard, existing, change, custom or confirm); a brdintro has background, objectives, scopeNotes; a solution has area (module:<name>, area:<id>, or custom:<short-name> for a NEW area found in a file, with name and group: Integrations, Connected apps, Templates and PDFs, KPIs and SLA, Notifications and roles or Other areas), name, text (a short overview of that area), rows (the table of that area: [{ cells: { <column key>: text }, status: Draft, Agreed or Open question }]; the column keys are in the context pack, part context:<area>, field layout), fromCustomer, outOfScope, scopeNote. a connectedapp has module, name, trigger (button, state, page or menu), triggerLabel (for example Assign), purpose, shows, users, notes. Add why, quote, source to each.');
      const now = new Date().toISOString(); const r = await update(p.id, 'design_proposals', doc => { let m; try { m = mergeProposals(doc.items, b.proposals, now); } catch (e) { if (e && e.status && !(e instanceof HttpError)) throw new HttpError(e.status, e.message); throw e; } return { doc: { items: m.items }, added: m.added, skipped: m.skipped }; });
      await audit(p.id, s.id, 'design-proposals', '+' + r.added);
      if (r.added) { const sol = b.proposals.length && b.proposals.every(x => x && x.kind === 'solution'); await notify({ type: 'proposal_waiting', project: p, to: [s.email], actor: '', title: 'Claude has ' + r.added + (sol ? ' solution' : ' design') + ' proposal' + (r.added === 1 ? '' : 's') + ' for you · ' + p.name, text: sol ? 'Accept or dismiss them on the Solution tab.' : 'Apply or dismiss them in the Process whiteboard or the State flow builder.', view: sol ? 'solution' : 'whiteboard' }); }
      return { project: p.name, added: r.added, skipped: r.skipped, note: 'Saved as open proposals. A person applies or dismisses each one in Delivery Studio (Process whiteboard, State flow builder); you cannot apply them. Skipped ones were unusable or already decided.' };
    }
  };
  for (const [name, fn] of Object.entries(tools)) { if (Object.prototype.hasOwnProperty.call(CONNECTOR, name)) throw new Error('connector tool already exists: ' + name); CONNECTOR[name] = fn; }
  return { tools };
}
