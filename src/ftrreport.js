/* FTR report as a page and as one HTML file: modules, their use cases, test cases and results.
   Pure code (also run by tests/ftrreport.mjs). The input is the text of the FTR draft that Claude saves with the make_ftr job:
     ## <Module>
     ### Use case: <title>
     | ID | Test case | Steps | Expected | Result | Evidence |
   A result is read as written (Pass, Fail, Blocked, anything else is Not run). Nothing is filled in: a module with no test case shows none. */
(function (root) {
  'use strict';
  const V = root.FWBViews = root.FWBViews || {};
  const cell = s => String(s == null ? '' : s).replace(/<br\s*\/?>/gi, '; ').replace(/\s+/g, ' ').trim().slice(0, 600);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const result = s => { const t = String(s || '').toLowerCase(); return /\b(pass|passed|ok)\b|✓|✔/.test(t) ? 'pass' : /\b(fail|failed)\b|✗|✘/.test(t) ? 'fail' : /block/.test(t) ? 'blocked' : 'notrun'; };
  const LABEL = { pass: 'Passed', fail: 'Failed', blocked: 'Blocked', notrun: 'Not run' };
  const rowCells = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell);
  const isSep = l => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
  const colOf = (head, re, fb) => { const i = head.findIndex(h => re.test(h)); return i >= 0 ? i : fb; };

  /** md -> { intro, modules: [{ name, useCases: [{ title, cases: [{ id, title, steps, expected, result, evidence, comments }] }] }], counts: { total, pass, fail, blocked, notrun } } */
  function parse(md) {
    const lines = String(md || '').replace(/\r/g, '').split('\n'), mods = []; let mod = null, uc = null, head = null; const intro = [];
    const useCase = () => { if (!mod) { mod = { name: 'General', useCases: [] }; mods.push(mod); } uc = { title: 'Test cases', cases: [] }; mod.useCases.push(uc); return uc; };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i], h2 = /^##\s+(?!#)(.+)$/.exec(l), h3 = /^###\s+(.+)$/.exec(l);
      if (h2) { mod = { name: cell(h2[1].replace(/^\d+[.)]\s*/, '').replace(/^module:\s*/i, '')), useCases: [] }; mods.push(mod); uc = null; head = null; continue; }
      if (h3) { if (!mod) { mod = { name: 'General', useCases: [] }; mods.push(mod); } uc = { title: cell(h3[1].replace(/^use case:\s*/i, '')), cases: [] }; mod.useCases.push(uc); head = null; continue; }
      if (!mod && !/^\s*\|/.test(l)) { if (l.trim() && !/^#/.test(l)) intro.push(cell(l)); continue; }
      if (/^\s*\|/.test(l)) {
        if (!head) { if (lines[i + 1] && isSep(lines[i + 1])) { head = rowCells(l).map(x => x.toLowerCase()); i++; } continue; }
        if (isSep(l)) continue; const c = rowCells(l); if (!c.some(Boolean)) continue; const u = uc || useCase();
        const ci = { id: colOf(head, /^(id|tc|test case id|#)$/, 0), title: colOf(head, /test case|scenario|check|title|name/, 1), steps: colOf(head, /step/, 2), exp: colOf(head, /expected|outcome/, 3), res: colOf(head, /result|status/, 4), ev: colOf(head, /evidence|screenshot|proof|link/, 5), com: colOf(head, /comment|note/, -1) };
        const cs = { id: c[ci.id] || '', title: c[ci.title] || '', steps: c[ci.steps] || '', expected: c[ci.exp] || '', result: result(c[ci.res]), evidence: c[ci.ev] || '', comments: ci.com >= 0 ? (c[ci.com] || '') : '' };
        if (cs.id || cs.title) u.cases.push(cs); continue;
      }
      head = null;
    }
    const counts = { total: 0, pass: 0, fail: 0, blocked: 0, notrun: 0 };
    mods.forEach(m => m.useCases.forEach(u => u.cases.forEach(c => { counts.total++; counts[c.result]++; })));
    return { intro: intro.join(' ').slice(0, 800), modules: mods.filter(m => m.useCases.some(u => u.cases.length) || m.name !== 'General'), counts };
  }
  const tagOf = r => '<span class="fr-tag fr-' + r + '">' + LABEL[r] + '</span>';
  const evOf = e => (/^https?:\/\//i.test(e) ? '<a href="' + esc(e) + '" target="_blank" rel="noopener">Open</a>' : esc(e));
  /** the report body (used by the page and by the HTML file) */
  function body(rep) {
    const c = rep.counts, bar = '<div class="fr-sum"><div><b>' + c.total + '</b><span>test cases</span></div><div class="pass"><b>' + c.pass + '</b><span>passed</span></div><div class="fail"><b>' + c.fail + '</b><span>failed</span></div><div><b>' + c.blocked + '</b><span>blocked</span></div><div><b>' + c.notrun + '</b><span>not run</span></div></div>';
    const mods = rep.modules.map(m => { const all = m.useCases.reduce((a, u) => a.concat(u.cases), []), p = all.filter(x => x.result === 'pass').length;
      return '<section class="fr-mod"><div class="fr-mh"><h3>' + esc(m.name) + '</h3><span>' + p + ' of ' + all.length + ' passed</span></div>' + (m.useCases.filter(u => u.cases.length).map(u => '<div class="fr-uc"><h4>' + esc(u.title) + '</h4><div class="fr-tw"><table><thead><tr><th>ID</th><th>Test case</th><th>Steps</th><th>Expected</th><th>Result</th><th>Evidence</th></tr></thead><tbody>'
        + u.cases.map(x => '<tr><td>' + esc(x.id) + '</td><td>' + esc(x.title) + '</td><td>' + esc(x.steps) + '</td><td>' + esc(x.expected) + '</td><td>' + tagOf(x.result) + '</td><td>' + evOf(x.evidence) + '</td></tr>').join('') + '</tbody></table></div></div>').join('') || '<p class="fr-none">No test case for this module yet.</p>') + '</section>'; }).join('');
    return (rep.intro ? '<p class="fr-intro">' + esc(rep.intro) + '</p>' : '') + bar + (mods || '<p class="fr-none">The report has no module yet.</p>');
  }
  const CSS = '.fr-sum{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 16px}.fr-sum div{border:1px solid #e5e5e5;border-radius:12px;padding:10px 16px;min-width:96px;background:#fff}.fr-sum b{display:block;font-size:22px;color:#0a0a0a}.fr-sum span{font-size:12px;color:#525252}.fr-sum .pass b{color:#067647}.fr-sum .fail b{color:#b42318}'
    + '.fr-mod{border:1px solid #e5e5e5;border-radius:16px;background:#fff;margin:0 0 14px;overflow:hidden}.fr-mh{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #ececec}.fr-mh h3{margin:0;font-size:15px}.fr-mh span{font-size:12px;color:#525252}.fr-uc{padding:10px 16px}.fr-uc h4{margin:0 0 8px;font-size:13px;color:#262626}'
    + '.fr-tw{overflow-x:auto}.fr-tw table{width:100%;border-collapse:collapse;font-size:12.5px}.fr-tw th,.fr-tw td{text-align:left;vertical-align:top;padding:7px 8px;border-bottom:1px solid #f0f0f0}.fr-tw th{color:#525252;font-weight:600}'
    + '.fr-tag{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:600;background:#f4f4f5;color:#404040}.fr-pass{background:#ecfdf3;color:#067647}.fr-fail{background:#fef3f2;color:#b42318}.fr-blocked{background:#fffaeb;color:#b54708}.fr-none,.fr-intro{color:#525252;font-size:13px;margin:8px 16px 14px}';
  /** one self-contained HTML file (no outside request) */
  function html(rep, project) {
    const n = (project && (project.customer || project.name)) || 'Project';
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:"><title>FTR report: ' + esc(n) + '</title><style>body{font-family:Geist,Segoe UI,Arial,sans-serif;margin:0;background:#fafafa;color:#0a0a0a}main{max-width:1100px;margin:0 auto;padding:32px 20px}h1{font-size:24px;margin:0 0 4px}.sub{color:#525252;margin:0 0 20px}' + CSS + '</style></head><body><main><h1>FTR report</h1><p class="sub">' + esc(n) + '</p>' + body(rep) + '</main></body></html>';
  }
  V.ftrReport = { parse, body, html, CSS, result, LABEL };
  if (typeof module !== 'undefined' && module.exports) module.exports = V.ftrReport;
})(typeof window !== 'undefined' ? window : globalThis);
