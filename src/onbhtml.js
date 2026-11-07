/* Data onboarding as one self-contained HTML file for the customer (pure code, also run by tests/onboarding_html.mjs). It reuses the escape helper of the kick-off deck engine (src/kickoffhtml.js).
   The file needs no account and no network: system fonts, inline CSS and script, a Content-Security-Policy that blocks every outside request. The customer reads, ticks a checklist, writes answers,
   downloads CSV templates, and at the end downloads a JSON package (answers, checklist, file NAMES only). The package comes back by hand and is checked by src/onbreturn.js before it touches a record.
   Everything the page shows is built here from the plan, HTML-escaped; the script only reads ids it finds in the page, so no handler is ever built from project text. */
(function (root) {
  'use strict';
  const K = () => root.FWBKickoffDeck || (typeof require === 'function' ? require('./kickoffhtml.js') : null);
  const esc = s => K().esc(s);
  const arr = x => (Array.isArray(x) ? x : []);
  const SCHEMA = 'fds-onboarding-return', VERSION = 1, MAX_ANSWER = 4000;
  const slug = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'x';
  const GENERAL_Q = [['q_contact', 'Who will prepare the data, and how can we reach them?'], ['q_systems', 'Which systems or files does your data come from today?'], ['q_dates', 'Any dates we should know about (freezes, holidays, deadlines)?'], ['q_concerns', 'Anything in this guide that is unclear or that worries you?']];

  // The ids this file defines. Both the page and the validator call it with the same options, so a returned package can only carry ids the page really had.
  function idsFor(options) {
    const p = (options && options.plan) || {}, seen = new Set(), uniq = base => { let k = base, n = 2; while (seen.has(k)) k = base + '_' + n++; seen.add(k); return k; };
    const sheets = arr(p.sheets).map(s => ({ id: uniq(slug(s.sheet)), name: s.sheet }));
    const files = arr(p.files).map(f => ({ id: uniq('f_' + slug(f.id || f.name)), name: f.name }));
    // one data grid per sheet and table (a sheet with several tables gets one grid each); the key is shared by the page and by the importer
    const grids = []; arr(p.sheets).forEach((s, i) => { const ents = []; arr(s.cols).forEach(c => { const e = String(c.ent || ''); if (!ents.includes(e)) ents.push(e); });
      ents.forEach((e, j) => grids.push({ key: sheets[i].id + '_' + (j + 1), sheet: s.sheet, ent: e, cols: arr(s.cols).filter(c => String(c.ent || '') === e).map(c => String(c.h || '')), opts: arr(s.cols).filter(c => String(c.ent || '') === e).map(c => (Array.isArray(c.opts) && c.opts.length ? c.opts.slice(0, 60).map(x => String(x).slice(0, 80)) : null)) })); });
    return { sheets, files, grids, checklist: ['read_guide'].concat(sheets.map(s => 'sheet_' + s.id), files.map(f => 'file_' + f.id), ['ready_to_send']), answers: GENERAL_Q.map(q => q[0]).concat(sheets.map(s => 'note_' + s.id)) };
  }

  // The package the page downloads. Self-contained on purpose (the page embeds this very function), and used as it is by the tests.
  function makePackage(project, state, files, at) {
    const out = { schema: 'fds-onboarding-return', version: 1, project: { id: String(project.id), name: String(project.name) }, generatedAt: at, answers: {}, checklist: {}, files: [] };
    const a = (state && state.answers) || {}, c = (state && state.checklist) || {};
    Object.keys(a).forEach(k => { if (typeof a[k] === 'string' && a[k].trim()) out.answers[k] = a[k]; });
    Object.keys(c).forEach(k => { out.checklist[k] = c[k] === true; });
    (files || []).forEach(f => { if (f && typeof f.name === 'string') { const o = { name: f.name, size: Number(f.size) || 0 }; if (typeof f.sha256 === 'string' && f.sha256) o.sha256 = f.sha256; out.files.push(o); } });
    return out;
  }

  // The page script, written as a real function so it is syntax-checked with the rest. mk = makePackage, spec = the data block, doc = document. It never sends anything.
  function client(mk, spec, doc) {
    var $ = function (s, r) { return (r || doc).querySelector(s); }, $$ = function (s) { return [].slice.call(doc.querySelectorAll(s)); };
    var KEY = 'fds-onb:' + spec.project.id, state = { checklist: {}, answers: {}, files: [], rows: {} }, grids = spec.grids || [];
    try { var raw = localStorage.getItem(KEY); if (raw) { var o = JSON.parse(raw); if (o && typeof o === 'object') { state.checklist = o.checklist || {}; state.answers = o.answers || {}; state.files = o.files || []; state.rows = o.rows || {}; } } } catch (e) { }
    // a saved workbook (this same page, downloaded with the data inside) carries its own data: it wins over what this browser remembers
    try { var wd = doc.getElementById('wbdata'); if (wd && wd.textContent.replace(/\s/g, '')) { var w = JSON.parse(wd.textContent); if (w && w.schema === 'fds-onboarding-workbook' && w.project && String(w.project.id) === String(spec.project.id)) { state.rows = w.rows || {}; state.answers = w.answers || {}; state.checklist = w.checklist || {}; } } } catch (e) { }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { } }
    function drawGrid(g) {
      var tb = doc.getElementById('gb_' + g.key); if (!tb) return; var rows = state.rows[g.key] || [], n = Math.max(8, rows.length); tb.textContent = '';
      for (var r = 0; r < n; r++) { var tr = doc.createElement('tr'); for (var c = 0; c < g.cols.length; c++) { var td = doc.createElement('td'), val = (rows[r] && rows[r][c]) || '', ops = g.opts && g.opts[c];
        if (ops && ops.length) {   // a column with a fixed list of allowed values: a dropdown (a pasted value that is not on the list is kept, so nothing is lost)
          var sel = doc.createElement('select'); sel.setAttribute('data-r', String(r)); sel.setAttribute('data-c', String(c)); sel.setAttribute('aria-label', g.cols[c] + ', row ' + (r + 1)); var all = [''].concat(ops); if (val && all.indexOf(val) < 0) all.push(val);
          all.forEach(function (o) { var op = doc.createElement('option'); op.value = o; op.textContent = o || 'Choose…'; sel.appendChild(op); }); sel.value = val; td.appendChild(sel);
        } else { td.contentEditable = 'true'; td.setAttribute('data-r', String(r)); td.setAttribute('data-c', String(c)); td.setAttribute('aria-label', g.cols[c] + ', row ' + (r + 1)); td.textContent = val; }
        tr.appendChild(td); } tb.appendChild(tr); }
    }
    function gridOf(td) { var tb = td.closest ? td.closest('tbody') : null; var k = tb && tb.id ? tb.id.replace(/^gb_/, '') : ''; return grids.filter(function (g) { return g.key === k; })[0]; }
    function setCell(g, r, c, v) { var rows = state.rows[g.key] = state.rows[g.key] || []; while (rows.length <= r) rows.push([]); rows[r][c] = String(v).slice(0, 500); }
    grids.forEach(drawGrid);
    function rowCount() { var n = 0; grids.forEach(function (g) { (state.rows[g.key] || []).forEach(function (row) { if ((row || []).some(function (x) { return x && String(x).trim(); })) n++; }); }); return n; }
    function workbookData() {
      var rows = {}; grids.forEach(function (g) { var a = (state.rows[g.key] || []).map(function (r) { return g.cols.map(function (_, c) { return String((r && r[c]) || ''); }); }); while (a.length && !a[a.length - 1].some(function (x) { return x.trim(); })) a.pop(); if (a.length) rows[g.key] = a; });
      return { schema: 'fds-onboarding-workbook', version: 1, project: spec.project, savedAt: new Date().toISOString(), rows: rows, answers: state.answers, checklist: state.checklist };
    }
    function paint() {
      var n = 0; spec.ids.checklist.forEach(function (id) { if (state.checklist[id] === true) n++; });
      var t = spec.ids.checklist.length, pc = t ? Math.round(n * 100 / t) : 0, bar = $('#bar');
      bar.style.width = pc + '%'; $('#barwrap').setAttribute('aria-valuenow', String(pc)); $('#barlabel').textContent = n + ' of ' + t + ' steps done (' + pc + '%)';
      $('#filelist').textContent = state.files.length ? state.files.map(function (f) { return f.name; }).join(', ') : 'No files chosen yet.';
    }
    $$('[data-ck]').forEach(function (el) { el.checked = state.checklist[el.getAttribute('data-ck')] === true; });
    $$('[data-ans]').forEach(function (el) { el.value = state.answers[el.getAttribute('data-ans')] || ''; });
    doc.addEventListener('change', function (e) { var el = e.target, k = el.getAttribute && el.getAttribute('data-ck'); if (k) { state.checklist[k] = el.checked; save(); paint(); return; }
      if (el.tagName === 'SELECT' && el.getAttribute('data-r') !== null) { var sg = gridOf(el); if (sg) { setCell(sg, +el.getAttribute('data-r'), +el.getAttribute('data-c'), el.value); save(); } } });
    doc.addEventListener('input', function (e) { var el = e.target, k = el.getAttribute && el.getAttribute('data-ans'); if (k) { state.answers[k] = el.value; save(); return; }
      if (el.getAttribute && el.getAttribute('data-r') !== null) { var g = gridOf(el); if (g) { setCell(g, +el.getAttribute('data-r'), +el.getAttribute('data-c'), el.textContent); save(); } } });
    // paste from Excel or Sheets: tab-separated cells, one line per row, starting at the cell you are in
    doc.addEventListener('paste', function (e) { var el = e.target; if (!(el && el.getAttribute && el.getAttribute('data-r') !== null)) return; var g = gridOf(el); if (!g) return;
      var text = (e.clipboardData || window.clipboardData).getData('text'); if (!text) return; e.preventDefault();
      var r0 = +el.getAttribute('data-r'), c0 = +el.getAttribute('data-c'), lines = text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n').slice(0, 2000);
      lines.forEach(function (line, i) { line.split('\t').forEach(function (v, j) { if (c0 + j < g.cols.length) setCell(g, r0 + i, c0 + j, v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')); }); });
      save(); drawGrid(g); });
    function download(name, text, mime) { var b = new Blob([text], { type: mime }), a = doc.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; doc.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
    var q = function (v) { v = String(v == null ? '' : v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    doc.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-tpl],#dl,[data-wbsave],[data-addrows]') : null; if (!b) return;
      if (b.getAttribute('data-addrows')) { var ag = grids.filter(function (x) { return x.key === b.getAttribute('data-addrows'); })[0]; if (ag) { var ar = state.rows[ag.key] = state.rows[ag.key] || []; var want = Math.max(8, ar.length) + 10; while (ar.length < want) ar.push([]); save(); drawGrid(ag); } return; }
      if (b.getAttribute('data-wbsave') !== null) { var holder = doc.getElementById('wbdata'); holder.textContent = JSON.stringify(workbookData()).replace(/[<>&]/g, function (ch) { return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4); });
        download(spec.slug + '-data-workbook.html', '<!doctype html>\n' + doc.documentElement.outerHTML, 'text/html'); $('#wbnote').textContent = 'Saved with ' + rowCount() + ' row(s). Send this HTML file back to your Facilio team. You can open it again later to carry on.'; return; }
      if (b.id === 'dl') { var pkg = mk(spec.project, state, state.files, new Date().toISOString()); download(spec.slug + '-onboarding-return.json', JSON.stringify(pkg, null, 2), 'application/json'); $('#dlnote').textContent = 'Saved. Send this file back to your Facilio team.'; return; }
      var s = spec.sheets.filter(function (x) { return x.id === b.getAttribute('data-tpl'); })[0]; if (!s) return;
      var rows = [s.cols.map(function (c) { return c.h; }), s.cols.map(function (c) { return c.doc; }), s.cols.map(function (c) { return c.ex; })];
      download(spec.slug + '-' + s.id + '-template.csv', '﻿' + rows.map(function (r) { return r.map(q).join(','); }).join('\r\n') + '\r\n', 'text/csv');
    });
    var pick = $('#files');
    if (pick) pick.addEventListener('change', function () {
      var list = [].slice.call(pick.files || []).slice(0, 100).map(function (f) { return { name: f.name, size: f.size }; }); state.files = list; save(); paint();
      [].slice.call(pick.files || []).slice(0, 100).forEach(function (f, i) {   // the file itself is never kept or sent; a fingerprint lets the team match the file they receive
        try { if (f.size <= 25e6 && window.crypto && crypto.subtle) f.arrayBuffer().then(function (buf) { return crypto.subtle.digest('SHA-256', buf); }).then(function (d) { var h = [].slice.call(new Uint8Array(d)).map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); if (state.files[i] && state.files[i].name === f.name) { state.files[i].sha256 = h; save(); } }, function () { }); } catch (e) { }
      });
    });
    paint();
  }

  const CSS = `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#F4F7FD;color:#1D1A5E;font:16px/1.55 Inter,"Segoe UI",system-ui,Arial,sans-serif}a{color:#1570EF}h1{font-size:30px;line-height:1.2;margin:0 0 8px}h2{font-size:23px;margin:0 0 6px}h3{font-size:19px;margin:0}h4{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#E5197F;margin:20px 0 6px}p{margin:0 0 10px}
.top{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #DCE4F3;padding:10px 16px}.top .in{max-width:980px;margin:0 auto;display:grid;gap:6px}.top b{font-size:14px}#barwrap{height:10px;background:#DCE4F3;border-radius:6px;overflow:hidden}#bar{height:10px;width:0;background:#1570EF;border-radius:6px;transition:width .3s}#barlabel{font-size:13px;color:#4A5784}
main{max-width:980px;margin:0 auto;padding:20px 16px 64px;display:grid;gap:18px}section,.card{background:#fff;border:1px solid #DCE4F3;border-radius:14px;padding:20px;box-shadow:0 1px 0 #fff inset,0 2px 6px rgba(0,0,0,.06)}.hero{border-top:6px solid #1570EF}.lead{font-size:18px;color:#4A5784}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:14px 0 0;padding:0;list-style:none}.steps li{background:#EAF2FF;border-radius:10px;padding:12px}.steps b{display:block;color:#1570EF}nav ul{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:10px 0 0;padding:0}nav a{display:inline-block;padding:6px 12px;border:1px solid #8DB8FF;border-radius:999px;text-decoration:none;font-size:14px}
.pill{display:inline-block;font-size:12px;font-weight:600;border-radius:999px;padding:2px 10px;background:#EAF2FF;color:#1570EF;vertical-align:middle}.pill.crit{background:#FDE7F1;color:#B0125F}.meta{font-size:14px;color:#4A5784}.tw{overflow-x:auto;border:1px solid #DCE4F3;border-radius:10px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #E3E9F5;vertical-align:top}th{background:#F1F5FB;white-space:nowrap}tr:last-child td{border-bottom:0}.req{color:#B0125F;font-weight:600}.ex{font-family:ui-monospace,Consolas,monospace;font-size:13px;color:#4A5784}ul.l,ol.l{margin:0;padding-left:22px}
label{display:block;font-weight:600;margin:12px 0 4px}.ck{display:flex;gap:10px;align-items:flex-start;font-weight:600;margin:14px 0 0}.ck input{width:22px;height:22px;margin:1px 0 0;accent-color:#1570EF;flex:none}textarea{width:100%;min-height:84px;padding:10px;border:1px solid #8DB8FF;border-radius:10px;font:inherit;color:inherit;background:#fff}
button,.btn{font:inherit;font-weight:600;background:#fff;color:#1570EF;border:1px solid #1570EF;border-radius:10px;padding:10px 16px;min-height:44px;cursor:pointer}button.pri{background:#1570EF;color:#fff}button:hover{background:#EAF2FF}button.pri:hover{background:#0F5FD0}:focus-visible{outline:3px solid #1570EF;outline-offset:2px}.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.note{font-size:14px;color:#4A5784}.sr{position:absolute;left:-9999px}
.wbt td{min-width:130px;height:34px;border:1px solid #E3E9F5;background:#fff;outline:none;white-space:pre-wrap}.wbt td:focus{background:#EAF2FF;box-shadow:inset 0 0 0 2px #1570EF}.wbt td select{width:100%;min-height:32px;border:0;background:transparent;font:inherit;color:inherit;padding:0 4px}.wbt td:focus-within{background:#EAF2FF}.wbw{max-height:420px;overflow:auto}.wbt thead th{position:sticky;top:0;z-index:1}
@media(max-width:600px){h1{font-size:24px}section,.card{padding:14px}}@media(prefers-reduced-motion:reduce){*{transition:none!important;scroll-behavior:auto!important}}@media print{.top,button{display:none}body{background:#fff}}`;

  // the data grids of one sheet: type or paste rows; the header marks the required columns
  function gridsHtml(s, grids) {
    return grids.map(g => { const gc = arr(s.cols).filter(c => String(c.ent || '') === g.ent);
      return `<h4>Enter your data${g.ent && grids.length > 1 ? ' · ' + esc(g.ent) : ''}</h4><p class="note">Type into the cells, or copy rows from Excel and paste them (Ctrl+V) into the first cell. Columns marked * are required. Your work is kept in this browser; press Save workbook to get a file you can send back.</p><div class="tw wbw"><table class="wbt"><caption class="sr">Data for ${esc(s.sheet)}${g.ent ? ', ' + esc(g.ent) : ''}</caption><thead><tr>${gc.map(c => `<th scope="col">${esc(c.h)}${c.req ? '<span class="req">*</span>' : ''}</th>`).join('')}</tr></thead><tbody id="gb_${g.key}"></tbody></table></div><div class="row"><button type="button" data-addrows="${g.key}">Add 10 rows</button><button type="button" class="pri" data-wbsave>Save workbook</button></div>`; }).join('');
  }
  function sheetCard(s, id, up, fmt, grids) {
    const cols = arr(s.cols), multi = new Set(cols.map(c => c.ent || '')).size > 1;
    const head = `<tr>${multi ? '<th scope="col">Table</th>' : ''}<th scope="col">Column</th><th scope="col">Required</th><th scope="col">What to enter</th><th scope="col">Example</th></tr>`;
    const body = cols.map(c => `<tr>${multi ? `<td>${esc(c.ent || '')}</td>` : ''}<td><b>${esc(c.h)}</b></td><td>${c.req ? '<span class="req">Required</span>' : 'Optional'}</td><td>${esc([c.doc, c.rule].filter(Boolean).join(' '))}</td><td class="ex">${esc(c.ex || '')}</td></tr>`).join('');
    const sample = cols.some(c => c.ex) ? `<h4>A sample row</h4><div class="tw"><table><caption class="sr">Sample row for ${esc(s.sheet)}</caption><thead><tr>${cols.map(c => `<th scope="col">${esc(c.h)}</th>`).join('')}</tr></thead><tbody><tr>${cols.map(c => `<td class="ex">${esc(c.ex || '')}</td>`).join('')}</tr></tbody></table></div>` : '';
    return `<article class="card" id="sheet-${id}"><h3>${esc(s.sheet)} <span class="pill${s.crit === 'Critical' ? ' crit' : ''}">${esc(s.crit || 'Standard')}</span></h3>
<p class="meta">${arr(s.why).length ? 'For: ' + esc(arr(s.why).join(', ')) : ''}${s.due ? ` · Please send by ${esc(fmt(s.due))}` : ''}</p>
${s.purpose ? `<h4>What to provide and why</h4><p>${esc(s.purpose)}</p>` : ''}${arr(s.before).length ? `<p class="note">Fill these first: ${esc(arr(s.before).join(', '))}.</p>` : ''}
${arr(s.steps).length ? `<h4>How to fill it</h4><ol class="l">${arr(s.steps).map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}
<h4>Fields and formats</h4><div class="tw"><table><caption class="sr">Columns of ${esc(s.sheet)}</caption><thead>${head}</thead><tbody>${body}</tbody></table></div>${sample}
${gridsHtml(s, arr(grids))}
${arr(s.mistakes).length || arr(s.watch).length ? `<h4>Checks we run on this sheet</h4><ul class="l">${arr(s.watch).concat(arr(s.mistakes)).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
<h4>Upload requirements</h4><p>${esc(up)}</p>
<div class="row"><button type="button" data-tpl="${id}">Download the ${esc(s.sheet)} template (CSV)</button></div>
<label class="ck"><input type="checkbox" data-ck="sheet_${id}"> <span>I have filled in the ${esc(s.sheet)} sheet</span></label>
<label for="note_${id}">Notes for the ${esc(s.sheet)} sheet (optional)</label><textarea id="note_${id}" data-ans="note_${id}" maxlength="${MAX_ANSWER}"></textarea></article>`;
  }

  // project: { id, name, customer }. options: { scope:[text], modules:[label], plan:{ lead, tip, master:[{mod,need,skip,sheets}], sheets:[{sheet,crit,due,why,purpose,steps,watch,before,mistakes,cols:[{ent,h,req,doc,rule,ex}]}], files:[{id,name,ask,mods}], auto, none }, upload:{ext,maxMB}, fmt }
  function buildOnboardingHtml(project, options) {
    const pr = project || {}, o = options || {}, p = o.plan || {}, fmt = o.fmt || (x => x), ids = idsFor(o), customer = pr.customer || 'Your organisation';
    const up = o.upload || { ext: ['xlsx', 'csv'], maxMB: 60 }; const upText = `Send the filled file to your Facilio team as ${arr(up.ext).map(x => '.' + x).join(', ')}, up to ${up.maxMB} MB. Keep the header rows from the template.`;
    const spec = { schema: SCHEMA, version: VERSION, project: { id: String(pr.id == null ? '' : pr.id), name: String(pr.name == null ? '' : pr.name) }, slug: slug(`${customer}-${pr.name || ''}`), ids: { checklist: ids.checklist, answers: ids.answers }, grids: ids.grids, sheets: arr(p.sheets).map((s, i) => ({ id: ids.sheets[i].id, cols: arr(s.cols).map(c => ({ h: String(c.h || ''), doc: String(c.doc || ''), ex: String(c.ex || '') })) })) };
    const data = JSON.stringify(spec).replace(/[<>&\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
    const sheets = arr(p.sheets), nav = [['welcome', 'How it works'], sheets.length && ['sheets', 'Your data sheets'], arr(p.files).length && ['files', 'Files to share'], ['questions', 'A few questions'], ['finish', 'Send it back']].filter(Boolean);
    const master = arr(p.master).length ? `<section id="scope"><h2>What we need from you</h2><p>${esc(p.lead || 'We load master data only. Everything that happens day to day is created in Facilio.')}</p><div class="tw"><table><caption class="sr">What we need and what we do not need, by module</caption><thead><tr><th scope="col">Module</th><th scope="col">We need</th><th scope="col">We do not need</th></tr></thead><tbody>${arr(p.master).map(m => `<tr><td><b>${esc(m.mod)}</b></td><td>${esc(m.need)}${arr(m.sheets).length ? `<div class="note">${esc(arr(m.sheets).join(', '))}</div>` : ''}</td><td>${esc(m.skip)}</td></tr>`).join('')}</tbody></table></div></section>` : '';
    const scope = arr(o.scope).length || arr(o.modules).length ? `<section id="contract"><h2>What is in scope</h2>${arr(o.modules).length ? `<p>Modules we confirmed together: <b>${arr(o.modules).map(esc).join(', ')}</b>.</p>` : ''}${arr(o.scope).length ? `<h4>From the agreement</h4><ul class="l">${arr(o.scope).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</section>` : '';
    const files = arr(p.files).length ? `<section id="files"><h2>Files to share</h2><p>Some modules have no template. Share your own files as they are (Excel, PDF or photos). We build them into Facilio.</p>${arr(p.files).map((f, i) => `<article class="card"><h3>${esc(f.name)}</h3>${arr(f.mods).length ? `<p class="meta">For: ${esc(arr(f.mods).join(', '))}</p>` : ''}<p>${esc(f.ask)}</p><label class="ck"><input type="checkbox" data-ck="file_${ids.files[i].id}"> <span>I have these files ready to send</span></label></article>`).join('')}</section>` : '';
    const body = `<header class="top"><div class="in"><b>${esc(customer)} and Facilio: data onboarding</b><div id="barwrap" role="progressbar" aria-label="Your progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="bar"></div></div><span id="barlabel">0 steps done</span></div></header>
<main>
<section class="hero" id="welcome"><h1>Data onboarding</h1><p class="lead">${esc(pr.name || '')}</p><p>This page tells you what data we need, in what format, and why. Work through it at your own pace. It needs no account and sends nothing anywhere: your progress stays in this browser, and you download one small file at the end.</p>
<ol class="steps"><li><b>1. Read</b>See what each sheet is for and how to fill it.</li><li><b>2. Fill</b>Type your data into the sheets below, or paste it from Excel. Tick each sheet off.</li><li><b>3. Return</b>Press Save workbook and send the saved HTML file, with any data files, to your Facilio team.</li></ol>
<nav aria-label="Sections"><ul>${nav.map(n => `<li><a href="#${n[0]}">${esc(n[1])}</a></li>`).join('')}</ul></nav>
<label class="ck"><input type="checkbox" data-ck="read_guide"> <span>I have read how this works</span></label></section>
${scope}${master}
${sheets.length ? `<section id="sheets"><h2>Your data sheets</h2><p>One card per sheet. Open the sheets in this order where you can.</p><div style="display:grid;gap:14px">${sheets.map((s, i) => sheetCard(s, ids.sheets[i].id, upText, fmt, ids.grids.filter(g => g.sheet === s.sheet))).join('')}</div>${p.tip ? `<p class="note">${esc(p.tip)}</p>` : ''}</section>` : ''}
${files}
<section id="questions"><h2>A few questions</h2><p>Short answers are fine. They are saved in this browser as you type.</p>${GENERAL_Q.map(g => `<label for="${g[0]}">${esc(g[1])}</label><textarea id="${g[0]}" data-ans="${g[0]}" maxlength="${MAX_ANSWER}"></textarea>`).join('')}</section>
<section id="finish"><h2>Send it back</h2><p>Choose the data files you will send. Only their names and sizes go into the package, never their contents. Send the files themselves to your Facilio team by your usual secure route.</p>
<label for="files">Your files (optional)</label><input type="file" id="files" multiple><p class="note" id="filelist" aria-live="polite">No files chosen yet.</p>
<label class="ck"><input type="checkbox" data-ck="ready_to_send"> <span>Everything above is ready to send</span></label>
<div class="row"><button type="button" class="pri" data-wbsave>Save workbook (your data and answers in one HTML file)</button></div><p class="note" id="wbnote" aria-live="polite">Save workbook gives you this same page with everything you typed inside it. Send that one file to your Facilio team; they load it straight into their onboarding sheet. You can open it again later to carry on.</p>
<div class="row"><button type="button" id="dl">Download the answers only (small JSON file)</button></div><p class="note" id="dlnote" aria-live="polite">Optional. Only the checklist, the answers and the names of your files.</p></section>
</main>`;
    const js = `(${client.toString()})(${makePackage.toString()},JSON.parse(document.getElementById('spec').textContent),document);`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(customer + ' and Facilio: data onboarding')}</title><style>${CSS}</style></head><body>${body}<script type="application/json" id="spec">${data}</script><script type="application/json" id="wbdata"></script><script>${js}</script></body></html>`;
  }
  const api = { buildOnboardingHtml, idsFor, makePackage, SCHEMA, VERSION, MAX_ANSWER };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBOnbHtml = api;
})(typeof window !== 'undefined' ? window : globalThis);
