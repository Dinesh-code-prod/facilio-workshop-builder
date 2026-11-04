/* Workshop preparation (pure code, no DOM, no network; also run by tests/workshop_prep.mjs). Roadmap E2 workspace 1, "Auto workshop preparation".
   buildWorkshopPrep(input) makes one plain JSON object, `prep`, with one session proposal per module. The Studio shows it as editable text, the project manager changes it,
   and workshopPrepHtml(prep) turns it into one customer-friendly, self-contained HTML file (read-only for the customer; built on the page shell of src/kickoffhtml.js).
   Nothing is invented: topics and customer questions come only from the scope items, requirements and open questions it is given. The standard lines (agenda, how to prepare,
   what to bring) are only frames around the module name and are labelled origin "assumed". Every line is { text, origin, source? } with origin
   contract (the agreement says it) | interpreted (read from the agreement or the requirements) | assumed (Facilio's suggestion). */
(function (root) {
  'use strict';
  const K = (typeof module !== 'undefined' && module.exports) ? require('./kickoffhtml.js') : root.FWBKickoffDeck;
  const ORIGINS = ['contract', 'interpreted', 'assumed'];
  const arr = x => (Array.isArray(x) ? x : []);
  const str = (x, n) => (typeof x === 'string' || typeof x === 'number' ? String(x).replace(/\s+/g, ' ').trim().slice(0, n || 400) : '');
  const okDate = s => { s = typeof s === 'string' ? s.trim() : ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return ''; const t = Date.parse(s + 'T00:00:00Z'); return isNaN(t) || new Date(t).toISOString().slice(0, 10) !== s ? '' : s; };
  const line = (text, origin, source) => { const o = { text: str(text), origin: ORIGINS.includes(origin) ? origin : 'assumed' }; const s = str(source, 120); if (s) o.source = s; return o; };
  // a string, or { text|title, origin?, source?, page?, section? }
  const norm = (x, defOrigin) => { const o = x && typeof x === 'object' ? x : { text: x }; const text = str(o.text != null ? o.text : o.title); if (!text) return null; const src = str(o.source, 120) || (o.page ? 'MSA p.' + str(o.page, 10) + (o.section ? ' §' + str(o.section, 20) : '') : o.section ? 'MSA §' + str(o.section, 20) : ''); return line(text, ORIGINS.includes(o.origin) ? o.origin : defOrigin, src); };
  const list = (x, defOrigin, cap) => arr(x).slice(0, cap || 60).map(i => norm(i, defOrigin)).filter(Boolean);

  // input: { project:{customer,name}, modules:[{name, scopeItems:[], requirements?:[], openQuestions?:[]}], sessions?:[{title,modules|module,date,start,minutes,participants}], customerQuestions?:[] }
  function buildWorkshopPrep(input) {
    const inp = input && typeof input === 'object' ? input : {}; const pj = inp.project && typeof inp.project === 'object' ? inp.project : {}; const customer = str(pj.customer, 120), name = str(pj.name, 160);
    const assumptions = [], gaps = []; const free = arr(inp.sessions).slice(0, 80).map(s => (s && typeof s === 'object' ? s : {})); const used = new Set();
    if (!customer) gaps.push('The customer name was not given, so the page says "your team".');
    const who = customer || 'your team';
    const sessions = []; const mods = arr(inp.modules).slice(0, 50);
    mods.forEach(m => {
      const o = m && typeof m === 'object' ? m : {}; const mn = str(o.name, 120); if (!mn) { gaps.push('A module without a name was left out.'); return; }
      const scope = list(o.scopeItems, 'contract'), reqs = list(o.requirements, 'interpreted'), qs = list(o.openQuestions, 'interpreted', 40);
      if (!scope.length) gaps.push('"' + mn + '" has no scope items, so it has no topics from the contract. Confirm its scope with the customer before the workshop.');
      const si = free.findIndex((s, i) => !used.has(i) && [].concat(s.modules, s.module).some(x => str(x, 120).toLowerCase() === mn.toLowerCase())); const ses = si >= 0 ? free[si] : null; if (si >= 0) used.add(si);
      const mins = Number(ses && ses.minutes);
      const agenda = [line('Welcome and aims of the session', 'assumed'), line('How ' + mn + ' works today at ' + who, 'assumed')];
      if (scope.length) agenda.push(line('What the agreement covers for ' + mn, 'assumed'));
      if (reqs.length) agenda.push(line('The requirements captured so far', 'assumed'));
      if (qs.length) agenda.push(line('The open questions', 'assumed'));
      agenda.push(line('Decisions, actions and next steps', 'assumed'));
      const objectives = [line('Understand how ' + mn + ' works today', 'assumed'), line('Agree what ' + mn + ' must do in the new solution', 'assumed')];
      if (scope.length) objectives.push(line('Confirm the ' + scope.length + ' scope item' + (scope.length > 1 ? 's' : '') + ' for ' + mn, 'interpreted'));
      const questions = qs.map(q => Object.assign({}, q)).concat(scope.map(s => line('Does this match how you work? ' + s.text, 'interpreted', s.source)));
      const decisions = scope.map(s => line('In or out of scope: ' + s.text, 'interpreted', s.source)).concat(qs.map(q => line('Answer to: ' + q.text, 'interpreted', q.source)));
      const deps = [line('Scope for ' + mn + ' is confirmed', 'assumed')]; if (qs.length) deps.push(line('Answers to the open questions are ready beforehand', 'assumed'));
      sessions.push({ id: 'ws-' + (sessions.length + 1), module: mn, title: str(ses && ses.title, 160) || mn + ' requirements workshop', date: okDate(ses && ses.date), start: /^\d{2}:\d{2}$/.test(str(ses && ses.start, 5)) ? str(ses.start, 5) : '', durationMinutes: mins >= 15 && mins <= 600 ? Math.round(mins) : 0, participants: str(ses && ses.participants, 300),
        agenda, objectives, topics: scope.concat(reqs), customerQuestions: questions,
        informationNeeded: [line('How you run ' + mn + ' today, step by step', 'assumed'), line('The forms, templates and reports you use for ' + mn, 'assumed'), line('Who decides on ' + mn + ' (names and roles)', 'assumed')],
        expectedDecisions: decisions, dependencies: deps,
        preparation: [line('Invite the people who run ' + mn + ' day to day', 'assumed'), line('Gather the documents listed under "Information we need"', 'assumed'), line('Read the questions and note your answers', 'assumed')],
        outputs: [line('An agreed list of requirements for ' + mn, 'assumed'), line('The decisions and actions from the session', 'assumed')].concat(qs.length ? [line('Answers to the open questions', 'assumed')] : []) });
    });
    if (!sessions.length) gaps.push('No modules were given, so there are no sessions. Confirm the scope first.');
    free.forEach((s, i) => { if (!used.has(i) && (str(s.title) || arr(s.modules).length || s.module)) gaps.push('The session "' + (str(s.title, 80) || 'untitled') + '" matches no module in the scope, so it is not in this page.'); });
    if (sessions.length && !sessions.some(s => s.date)) assumptions.push('No session dates were given, so the sessions are shown without a date.');
    assumptions.push('The agenda, objectives, "Information we need", "How to prepare" and outputs are standard frames written around each module name; they are Facilio\'s suggestion, not contract wording. Topics and questions come only from the scope items and open questions given.');
    return { version: 1, project: { customer, name }, intro: { heading: 'Workshop preparation', text: 'This page helps ' + who + ' get ready for the requirements workshops: what each session covers, what we would like to ask, and what to bring.' },
      general: { customerQuestions: list(inp.customerQuestions, 'interpreted', 40), preparation: [] }, sessions, assumptions, gaps };
  }

  const TAGS = { contract: 'From your agreement', interpreted: 'Based on your agreement' };
  const BLOCKS = [['agenda', 'Agenda', 'ol'], ['objectives', 'What we want to achieve', 'ul'], ['topics', 'Topics', 'ul'], ['customerQuestions', 'Questions for you', 'ul'], ['informationNeeded', 'Information we need', 'chk'], ['expectedDecisions', 'Decisions we expect', 'ul'], ['dependencies', 'What this depends on', 'ul'], ['preparation', 'How to prepare', 'chk'], ['outputs', 'What you will have afterwards', 'ul']];
  const CSS = `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#F6F8FC;color:#1D1A5E;font:16px/1.55 Inter,"Segoe UI",system-ui,Arial,sans-serif}main{max-width:980px;margin:0 auto;padding:32px 20px 80px}header.top{background:#1D1A5E;color:#fff;border-radius:16px;padding:34px 36px;margin-bottom:22px}header.top .k{color:#8DB8FF;font-weight:600;margin:0 0 6px}header.top h1{margin:0 0 8px;font-size:34px;letter-spacing:-.5px}header.top p{margin:6px 0 0;color:#DCE6FA;max-width:70ch}.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 18px}.chip,.btn{font:600 14px Inter,"Segoe UI",Arial,sans-serif;border:1.5px solid #C9D6EE;background:#fff;color:#1D1A5E;border-radius:999px;padding:7px 14px;cursor:pointer}.chip.on,.btn.p{background:#1570EF;border-color:#1570EF;color:#fff}.chip:focus-visible,.btn:focus-visible,summary:focus-visible,input:focus-visible{outline:3px solid #8DB8FF;outline-offset:2px}.sp{flex:1}.prog{font-size:14px;color:#4F5F88}.legend{font-size:13px;color:#4F5F88;margin:0 0 18px}.ses{background:#fff;border:1px solid #DCE4F3;border-top:5px solid #1570EF;border-radius:14px;padding:22px 26px;margin:0 0 20px}.ses.hide{display:none}.ses h2{margin:0 0 4px;font-size:24px}.meta{display:flex;flex-wrap:wrap;gap:6px 18px;color:#4F5F88;font-size:14px;margin:0 0 12px}.meta b{color:#1D1A5E}details{border-top:1px solid #E3E9F5;padding:10px 0}summary{cursor:pointer;font-weight:700;color:#1570EF;list-style:none}summary::-webkit-details-marker{display:none}summary:before{content:"+";display:inline-block;width:20px;color:#E5197F}details[open]>summary:before{content:"\\2212"}ul,ol{margin:8px 0 2px;padding-left:22px}ul.chk{list-style:none;padding-left:0}li{margin:5px 0}li small{display:block;color:#6B7AA3;font-size:12.5px}.tg{display:inline-block;margin-left:6px;font-size:11.5px;font-weight:700;color:#E5197F;border:1px solid #F3B5D2;border-radius:999px;padding:0 8px;white-space:nowrap}label.c{display:flex;gap:10px;align-items:flex-start;cursor:pointer}label.c input{margin-top:5px;width:17px;height:17px;accent-color:#1570EF}.gen{background:#fff;border:1px solid #DCE4F3;border-radius:14px;padding:18px 26px;margin:0 0 20px}.gen h2{margin:0 0 6px;font-size:20px}.empty{color:#4F5F88}footer{color:#6B7AA3;font-size:13px;margin-top:26px}@media(max-width:600px){header.top{padding:24px 20px}header.top h1{font-size:26px}.ses{padding:18px}}@media print{body{background:#fff}.bar,.legend{display:none}.ses,.gen{break-inside:avoid;border-color:#bbb}header.top{background:#fff;color:#1D1A5E;border:2px solid #1D1A5E}header.top .k,header.top p{color:#1D1A5E}}`;
  const JS = `(function(){var d=document,q=function(s,r){return[].slice.call((r||d).querySelectorAll(s))};function det(o){q('details').forEach(function(x){x.open=o})}function prog(){var a=q('input.ck'),n=a.filter(function(x){return x.checked}).length,p=d.getElementById('prog');if(p)p.textContent=a.length?n+' of '+a.length+' preparation items ticked':''}d.addEventListener('click',function(e){var t=e.target;if(!t.closest)return;var b=t.closest('[data-do]');if(!b)return;var k=b.getAttribute('data-do');if(k==='open')det(true);else if(k==='close')det(false);else if(k==='print'){det(true);window.print()}else if(k==='f'){var m=b.getAttribute('data-m');q('.chip').forEach(function(c){c.classList.toggle('on',c===b)});q('.ses').forEach(function(s){s.classList.toggle('hide',m!=='all'&&s.getAttribute('data-m')!==m)})}});d.addEventListener('change',prog);window.addEventListener('beforeprint',function(){det(true)});prog()})();`;

  function workshopPrepHtml(prep) {
    const esc = K.esc; const p = prep && typeof prep === 'object' ? prep : {}; const pj = p.project && typeof p.project === 'object' ? p.project : {}; const intro = p.intro && typeof p.intro === 'object' ? p.intro : {};
    const ses = arr(p.sessions).filter(s => s && typeof s === 'object'); const gen = p.general && typeof p.general === 'object' ? p.general : {}; const li = (i, chk) => { const o = i && typeof i === 'object' ? i : { text: i }; const t = str(o.text); if (!t) return ''; const tag = TAGS[o.origin] ? `<span class="tg">${esc(TAGS[o.origin])}</span>` : ''; const src = str(o.source) ? `<small>${esc(str(o.source))}</small>` : ''; return `<li>${chk ? `<label class="c"><input type="checkbox" class="ck"><span>${esc(t)}${tag}${src}</span></label>` : `${esc(t)}${tag}${src}`}</li>`; };
    const block = (items, title, kind) => { const rows = arr(items).map(i => li(i, kind === 'chk')).filter(Boolean); return rows.length ? `<details open><summary>${esc(title)}</summary><${kind === 'ol' ? 'ol' : 'ul'}${kind === 'chk' ? ' class="chk"' : ''}>${rows.join('')}</${kind === 'ol' ? 'ol' : 'ul'}></details>` : ''; };
    const when = s => [okDate(s.date) ? `<span><b>Date</b> ${esc(okDate(s.date))}</span>` : '', /^\d{2}:\d{2}$/.test(str(s.start, 5)) ? `<span><b>Time</b> ${esc(str(s.start, 5))}</span>` : '', Number(s.durationMinutes) > 0 ? `<span><b>Length</b> ${esc(Math.round(Number(s.durationMinutes)))} min</span>` : '', str(s.participants) ? `<span><b>Who</b> ${esc(str(s.participants))}</span>` : ''].join('');
    const chips = ses.length > 1 ? `<button class="chip on" data-do="f" data-m="all">All sessions</button>` + ses.map((s, i) => `<button class="chip" data-do="f" data-m="${i}">${esc(str(s.module) || 'Session ' + (i + 1))}</button>`).join('') : '';
    const gq = arr(gen.customerQuestions).map(i => li(i)).filter(Boolean).join(''), gp = arr(gen.preparation).map(i => li(i, true)).filter(Boolean).join('');
    const body = `<main><header class="top"><p class="k">${esc(str(pj.customer) || 'Your team')} × Facilio</p><h1>${esc(str(intro.heading) || 'Workshop preparation')}</h1>${str(pj.name) ? `<p><b>${esc(str(pj.name))}</b></p>` : ''}${str(intro.text) ? `<p>${esc(str(intro.text))}</p>` : ''}</header>`
      + `<div class="bar" role="toolbar" aria-label="Page controls">${chips}<span class="sp"></span><span class="prog" id="prog" aria-live="polite"></span><button class="btn" data-do="open">Open all</button><button class="btn" data-do="close">Close all</button><button class="btn p" data-do="print">Print or save as PDF</button></div>`
      + `<p class="legend">Items marked <span class="tg">From your agreement</span> or <span class="tg">Based on your agreement</span> come from your contract. Items without a mark are Facilio's suggestions. Tick items as you prepare; ticks are for you only and are not sent to us.</p>`
      + (gq ? `<section class="gen"><h2>Questions for everyone</h2><ul>${gq}</ul></section>` : '') + (gp ? `<section class="gen"><h2>Before the workshops</h2><ul class="chk">${gp}</ul></section>` : '')
      + (ses.length ? ses.map((s, i) => `<section class="ses" data-m="${i}" aria-label="${esc(str(s.title) || 'Session ' + (i + 1))}"><h2>${esc(str(s.title) || 'Session ' + (i + 1))}</h2><div class="meta">${when(s)}</div>${BLOCKS.map(([k, t, kind]) => block(s[k], t, kind)).join('')}</section>`).join('') : '<p class="empty">No sessions have been planned yet.</p>') + `<footer>Prepared by Facilio. Nothing on this page is sent anywhere from your browser.</footer></main>`;
    return K.shell((str(pj.customer) || 'Your team') + ' × Facilio: ' + (str(intro.heading) || 'Workshop preparation'), CSS, body, JS);
  }

  const api = { buildWorkshopPrep, workshopPrepHtml, BLOCKS: BLOCKS.map(b => b.slice(0, 2)) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBWorkshopPrep = api;
})(typeof window !== 'undefined' ? window : globalThis);
