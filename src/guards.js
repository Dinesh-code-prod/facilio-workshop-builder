/* Confirmation guards for destructive actions that previously ran on a single click. Wraps the existing handlers (nothing is re-implemented),
   so behaviour is unchanged once the person confirms. Loaded last. */
(function (root) {
  'use strict';
  const V = root.FWBViews; if (!V || !V.ACT) return; const ACT = V.ACT;
  const G = [
    ['dlCheckDel', 'Delete checklist item', 'Delete this checklist item?'], ['repAttDel', 'Remove attachment', 'Remove this attachment from the report?'],
    ['ciFileDel', 'Remove file', 'Remove this file from the record?'], ['kcWatchDel', 'Delete watch item', 'Delete this item from the watch list?'],
    ['dashCatDel', 'Delete category', 'Delete this category?'], ['brdLogoDel', 'Remove logo', 'Remove this logo from the BRD?'], ['brdDelInsert', 'Delete inserted text', 'Delete this inserted block?']
  ];
  G.forEach(([k, t, m]) => { const f = ACT[k]; if (typeof f !== 'function') return; ACT[k] = async function (a, e) { if (!(await V.confirmDialog(t, m, 'Delete', true))) return; return f.call(this, a, e); }; });
})(typeof window !== 'undefined' ? window : globalThis);
