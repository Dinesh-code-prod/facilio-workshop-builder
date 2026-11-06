/* UAT guide, module by module, as customer-shareable HTML (pure code, also run by tests/uat_guide.mjs). E2 workspace 6. UAT stays in the Studio; there is no Comet step.
   The guide is built ONLY from the module list and the test cases it is given (the "utc" records of the UAT page): a scenario, objective, preconditions, steps, expected result, roles, test data and evidence
   appear only when the test case states them. A module with no test case is listed as a gap, never filled with made-up scenarios. A test case that names more than one module becomes a cross-module scenario.
   The page uses the shared customer HTML frame of src/kickoffhtml.js (policy that blocks every outside request, escape helper). */
(function (root) {
  'use strict';
  const K = () => root.FWBKickoffDeck || (typeof require === 'function' ? require('./kickoffhtml.js') : null);
  const esc = s => K().esc(s).replace(/`/g, '&#96;');
  const arr = x => (Array.isArray(x) ? x : []);
  const str = (x, n) => String(x == null || typeof x === 'object' ? '' : x).replace(/\s+/g, ' ').trim().slice(0, n || 400);
  const text = (x, n) => String(x == null || typeof x === 'object' ? '' : x).replace(/\r/g, '').trim().slice(0, n || 4000);
  const low = s => String(s == null ? '' : s).trim().toLowerCase();
  const strList = x => (Array.isArray(x) ? x : String(x == null || typeof x === 'object' ? '' : x).split(/[;,\n]/)).map(v => str(v, 120)).filter(Boolean);
  const stepsOf = x => (Array.isArray(x) ? x.map(v => str(v, 600)) : text(x).split('\n').map(l => l.replace(/^\s*(\d+[.)]|[-*•])\s*/, '').replace(/\s+/g, ' ').trim())).filter(Boolean);
  const extraOf = (c, re) => { const e = c && typeof c.extra === 'object' && c.extra ? c.extra : {}; const k = Object.keys(e).find(x => re.test(x.trim())); return k ? e[k] : ''; };

  // input: { project:{id,name,customer}, modules:[name | {name,label}], testCases:[utc records], roles?:[name | {name}] }
  // returns { project, roles, modules:[{name,label,entries,covered}], crossModule:[entry], other:[entry], gaps:[text], counts }
  function buildUatGuide(input) {
    const inp = input && typeof input === 'object' ? input : {}, pr = inp.project && typeof inp.project === 'object' ? inp.project : {};
    const project = { id: str(pr.id, 80), name: str(pr.name, 200), customer: str(pr.customer, 200) };
    const mods = [], byKey = new Map();
    arr(inp.modules).forEach(m => { const o = m && typeof m === 'object' ? m : { name: m }, name = str(o.name != null ? o.name : o.label, 200), label = str(o.label, 200) || name; if (!name || byKey.has(low(name))) return;
      const mod = { name, label, entries: [], covered: false }; mods.push(mod); byKey.set(low(name), mod); byKey.set(low(label), mod); });
    // the approved modules a test case names: a whole text that is a module, else its parts split at , ; / + & | or "and"
    const match = t => { const s = low(t); if (!s) return []; if (byKey.has(s)) return [byKey.get(s)]; return s.split(/\s*[;,/+&|]\s*|\s+and\s+/).map(p => byKey.get(p.trim())).filter(Boolean); };
    const gaps = [], other = [], cross = [];
    const roles = arr(inp.roles).map(r => str(r && typeof r === 'object' ? r.name : r, 120)).filter(Boolean).filter((r, i, a) => a.indexOf(r) === i);
    const unknown = new Set();
    arr(inp.testCases).forEach(c => {
      if (!c || typeof c !== 'object') return;
      const raw = [c.mod, c.module].concat(arr(c.modules)).map(v => str(v, 200)).filter(Boolean), hit = [];
      raw.forEach(t => match(t).forEach(m => { if (!hit.includes(m)) hit.push(m); }));
      const title = str(c.title, 300), scenario = str(c.scenario, 300) || title;
      const e = { id: str(c.tcid, 60), scenario, objective: str(c.objective, 400) || title || scenario, preconditions: text(c.pre || c.preconditions, 1500), steps: stepsOf(c.steps), expected: text(c.expected, 1500),
        roles: strList(c.roles || c.role || extraOf(c, /^(user )?roles?$/i)), testData: text(c.testData || c.data || extraOf(c, /^test ?data$/i), 1500), evidence: text(c.evidence || extraOf(c, /^evidence( expected)?$/i), 1000), requirement: str(c.req, 200), modules: hit.map(m => m.label) };
      if (!scenario) { gaps.push('A test case has no title or scenario, so it was left out of the guide.'); return; }
      const ref = e.id || scenario; { const wt = inp.walkthroughs && typeof inp.walkthroughs === 'object' ? String(inp.walkthroughs[String(scenario).replace(/\s+/g, ' ').trim().toLowerCase()] || '') : ''; if (/^https:\/\//i.test(wt)) e.walkthrough = wt.slice(0, 600); }
      if (!e.steps.length) gaps.push('The test case "' + ref + '" has no steps yet.');
      if (!e.expected) gaps.push('The test case "' + ref + '" has no expected result yet.');
      if (hit.length > 1) { cross.push(e); hit.forEach(m => { m.covered = true; }); }
      else if (hit.length === 1) { hit[0].entries.push(e); hit[0].covered = true; }
      else { e.modules = raw.length ? [raw[0]] : []; other.push(e); if (raw[0]) unknown.add(raw[0]); }
    });
    mods.forEach(m => { if (!m.covered) gaps.push('The module "' + m.label + '" has no test case yet, so it has no UAT scenario.'); });
    if (other.length) gaps.push(other.length + ' test case' + (other.length === 1 ? '' : 's') + ' name a module that is not in the approved modules' + (unknown.size ? ' (' + [...unknown].join(', ') + ')' : '') + ' or none at all.');
    if (!arr(inp.testCases).length) gaps.push('There are no test cases yet.');
    return { project, roles, modules: mods, crossModule: cross, other, gaps, counts: { modules: mods.length, testCases: mods.reduce((n, m) => n + m.entries.length, 0) + cross.length + other.length, crossModule: cross.length } };
  }

  const CSS = `.hero{border-top:6px solid #1570EF}.lead{font-size:18px;color:#4A5784}nav ul{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:10px 0 0;padding:0}nav a{display:inline-block;padding:6px 12px;border:1px solid #8DB8FF;border-radius:999px;text-decoration:none;font-size:14px}
.mod{border-top:6px solid #1570EF}.cross{border-top:6px solid #E5197F}.tc{border:1px solid #DCE4F3;border-left:6px solid #1570EF;border-radius:10px;padding:12px 14px;margin:0 0 12px;background:#fff}.tc h3{font-size:17px;margin:0 0 2px}.id{font-family:ui-monospace,Consolas,monospace;font-size:12px;color:#4A5784}
.tc dl{margin:8px 0 0;display:grid;grid-template-columns:150px 1fr;gap:6px 12px;font-size:15px}.tc dt{color:#4A5784;font-weight:600}.tc dd{margin:0;white-space:pre-line}.tc dd ol{margin:0;padding-left:20px;white-space:normal}
.pill{display:inline-block;font-size:12px;font-weight:600;border-radius:999px;padding:2px 10px;background:#EAF2FF;color:#1570EF}.pill.x{background:#FDE7F1;color:#B0125F}.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
@media(max-width:600px){.tc dl{grid-template-columns:1fr}.tc dt{margin-top:4px}}@media print{button,nav{display:none}body{background:#fff}.tc{break-inside:avoid}}`;

  function entryHtml(e, showMods) {
    const row = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : '';
    return `<article class="tc"><h3>${esc(e.scenario)}${e.id ? ` <span class="id">${esc(e.id)}</span>` : ''}</h3>${showMods && e.modules.length ? `<div>${e.modules.map(m => `<span class="pill x">${esc(m)}</span>`).join(' ')}</div>` : ''}
<dl>${row('Objective', esc(e.objective))}${e.walkthrough ? row('Walkthrough', '<a href="' + esc(e.walkthrough) + '" rel="noopener">Watch the walkthrough</a>') : ''}${row('Roles', esc(e.roles.join(', ')))}${row('Preconditions', esc(e.preconditions))}${row('Test data', esc(e.testData))}${e.steps.length ? `<dt>Steps</dt><dd><ol>${e.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></dd>` : ''}${row('Expected result', esc(e.expected))}${row('Evidence expected', esc(e.evidence))}${row('Requirement', esc(e.requirement))}</dl></article>`;
  }
  const slug = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);

  // guide = the result of buildUatGuide. Read-only page; the only script is the Print button.
  function uatGuideHtml(guide) {
    const g = guide || {}, pr = g.project || {}, customer = str(pr.customer, 200) || 'Customer', mods = arr(g.modules).filter(m => arr(m.entries).length), cross = arr(g.crossModule), other = arr(g.other);
    const anchor = (m, i) => 'm' + (i + 1) + '-' + slug(m.label || m.name);
    const nav = mods.map((m, i) => [anchor(m, i), m.label]).concat(cross.length ? [['cross', 'Across modules']] : [], other.length ? [['other', 'Other test cases']] : []);
    const body = `<main>
<section class="hero" id="welcome"><h1>UAT guide</h1><p class="lead">${esc(pr.name || '')}</p>
<p>This guide lists the test cases agreed for each module: what each one is for, what to prepare, the steps, and what you should see. Everything here comes from the project's test cases.</p>
${arr(g.roles).length ? `<p><b>Roles in this project:</b> ${esc(arr(g.roles).join(', '))}.</p>` : ''}
${nav.length ? `<nav aria-label="Modules"><ul>${nav.map(n => `<li><a href="#${esc(n[0])}">${esc(n[1])}</a></li>`).join('')}</ul></nav>` : ''}
<div class="row"><button type="button" id="pr">Print this guide</button></div></section>
${mods.map((m, i) => `<section class="mod" id="${esc(anchor(m, i))}"><h2>${esc(m.label)}</h2>${m.entries.map(e => entryHtml(e, false)).join('')}</section>`).join('')}
${cross.length ? `<section class="cross" id="cross"><h2>Across modules</h2><p class="note">These test cases involve more than one module.</p>${cross.map(e => entryHtml(e, true)).join('')}</section>` : ''}
${other.length ? `<section class="mod" id="other"><h2>Other test cases</h2>${other.map(e => entryHtml(e, true)).join('')}</section>` : ''}
${arr(g.gaps).length ? `<section id="gaps"><h2>Still to be prepared</h2><ul class="l">${arr(g.gaps).map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
</main>`;
    const js = `document.getElementById('pr').addEventListener('click',function(){window.print()});`;
    return K().pageShell({ title: customer + ' and Facilio: UAT guide', css: CSS, body, js });
  }
  const api = { buildUatGuide, uatGuideHtml };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBUatGuide = api;
})(typeof window !== 'undefined' ? window : globalThis);
