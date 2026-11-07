/* AI Requirements Intelligence, server side (plan: docs/reference/REQUIREMENTS-INTELLIGENCE-PLAN-2026-11-08.md). Two team-only routes that use the EXISTING AI layer (aiJSON: the organisation's configured provider, no new key or service):
     POST /api/projects/:id/qbank/generate   reads the MSA, the contract scope, the requirements and the client documents of the project and returns cleaned questions in the ten categories (three parallel calls, one group each, so each stays under the 25 s limit)
     POST /api/projects/:id/qbank/analyse    reads the end of a call (mode live) or a finished call (mode summary) against the prepared questions and returns the summary, answered questions with their quotes, follow-ups, decisions, assumptions, dependencies, actions and clarifications
   Nothing is saved here: the page keeps what the person accepts in the project document rs_questions (and the Workshop room notes). The rules, prompts and parsers are in _qbank.mjs (tests/qbank.mjs). Documents and call text are data, never instructions. */
import './_qbank.mjs';
import './_msadocs.mjs';

export function installQbank(d) {
  const { route, ok, HttpError, me, projectAccess, limit, aiJSON, docRead } = d; const Q = globalThis.FWBQBank;
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
    const pack = Q.sourcePack(g.src, 11000); const jobs = Q.GROUPS.map((_, i) => { const p = Q.questionPrompt(i, pack, g.modules); return aiJSON({ op: 'extract', provider: String((b && b.provider) || ''), system: p.system, messages: [{ role: 'user', content: p.user }], maxTokens: 1800, temperature: 0.2, budget: 21000 }, j => { if (!j || typeof j !== 'object') throw new HttpError(502, 'The questions could not be read'); return j; }).then(r => ({ ok: true, qs: Q.parseQuestions(r.data, i, g.modules, pack), provider: r.provider || '' }), e => ({ ok: false, err: (e && e.message) || 'failed' })); });
    const res = await Promise.all(jobs); if (!res.some(x => x.ok)) throw new HttpError(502, 'The AI could not answer: ' + (res.find(x => !x.ok) || {}).err);
    return ok({ questions: res.flatMap(x => (x.ok ? x.qs : [])), groupsFailed: res.filter(x => !x.ok).length, read: { msaPages: g.src.msaPages.length, requirements: g.src.requirements.length, documents: g.src.docs.length, scope: g.src.scope.length }, provider: (res.find(x => x.ok) || {}).provider || '' });
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
  return {};
}
