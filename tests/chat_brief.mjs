// The chat brief: only the playbooks the message is about, all areas readable, scope not limited to one stage.
import assert from 'node:assert/strict'; import { brief, pickPlaybooks } from '../work/server/_jobs.mjs';
const b = text => brief({ id: 'j1', kind: 'chat', params: { note: text, section: 'brd' }, requestedBy: 'a@b.c' }, 'P');
assert.deepEqual(pickPlaybooks('make the kick off html nicer'), ['kickoff']);
assert.ok(Object.keys(b('Update the kick-off deck from the contract').playbooks).join() === 'kickoff');
assert.deepEqual(b('hello').playbooks, {}); assert.ok(b('hello').playbooksNote);
assert.ok(b('x').allowedDocs.includes('solutions') && /any area/.test(b('x').scope));
assert.ok(JSON.stringify(b('hi')).length < 9000, 'the quiet chat brief stays small');
console.log('4 chat brief checks passed');
import { cleanRequest } from '../work/server/_jobs.mjs';
const c1 = cleanRequest({ kind: 'chat', note: 'revamp the BRD', size: 'heavy' }), c2 = cleanRequest({ kind: 'chat', note: 'revamp the BRD' }), c3 = cleanRequest({ kind: 'fetch_mail', note: 'x', size: 'heavy' });
assert.equal(c1.params.size, 'heavy'); assert.notEqual(c1.key, c2.key); assert.equal(c3.params.size, undefined, 'only chat jobs carry a size');
assert.equal(brief({ id: 'j', kind: 'chat', params: { note: 'x', size: 'small' }, requestedBy: 'a@b.c' }, 'P').size, 'small'); assert.equal(b('x').size, 'none');
console.log('3 chat size checks passed');
