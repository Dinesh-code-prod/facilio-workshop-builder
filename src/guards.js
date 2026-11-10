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
  // more one-click deletions and clear-outs, each now asks first (the page's own handler is unchanged once the person confirms)
  G.push(['ugBlkDel', 'Delete block', 'Delete this block from the guide?'], ['ugLogoDel', 'Remove logo', 'Remove the logo from this guide?'], ['glExtraDel', 'Delete extra', 'Delete this extra item?'], ['fbRemoveField', 'Remove field', 'Remove this field from the form? Records keep the values already saved.'],
    ['solRowDel', 'Delete row', 'Delete this row from the solution?'], ['tkClDel', 'Delete checklist item', 'Delete this checklist item?'], ['tkLnDel', 'Remove link', 'Remove this link from the task?'], ['mbRuleDel', 'Delete rule', 'Delete this mailbox rule?'],
    ['vwColDel', 'Remove column', 'Remove this column from the view?'], ['vwFilterDel', 'Remove filter', 'Remove this filter from the view?'], ['ciTabDel', 'Delete tab', 'Delete this tab and what it holds?'], ['refDel', 'Remove reference', 'Remove this reference?'],
    ['adminRemoveMember', 'Remove member', 'Remove this person from the project? They lose access at once.'], ['brdSampleReset', 'Reset sample', 'Reset the sample content? Your changes to it are lost.'], ['ptkClearDone', 'Clear done tasks', 'Clear every finished task from your private list?'],
    ['wsLiveClear', 'Clear live notes', 'Clear everything captured in this live session?'], ['planCellReset', 'Reset dates', 'Reset these dates to the plan?'], ['guideReset', 'Reset guide', 'Reset this guide to the version generated from the project records? Your edits are lost.'], ['tgReset', 'Reset progress', 'Reset your progress through the guide?']);
  G.forEach(([k, t, m]) => { const f = ACT[k]; if (typeof f !== 'function') return; ACT[k] = async function (a, e) { if (!(await V.confirmDialog(t, m, 'Delete', true))) return; return f.call(this, a, e); }; });
  // publishing to customers is never silent
  [['onbPublish', 'Publish data onboarding', 'Publish the data onboarding plan to customer stakeholders? They will see the current plan and templates.']].forEach(([k, t, m]) => { const f = ACT[k]; if (typeof f !== 'function') return; ACT[k] = async function (a, e) { if (!(await V.confirmDialog(t, m, 'Publish'))) return; return f.call(this, a, e); }; });
  // actions that go out to other people or close something are never silent either
  [['hoClose', 'Close the project', 'Close the project and record the transition? This is saved with your name and the date.', 'Close project'], ['koApproveIntake', 'Approve the kick-off', 'Approve this kick-off? It is saved with your name and the date.', 'Approve'], ['onbSend', 'Send to Facilio', 'Send this data onboarding sheet to Facilio now?', 'Send']].forEach(([k, t, m, ok]) => { const f = ACT[k]; if (typeof f !== 'function') return; ACT[k] = async function (a, e) { if (!(await V.confirmDialog(t, m, ok))) return; return f.call(this, a, e); }; });
})(typeof window !== 'undefined' ? window : globalThis);
