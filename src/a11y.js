/* Keyboard access, the part the shell does not do: a "Skip to content" link and an id on the main area for it to jump to.
   (Making clickable cards, rows and tiles reachable with Tab and usable with Enter or Space is done in src/shell.js, enhanceActions.) */
(function (root) {
  'use strict';
  const d = root.document; if (!d) return;
  let timer = 0;
  // shortcut: matches common status words in English only; a label with other words keeps the colour its class gives it
  const ST = [['ok', /^(approved|verified|done|passed|signed( off)?|complete(d)?|enabled|shown|live|accepted|agreed|ready|on track|resolved|closed)\b/i], ['bad', /^(failed|blocked|rejected|overdue|late|critical|off track|error|missing)\b/i], ['warn', /^(draft|pending|waiting|to do|to make|read, not verified|not verified|changed|at risk|needs|awaiting|on hold|tbc|to be confirmed)\b/i], ['info', /^(under review|in review|in progress|submitted|sent|shared|proposed|scheduled|planned|on demand)\b/i], ['off', /^(not started|not written|not run|n\/a|none|unassigned|no data)\b/i]];
  const stOf = t => { t = String(t || '').trim(); const m = ST.find(x => x[1].test(t)); return m ? m[0] : ''; };
  function patch() {
    const main = d.querySelector('main.main, main'); if (main && !main.id) { main.id = 'main-content'; main.setAttribute('tabindex', '-1'); }
    // page-header descriptions show two lines; a "More" button opens the rest (progressive disclosure, nothing is removed)
    d.querySelectorAll('.page-header .t > p:not([data-clamp])').forEach(p => { p.setAttribute('data-clamp', ''); if (p.scrollHeight <= p.clientHeight + 2) return; const b = d.createElement('button'); b.type = 'button'; b.className = 'ph-more'; b.textContent = 'More'; b.setAttribute('aria-expanded', 'false'); b.addEventListener('click', () => { const o = p.classList.toggle('open'); b.textContent = o ? 'Less' : 'More'; b.setAttribute('aria-expanded', String(o)); }); p.after(b); });
    // status labels: the same word gets the same colour on every page, whatever class the page gave it (data-st, coloured in src/ui.css)
    d.querySelectorAll('.tag:not([data-st]), .pl-chip:not([data-st]), .cs-sol-chip:not([data-st]), .ki-tr em:not([data-st])').forEach(e => { const s = stOf(e.textContent); e.setAttribute('data-st', s); });
    if (!d.getElementById('skipLink') && d.body) { const a = d.createElement('a'); a.id = 'skipLink'; a.className = 'skip-link'; a.href = '#main-content'; a.textContent = 'Skip to content'; a.addEventListener('click', e => { const m = d.getElementById('main-content'); if (m) { e.preventDefault(); m.focus(); } }); d.body.insertBefore(a, d.body.firstChild); }
  }
  const later = () => { if (!timer) timer = setTimeout(() => { timer = 0; patch(); }, 80); };   // throttled: a page that keeps changing still gets patched
  function start() { patch(); new MutationObserver(later).observe(d.body, { childList: true, subtree: true }); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
