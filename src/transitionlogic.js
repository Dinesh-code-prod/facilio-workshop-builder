/* "Bring your project in": decide, from a file's name, size and a small peek, which project area it belongs to (pure code, also run by tests/org_transition.mjs).
   Nothing here reads a whole file and nothing calls an AI: the page reads only the tail of a zip-based file and the first few KB of a text file, so a 100 MB file costs the same as a 10 KB one.
   peek: { text: first characters of readable text (may be ''), sheets: sheet names of a workbook, entries: file names inside a zip }.
   Result: { category, label, view, confidence: 'high'|'medium'|'low', reason } where category is a server file category (work/server/api.mjs FILE_RULES) or '' when the file is not stored here. */
(function (root) {
  'use strict';
  const ext = n => (String(n).split('.').pop() || '').toLowerCase();
  const W = {   // where each category lives in the menu, and what it is called to a person
    transcript: ['Workshop transcript', 'transcripts'], plan: ['Project plan', 'plan'], kickoff: ['Kick-off deck', 'kickoff'], msa: ['Contract or MSA', 'msaflow'], config_package: ['Org package', 'cfginputs'],
    onboarding_files: ['Customer data for onboarding', 'onboarding'], uat_source: ['UAT tracker', 'delivery'], ftr_workbook: ['FTR report', 'ftr'], kpi_workbook: ['KPI workbook', 'kpi'], brd_export: ['BRD document', 'brd'],
    screenshot: ['Screenshot or picture', 'resources'], config_evidence: ['Other project document', 'resources'], email: ['E-mail', 'inbox'], '': ['Not stored here', '']
  };
  const ALLOWED = {   // mirrors FILE_RULES in work/server/api.mjs; the server stays the judge
    transcript: 'vtt srt txt docx json', plan: 'xlsx xlsm xls', kickoff: 'pptx ppt pdf', msa: 'pdf docx txt', config_package: 'gz json zip', onboarding_files: 'xlsx xls csv pdf docx zip', uat_source: 'xlsx xlsm xls csv txt',
    ftr_workbook: 'xlsx xlsm', kpi_workbook: 'xlsx xlsm', brd_export: 'docx pdf', screenshot: 'png jpg jpeg', config_evidence: 'pdf xlsx csv docx pptx png jpg jpeg txt'
  };
  const make = (category, confidence, reason) => ({ category, label: W[category][0], view: W[category][1], confidence, reason });
  const has = (re, ...s) => s.some(x => re.test(String(x || '')));
  function classify(name, size, peek) {
    const e = ext(name), p = peek || {}, text = String(p.text || '').slice(0, 6000), sheets = (p.sheets || []).join(' '), entries = (p.entries || []).join(' '), n = String(name);
    if (e === 'eml' || e === 'msg') return make('email', 'high', 'An e-mail file. Add it in Inbox, where it becomes a ticket.');
    if (['zip', 'gz', 'json'].includes(e)) { if (/PackageConf\.xml|components\//i.test(entries)) return make('config_package', 'high', 'It holds PackageConf.xml: a Facilio org package.'); if (/package|facilio|org/i.test(n) && e !== 'json') return make('config_package', 'medium', 'The name looks like an org package.'); if (e === 'json' && /"?(Package|components)"?/.test(text)) return make('config_package', 'low', 'Looks like package data.'); if (e === 'json' && /transcript|workshop/i.test(n)) return make('transcript', 'medium', 'A JSON file named like a transcript.'); if (e === 'zip') return make('onboarding_files', 'low', 'A zip without a package inside; kept with the customer data.'); }
    if (['vtt', 'srt'].includes(e)) return make('transcript', 'high', 'A caption file: a workshop or call transcript.');
    if (['txt', 'docx', 'json'].includes(e)) {
      if (has(/transcript|workshop|recording|call notes|meeting|minutes|mom\b/i, n)) return make('transcript', 'medium', 'The name says transcript, workshop or meeting.');
      if ((text.match(/\b\d{1,2}:\d{2}(:\d{2})?\b/g) || []).length >= 5 && (text.match(/^\s*(\[?\d{1,2}:\d{2}(:\d{2})?\]?\s*)?[A-Z][\w .'-]{1,30}:\s/gm) || []).length >= 3) return make('transcript', 'medium', 'Time stamps and speaker names, like a transcript.');
    }
    if (['xlsx', 'xlsm', 'xls', 'csv'].includes(e)) {
      if (has(/\buat\b|test.?case|test.?script/i, n, sheets)) return make('uat_source', 'high', 'UAT or test cases in the name or sheets.');
      if (has(/\bftr\b|first.?time.?right/i, n, sheets) && e !== 'xls' && e !== 'csv') return make('ftr_workbook', 'high', 'An FTR workbook.');
      if (has(/\bkpi/i, n, sheets) && e !== 'xls' && e !== 'csv') return make('kpi_workbook', 'high', 'A KPI workbook.');
      if (has(/plan|schedule|gantt|timeline|wbs|milestone/i, n, sheets) && e !== 'csv') return make('plan', 'high', 'A plan or schedule in the name or sheets.');
      if (has(/data|import|onboard|asset|load|template|inventory|migration/i, n, sheets)) return make('onboarding_files', 'medium', 'Customer data for loading.');
      return make('onboarding_files', 'low', 'A spreadsheet: assumed to be customer data. Change it if it is not.');
    }
    if (['pdf', 'docx', 'txt'].includes(e)) {
      if (has(/\bmsa\b|master.?service|agreement|contract|\bsow\b|statement.?of.?work/i, n, text)) return make('msa', has(/\bmsa\b|master.?service|agreement|contract|\bsow\b/i, n) ? 'high' : 'medium', 'Contract words in the name or text.');
      if (has(/\bbrd\b|business.?requirement/i, n, text) && e !== 'txt') return make('brd_export', 'high', 'A BRD.');
    }
    if (['pptx', 'ppt', 'pdf'].includes(e) && has(/kick.?off|kickoff/i, n)) return make('kickoff', 'high', 'The name says kick-off.');
    if (['pptx', 'ppt'].includes(e)) return make('kickoff', 'low', 'A presentation: assumed to be the kick-off deck.');
    if (['png', 'jpg', 'jpeg'].includes(e)) return make('screenshot', 'medium', 'A picture.');
    if (ALLOWED.config_evidence.split(' ').includes(e)) return make('config_evidence', 'low', 'Kept with the project documents; no area matched.');
    return make('', 'low', 'This file type (.' + e + ') cannot be stored here.');
  }
  // a plain-words line about a batch, so a person sees the size before anything is sent
  const size = b => (b >= 1e6 ? (b / 1e6).toFixed(b >= 1e8 ? 0 : 1) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB');
  const api = { classify, WHERE: W, ALLOWED, size };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBTransition = api;
})(typeof window !== 'undefined' ? window : globalThis);
