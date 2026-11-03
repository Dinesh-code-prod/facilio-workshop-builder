// The shared AI layer (work/server/_ai.mjs) on its own, with a fake platform: provider choice and capabilities, configuration
// validation, the Anthropic request format, retries, the fallback policy, structured output validation and repair, and a guard
// that no feature calls a provider outside the layer. No real provider is called.
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { createAI, AIFail, OPS } from '../work/server/_ai.mjs';
const db = new Map(); let llmCalls = [], llmImpl = null, KEY = '', MASTER = '';
const ctx = { secrets: { async get(k) { return k === 'anthropic_api_key' ? KEY : k === 'ai_master_key' ? MASTER : ''; } },
  llm: Object.assign(async (b) => { llmCalls.push(b); if (llmImpl) return llmImpl(b); return { model: b.model || 'deepseek.v3.2', choices: [{ message: { content: 'DS ok' } }], usage: { prompt_tokens: 5, completion_tokens: 2 } }; }, { models: async () => ['deepseek.v3.2', 'qwen.qwen3-235b-a22b-2507'] }) };
const AI = createAI({ ctx: () => ctx, db: { get: async (c, k) => (db.has(c + '/' + k) ? { value: JSON.parse(db.get(c + '/' + k)) } : null), put: async (c, k, v) => db.set(c + '/' + k, JSON.stringify(v)), del: async (c, k) => db.delete(c + '/' + k) }, now: () => new Date().toISOString() });
const real = globalThis.fetch; let fetches = [], fetchImpl = null;
globalThis.fetch = async (u, o) => { fetches.push({ u: String(u), o }); return fetchImpl(String(u), o); };
const resp = (status, j, h = {}) => ({ ok: status < 300, status, headers: { get: k => h[k.toLowerCase()] }, json: async () => j });
let n = 0; const t = async (name, fn) => { AI.resetBreaker(); llmCalls = []; fetches = []; llmImpl = null; fetchImpl = null; await fn(); n++; console.log('  ok  ' + name); };
const rejects = async (p, code) => { try { await p; } catch (e) { assert.ok(e instanceof AIFail, 'normalised error, got ' + e); assert.equal(e.code, code, e.message); return e; } assert.fail('expected ' + code); };
const msg = [{ role: 'user', content: 'hello' }];

await t('DeepSeek is the default and goes through the platform model with the platform default model', async () => {
  const st = await AI.status(); assert.equal(st.defaultProvider, 'deepseek'); assert.equal(st.providers.find(p => p.id === 'claude').configured, false);
  const out = await AI.generate({ op: 'document', system: 'SYS', messages: msg, maxTokens: 50 });
  assert.equal(out.provider, 'DeepSeek'); assert.equal(llmCalls.length, 1); assert.equal(llmCalls[0].model, undefined, 'no model sent unless changed on purpose');
  assert.deepEqual(llmCalls[0].messages[0], { role: 'system', content: 'SYS' }); assert.equal(fetches.length, 0);
});
await t('a missing Claude key never stops DeepSeek; explicit Claude is refused with a clear reason', async () => {
  await rejects(AI.generate({ op: 'document', provider: 'claude', messages: msg, maxTokens: 10 }), 'not_configured');
  await rejects(AI.saveConfig({ defaultProvider: 'claude' }, 'a'), 'not_configured');
  await rejects(AI.saveConfig({ routes: { documents: 'claude' } }, 'a'), 'not_configured');
  assert.equal((await AI.generate({ op: 'assist', messages: msg, maxTokens: 10 })).provider, 'DeepSeek');
});
await t('capabilities: image reading needs a provider that reads images', async () => {
  const img = [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } }, { type: 'text', text: 'x' }] }];
  await rejects(AI.generate({ op: 'vision', messages: img, maxTokens: 10 }), 'not_configured');
  await rejects(AI.generate({ op: 'vision', provider: 'deepseek', messages: img, maxTokens: 10 }), 'unsupported');
  await rejects(AI.saveConfig({ routes: { vision: 'deepseek' } }, 'a'), 'unsupported');
  assert.equal(llmCalls.length, 0, 'DeepSeek is never sent an image');
  assert.ok(Object.values(OPS).every(o => o.needs.includes('text')));
});
await t('pictures without Claude: the platform vision model is used only when the allowlist names it, gets the picture as an image_url, and a refusal is reported plainly', async () => {
  const img = [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } }, { type: 'text', text: 'x' }] }]; const was = ctx.llm.models;
  try {
    const e = await rejects(AI.generate({ op: 'vision', messages: img, maxTokens: 10 }), 'not_configured'); assert.match(e.message, /Use My Claude/); assert.ok(!/API key|Admin/i.test(e.message), 'no demand for a Claude API key');
    ctx.llm.models = async () => ['deepseek.v3.2', 'moonshotai.kimi-k2.5']; llmImpl = (b) => ({ model: b.model, choices: [{ message: { content: '{"nodes":[]}' } }], usage: { prompt_tokens: 3, completion_tokens: 1 } });
    const out = await AI.generate({ op: 'vision', messages: img, maxTokens: 10 }); assert.equal(out.provider, 'the platform vision model'); assert.equal(llmCalls[0].model, 'moonshotai.kimi-k2.5');
    const part = llmCalls[0].messages[0].content[0]; assert.equal(part.type, 'image_url'); assert.equal(part.image_url.url, 'data:image/png;base64,AAAA');
    await rejects(AI.generate({ op: 'vision', provider: 'deepseek', messages: img, maxTokens: 10 }), 'unsupported');   // DeepSeek itself is still never sent a picture
    llmImpl = () => { const er = new Error('image input not supported'); er.status = 400; throw er; }; const r = await rejects(AI.generate({ op: 'vision', messages: img, maxTokens: 10 }), 'unsupported'); assert.match(r.message, /Use My Claude/);
    llmImpl = () => ({ model: 'moonshotai.kimi-k2.5', choices: [{ message: { content: 'Red' } }] }); const pr = await AI.visionProbe(); assert.equal(pr.ok, true);
    llmImpl = () => ({ model: 'moonshotai.kimi-k2.5', choices: [{ message: { content: 'Blue' } }] }); assert.equal((await AI.visionProbe()).ok, false, 'a wrong answer is not a pass');
    ctx.llm.models = async () => ['deepseek.v3.2']; assert.equal((await AI.visionProbe()).ok, false);
  } finally { ctx.llm.models = was; }
});
await t('Anthropic request format: system apart, model from configuration, key only in the header', async () => {
  KEY = 'sk-ant-test-LAYER-0001';
  fetchImpl = (u) => u.endsWith('/models?limit=50') ? resp(200, { data: [{ id: 'claude-sonnet-5-5' }, { id: 'claude-opus-5-5' }] }) : resp(200, { model: 'claude-opus-5-5', content: [{ type: 'text', text: 'C ok' }], usage: { input_tokens: 9, output_tokens: 3 } });
  await rejects(AI.saveConfig({ models: { claude: 'claude-made-up-9' } }, 'a'), 'bad_request');
  await AI.saveConfig({ models: { claude: 'claude-opus-5-5' } }, 'a');
  const out = await AI.generate({ op: 'document', provider: 'claude', system: 'SYS', messages: [{ role: 'system', content: 'ignored here' }, ...msg].filter(m => m.role !== 'system'), maxTokens: 99999, temperature: 0.1 });
  const call = fetches.find(f => f.u.endsWith('/messages')); const body = JSON.parse(call.o.body);
  assert.equal(body.model, 'claude-opus-5-5'); assert.equal(body.system, 'SYS'); assert.deepEqual(body.messages, msg); assert.equal(body.max_tokens, 8000, 'capped at the adapter maximum'); assert.equal(body.temperature, 0.1);
  assert.equal(call.o.headers['x-api-key'], KEY); assert.equal(call.o.headers['anthropic-version'], '2023-06-01'); assert.ok(!call.o.body.includes(KEY));
  assert.equal(out.provider, 'Claude'); assert.equal(out.model, 'claude-opus-5-5');
  const u = await AI.usage(); assert.equal(u.claude.inTok, 9); assert.ok(!JSON.stringify(u).includes(KEY));
  await AI.saveConfig({ models: { claude: '' } }, 'a');
});
await t('Anthropic errors are normalised; a rate limit is retried once, an auth error is not', async () => {
  let k = 0; fetchImpl = () => (++k === 1 ? resp(429, {}, { 'retry-after': '1' }) : resp(200, { content: [{ type: 'text', text: 'second try' }] }));
  const out = await AI.generate({ op: 'assist', provider: 'claude', messages: msg, maxTokens: 10, budget: 21000 }); assert.equal(out.text, 'second try'); assert.equal(k, 2);
  k = 0; fetchImpl = () => { k++; return resp(401, {}); }; await rejects(AI.generate({ op: 'assist', provider: 'claude', messages: msg, maxTokens: 10 }), 'auth'); assert.equal(k, 1, 'auth errors are not retried');
  fetchImpl = () => resp(400, { error: { message: 'model: not found' } }); await rejects(AI.generate({ op: 'assist', provider: 'claude', messages: msg, maxTokens: 10 }), 'bad_request');
  fetchImpl = () => resp(200, { content: [] }); await rejects(AI.generate({ op: 'assist', provider: 'claude', messages: msg, maxTokens: 10, budget: 6000 }), 'empty');
  fetchImpl = () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; }; await rejects(AI.generate({ op: 'assist', provider: 'claude', messages: msg, maxTokens: 10 }), 'timeout');
  const u = await AI.usage(); assert.ok(u.claude.retries >= 1); assert.ok(u.claude.errors >= 4);
});
await t('fallback to DeepSeek only by policy, with a notice, and never for images', async () => {
  fetchImpl = () => resp(503, {});
  await rejects(AI.generate({ op: 'document', provider: 'claude', messages: msg, maxTokens: 10 }), 'unavailable');
  await AI.saveConfig({ fallback: 'deepseek', defaultProvider: 'claude' }, 'a');
  const out = await AI.generate({ op: 'document', messages: [{ role: 'user', content: 'BIG' }], maxTokens: 10, smaller: async () => ({ messages: [{ role: 'user', content: 'SMALL' }] }) });
  assert.equal(out.provider, 'DeepSeek'); assert.match(out.notice, /Claude was not available/); assert.equal(llmCalls.at(-1).messages.at(-1).content, 'SMALL', 'the fallback gets the DeepSeek-sized context');
  const img = [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } }] }];
  await rejects(AI.generate({ op: 'vision', messages: img, maxTokens: 10 }), 'unavailable'); assert.ok(llmCalls.every(c => !JSON.stringify(c).includes('image')));
  await AI.saveConfig({ fallback: 'none', defaultProvider: 'deepseek' }, 'a');
});
await t('routes send one group of operations to another provider without changing the default', async () => {
  fetchImpl = () => resp(200, { content: [{ type: 'text', text: 'claude analysis' }] });
  await AI.saveConfig({ routes: { analysis: 'claude' } }, 'a');
  assert.equal((await AI.generate({ op: 'assist', messages: msg, maxTokens: 10 })).provider, 'Claude');
  assert.equal((await AI.generate({ op: 'document', messages: msg, maxTokens: 10 })).provider, 'DeepSeek');
  KEY = ''; assert.equal((await AI.generate({ op: 'assist', messages: msg, maxTokens: 10 })).provider, 'DeepSeek', 'a route to Claude without a key uses DeepSeek');
  await AI.dropClaude('a'); assert.equal((await AI.config()).routes.analysis, 'default', 'removing the key clears routes to Claude');
});
await t('DeepSeek model changes are checked against the platform list', async () => {
  await rejects(AI.saveConfig({ models: { deepseek: 'gpt-9-made-up' } }, 'a'), 'bad_request');
  await AI.saveConfig({ models: { deepseek: 'qwen.qwen3-235b-a22b-2507' } }, 'a'); await AI.generate({ op: 'document', messages: msg, maxTokens: 10 }); assert.equal(llmCalls.at(-1).model, 'qwen.qwen3-235b-a22b-2507');
  await AI.saveConfig({ models: { deepseek: '' } }, 'a');
  llmImpl = () => { const e = new Error('Too many requests'); e.status = 429; throw e; }; await rejects(AI.generate({ op: 'document', messages: msg, maxTokens: 10, budget: 5000 }), 'rate_limited');
});
await t('structured output: validated, repaired once, never passed through unchecked', async () => {
  const valid = j => { if (!Array.isArray(j.items)) throw new AIFail('invalid_output', 'items missing'); return { items: j.items.map(String) }; };
  let k = 0; llmImpl = () => ({ choices: [{ message: { content: ++k === 1 ? 'Sure! here it is: {"nope": 1}' : '{"items": ["a", 2]}' } }] });
  const out = await AI.generateJSON({ op: 'classify', messages: msg, maxTokens: 50 }, valid); assert.deepEqual(out.data, { items: ['a', '2'] }); assert.equal(out.repaired, true);
  llmImpl = () => ({ choices: [{ message: { content: 'no json at all' } }] }); await rejects(AI.generateJSON({ op: 'classify', messages: msg, maxTokens: 50 }, valid), 'invalid_output');
});
await t('no feature calls a provider outside the shared layer', async () => {
  const files = ['work/server/api.mjs', ...fs.readdirSync('src').filter(f => f.endsWith('.js')).map(f => 'src/' + f)];
  for (const f of files) { const s = fs.readFileSync(f, 'utf8'); assert.ok(!/api\.anthropic\.com|api\.deepseek\.com|CTX\.llm\(|ctx\.llm\(/.test(s), f + ' calls a provider directly'); }
});
await t('after six failures in a row the provider is paused and the next call fails at once', async () => {
  llmImpl = () => { throw Object.assign(new Error('down'), { status: 503 }); };
  for (let i = 0; i < 6; i++) { try { await AI.generate({ op: 'document', messages: msg, maxTokens: 10 }); } catch (e) { /* expected */ } }
  llmCalls = []; await rejects(AI.generate({ op: 'document', messages: msg, maxTokens: 10 }), 'unavailable');
  assert.equal(llmCalls.length, 0, 'a paused provider is not called');
});
await t('a DeepSeek call that takes too long says so in plain words', async () => {
  llmImpl = () => new Promise(() => { });
  const e = await rejects(AI.generate({ op: 'document', messages: msg, maxTokens: 10, budget: 5000 }), 'timeout'); assert.match(e.message, /took too long/); assert.doesNotMatch(e.message, /time box/);
});
await t('an error that only contains the letters of rate or limit is not reported as a rate limit', async () => {
  llmImpl = () => { const e = new Error('failed to generate: context length exceeded, separate capacity'); e.status = 500; throw e; };
  const e = await rejects(AI.generate({ op: 'document', messages: msg, maxTokens: 10 }), 'unavailable'); assert.doesNotMatch(e.message, /AI limit/);
  llmImpl = () => { const e = new Error('Too many requests, slow down'); e.status = 500; throw e; }; await rejects(AI.generate({ op: 'document', messages: msg, maxTokens: 10 }), 'rate_limited');
});
await t('structured output: a code fence is tolerated, a validator that throws a plain error is repaired once, a cut-off answer says so', async () => {
  llmImpl = () => ({ choices: [{ message: { content: 'Here:\n```json\n{"a": 1}\n```' } }] }); assert.deepEqual((await AI.generateJSON({ op: 'classify', messages: msg, maxTokens: 50 }, j => j)).data, { a: 1 });
  let k = 0; llmImpl = () => ({ choices: [{ message: { content: ++k === 1 ? '{"x": 1}' : '{"a": 1}' } }] });
  const out = await AI.generateJSON({ op: 'classify', messages: msg, maxTokens: 50 }, j => { if (!j.a) throw new Error('a is missing'); return j; }); assert.equal(out.repaired, true); assert.equal(k, 2);
  llmImpl = () => ({ choices: [{ message: { content: '{"items": [1, 2' }, finish_reason: 'length' }] }); const e = await rejects(AI.generateJSON({ op: 'classify', messages: msg, maxTokens: 50 }, j => j), 'invalid_output'); assert.match(e.message, /cut off/);
});
await t('a plain answer that stopped at the length limit is marked as cut off', async () => {
  llmImpl = () => ({ choices: [{ message: { content: 'half a sentence' }, finish_reason: 'length' }] }); assert.equal((await AI.generate({ op: 'document', messages: msg, maxTokens: 10 })).truncated, true);
  llmImpl = () => ({ choices: [{ message: { content: 'done' }, finish_reason: 'stop' }] }); assert.equal((await AI.generate({ op: 'document', messages: msg, maxTokens: 10 })).truncated, undefined);
});
globalThis.fetch = real; console.log(`\n${n} AI layer checks passed`);
