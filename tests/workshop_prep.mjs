// Workshop preparation (src/workshopprep.js): one session proposal per module, nothing invented, a plain JSON object the Studio can edit and re-render,
// and a self-contained, escaped, customer-friendly HTML page.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const W = require('../src/workshopprep.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const input = () => ({ project: { customer: 'Acme Facilities', name: 'CAFM roll-out' },
  modules: [{ name: 'Work Order', scopeItems: [{ text: 'Create and assign work orders', page: 4, section: '3.1' }, 'Escalate overdue work orders'], requirements: ['Bulk close'], openQuestions: [{ text: 'Who approves escalations?', source: 'Customer e-mail' }] }, { name: 'Asset', scopeItems: [] }],
  sessions: [{ title: 'Work Order workshop', modules: ['work order'], date: '2026-11-25', start: '11:00', minutes: 120, participants: 'Ops leads' }, { title: 'Payroll workshop', modules: ['Payroll'], date: '2026-11-26' }], customerQuestions: ['Which sites go live first?'] });
const LISTS = ['agenda', 'objectives', 'topics', 'customerQuestions', 'informationNeeded', 'expectedDecisions', 'dependencies', 'preparation', 'outputs'];
const allLines = p => p.sessions.flatMap(s => LISTS.flatMap(k => s[k]));

t('one session proposal per module, with every part the roadmap names', () => {
  const p = W.buildWorkshopPrep(input()); assert.equal(p.sessions.length, 2); assert.equal(p.version, 1); p.sessions.forEach(s => { LISTS.forEach(k => assert.ok(Array.isArray(s[k]), k)); assert.ok(s.title && s.module && s.id); });
  const w = p.sessions[0]; ['agenda', 'objectives', 'topics', 'customerQuestions', 'informationNeeded', 'expectedDecisions', 'dependencies', 'preparation', 'outputs'].forEach(k => assert.ok(w[k].length > 0, k));
});
t('topics, questions and decisions come only from the scope items, requirements and open questions given', () => {
  const p = W.buildWorkshopPrep(input()); const w = p.sessions[0];
  assert.deepEqual(w.topics.map(x => x.text), ['Create and assign work orders', 'Escalate overdue work orders', 'Bulk close']); assert.equal(w.topics[0].origin, 'contract'); assert.equal(w.topics[0].source, 'MSA p.4 §3.1'); assert.equal(w.topics[2].origin, 'interpreted');
  const given = ['Who approves escalations?', 'Create and assign work orders', 'Escalate overdue work orders'];
  w.customerQuestions.forEach(q => assert.ok(given.some(g => q.text.includes(g)), 'question not from the input: ' + q.text)); assert.ok(w.customerQuestions.some(q => q.text === 'Who approves escalations?'));
  w.expectedDecisions.forEach(q => assert.ok(given.some(g => q.text.includes(g)), q.text));
  const a = p.sessions[1]; assert.equal(a.topics.length, 0); assert.equal(a.customerQuestions.length, 0); assert.equal(a.expectedDecisions.length, 0);
  assert.deepEqual(p.general.customerQuestions.map(x => x.text), ['Which sites go live first?']);
});
t('standard frames are labelled assumed, and every line has a valid origin', () => {
  const p = W.buildWorkshopPrep(input()); allLines(p).forEach(l => { assert.ok(l.text); assert.ok(['contract', 'interpreted', 'assumed'].includes(l.origin)); }); assert.ok(p.sessions[0].agenda.every(l => l.origin === 'assumed')); assert.ok(p.sessions[0].preparation.every(l => l.origin === 'assumed'));
});
t('a module with no scope items is a gap, and a session that matches no module is a gap, not a guess', () => {
  const p = W.buildWorkshopPrep(input()); assert.ok(p.gaps.some(g => /"Asset" has no scope items/.test(g))); assert.ok(p.gaps.some(g => /Payroll workshop/.test(g))); assert.ok(!p.sessions.some(s => /Payroll/.test(s.module)));
  const e = W.buildWorkshopPrep({}); assert.equal(e.sessions.length, 0); assert.ok(e.gaps.some(g => /No modules/.test(g))); assert.ok(e.gaps.some(g => /customer name/.test(g)));
});
t('a given session carries its date, time, length and people; without sessions the page says so', () => {
  const w = W.buildWorkshopPrep(input()).sessions[0]; assert.equal(w.date, '2026-11-25'); assert.equal(w.start, '11:00'); assert.equal(w.durationMinutes, 120); assert.equal(w.title, 'Work Order workshop'); assert.equal(w.participants, 'Ops leads');
  const x = W.buildWorkshopPrep({ project: { customer: 'A' }, modules: [{ name: 'Asset', scopeItems: ['Asset registry'] }] }); assert.equal(x.sessions[0].date, ''); assert.ok(x.assumptions.some(a => /No session dates/.test(a)));
});
t('the prep is plain JSON that survives an edit and a re-render', () => {
  const p = W.buildWorkshopPrep(input()); const q = JSON.parse(JSON.stringify(p)); assert.deepEqual(q, p); q.sessions[0].objectives.push({ text: 'Agree the escalation chain', origin: 'assumed' }); q.sessions[0].title = 'Work orders: deep dive';
  const h = W.workshopPrepHtml(q); assert.ok(h.includes('Agree the escalation chain') && h.includes('Work orders: deep dive')); assert.ok(!W.workshopPrepHtml(p).includes('Agree the escalation chain'));
});
t('the HTML shows each session, marks contract wording, and leaves empty blocks out', () => {
  const h = W.workshopPrepHtml(W.buildWorkshopPrep(input())); assert.ok(/Work Order requirements workshop|Work Order workshop/.test(h)); assert.ok(h.includes('Create and assign work orders') && h.includes('From your agreement') && h.includes('MSA p.4 §3.1'));
  assert.equal((h.match(/<section class="ses"/g) || []).length, 2); const asset = h.slice(h.lastIndexOf('<section class="ses"')); assert.ok(!/<summary>Topics<\/summary>/.test(asset)); assert.ok(/<summary>Agenda<\/summary>/.test(asset)); assert.ok(h.includes('Print or save as PDF'));
});
t('all text is escaped: script tags, quotes, backticks and event handlers do not survive as markup', () => {
  const evil = '<script>alert(1)</script> "q" \'s\' `b` <img src=x onerror=alert(2)>'; const i = input(); i.project = { customer: evil, name: evil }; i.modules = [{ name: evil, scopeItems: [{ text: evil, page: evil, section: evil }], requirements: [evil], openQuestions: [evil] }]; i.sessions = [{ title: evil, modules: [evil], date: '2026-11-25', participants: evil }]; i.customerQuestions = [evil];
  const h = W.workshopPrepHtml(W.buildWorkshopPrep(i)); const body = h.slice(h.indexOf('<body>'), h.indexOf('<script>', h.indexOf('<body>')));
  assert.ok(!/<script>alert|<img src=x|onerror=alert\(2\)>/.test(body)); assert.ok(body.includes('&lt;script&gt;alert(1)&lt;/script&gt;') && body.includes('&quot;q&quot;') && body.includes('&#39;s&#39;')); assert.equal((h.match(/<script>/g) || []).length, 1, 'only the page script');
  const h2 = W.workshopPrepHtml({ project: { customer: evil }, intro: { heading: evil, text: evil }, sessions: [{ title: evil, agenda: [{ text: evil }], topics: [evil, null, 5, {}], date: evil, start: evil, durationMinutes: evil, participants: evil }] }); assert.ok(!/<img src=x|<script>alert/.test(h2));
});
t('the file asks for nothing from outside, uses Facilio colours and no violet', () => {
  const h = W.workshopPrepHtml(W.buildWorkshopPrep(input())); assert.ok(/default-src 'none'/.test(h)); assert.ok(!/https?:\/\//.test(h.replace(/xmlns="[^"]*"/g, ''))); assert.ok(!/<link|<iframe|<img|@import|url\(|fetch\(|XMLHttpRequest|src=/i.test(h));
  ['#1D1A5E', '#1570EF', '#E5197F', '#8DB8FF'].forEach(c => assert.ok(h.includes(c), c)); const hex = [...new Set(h.match(/#[0-9A-Fa-f]{6}\b/g))]; hex.forEach(c => { const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16); assert.ok(!(b > g + 25 && r > g + 25 && Math.abs(r - b) < 120 && c.toUpperCase() !== '#E5197F' && !/^#(F3B5D2)$/i.test(c)), 'violet-looking colour ' + c); });
});
t('hostile input does not throw', () => {
  [null, undefined, 3, 'x', [], { modules: 'x', sessions: 7, customerQuestions: {} }, { modules: [null, 4, { name: {} }, { name: 'M', scopeItems: [{}, null, { text: {} }, 'ok'], openQuestions: 'x', requirements: [[]] }], sessions: [null, 'x', { modules: 5 }] }, { project: 'x', modules: [{ name: 'M'.repeat(9000), scopeItems: new Array(500).fill('a') }] }].forEach(i => { const p = W.buildWorkshopPrep(i); assert.ok(Array.isArray(p.sessions)); W.workshopPrepHtml(p); });
  [null, undefined, 5, {}, { sessions: [null, 5, { agenda: 'x' }] }].forEach(p => assert.ok(/^<!doctype html>/.test(W.workshopPrepHtml(p))));
});
console.log(`\n${n} workshop preparation checks passed`);
