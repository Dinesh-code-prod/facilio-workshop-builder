/* Transcripts & Requirement Confirmation: upload meeting transcripts per session, rule-based analysis against the configuration,
   review queue (accept / reject / edit / merge / clarify) with history, and the requirements register (only Confirmed requirements reach the BRD).
   Analysis runs locally in the browser — no transcript content is sent to any external AI service. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc, humanize } = F; const V = root.FWBViews; const API = root.FWBApi; const ACT = V.ACT;
  const { tag, sel, drawer, closeDrawer, toast, ico, confirmDialog, loading } = V;
  const CAT = { context: 'Current process (context)', new: 'New requirement', change: 'Change to existing configuration', covered: 'Already covered by configuration', contradiction: 'Contradiction', missing: 'Missing / incomplete information', unconfirmed: 'Not yet confirmed', cross: 'Cross-module dependency', question: 'Open question', custom: 'Possible customization' };
  const CATCLS = { context: 'low', new: 'proposed', change: 'modified', covered: 'green', contradiction: 'red', missing: 'tbc', unconfirmed: 'tbc', cross: 'violet', question: 'blue', custom: 'high' };
  const KIND = { request: 'Request', explanation: 'Explanation of current process', tentative: 'Tentative', confirmed: 'Confirmed in session' };
  const STATUS = { pending: 'Pending review', accepted: 'Accepted', rejected: 'Rejected', clarify: 'Needs clarification', merged: 'Merged' };
  V.TCAT = CAT;
  const live = i => !i.superseded && !i.removed;
  const T = () => { const d = F.doc('transcripts'); d.items = d.items || []; d.candidates = d.candidates || []; d.history = d.history || []; return d; };
  function hist(action, detail, cid) { T().history.unshift({ at: new Date().toISOString(), by: S.user.name, action, detail, candidate: cid || null }); if (T().history.length > 1000) T().history.length = 1000; }
  const sessions = () => (F.doc('planner').sessions || []);
  const sessLabel = id => { const s = sessions().find(x => x.id === id); return s ? `Session ${s.no || ''} — ${s.title || ''}`.trim() : (id ? 'Unknown session' : 'No session'); };

  // ================= VIEW =================
  V.transcripts = { html() {
    const tab = S.ui.trTab || 'review'; const d = T(); const pend = d.candidates.filter(c => c.status === 'pending' || c.status === 'clarify').length;
    const tabs = [['upload', 'Transcripts', d.items.filter(live).length], ['review', 'Review queue', pend], ['register', 'Requirements register', S.ws.requirements.length], ['questions', 'Open questions', S.ws.questions.filter(q => q.status !== 'closed').length], ['history', 'History']].concat(V.trExtra ? V.trExtra() : []);
    return `<div class="page-header"><div class="t"><h1>Transcripts &amp; Requirement Confirmation</h1><p>Upload workshop transcripts, review what was said against the configuration, and confirm requirements. Analysis runs in your browser using rules — transcripts are not sent to external AI services. Only requirements marked Confirmed are included in the BRD.</p></div>
      <div class="row"><button class="btn" data-act="nav" data-view="demokit" title="The real Facilio screens, to show in the session">Facilio screens</button><button class="btn" data-act="tpStart" data-ci="0" title="Play the guided tour of real Facilio screens in the session">Show Facilio</button><button class="btn" data-act="nav" data-view="whiteboard" title="Draw the customer's process and drop in a standard module flow">Requirements whiteboard</button>${V.howtoButton('transcripts')}${S.readonly ? '' : `<button class="btn" data-act="newReq">${ico('plus')}Requirement</button><button class="btn primary" data-act="uploadTranscript">${ico('upl')}Upload transcript</button>`}</div></div>
      <div class="tabs">${tabs.map(([k, l, c]) => `<button class="tab${tab === k ? ' active' : ''}" data-act="trTab" data-v="${k}">${esc(l)}${c ? `<span class="cnt">${c}</span>` : ''}</button>`).join('')}</div><div class="page-body">${V.tabHint('transcripts', tab)}${(TT[tab] || (V.trExtraBody && V.trExtraBody[tab]) || TT.review)()}</div>`;
  } };
  ACT.trTab = a => { S.ui.trTab = a.getAttribute('data-v'); V.render(); };
  const TT = {};

  // ---------- uploads ----------
  TT.upload = () => {
    const d = T();
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Transcript</th><th>Session</th><th>Modules</th><th>Uploaded</th><th>Candidates</th><th>Status</th><th></th></tr></thead><tbody>${d.items.filter(live).map(i => { const n = d.candidates.filter(c => c.transcriptId === i.id); return `<tr><td><b>${esc(i.name)}</b>${i.version > 1 ? ' ' + tag('blue', 'v' + i.version) : ''}${i.notes ? `<div class="xs muted">${esc(i.notes)}</div>` : ''}</td><td class="small">${esc(sessLabel(i.sessionId))}</td><td class="small">${esc((i.modules || []).map(m => (F.moduleView(m) || {}).label || m).join(', ')) || '<span class="dash">All in scope</span>'}</td><td class="small">${esc(V.fmtDate(i.uploadedAt))}<div class="xs muted">${esc(i.by || '')}</div></td>
      <td class="small">${n.length} (${n.filter(c => c.status === 'pending').length} pending)</td><td>${tag(i.status === 'reviewed' ? 'green' : i.status === 'analysed' ? 'blue' : 'low', humanize(i.status || 'uploaded'))}</td>
      <td class="acts"><div class="tr-acts">${S.readonly ? '' : `<button class="btn sm${i.status === 'uploaded' ? ' primary' : ''}" data-act="analyseTranscript" data-id="${esc(i.id)}" title="${i.status === 'uploaded' ? 'Read the transcript and suggest requirements' : 'Run the analysis again'}">${i.status === 'uploaded' ? 'Analyse' : 'Re-analyse'}</button><button class="btn sm" data-act="editTranscript" data-id="${esc(i.id)}" title="Change the session, the modules or the notes">${ico('edit')}Edit details</button><button class="btn sm" data-act="replaceTranscript" data-id="${esc(i.id)}" title="Upload a corrected file; the old version is kept">${ico('upl')}Replace file</button>`}<button class="btn sm" data-act="dlTranscript" data-id="${esc(i.id)}" title="Download the file">${ico('dl')}Download</button>${S.readonly ? '' : `<button class="btn sm danger" data-act="removeTranscript" data-id="${esc(i.id)}" title="Remove this transcript from the project">${ico('trash') || ''}Remove</button>`}</div></td></tr>`; }).join('') || `<tr><td colspan="7" class="empty">No transcripts uploaded. Supported: .vtt, .srt, .txt, .docx, .json (Teams / Zoom exports).</td></tr>`}</tbody></table></div>`;
  };
  function transcriptForm(i) {
    const mods = F.allModules().filter(m => m.inScope || (i.modules || []).includes(m.name)).sort((a, b) => a.label.localeCompare(b.label));
    return `<div class="fgrid"><div class="full"><label class="f">Requirement session</label>${sel('', [{ v: '', l: '— not linked —' }].concat(sessions().map(s => ({ v: s.id, l: sessLabel(s.id) + (s.date ? ' · ' + V.fmtDate(s.date) : '') }))), i.sessionId || '', 'id="tr_sess"')}</div>
      <div class="full"><label class="f">Modules discussed (Ctrl/Cmd-click for several; none = all in-scope modules)</label><select id="tr_mods" multiple size="8" style="height:auto">${mods.map(m => `<option value="${esc(m.name)}" ${(i.modules || []).includes(m.name) ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select></div>
      <div class="full"><label class="f">Notes</label><textarea id="tr_notes" rows="3">${esc(i.notes || '')}</textarea></div></div>`;
  }
  const trForm = () => ({ sessionId: document.getElementById('tr_sess').value, modules: Array.from(document.getElementById('tr_mods').selectedOptions).map(o => o.value), notes: document.getElementById('tr_notes').value.trim() });
  ACT.uploadTranscript = () => { const sess = S.ui.trSession || ''; drawer('Upload transcript', `<div class="drop" data-act="trPick"><div>${ico('upl')}</div><div><b>Choose a transcript file</b></div><div class="xs muted">.vtt · .srt · .txt · .docx · .json — up to 20 MB</div><div id="tr_file" class="small" style="margin-top:8px"></div></div><div style="margin-top:14px">${transcriptForm({ sessionId: sess })}</div>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="trUpload">Upload and analyse</button>`); };
  let picked = null;
  ACT.trPick = async () => { const f = (await V.pickFile('.vtt,.srt,.txt,.docx,.json'))[0]; if (!f) return; picked = f; document.getElementById('tr_file').textContent = f.name + ' · ' + V.fmtSize(f.size); };
  ACT.trUpload = async a => { if (!picked) { toast('Choose a file first'); return; } const meta = trForm(); const replaces = a.getAttribute('data-replace') || null; const f = picked; picked = null; closeDrawer();
    loading(true, 'Uploading transcript…'); try {
      const text = await extractText(f); const rec = await API.uploadFile(S.project.id, f, 'transcript', { sessionId: meta.sessionId }, replaces ? (T().items.find(x => x.id === replaces) || {}).fileId : null, p => V.loadingMsg('Uploading… ' + Math.round(p * 100) + '%'));
      const d = T(); const old = replaces && d.items.find(x => x.id === replaces); if (old) old.superseded = true;
      const item = Object.assign({ id: F.uid('tr'), fileId: rec.id, name: f.name, uploadedAt: new Date().toISOString(), by: S.user.name, status: 'uploaded', version: old ? (old.version || 1) + 1 : 1, replaces: old ? old.id : null, chars: text.length }, meta);
      d.items.unshift(item); hist(old ? 'Transcript replaced' : 'Transcript uploaded', f.name);
      if (old) d.candidates.filter(c => c.transcriptId === old.id && c.status === 'pending').forEach(c => { c.status = 'rejected'; c.reason = 'Superseded by a newer transcript version'; });
      analyse(item, text); F.changed('Transcript uploaded', f.name, { section: 'transcripts' }); S.ui.trTab = 'review'; S.ui.trFilter = { transcript: item.id }; V.render();
    } finally { loading(false); } };
  ACT.replaceTranscript = a => { const i = T().items.find(x => x.id === a.getAttribute('data-id')); drawer('Replace transcript file', `<div class="notice" style="margin-bottom:12px"><span>Upload a corrected or newer file for <b>${esc(i.name)}</b>. The previous version is kept. Pending suggestions from it are closed; decisions you already made are kept.</span></div><div class="drop" data-act="trPick"><div>${ico('upl')}</div><div><b>Choose the new file</b></div><div class="xs muted">.vtt · .srt · .txt · .docx · .json — up to 20 MB</div><div id="tr_file" class="small" style="margin-top:8px"></div></div><details style="margin-top:14px"><summary class="small" style="cursor:pointer">Same session, modules and notes as before. Change them too</summary><div style="margin-top:10px">${transcriptForm(i)}</div></details>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="trUpload" data-replace="${esc(i.id)}">Upload new file and analyse</button>`); };
  ACT.editTranscript = a => { const i = T().items.find(x => x.id === a.getAttribute('data-id')); drawer('Edit transcript details', `<div class="notice" style="margin-bottom:12px"><span>Change which requirement session <b>${esc(i.name)}</b> belongs to, the modules discussed, or the notes. To upload a corrected file instead, use <b>Replace file</b>.</span></div>${transcriptForm(i)}`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="saveTranscript" data-id="${esc(i.id)}">Save</button>`); };
  ACT.saveTranscript = a => { const i = T().items.find(x => x.id === a.getAttribute('data-id')); Object.assign(i, trForm()); T().candidates.filter(c => c.transcriptId === i.id).forEach(c => { c.sessionId = i.sessionId; }); closeDrawer(); hist('Transcript details updated', i.name); F.changed('Transcript updated', i.name, { section: 'transcripts' }); };
  ACT.removeTranscript = async a => { const id = a.getAttribute('data-id'); const d = T(); const i = d.items.find(x => x.id === id); if (!i) return;
    const mine = d.candidates.filter(c => c.transcriptId === id), pend = mine.filter(c => c.status === 'pending' || c.status === 'clarify').length, kept = mine.length - pend;
    if (!(await confirmDialog('Remove transcript', `Remove "${i.name}" from this project? ${pend ? pend + ' suggestion' + (pend === 1 ? '' : 's') + ' waiting for review will be deleted. ' : ''}${kept ? kept + ' decision' + (kept === 1 ? '' : 's') + ' you already made (accepted, rejected or merged) stay, with their source quotes. ' : ''}The file is removed from the project. The change is recorded in the history.`, 'Remove', true))) return;
    loading(true, 'Removing…'); try {
      if (i.fileId) { try { await API.del('/api/projects/' + S.project.id + '/files/' + i.fileId); } catch (e) { if (!/not found/i.test(e.message || '')) throw e; } }
      i.removed = true; i.removedAt = new Date().toISOString(); i.removedBy = S.user.name;
      d.candidates = d.candidates.filter(c => !(c.transcriptId === id && (c.status === 'pending' || c.status === 'clarify')));
      if (S.ui.trFilter && S.ui.trFilter.transcript === id) S.ui.trFilter = {};
      hist('Transcript removed', i.name); F.changed('Transcript removed', i.name, { section: 'transcripts' }); toast('Removed ' + i.name); V.render();
    } catch (e) { toast(e.message || 'Could not remove the transcript', 5000, true); } finally { loading(false); } };
  ACT.dlTranscript = async a => { const i = T().items.find(x => x.id === a.getAttribute('data-id')); loading(true, 'Downloading…'); try { const d = await API.downloadFile(S.project.id, i.fileId); V.download(i.name, d.blob); } finally { loading(false); } };
  ACT.analyseTranscript = async a => { const i = T().items.find(x => x.id === a.getAttribute('data-id')); const pend = T().candidates.filter(c => c.transcriptId === i.id && c.status === 'pending');
    if (pend.length && !(await confirmDialog('Re-analyse transcript', `Re-run the analysis? ${pend.length} pending candidate(s) from this transcript are replaced; reviewed ones are kept.`, 'Re-analyse'))) return;
    loading(true, 'Analysing…'); try { const d = await API.downloadFile(S.project.id, i.fileId); const text = await extractText(new File([d.blob], i.name)); const D = T(); D.candidates = D.candidates.filter(c => !(c.transcriptId === i.id && c.status === 'pending')); analyse(i, text); F.changed('Transcript analysed', i.name, { section: 'transcripts' }); S.ui.trTab = 'review'; S.ui.trFilter = { transcript: i.id }; V.render(); } finally { loading(false); } };

  // ---------- text extraction ----------
  async function extractText(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'docx') { await V.loadScript('vendor/mammoth.browser.min.js'); const r = await root.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() }); return r.value; }
    const raw = await file.text();
    if (ext === 'json') { try { const j = JSON.parse(raw); const arr = Array.isArray(j) ? j : j.entries || j.transcript || j.results || j.segments || j.recognizedPhrases || []; return arr.map(e => { const sp = e.speaker || e.speakerName || e.speaker_name || (e.participant && e.participant.name) || ''; const tx = e.text || e.content || e.words || e.display || e.transcript || ''; return (sp ? sp + ': ' : '') + (typeof tx === 'string' ? tx : JSON.stringify(tx)); }).join('\n') || raw; } catch (e) { return raw; } }
    if (ext === 'vtt' || ext === 'srt') return raw.replace(/^WEBVTT.*$/m, '').split(/\r?\n/).filter(l => l.trim() && !/^\d+$/.test(l.trim()) && !/-->/.test(l) && !/^NOTE\b/.test(l)).map(l => l.replace(/<v\s+([^>]+)>/g, '$1: ').replace(/<\/?[^>]+>/g, '')).join('\n');
    return raw;
  }
  V.extractTranscriptText = extractText;

  // ---------- rule-based analysis ----------
  const RX = {
    request: /\b(should|shouldn't|we need|we'd need|we want|we would like|we'd like|need to|needs to|should be able|should have|must|required to|requirement is|can we|could we|it would be (good|nice|helpful)|please add|has to|have to)\b/i,
    explanation: /\b(currently|right now|at the moment|today we|today,? we|we use|we are using|the process is|our process|normally|usually|what happens is|as of now|existing process)\b/i,
    tentative: /\b(maybe|might|probably|not sure|i think|we think|possibly|perhaps|could be|let me check|to be decided|tbd|consider)\b/i,
    confirmed: /\b(agreed|confirmed|confirm that|yes,? (let'?s|we will|that'?s fine|go ahead)|final(ise|ize|ised|ized)?|go ahead|approved|sign(ed)? off|that works|let'?s do that)\b/i,
    change: /\b(change|rename|instead of|replace|make (it )?(mandatory|optional|read.?only)|(be|is|as) (mandatory|optional|read.?only|compulsory)|remove|hide|add (an? )?(option|value|field|status|state|button)|split|merge|move)\b/i,
    link: /\b(creates?|raise[sd]?|generates?|converts?|auto.?creates?|spawns?|linked to|link (it|them) to|turns? into)\b/i,
    followup: /^(yes|yeah|no|maybe|also|and|but|that|this|it|they|those|then|so|ok|okay)\b/i,
    negative: /\b(should not|shouldn't|don't need|do not need|no need|not required|never|must not|not needed)\b/i,
    missing: /\b(tbd|to be decided|need to check|will check|get back|follow up|follow-up|not decided|need to confirm|will confirm|don't know|do not know)\b/i,
    custom: /\b(integration|integrate|api\b|sap\b|erp\b|oracle|sso\b|active directory|custom report|script|webhook|sync|automatically calculate|custom (logic|code|development)|connector|middleware|third.?party)\b/i
  };
  // Vocabulary. Modules are matched everywhere (by label, technical name and singular/plural); fields, states and
  // transitions only for the modules a statement is actually about, so common words ("Assign", "Phone", "Vendor")
  // no longer pull in every module that happens to have them.
  const GENERIC = /^(assign|assigned|close|closed|open|submit|submitted|request|requested|approve|approved|reject|rejected|resolve|resolved|start|cancel|phone|email|vendor|site|space|group|team|category|priority|location|owner|amount|comments?|subject|title|summary)$/i;
  const rxFor = l => new RegExp('\\b' + l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+') + '(s|es)?\\b', 'i');
  function moduleVocab() {
    const out = []; const seen = new Set();
    F.allModules().filter(m => m.inUse || m.inScope).forEach(m => { [m.label, humanize(m.name), m.label.replace(/s$/i, ''), m.label.replace(/ies$/i, 'y')].forEach(l => { l = String(l || '').trim(); const k = m.name + '|' + l.toLowerCase(); if (l.length < 3 || seen.has(k)) return; seen.add(k); out.push({ kind: 'module', label: m.label, rx: rxFor(l), module: m.name, ref: m.name, words: l.split(/\s+/).length }); }); });
    return out;
  }
  const detailCache = {};
  function detailVocab(m) {
    if (detailCache[m]) return detailCache[m]; const out = []; const seen = new Set();
    const add = (kind, label, ref) => { const l = String(label || '').trim(); if (l.length < 3 || /^(name|id|status|type|date|time|description|notes?)$/i.test(l)) return; const k = kind + '|' + l.toLowerCase(); if (seen.has(k)) return; seen.add(k); out.push({ kind, label: l, rx: rxFor(l), ref, module: m, generic: GENERIC.test(l) }); };
    F.effFields(m).filter(f => f.status !== 'removed' && (f.onForms || []).length || f.status === 'proposed').forEach(f => add('field', f.label, f.name));
    F.flowsForModule(m).forEach(x => { const fm = F.flowModel(x.id); fm.states.forEach(st => add('state', st.label, st.id)); fm.transitions.filter(t => !t.removed).forEach(t => add('transition', t.name, fm.id + '|' + t.id)); });
    return (detailCache[m] = out);
  }
  function analyse(item, text) {
    Object.keys(detailCache).forEach(k => delete detailCache[k]);
    const sess = sessions().find(x => x.id === item.sessionId);
    const scopeMods = item.modules && item.modules.length ? item.modules : (sess && (sess.modules || []).length ? sess.modules.filter(m => F.moduleView(m)) : []);
    const MV = moduleVocab(); const roles = F.allActors().filter(a => a.roleName || a.origin === 'proposed').map(a => ({ kind: 'role', label: a.label, rx: rxFor(a.label), ref: a.id })).filter(r => r.label.length > 3);
    const d = T();
    // utterances: "Speaker: text" lines; long lines split into sentences
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean); const utt = []; let speaker = '';
    lines.forEach((l, li) => { const m = l.match(/^([A-Z][\w .'()&-]{1,50}?)\s*[:：]\s+(.*)$/); let body = l; if (m && m[1].split(' ').length <= 6) { speaker = m[1].trim(); body = m[2]; }
      body.split(/(?<=[.!?])\s+(?=[A-Z])/).forEach(x => { if (x.trim().length > 14) utt.push({ speaker, text: x.trim(), line: li + 1 }); }); });
    let n = 0; let prevTopic = [];
    utt.forEach((u, idx) => {
      const t = u.text; const why = [];
      // 1. which modules is this about? explicitly named first (longest label wins), then a follow-up inherits the previous topic, then the session's modules
      let named = []; const spans = {}; const rank = m => { const mv = F.moduleView(m) || {}; return (mv.inScope ? 0 : 1000) + F.businessRank(m); };
      MV.filter(v => v.rx.test(t)).sort((a, b) => b.words - a.words || rank(a.module) - rank(b.module)).forEach(v => { const said = (t.match(v.rx) || [''])[0].toLowerCase().replace(/(es|s)$/, ''); if (named.includes(v.module)) return; if (spans[said] && spans[said] !== v.module) return; spans[said] = v.module; named.push(v.module); });
      let topic = named.slice(), how = named.length ? 'named' : '';
      if (!topic.length && prevTopic.length && (RX.followup.test(t) || (idx > 0 && utt[idx - 1].speaker === u.speaker && utt[idx - 1].line >= u.line - 1))) { topic = prevTopic.slice(); how = 'follows on from the previous statement'; }
      if (!topic.length && scopeMods.length && scopeMods.length <= 3) { topic = scopeMods.slice(); how = 'the session\'s modules'; }
      // 2. configuration elements of those modules mentioned in the statement (one entry per label)
      const det = []; topic.forEach(m => detailVocab(m).forEach(v => { if (v.rx.test(t) && !det.some(x => x.kind === v.kind && x.label.toLowerCase() === v.label.toLowerCase())) det.push(v); }));
      const specific = det.filter(x => !x.generic); const known = det;
      const roleHits = roles.filter((r, i) => r.rx.test(t) && roles.findIndex(x => x.label.toLowerCase() === r.label.toLowerCase()) === i).slice(0, 3);
      const isQ = /\?\s*$/.test(t) || /^(what|how|can|could|does|do|is|are|will|who|when|where|why|should)\b/i.test(t);
      const kind = RX.confirmed.test(t) ? 'confirmed' : RX.tentative.test(t) ? 'tentative' : RX.request.test(t) ? 'request' : RX.explanation.test(t) ? 'explanation' : null;
      const neg = RX.negative.test(t); const custom = RX.custom.test(t); const missing = RX.missing.test(t);
      const relevant = kind || isQ || neg || custom || missing;
      if (named.length) prevTopic = named.slice();
      if (!relevant || (!topic.length && !custom && !isQ && kind !== 'request' && kind !== 'explanation')) return;
      // 3. category, with the reason written down so a reviewer can check it
      const word = rx => (t.match(rx) || [''])[0];
      let cat;
      if (custom) { cat = 'custom'; why.push(`Mentions "${word(RX.custom)}" — likely integration or custom work`); }
      else if ((/\?\s*$/.test(t) || isQ && kind !== 'request') && kind !== 'confirmed') { cat = 'question'; why.push('Phrased as a question'); }
      else if (missing) { cat = 'missing'; why.push(`Still open: "${word(RX.missing)}"`); }
      else if (kind === 'tentative') { cat = 'unconfirmed'; why.push(`Tentative wording: "${word(RX.tentative)}"`); }
      else if (kind === 'explanation' && !RX.request.test(t)) { cat = known.length ? 'covered' : 'context'; why.push(`Describes the current process ("${word(RX.explanation)}")`); if (known.length) why.push('Mentions configured items'); }
      else if (neg && (specific.length || named.some(m => (F.moduleView(m) || {}).inUse))) { cat = 'contradiction'; why.push(`Says "${word(RX.negative)}" about something that is configured`); }
      else if (named.length > 1 && RX.link.test(t)) { cat = 'cross'; why.push(`One record ${word(RX.link)} another: ${named.map(m => (F.moduleView(m) || {}).label || m).join(' and ')}`); }
      else if (known.length && RX.change.test(t)) { cat = 'change'; why.push(`Changes a configured item ("${word(RX.change)}")`); }
      else if (known.length) { cat = 'change'; why.push('Request about configured items'); }
      else { cat = 'new'; why.push(kind === 'confirmed' ? 'Agreed in the session' : 'Request with no matching configuration'); }
      if (kind === 'confirmed' && cat !== 'custom') why.push(`Agreed in the session ("${word(RX.confirmed)}")`);
      // contradiction with an existing confirmed requirement: same configured item, opposite polarity
      if (cat !== 'contradiction' && specific.length) { const conf = S.ws.requirements.filter(r => r.status === 'Confirmed' && specific.some(k => (r.title + ' ' + (r.objective || '')).toLowerCase().includes(k.label.toLowerCase()))); if (conf.length && neg !== RX.negative.test(conf.map(r => r.title + ' ' + (r.objective || '')).join(' '))) { cat = 'contradiction'; why.push('Opposes confirmed requirement ' + conf.map(r => r.id).join(', ')); } }
      if (topic.length) why.push('Module ' + (how === 'named' ? 'named' : 'from ' + how) + ': ' + topic.map(m => (F.moduleView(m) || {}).label || m).join(', '));
      if (specific.length) why.push('Matches ' + specific.slice(0, 4).map(x => x.kind + ' "' + x.label + '"').join(', '));
      const confidence = how === 'named' && (specific.length || kind === 'request' || kind === 'confirmed' || cat === 'custom' || cat === 'question') ? 'high' : topic.length ? 'medium' : 'low';
      const ctx = utt.slice(Math.max(0, idx - 1), idx + 2).map(x => (x.speaker ? x.speaker + ': ' : '') + x.text).join(' ');
      d.candidates.push({ id: F.uid('cand'), transcriptId: item.id, sessionId: item.sessionId || '', speaker: u.speaker, line: u.line, text: t, context: ctx, kind: kind || (isQ ? 'request' : 'explanation'), category: cat,
        modules: topic.slice(0, 4), matches: specific.concat(det.filter(x => x.generic)).slice(0, 6).map(h => ({ kind: h.kind, label: h.label, ref: h.ref, module: h.module })).concat(roleHits.map(r => ({ kind: 'role', label: r.label, ref: r.ref }))),
        why, confidence, title: t.length > 110 ? t.slice(0, 107) + '…' : t, status: 'pending', reqId: null, notes: '', createdAt: new Date().toISOString() }); n++;
    });
    item.status = 'analysed'; item.analysedAt = new Date().toISOString(); item.candidateCount = n; hist('Transcript analysed', item.name + ' — ' + n + ' candidate(s) from ' + utt.length + ' statements');
    toast(n + ' statement(s) to review from ' + utt.length + ' in the transcript');
  }
  V.analyseTranscriptText = analyse;

  // ---------- review queue ----------
  // Review queue: one card per statement. What was said on the left, what the analysis thinks and why in the middle,
  // the decision on the right. Category chips show only categories present, with counts that match the list.
  const ORDER = ['contradiction', 'custom', 'question', 'change', 'new', 'cross', 'missing', 'unconfirmed', 'covered', 'context'];
  const CONF = { high: ['green', 'High confidence'], medium: ['tbc', 'Medium confidence'], low: ['low', 'Low confidence'] };
  TT.review = () => {
    const d = T(); const fl = S.ui.trFilter || {}; const st = fl.status || 'open';
    const byStatus = c => st === 'all' || (st === 'open' ? (c.status === 'pending' || c.status === 'clarify') : c.status === st);
    let base = d.candidates.filter(byStatus);
    if (fl.transcript) base = base.filter(c => c.transcriptId === fl.transcript); if (fl.module) base = base.filter(c => (c.modules || []).includes(fl.module)); if (fl.kind) base = base.filter(c => c.kind === fl.kind);
    const list = (fl.category ? base.filter(c => c.category === fl.category) : base).slice().sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || (a.line || 0) - (b.line || 0));
    const cnt = k => d.candidates.filter(c => k === 'open' ? c.status === 'pending' || c.status === 'clarify' : k === 'all' || c.status === k).length;
    const mods = [...new Set(d.candidates.flatMap(c => c.modules || []))];
    const fsel = (k, opts, ph) => `<select data-change="trFilter" data-k="${k}" style="width:auto;min-width:150px">${[{ v: '', l: ph }].concat(opts).map(o => `<option value="${esc(o.v)}" ${String(fl[k] || '') === String(o.v) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
    const cats = ORDER.filter(k => base.some(c => c.category === k));
    if (!d.candidates.length) return `<div class="card empty"><h3>Nothing to review yet</h3><p>Upload a workshop transcript. Each statement that sounds like a requirement, decision, question or open point is listed here for you to accept, clarify or reject.</p>${S.readonly ? '' : `<button class="btn primary" data-act="uploadTranscript">${ico('upl')}Upload transcript</button>`}</div>`;
    return `<div class="notice" style="margin-bottom:12px"><span>Each card is one statement from a transcript. Check the suggested category and modules, then <b>Accept</b> it as a requirement, ask for <b>Clarification</b>, <b>Merge</b> it into an existing requirement or <b>Reject</b> it. Only requirements you confirm reach the BRD.</span></div>
      <div class="row" style="margin-bottom:10px;flex-wrap:wrap"><div class="seg">${[['open', 'To review'], ['accepted', 'Accepted'], ['merged', 'Merged'], ['rejected', 'Rejected'], ['all', 'All']].map(([v, l]) => `<button class="${st === v ? 'on' : ''}" data-act="trStatus" data-v="${v}">${l} <span class="muted">${cnt(v)}</span></button>`).join('')}</div>
        ${fsel('transcript', d.items.filter(live).map(i => ({ v: i.id, l: i.name })), 'All transcripts')}${fsel('module', mods.map(m => ({ v: m, l: (F.moduleView(m) || {}).label || m })), 'All modules')}${fsel('kind', Object.entries(KIND).map(([v, l]) => ({ v, l })), 'Any statement type')}</div>
      <div class="tr-chips"><button class="${!fl.category ? 'on' : ''}" data-act="trCat" data-v="">All categories <b>${base.length}</b></button>${cats.map(k => `<button class="${fl.category === k ? 'on' : ''}" data-act="trCat" data-v="${k}">${tag(CATCLS[k] || 'low', esc(CAT[k]))}<b>${base.filter(c => c.category === k).length}</b></button>`).join('')}</div>
      <div class="tr-list">${list.slice(0, 300).map(c => card(c)).join('') || `<div class="card empty">Nothing here for these filters.</div>`}</div>${list.length > 300 ? `<div class="xs muted" style="margin-top:6px">Showing the first 300 — narrow the filters to see more.</div>` : ''}`;
  };
  function card(c) {
    const ml = m => (F.moduleView(m) || {}).label || m; const conf = CONF[c.confidence];
    const done = c.status !== 'pending' && c.status !== 'clarify';
    return `<div class="tr-card${done ? ' done' : ''}" data-cand="${esc(c.id)}">
      <div class="tr-said"><div class="xs muted"><b class="spk">${esc(c.speaker || 'Speaker')}</b> line ${c.line || '?'} · ${esc(sessLabel(c.sessionId))}</div><p>${esc(c.text)}</p>
        ${c.context && c.context !== c.text ? `<details><summary class="xs">Show surrounding conversation</summary><div class="xs muted">${esc(c.context)}</div></details>` : ''}
        ${c.notes ? `<div class="xs muted">Note: ${esc(c.notes)}</div>` : ''}${c.reqId ? `<div class="xs">Requirement <a href="#" data-act="editReq" data-id="${esc(c.reqId)}">${esc(c.reqId)}</a></div>` : ''}${c.reason ? `<div class="xs muted">Reason: ${esc(c.reason)}</div>` : ''}</div>
      <div class="tr-read"><div class="row">${tag(CATCLS[c.category] || 'low', CAT[c.category] || c.category)}${tag(c.kind === 'confirmed' ? 'green' : c.kind === 'tentative' ? 'tbc' : c.kind === 'request' ? 'blue' : 'low', KIND[c.kind] || c.kind)}${conf ? `<span class="tr-conf ${c.confidence}" title="How sure the analysis is about the module and category">${conf[1]}</span>` : ''}</div>
        <div class="tr-kv"><span>Modules</span><div>${(c.modules || []).length ? c.modules.map(m => `<span class="tag">${esc(ml(m))}</span>`).join(' ') : '<span class="muted small">Not identified — set it when you accept</span>'}</div></div>
        ${(c.matches || []).length ? `<div class="tr-kv"><span>Mentions</span><div class="small">${esc(c.matches.map(m => humanize(m.kind) + ' “' + m.label + '”').join(', '))}</div></div>` : ''}
        ${(c.why || []).length ? `<ul class="tr-why">${c.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : `<div class="xs muted">Analysed with an earlier version. Re-analyse the transcript to see why it was classified this way.</div>`}</div>
      <div class="tr-act">${tag(c.status === 'accepted' ? 'green' : c.status === 'rejected' ? 'low' : c.status === 'clarify' ? 'tbc' : c.status === 'merged' ? 'violet' : 'blue', STATUS[c.status])}
        ${S.readonly || done ? '' : `<button class="btn sm primary" data-act="candAccept" data-id="${esc(c.id)}">Accept</button><button class="btn sm" data-act="candClarify" data-id="${esc(c.id)}">Clarify</button><button class="btn sm" data-act="candMerge" data-id="${esc(c.id)}">Merge</button><button class="btn sm" data-act="candEdit" data-id="${esc(c.id)}">Edit</button><button class="btn sm danger" data-act="candReject" data-id="${esc(c.id)}">Reject</button>`}</div></div>`;
  }
  ACT.trStatus = a => { S.ui.trFilter = Object.assign({}, S.ui.trFilter, { status: a.getAttribute('data-v') }); V.render(); };
  ACT.trCat = a => { S.ui.trFilter = Object.assign({}, S.ui.trFilter, { category: a.getAttribute('data-v') }); V.render(); };
  ACT.trFilter = el => { S.ui.trFilter = Object.assign({}, S.ui.trFilter, { [el.getAttribute('data-k')]: el.value }); V.render(); };
  const cand = id => T().candidates.find(c => c.id === id);
  const CLASS_OF = { context: 'existing', new: 'change', change: 'change', covered: 'existing', contradiction: 'confirm', missing: 'confirm', unconfirmed: 'confirm', cross: 'change', question: 'confirm', custom: 'custom' };
  ACT.candAccept = a => { const c = cand(a.getAttribute('data-id')); V.newReqFor({ title: c.title, objective: c.text, modules: c.modules || [], classification: CLASS_OF[c.category] || 'change', status: 'Draft', source: { agreedInSession: c.kind === 'confirmed', candidate: c.id, transcript: c.transcriptId, session: c.sessionId, speaker: c.speaker, line: c.line }, sessionId: c.sessionId, fromCandidate: c.id }); };
  ACT.candEdit = a => { const c = cand(a.getAttribute('data-id')); const mods = F.allModules().filter(m => m.inScope || (c.modules || []).includes(m.name)).sort((x, y) => x.label.localeCompare(y.label));
    drawer('Edit candidate', `<div class="notice small" style="margin-bottom:12px"><div><b>${esc(c.speaker || 'Speaker')}</b>: ${esc(c.context || c.text)}</div></div><div class="fgrid"><div class="full"><label class="f">Title</label><input type="text" id="cd_title" value="${esc(c.title)}"></div>
      <div><label class="f">Statement type</label>${sel('', Object.entries(KIND).map(([v, l]) => ({ v, l })), c.kind, 'id="cd_kind"')}</div><div><label class="f">Category</label>${sel('', Object.entries(CAT).map(([v, l]) => ({ v, l })), c.category, 'id="cd_cat"')}</div>
      <div class="full"><label class="f">Modules</label><select id="cd_mods" multiple size="6" style="height:auto">${mods.map(m => `<option value="${esc(m.name)}" ${(c.modules || []).includes(m.name) ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select></div>
      <div class="full"><label class="f">Reviewer notes</label><textarea id="cd_notes" rows="3">${esc(c.notes || '')}</textarea></div></div>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="candSave" data-id="${esc(c.id)}">Save</button>`); };
  ACT.candSave = a => { const c = cand(a.getAttribute('data-id')); const before = JSON.stringify({ t: c.title, k: c.kind, c: c.category }); c.title = document.getElementById('cd_title').value.trim() || c.title; c.kind = document.getElementById('cd_kind').value; c.category = document.getElementById('cd_cat').value; c.modules = Array.from(document.getElementById('cd_mods').selectedOptions).map(o => o.value); c.notes = document.getElementById('cd_notes').value.trim();
    hist('Candidate edited', before + ' → ' + JSON.stringify({ t: c.title, k: c.kind, c: c.category }), c.id); closeDrawer(); F.changed('Candidate edited', c.title, { section: 'transcripts' }); };
  ACT.candReject = a => { const c = cand(a.getAttribute('data-id')); drawer('Reject candidate', `<div class="small" style="margin-bottom:10px">${esc(c.text)}</div><label class="f">Reason</label>${sel('', ['Not a requirement', 'Duplicate', 'Out of scope', 'Explanation only', 'Superseded later in the session', 'Other'], 'Not a requirement', 'id="cr_reason"')}<label class="f" style="margin-top:8px">Notes</label><textarea id="cr_notes" rows="2"></textarea>`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn danger" data-act="candRejectDo" data-id="${esc(c.id)}">Reject</button>`); };
  ACT.candRejectDo = a => { const c = cand(a.getAttribute('data-id')); c.status = 'rejected'; c.reason = document.getElementById('cr_reason').value + (document.getElementById('cr_notes').value.trim() ? ' — ' + document.getElementById('cr_notes').value.trim() : ''); hist('Candidate rejected', c.reason, c.id); closeDrawer(); F.changed('Candidate rejected', c.title, { section: 'transcripts' }); };
  ACT.candClarify = a => { const c = cand(a.getAttribute('data-id')); drawer('Needs clarification', `<div class="small" style="margin-bottom:10px">${esc(c.text)}</div><label class="f">Question to raise</label><textarea id="cq_text" rows="3">${esc('Please clarify: ' + c.title)}</textarea><label class="f" style="margin-top:8px">Owner</label>${sel('', [{ v: 'customer', l: 'Customer' }, { v: 'internal', l: 'Facilio internal' }], 'customer', 'id="cq_owner"')}`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="candClarifyDo" data-id="${esc(c.id)}">Add open question</button>`); };
  ACT.candClarifyDo = a => { const c = cand(a.getAttribute('data-id')); const q = { id: F.uid('q'), text: document.getElementById('cq_text').value.trim(), area: (c.modules || []).map(m => (F.moduleView(m) || {}).label || m).join(', ') || 'General', owner: document.getElementById('cq_owner').value, status: 'open', source: c.id, sessionId: c.sessionId, created: new Date().toISOString() };
    S.ws.questions.push(q); c.status = 'clarify'; c.questionId = q.id; hist('Clarification requested', q.text, c.id); closeDrawer(); F.changed('Open question added', q.text, { section: 'transcripts' }); };
  ACT.candMerge = a => { const c = cand(a.getAttribute('data-id')); const others = T().candidates.filter(x => x.id !== c.id && (x.status === 'pending' || x.status === 'clarify' || x.status === 'accepted'));
    drawer('Merge candidate', `<div class="small" style="margin-bottom:10px">${esc(c.text)}</div><label class="f">Merge into an existing requirement</label>${sel('', [{ v: '', l: '— choose —' }].concat(S.ws.requirements.map(r => ({ v: 'req:' + r.id, l: r.id + ' — ' + r.title }))), '', 'id="cm_req"')}<label class="f" style="margin-top:10px">…or into another candidate</label>${sel('', [{ v: '', l: '— choose —' }].concat(others.slice(0, 200).map(x => ({ v: 'cand:' + x.id, l: x.title }))), '', 'id="cm_cand"')}`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="candMergeDo" data-id="${esc(c.id)}">Merge</button>`); };
  ACT.candMergeDo = a => { const c = cand(a.getAttribute('data-id')); const t = document.getElementById('cm_req').value || document.getElementById('cm_cand').value; if (!t) { toast('Choose where to merge'); return; }
    if (t.startsWith('req:')) { const r = S.ws.requirements.find(x => x.id === t.slice(4)); r.objective = (r.objective ? r.objective + '\n' : '') + '[' + (c.speaker || 'Session') + '] ' + c.text; r.sources = (r.sources || []).concat([{ candidate: c.id, transcript: c.transcriptId, session: c.sessionId }]); c.reqId = r.id; c.mergedInto = r.id; }
    else { const o = cand(t.slice(5)); o.text += ' ' + c.text; o.context = (o.context || '') + ' … ' + (c.context || c.text); o.modules = [...new Set((o.modules || []).concat(c.modules || []))]; c.mergedInto = o.id; }
    c.status = 'merged'; hist('Candidate merged', 'into ' + t, c.id); closeDrawer(); F.changed('Candidate merged', c.title, { section: 'transcripts' }); };

  // ---------- requirements register ----------
  V.reqTable = rs => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Requirement</th><th>Modules</th><th>Classification</th><th>Source</th><th>Status</th><th>Open questions</th></tr></thead><tbody>${rs.map(r => `<tr class="click" data-act="editReq" data-id="${esc(r.id)}"><td class="mono"><b>${esc(r.id)}</b></td><td><b>${esc(r.title)}</b>${r.objective ? `<div class="xs muted">${esc(r.objective.slice(0, 140))}</div>` : ''}</td><td class="small">${(r.modules || []).map(m => esc((F.moduleView(m) || {}).label || m)).join(', ')}</td><td>${tag(r.classification === 'custom' || r.classification === 'confirm' ? 'tbc' : r.classification === 'change' ? 'proposed' : 'existing', F.REQ_CLASS[r.classification] || '—')}</td><td class="xs">${r.source ? 'Transcript' + (r.source.session ? ' · ' + esc(sessLabel(r.source.session)) : '') : 'Manual'}</td><td>${tag(r.status === 'Confirmed' ? 'verified' : r.status === 'Deferred' || r.status === 'Rejected' ? 'low' : 'tbc', r.status || 'Draft')}</td><td class="small">${esc(r.openQuestions || '')}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No requirements captured yet.</td></tr>'}</tbody></table></div>`;
  TT.register = () => {
    const q = (S.ui.rq || '').toLowerCase(); const st = S.ui.rqs || 'all'; const rs = S.ws.requirements.filter(r => (!q || (r.id + ' ' + r.title + ' ' + (r.objective || '')).toLowerCase().includes(q)) && (st === 'all' || (r.status || 'Draft') === st));
    const by = k => S.ws.requirements.filter(r => (r.status || 'Draft') === k).length;
    return `<div class="grid g4" style="margin-bottom:14px">${['Confirmed', 'Draft', 'Deferred', 'Rejected'].map(k => `<div class="card stat click" data-act="rqStatus" data-v="${k}"><div class="v">${by(k)}</div><div class="l">${esc(k)}${k === 'Confirmed' ? ' — included in the BRD' : ''}</div></div>`).join('')}</div>
      <div class="row" style="margin-bottom:12px"><div class="search" style="width:280px">${ico('search')}<input type="search" placeholder="Filter requirements" data-ui="rq" value="${esc(S.ui.rq || '')}"></div><div class="seg">${['all', 'Confirmed', 'Draft', 'Deferred', 'Rejected'].map(v => `<button class="${st === v ? 'on' : ''}" data-act="rqStatus" data-v="${v}">${v === 'all' ? 'All' : v}</button>`).join('')}</div></div>${V.reqTable(rs)}`;
  };
  ACT.rqStatus = a => { S.ui.rqs = a.getAttribute('data-v'); S.ui.trTab = 'register'; V.render(); };
  V.reqs = { html() { S.ui.trTab = 'register'; return V.transcripts.html(); } };
  V.newReqFor = pre => reqDrawer(Object.assign({ id: '', title: '', modules: [], fields: [], actors: [], transitions: [], classification: 'existing', status: 'Draft' }, pre || {}));
  ACT.newReq = a => V.newReqFor({ modules: a && a.getAttribute && a.getAttribute('data-module') ? [a.getAttribute('data-module')] : [] });
  ACT.editReq = a => reqDrawer(S.ws.requirements.find(r => r.id === a.getAttribute('data-id')));
  let pending = null;
  function reqDrawer(r) {
    pending = r; const ro = S.readonly;
    const mods = F.allModules().filter(m => m.inScope || m.inUse || (r.modules || []).indexOf(m.name) >= 0).sort((a, b) => a.label.localeCompare(b.label));
    const fieldOpts = []; (r.modules || []).forEach(m => F.effFields(m).forEach(f => fieldOpts.push({ v: m + '.' + f.name, l: ((F.moduleView(m) || {}).label || m) + ' › ' + f.label })));
    const tOpts = []; (r.modules || []).forEach(m => F.flowsForModule(m).forEach(fl => { const f = F.flowModel(fl.id); f.transitions.filter(t => !t.removed).forEach(t => tOpts.push({ v: f.id + '|' + t.id, l: f.name + ' › ' + t.name })); }));
    const multi = (id, opts, vals) => `<select id="${id}" multiple size="${Math.min(6, Math.max(3, opts.length))}" style="height:auto">${opts.map(o => `<option value="${esc(o.v)}" ${(vals || []).indexOf(o.v) >= 0 ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>`;
    const t = (id, l, v, rows, ph) => `<div class="full"><label class="f">${l}</label><textarea id="rq_${id}" rows="${rows || 2}" placeholder="${esc(ph || '')}">${esc(v || '')}</textarea></div>`;
    const body = `${r.source ? `<div class="notice small" style="margin-bottom:12px">From transcript${r.source.speaker ? ' — ' + esc(r.source.speaker) : ''}${r.source.line ? ', line ' + r.source.line : ''} · ${esc(sessLabel(r.source.session))}</div>` : ''}<div class="fgrid"><div class="full"><label class="f">Requirement title <span class="req">*</span></label><input type="text" id="rq_title" value="${esc(r.title)}"></div>
      <div><label class="f">Classification</label>${sel('', Object.entries(F.REQ_CLASS).map(([v, l]) => ({ v, l })), r.classification, 'id="rq_class"')}</div><div><label class="f">Status</label>${sel('', ['Draft', 'Confirmed', 'Deferred', 'Rejected'], r.status, 'id="rq_status"')}</div>
      ${r.source && r.source.agreedInSession ? '<div class="full xs muted" style="grid-column:1/-1">The speaker said this was agreed in the session. Confirm it with the customer and record who confirmed it before setting the status to Confirmed.</div>' : ''}
      <div><label class="f">Confirmed by</label><input type="text" id="rq_confBy" value="${esc(r.confirmedBy || '')}" placeholder="Customer stakeholder"></div><div><label class="f">Confirmed on</label><input type="date" id="rq_confAt" value="${esc(r.confirmedAt || '')}"></div>
      ${t('objective', 'Business objective / statement', r.objective, 3)}${t('problem', 'Business problem', r.problem)}${t('current', 'Current process', r.current)}${t('future', 'Desired future process', r.future)}${t('outcome', 'Expected outcome', r.outcome)}
      ${t('users', 'Participating users and departments', r.users, 1)}${t('rules', 'Required information and business rules', r.rules)}${t('approvals', 'Approval and notification requirements', r.approvals)}${t('exceptions', 'Exceptions and alternate scenarios', r.exceptions)}${t('reporting', 'Reporting requirements', r.reporting, 1)}${t('integrations', 'Integrations and dependencies', r.integrations, 1)}${t('assumptions', 'Assumptions and exclusions', r.assumptions, 1)}
      ${t('acceptance', 'Acceptance criteria', r.acceptance, 3, 'Given … when … then …')}${t('openQuestions', 'Open questions', r.openQuestions, 2)}
      <div class="full"><label class="f">Modules (Ctrl/Cmd-click for several)</label>${multi('rq_mods', mods.map(m => ({ v: m.name, l: m.label })), r.modules)}<div class="xs muted">Save, then reopen to pick fields and transitions of newly added modules.</div></div>
      <div class="full"><label class="f">Fields</label>${fieldOpts.length ? multi('rq_fields', fieldOpts, r.fields) : '<div class="xs muted">Select modules first</div>'}</div>
      <div class="full"><label class="f">Actors / roles</label><select id="rq_actors" multiple size="5" style="height:auto">${V.actorOptions(false).replace(/<option value="([^"]+)"/g, (m0, v) => `<option value="${v}" ${(r.actors || []).indexOf(v.replace(/&amp;/g, '&')) >= 0 ? 'selected' : ''}`)}</select></div>
      <div class="full"><label class="f">Stateflow transitions</label>${tOpts.length ? multi('rq_trans', tOpts, r.transitions) : '<div class="xs muted">No transitions for the selected modules</div>'}</div>
      <div class="full"><label class="f">Requirement session</label>${sel('', [{ v: '', l: '— none —' }].concat(sessions().map(s => ({ v: s.id, l: sessLabel(s.id) }))), r.sessionId || (r.source && r.source.session) || '', 'id="rq_sess"')}</div>
      <div class="full"><label class="f">BRD section</label>${sel('', [{ v: 'module', l: 'Module section (Functional Requirements)' }, { v: 'process', l: 'End-to-end process section' }, { v: 'general', l: 'General requirements' }], r.brdSection || 'module', 'id="rq_sec"')}</div></div>`;
    drawer(r.id ? 'Requirement ' + r.id : 'New requirement', body, ro ? '<button class="btn" data-act="closeDrawer">Close</button>' : `${r.id ? `<button class="btn danger" data-act="deleteReq" data-id="${esc(r.id)}">Delete</button>` : ''}<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="saveReq" data-id="${esc(r.id)}" data-proc="${esc(r.process || '')}">Save</button>`, { wide: true });
  }
  ACT.saveReq = a => {
    const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; }; const ms = id => { const el = document.getElementById(id); return el ? Array.from(el.selectedOptions).map(o => o.value) : []; };
    const title = g('rq_title'); if (!title) { toast('Title is required'); return; }
    const data = { title, classification: g('rq_class'), status: g('rq_status'), brdSection: g('rq_sec'), modules: ms('rq_mods'), confirmedBy: g('rq_confBy'), confirmedAt: g('rq_confAt'), sessionId: g('rq_sess') };
    if (data.status === 'Confirmed' && !data.confirmedBy.trim()) { toast('Enter who confirmed this requirement before setting it to Confirmed'); return; }
    if (data.status === 'Confirmed' && !data.confirmedAt) data.confirmedAt = new Date().toISOString().slice(0, 10);
    ['objective', 'problem', 'current', 'future', 'outcome', 'users', 'rules', 'approvals', 'exceptions', 'reporting', 'integrations', 'assumptions', 'acceptance', 'openQuestions'].forEach(k => data[k] = g('rq_' + k));
    if (document.getElementById('rq_fields')) data.fields = ms('rq_fields').filter(x => data.modules.indexOf(x.split('.')[0]) >= 0);
    data.actors = ms('rq_actors'); if (document.getElementById('rq_trans')) data.transitions = ms('rq_trans');
    const id = a.getAttribute('data-id'); const proc = a.getAttribute('data-proc'); if (proc) data.process = proc;
    if (id) { const r = S.ws.requirements.find(x => x.id === id); const was = r.status; Object.assign(r, data); (r.history = r.history || []).push({ at: new Date().toISOString(), by: S.user.name, change: was !== data.status ? 'Status ' + (was || 'Draft') + ' → ' + data.status : 'Edited' }); F.changed('Requirement updated', id + ' ' + title); }
    else { const nid = F.nextReqId(data.modules[0] ? F.modulePrefix(data.modules[0]) : 'GEN'); const p = pending || {}; const rec = Object.assign({ id: nid, created: new Date().toISOString(), fields: [], transitions: [], source: p.source || null, history: [{ at: new Date().toISOString(), by: S.user.name, change: 'Created' }] }, data); S.ws.requirements.push(rec);
      if (p.fromQuestion) { const qq = S.ws.questions.find(x => x.id === p.fromQuestion); if (qq) { qq.reqId = nid; (qq.log = qq.log || []).push({ at: new Date().toISOString(), by: S.user.name, what: 'Requirement ' + nid + ' created from this question' }); } }
      if (p.fromCandidate) { const c = cand(p.fromCandidate); if (c) { c.status = 'accepted'; c.reqId = nid; hist('Candidate accepted', nid + ' — ' + title, c.id); F.markDirty('transcripts'); } }
      F.changed('Requirement added', nid + ' ' + title); }
    closeDrawer();
  };
  ACT.deleteReq = async a => { const id = a.getAttribute('data-id'); if (!(await confirmDialog('Delete requirement', 'Delete ' + id + '? This cannot be undone.', 'Delete', true))) return; S.ws.requirements = S.ws.requirements.filter(r => r.id !== id); T().candidates.filter(c => c.reqId === id).forEach(c => { c.status = 'pending'; c.reqId = null; }); closeDrawer(); F.markDirty('transcripts'); F.changed('Requirement deleted', id); };

  // ---------- open questions ----------
  TT.questions = () => {
    const qs = S.ws.questions.slice().sort((a, b) => (a.status === 'closed') - (b.status === 'closed'));
    return `<div class="row" style="margin-bottom:12px">${S.readonly ? '' : `<button class="btn" data-act="newQuestion">${ico('plus')}Question</button>`}<span class="small muted">Customer questions sent from the user guide are managed in Customer User Guide › Questions &amp; feedback.</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Question</th><th>Area</th><th>Owner</th><th>Session</th><th>Status</th><th>Answer</th><th>Verification</th><th></th></tr></thead><tbody>${qs.map((q, i) => { const k = S.ws.questions.indexOf(q); return `<tr><td class="small">${esc(q.text)}</td><td class="small">${esc(q.area || '')}</td><td>${tag(q.owner === 'internal' ? 'violet' : 'blue', q.owner === 'internal' ? 'Internal' : 'Customer')}</td><td class="xs">${esc(sessLabel(q.sessionId))}</td><td>${V.sel('questions.' + k + '.status', [{ v: 'open', l: 'Open' }, { v: 'answered', l: 'Answered' }, { v: 'closed', l: 'Closed' }], q.status, `style="width:110px;height:28px" ${S.readonly ? 'disabled' : ''}`)}</td><td>${V.inp('questions.' + k + '.answer', 'Answer / decision')}</td><td class="small">${q.answer ? tag(q.ver && q.ver !== 'Unverified' ? 'green' : 'tbc', q.ver || 'Unverified') : '<span class="muted">—</span>'}${q.reqId ? '<div class="xs">' + esc(q.reqId) + '</div>' : ''}</td><td><button class="btn sm" data-act="qOpen" data-id="${esc(q.id)}">Details</button></td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">No open questions.</td></tr>'}</tbody></table></div>`;
  };
  ACT.newQuestion = () => drawer('New question', `<label class="f">Question</label><textarea id="nq_text" rows="3"></textarea><label class="f" style="margin-top:8px">Area / module</label><input type="text" id="nq_area"><label class="f" style="margin-top:8px">Owner</label>${sel('', [{ v: 'customer', l: 'Customer' }, { v: 'internal', l: 'Facilio internal' }], 'customer', 'id="nq_owner"')}`, `<button class="btn" data-act="closeDrawer">Cancel</button><button class="btn primary" data-act="saveQuestion">Add</button>`);
  ACT.saveQuestion = () => { const t = document.getElementById('nq_text').value.trim(); if (!t) { toast('Enter the question'); return; } S.ws.questions.push({ id: F.uid('q'), text: t, area: document.getElementById('nq_area').value.trim(), owner: document.getElementById('nq_owner').value, status: 'open', created: new Date().toISOString() }); closeDrawer(); F.changed('Open question added', t); };

  // ---------- history ----------
  TT.history = () => { const h = T().history; return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Detail</th></tr></thead><tbody>${h.slice(0, 400).map(x => `<tr><td class="xs">${esc(new Date(x.at).toLocaleString())}</td><td class="small">${esc(x.by || '')}</td><td class="small"><b>${esc(x.action)}</b></td><td class="xs">${esc(x.detail || '')}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No review history yet.</td></tr>'}</tbody></table></div>`; };
})(typeof window !== 'undefined' ? window : globalThis);
