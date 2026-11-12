/* Keyboard access, the part the shell does not do: a "Skip to content" link and an id on the main area for it to jump to.
   (Making clickable cards, rows and tiles reachable with Tab and usable with Enter or Space is done in src/shell.js, enhanceActions.) */
(function (root) {
  'use strict';
  const d = root.document; if (!d) return;
  let timer = 0;
  // shortcut: matches common status words in English only; a label with other words keeps the colour its class gives it
  const ST = [['ok', /^(approved|verified|done|passed|signed( off)?|complete(d)?|enabled|shown|live|accepted|agreed|ready|on track|resolved|closed)\b/i], ['bad', /^(failed|blocked|rejected|overdue|late|critical|off track|error|missing)\b/i], ['warn', /^(draft|pending|waiting|to do|to make|read, not verified|not verified|changed|at risk|needs|awaiting|on hold|tbc|to be confirmed)\b/i], ['info', /^(under review|in review|in progress|submitted|sent|shared|proposed|scheduled|planned|on demand)\b/i], ['off', /^(not started|not written|not run|n\/a|none|unassigned|no data)\b/i]];
  const stOf = t => { t = String(t || '').trim(); const m = ST.find(x => x[1].test(t)); return m ? m[0] : ''; };
  // card headings get a small tinted icon tile when their words clearly name what the card holds; anything else stays plain
  const HI = [['spark', /\b(claude|ai|proposal|suggest)/i], ['alert', /\b(risk|issue|blocker|pain|overdue|attention|raid)/i], ['shield', /\b(test|uat|ftr|verif|sign-?off|approv)/i], ['doc', /\b(document|contract|brd|msa|file|draft|minutes|report pack)/i], ['cal', /\b(calendar|session|schedule|milestone|next \d+ days|upcoming|timeline)/i], ['plan', /\b(plan|roadmap|phase|stage)/i], ['roles', /\b(people|team|stakeholder|member|owner|access|role|who)/i], ['check', /\b(task|action|checklist|to do|step)/i], ['modules', /\b(module|form|field|configuration|layout)/i], ['flow', /\b(flow|process|state)/i], ['mail', /\b(mail|email|message|inbox)/i], ['dash', /\b(status|health|dashboard|kpi|progress|summary|activity|workload)/i], ['book', /\b(guide|training|video|learn)/i], ['link', /\b(link|integration|connected)/i], ['gear', /\b(setting)/i]];
  const icoFor = t => { const m = HI.find(x => x[1].test(t)); return m ? m[0] : ''; };
  function patch() {
    const main = d.querySelector('main.main, main'); if (main && !main.id) { main.id = 'main-content'; main.setAttribute('tabindex', '-1'); }
    // page-header descriptions show two lines; a "More" button opens the rest (progressive disclosure, nothing is removed)
    d.querySelectorAll('.page-header .t > p:not([data-clamp])').forEach(p => { p.setAttribute('data-clamp', ''); if (p.scrollHeight <= p.clientHeight + 2) return; const b = d.createElement('button'); b.type = 'button'; b.className = 'ph-more'; b.textContent = 'More'; b.setAttribute('aria-expanded', 'false'); b.addEventListener('click', () => { const o = p.classList.toggle('open'); b.textContent = o ? 'Less' : 'More'; b.setAttribute('aria-expanded', String(o)); }); p.after(b); });
    // status labels: the same word gets the same colour on every page, whatever class the page gave it (data-st, coloured in src/ui.css)
    d.querySelectorAll('.tag:not([data-st]), .pl-chip:not([data-st]), .cs-sol-chip:not([data-st]), .ki-tr em:not([data-st])').forEach(e => { const s = stOf(e.textContent); e.setAttribute('data-st', s); });
    const V = root.FWBViews; if (V && V.ico) d.querySelectorAll(':is(.main, .adm-main) :is(.card > .card-h, .sd-w > header, .sd-life > header) > h3:not([data-hi])').forEach(h => { h.setAttribute('data-hi', ''); if (h.querySelector('svg')) return; const n = icoFor(h.textContent); if (n) h.insertAdjacentHTML('afterbegin', '<span class="hd-ic" aria-hidden="true">' + V.ico(n) + '</span>'); });
    if (!d.getElementById('skipLink') && d.body) { const a = d.createElement('a'); a.id = 'skipLink'; a.className = 'skip-link'; a.href = '#main-content'; a.textContent = 'Skip to content'; a.addEventListener('click', e => { const m = d.getElementById('main-content'); if (m) { e.preventDefault(); m.focus(); } }); d.body.insertBefore(a, d.body.firstChild); }
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(patch, 80); };
  function start() { patch(); new MutationObserver(later).observe(d.body, { childList: true, subtree: true }); }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
