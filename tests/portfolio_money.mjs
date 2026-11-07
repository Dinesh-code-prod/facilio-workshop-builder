// The admin finance view: money per project comes from the contract fee milestones and change-request prices, in the project's own currency.
import assert from 'node:assert/strict'; import { assess } from '../work/server/_portfolio.mjs';
const today = '2026-11-07'; const it = (kind, id, data) => ({ kind, id, data });
const base = { p: { id: 'p1', name: 'X', currency: 'INR' }, plan: null, controls: {}, items: [] };
assert.equal(assess(base, today).metrics.money, null, 'nothing recorded -> no money');
const r = assess(Object.assign({}, base, { items: [it('ctrfees', 'main', { milestones: [{ amount: '300,000', date: '2026-10-01' }, { amount: '400000', date: '2026-11-20' }, { amount: '300000' }] }), it('cr', 'c1', { status: 'CR Converted', price: 50000 }), it('cr', 'c2', { status: 'Proposed', price: '20000' }), it('cr', 'c3', { status: 'Rejected', price: 999 })] }), today).metrics.money;
assert.deepEqual(r, { currency: 'INR', contract: 1000000, billed: 300000, next60: 400000, undated: 300000, crConverted: 50000, crPending: 20000 });
assert.equal(assess(Object.assign({}, base, { p: { id: 'p2', name: 'Y' }, items: [it('ctrrates', 'main', { currency: 'AED' }), it('cr', 'c1', { status: 'Requested', price: 5 })] }), today).metrics.money.currency, 'AED', 'rate card currency is the fallback');
console.log('portfolio money ok');
