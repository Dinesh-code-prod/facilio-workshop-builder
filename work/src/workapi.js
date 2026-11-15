/* Page side of the facilio.work build. Every /api/* call goes to the app's own server function (/api/fn/api/...), where identity,
   roles and data are handled by the platform. Same interface as the Run build, so the screens do not change.
   File bytes go straight to storage through one-time links the server hands out. */
(function (root) {
  'use strict';
  // Big bodies (user, 16 Nov 2026): facilio.work refuses a request or a response over about 6 MB (413). A JSON body over 1 MB travels gzipped as { __gz: base64 }
  // both ways (work/server/api.mjs unpacks it and packs big answers when it sees x-fwb-gz; text shrinks 5 to 10 times), so a large BRD, FTR, plan or document saves
  // and loads. Only what is still over the cap after that gets a plain message. File bytes never come here: they go to storage in parts (handle below).
  const GZ_FROM = 1e6, GZ_MAX = 3.6e6;   // the answer carries the same record back and the platform's response cap is lower than its request cap
  const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
  const unb64 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const gzText = async t => b64(new Uint8Array(await new Response(new Blob([t]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()));
  const gunzText = async s => new Response(new Blob([unb64(s)]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  async function rpc(method, path, body) {
    const h = { 'x-fwb-gz': '1' }; let b;
    if (body !== undefined) { h['content-type'] = 'application/json'; b = JSON.stringify(body);
      if (b.length > GZ_FROM && typeof CompressionStream === 'function') { const z = await gzText(b); if (z.length > GZ_MAX) return { status: 413, data: { error: 'This is too large to save in one go (' + Math.round(b.length / 1e6) + ' MB of text, still too large after compression). Split it into smaller parts, for example one document per module set, or leave pictures out.' } }; b = JSON.stringify({ __gz: z }); } }
    let r; try { r = await fetch('/api/fn/api' + path.replace(/^\/api/, ''), { method, headers: h, body: b, credentials: 'same-origin' }); }
    catch (e) { return { status: 0, data: { error: 'Network error — check your connection' } }; }
    let data = null; try { data = await r.json(); if (data && typeof data.__gz === 'string') data = JSON.parse(await gunzText(data.__gz)); } catch (e) { data = { error: r.status === 413 ? 'This is too large for one request. Split it into smaller parts.' : 'Request failed (' + r.status + ')' }; }
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
