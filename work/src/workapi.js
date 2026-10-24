/* Page side of the facilio.work build. Every /api/* call goes to the app's own server function (/api/fn/api/...), where identity,
   roles and data are handled by the platform. Same interface as the Run build, so the screens do not change.
   File bytes go straight to storage through one-time links the server hands out. */
(function (root) {
  'use strict';
  async function rpc(method, path, body) {
    let r; try { r = await fetch('/api/fn/api' + path.replace(/^\/api/, ''), { method, headers: body !== undefined ? { 'content-type': 'application/json' } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: 'same-origin' }); }
    catch (e) { return { status: 0, data: { error: 'Network error — check your connection' } }; }
    let data = null; try { data = await r.json(); } catch (e) { data = { error: 'Request failed (' + r.status + ')' }; }
    return { status: r.status, data };
  }
  async function handle(method, path, body) {
    const m = /^(\/api\/projects\/[^/]+\/files\/[^/]+\/chunks\/\d+)$/.exec(String(path).split('?')[0]);
    if (m && method === 'PUT') { // upload one part: get a link, send the bytes there, record it
      const l = await rpc('POST', m[1] + '/url', {}); if (l.status >= 400) return l;
      let put; try { put = await fetch(l.data.url, { method: 'PUT', body }); } catch (e) { return { status: 0, data: { error: 'Upload failed — check your connection' } }; }
      if (!put.ok) return { status: 502, data: { error: 'Upload failed (' + put.status + ')' } };
      return rpc('PUT', m[1], { fileId: l.data.fileId });
    }
    if (m && method === 'GET') { // download one part
      const l = await rpc('GET', m[1]); if (l.status >= 400) return l;
      let g; try { g = await fetch(l.data.url); } catch (e) { return { status: 0, data: { error: 'Download failed — check your connection' } }; }
      if (!g.ok) return { status: 502, data: { error: 'Download failed (' + g.status + ')' } };
      return { status: 200, data: await g.arrayBuffer() };
    }
    return rpc(method, path, body);
  }
  // the reference configuration is a static file in this build (reference.dat is gzip; reference-meta.json describes it)
  async function reference() {
    const [d, m] = await Promise.all([fetch('reference.dat', { credentials: 'same-origin' }), fetch('reference-meta.json', { credentials: 'same-origin' })]);
    if (!d.ok || !m.ok) throw new Error('Reference configuration unavailable'); const buf = new Uint8Array(await d.arrayBuffer());
    const text = buf[0] === 0x1f && buf[1] === 0x8b ? await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text() : new TextDecoder().decode(buf);
    return { meta: await m.json(), baseline: JSON.parse(text) };
  }
  root.FWBRun = { handle, reference };
})(window);
