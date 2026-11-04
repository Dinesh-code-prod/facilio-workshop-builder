/* The results file a consultant downloads from the FTR checklist page (src/ftrhtml.js), checked and summed (pure code, also run by tests/ftr_html.mjs). E2 workspace 6.
   Nothing in the file is trusted: validateFtrResult never throws and returns { ok, errors[], warnings[], clean }. `clean` is a fresh object holding only the known, checked fields (null when there are errors).
   summarise counts the CONFIGURATION checks and the FUNCTIONAL tests apart. There is no combined total or combined pass rate anywhere: XML or configuration inspection does not prove runtime behaviour. */
(function (root) {
  'use strict';
  const SCHEMA = 'fds-ftr-result', VERSION = 1, MAX_BYTES = 1e6, MAX_COMMENT = 2000, MAX_NAME = 120, MAX_RESULTS = 20000, MAX_NODES = 100000, MAX_DEPTH = 8, MAX_ERRORS = 25;
  const RESULTS = ['Pass', 'Fail', 'Blocked', 'N/A'];
  const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;
  const short = s => String(s).replace(/[\r\n\t]/g, ' ').slice(0, 60);

  function hostile(x, depth, count) {
    if (depth > MAX_DEPTH) return 'it is nested too deeply';
    if (++count.n > MAX_NODES) return 'it has too many entries';
    if (Array.isArray(x)) { for (const v of x) { const r = hostile(v, depth + 1, count); if (r) return r; } return ''; }
    if (isObj(x)) { for (const k of Object.keys(x)) { if (BAD_KEYS.has(k)) return 'it contains the reserved key "' + k + '"'; const r = hostile(x[k], depth + 1, count); if (r) return r; } }
    return '';
  }

  // json: the file text or the parsed object. list: the checklist (result of buildFtrChecklist), which defines the ids that may come back.
  function validateFtrResult(json, list) {
    const errors = [], warnings = [], fail = () => ({ ok: false, errors, warnings, clean: null }), err = m => { if (errors.length < MAX_ERRORS) errors.push(m); };
    try {
      let pkg = json;
      if (typeof json === 'string') {
        if (new TextEncoder().encode(json).length > MAX_BYTES) { errors.push('The file is larger than 1 MB, so it was not read.'); return fail(); }
        try { pkg = JSON.parse(json); } catch (e) { errors.push('The file is not valid JSON.'); return fail(); }
      } else { let len = 0; try { len = JSON.stringify(json).length; } catch (e) { errors.push('The results could not be read.'); return fail(); } if (len > MAX_BYTES) { errors.push('The results are larger than 1 MB.'); return fail(); } }
      if (!isObj(pkg)) { errors.push('The results are not a JSON object.'); return fail(); }
      const h = hostile(pkg, 0, { n: 0 }); if (h) { errors.push('The results were refused: ' + h + '.'); return fail(); }
      if (pkg.schema !== SCHEMA) { errors.push('This is not an FTR results file (schema "' + short(pkg.schema) + '").'); return fail(); }
      if (pkg.version !== VERSION) { errors.push('Unsupported version "' + short(pkg.version) + '" (expected ' + VERSION + ').'); return fail(); }
      const L = list && typeof list === 'object' ? list : {}, known = new Set((Array.isArray(L.items) ? L.items : []).map(i => i && i.id)), mine = L.project || {};
      const p = isObj(pkg.project) ? pkg.project : {}; const pid = typeof p.id === 'string' ? p.id.slice(0, 80) : '', pname = typeof p.name === 'string' ? p.name.slice(0, 200) : '';
      if (mine.id && pid && String(mine.id) !== pid) err('These results are for a different project.');
      else if (mine.name && pname && mine.name !== pname) warnings.push('The project name in the file ("' + short(pname) + '") differs from this project.');
      let by = ''; if (pkg.by !== undefined) { if (typeof pkg.by !== 'string' || pkg.by.length > MAX_NAME) err('The name must be text of at most ' + MAX_NAME + ' characters.'); else by = pkg.by.trim(); }
      let generatedAt = ''; if (pkg.generatedAt !== undefined) { if (typeof pkg.generatedAt === 'string' && ISO.test(pkg.generatedAt) && !isNaN(Date.parse(pkg.generatedAt))) generatedAt = pkg.generatedAt; else warnings.push('The time the file was made is not a valid date and was ignored.'); }
      Object.keys(pkg).forEach(k => { if (!['schema', 'version', 'project', 'by', 'generatedAt', 'results'].includes(k)) warnings.push('Unknown field "' + short(k) + '" was ignored.'); });
      if (!Array.isArray(pkg.results)) { err('The results must be a list.'); return fail(); }
      if (pkg.results.length > MAX_RESULTS) { err('There are too many results (more than ' + MAX_RESULTS + ').'); return fail(); }
      const seen = new Set(), out = [], extra = new Set();
      pkg.results.forEach((r, i) => {
        const at = 'Result ' + (i + 1);
        if (!isObj(r)) { err(at + ' is not an object.'); return; }
        if (typeof r.id !== 'string' || !known.has(r.id)) { err(at + ': unknown check id "' + short(r.id) + '".'); return; }
        if (seen.has(r.id)) { err(at + ': the check "' + short(r.id) + '" appears twice.'); return; } seen.add(r.id);
        const res = r.result === undefined ? '' : r.result;
        if (typeof res !== 'string' || (res !== '' && !RESULTS.includes(res))) { err(at + ' (' + short(r.id) + '): the result must be one of ' + RESULTS.join(', ') + '.'); return; }
        const comment = r.comment === undefined ? '' : r.comment;
        if (typeof comment !== 'string' || comment.length > MAX_COMMENT) { err(at + ' (' + short(r.id) + '): the comment must be text of at most ' + MAX_COMMENT + ' characters.'); return; }
        let when = ''; if (r.at !== undefined && r.at !== '') { if (typeof r.at === 'string' && ISO.test(r.at) && !isNaN(Date.parse(r.at))) when = r.at; else warnings.push(at + ' (' + short(r.id) + '): the time is not a valid date and was ignored.'); }
        Object.keys(r).forEach(k => { if (!['id', 'result', 'comment', 'at'].includes(k) && !extra.has(k)) { extra.add(k); warnings.push('Unknown field "' + short(k) + '" in the results was ignored.'); } });
        if (!res && !comment.trim()) { warnings.push(at + ' (' + short(r.id) + '): no result and no comment, so it was left out.'); return; }
        out.push({ id: r.id, result: res, comment, at: when });
      });
      if (errors.length) return fail();
      return { ok: true, errors, warnings, clean: { schema: SCHEMA, version: VERSION, project: { id: pid, name: pname }, generatedAt, by, results: out } };
    } catch (e) { errors.push('The results could not be read.'); return fail(); }
  }

  // list: the checklist. results: clean.results (an array), or the whole clean object. Configuration and functional are tallied apart; nothing is added across them.
  function summarise(list, results) {
    const items = list && Array.isArray(list.items) ? list.items : [], rs = Array.isArray(results) ? results : (results && Array.isArray(results.results) ? results.results : []);
    const by = new Map(); rs.forEach(r => { if (r && typeof r.id === 'string' && !by.has(r.id)) by.set(r.id, r); });
    const tally = () => ({ total: 0, pass: 0, fail: 0, blocked: 0, na: 0, notRun: 0, passRate: null });
    const out = { configuration: tally(), functional: tally(), failed: [], blocked: [] };
    items.forEach(i => {
      const t = i && out[i.section]; if (!t || (i.section !== 'configuration' && i.section !== 'functional')) return; t.total++;
      const r = by.get(i.id), res = r && RESULTS.includes(r.result) ? r.result : '', row = () => ({ id: i.id, section: i.section, type: i.type, module: i.module || '', title: i.title, comment: r ? String(r.comment || '') : '' });
      if (res === 'Pass') t.pass++; else if (res === 'Fail') { t.fail++; out.failed.push(row()); } else if (res === 'Blocked') { t.blocked++; out.blocked.push(row()); } else if (res === 'N/A') t.na++; else t.notRun++;
    });
    ['configuration', 'functional'].forEach(k => { const t = out[k], ran = t.pass + t.fail + t.blocked; t.passRate = ran ? Math.round(100 * t.pass / ran) : null; });   // of the checks that were actually run, never of both sections together
    return out;
  }
  const api = { validateFtrResult, summarise, SCHEMA, VERSION, RESULTS, MAX_BYTES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBFtrResult = api;
})(typeof window !== 'undefined' ? window : globalThis);
