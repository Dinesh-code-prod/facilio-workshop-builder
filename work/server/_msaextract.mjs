/* MSA extraction: the pure rules (roadmap E2 workspace 1 and E11 step 2). No database, no network: run by tests/msa_extract.mjs and used by work/server/_msaapi.mjs.
   The Studio server cannot read Microsoft 365. Claude reads the MSA in the person's own session through the Microsoft 365 connector and sends a structured extraction;
   this file cleans it (hostile input safe: only known keys survive, text and lists are capped) and, once a person has approved it, turns it into the records the
   Contract flow already uses (planner.scope, planner.contractX, Know Your Contract, the Scope page). Nothing is invented: a missing value stays missing.
   Every item keeps an origin label: contract (the MSA says so), interpreted (Claude's reading of the MSA) or assumed (neither; the least trusted, and the default when a label is missing or unknown). */
import { createHash } from 'node:crypto';

export const ORIGINS = ['contract', 'interpreted', 'assumed'];
export const SCOPE_STATUS = ['confirmed', 'excluded', 'unclear'];
export const LIMITS = { items: 200, scope: 300, text: 600, quote: 400, name: 160, bytes: 400000, lines: 35, line: 220 };
export const SYSTEMS = ['sharepoint', 'onedrive'];
const LISTS = ['deliverables', 'customerResponsibilities', 'facilioResponsibilities', 'exclusions', 'dependencies', 'commercialConstraints', 'training', 'supportAndHandover'];
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
export const txt = (v, max) => (typeof v === 'string' || (typeof v === 'number' && isFinite(v)) ? String(v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const day = v => { const s = txt(v, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return ''; const t = Date.parse(s + 'T00:00:00Z'); return isNaN(t) || new Date(t).toISOString().slice(0, 10) !== s || s < '1990-01-01' || s > '2100-12-31' ? '' : s; };

/** the person's own holding space for an extraction that has no project yet: a collection suffix that is the same every time and safe in a collection name */
export const holdingId = personId => 'h_' + createHash('sha256').update('holding:' + String(personId), 'utf8').digest('hex').slice(0, 24);

function source(raw) {
  const r = isObj(raw) ? raw : {}; const out = {}; const p = Number(r.page); if (Number.isInteger(p) && p >= 1 && p <= 20000) out.page = p;
  const section = txt(r.section, 60), quote = txt(r.quote, LIMITS.quote); if (section) out.section = section; if (quote) out.quote = quote; return out;
}

/** Cleans and checks one extraction. Returns { ok, extraction, errors, warnings }; extraction holds only known keys, in a fixed order, so the same content always has the same text (and hash). */
export function validateExtraction(x) {
  const errors = [], warnings = []; if (!isObj(x)) return { ok: false, extraction: null, errors: ['The extraction must be an object.'], warnings };
  const note = (n, m) => { if (n) warnings.push(m.replace('#', String(n))); };
  const out = { customer: txt(x.customer, LIMITS.name), projectName: txt(x.projectName, LIMITS.name) };
  if (!out.customer) warnings.push('No customer name was found; a project cannot be created without one.'); if (!out.projectName) warnings.push('No project name was found; a project cannot be created without one.');
  const c = isObj(x.contract) ? x.contract : {}; const dd = Number(c.durationDays);
  out.contract = { start: day(c.start), end: day(c.end), durationDays: Number.isInteger(dd) && dd >= 1 && dd <= 3650 ? dd : null, term: txt(c.term, 100), origin: '', source: source(c.source) };
  if (out.contract.start || out.contract.end || out.contract.durationDays || out.contract.term) { const o = typeof c.origin === 'string' ? c.origin.trim().toLowerCase() : ''; out.contract.origin = ORIGINS.includes(o) ? o : 'assumed'; if (!ORIGINS.includes(o)) warnings.push('contract: the dates and term had no valid origin (contract, interpreted or assumed) and were marked assumed.'); }
  if (txt(c.start, 20) && !out.contract.start) warnings.push('The contract start date is not a real date (use YYYY-MM-DD) and was left out.');
  if (txt(c.end, 20) && !out.contract.end) warnings.push('The contract end date is not a real date (use YYYY-MM-DD) and was left out.');
  if (out.contract.start && out.contract.end && out.contract.end < out.contract.start) { out.contract.end = ''; warnings.push('The contract end date is before the start date and was left out.'); }
  const list = (name, raw, cap, shape) => {
    const rows = Array.isArray(raw) ? raw : []; const res = []; const seen = new Set(); let dropped = 0, unlabelled = 0, over = Math.max(0, rows.length - cap);
    for (const r of rows.slice(0, cap)) { const o = shape(r, () => { unlabelled++; }); if (!o) { dropped++; continue; } const k = JSON.stringify([o.text || o.name, o.status || '', o.origin || '']).toLowerCase(); if (seen.has(k)) continue; seen.add(k); res.push(o); }
    note(over, name + ': # item(s) beyond the limit of ' + cap + ' were left out.'); note(dropped, name + ': # entr' + (dropped === 1 ? 'y' : 'ies') + ' had no text and were left out.'); note(unlabelled, name + ': # item(s) had no valid origin (contract, interpreted or assumed) and were marked assumed.'); return res;
  };
  const origin = (r, bump) => { const o = typeof r.origin === 'string' ? r.origin.trim().toLowerCase() : ''; if (ORIGINS.includes(o)) return o; bump(); return 'assumed'; };
  const asObj = (r, bump) => (typeof r === 'string' ? (bump(), { text: r, origin: 'assumed' }) : isObj(r) ? r : null);
  const textItem = (r, bump) => { r = asObj(r, bump); const text = r && txt(r.text, LIMITS.text); return text ? { text, origin: origin(r, bump), source: source(r.source) } : null; };
  out.scope = list('scope', x.scope, LIMITS.scope, (r, bump) => { r = asObj(r, bump); const text = r && txt(r.text, LIMITS.text); if (!text) return null; const st = typeof r.status === 'string' ? r.status.trim().toLowerCase() : '';
    if (!SCOPE_STATUS.includes(st)) warnings.push('scope: "' + text.slice(0, 40) + '" had no valid status (confirmed, excluded or unclear) and was marked unclear.'); return { text, status: SCOPE_STATUS.includes(st) ? st : 'unclear', origin: origin(r, bump), source: source(r.source) }; });
  out.modules = list('modules', x.modules, LIMITS.items, (r, bump) => { r = asObj(r, bump); const name = r && txt(r.name || r.text, 120); return name ? { name, origin: origin(r, bump), source: source(r.source) } : null; });
  out.commitments = list('commitments', x.commitments, LIMITS.items, (r, bump) => { const o = textItem(r, bump); if (!o) return null; const d = day(r.date); if (isObj(r) && txt(r.date, 20) && !d) warnings.push('commitments: the date of "' + o.text.slice(0, 40) + '" is not a real date and was left out.'); return { text: o.text, date: d, origin: o.origin, source: o.source }; });
  for (const k of LISTS) out[k] = list(k, x[k], LIMITS.items, textItem);
  out.attachments = list('attachments', x.attachments, 50, (r) => { if (!isObj(r)) return null; const name = txt(r.name, 200), ref = txt(r.ref, 500); return name || ref ? { name: name || ref, ref, note: txt(r.note, 300) } : null; });
  const contractGiven = out.contract.start || out.contract.end || out.contract.durationDays || out.contract.term;
  if (!out.customer && !out.projectName && !contractGiven && !['scope', 'modules', 'commitments', 'attachments'].concat(LISTS).some(k => out[k].length)) errors.push('The extraction is empty: nothing usable was found in it.');
  if (out.scope.some(s => s.origin === 'contract' && !s.source.page && !s.source.section && !s.source.quote)) warnings.push('Some scope items marked contract have no page, section or quote to check them against.');
  if (JSON.stringify(out).length > LIMITS.bytes) errors.push('The extraction is too large (' + LIMITS.bytes + ' characters). Send fewer or shorter items.');
  return { ok: !errors.length, extraction: errors.length ? null : out, errors, warnings };
}

const ref = s => (s.page ? ' (MSA p.' + s.page + (s.section ? ' §' + s.section : '') + ')' : s.section ? ' (MSA §' + s.section + ')' : ' (MSA)');
const tag = o => (o === 'interpreted' ? ' [interpreted by Claude]' : o === 'assumed' ? ' [assumed]' : '');
const fileName = (label, r) => txt(label, 200) || txt(String(r || '').split(/[\\/]/).filter(Boolean).pop(), 200) || 'MSA';

/** Turns an approved extraction into what a new project holds. Pure: { project, planner, ctrcore, scope, counts }.
    planner is the project's planner document (the Contract flow's scope items, contractX review fields and the MSA record); ctrcore and scope are the Know Your Contract and Scope page records. */
export function planFromExtraction(ex, o = {}) {
  const at = o.now || new Date().toISOString(); const src = o.source || {}; const by = 'Claude';
  const snippet = txt('Extracted by Claude from the MSA file ' + (src.ref || '') + (o.transferId ? ' (transfer ' + o.transferId + ')' : ''), 320);
  const scope = ex.scope.map((s, i) => ({ id: 'sc_m' + (i + 1), text: s.text, module: '', confidence: s.origin === 'contract' ? 'medium' : 'low', status: s.status === 'excluded' ? 'excluded' : s.status === 'confirmed' && s.origin === 'contract' ? 'matched' : 'uncertain',
    source: 'msa', page: s.source.page || null, section: s.source.section || '', ctx: s.source.quote || '', read: 'text', ocrConf: null, origin: s.origin, from: 'claude' }));
  const fields = {}; const sure = ex.contract.origin === 'contract';   // a date or term that is only interpreted or assumed is marked uncertain and never applied as a contract fact
  const put = (k, label, value, extra) => { fields[k] = Object.assign({ k, label, value, page: null, section: '', snippet, status: 'extracted', from: 'claude' }, extra); };
  const dateX = { origin: ex.contract.origin, uncertain: !sure, page: ex.contract.source.page || null, section: ex.contract.source.section || '' };
  const tm = /^(\d{1,3})[\s-]*(year|month)s?$/i.exec(ex.contract.term); const months = tm ? (tm[2].toLowerCase() === 'year' ? Number(tm[1]) * 12 : Number(tm[1])) : null;   // the WHOLE string must match: "2 years 6 months" is not read as 24
  if (ex.contract.start) put('effective', 'Effective / start date', ex.contract.start, dateX); if (ex.contract.end) put('endDate', 'End date', ex.contract.end, dateX); if (months) put('termMonths', 'Contract duration (months)', months, dateX);
  const obligations = ex.facilioResponsibilities.map(r => ({ side: 'Facilio', text: r.text.slice(0, 260), by: '', page: r.source.page || null, section: r.source.section || '', origin: r.origin })).concat(ex.customerResponsibilities.map(r => ({ side: 'Customer', text: r.text.slice(0, 260), by: '', page: r.source.page || null, section: r.source.section || '', origin: r.origin }))).slice(0, 30);
  if (obligations.length) put('obligations', 'Obligations and deliverables', obligations, { snippet: obligations.length + ' obligation(s) extracted by Claude', rows: true });
  const sx = l => l.map(r => ({ text: r.text.slice(0, 300), page: r.source.page || null, section: r.source.section || '', uncertain: r.origin !== 'contract', origin: r.origin }));
  const assumed = ex.scope.filter(s => s.origin === 'assumed' && s.status !== 'excluded');
  const exclusions = ex.exclusions.concat(ex.scope.filter(s => s.status === 'excluded'));
  const scopeX = { exclusions: sx(exclusions), deliverables: sx(ex.deliverables), responsibilities: sx(ex.customerResponsibilities), assumptions: sx(assumed) };
  const planner = { scope, sessions: [], attendees: {}, msa: { name: fileName(src.label, src.ref), size: 0, uploadedAt: at, chars: 0, pages: null, ocr: null, external: { system: src.system || '', ref: src.ref || '', transferId: o.transferId || '', version: o.version || null }, by }, contractX: { at, fields, scopeX, from: fileName(src.label, src.ref) } };
  const core = {}; if (sure && ex.contract.start) { core.startDate = ex.contract.start; core.startRule = 'date'; fields.effective.applied = at; } if (sure && months) { core.termMonths = months; fields.termMonths.applied = at; }
  if (obligations.length) { core.obligations = obligations.map(r => ({ side: r.side, text: r.text, by: '' })); fields.obligations.applied = at; }
  const lines = (arr, f) => arr.slice(0, LIMITS.lines).map(f).map(l => l.slice(0, LIMITS.line + 40));
  const line = r => r.text.slice(0, LIMITS.line) + ref(r.source) + tag(r.origin);
  const page = { inclusions: lines(ex.scope.filter(s => s.status === 'confirmed' && s.origin === 'contract'), line), exclusions: lines(exclusions, line), deliverables: lines(ex.deliverables, line), responsibilities: lines(ex.customerResponsibilities, line), assumptions: lines(assumed, line) };
  const pageHas = Object.values(page).some(a => a.length);
  const desc = txt('Created from the MSA ' + fileName(src.label, src.ref) + ' by Claude, after a person approved the extraction (transfer ' + (o.transferId || '') + ').', 400);
  return { project: { name: ex.projectName, customer: ex.customer, description: desc, startDate: sure && ex.contract.start || undefined, endDate: sure && ex.contract.end || undefined }, planner, ctrcore: Object.keys(core).length ? core : null, scope: pageHas ? page : null,
    counts: { scopeItems: scope.length, contractFields: Object.keys(fields).length, obligations: obligations.length, scopeLines: Object.values(page).reduce((n, a) => n + a.length, 0) } };
}
