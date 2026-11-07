/* Which Facilio modules the contract documents are about (used by the Solution tab, src/solution.js; tests/contractmods.mjs). Pure code: no page, no network, no model.
   It reads EVERY page of EVERY contract document (the project document msa_text, see work/server/_msadocs.mjs) against the WHOLE module catalogue, not only the modules somebody already switched on.
   A sentence that names a module counts as STRONG when it sits in the scope part of the contract (between a heading such as "Scope of services" and the next commercial heading) or says what is delivered
   (module, configure, implement, deploy, workflow, training, migration ...). A module named only in passing is WEAK (shown for a person to add; generic words such as site, space or client are never strong on a mention alone).
   A sentence in an exclusions part, or that says out of scope, excluded or not included, makes the mention EXCLUDED: the module does not appear as part of the solution.
   Every hit keeps the document, the page and the words, so the person can check the contract. Nothing here decides: the Solution tab shows the evidence and a person adds or ignores. */
(function (root) {
  'use strict';
  const arr = v => (Array.isArray(v) ? v : []);
  const norm = s => ' ' + String(s || '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  const camel = s => String(s || '').replace(/([a-z])([A-Z])/g, '$1 $2');
  /** other words a contract uses for a module (keyed by the module's name, lower case) */
  const ALIASES = { workorder: ['work order', 'job order', 'maintenance order', 'corrective maintenance', 'reactive maintenance', 'reactive service', 'reactive work', 'breakdown maintenance', 'breakdown'], servicerequest: ['service request', 'helpdesk', 'help desk', 'service desk', 'request portal', 'ticketing'], asset: ['assets', 'equipment', 'asset register', 'asset management'],
    plannedmaintenance: ['planned maintenance', 'planned preventive maintenance', 'preventive maintenance', 'preventative maintenance', 'planned work', 'scheduled maintenance', 'ppm'], preventivemaintenance: ['preventive maintenance', 'preventative maintenance', 'ppm', 'pm schedule'], inspectiontemplate: ['inspection', 'inspections', 'checklist', 'checklists'], inspectionresponse: ['inspection', 'inspections'],
    workpermit: ['work permit', 'permit to work', 'ptw'], inventoryrequest: ['inventory', 'stock', 'stock control', 'storeroom', 'stores', 'spare parts', 'materials management'], purchaserequest: ['purchase request', 'purchase requisition', 'requisition'], purchaseorder: ['purchase order', 'procurement', 'purchasing'], requestforquotation: ['request for quotation', 'rfq'],
    vendors: ['vendor', 'contractor management'], invoice: ['invoice', 'invoicing', 'billing'], tenant: ['tenant', 'tenants', 'tenant portal', 'tenant management'], facilitybooking: ['facility booking', 'room booking', 'amenity booking'], spacebooking: ['space booking', 'desk booking', 'hot desking', 'room booking'], invitevisitor: ['visitor', 'visitors', 'visitor management'], visitorlog: ['visitor log', 'visitor management'] };
  const GENERIC = new Set(['site', 'space', 'floor', 'building', 'client', 'people', 'tool', 'quote', 'insurance', 'employee', 'item', 'vendors', 'invoice', 'tenant']);   // a bare mention proves nothing
  const GENERIC_LABEL = new Set(['service', 'schedule', 'request', 'order', 'task', 'record', 'report', 'user', 'team', 'role', 'form', 'data', 'document', 'notification', 'approval', 'event', 'log', 'setting', 'type', 'category', 'group', 'template', 'plan', 'job', 'project', 'contract', 'agreement', 'status', 'priority', 'customer', 'supplier', 'location', 'department', 'organization', 'organisation', 'company', 'account', 'item', 'list']);
  const SCOPE_H = /\b(scope of (work|services?)|services? scope|in.?scope|deliverables?|modules?|services to be (provided|delivered)|statement of work|solution scope)\b/i;
  const END_H = /^(\d+(\.\d+)*\.?\s+)?(fees|payment|pricing|commercial|term(s|ination)?|confidential|liabilit|governing law|warrant|definitions|general)/i;
  const EXCL_H = /\b(exclusions?|out.?of.?scope|not included|excluded (items|services))\b/i;
  const DELIVER = /\b(modules?|configur\w+|implement\w*|deploy\w*|workflows?|functionality|set.?up|roll.?out|go.?live|training|migrat\w+|integrat\w+|provide[sd]?|supply|supplied|deliver\w*|licen[cs]e\w*)\b/i;
  const NEGATE = /\b(out of scope|excluded?|exclusions?|not (be )?(included|covered|part of)|does not include|do not include|shall not|will not)\b/i;
  const phrases = m => { const n = String(m.name || ''); const base = [norm(m.label), norm(camel(n))].concat(arr(ALIASES[n.toLowerCase()]).map(norm)); return Array.from(new Set(base.map(p => p.trim()).filter(p => p.length >= 3))).map(p => ' ' + p + ' '); };
  const has = (text, p) => text.includes(p) || text.includes(p.slice(0, -1) + 's ') || text.includes(p.slice(0, -1) + 'es ');
  const sentences = text => String(text || '').split(/\r?\n/).flatMap(l => (l.length > 260 ? l.split(/(?<=[.;])\s+/) : [l])).map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.length > 3);

  /** one entry per label (the catalogue has several modules called Work Order: keep the one whose name is the label), and no entry whose label is one common word */
  function tidy(catalogue) {
    const canon = new Map(); arr(catalogue).forEach(m => { if (!m || !m.name || !m.label) return; const k = norm(m.label).trim(); const prefer = x => String(x.name).toLowerCase() === k.replace(/ /g, ''); const old = canon.get(k); if (!old || (!prefer(old) && (prefer(m) || String(m.name).length < String(old.name).length))) canon.set(k, m); });
    return [...canon.values()].filter(m => { const w = norm(m.label).trim().split(' '); return !(w.length === 1 && GENERIC_LABEL.has(w[0].replace(/s$/, ''))); });
  }
  /** catalogue: [{ name, label }] (the whole catalogue); docs: [{ label, pages: [{ n, text }] }]. Returns { strong, weak, excluded }, each [{ name, label, hits: [{ doc, page, quote, strong, excluded }] }] */
  function find(catalogue, docs) {
    const mods = tidy(catalogue).map(m => ({ m, ps: phrases(m) })); const found = new Map();
    for (const d of arr(docs)) {
      let inScope = false, inExcl = false;
      for (const pg of arr(d && d.pages).filter(Boolean)) for (const s of sentences(pg.text)) {
        const head = s.length < 90 && !/[.;:,]$/.test(s); if (head) { if (END_H.test(s)) { inScope = false; inExcl = false; } if (EXCL_H.test(s)) { inExcl = true; inScope = false; } else if (SCOPE_H.test(s)) { inScope = true; inExcl = false; } }
        if (head && (END_H.test(s) || EXCL_H.test(s) || SCOPE_H.test(s))) continue;
        const t = norm(s); const hitMods = mods.filter(x => x.ps.some(p => has(t, p))); if (!hitMods.length) continue;
        const neg = inExcl || NEGATE.test(s); const good = !neg && (inScope || DELIVER.test(s));
        hitMods.forEach(x => { const k = x.m.name; const e = found.get(k) || { name: k, label: x.m.label, hits: [] }; if (e.hits.length < 12) e.hits.push({ doc: d.label || 'Contract', page: pg.n, quote: s.slice(0, 220), strong: good, excluded: neg }); found.set(k, e); });
      }
    }
    const strong = [], weak = [], excluded = []; const cnt = e => e.hits.filter(h => h.strong).length;
    found.forEach(e => { const generic = GENERIC.has(e.name.toLowerCase()); const s = cnt(e), ex = e.hits.filter(h => h.excluded).length;
      if (s && (!generic || s >= 2 || e.hits.some(h => h.strong && /\bmodule\b/i.test(h.quote)))) strong.push(e); else if (ex && !s) excluded.push(e); else if (!generic) weak.push(e); });
    const by = (a, b) => cnt(b) - cnt(a) || b.hits.length - a.hits.length || a.label.localeCompare(b.label); return { strong: strong.sort(by), weak: weak.sort(by), excluded: excluded.sort(by) };
  }
  const api = { find, tidy, ALIASES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBContractMods = api;
})(typeof window !== 'undefined' ? window : globalThis);
