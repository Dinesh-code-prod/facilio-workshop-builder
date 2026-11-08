/* Customer mail becomes tasks: the pure rules (plan: docs/reference/MAIL-TO-TASKS-PLAN-2026-11-07.md; tests: tests/mail_tasks.mjs).
   ONE copy: build.mjs adds this file to the browser bundle (sets window.FWBMailTasks); the server and the tests import it (it sets globalThis.FWBMailTasks and module.exports).
   No database, no network. Mail text is untrusted data: it is cut, cleaned and only ever matched against words; nothing in it is run or followed.
   A mail becomes an inbox record (pending). A person accepts it; then a task exists, with a "done when" check on a fact the Studio already holds, and a reply that Claude drafts, a person approves and Outlook opens. */
(function (root) {
  'use strict';
  const arr = v => (Array.isArray(v) ? v : []);
  const txt = (v, max) => (typeof v === 'string' || (typeof v === 'number' && isFinite(v)) ? String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, ' ').trim().slice(0, max) : '');
  const line = (v, max) => txt(v, max).replace(/\s+/g, ' ');
  const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
  const mails = v => [...new Set((Array.isArray(v) ? v : String(v || '').split(/[;,\n]/)).map(x => { const m = /<([^>]+)>/.exec(String(x)); return (m ? m[1] : String(x)).trim().toLowerCase(); }).filter(x => EMAIL.test(x)))].slice(0, 50);
  const LIMITS = { body: 8000, subject: 200, perCall: 20, reply: 6000 };
  const AREAS = { solution: 'Solution', brd: 'BRD', hypercare: 'Hypercare', uat: 'UAT', other: 'Other' };
  const hash = (s, seed, mul) => { let h = seed; for (let i = 0; i < s.length; i++) h = ((h * mul) ^ s.charCodeAt(i)) >>> 0; return h.toString(16).padStart(8, '0'); };

  /** one raw mail cleaned: { ok, mail } or { ok: false, error }. messageId is required: it is the dedupe key. */
  function clean(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'A mail must be an object.' };
    const messageId = line(raw.messageId, 300).replace(/^<|>$/g, ''); if (!messageId) return { ok: false, error: 'messageId is required (the Internet message id of the mail): it stops the same mail being added twice.' };
    const f = raw.from && typeof raw.from === 'object' ? raw.from : { email: raw.from }; const from = { name: line(f.name, 120), email: mails([f.email])[0] || '' };
    const body = txt(raw.body, LIMITS.body); const subject = line(raw.subject, LIMITS.subject) || '(no subject)'; if (!body && subject === '(no subject)') return { ok: false, error: 'The mail has no subject and no text.' };
    let when = ''; if (raw.receivedAt) { const d = new Date(raw.receivedAt); if (!isNaN(d)) when = d.toISOString(); }
    const attachments = (Array.isArray(raw.attachments) ? raw.attachments : []).slice(0, 12).map(a => (a && typeof a === 'object' ? { name: line(a.name, 160), size: Math.max(0, Math.min(Number(a.size) || 0, 5e9)), type: line(a.type, 80) } : null)).filter(a => a && a.name);   // names only: the file stays in Outlook
    return { ok: true, mail: { messageId, conversationId: line(raw.conversationId, 300), from, to: mails(raw.to), cc: mails(raw.cc), subject, body, receivedAt: when, attachments } };
  }
  /** the record id: the same message id in any spelling (case, angle brackets) always gives the same id */
  const idOf = messageId => { const k = String(messageId || '').trim().replace(/^<|>$/g, '').toLowerCase(); return 'ml_' + hash(k, 5381, 33) + hash(k.split('').reverse().join(''), 52711, 31); };

  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  /** the words of the project that make a mail relevant: customer, project name, module names, keywords. Generic words and very short ones are dropped. */
  function words(ctx) {
    const GENERIC = new Set(['project', 'facilio', 'the', 'and', 'ltd', 'llc', 'inc', 'pvt', 'limited', 'company', 'group', 'new', 'phase']);
    const out = []; [ctx.customer, ctx.project].forEach(v => { const s = line(v, 120); if (s.length >= 3) out.push(s); String(s).split(/[\s\-_/|()]+/).forEach(w => { if (w.length >= 4 && !GENERIC.has(w.toLowerCase())) out.push(w); }); });
    arr(ctx.modules).concat(arr(ctx.keywords)).forEach(v => { const s = line(v, 80); if (s.length >= 3) out.push(s); });
    return [...new Set(out.map(w => w.toLowerCase()))];
  }
  /** why this mail matters to me: to, cc, team (it went to other members of the project and not to me), mention (it names the customer, project, a module or a keyword). null = not relevant. */
  function scenario(mail, ctx) {
    const me = String(ctx.me || '').toLowerCase(), team = arr(ctx.team).map(x => String(x).toLowerCase()).filter(x => x && x !== me);
    if (me && mail.to.includes(me)) return { scenario: 'to', hit: me };
    if (me && mail.cc.includes(me)) return { scenario: 'cc', hit: me };
    const other = mail.to.concat(mail.cc).find(x => team.includes(x)); if (other) return { scenario: 'team', hit: other };
    const hay = (mail.subject + '\n' + mail.body).toLowerCase(); const w = words(ctx).find(x => new RegExp('(^|[^a-z0-9])' + esc(x) + '([^a-z0-9]|$)').test(hay));
    return w ? { scenario: 'mention', hit: w } : null;
  }
  // routing by the words used. Order matters: the more specific area wins (a change to a process flow is a Solution task even when the mail also says BRD).
  const RULES = [['solution', /\b(process[\s-]?flows?|state[\s-]?flows?|work[\s-]?flows?|solution|approach|proposed design)\b/i], ['brd', /\b(brd|business requirements?( document)?|requirements? document)\b/i], ['hypercare', /\b(hypercare|post[\s-]?go[\s-]?live|after go[\s-]?live|go[\s-]?live issue|production issue)\b/i], ['uat', /\b(uat|user acceptance|test cases?|test scripts?|defects?|retest)\b/i]];
  /** where it goes: { area, label, words, module, areaKey, job }. A module named in the mail sets the Solution area. */
  function route(mail, ctx) {
    const hay = mail.subject + '\n' + mail.body; let area = 'other', hit = []; for (const [a, re] of RULES) { const m = hay.match(new RegExp(re.source, 'ig')); if (m) { area = a; hit = [...new Set(m.map(x => x.toLowerCase()))].slice(0, 5); break; } }
    const lower = hay.toLowerCase(); const module = arr(ctx.modules).map(m => line(m, 80)).filter(Boolean).find(m => new RegExp('(^|[^a-z0-9])' + esc(m.toLowerCase()) + '([^a-z0-9]|$)').test(lower)) || '';
    return { area, label: AREAS[area], words: hit, module, areaKey: area === 'solution' ? (module ? 'module:' + module : 'area:other') : '', job: area === 'solution' ? 'compare_solution' : '' };
  }
  /** the check that resolves the task. since = ISO time the task was accepted. */
  function doneWhen(rt, since, id, brdCount) {
    if (rt.area === 'solution') return { type: 'solution_accepted', area: rt.areaKey, since, mailId: id };
    if (rt.area === 'brd') return Number.isInteger(brdCount) && brdCount >= 0 ? { type: 'brd_saved', since, count: brdCount } : { type: 'brd_saved', since };   // count = BRD versions in the history when the task was made
    return { type: 'none' };
  }
  /** a pending inbox record for one cleaned mail, or null when the mail matters to nobody on the project (never null when lenient) */
  function makeRecord(mail, ctx, now, lenient) {
    const sc = scenario(mail, ctx) || (lenient ? { scenario: 'found', hit: '' } : null); if (!sc) return null; const rt = route(mail, ctx);   // lenient: Claude already searched by the project words, so a mail it brings is shown for a person to accept or dismiss
    return { id: idOf(mail.messageId), status: 'pending', scenario: sc.scenario, hit: sc.hit, route: rt, title: (rt.area === 'solution' ? 'Solution change: ' : rt.area === 'brd' ? 'BRD change: ' : rt.area === 'uat' ? 'UAT: ' : rt.area === 'hypercare' ? 'Hypercare: ' : 'Customer mail: ') + mail.subject.replace(/^((re|fw|fwd)\s*:\s*)+/i, '').slice(0, 160),
      mail, savedAt: now, doneWhen: null, reply: null };
  }

  /** is the "done when" met? facts: { solutions: { items }, brdCount: number of BRD versions in the history, brdDates: ['YYYY-MM-DD'], crs: [{ id, status }] }. Returns the reason (for "Resolved automatically: ...") or '' while open. */
  function isDone(rec, facts) {
    const w = rec && rec.doneWhen; if (!w || !w.since) return ''; const f = facts || {};
    if (w.type === 'solution_accepted') { const it = ((f.solutions || {}).items || {})[w.area]; const tag = String(w.mailId);   // the record id; the accepted version quotes it as mail:<id> or in the file name
      if (it && String(it.updatedAt || '') >= w.since && arr(it.sources).some(s => String((s && s.source) || '').includes(tag) || String((s && s.quote) || '').includes(tag))) return 'the solution of ' + w.area.replace(/^(module|area):/, '') + ' was accepted with a version that quotes this mail'; return ''; }
    if (w.type === 'brd_saved') { const d = w.since.slice(0, 10); const more = Number.isInteger(w.count) ? Number(f.brdCount) > w.count : arr(f.brdDates).some(x => String(x).slice(0, 10) > d);   // a version dated the same day cannot be told apart from an older one, so without a count only a later day counts
      return more ? 'a BRD version was saved after this task was made' : ''; }
    if (w.type === 'cr_decided') { const c = arr(f.crs).find(x => x && x.id === w.crId); return c && /approved|rejected|declined|accepted|closed|decided/i.test(String(c.status || '')) ? 'the change request was decided' : ''; }
    return '';
  }

  // ---------- the reply: Claude drafts it (unapproved), a person approves, Outlook opens it, Claude confirms in Sent Items ----------
  const REPLY = ['drafted', 'approved', 'sent', 'discarded'];
  /** returns the new reply object; throws an Error with .status 409 when the move is not allowed. ev: draft | approve | edit | confirm_sent | discard */
  function replyStep(reply, ev, d, by, now) {
    const bad = m => { const e = new Error(m); e.status = 409; throw e; }; d = d || {}; const r = reply ? JSON.parse(JSON.stringify(reply)) : null;
    if (ev === 'draft') { if (r && r.state === 'sent') bad('The reply was already sent.'); const body = txt(d.body, LIMITS.reply), subject = line(d.subject, LIMITS.subject); if (!body) bad('The reply needs text.'); return { state: 'drafted', subject, body, to: mails(d.to), cc: mails(d.cc), draftedBy: by, draftedAt: now, approvedBy: '', approvedAt: '', sentRef: '', sentAt: '', history: arr(r && r.history).concat({ at: now, by, to: 'drafted' }).slice(-20) }; }
    if (!r) bad('There is no reply yet.');
    if (ev === 'edit') { if (r.state === 'sent') bad('The reply was already sent.'); const body = txt(d.body, LIMITS.reply); if (!body) bad('The reply needs text.'); r.body = body; if (d.subject != null) r.subject = line(d.subject, LIMITS.subject); r.state = 'drafted'; r.approvedBy = ''; r.approvedAt = ''; r.history = arr(r.history).concat({ at: now, by, to: 'edited' }).slice(-20); return r; }
    if (ev === 'approve') { if (r.state !== 'drafted') bad('Only a drafted reply can be approved (it is ' + r.state + ').'); r.state = 'approved'; r.approvedBy = by; r.approvedAt = now; r.history = arr(r.history).concat({ at: now, by, to: 'approved' }).slice(-20); return r; }
    if (ev === 'confirm_sent') { if (r.state !== 'approved') bad('A reply is confirmed as sent only after a person approved it (it is ' + r.state + ').'); const ref = line(d.sentRef, 300); if (!ref) bad('Say where you found it in Sent Items (subject, recipient and time).'); r.state = 'sent'; r.sentRef = ref; r.sentAt = now; r.history = arr(r.history).concat({ at: now, by, to: 'sent' }).slice(-20); return r; }
    if (ev === 'discard') { if (r.state === 'sent') bad('The reply was already sent.'); r.state = 'discarded'; r.history = arr(r.history).concat({ at: now, by, to: 'discarded' }).slice(-20); return r; }
    throw new Error('unknown event ' + ev);
  }

  const api = { clean, idOf, words, scenario, route, doneWhen, makeRecord, isDone, replyStep, LIMITS, AREAS, REPLY, mails };
  root.FWBMailTasks = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;   // the global is always set: a module import has no other way to hand the rules over
})(typeof window !== 'undefined' ? window : globalThis);
