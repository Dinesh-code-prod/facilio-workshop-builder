// Routing evaluation set (work/server/_route.mjs): representative requests, the model's first reading of each, and the engine and level they must get.
// Add a row whenever a request was routed badly in real use; the set is the record of what "right" means.
import assert from 'node:assert/strict'; import { assess, TIERS } from '../work/server/_route.mjs';
const at = t => TIERS.indexOf(t);
const CASES = [
  // [message, model reading, engine, lowest level, highest level]
  ['Rewrite this short email to Sara so it sounds friendlier: we will share the plan next week.', 'small', 'deepseek', 'simple', 'standard'],
  ['Summarize the project decisions', 'lookup', 'project', 'simple', 'standard'],
  ['Rewrite this to sound friendlier: we will share the plan next week.', 'lookup', 'deepseek', 'simple', 'standard'],   // the model (or the plain rules) may call it a look-up; text work on supplied text is still DeepSeek's
  ['Extract the dates and owners from this text: kick-off 12 Nov (Ravi), BRD sign-off 30 Nov (Sara)', 'small', 'deepseek', 'simple', 'standard'],
  ['Analyze the three workshop transcripts and list the open decisions for every module', 'heavy', 'claude', 'complex', 'critical'],
  ['Compare the BRD with the current organization configuration', 'heavy', 'claude', 'complex', 'critical'],
  ['Generate a complete solution architecture for all modules', 'heavy', 'claude', 'complex', 'critical'],
  ['Which customer inputs are still pending?', 'lookup', 'project', 'simple', 'standard'],
  ['Debug why this Facilio script fails when a work order is saved', 'small', 'claude', 'advanced', 'critical'],
  ['Turn this list into a table: chillers, AHUs, pumps', 'small', 'deepseek', 'simple', 'standard'],
  ['Validate the cross-module workflow between work orders and inventory', 'heavy', 'claude', 'complex', 'critical'],
  ['Explain why this work order transition is not happening', 'lookup', 'claude', 'advanced', 'critical'],
  ['Identify missing permissions for the technician role', 'lookup', 'claude', 'advanced', 'critical'],
  ['Prepare UAT scenarios for the Work Order module', 'small', 'claude', 'standard', 'critical'],
  ['Send the UAT plan to the customer', 'small', 'claude', 'advanced', 'critical'],
  ['How do I approve a BRD?', 'help', 'project', 'simple', 'standard'],
  ['Where is the kick-off deck?', 'lookup', 'project', 'simple', 'simple']
];
let n = 0, bad = [];
for (const [msg, route, engine, lo, hi] of CASES) { const r = assess(msg, route); n++; if (r.engine !== engine || at(r.tier) < at(lo) || at(r.tier) > at(hi)) bad.push(`"${msg.slice(0, 50)}" (${route}) gave ${r.engine}/${r.tier}, expected ${engine} ${lo}..${hi}`); }
assert.deepEqual(bad, [], bad.join('\n'));
console.log('  ok  ' + n + ' representative requests get the expected engine and level');
// every result is well formed, and odd input never throws
for (const x of [undefined, '', 42, 'x'.repeat(5000)]) { const r = assess(x, 'nonsense'); assert.ok(TIERS.includes(r.tier) && ['project', 'deepseek', 'claude'].includes(r.engine) && typeof r.why === 'string'); }
console.log('  ok  odd input gives a well-formed answer');
// a change that reaches the customer or money is never simple; a heavy job is at least complex
assert.ok(at(assess('Change the fee in the contract summary', 'small').tier) >= 2); assert.ok(at(assess('Redo the plan', 'heavy').tier) >= 3);
console.log('  ok  risky changes are at least advanced, heavy work at least complex');
// the level travels with a chat job and the brief tells Claude what it asks of it; a made-up level is dropped
const J = await import('../work/server/_jobs.mjs');
assert.ok(TIERS.every(t => J.LEVEL_MEANS[t] && J.LEVEL_MEANS[t].length > 20));
const c = J.cleanRequest({ kind: 'chat', note: 'Send the UAT plan to the customer', tier: 'critical' }); assert.equal(c.params.tier, 'critical'); assert.equal(J.cleanRequest({ kind: 'chat', note: 'x y z', tier: 'urgent' }).params.tier, undefined);
const b = J.brief({ id: 'j1', kind: 'chat', params: c.params, status: 'waiting' }, { id: 'p1', name: 'P' }); assert.equal(b.level, 'critical'); assert.ok(/needs_input/.test(b.levelMeans));
console.log('  ok  the level travels with a chat job and the brief says what it asks of Claude');
// the admin assistant: admins only, the portfolio evidence only, and Otto reminders only by an admin who is allowed to change things
const fs = await import('node:fs'); const api = fs.readFileSync(new URL('../work/server/api.mjs', import.meta.url), 'utf8');
const seg = (a, b) => { const i = api.indexOf(a); assert.ok(i > 0, 'missing ' + a); return api.slice(i, api.indexOf(b, i + a.length)); };
assert.ok(/requireAdmin\('sub'\)/.test(seg("route('POST', '/api/admin/assistant/ask'", 'route(')) && /requireAdmin\('admin'\)/.test(seg("route('POST', '/api/admin/assistant/nudge'", 'route(')) && /requireAdmin\('sub'\)/.test(seg("route('GET', '/api/admin/alerts'", 'route(')));
assert.ok(/s\.adminRole !== 'sub'/.test(seg("route('POST', '/api/admin/assistant/ask'", 'route(')), 'a read-only admin is not offered the Send button');
console.log('  ok  the admin assistant is for admins only, and only a full admin can send Otto reminders');
console.log('5 routing evaluation checks passed');
