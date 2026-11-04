/* Check a package returned from the customer's onboarding HTML (pure code, also run by tests/onboarding_html.mjs). Nothing the customer sent is trusted: the package is checked here BEFORE it touches any project record.
   validateReturn(json, project, rules) never throws. It returns { ok, errors[], warnings[], clean }; `clean` is a fresh object holding only the known, checked fields (null when there are errors), safe to store.
   rules: { checklistIds:[...], answerIds:[...], fileExts:[...], maxBytes, maxFileBytes } (ids come from onbhtml.idsFor, so they are the ones the generated page defined). */
(function (root) {
  'use strict';
  const SCHEMA = 'fds-onboarding-return', VERSION = 1, MAX_BYTES = 2e6, MAX_ANSWER = 4000, MAX_FILES = 200, MAX_FILE_BYTES = 60e6, MAX_NODES = 20000, MAX_DEPTH = 8;
  const FILE_EXTS = ['xlsx', 'xls', 'csv', 'pdf', 'docx', 'zip'];   // the same list the server accepts for onboarding_files
  const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  // true when a key such as __proto__ appears anywhere, or the tree is absurdly deep or wide
  function hostile(x, depth, count) {
    if (depth > MAX_DEPTH) return 'it is nested too deeply';
    if (++count.n > MAX_NODES) return 'it has too many entries';
    if (Array.isArray(x)) { for (const v of x) { const r = hostile(v, depth + 1, count); if (r) return r; } return ''; }
    if (isObj(x)) { for (const k of Object.keys(x)) { if (BAD_KEYS.has(k)) return 'it contains the reserved key "' + k + '"'; const r = hostile(x[k], depth + 1, count); if (r) return r; } }
    return '';
  }

  function validateReturn(json, project, rules) {
    const errors = [], warnings = [], fail = () => ({ ok: false, errors, warnings, clean: null });
    try {
      const R = rules || {}, maxBytes = R.maxBytes || MAX_BYTES; let pkg = json;
      if (typeof json === 'string') {
        if (new TextEncoder().encode(json).length > maxBytes) { errors.push('The file is larger than ' + (maxBytes / 1e6) + ' MB, so it was not read.'); return fail(); }
        try { pkg = JSON.parse(json); } catch (e) { errors.push('The file is not valid JSON.'); return fail(); }
      } else { let len = 0; try { len = JSON.stringify(json).length; } catch (e) { errors.push('The package could not be read.'); return fail(); } if (len > maxBytes) { errors.push('The package is larger than ' + (maxBytes / 1e6) + ' MB.'); return fail(); } }
      if (!isObj(pkg)) { errors.push('The package is not a JSON object.'); return fail(); }
      const h = hostile(pkg, 0, { n: 0 }); if (h) { errors.push('The package was refused: ' + h + '.'); return fail(); }
      if (pkg.schema !== SCHEMA) { errors.push('This is not an onboarding package (schema "' + String(pkg.schema).slice(0, 40) + '").'); return fail(); }
      if (pkg.version !== VERSION) { errors.push('Unsupported package version "' + String(pkg.version).slice(0, 20) + '" (expected ' + VERSION + ').'); return fail(); }
      const pid = project && project.id != null ? String(project.id) : '';
      if (!isObj(pkg.project) || typeof pkg.project.id !== 'string') errors.push('The package does not say which project it is for.');
      else if (!pid || pkg.project.id !== pid) errors.push('The package is for a different project' + (pkg.project.name ? ' ("' + String(pkg.project.name).slice(0, 60) + '")' : '') + '.');
      else if (project && project.name && pkg.project.name !== project.name) warnings.push('The project name in the package differs from this project\'s name; the id matches, so it was accepted.');
      const known = new Set(['schema', 'version', 'project', 'generatedAt', 'answers', 'checklist', 'files']);
      Object.keys(pkg).filter(k => !known.has(k)).forEach(k => warnings.push('Ignored an unknown field "' + k.slice(0, 40) + '".'));
      const clean = { schema: SCHEMA, version: VERSION, project: { id: pid, name: String((project && project.name) || '').slice(0, 200) }, generatedAt: '', answers: {}, checklist: {}, files: [] };
      if (pkg.generatedAt != null) { if (typeof pkg.generatedAt === 'string' && pkg.generatedAt.length <= 40 && !isNaN(Date.parse(pkg.generatedAt))) clean.generatedAt = pkg.generatedAt; else warnings.push('The date in the package is not a valid date and was dropped.'); }
      // answers: text only, known ids only
      if (pkg.answers != null) { if (!isObj(pkg.answers)) errors.push('"answers" must be an object.'); else Object.keys(pkg.answers).forEach(k => { const v = pkg.answers[k];
        if (R.answerIds && !R.answerIds.includes(k)) { warnings.push('Ignored an answer for "' + k.slice(0, 40) + '": this page has no such question.'); return; }
        if (typeof v !== 'string') errors.push('The answer "' + k.slice(0, 40) + '" is not text.'); else if (v.length > MAX_ANSWER) errors.push('The answer "' + k.slice(0, 40) + '" is longer than ' + MAX_ANSWER + ' characters.'); else if (v.trim()) clean.answers[k] = v; }); }
      // checklist: only ids the page defined, true or false
      if (pkg.checklist != null) { if (!isObj(pkg.checklist)) errors.push('"checklist" must be an object.'); else Object.keys(pkg.checklist).forEach(k => { const v = pkg.checklist[k];
        if (R.checklistIds && !R.checklistIds.includes(k)) { errors.push('Unknown checklist item "' + k.slice(0, 40) + '". The plan may have changed since the page was sent.'); return; }
        if (typeof v !== 'boolean') errors.push('The checklist item "' + k.slice(0, 40) + '" must be true or false.'); else clean.checklist[k] = v; }); }
      // files: names, sizes, fingerprints (never contents)
      if (pkg.files != null) { if (!Array.isArray(pkg.files)) errors.push('"files" must be a list.'); else if (pkg.files.length > MAX_FILES) errors.push('More than ' + MAX_FILES + ' files are listed.'); else pkg.files.forEach((f, i) => {
        if (!isObj(f) || typeof f.name !== 'string' || !f.name.trim() || f.name.length > 255 || /[\\/\u0000-\u001f]/.test(f.name)) { errors.push('File ' + (i + 1) + ' has no usable name.'); return; }
        const size = f.size == null ? 0 : f.size; if (!Number.isInteger(size) || size < 0 || size > (R.maxFileBytes || MAX_FILE_BYTES)) { errors.push('The size of "' + f.name.slice(0, 60) + '" is not valid.'); return; }
        const o = { name: f.name, size }; if (f.sha256 != null) { if (typeof f.sha256 === 'string' && /^[0-9a-f]{64}$/.test(f.sha256)) o.sha256 = f.sha256; else warnings.push('The fingerprint of "' + f.name.slice(0, 60) + '" was not valid and was dropped.'); }
        const ext = (f.name.split('.').pop() || '').toLowerCase(); if (!(R.fileExts || FILE_EXTS).includes(ext)) warnings.push('"' + f.name.slice(0, 60) + '" is not an accepted file type.');
        clean.files.push(o); }); }
      return { ok: errors.length === 0, errors, warnings, clean: errors.length ? null : clean };
    } catch (e) { return { ok: false, errors: errors.concat(['The package could not be checked.']), warnings, clean: null }; }
  }
  const api = { validateReturn, SCHEMA, VERSION, MAX_BYTES, FILE_EXTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBOnbReturn = api;
})(typeof window !== 'undefined' ? window : globalThis);
