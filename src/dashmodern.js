/* Modern dashboards (user, 9 Nov 2026, after the Scorecard, Slingshot, Produkcia, Vora, Breeze and Lector examples): the shared look of the team, customer and admin dashboards.
   This file only supplies the small icon on a KPI tile, chosen from the tile's label; the cards, the canvas, the donut with its legend and the gauge are styled in src/ui.css (the "modern dashboards" block)
   and drawn by the existing primitives (src/sdcharts.js, src/dashkit.js, src/stagedash.js). Pure strings, no data. */
(function (root) {
  'use strict';
  const V = root.FWBViews; if (!V) return;
  const svg = p => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const ICONS = {
    trend: svg('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'), calendar: svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>'), flag: svg('<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), shield: svg('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'), tasks: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>'),
    alert: svg('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>'), flask: svg('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>'), pen: svg('<path d="M4 20l4-1 11-11-3-3L5 16z"/>'),
    users: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5"/><path d="M16 5.5a3.5 3.5 0 0 1 0 6.5M18 15c2 .6 3.2 2.2 3.5 5"/>'), file: svg('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>'), spark: svg('<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>')
  };
  const RULES = [[/overdue|late|behind|past/i, 'clock'], [/risk|issue|blocker|pain|attention|fail/i, 'alert'], [/test|uat|case|pass/i, 'flask'], [/sign|approv/i, 'pen'], [/schedule|plan|date|go-?live|due/i, 'calendar'], [/milestone|stage|phase/i, 'flag'],
    [/status|health|rag/i, 'shield'], [/task|action|work|open|waiting/i, 'tasks'], [/user|owner|people|team|customer|project/i, 'users'], [/guide|document|file|report|requirement/i, 'file'], [/progress|performance|done|complete|%/i, 'trend']];
  /** the icon for a KPI tile, from its label */
  const icon = label => { const r = RULES.find(x => x[0].test(String(label || ''))); return ICONS[r ? r[1] : 'spark']; };
  V.dm = { icon, ICONS };
})(typeof window !== 'undefined' ? window : globalThis);
