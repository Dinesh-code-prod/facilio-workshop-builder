/* Task dependencies for the project plan timeline (pure code, also run by tests/tl_deps.mjs).
   A plan row may carry dep: [ids of tasks it waits for]. The rule is finish-to-start: a task cannot start before every task it depends on has finished.
   Dates are YYYY-MM-DD strings, as in the rest of the plan. */
(function (root) {
  'use strict';
  const DAY = 864e5; const ms = d => Date.parse(d + 'T00:00:00Z');
  const addDays = (d, n) => new Date(ms(d) + n * DAY).toISOString().slice(0, 10);
  const diff = (a, b) => Math.round((ms(b) - ms(a)) / DAY);
  const endOf = r => r.end || r.start;
  const kidsOf = rows => { const k = {}; rows.forEach(r => (r.dep || []).forEach(p => (k[p] = k[p] || []).push(r.id))); return k; };

  // would "succ waits for pred" make a loop (pred already waits, however indirectly, for succ)?
  function wouldLoop(rows, pred, succ) {
    if (pred === succ) return true; const kids = kidsOf(rows); const seen = new Set(); const st = [succ];
    while (st.length) { const x = st.pop(); if (x === pred) return true; if (seen.has(x)) continue; seen.add(x); (kids[x] || []).forEach(k => st.push(k)); }
    return false;
  }

  // Move tasks forward (never back) so that each starts after all its predecessors end, starting from the task that changed; keeps each task's length.
  // Changes the rows in place and returns the ids that moved.
  function reschedule(rows, fromId) {
    const byId = {}; rows.forEach(r => { byId[r.id] = r; }); const kids = kidsOf(rows); const moved = []; const q = [fromId]; let guard = 0;
    while (q.length && guard++ < 5000) {
      const id = q.shift();
      (kids[id] || []).forEach(k => {
        const s = byId[k]; if (!s || !s.start) return;
        const need = (s.dep || []).map(p => byId[p]).filter(p => p && p.start).map(p => addDays(endOf(p), 1)).reduce((m, x) => (x > m ? x : m), '');
        if (need && s.start < need) { const d = diff(s.start, need); const e = endOf(s); s.start = need; s.end = addDays(e, d); if (!moved.includes(k)) moved.push(k); q.push(k); }
      });
    }
    return moved;
  }

  // links whose task starts before its predecessor has finished: "predId>succId"
  function conflicts(rows) {
    const byId = {}; rows.forEach(r => { byId[r.id] = r; }); const out = new Set();
    rows.forEach(s => (s.dep || []).forEach(p => { const a = byId[p]; if (a && a.start && s.start && s.start <= endOf(a)) out.add(p + '>' + s.id); }));
    return out;
  }

  // the longest chain of dependent tasks (by total days): { nodes: Set of ids, links: Set of "predId>succId" }; empty when nothing is linked
  function critical(rows) {
    const byId = {}; rows.forEach(r => { byId[r.id] = r; }); const dur = r => (r && r.start ? diff(r.start, endOf(r)) + 1 : 1); const memo = {}; const best = {}; const busy = new Set();
    const len = id => {
      if (memo[id] != null) return memo[id]; if (busy.has(id)) return 0; busy.add(id); const r = byId[id]; let m = 0, who = null;
      ((r && r.dep) || []).forEach(p => { if (!byId[p]) return; const v = len(p); if (v > m) { m = v; who = p; } });
      busy.delete(id); best[id] = who; return (memo[id] = dur(r) + m);
    };
    const linked = new Set(); rows.forEach(r => (r.dep || []).forEach(p => { if (byId[p]) { linked.add(r.id); linked.add(p); } }));
    let top = null, topLen = 0; linked.forEach(id => { const v = len(id); if (v > topLen) { topLen = v; top = id; } });
    const nodes = new Set(), links = new Set(); let x = top; while (x && !nodes.has(x)) { nodes.add(x); const p = best[x]; if (p) links.add(p + '>' + x); x = p; }
    return { nodes, links, days: topLen };
  }

  const api = { wouldLoop, reschedule, conflicts, critical, addDays, diff };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBTlDeps = api;
})(typeof window !== 'undefined' ? window : globalThis);
