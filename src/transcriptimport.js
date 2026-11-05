/* Import an approved transcript transfer into Transcripts (roadmap E2 workspace 3). A transfer of kind `transcript` holds text that Claude stored through the connector (transfer_write).
   Once a person has approved it, "Import into Transcripts" (Transfers drawer) parses the APPROVED version (src/transcriptparse.js) and saves it through the same path as an uploaded
   transcript: a file in the project's file store, a record in the `transcripts` document, the text for Create MOM and the connector, and the usual rule-based analysis whose results
   are only ever pending suggestions. The record keeps source = { system, ref, transferId, version }; the same transfer version is never imported twice (the existing record is shown instead).
   The pure checks (check, build, findImported) are run by tests/transcript_import.mjs; the browser part below runs only inside the app. */
(function (root) {
  'use strict';
  const TP = root.FWBTranscriptParse || (typeof require === 'function' ? require('./transcriptparse.js') : null);
  const str = (v, n) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '').replace(/\s+/g, ' ').trim().slice(0, n || 200);
  const sourceOf = t => ({ system: str(t && t.source && t.source.system, 60), ref: str(t && t.source && t.source.ref, 300), transferId: str(t && t.id, 80), version: t ? t.approvedVer : null });
  /** the transcript record already made from this transfer version, or null */
  const findImported = (items, src) => (Array.isArray(items) ? items : []).find(i => i && !i.removed && i.source && i.source.transferId === src.transferId && i.source.version === src.version) || null;

  /** before anything is fetched: { err } if this transfer cannot be imported, { existing, source } if it already was, else { source } */
  function check(t, items) {
    if (!t || t.kind !== 'transcript') return { err: 'This transfer is not a transcript.' };
    if (t.status !== 'Approved' || t.approvedVer == null) return { err: 'Only an approved transcript can be imported. Approve it first.' };
    const source = sourceOf(t); const existing = findImported(items, source); return existing ? { existing, source } : { source };
  }
  /** after the approved version was read ({ version: { n }, content, intact }): { err } or { name, text, info } */
  function build(t, fetched) {
    const f = fetched || {}; if (!f.version || String(f.version.n) !== String(t.approvedVer)) return { err: 'The approved version could not be read. Nothing was imported.' };
    if (f.intact === false) return { err: 'This content does not match its recorded checksum, so it was not imported.' };
    const info = TP.parseTranscriptInfo(typeof f.content === 'string' ? f.content : '', str(t.source && t.source.ref, 200)); if (!info.chunks.length) return { err: 'No speech was found in this transcript, so nothing was imported.' };
    const label = str((t.source && (t.source.label || t.source.ref)) || 'transcript', 60).replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'transcript';
    return { name: label + ' (transfer v' + t.approvedVer + ').txt', text: TP.toText(info.chunks), info };
  }
  const api = { check, build, findImported, sourceOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBTranscriptImport = api;

  const F = root.FWB; const V = root.FWBViews; if (!F || !V) return;
  const { S } = F; const API = root.FWBApi;
  const docT = () => { const d = F.doc('transcripts'); d.items = d.items || []; d.candidates = d.candidates || []; d.history = d.history || []; return d; };
  /** t: the transfer; readVersion(n): reads that version from the server ({ version, content, intact }). Returns { item, existing, chunks, format, truncated } or throws with a message to show. */
  V.trImportTransfer = async function (t, readVersion) {
    const pre = check(t, docT().items); if (pre.err) throw new Error(pre.err); if (pre.existing) return { item: pre.existing, existing: true };
    const b = build(t, await readVersion(t.approvedVer)); if (b.err) throw new Error(b.err);
    const rec = await API.uploadFile(S.project.id, new File([b.text], b.name, { type: 'text/plain' }), 'transcript', {}, null);
    const again = findImported(docT().items, pre.source); if (again) return { item: again, existing: true };   // a second click or tab finished first
    const now = new Date().toISOString(); const D = docT();
    const item = { id: F.uid('tr'), fileId: rec.id, name: b.name, uploadedAt: now, by: S.user.name, status: 'uploaded', version: 1, replaces: null, chars: b.text.length, sessionId: '', modules: [],
      notes: 'Imported from ' + (pre.source.system || 'a transfer') + (pre.source.ref ? ' (' + pre.source.ref + ')' : '') + ', approved version ' + pre.source.version + '.', source: pre.source };
    D.items.unshift(item); D.history.unshift({ at: now, by: S.user.name, action: 'Transcript imported', detail: b.name + ' from transfer ' + pre.source.transferId + ' v' + pre.source.version, candidate: null });
    V.trSaveText(item.id, b.text); V.analyseTranscriptText(item, b.text); F.changed('Transcript imported', b.name, { section: 'transcripts' });
    return { item, existing: false, chunks: b.info.chunks.length, format: b.info.format, truncated: b.info.truncated };
  };
})(typeof window !== 'undefined' ? window : globalThis);
