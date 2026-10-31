/* What's new: every version of Delivery Studio, newest first, so a team member or customer can see what changed and when.
   To announce a change, add one entry at the TOP of RELEASES when it ships. `all: true` shows the entry to customers too (keep those in plain
   language); other entries are for the Facilio team. Nothing is stored; the only thing kept in the browser is the version you last opened. */
(function (root) {
  'use strict';
  const F = root.FWB; const { esc } = F; const V = root.FWBViews; const ACT = V.ACT;
  // kind: UPDATE (a new capability) or FIXES (something that was wrong now works)
  const RELEASES = [
    { v: '1.7.0', date: '2026-10-31', kind: 'UPDATE', all: true, title: 'Simpler menus, Learn & Prepare, Guides & Video Studio', notes: [
      'The menu now follows the delivery path: kick-off, workshops, design, UAT, hypercare. Rarely needed pages moved to "More tools". Nothing was removed.',
      'Customers get a shorter menu and a new Learn & Prepare page: what Facilio is, how the project runs, how to prepare for a session, what to bring, and the words they will hear.',
      'Contract, Scope and Data Onboarding are on for new customer portals. Explore Facilio is off by default.',
      'New for the team: Guides & Video Studio writes a video or walkthrough brief from the customer\'s own configuration (fields and state flow) and names the real product screens to use.',
      'This What\'s new page.'] },
    { v: '1.6.0', date: '2026-10-31', kind: 'UPDATE', title: 'Draft in Claude', notes: [
      'In the Generate with AI drawer, Draft in Claude copies the prompt for your own Claude account, and Import as draft brings the reply back for review. No API key, no extra cost.',
      'The pasted reply stays an unapproved draft. Unknown or missing source citations are flagged.'] },
    { v: '1.5.0', date: '2026-10-31', kind: 'UPDATE', title: 'Solution design navigation and guided guides', notes: [
      'Solution design pages grouped under sub-headings.',
      'Guided user guides and UAT guides, written one section at a time from confirmed requirements.',
      'Org package export, whiteboard delete, lifecycle fixes and a smoother tree intro.'] },
    { v: '1.4.0', date: '2026-10-31', kind: 'UPDATE', title: 'Tabs & Layouts, shared AI layer, Project Tasks, Admin Command Center', notes: [
      'Tabs & Layouts like Facilio: rename, re-icon, reorder and hide menu groups per project, with the reference theme.',
      'One AI layer for DeepSeek and Claude, and Project Tasks with an AI task assistant, sheets and Excel import and export.',
      'Admin Command Center: portfolio health with evidence, drill-downs, an AI briefing and My work.'] },
    { v: '1.3.1', date: '2026-10-28', kind: 'FIXES', title: 'BRD diagram sizes', notes: [
      'Each BRD diagram can be page width, a full page, or a landscape page of its own, and resized with - and + or by dragging its corner. Word and PDF use the same size.'] },
    { v: '1.3.0', date: '2026-10-28', kind: 'UPDATE', title: 'AI documents in the Facilio format', notes: [
      'The BRD draft follows the project\'s own BRD outline. Other drafts use numbered Facilio sections or the organisation template.',
      'Word export with the BRD format: cover with logos, document control table, heading colours, header and footer with page numbers.'] },
    { v: '1.2.0', date: '2026-10-27', kind: 'UPDATE', title: 'Process Whiteboard and project plan timeline', notes: [
      'Process Whiteboard in a Miro style: shapes, pen, connectors, fill, text and zoom. Save a board as a flow and include it in the BRD.',
      'State Flow Builder: roomier transition panel, draggable states and buttons.',
      'Project Plan: a Timeline & planning tab built from the workbook.'] },
    { v: '1.1.0', date: '2026-10-27', kind: 'UPDATE', title: 'AI documents written part by part', notes: [
      'Long AI documents are written section by section so every request finishes in time.',
      'Word exports are real .docx files, so they open in Word Online, Teams and on phones. Empty exports are refused.'] }
  ];
  const seenKey = 'fwb_whatsnew_seen';
  const getSeen = () => { try { return localStorage.getItem(seenKey) || ''; } catch (e) { return ''; } };
  const setSeen = v => { try { localStorage.setItem(seenKey, v); } catch (e) { } };
  const list = () => RELEASES.filter(r => !(V.isCustomer && V.isCustomer()) || r.all);
  V.whatsnewVersion = () => (RELEASES[0] || {}).v || '';
  V.whatsnew = {
    html() {
      const all = list(), f = F.S.ui.wnFilter || 'all', seen = getSeen(); const si = all.findIndex(r => r.v === seen);
      const shown = f === 'major' ? all.filter(r => r.kind === 'UPDATE') : all;
      const fmt = d => { const x = new Date(d + 'T00:00:00'); return isNaN(x) ? d : x.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); };
      const chips = `<div class="row" style="gap:8px;margin-bottom:14px">${[['all', 'Everything'], ['major', 'Major updates']].map(([k, l]) => `<button class="btn sm${f === k ? ' primary' : ''}" data-act="wnFilter" data-v="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div>`;
      const card = (r, i) => { const fresh = seen && si > 0 && all.indexOf(r) < si;
        return `<div class="card" style="padding:16px;margin-bottom:12px"><div class="row" style="gap:10px;align-items:center;flex-wrap:wrap"><b>${esc(r.v)}</b><span class="xs muted">${esc(fmt(r.date))}</span><span class="tag ${r.kind === 'UPDATE' ? 'g' : 'o'}">${esc(r.kind)}</span>${i === 0 && f === 'all' ? '<span class="tag v">Latest</span>' : ''}${fresh ? '<span class="tag v">New since your last visit</span>' : ''}</div>
          <h3 style="margin:8px 0 6px">${esc(r.title)}</h3><ul class="small" style="padding-left:18px;line-height:1.7;margin:0">${r.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`; };
      setTimeout(() => setSeen(V.whatsnewVersion()), 1500);
      return `<div class="page-header"><div class="t"><h1>What's new</h1><p>Every version of Delivery Studio: new features, improvements and fixes. Currently on <b>${esc(V.whatsnewVersion())}</b>.</p></div></div>
        <div class="page-body">${chips}${shown.length ? shown.map(card).join('') : '<div class="card empty"><h3>Nothing here yet</h3><p>New features and fixes will appear here.</p></div>'}</div>`;
    }
  };
  ACT.wnFilter = a => { F.S.ui.wnFilter = a.getAttribute('data-v'); V.render(); };
})(typeof window !== 'undefined' ? window : globalThis);
