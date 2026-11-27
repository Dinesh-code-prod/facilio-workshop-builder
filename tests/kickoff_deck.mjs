// Digital kick-off deck (src/kickoffhtml.js): built only from the data it is given, empty slides are left out and named, text is escaped, the file asks for nothing from outside.
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const K = createRequire(import.meta.url)('../src/kickoffhtml.js'); let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };
const full = { customer: 'Acme', project: 'CAFM roll-out', date: '2026-11-04', team: [{ name: 'Asha', role: 'Project Manager' }], customerTeam: [{ name: 'Ravi', role: 'Sponsor' }], objectives: ['Agree one plan'], scope: ['Four modules'], outOfScope: ['Data cleansing'], customerAsks: [{ text: 'Name a sponsor', date: '2026-11-10' }, { text: 'Share the asset list' }],
  keyDates: [{ date: '2026-11-23', label: 'BRD sign-off' }], plan: [{ title: 'Understand', start: '2026-11-04', end: '2026-11-23', isPhase: true }, { title: 'Build', start: '2026-11-24', end: '2026-12-18', isPhase: true }, { title: 'Go-live', start: '2027-01-20', ms: true }],
  governance: ['Weekly status call'], risks: ['Data arrives late'], nextSteps: [{ action: 'Share the plan', owner: 'Facilio', date: '2026-11-05' }] };
t('a full project makes every slide, in the reference order', () => { const r = K.build(full); assert.deepEqual(r.slides, ['Cover', 'Goals of the meeting', 'Meet the team', 'How we deliver', 'Sign-offs', 'Scope', 'In and out of scope', 'The plan on one page', 'Milestones', 'What we need from you', 'Governance', 'Risks', 'Next ten working days', 'Next steps', 'Thank you']); assert.deepEqual(r.skipped, ['Dependencies', 'Spotlight'], 'only the slides that need the kick-off block are left out'); });
t('with the kick-off block the deck has the slides of Facilio\'s kick-off deck, in its order', () => {
  const rich = Object.assign({}, full, { promise: 'One platform for every site', customerTeam: [], customerRoles: ['Project Sponsor', 'Business SPOC'], meetingRhythm: 'The two Project Managers meet weekly',
    outcomes: [{ title: 'Incidents tracked end to end', text: 'From report to closure', stream: 'CAFM platform' }, { title: 'Invoices checked for you', text: 'Matched to quotes', stream: 'AI agents' }], streams: ['CAFM platform', 'AI agents'],
    scopeGroups: [{ name: 'Site addition', title: 'Danah Bay', stream: 'CAFM platform', items: ['Up to 250 units'] }, { name: 'AI suite', title: 'Three agents', stream: 'AI agents', items: ['Invoice Agent'] }], scopeAreas: [{ area: 'Modules', text: 'Incident, NCR, Budget' }],
    deliver: [{ name: 'Understand', start: '2026-11-04', end: '2026-11-23', activities: ['Workshops', 'BRD'], gate: 'T1 · BRD sign-off' }, { name: 'Build', start: '2026-11-24', end: '2026-12-18', activities: ['Set-up'], gate: 'Ready for testing' }],
    gates: [{ label: 'T0', name: 'Kick-off', date: '2026-11-04', unlocks: 'Workshops', needs: 'Core team named' }, { label: 'T1', name: 'BRD sign-off', date: '2026-11-23', unlocks: 'Configuration', needs: '' }],
    tracks: [{ name: 'Core path', note: 'each step waits', steps: [{ label: 'Workshops', start: '2026-11-05', end: '2026-11-19' }, { label: 'T1 · BRD sign-off', start: '2026-11-23', end: '2026-11-23' }] }], slipRule: 'Late by N days moves every later date by N.',
    spotlight: { title: 'AI agents', subtitle: 'Three agents, ready for testing', items: [{ name: 'Invoice Agent', start: '2026-11-10', end: '2026-11-20', points: ['Checks rate and quantity'], needs: 'Invoice samples' }] },
    asks: [{ text: 'Budget structure', team: 'Finance', due: '2026-11-09', unlocks: 'Budget module' }],
    governanceDetail: { cadence: [{ when: 'Weekly', name: 'Project status call', text: 'Progress and blockers' }], escalation: { facilio: [{ name: 'Kesava', role: 'Project Manager' }], customer: [] }, changeControl: 'Changes after BRD sign-off are sized and approved by both PMs.' },
    riskTable: [{ text: 'Samples arrive late', level: 'high', effect: 'AI handover moves', mitigation: 'Partial samples accepted' }],
    plan: full.plan.slice(0, 2).map((r, i) => Object.assign({}, r, { owner: i ? 'customer' : 'facilio' })), holidays: [{ start: '2026-11-30', end: '2026-12-03', label: 'National Day' }] });
  const r = K.build(rich);
  assert.deepEqual(r.slides, ['Cover', 'Goals of the meeting', 'What changes', 'Meet the team', 'How we deliver', 'Scope at a glance', 'In and out of scope', 'The plan on one page', 'Milestones', 'Dependencies', 'Spotlight', 'What we need from you', 'Governance', 'Risks', 'Next ten working days', 'Next steps', 'Thank you']);
  const h = r.html; for (const s of ['One platform for every site', 'Business SPOC', 'To be nominated', 'The two Project Managers meet weekly', 'T1 · BRD sign-off', 'Danah Bay', 'Needs from you:', 'Late by N days', 'Invoice samples', 'Your team', 'Budget module', 'Change control:', 'How we protect the date', 'High', 'Public holidays (National Day)', 'AI agents']) assert.ok(h.includes(s), 'missing: ' + s);
  assert.ok(h.includes('#FF6700') && h.includes('#0024D6'), 'the second stream and the customer bars are orange, Facilio blue');
  assert.ok(!/#1570EF/i.test(h.split('<style>')[1].split('</style>')[0]), 'the deck uses the Facilio palette, not the old blue');
  assert.ok(r.html.includes('<li><b>01</b>What changes</li>'), 'the agenda starts with what changes');
});
t('the new slides escape what they show', () => { const x = '<img src=x onerror=alert(1)>'; const h = K.build(Object.assign({}, full, { outcomes: [{ title: x, text: x }], asks: [{ text: x, team: x, unlocks: x }], riskTable: [{ text: x, level: 'high', effect: x, mitigation: x }], spotlight: { title: x, items: [{ name: x, points: [x] }] }, tracks: [{ name: x, steps: [{ label: x }, { label: x }] }] })).html; assert.ok(!/<img src=x/.test(h)); });
t('every slide has speaker notes built from its own data, and action titles', () => { const r = K.build(full); assert.equal(r.notes.length, r.slides.length); assert.ok(r.notes.every(x => x.length > 10)); assert.ok(r.notes[r.slides.indexOf('Scope')].includes('Four modules')); assert.ok(r.html.includes('data-speaker-notes="Say what we want')); assert.ok(r.html.includes('Today we agree one plan')); assert.ok(r.html.includes('Date to agree')); assert.ok(/Kick-off to the last phase in [0-9]+ weeks/.test(r.html)); });
t('a slide with nothing to show is left out and named, never filled with made-up text', () => { const r = K.build({ customer: 'Acme', project: 'P', objectives: ['x'] }); assert.deepEqual(r.slides, ['Cover', 'Goals of the meeting', 'Thank you']); assert.ok(r.skipped.includes('Meet the team') && r.skipped.includes('Risks')); assert.ok(!/Lorem|TBC/.test(r.html)); });
t('milestones come from the plan and the kick-off facts, in date order', () => { const h = K.build(full).html; assert.ok(h.indexOf('BRD sign-off') < h.indexOf('Go-live')); });
t('text from records is escaped', () => { const h = K.build({ customer: '<img src=x onerror=alert(1)>', project: 'A & B', objectives: ['<script>alert(1)</script>'] }).html; assert.ok(!/<img src=x/.test(h) && !/<script>alert/.test(h)); assert.ok(h.includes('A &amp; B')); });
t('the file asks for nothing from outside and has present mode', () => { const h = K.build(full).html; assert.ok(/default-src 'none'/.test(h)); assert.ok(!/https?:\/\//.test(h.replace(/xmlns="[^"]*"/g, ''))); assert.ok(/ArrowRight/.test(h) && /requestFullscreen/.test(h) && /@media print/.test(h)); });
t('dates use the formatter it is given', () => { assert.ok(K.build(full, { fmt: d => 'D:' + d }).html.includes('D:2026-11-23')); });
console.log(`${n} kick-off deck checks passed`);
{ const fs = await import('node:fs'); const J = await import('../work/server/_jobs.mjs'); const u = (name, fn) => { fn(); console.log('  ok  ' + name); };
  u('the deck has an agenda built from its own slides, mirrored team sides, sign-offs, and a Change this slide with AI button that names the slide', () => {
    const r = K.build(full); assert.ok(/class="agenda"/.test(r.html) && r.html.includes('<li><b>01</b>Meet the team</li>')); assert.ok(r.html.includes('class="mirror"') && r.html.includes('Understand signed off'));
    const ko = fs.readFileSync('src/kickoff.js', 'utf8'); assert.ok(ko.includes('data-act="koSlideAi"') && ko.includes("'Slide ' + d.k + ' ('"));
    assert.match(J.KINDS.apply_change.recipe, /starts with Slide N \(name\)/); });
}
{ const u = (name, fn) => { fn(); console.log('  ok  ' + name); };
  u('a list too long for one slide goes on continuation slides and every item is still shown (nothing is cut off)', () => {
    const many = (p, n, len) => Array.from({ length: n }, (_, i) => p + ' ' + (i + 1) + ' ' + 'word '.repeat(len));
    const d = Object.assign({}, full, { risks: many('Risk item', 14, 22), scope: many('Scope item', 14, 14), governance: many('Rule', 12, 10), objectives: many('Goal', 8, 18), outOfScope: many('Out', 12, 8), customerAsks: many('Ask', 12, 15).map(x => ({ text: x })) });
    const r = K.build(d); for (const nm of ['Risks', 'Scope', 'Governance', 'Goals of the meeting', 'In and out of scope', 'What we need from you']) assert.ok(r.slides.includes(nm + ' (2)'), nm + ' continues on a second slide');
    for (const k of [...d.risks, ...d.scope, ...d.governance, ...d.objectives, ...d.outOfScope]) assert.ok(r.html.includes(k.trim()), 'missing: ' + k.slice(0, 20));
    assert.ok(K.build(full).slides.every(s => !/\(\d+\)$/.test(s)), 'a short project makes no continuation slides'); });
}
{ const fs = await import('node:fs'); const bv = fs.readFileSync('src/bigview.js', 'utf8'), ko = fs.readFileSync('src/kickoff.js', 'utf8'), J = await import('../work/server/_jobs.mjs'); const u = (name, fn) => { fn(); console.log('  ok  ' + name); };
  u('the deck preview is on top of the kick-off page, and its bigger view has Previous, Next and the arrow keys', () => {
    assert.ok(ko.includes('+ safeDeck(p) + crCard() + packCards(p) + reviewCard(p) +') && ko.includes('data-deck="1"') && ko.includes('V.bvStep = '));
    assert.ok(bv.includes("k === 'ArrowRight'") && bv.includes("k === 'ArrowLeft'") && bv.includes('data-bv="prev"') && bv.includes('data-bv="next"') && bv.includes("a === 'prev' || a === 'next'")); });
  u('Claude is told to answer a deck change with what it changed and what it did not (and that the look is not its to change)', () => { assert.match(J.KINDS.apply_change.recipe, /"Changed:".*"Not changed:".*look of the deck/); });
}
