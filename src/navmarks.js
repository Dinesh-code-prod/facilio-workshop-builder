/* A blinking dot on the sidebar tab where something changed: Claude finished or asked something for that tab (jobs), or a notification for it is still unread. It stays until you open the tab.
   Jobs: src/assistant.js (V.asstViewOf names the tab of a finished job); notifications: src/notifyclient.js. "Seen" is kept per project in this browser; the first visit only sets the baseline, so old work never blinks. Team only. */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; if (!F || !F.S || !V) return; const { S } = F;
  const key = () => 'fwb_navseen_' + ((S.user && S.user.id) || '') + '_' + ((S.project && S.project.id) || '');
  const load = () => { try { return JSON.parse(root.localStorage.getItem(key()) || 'null'); } catch (e) { return null; } };
  const save = o => { try { root.localStorage.setItem(key(), JSON.stringify(o)); } catch (e) { } };
  function marks() {
    const m = new Map(); const rec = load(); if (!rec) { save({ base: Date.now(), seen: {} }); return m; }
    const J = V.studioJobs, L = root.FWBKickoffLogic, k = J && J.K && J.K();
    if (k && Array.isArray(k.jobs) && k.pid === S.project.id && L && V.asstViewOf) L.jobRows(k.jobs).forEach(j => { if (!['done', 'needs_input', 'failed'].includes(j.status) || !j.finishedAt) return; const v = V.asstViewOf(j), t = Date.parse(j.finishedAt); if (v && t > Math.max(rec.base, rec.seen[v] || 0)) m.set(v, (m.get(v) || '') + j.label + '; '); });
    (V.notifyItems ? V.notifyItems() : []).forEach(x => { if (x.srv && !x.read && x.view && x.pid === S.project.id) m.set(x.view, (m.get(x.view) || '') + x.text + '; '); });
    return m;
  }
  function paint() {
    if (!S.project || !S.project.id || !S.user || (V.isCustomer && V.isCustomer())) return;
    const rec0 = load(); const here = S.ui && S.ui.view;
    if (here && rec0) { rec0.seen[here] = Date.now(); save(rec0); (V.notifyItems ? V.notifyItems() : []).forEach(x => { if (x.srv && !x.read && x.view === here && x.pid === S.project.id && V.notifyRead) V.notifyRead([x.sid]); }); }   // opening the tab clears its dot
    const m = marks(); document.querySelectorAll('.sb-item[data-view]').forEach(b => { const v = b.getAttribute('data-view'), on = m.has(v); b.classList.toggle('sb-new', on); const p = b.querySelector('.sb-ping'); if (on && !p) { const i = document.createElement('i'); i.className = 'sb-ping'; i.setAttribute('role', 'img'); i.setAttribute('aria-label', 'Updated'); b.appendChild(i); } else if (!on && p) p.remove(); if (on) b.title = 'Updated: ' + m.get(v).replace(/; $/, ''); else if (b.title && b.title.startsWith('Updated: ')) b.removeAttribute('title'); });
  }
  const paintAll = () => { paint(); const mk = marks(); document.querySelectorAll(".sidebar .sb-group").forEach(g => { const tt = g.querySelector(":scope > .sb-title"), vs = tt ? String(tt.getAttribute("data-views") || "").split(",") : [], on = !g.classList.contains("open") && vs.some(v => mk.has(v)); g.classList.toggle("sb-has-new", on); const t = g.querySelector(":scope > .sb-title"), p = t && t.querySelector(".sb-ping"); if (t && on && !p) { const i = document.createElement("i"); i.className = "sb-ping"; i.setAttribute("aria-hidden", "true"); t.appendChild(i); } else if (p && !on) p.remove(); }); };   // a closed stage glows too when a page inside it was updated
  V.navMarks = paintAll; setInterval(() => { try { paintAll(); } catch (e) { /* the dot is optional */ } }, 2000); document.addEventListener('click', () => setTimeout(() => { try { paintAll(); } catch (e) { } }, 60));
})(typeof window !== 'undefined' ? window : globalThis);
