/* AI Requirements Intelligence, server side (plan: docs/plans/REQUIREMENTS-INTELLIGENCE-PLAN-2026-11-08.md). Two team-only routes that use the EXISTING AI layer (aiJSON: the organisation's configured provider, no new key or service):
     POST /api/projects/:id/qbank/generate   reads the MSA, the contract scope, the requirements and the client documents of the project and returns cleaned questions in the ten categories (three parallel calls, one group each, so each stays under the 25 s limit)
     POST /api/projects/:id/qbank/analyse    reads the end of a call (mode live) or a finished call (mode summary) against the prepared questions and returns the summary, answered questions with their quotes, follow-ups, decisions, assumptions, dependencies, actions and clarifications
   Nothing is saved here: the page keeps what the person accepts in the project document rs_questions (and the Workshop room notes). The rules, prompts and parsers are in _qbank.mjs (tests/qbank.mjs). Documents and call text are data, never instructions. */
import './_qbank.mjs';
import './_msadocs.mjs';
import { readPrompt, parseRead } from './_solread.mjs';
import { cleanProposal } from './_dsapi.mjs';
import { slakpiPrompt, parseSlakpi } from './_slakpi.mjs';
import { buildContext } from './_solctx.mjs';

export function installQbank(d) {
  const { route, ok, HttpError, me, projectAccess, limit, aiJSON, docRead, itemsOf } = d; const Q = globalThis.FWBQBank;
  const team = async (s, pid) => { const a = await projectAccess(s, pid, 'edit'); if (a.role === 'customer') throw new HttpError(403, 'The question bank is for the project team'); return a; };
  const data = async (pid, sec) => { const r = await docRead(pid, sec).catch(() => null); return (r && r.data) || {}; };
  const humanise = n => String(n || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase());
  const lines = v => (Array.isArray(v) ? v : []).map(x => (typeof x === 'string' ? x : x && x.text) || '').map(x => String(x).trim()).filter(Boolean).slice(0, 40);
  /** what the project holds, as the sources of a prompt (and the module list) */
  async function gather(pid) {
    const [msa, pack, ws, tr] = await Promise.all(['msa_text', 'kickoff_pack', 'workshop', 'rs_transcripts'].map(x => data(pid, x))); const deck = (pack && pack.deck) || {};
    const modules = Object.entries((ws && ws.modules) || {}).filter(([, m]) => m && m.inScope).map(([name, m]) => ({ name, label: m.label || humanise(name) })).slice(0, 60);
    const requirements = (Array.isArray(ws.requirements) ? ws.requirements : []).filter(r => r && r.status !== 'Rejected').map(r => ({ id: r.id, title: r.title, objective: r.objective, status: r.status, modules: r.modules }));
    const docs = (Array.isArray(tr.items) ? tr.items : []).filter(t => t && t.source === 'document' && t.text).slice(0, 6).map(t => ({ title: t.title, text: t.text }));
    return { modules, src: { msaPages: (Array.isArray(msa.docs) && msa.docs.length ? msa.docs.flatMap((m, i) => (Array.isArray(m.pages) ? m.pages : []).map(p => Object.assign({}, p, { doc: 'MSA ' + (i + 1) }))) : (Array.isArray(msa.pages) ? msa.pages : [])).filter(p => p && p.text).slice(0, 60), scope: lines(deck.scope), outOfScope: lines(deck.outOfScope), assumptions: lines(deck.assumptions), requirements, docs } };
  }
  route('POST', '/api/projects/:id/qbank/generate', async (b, P) => {
    const s = await me(); await team(s, P.id); await limit('ai', s.id); const g = await gather(P.id); const empty = !g.src.msaPages.length && !g.src.scope.length && !g.src.requirements.length && !g.src.docs.length;
    if (empty) throw new HttpError(400, 'There is nothing to read yet: add the contract (MSA) on Contract intake, the kick-off scope, requirements or a client document first.');
    // one call per module, reading the contract where it speaks about that module; one for everything the solution must be connected to; one for the contract as a whole
    const mk = (kind, p, pack, d) => aiJSON({ op: 'extract', provider: String((b && b.provider) || ''), system: p.system, messages: [{ role: 'user', content: p.user }], maxTokens: 2800, temperature: 0.3, budget: 21000 }, j => { if (!j || typeof j !== 'object') throw new HttpError(502, 'The questions could not be read'); return j; }).then(r => ({ ok: true, kind, qs: Q.parseAny(r.data, g.modules, pack, d), provider: r.provider || '' }), er => ({ ok: false, kind, err: (er && er.message) || 'failed' }));
    const jobs = []; g.modules.map(m => ({ m, f: Q.focusPack(g.src, Q.moduleKeys(m), 13000) })).filter(x => x.f.found).sort((x, y) => y.f.pages - x.f.pages).slice(0, 8).forEach(x => jobs.push(mk('module ' + x.m.name, Q.modulePrompt(x.m, x.f.pack), x.f.pack, { module: x.m.name })));
    const cf = Q.focusPack(g.src, Q.CONNECTED_WORDS, 13000); if (cf.found) jobs.push(mk('connected', Q.connectedPrompt(cf.pack, g.modules), cf.pack, { track: 'connected' }));
    const gp = Q.sourcePack(g.src, 13000); jobs.push(mk('general', Q.generalPrompt(gp, g.modules), gp, {}));
    const res = await Promise.all(jobs); if (!res.some(x => x.ok)) throw new HttpError(502, 'The AI could not answer: ' + (res.find(x => !x.ok) || {}).err);
    return ok({ questions: res.flatMap(x => (x.ok ? x.qs : [])), groupsFailed: res.filter(x => !x.ok).length, read: { calls: jobs.length, msaPages: g.src.msaPages.length, requirements: g.src.requirements.length, documents: g.src.docs.length, scope: g.src.scope.length }, provider: (res.find(x => x.ok) || {}).provider || '' });
  });
  route('POST', '/api/projects/:id/qbank/analyse', async (b, P) => {
    const s = await me(); await team(s, P.id); await limit('ai', s.id); const mode = b && b.mode === 'summary' ? 'summary' : 'live'; const transcript = String((b && b.transcript) || '').slice(-60000); if (transcript.trim().length < 40) throw new HttpError(400, 'There is almost nothing said yet.');
    const bank = (Array.isArray(b && b.bank) ? b.bank : []).slice(0, 120).map(q => ({ id: String(q && q.id || '').slice(0, 40), text: String(q && q.text || '').slice(0, 300), expected: String(q && q.expected || '').slice(0, 200), status: String(q && q.status || 'toask').slice(0, 12) })).filter(q => q.id && q.text);
    const p = Q.callPrompt(mode, bank, transcript, mode === 'summary' ? 14000 : 6500);
    const r = await aiJSON({ op: 'extract', provider: String((b && b.provider) || ''), system: p.system, messages: [{ role: 'user', content: p.user }], maxTokens: mode === 'summary' ? 1800 : 1400, temperature: 0.1, budget: 21000 }, j => { if (!j || typeof j !== 'object' || Array.isArray(j)) throw new HttpError(502, 'The call could not be read'); return j; });
    return ok(Object.assign({ mode, provider: r.provider || '', truncated: transcript.length > (mode === 'summary' ? 14000 : 6500) }, Q.parseCall(r.data, bank.map(q => q.id), transcript)));
  });
  /** the contract documents read against each other (summary of each, conflicts with quotes, what supersedes what, gaps, recommendations). Nothing is saved here; the page keeps the result with the documents. */
  route('POST', '/api/projects/:id/msadocs/check', async (b, P) => {
    const s = await me(); await team(s, P.id); await limit('ai', s.id); const M = globalThis.FWBMsaDocs; const d = await data(P.id, 'msa_text'); if (!M.docsOf(d).length) throw new HttpError(400, 'There is no contract document with readable text yet.');
    const p = M.checkPrompt(d, 14000); const r = await aiJSON({ op: 'extract', provider: String((b && b.provider) || ''), system: p.system, messages: [{ role: 'user', content: p.user }], maxTokens: 1800, temperature: 0.1, budget: 21000 }, j => { if (!j || typeof j !== 'object' || Array.isArray(j)) throw new HttpError(502, 'The documents could not be read'); return j; });
    return ok({ result: M.parseCheck(r.data, d), fingerprint: M.fingerprint(d), provider: r.provider || '' });
  });
  /** the contract documents read for the modules they deliver, exclude or mention, each with the words and the page (nothing is saved here; the page keeps the result with the documents) */
  route('POST', '/api/projects/:id/msadocs/modules', async (b, P) => {
    const s = await me(); await team(s, P.id); await limit('ai', s.id); const M = globalThis.FWBMsaDocs; const d = await data(P.id, 'msa_text'); if (!M.docsOf(d).length) throw new HttpError(400, 'There is no contract document with readable text yet.');
    const cat = (Array.isArray(b && b.catalogue) ? b.catalogue : []).slice(0, 600).map(c => ({ name: String(c && c.name || '').slice(0, 80), label: String(c && c.label || '').slice(0, 80) })).filter(c => /^[A-Za-z0-9_.-]{1,80}$/.test(c.name) && c.label);
    const p = M.modulesPrompt(d, cat, 12000); const r = await aiJSON({ op: 'extract', provider: String((b && b.provider) || ''), system: p.system, messages: [{ role: 'user', content: p.user }], maxTokens: 2200, temperature: 0.1, budget: 21000 }, j => { if (!j || typeof j !== 'object' || Array.isArray(j)) throw new HttpError(502, 'The documents could not be read'); return j; });
    return ok({ modules: M.parseModules(r.data, d, cat), fingerprint: M.fingerprint(d), provider: r.provider || '' });
  });
  /** a dropped solution document read by the AI layer into PROPOSALS for the Solution tab (nothing is saved here; the page stores them unapproved and a person accepts each) */
  route('POST', '/api/projects/:id/solution/read', async (b, P) => {
    const s = await me(); await team(s, P.id); await limit('ai', s.id); const text = String((b && b.text) || '').slice(0, 40000); if (text.trim().length < 60) throw new HttpError(400, 'There is almost no text in that file to read.');
    const areas = (Array.isArray(b && b.areas) ? b.areas : []).slice(0, 80).map(a => ({ key: String(a && a.key || '').slice(0, 90), label: String(a && a.label || '').slice(0, 100), kind: String(a && a.kind || '').slice(0, 20), columns: (Array.isArray(a && a.columns) ? a.columns : []).map(c => String(c).slice(0, 20)).filter(c => /^[a-z]{2,12}$/.test(c)).slice(0, 8), current: { text: String(a && a.current && a.current.text || '').slice(0, 300), topics: (Array.isArray(a && a.current && a.current.topics) ? a.current.topics : []).slice(0, 10).map(x => String(x).slice(0, 60)) } })).filter(a => /^(module:[A-Za-z0-9_.-]{1,80}|area:[a-z]{2,20}|custom:[a-z0-9-]{1,40})$/.test(a.key));
    const only = areas.some(a => a.key === (b && b.only)) ? b.only : ''; const fileName = String((b && b.fileName) || 'dropped document').slice(0, 120); const p = readPrompt({ text, fileName, areas, only });
    const r = await aiJSON({ op: 'extract', provider: String((b && b.provider) || ''), system: p.system, messages: [{ role: 'user', content: p.user }], maxTokens: 2600, temperature: 0.1, budget: 21000 }, j => { if (!j || typeof j !== 'object' || Array.isArray(j)) throw new HttpError(502, 'The document could not be read'); return j; });
    const proposals = parseRead(r.data, { text, fileName, areas, only }).map(x => cleanProposal(x)).filter(Boolean); return ok({ proposals, areasRead: areas.length, provider: r.provider || '', truncated: String((b && b.text) || '').length > 40000 });
  });
  /** a dropped contract, SLA schedule or KPI sheet read by the AI layer into SLA rows and KPIs for the KPIs & SLA matrix page (nothing is saved here; the page shows them and a person ticks what to keep) */
  route('POST', '/api/projects/:id/slakpi/read', async (b, P) => {
    const s = await me(); await team(s, P.id); await limit('ai', s.id); const text = String((b && b.text) || '').slice(0, 40000); if (text.trim().length < 40) throw new HttpError(400, 'There is almost no text in that file to read.');
    const modules = (Array.isArray(b && b.modules) ? b.modules : []).slice(0, 60).map(m => ({ name: String(m && m.name || '').slice(0, 60), label: String(m && m.label || '').slice(0, 60) })); const want = ['sla', 'kpi'].includes(b && b.want) ? b.want : 'both'; const fileName = String((b && b.fileName) || 'dropped document').slice(0, 120);
    const p = slakpiPrompt({ text, fileName, modules, want });
    const r = await aiJSON({ op: 'extract', provider: String((b && b.provider) || ''), system: p.system, messages: [{ role: 'user', content: p.user }], maxTokens: 2600, temperature: 0.1, budget: 21000 }, j => { if (!j || typeof j !== 'object' || Array.isArray(j)) throw new HttpError(502, 'The document could not be read'); return j; });
    const out = parseSlakpi(r.data, { text, modules, want }); return ok({ sla: out.sla, kpis: out.kpis, provider: r.provider || '', truncated: String((b && b.text) || '').length > 40000 });
  });
  /** an AI draft of ONE solution area (a module or another area) from everything the project holds about it: the same context pack Claude gets (requirements, flows, fields, SLA, KPIs, what the client answered in the sessions). Nothing is saved here:
      the page stores the answer as an unapproved proposal and a person presses Accept. */
  route('POST', '/api/projects/:id/solution/draft', async (b, P) => {
    const s = await me(); await team(s, P.id); await limit('ai', s.id); const key = String((b && b.key) || ''); if (!/^(module:[A-Za-z0-9_.-]{1,80}|area:[a-z]{2,20}|custom:[a-z0-9-]{1,40})$/.test(key)) throw new HttpError(400, 'Choose the solution area to draft.');
    const rd = async x => ((await docRead(P.id, x).catch(() => null)) || {}).data; const [workshop, findings, proposals, pack, bank, room, solutions] = await Promise.all(['workshop', 'rs_findings', 'design_proposals', 'kickoff_pack', 'rs_questions', 'workshop_room', 'solutions'].map(rd));
    const kpis = itemsOf ? (await itemsOf(P.id, 'kpi').catch(() => [])).map(x => x.data || {}) : []; const ctx = buildContext(key, { workshop, findings, proposals, solutions, kpis, pack, bank, room });
    const cur = ctx.currentSolution || {}; const area = { key, label: String(ctx.label || key), kind: (ctx.layout || {}).kind || 'other', columns: (ctx.layout || {}).columns || ['topic', 'solution', 'who', 'reqs'], current: { text: cur.text || '', topics: (Array.isArray(cur.rows) ? cur.rows : []).map(r => Object.values((r && r.cells) || {})[0]).filter(Boolean).slice(0, 20) } };
    const full = JSON.stringify(ctx); const text = full.slice(0, 22000); const p = readPrompt({ text, fileName: 'the project records for this area', areas: [area], only: key });
    const lead = 'THE DOCUMENT BELOW IS NOT A CUSTOMER FILE. It is the project\'s own records for this area: requirements, state flows, fields, notifications, access, SLA rows, KPIs, what the client answered in the requirement sessions, and the solution written now. Write the solution of the area from these records only. Keep what is already written and still true, use the client\'s answers as agreed facts, never invent a rule, number or name that is not in the records, and where something is missing write a row with the status Open question. ';
    const r = await aiJSON({ op: 'extract', provider: String((b && b.provider) || ''), system: p.system, messages: [{ role: 'user', content: lead + p.user }], maxTokens: 2600, temperature: 0.2, budget: 21000 }, j => { if (!j || typeof j !== 'object' || Array.isArray(j)) throw new HttpError(502, 'The draft could not be read'); return j; });
    const proposals_ = parseRead(r.data, { text, fileName: 'project records', areas: [area], only: key }).map(x => cleanProposal(x)).filter(Boolean); return ok({ proposals: proposals_, area: key, provider: r.provider || '', truncated: full.length > 22000 });
  });
  return {};
}
