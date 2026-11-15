/* The project plan as an outline for the plan workbook: each phase is a heading with its tasks under it, every task has a start, an end,
   a number of working days and the tasks it depends on (the BRD sign-off before configuration, and so on). Pure code (also run by tests/planbook.mjs);
   src/kickoff.js writes it to Excel with formulas, so changing a duration or a date in Excel moves everything that depends on it. */
(function (root) {
  'use strict';
  const DAY = 864e5, t = s => Date.parse(String(s).slice(0, 10) + 'T00:00:00Z'), iso = ms => new Date(ms).toISOString().slice(0, 10);
  const wd = ms => { const d = new Date(ms).getUTCDay(); return d !== 0 && d !== 6; };
  /** the working day n days after a date (n >= 0), Saturday and Sunday off, like Excel WORKDAY */
  const workday = (s, n) => { let ms = t(s); while (!wd(ms)) ms += DAY; for (let k = 0; k < n; k++) { ms += DAY; while (!wd(ms)) ms += DAY; } return iso(ms); };
  const netdays = (a, b) => { let n = 0; for (let ms = t(a); ms <= t(b); ms += DAY) if (wd(ms)) n++; return Math.max(1, n); };
  // the tasks of each phase (Configuration gets one task per module in scope); a phase depends on the phases listed in DEP
  const SUB = {
    kickoff: ['Kick-off meeting', 'Kick-off deck and minutes shared'], intro: ['Project introduction', 'Team and access set up'], scope: ['Scope walk-through', 'Scope confirmed'],
    custprep: ['Customer data templates sent', 'Customer preparation done'], data: ['Data collected', 'Data cleaned and checked', 'Data loaded'],
    workshops: ['Requirement sessions', 'Session minutes and open questions'], design: ['State flows, fields and forms', 'Roles, access and notifications', 'Solution reviewed'],
    brd: ['BRD drafted', 'BRD reviewed with the customer', 'BRD signed off'], validation: ['Internal testing', 'Fixes'], uat: ['UAT test cases and guide', 'UAT with the customer', 'UAT sign-off'],
    ftr: ['FTR run', 'FTR report'], training: ['Training sessions', 'Guides and videos shared'], golive: ['Go-live readiness check', 'Go-live'], handover: ['Handover to support', 'Project closure']
  };
  const DEP = { intro: ['kickoff'], scope: ['intro'], custprep: ['scope'], data: ['custprep'], workshops: ['custprep'], design: ['workshops', 'data'], brd: ['design'], config: ['brd'], validation: ['config'], uat: ['validation'], ftr: ['uat'], training: ['ftr'], golive: ['training'], handover: ['golive'] };
  const pid = r => String((r && r.id) || '').replace(/^tr_msa_/, '');
  /** rows: the plan phases [{ id, title, start, end, owner, origin }]; modules: names in scope. Returns [{ key, level, title, start, end, days, deps: [keys], owner, origin }] */
  function outline(rows, modules) {
    const ph = (Array.isArray(rows) ? rows : []).filter(r => r && /^\d{4}-\d{2}-\d{2}/.test(String(r.start || ''))).slice().sort((a, b) => String(a.start).localeCompare(String(b.start)));
    const out = [], lastOf = {}; const mods = (Array.isArray(modules) ? modules : []).filter(Boolean).slice(0, 12);
    ph.forEach(r => {
      const id = pid(r), end = String(r.end || r.start).slice(0, 10), start = String(r.start).slice(0, 10);
      const names = id === 'config' ? ['Portfolio (sites, buildings, spaces)'].concat(mods.map(m => 'Configure ' + m), ['Roles and access', 'Notifications and approvals']) : (SUB[id] || ['Work']);
      out.push({ key: id || r.title, level: 0, title: r.title, start, end, days: netdays(start, end), deps: [], owner: r.owner || '', origin: r.origin || '' });
      const total = netdays(start, end), n = names.length; let at = start, prev = '';
      names.forEach((nm, i) => { const days = Math.max(1, Math.floor(total / n) + (i < total % n ? 1 : 0)); const key = (id || 'p') + '.' + (i + 1);
        const deps = i === 0 ? (DEP[id] || []).map(d => lastOf[d]).filter(Boolean) : [prev];
        const s0 = i === 0 ? start : workday(at, 1); const e0 = workday(s0, days - 1); out.push({ key, level: 1, title: nm, start: s0, end: e0, days, deps, owner: r.owner || '', origin: r.origin || '' }); prev = key; at = e0; });
      lastOf[id] = prev;
    });
    return out;
  }
  const api = { outline, workday, netdays, SUB, DEP };
  root.FWBPlanBook = api; if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
