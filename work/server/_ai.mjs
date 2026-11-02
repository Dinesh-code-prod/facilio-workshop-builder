/* Delivery Studio AI layer: one provider-neutral service used by every AI feature on the server.

   Features (BRD and other drafts, kick-off reading, image-to-flow, task assistance, classification, transcript task extraction)
   never call a provider themselves. They ask this service for an operation; the service picks the provider from the organisation
   configuration, checks the provider can do it, calls the provider's adapter, retries once where that is safe, applies the
   organisation's fallback policy, records usage (counts and token totals only) and returns one normalised result or error.

   Providers
   - deepseek: the facilio.work platform model (ctx.llm, Amazon Bedrock, default model deepseek.v3.2). No key: the platform bills
     the signed-in viewer. Text only.
   - claude: Anthropic's Messages API with the app owner's key: the plain secret anthropic_api_key, or a key an admin saved in the
     app (encrypted with the plain secret ai_master_key). Text and images.
   Neither provider streams here: a facilio.work server function returns one response within 25 s, so long documents are written
   part by part (see /ai/job in api.mjs) instead.

   Adding a provider: write an adapter with { id, name, caps, configured(), defaultModel, generate(req) } that throws only
   AIFail errors, add it to ADAPTERS and to PROVIDERS, and give the admin page its name. Nothing in the features changes. */

// normalised error codes, the HTTP status a feature returns for each, and whether a retry can help
const CODES = {
  not_configured: [409, false], auth: [409, false], unsupported: [422, false], bad_request: [400, false],
  rate_limited: [429, true], unavailable: [502, true], timeout: [504, false], empty: [502, true], invalid_output: [502, true]
};
export class AIFail extends Error {
  constructor(code, message, extra) { super(message); this.code = CODES[code] ? code : 'unavailable'; this.status = CODES[this.code][0]; this.retryable = CODES[this.code][1]; Object.assign(this, extra || {}); }
}
// what each operation needs; features name an operation, never a provider
export const OPS = {
  document: { group: 'documents', needs: ['text'] },        // BRD, UAT, FTR, guide and the other drafts (one call or part by part)
  extract: { group: 'extraction', needs: ['text', 'json'] }, // kick-off deck reading, transcript task extraction
  assist: { group: 'analysis', needs: ['text'] },           // AI Task Assistant
  classify: { group: 'analysis', needs: ['text', 'json'] }, // task type classification
  vision: { group: 'vision', needs: ['text', 'json', 'image'] }, // image of a flow -> structured diagram
  probe: { group: 'documents', needs: ['text'] }            // admin health check
};
export const GROUPS = { documents: 'Documents and drafts', extraction: 'Reading documents and transcripts', analysis: 'Task assistance and classification', vision: 'Reading images' };
export const PROVIDERS = ['deepseek', 'claude'];
const NAMES = { deepseek: 'DeepSeek', claude: 'Claude', vision: 'the platform vision model' };
const DEFAULT_MODEL = { deepseek: 'deepseek.v3.2', claude: 'claude-sonnet-5-5', vision: 'moonshotai.kimi-k2.5' };   // vision: a multimodal model on the platform allowlist; DeepSeek v3.2 itself reads text only
const ANTHROPIC = 'https://api.anthropic.com/v1';
const te = new TextEncoder();
const b64 = u8 => Buffer.from(u8).toString('base64'), unb64 = t => new Uint8Array(Buffer.from(t, 'base64'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
// a promise with a hard time limit (the platform model call has no abort signal)
const timeBox = (p, ms) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new AIFail('timeout', 'time box')), ms); })]).finally(() => clearTimeout(t)); };
const textOf = c => (typeof c === 'string' ? c : Array.isArray(c) ? c.filter(x => x && x.type === 'text').map(x => x.text).join('\n') : '');
const hasImage = msgs => msgs.some(m => Array.isArray(m.content) && m.content.some(x => x && x.type === 'image'));

/* env: { ctx: () => platform ctx, db: { get(col,key), put(col,key,val), del(col,key) }, now: () => iso string, log?: (...a) => void }
   Everything the service stores lives in the "ai" collection: cfg (configuration), use (counters), key (an encrypted Claude key). */

export function createAI(env) {
  const BREAKER = {};   // provider id -> { fails, until }; see "Circuit breaker" in generate()
  const ctx = () => env.ctx(); const now = env.now; const log = env.log || (() => { });
  const dbGet = async (k) => { try { const r = await env.db.get('ai', k); return r && r.value; } catch (e) { return null; } };

  // ---------- credentials (server side only; never returned, logged or stored readable) ----------
  async function secret(name) { try { return String((await ctx().secrets.get(name)) || ''); } catch (e) { return ''; } }
  async function masterKey() { const m = await secret('ai_master_key'); if (m.length < 16) return null; const raw = await crypto.subtle.digest('SHA-256', te.encode(m)); return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
  async function sealKey(plain) { const k = await masterKey(); if (!k) return null; const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, te.encode(plain)); return { iv: b64(iv), ct: b64(new Uint8Array(ct)) }; }
  async function openKey(rec) { try { const k = await masterKey(); if (!k || !rec) return ''; return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(rec.iv) }, k, unb64(rec.ct))); } catch (e) { return ''; } }
  async function claudeKey() { const k = await secret('anthropic_api_key'); if (k) return k; const r = await dbGet('key'); return r ? openKey(r) : ''; }
  async function keySource() { if (await secret('anthropic_api_key')) return 'secret'; return (await dbGet('key')) ? 'app' : ''; }

  // ---------- configuration ----------
  async function config() {
    const v = (await dbGet('cfg')) || {}; const m = v.models || {}; const r = v.routes || {};
    const pick = x => (PROVIDERS.includes(x) ? x : 'default');
    return { defaultProvider: v.defaultProvider === 'claude' ? 'claude' : 'deepseek', fallback: v.fallback === 'deepseek' ? 'deepseek' : 'none',
      models: { deepseek: typeof m.deepseek === 'string' && m.deepseek ? m.deepseek : '', claude: typeof m.claude === 'string' && m.claude ? m.claude : '' },
      routes: Object.fromEntries(Object.keys(GROUPS).map(g => [g, pick(r[g])])), by: v.by || null, at: v.at || null };
  }
  const modelFor = (cfg, p) => cfg.models[p] || DEFAULT_MODEL[p];

  // ---------- usage (what the provider reports: counts and token totals; never prompts, answers or keys) ----------
  const emptyUse = () => ({ calls: 0, errors: 0, retries: 0, inTok: 0, outTok: 0, last: null, lastError: null });
  async function usage() { const v = (await dbGet('use')) || {}; const o = {}; for (const p of PROVIDERS) o[p] = Object.assign(emptyUse(), v[p] || {}); return o; }
  async function note(provider, okay, use, errCode, retried) {
    try { const u = await usage(); const x = u[provider]; x.calls += 1; x.last = now(); if (retried) x.retries += 1; if (okay) { if (use) { x.inTok += Number(use.in) || 0; x.outTok += Number(use.out) || 0; } } else { x.errors += 1; x.lastError = { at: now(), code: String(errCode || 'error').slice(0, 40) }; } await env.db.put('ai', 'use', u); } catch (e) { /* visibility only; never block the work */ }
  }

  // ---------- provider adapters ----------
  // each adapter: caps (verified behaviour, not marketing), configured(), generate({ system, messages, maxTokens, temperature, timeoutMs, model }) -> { text, usage, model }
  const deepseek = {
    id: 'deepseek', name: NAMES.deepseek, caps: { text: true, json: true, image: false, stream: false, tools: false, contextChars: 14000, maxOut: 1800 },
    configured: async () => !!(ctx() && typeof ctx().llm === 'function'),
    async models() { try { const l = ctx().llm.models ? await ctx().llm.models() : null; const a = Array.isArray(l) ? l : l && Array.isArray(l.models) ? l.models : null; return a ? a.map(x => (typeof x === 'string' ? x : x && (x.id || x.name))).filter(Boolean) : null; } catch (e) { return null; } },
    async generate(q) {
      if (hasImage(q.messages)) throw new AIFail('unsupported', 'DeepSeek reads text only.');
      const messages = (q.system ? [{ role: 'system', content: q.system }] : []).concat(q.messages.map(m => ({ role: m.role, content: textOf(m.content) })));
      const body = { messages, max_tokens: Math.min(q.maxTokens, this.caps.maxOut), temperature: q.temperature == null ? 0.2 : q.temperature };
      if (q.model && q.model !== DEFAULT_MODEL.deepseek) body.model = q.model;   // the platform default is deepseek.v3.2; only a deliberate change is sent
      let r; try { r = await timeBox(ctx().llm(body), q.timeoutMs); }
      catch (e) { if (e instanceof AIFail) throw e; const st = Number(e && (e.status || e.statusCode)) || 0; const m = String(e && e.message || e);
        log('deepseek call failed', (st || '') + ' ' + m.slice(0, 160));   // the reason only, never the prompt or the answer
        if (st === 429 || /rate|limit|quota|cap/i.test(m)) throw new AIFail('rate_limited', 'You have reached the AI limit for now (about 20 requests a minute for each person, plus a daily allowance). Wait a minute and try again. If it keeps happening, the daily allowance may be used up: it resets tomorrow, or an admin can add the organisation Claude key under Admin › AI provider.');
        if (st === 400 || st === 404 || /model/i.test(m) && st >= 400 && st < 500) throw new AIFail('bad_request', 'The platform model refused the request' + (body.model ? ' (check the model "' + body.model + '" in Admin › AI provider)' : '') + '.');
        throw new AIFail('unavailable', 'The AI service could not be reached. Try again.'); }
      const text = r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content;
      if (!text) throw new AIFail('empty', 'The AI returned no text');
      return { text, model: r.model || q.model || DEFAULT_MODEL.deepseek, usage: r.usage ? { in: r.usage.prompt_tokens || r.usage.input_tokens, out: r.usage.completion_tokens || r.usage.output_tokens } : null };
    }
  };
  const claude = {
    id: 'claude', name: NAMES.claude, caps: { text: true, json: true, image: true, stream: false, tools: false, contextChars: 60000, maxOut: 8000 },
    configured: async () => !!(await claudeKey()),
    // lists the models a key can use without spending tokens
    async verify(key) {
      const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 15000);
      try { const r = await fetch(ANTHROPIC + '/models?limit=50', { headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' }, signal: ac.signal }); const j = await r.json().catch(() => ({}));
        if (r.status === 401 || r.status === 403) return { ok: false, message: 'Anthropic rejected this key. Check that it was copied in full and has not been revoked.' };
        if (r.status === 429) return { ok: false, message: 'Anthropic is rate limiting this key right now. The key may be fine; try again shortly.' };
        if (!r.ok) return { ok: false, message: 'Anthropic returned an error (' + r.status + '). Try again later.' };
        return { ok: true, models: (j.data || []).map(m => m.id).filter(Boolean) };
      } catch (e) { return { ok: false, message: e && e.name === 'AbortError' ? 'Anthropic took too long to answer.' : 'Anthropic could not be reached from the server.' }; } finally { clearTimeout(to); }
    },
    async generate(q) {
      const key = await claudeKey(); if (!key) throw new AIFail('not_configured', 'Claude is not configured. The app owner needs to add the Claude API key in the secrets portal.');
      const ac = new AbortController(); const to = setTimeout(() => ac.abort(), q.timeoutMs);
      // Anthropic takes the system prompt apart from the turns; turns may hold text or [{type:'image'},{type:'text'}] blocks
      const body = { model: q.model, max_tokens: Math.min(q.maxTokens, this.caps.maxOut), system: q.system || undefined, messages: q.messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })) };
      if (q.temperature != null) body.temperature = q.temperature;
      try {
        const r = await fetch(ANTHROPIC + '/messages', { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }, body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          const ra = Number(r.headers && r.headers.get && r.headers.get('retry-after')) || 0;
          if (r.status === 429) throw new AIFail('rate_limited', 'Claude is rate limited right now. Try again shortly.', { retryAfter: ra });
          if (r.status === 401 || r.status === 403) throw new AIFail('auth', 'Claude rejected the configured API key. The app owner needs to check it.');
          if (r.status === 400 || r.status === 404) throw new AIFail('bad_request', 'Claude refused the request (' + r.status + (/model/i.test(JSON.stringify(j)) ? ', check the model "' + q.model + '" in Admin › AI provider' : '') + ').');
          throw new AIFail('unavailable', 'Claude returned an error (' + r.status + ').');
        }
        const text = (j.content || []).filter(c => c && c.type !== 'thinking').map(c => c.text || '').join('');
        if (!text) throw new AIFail('empty', 'Claude returned no text');
        return { text, model: j.model || q.model, usage: j.usage ? { in: j.usage.input_tokens, out: j.usage.output_tokens } : null, stop: j.stop_reason };
      } catch (e) { if (e instanceof AIFail) throw e; throw e && e.name === 'AbortError' ? new AIFail('timeout', 'Claude took too long. Try a narrower request.') : new AIFail('unavailable', 'Claude could not be reached. Try again.'); }
      finally { clearTimeout(to); }
    }
  };
  /* vision: the facilio.work platform model call (ctx.llm) pointed at a multimodal model from the platform allowlist, used ONLY to read pictures, and only when
     the allowlist (ctx.llm.models) names it. It needs no key. It is not in PROVIDERS (nobody picks it as the default for text); choose() reaches for it when an
     operation needs an image and Claude is not configured. Whether the platform accepts picture input for this model is checked by Admin > AI > Check image reading,
     and a refusal is reported as such, never hidden. */
  const vision = {
    id: 'vision', name: NAMES.vision, caps: { text: true, json: true, image: true, stream: false, tools: false, contextChars: 14000, maxOut: 3000 },
    async models() { return deepseek.models(); },
    async configured() { if (!(ctx() && typeof ctx().llm === 'function')) return false; const l = await this.models(); return !!l && l.includes(DEFAULT_MODEL.vision); },   // only when the platform allowlist names the model: an unreadable list means we cannot promise image reading
    async generate(q) {
      const messages = (q.system ? [{ role: 'system', content: q.system }] : []).concat(q.messages.map(m => ({ role: m.role, content: Array.isArray(m.content) ? m.content.map(x => (x && x.type === 'image' && x.source ? { type: 'image_url', image_url: { url: 'data:' + x.source.media_type + ';base64,' + x.source.data } } : { type: 'text', text: String(x && x.text || '') })) : m.content })));
      const body = { model: q.model || DEFAULT_MODEL.vision, messages, max_tokens: Math.min(q.maxTokens, this.caps.maxOut), temperature: q.temperature == null ? 0.1 : q.temperature };
      let r; try { r = await timeBox(ctx().llm(body), q.timeoutMs); }
      catch (e) { if (e instanceof AIFail) throw e; const st = Number(e && (e.status || e.statusCode)) || 0; const m = String(e && e.message || e); log('vision call failed', (st || '') + ' ' + m.slice(0, 160));
        if (st === 429 || /rate|limit|quota|cap/i.test(m)) throw new AIFail('rate_limited', 'You have reached the AI limit for now. Wait a minute and try again.');
        if (st === 400 || st === 404 || st === 415 || st === 422) throw new AIFail('unsupported', 'The platform image model did not accept this picture. Use My Claude instead: it sends the picture and the prompt to your own Claude.');
        throw new AIFail('unavailable', 'The image model could not be reached. Try again, or use My Claude.'); }
      const text = r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content; const t = typeof text === 'string' ? text : Array.isArray(text) ? text.map(x => x && x.text || '').join('') : '';
      if (!t) throw new AIFail('empty', 'The image model returned no text');
      return { text: t, model: r.model || body.model, usage: r.usage ? { in: r.usage.prompt_tokens || r.usage.input_tokens, out: r.usage.completion_tokens || r.usage.output_tokens } : null };
    }
  };
  const ADAPTERS = { deepseek, claude, vision };

  // ---------- provider choice ----------
  // asked: an explicit provider from the person (honoured exactly, or refused with a reason); otherwise the route for the
  // operation's group, then the organisation default. A default that cannot do the operation (no key, no image reading) moves to
  // a provider that can, and the result says so; an explicit choice never moves.
  async function choose(op, asked) {
    const O = OPS[op]; if (!O) throw new AIFail('bad_request', 'Unknown AI operation');
    const cfg = await config(); const explicit = PROVIDERS.includes(asked);
    const can = async p => (await ADAPTERS[p].configured()) && O.needs.every(n => ADAPTERS[p].caps[n]);
    if (explicit) {
      const a = ADAPTERS[asked];
      if (!(await a.configured())) throw new AIFail('not_configured', a.name + ' is not configured. ' + (asked === 'claude' ? 'The app owner adds the Claude key in the secrets portal, or an admin saves it under Admin › AI provider.' : ''));
      const miss = O.needs.find(n => !a.caps[n]); if (miss) throw new AIFail('unsupported', a.name + (miss === 'image' ? ' reads text only, so it cannot read images.' : ' cannot do this operation.'));
      return { provider: asked, model: modelFor(cfg, asked), explicit: true, cfg, why: 'chosen' };
    }
    const route = cfg.routes[O.group]; const want = route !== 'default' ? route : cfg.defaultProvider;
    if (await can(want)) return { provider: want, model: modelFor(cfg, want), explicit: false, cfg, why: route !== 'default' ? 'route' : 'default' };
    // a default without a key quietly means DeepSeek (Admin › AI provider already shows it that way); a default that lacks the capability is named in a notice
    const wantReady = await ADAPTERS[want].configured();
    for (const p of PROVIDERS) if (p !== want && await can(p)) return { provider: p, model: modelFor(cfg, p), explicit: false, cfg, why: 'capable', moved: wantReady ? { from: want } : null };
    const needImage = O.needs.includes('image');
    if (needImage && await can('vision')) return { provider: 'vision', model: DEFAULT_MODEL.vision, explicit: false, cfg, why: 'capable', moved: null };
    throw new AIFail(needImage ? 'not_configured' : 'unavailable', needImage ? 'No image-reading model is available to the app right now (DeepSeek, the default here, reads text only). Use My Claude: it sends the picture and a ready-made prompt to your own Claude, using your existing subscription.' : 'No AI provider is available.');
  }

  /* generate: one model call with the shared rules.
     q: { op, provider? (explicit), system, messages, maxTokens, temperature?, budget (ms left for the whole call), smaller?() -> { system, messages } for the fallback provider's context size }
     Retries once (after a short pause) when the error is retryable and the time left allows. Falls back from Claude to DeepSeek only when the
     organisation fallback policy allows it (Admin › AI provider; off by default), never for image reading or a refused request, and the result
     then carries a notice saying which provider wrote it. */
  async function generate(q) {
    const budget = q.budget || 21000; const t0 = Date.now(); const left = () => budget - (Date.now() - t0);
    const pv = q.pv || await choose(q.op, q.provider); const A = ADAPTERS[pv.provider];
    // Circuit breaker: after 6 failures in a row the provider is skipped for 30 seconds, so people get a quick, plain answer instead of waiting through retries.
    // shortcut: kept in memory per running instance, not shared between instances; move it to the database if the service ever runs many instances.
    const once = async (adapter, model, req, retried) => {
      const br = BREAKER[adapter.id] || (BREAKER[adapter.id] = { fails: 0, until: 0 });
      if (br.until > Date.now() && !(env.noBreaker && env.noBreaker())) { const e = new AIFail('unavailable', NAMES[adapter.id] + ' is not answering, so it is paused for a short while. Try again in half a minute.'); e.retryable = false; e.retryAfter = Math.ceil((br.until - Date.now()) / 1000); throw e; }
      try { const out = await adapter.generate(Object.assign({ model, timeoutMs: Math.max(4000, Math.min(21000, left() - 1000)) }, req)); br.fails = 0; await note(adapter.id, true, out.usage, null, retried); return Object.assign(out, { provider: adapter.name, providerId: adapter.id }); }
      catch (e) { const f = e instanceof AIFail ? e : new AIFail('unavailable', 'The AI service failed.'); if (['unavailable', 'timeout', 'empty'].includes(f.code) && ++br.fails >= 6) { br.until = Date.now() + 30000; br.fails = 0; } await note(adapter.id, false, null, f.code, retried); throw f; }
    };
    const run = async (adapter, model, req) => {
      try { return await once(adapter, model, req, false); }
      catch (e) {
        // a rate limit is shared by the whole account and lasts about a minute: asking again two seconds later only adds to the pile. Fail fast and say how long to wait
        // (20 seconds when the service did not say), so the page can wait and try again by itself. Only a very short stated wait is worth retrying here.
        if (e.code === 'rate_limited') { if (!e.retryAfter) e.retryAfter = 20; if (e.retryAfter > 3 || left() < e.retryAfter * 1000 + 8000) throw e; }
        const wait = e.code === 'rate_limited' ? Math.min(2500, Math.max(800, (e.retryAfter || 0) * 1000)) : 600;
        if (!e.retryable || left() < wait + 8000) throw e; await sleep(wait); return once(adapter, model, req, true); }
    };
    const req = { system: q.system, messages: q.messages, maxTokens: q.maxTokens, temperature: q.temperature };
    try { const out = await run(A, pv.model, req); if (pv.moved) out.notice = NAMES[pv.moved.from] + ' cannot do this here, so ' + A.name + ' did it.'; return out; }
    catch (e) {
      const may = pv.provider === 'claude' && pv.cfg.fallback === 'deepseek' && !OPS[q.op].needs.includes('image') && e.code !== 'bad_request' && left() > 6000;
      if (!may) throw e;
      const small = q.smaller ? await q.smaller() : req; const out = await once(deepseek, modelFor(pv.cfg, 'deepseek'), Object.assign({}, req, small), false);
      out.notice = 'Claude was not available (' + e.message + ') so DeepSeek produced this, as the organisation fallback setting allows.'; out.fellBack = true; return out;
    }
  }
  /* generateJSON: generate, then parse and validate. validate(obj) returns the cleaned object or throws. One repair attempt when the answer is
     not valid and time allows; never returns an unvalidated answer and never fills a missing field with a guess. */
  async function generateJSON(q, validate) {
    const t0 = Date.now(); const budget = q.budget || 21000; const pv = await choose(q.op, q.provider);
    const parse = text => { const m = String(text || '').match(/[[{][\s\S]*[\]}]/); if (!m) throw new AIFail('invalid_output', 'The AI answer was not in the expected format.'); let j; try { j = JSON.parse(m[0]); } catch (e) { throw new AIFail('invalid_output', 'The AI answer was not valid JSON.'); } return validate(j); };
    const out = await generate(Object.assign({}, q, { pv, budget }));
    try { return Object.assign({}, out, { data: parse(out.text) }); }
    catch (e) {
      if (!(e instanceof AIFail) || Date.now() - t0 > budget - 9000) throw e instanceof AIFail ? e : new AIFail('invalid_output', 'The AI answer did not match what was asked.');
      const again = await generate(Object.assign({}, q, { pv, budget: budget - (Date.now() - t0), messages: q.messages.concat([{ role: 'assistant', content: String(out.text).slice(0, 4000) }, { role: 'user', content: 'That answer could not be used (' + e.message + '). Reply again with only the JSON object in the required shape, nothing else.' }]) }));
      return Object.assign({}, again, { data: parse(again.text), repaired: true });
    }
  }

  async function status() {
    const cfg = await config(); const out = [];
    for (const p of PROVIDERS) { const a = ADAPTERS[p]; out.push({ id: p, name: a.name, configured: await a.configured(), caps: a.caps, model: modelFor(cfg, p), defaultModel: DEFAULT_MODEL[p] }); }
    const def = out.find(x => x.id === cfg.defaultProvider && x.configured) ? cfg.defaultProvider : 'deepseek';
    return { providers: out.map(x => Object.assign(x, { isDefault: x.id === def })), defaultProvider: def, fallback: cfg.fallback, routes: cfg.routes, groups: GROUPS };
  }
  // saving the configuration: everything is validated before it is stored; a provider without a key cannot be made the default or a route
  async function saveConfig(b, by) {
    for (const k of Object.keys(BREAKER)) delete BREAKER[k];   // an admin changing the setup clears any pause
    const cur = await config(); b = b || {};
    const dp = b.defaultProvider === undefined ? cur.defaultProvider : String(b.defaultProvider); if (!PROVIDERS.includes(dp)) throw new AIFail('bad_request', 'Choose DeepSeek or Claude');
    const fb = b.fallback === undefined ? cur.fallback : String(b.fallback); if (!['none', 'deepseek'].includes(fb)) throw new AIFail('bad_request', 'Choose a fallback option');
    const routes = Object.assign({}, cur.routes); if (b.routes && typeof b.routes === 'object') for (const g of Object.keys(GROUPS)) if (b.routes[g] !== undefined) { const v = String(b.routes[g]); if (v !== 'default' && !PROVIDERS.includes(v)) throw new AIFail('bad_request', 'Unknown provider for ' + GROUPS[g]); routes[g] = v; }
    const needClaude = dp === 'claude' || Object.values(routes).includes('claude');
    if (needClaude && !(await claude.configured())) throw new AIFail('not_configured', 'Claude is not configured yet, so it cannot be used by default or for a group. Add the key first.');
    if (routes.vision === 'deepseek') throw new AIFail('unsupported', 'DeepSeek reads text only, so it cannot read images.');
    const models = Object.assign({}, cur.models);
    if (b.models && typeof b.models === 'object') {
      if (b.models.deepseek !== undefined) { const m = String(b.models.deepseek || '').trim(); if (m && !/^[a-z0-9][a-z0-9._:-]{2,80}$/i.test(m)) throw new AIFail('bad_request', 'That is not a model name'); if (m) { const live = await deepseek.models(); if (live && !live.includes(m)) throw new AIFail('bad_request', 'The platform does not offer "' + m + '". It offers: ' + live.slice(0, 8).join(', ')); } models.deepseek = m; }
      if (b.models.claude !== undefined) { const m = String(b.models.claude || '').trim(); if (m && !/^claude-[a-z0-9.-]{2,80}$/i.test(m)) throw new AIFail('bad_request', 'Claude model names start with claude-'); if (m) { const key = await claudeKey(); if (key) { const v = await claude.verify(key); if (v.ok && !v.models.includes(m)) throw new AIFail('bad_request', 'This key cannot use "' + m + '". It can use: ' + v.models.slice(0, 6).join(', ')); } } models.claude = m; }
    }
    const val = { defaultProvider: dp, fallback: fb, models, routes, by, at: now() }; await env.db.put('ai', 'cfg', val); return config();
  }
  // when the Claude key goes away, nothing may keep pointing at Claude
  async function dropClaude(by) { const c = await config(); if (await claude.configured()) return; const routes = Object.fromEntries(Object.entries(c.routes).map(([g, v]) => [g, v === 'claude' ? 'default' : v])); await env.db.put('ai', 'cfg', { defaultProvider: 'deepseek', fallback: c.fallback, models: c.models, routes, by, at: now() }); }

  // Admin check: does the platform accept a picture for the vision model? A solid red square is sent; the answer must say red.
  async function visionProbe() { const RED = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR4nGO4IyJCEmIY1TCqYfhqAAACcQQQFwFJQgAAAABJRU5ErkJggg=='; const t0 = Date.now();
    if (!(await vision.configured())) return { ok: false, model: DEFAULT_MODEL.vision, message: 'The platform model list does not include ' + DEFAULT_MODEL.vision + ', so images cannot be read in the app. Use My Claude is the way to read pictures.' };
    try { const out = await vision.generate({ system: 'Answer with one word.', messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: RED } }, { type: 'text', text: 'What colour is the square in this picture? One word.' }] }], maxTokens: 12, timeoutMs: 20000 });
      const red = /red/i.test(out.text); return { ok: red, model: out.model, ms: Date.now() - t0, message: red ? 'The platform accepted a picture and described it correctly (' + out.model + '). "Read the diagram" can use it.' : 'The model answered, but not correctly ("' + String(out.text).slice(0, 40) + '"), so it cannot be trusted to read diagrams. Use My Claude.' };
    } catch (e) { return { ok: false, model: DEFAULT_MODEL.vision, message: e instanceof AIFail ? e.message : 'The check failed' }; } }
  return { resetBreaker: () => { for (const k of Object.keys(BREAKER)) delete BREAKER[k]; }, visionProbe, choose, generate, generateJSON, status, config, saveConfig, dropClaude, usage, keySource, claudeKey, sealKey, masterKey, verifyClaude: k => claude.verify(k), adapters: ADAPTERS, names: NAMES, defaultModel: DEFAULT_MODEL };
}
