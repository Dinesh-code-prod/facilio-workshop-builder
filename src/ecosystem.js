/* SaaS ecosystem + AI assistance around the isometric platform ("book").
   One component, three audiences: team (internal), customer (customer-facing wording) and public (login / invitation, nothing project-specific).
   Layout is a CSS grid, so panels, the platform, the lifecycle strip and the button can never overlap; the thin connectors are drawn from the measured
   centres after layout and redrawn on resize. On phones only four panels show, below the platform.
   Honesty rules: module names are Facilio product areas (not a claim that they are configured); every AI moment maps to an AI task the app really has
   (workshop intelligence, BRD draft, missing-requirements check, UAT plan, configuration documentation, user guide, weekly status report). Output is a draft
   that a person reviews. No figures, percentages or outcomes are shown. */
(function (root) {
  'use strict';
  const doc = root.document; if (!doc) return;
  const F = root.FWB; const { esc } = F; const V = root.FWBViews;
  const reduce = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // name, bars (relative heights for the little chart), side, show on phones
  const MODS = [
    ['Work Orders', [40, 70, 55, 85], 't', 1], ['Assets', [60, 45, 80, 50], 't', 0],
    ['Spaces', [50, 75, 40, 65], 'l', 1], ['Inventory', [70, 40, 60, 80], 'l', 0],
    ['Preventive Maintenance', [45, 60, 75, 55], 'r', 1], ['Dashboards & Analytics', [35, 65, 50, 90], 'r', 1],
    ['Energy & Sustainability', [80, 55, 45, 60], 'b', 0], ['Connected apps', [55, 50, 70, 45], 'b', 0]
  ];
  const AI = {
    team: [['Workshop notes', 'Draft requirements', 'AI-assisted documentation'], ['Recorded requirements', 'Gaps flagged for review', 'Requirements organized'], ['UAT results', 'Findings grouped into actions', 'Insights into actions'], ['Configuration', 'Documented summary', 'AI-assisted documentation'], ['Project records', 'Weekly status draft', 'Clearer delivery visibility']],
    customer: [['Agreed requirements', 'Plain-language summary', 'Clearer requirements'], ['Training content', 'Step-by-step guide', 'Guided user enablement'], ['Project progress', 'One clear project view', 'Clearer delivery visibility']],
    public: [['Workshop notes', 'Draft requirements', 'AI-assisted documentation'], ['Training content', 'Step-by-step guide', 'Guided user enablement'], ['Project progress', 'One clear project view', 'Clearer delivery visibility']]
  };
  const panel = (m, i) => `<div class="eco-p s-${m[2]}${m[3] ? ' ph' : ''}" data-i="${i}" style="--d:${(0.5 + i * 0.18).toFixed(2)}s"><div class="eco-ph"><i></i><b>${esc(m[0])}</b></div><div class="eco-pr"><s></s><s></s></div><div class="eco-pc">${m[1].map(h => `<u style="--h:${h}%"></u>`).join('')}</div></div>`;
  const sp = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor"/></svg>';

  // opts: { audience: 'team'|'customer'|'public', compact, dark }
  V.ecoStage = function (opts) {
    const aud = (opts && opts.audience) || 'public'; const compact = !!(opts && opts.compact); const dark = !!(opts && opts.dark);
    const mods = compact ? MODS.filter((m, i) => [0, 2, 4, 6].includes(i)) : MODS; const by = k => mods.map((m, i) => [m, MODS.indexOf(m)]).filter(x => x[0][2] === k).map(x => panel(x[0], x[1])).join('');
    const ai = AI[aud] || AI.public;
    return `<div class="eco${compact ? ' eco-c' : ''}${dark ? ' eco-dark' : ''}" data-aud="${aud}" role="group" aria-label="Facilio Delivery Studio connected to Facilio product areas, with AI assistance">
      <div class="eco-grid"><div class="eco-row eco-top">${by('t')}</div><div class="eco-mid"><div class="eco-side">${by('l')}</div><div class="eco-core">${V._isoPlatform ? V._isoPlatform() : ''}</div><div class="eco-side">${by('r')}</div></div><div class="eco-row eco-bot">${by('b')}</div></div>
      <svg class="eco-links" aria-hidden="true"></svg>
      <ul class="eco-ai" aria-live="polite">${ai.map((a, k) => `<li class="${k === 0 ? 'on' : ''}"><span class="eco-chip">${esc(a[0])}</span><span class="eco-flow" aria-hidden="true"><i></i><i></i><i></i></span><span class="eco-ai-d">${sp}</span><span class="eco-flow" aria-hidden="true"><i></i><i></i><i></i></span><span class="eco-chip out">${esc(a[1])}</span><em>${esc(a[2])}</em></li>`).join('')}</ul>
      ${compact ? '' : '<p class="eco-note">AI output is a draft. A person on your Facilio team reviews it before it is used.</p>'}</div>`;
  };

  // connectors: measured after layout; one thin line from the platform to each visible panel
  function link(el) {
    const svg = el.querySelector('.eco-links'); const core = el.querySelector('.eco-core'); if (!svg || !core) return;
    const R = el.getBoundingClientRect(), C = core.getBoundingClientRect(); if (!R.width) return; const cx = C.left - R.left + C.width / 2, cy = C.top - R.top + C.height / 2;
    let d = ''; let n = 0;
    el.querySelectorAll('.eco-p').forEach(p => { const b = p.getBoundingClientRect(); if (!b.width) return; const px = b.left - R.left + b.width / 2, py = b.top - R.top + b.height / 2;
      const hy = Math.abs(px - cx) > Math.abs(py - cy); const sx = hy ? (px < cx ? C.left - R.left + C.width * .22 : C.left - R.left + C.width * .78) : cx, sy = hy ? cy : (py < cy ? C.top - R.top + C.height * .28 : C.top - R.top + C.height * .72);
      const ex = hy ? (px < cx ? b.right - R.left : b.left - R.left) : px, ey = hy ? py : (py < cy ? b.bottom - R.top : b.top - R.top);
      const mx = hy ? (sx + ex) / 2 : sx, my = hy ? ey : (sy + ey) / 2;
      d += `<path pathLength="1" d="M${sx.toFixed(1)} ${sy.toFixed(1)}C${(hy ? mx : sx).toFixed(1)} ${(hy ? sy : my).toFixed(1)} ${(hy ? mx : ex).toFixed(1)} ${(hy ? ey : my).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" style="--d:${(1.1 + n * .12).toFixed(2)}s"/><circle r="2.6" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" style="--d:${(1.5 + n * .12).toFixed(2)}s"/>`; n++; });
    svg.setAttribute('viewBox', `0 0 ${R.width.toFixed(0)} ${R.height.toFixed(0)}`); svg.innerHTML = d;
  }
  const ro = root.ResizeObserver ? new ResizeObserver(es => es.forEach(e => link(e.target))) : null;
  function rotate(el) {
    const items = [].slice.call(el.querySelectorAll('.eco-ai li')); if (items.length < 2 || reduce()) { el.classList.add('eco-static'); return; } let k = 0;
    const t = setInterval(() => { if (!doc.body.contains(el)) { clearInterval(t); return; } items[k].classList.remove('on'); k = (k + 1) % items.length; items[k].classList.add('on'); }, 4200);
  }
  function scan() { doc.querySelectorAll('.eco:not([data-ready])').forEach(el => { el.setAttribute('data-ready', '1'); link(el); if (ro) ro.observe(el); rotate(el); setTimeout(() => link(el), 1200); }); }
  let q = 0; const mo = new MutationObserver(() => { if (q) return; q = root.requestAnimationFrame(() => { q = 0; scan(); }); });
  mo.observe(doc.documentElement, { childList: true, subtree: true }); scan();
  root.addEventListener('resize', () => doc.querySelectorAll('.eco[data-ready]').forEach(link));
})(typeof window !== 'undefined' ? window : globalThis);
