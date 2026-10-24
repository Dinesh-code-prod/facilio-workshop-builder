/* API client: JSON calls with CSRF header, chunked private file upload/download, reference configuration fetch. */
(function (root) {
  'use strict';
  class ApiError extends Error { constructor(status, msg, data) { super(msg); this.status = status; this.data = data; } }
  async function call(method, path, body, opts) {
    opts = opts || {};
    if (root.FWBRun && String(path).startsWith('/api/')) { // Facilio Run build: the backend runs in the page (src/runapi.js)
      const res = await root.FWBRun.handle(method, path, body);
      if (res.status >= 400 || res.status === 0) { if (res.status === 401 && root.FWBShell && !opts.noAuthRedirect) root.FWBShell.sessionExpired(); throw new ApiError(res.status, (res.data && res.data.error) || ('Request failed (' + res.status + ')'), res.data); }
      return res.data;
    }
    const h = { 'x-fwb-csrf': '1' }; let b = body;
    if (body !== undefined && !(body instanceof ArrayBuffer) && !(body instanceof Uint8Array) && !(body instanceof Blob)) { h['content-type'] = 'application/json'; b = JSON.stringify(body); }
    else if (body !== undefined) h['content-type'] = 'application/octet-stream';
    let r;
    try { r = await fetch(path, { method, headers: h, body: b, credentials: 'same-origin' }); }
    catch (e) { throw new ApiError(0, 'Network error — check your connection'); }
    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await r.json() : (opts.raw ? r : await r.arrayBuffer());
    if (!r.ok) { if (r.status === 401 && root.FWBShell && !opts.noAuthRedirect) root.FWBShell.sessionExpired(); throw new ApiError(r.status, (data && data.error) || ('Request failed (' + r.status + ')'), data); }
    return data;
  }
  const api = {
    ApiError,
    get: (p, o) => call('GET', p, undefined, o), post: (p, b, o) => call('POST', p, b === undefined ? {} : b, o), put: (p, b) => call('PUT', p, b), patch: (p, b) => call('PATCH', p, b), del: p => call('DELETE', p),
    async uploadFile(projectId, file, category, meta, replaces, onProgress) {
      const init = await call('POST', `/api/projects/${projectId}/files`, { category, name: file.name, mime: file.type || 'application/octet-stream', size: file.size, meta: meta || {}, replaces: replaces || null });
      for (let n = 0; n < init.chunks; n++) {
        const part = file.slice(n * init.chunkSize, Math.min(file.size, (n + 1) * init.chunkSize));
        let tries = 0; for (;;) { try { await call('PUT', `/api/projects/${projectId}/files/${init.id}/chunks/${n}`, new Uint8Array(await part.arrayBuffer())); break; } catch (e) { if (++tries > 2 || (e.status && e.status < 500)) throw e; await new Promise(r => setTimeout(r, 800 * tries)); } }
        if (onProgress) onProgress((n + 1) / init.chunks);
      }
      return (await call('POST', `/api/projects/${projectId}/files/${init.id}/complete`)).file;
    },
    async downloadFile(projectId, fileId, onProgress) {
      const meta = await call('GET', `/api/projects/${projectId}/files/${fileId}`);
      const parts = [];
      for (let n = 0; n < meta.file.chunks; n++) { parts.push(await call('GET', `/api/projects/${projectId}/files/${fileId}/chunks/${n}`)); if (onProgress) onProgress((n + 1) / meta.file.chunks); }
      return { file: meta.file, blob: new Blob(parts, { type: meta.file.mime }) };
    },
    async reference() {
      if (root.FWBRun) return root.FWBRun.reference();
      const r = await fetch('/api/reference', { credentials: 'same-origin' }); if (!r.ok) throw new ApiError(r.status, 'Reference configuration unavailable');
      const meta = JSON.parse(r.headers.get('x-fwb-reference') || '{}');
      const ds = new Response(r.body.pipeThrough(new DecompressionStream('gzip'))); return { meta, baseline: await ds.json() };
    }
  };
  // shared helpers for gzip JSON (used for imported org packages)
  api.gzipJson = async obj => new Blob([await new Response(new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()]);
  api.gunzipJson = async blob => new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).json();
  root.FWBApi = api;
})(window);
