/* Session expiry and keeping what a person typed.
   1. Idle sign-out: after 30 minutes without a click, key press or scroll, unsaved work is saved (or kept, see 2), and the person is signed out of the app. This stops a forgotten tab
      from holding a session and polling the server. A single warning appears two minutes before.
   2. Nothing typed is lost. When a session ends (idle, or the platform answers 401), or the tab is closed with unsaved work, the browser keeps (a) documents that were changed but not yet saved,
      with the version they were based on, and (b) text typed into forms that were still open. After the person signs in and opens the project again, (a) is put back and saved if nobody else
      changed the document meanwhile (otherwise a copy can be downloaded), and (b) is shown with a Copy button. Kept data stays in this browser only, for 24 hours, then is dropped. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const d = root.document; if (!d) return;
  const IDLE_MS = 30 * 60e3, WARN_MS = 28 * 60e3, KEEP_MS = 24 * 3600e3, KEY = 'fwb_keep_';
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }, del: k => { try { localStorage.removeItem(k); } catch (e) { } } };
  let last = Date.now(), warned = false, locked = false;

  // text in open forms: drawers, dialogs, text areas, and editable text on a page
  function fields() {
    const out = []; const seen = new Set();
    d.querySelectorAll('#drawer input, #drawer textarea, .dialog input, .dialog textarea, main textarea, main [contenteditable="true"]').forEach((el, i) => {
      if (out.length >= 40) return; const type = (el.getAttribute('type') || 'text').toLowerCase(); if (el.tagName === 'INPUT' && !/^(text|email|url|tel|search|number|date)$/.test(type)) return;
      const v = String(el.isContentEditable ? el.innerText : el.value || '').trim(); if (v.length < 3 || v.length > 20000) return;
      const lab = (el.id && d.querySelector('label[for="' + el.id + '"]')) || el.closest('label') || null; const label = (lab ? lab.textContent : el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.id || 'Text').trim().slice(0, 60);
      const k = (el.id || el.getAttribute('data-txt') || el.getAttribute('data-cell') || '') + '|' + v.slice(0, 40); if (seen.has(k)) return; seen.add(k); out.push({ label, value: v });
    });
    return out;
  }
  function docs() { const o = {}; Object.keys(S.docs || {}).forEach(k => { const x = S.docs[k]; if (x && (x.dirty || x.inflight)) o[k] = { base: x.version, data: k === 'workshop' ? S.ws : x.data }; }); return o; }
  // write what would be lost; remove the entry when there is nothing to keep
  function keep() {
    if (!S.project || !S.user) return false; const key = KEY + S.project.id; const dd = docs(), ff = fields();
    if (!Object.keys(dd).length && !ff.length) { ls.del(key); return false; }
    const snap = { at: Date.now(), user: S.user.email || '', project: S.project.name, view: S.ui && S.ui.view, docs: dd, fields: ff };
    if (ls.set(key, JSON.stringify(snap))) return true;
    snap.docs = {}; return ls.set(key, JSON.stringify(snap));   // too big for the browser's storage: keep the typed text at least
  }
  V.keepNow = keep;

  async function lock(msg) {
    if (locked || !S.user || !root.FWBShell) return; locked = true;
    try { await Promise.race([F.flush(), new Promise(r => setTimeout(r, 4000))]); } catch (e) { }
    keep(); root.FWBShell.sessionExpired(msg); locked = false;
  }
  function check(now) {
    if (!S.user || locked) return; const idle = (now || Date.now()) - last;
    if (idle >= IDLE_MS) { lock(S.user.kind === 'customer' ? 'For your security you were signed out after 30 minutes without activity. Anything you were typing is saved on this device. Sign in again to pick up where you left off.' : 'You were signed out after 30 minutes without activity. Anything you had not saved is kept in this browser. Sign in again to carry on.'); warned = false; return; }   // two audiences: the project team, and the customer
    if (idle >= WARN_MS && !warned) { warned = true; V.toast('You will be signed out in about two minutes because there has been no activity. Click anywhere to stay signed in.', 12000); }
  }
  V.session = { IDLE_MS, check, touch() { last = Date.now(); warned = false; } };
  ['mousedown', 'keydown', 'touchstart', 'wheel', 'input'].forEach(ev => d.addEventListener(ev, () => { const t = Date.now(); if (t - last > 1000) { last = t; warned = false; } else last = t; }, { passive: true, capture: true }));
  setInterval(() => check(), 30000);

  // a 401 from the platform, or closing the tab with unsaved work
  if (root.FWBShell && !root.FWBShell.__keep) { const orig = root.FWBShell.sessionExpired; root.FWBShell.sessionExpired = function (msg) { try { keep(); } catch (e) { } return orig.call(this, msg); }; root.FWBShell.__keep = true; }
  root.addEventListener('pagehide', () => { try { if (F.hasUnsaved() || d.querySelector('#drawer textarea, #drawer input')) keep(); } catch (e) { } });

  // after the person signs in and opens the project again
  V.keepRestore = projectId => {
    const key = KEY + projectId; const raw = ls.get(key); if (!raw) return; let snap; try { snap = JSON.parse(raw); } catch (e) { ls.del(key); return; }
    ls.del(key); if (!snap || Date.now() - snap.at > KEEP_MS || (snap.user && S.user && snap.user !== S.user.email)) return;
    let restored = 0; const lost = {};
    Object.keys(snap.docs || {}).forEach(k => { const x = S.docs[k]; const s = snap.docs[k]; if (!x || !s) return;
      if (x.version === s.base && !S.readonly) { if (k === 'workshop') { Object.keys(S.ws).forEach(p => { delete S.ws[p]; }); Object.assign(S.ws, s.data); } else x.data = s.data; F.markDirty(k); restored++; } else lost[k] = s.data; });
    if (restored) setTimeout(() => V.toast('Restored ' + restored + ' section' + (restored > 1 ? 's' : '') + ' you had changed but not saved before you were signed out. They are being saved now.', 9000), 600);
    if (Object.keys(lost).length) setTimeout(async () => { if (await V.confirmDialog('Unsaved changes could not be restored', 'Someone else changed the same part of the project after you were signed out, so your unsaved version was not put back over theirs. You can download your copy and compare.', 'Download my copy')) V.download('my-unsaved-changes.json', JSON.stringify(lost, null, 2), 'application/json'); }, 900);
    const ff = (snap.fields || []).filter(f => f && f.value);
    if (ff.length) setTimeout(() => V.drawer('Text you had not saved', `<p class="small" style="margin-top:0">You were signed out while you were typing in <b>${esc(snap.view || 'the project')}</b>. Here is what was in the open forms. Copy it back where it belongs.</p>${ff.map((f, i) => `<div style="margin:10px 0"><label class="f">${esc(f.label)}</label><textarea rows="${Math.min(8, 2 + Math.floor(f.value.length / 90))}" readonly style="width:100%">${esc(f.value)}</textarea><button type="button" class="btn sm" data-act="hoCopyVal" data-val="${esc(f.value)}">Copy</button></div>`).join('')}`, '<button class="btn" data-act="closeDrawer">Done</button>'), 1200);
  };
})(typeof window !== 'undefined' ? window : globalThis);
