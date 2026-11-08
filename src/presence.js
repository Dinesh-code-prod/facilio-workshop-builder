/* Studio-open signal: while a team member has a Studio tab open and visible, tell the server every 4 minutes. A Claude helper asks the server (project_jobs action presence) whether anyone is here and stops when nobody has been for ten minutes. Customers send nothing. */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; const API = root.FWBApi; if (!F || !V || !API) return; const { S } = F;
  const beat = () => { if (document.hidden || !S.user || S.user.kind === 'customer' || !S.user.email) return; API.post('/api/presence', {}).catch(() => { }); };
  setInterval(beat, 4 * 60 * 1000); document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); }); setTimeout(beat, 8000);
})(typeof window !== 'undefined' ? window : globalThis);
