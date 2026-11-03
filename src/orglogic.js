/* Link a project to its org package folder in facilio-config-data (pure code, also run by tests/org_transition.mjs).
   The repository's repo_index.json lists the org folders by region: { "US": ["400000077-FacilioDashboardRepo", ...], "AE": [...] }. A folder is "<region in lower case>/<org id>-<name>".
   The project keeps the org id (Project details) and, once linked, the folder; the connector hands both to Claude so a skill knows where to read the package. */
(function (root) {
  'use strict';
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  function entries(index) {
    const out = []; if (!index || typeof index !== 'object') return out;
    Object.keys(index).forEach(region => { if (!Array.isArray(index[region])) return; index[region].forEach(n => { const m = /^(\d+)-(.+)$/.exec(String(n)); if (m) out.push({ region, id: m[1], name: m[2], folder: region.toLowerCase() + '/' + n }); }); });
    return out;
  }
  // by org id when the project has one, otherwise by the customer's name (a few candidates for a person to pick from)
  function findOrgs(index, q) {
    q = q || {}; const all = entries(index); const id = String(q.orgId || '').trim(); if (id) return all.filter(e => e.id === id);
    const c = norm(q.customer); return c.length >= 3 ? all.filter(e => { const n = norm(e.name); return n.includes(c) || (n.length >= 4 && c.includes(n)); }).sort((a, b) => norm(b.name).includes(c) - norm(a.name).includes(c)).slice(0, 8) : [];   // folders that contain the whole name come first
  }
  // p: { orgId (Project details), packageOrgId (imported package), folder (linked) }
  function compare(p) {
    p = p || {}; const f = (/\/(\d+)-/.exec(String(p.folder || '')) || [])[1] || '';
    const ids = [['the org id in Project details', String(p.orgId || '').trim()], ['the imported org package', String(p.packageOrgId || '').trim()], ['the linked folder', f]].filter(x => x[1]);
    if (!ids.length) return { state: 'none', text: 'No org linked yet.' };
    if (ids.some(x => x[1] !== ids[0][1])) return { state: 'mismatch', text: 'These do not agree: ' + ids.map(x => x[0] + ' says ' + x[1]).join('; ') + '. Check which org this project is for.' };
    return { state: 'ok', text: 'Org ' + ids[0][1] + (ids.length > 1 ? ' (agrees in ' + ids.map(x => x[0]).join(', ') + ')' : '') + '.' };
  }
  const api = { entries, findOrgs, compare };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBOrg = api;
})(typeof window !== 'undefined' ? window : globalThis);
