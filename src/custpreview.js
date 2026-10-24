/* Preview as the customer (staff only).
   facilio.work signs in Facilio staff only, so a customer or guest cannot sign in to test the customer view. This lets the project owner
   see the real customer view instead: the project is reopened with the customer's section list and navigation, and every write is blocked
   until the preview is closed. It is a client-side simulation: the server still treats the request as the signed-in staff member. */
(function (root) {
  const F = root.FWB, V = root.FWBViews, S = F && F.S, API = root.FWBApi; if (!F || !V || !S || !API) return;
  const ACT = V.ACT; let real = null;
  ['post', 'put', 'patch', 'del'].forEach(m => { const o = API[m]; if (typeof o !== 'function') return; API[m] = function () {
    if (S.custPreview) { const e = new Error('Preview only: nothing is saved while you view the project as the customer.'); e.status = 0; return Promise.reject(e); }
    return o.apply(this, arguments); }; });
  V.canPreviewCustomer = () => !!(S.project && S.user && S.user.kind === 'consultant' && !S.custPreview && S.project.role !== 'viewer');
  ACT.custPreview = async () => {
    if (!V.canPreviewCustomer()) return;
    try { if (F.hasUnsaved && F.hasUnsaved()) await F.flush(); } catch (e) { V.toast && V.toast('Save your changes before previewing as the customer.', 4000, true); return; }
    const id = S.project.id; real = S.user;
    S.user = Object.assign({}, real, { kind: 'customer', projectId: id, adminRole: null, previewOf: real.email });
    S.custPreview = true;
    try { history.replaceState(null, '', '#/p/' + id + '/cust_home'); await V.openProject(id); S.readonly = true; V.render(); V.toast && V.toast('Previewing as the customer. Nothing is saved.', 3500); }
    catch (e) { S.user = real; S.custPreview = false; V.toast && V.toast('Could not open the customer view.', 4000, true); }
  };
  ACT.custPreviewExit = async () => {
    if (!S.custPreview || !real) return; const id = S.project && S.project.id;
    S.custPreview = false; S.user = real; real = null;
    try { history.replaceState(null, '', '#/p/' + id + '/overview'); await V.openProject(id); } catch (e) { V.toast && V.toast('Could not reopen the project.', 4000, true); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
