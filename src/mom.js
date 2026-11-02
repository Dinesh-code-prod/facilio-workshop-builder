/* Minutes of meeting (MOM) from a call transcript. Transcripts page > Create MOM.
   Three ways to the same minutes, all checked the same way on the server (POST /ai/mom): DeepSeek (the transcript is read in parts of about 9,000 characters, one call each, then merged),
   Open in Claude (the person's own Claude, with the connector or by copy and paste), and the connector tools (get_transcripts, get_mom_pack, save_minutes).
   The result is a preview; "Use these minutes" opens the existing Meeting minutes form filled in, and nothing is saved until the person saves it there. */
(function (root) {
  'use strict';
  const F = root.FWB; const { S, esc } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi; const { drawer, closeDrawer, toast } = V;
  const PART = 9000, MAXP = 14; const url = () => `/api/projects/${S.project.id}/ai/mom`;
  let cur = null, stop = false; const cache = {};
  const SHAPE = { title: 'string', summary: 'string', attendees: [{ name: 'string', side: 'customer|facilio|unknown' }], agenda: ['string'], discussion: [{ topic: 'string', points: ['string'] }], decisions: ['string'], actions: [{ text: 'string', owner: 'string', due: 'YYYY-MM-DD', side: 'customer|facilio|unknown' }], risks: [{ text: 'string', issue: false }], questions: ['string'], nextSteps: ['string'] };

  async function textOf(item) {
    if (cache[item.id]) return cache[item.id];
    try { const r = await API.get(`/api/projects/${S.project.id}/items?kinds=trtext`); const row = (r.items || []).find(x => x.id === item.id); if (row && row.data && row.data.text) return (cache[item.id] = row.data.text); } catch (e) { /* not stored yet */ }
    const d = await API.downloadFile(S.project.id, item.fileId); const t = await V.trExtractText(new File([d.blob], item.name)); V.trSaveText(item.id, t); return (cache[item.id] = t);
  }
  const speakers = t => { const n = {}; String(t).split('\n').forEach(l => { const m = l.match(/^([A-Z][A-Za-z.'-]+(?: [A-Z][A-Za-z.'-]+){0,3}):/); if (m) n[m[1]] = (n[m[1]] || 0) + 1; }); return Object.keys(n).filter(k => n[k] >= 2).sort((a, b) => n[b] - n[a]).slice(0, 10); };
  function split(text) { const out = []; let c = ''; String(text).split('\n').forEach(l => { if (c && (c + '\n' + l).length > PART) { out.push(c); c = l; } else c = c ? c + '\n' + l : l; while (c.length > PART) { out.push(c.slice(0, PART)); c = c.slice(PART); } }); if (c.trim()) out.push(c); return out; }
  const uniq = (a, key) => { const seen = new Set(); return a.filter(x => { const k = key(x).toLowerCase().replace(/\s+/g, ' ').trim(); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
  function merge(ms) {
    const all = k => [].concat(...ms.map(m => m[k] || []));
    const att = uniq(all('attendees').sort((a, b) => (a.side === 'unknown') - (b.side === 'unknown')), x => x.name);
    const disc = {}; all('discussion').forEach(d => { const k = d.topic.toLowerCase(); (disc[k] = disc[k] || { topic: d.topic, points: [] }).points.push(...d.points); });
    return { title: (ms.find(m => m.title) || {}).title || '', summary: [ms[0] && ms[0].summary, ms.length > 1 && ms[ms.length - 1].summary].filter(Boolean).join(' '), attendees: att, agenda: uniq(all('agenda'), x => x), discussion: Object.values(disc).map(d => ({ topic: d.topic, points: uniq(d.points, x => x).slice(0, 12) })).slice(0, 25), decisions: uniq(all('decisions'), x => x), actions: uniq(all('actions'), x => x.text), risks: uniq(all('risks'), x => x.text), questions: uniq(all('questions'), x => x), nextSteps: uniq(all('nextSteps'), x => x) };
  }
  const li = a => a.length ? `<ul style="margin:4px 0 10px;padding-left:18px">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<div class="xs muted" style="margin-bottom:10px">None found</div>';
  const sec = (h, body) => `<div class="pink-label" style="margin:12px 0 2px">${h}</div>${body}`;
  const preview = (m, note) => `${note ? `<div class="notice warn small" style="margin:8px 0">${esc(note)}</div>` : ''}<div class="card" style="margin-top:10px"><div class="card-b small">${m.summary ? `<p style="margin-top:0">${esc(m.summary)}</p>` : ''}${sec('Attendees', li(m.attendees.map(a => a.name + (a.side !== 'unknown' ? ' (' + a.side + ')' : ''))))}${sec('Agenda', li(m.agenda))}${sec('Discussion', m.discussion.map(d => `<b>${esc(d.topic)}</b>${li(d.points)}`).join('') || '<div class="xs muted">None found</div>')}${sec('Decisions', li(m.decisions))}${sec('Actions', li(m.actions.map(a => (a.owner ? a.owner + ': ' : 'Owner not named: ') + a.text + (a.due ? ' (by ' + a.due + ')' : ''))))}${sec('Risks and issues', li(m.risks.map(r => (r.issue ? 'Issue: ' : 'Risk: ') + r.text)))}${sec('Open questions', li(m.questions))}${sec('Next steps', li(m.nextSteps))}</div></div><div class="xs muted" style="margin-top:6px">Check it against the recording. "Use these minutes" opens the Meeting minutes form, where you can edit everything before saving.</div>`;
  const out = () => document.getElementById('momOut');
  const field = id => (document.getElementById(id) || {}).value || '';

  ACT.trMom = async a => {
    const item = (F.doc('transcripts').items || []).find(x => x.id === a.getAttribute('data-id')); if (!item) return; V.loading(true, 'Preparing the transcript…'); let text = '';
    try { text = await textOf(item); } catch (e) { toast('The transcript could not be read: ' + (e.message || e), 6000, true); return; } finally { V.loading(false); }
    if (String(text).trim().length < 50) { toast('This transcript has no readable text', 5000, true); return; }
    const sp = speakers(text); const date = (item.uploadedAt || '').slice(0, 10); cur = { item, text, mom: null }; stop = false;
    const n = Math.min(MAXP, split(text).length);
    drawer('Create minutes of meeting', `<p class="small muted" style="margin-top:0">Turns the transcript <b>${esc(item.name)}</b> into minutes: attendees, agenda, discussion, decisions, actions with owners and dates, risks, questions and next steps. It uses only what was said. Audio files have to be turned into a transcript first (Teams and Zoom both save one).</p>
      <div class="fgrid"><div class="full"><label class="f" for="mm0_title">Meeting</label><input id="mm0_title" maxlength="160" value="${esc(String(item.name).replace(/\.[a-z0-9]+$/i, ''))}"></div><div><label class="f" for="mm0_date">Date of the meeting</label><input type="date" id="mm0_date" value="${esc(date)}"></div><div><label class="f" for="mm0_att">Attendees (optional)</label><input id="mm0_att" maxlength="300" value="${esc(sp.join(', '))}" placeholder="Names, if the transcript has no speaker names"></div></div>
      <div class="xs muted" style="margin:8px 0">${text.length.toLocaleString()} characters · DeepSeek reads it in ${n} part${n > 1 ? 's' : ''}${split(text).length > MAXP ? ' (the first ' + MAXP + ' parts; use Open in Claude for the whole of a very long call)' : ''}, about ${Math.max(1, Math.round(n * 0.3))} to ${Math.max(2, Math.round(n * 0.6))} minutes.</div><div id="momOut"></div>`,
      `<button class="btn" data-act="momCancel">Cancel</button><button class="btn" data-act="momClaude" title="Your own Claude writes the minutes">Open in Claude</button><button class="btn" data-act="momClaude" data-add="1" title="Bring back the minutes Claude wrote">Add from Claude</button><button class="btn primary" data-act="momRun">Create with AI</button>`, { wide: true });
  };
  ACT.momCancel = () => { stop = true; closeDrawer(); };
  ACT.momRun = a => V.busy(a, async () => {
    if (!cur) return; const meta = { title: field('mm0_title'), date: field('mm0_date'), attendees: field('mm0_att') }; const ps = split(cur.text).slice(0, MAXP); const got = []; stop = false; let err = '';
    for (let i = 0; i < ps.length && !stop; i++) {
      out().innerHTML = `<div class="notice small"><span>Reading part ${i + 1} of ${ps.length}${got.length ? ' (' + got.reduce((n, m) => n + m.decisions.length + m.actions.length, 0) + ' decisions and actions so far)' : ''}. You can keep working; leave this panel open.</span></div>`;
      try { const r = await API.post(url(), Object.assign({ text: ps[i], part: i + 1, of: ps.length }, meta)); got.push(r.mom); }
      catch (e) { if (e.status === 429) { out().innerHTML = '<div class="notice small"><span>The AI is busy; waiting a little before part ' + (i + 1) + '…</span></div>'; await new Promise(r => setTimeout(r, Math.min(25000, ((e.data && e.data.retryAfter) || 20) * 1000))); i--; continue; } if (e.status === 422 && ps.length > 1) { continue; } err = 'Part ' + (i + 1) + ' of ' + ps.length + ' could not be read: ' + (e.message || e); break; }
    }
    if (!got.length) { out().innerHTML = `<div class="notice err">${esc(err || 'No minutes were found. Check that this is a meeting transcript, or use Open in Claude.')}</div>`; return; }
    cur.mom = merge(got); cur.meta = meta; out().innerHTML = preview(cur.mom, err ? err + ' Showing what was read before that.' : (ps.length < split(cur.text).length ? 'The transcript is longer than ' + MAXP + ' parts; the rest was not read. Use Open in Claude for the whole call.' : '')) + '<div style="margin-top:10px"><button class="btn primary" data-act="momUse">Use these minutes</button></div>';
  });
  ACT.momClaude = a => { if (!cur) return; const add = a.getAttribute('data-add') === '1'; const meta = { title: field('mm0_title'), date: field('mm0_date'), attendees: field('mm0_att') };
    V.claudeHandoff({ skipPack: add, task: 'mom', module: 'Transcripts', title: 'Minutes of meeting', url: url(), body: Object.assign({ text: cur.text }, meta), expect: { format: 'json', note: 'The minutes of meeting as JSON', schema: SHAPE }, extra: 'Claude reads the transcript and writes the minutes. The answer is checked and shown as a preview; nothing is saved until you press Use these minutes and save the form.', into: 'momOut',
      onReply: r => { cur.mom = r.mom; cur.meta = meta; out().innerHTML = preview(r.mom) + '<div style="margin-top:10px"><button class="btn primary" data-act="momUse">Use these minutes</button></div>'; } }); };
  // the minutes become a draft of the existing Meeting minutes form: summary, notes and the lines the form turns into decisions, actions and risks
  ACT.momUse = async () => {
    if (!cur || !cur.mom) return; const m = cur.mom, meta = cur.meta || {};
    const notes = [m.attendees.length ? 'Attendees: ' + m.attendees.map(x => x.name + (x.side !== 'unknown' ? ' (' + x.side + ')' : '')).join(', ') : '', m.agenda.length ? '\nAgenda\n' + m.agenda.map(x => '- ' + x).join('\n') : '', ...m.discussion.map(d => '\n' + d.topic + '\n' + d.points.map(x => '- ' + x).join('\n')), m.questions.length ? '\nOpen questions\n' + m.questions.map(x => '- ' + x).join('\n') : '', m.nextSteps.length ? '\nNext steps\n' + m.nextSteps.map(x => '- ' + x).join('\n') : ''].filter(Boolean).join('\n').trim();
    V.mmDraft = { base: { title: meta.title || m.title || cur.item.name, date: meta.date || '', summary: m.summary, notes, link: '' }, dec: m.decisions.join('\n'), act: m.actions.map(x => (x.side === 'customer' ? 'C: ' : 'F: ') + (x.owner ? x.owner + ' — ' : '') + x.text + (x.due ? ' ' + x.due : '')).join('\n'), risk: m.risks.map(r => (r.issue ? 'I: ' : '') + r.text).join('\n') };
    try { if (V.items) await V.items.load(['minutes', 'decision', 'action', 'raid']); } catch (e) { /* the form still opens */ }
    if (ACT.mmEdit) ACT.mmEdit({ getAttribute: () => null }); else toast('Open Governance & RAID to save the minutes', 5000, true);
  };
  V.mom = { split, merge };
})(typeof window !== 'undefined' ? window : globalThis);
