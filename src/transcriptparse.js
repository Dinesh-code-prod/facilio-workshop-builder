/* Transcript parser (roadmap E2 workspace 3): pure code for the browser and for Node (no DOM, no network, no model). Turns the text of a transcript into
   [{ speaker, at, text }] where `at` is seconds (a number), an ISO date string, or ''. Formats: WebVTT, SRT, "Speaker: text" lines, Teams-style "Name  0:01:23 text" blocks,
   JSON (a list of entries, or an object holding text), and plain text (one chunk per paragraph). The format is found from the text itself (the hint, a file name or a format
   name, only breaks a tie). Consecutive lines of one speaker are merged. Hostile input is expected: the text is cut at 2 MB, a line at 5,000 characters, a chunk at 4,000 characters
   and the list at 20,000 chunks (parseTranscriptInfo says when something was cut); no pattern here can run away because every name or time part has a fixed length limit.
   A spoken statement is only ever data: nothing here makes a requirement of it. */
(function (root) {
  'use strict';
  const MAX_CHARS = 2000000, MAX_CHUNKS = 20000, MAX_LINE = 5000, MAX_TEXT = 4000;
  const TIME = '(?:\\d{1,2}:)?\\d{1,2}:\\d{2}(?:[.,]\\d{1,3})?';
  const RX_CUE = new RegExp('^\\s*(' + TIME + ')\\s*-->\\s*' + TIME);
  const RX_SPEAKER = /^(?:\[([^\]\n]{1,40})\]\s*)?([\p{L}\p{N}][\p{L}\p{N} .'&_-]{0,59}?)\s*(?:[(\[]([^)\]\n]{1,40})[)\]])?\s*[:：](?:\s+(\S.*))?$/u;
  const RX_TEAMS = new RegExp('^([\\p{L}][\\p{L}\\p{N} .\'&_()-]{0,59}?)(?:\\s{2,}|\\t+)(' + TIME + ')(?:\\s+(\\S.*))?$|^([\\p{L}][\\p{L}\\p{N} .\'&_()-]{0,59}?)\\s+(' + TIME + ')$', 'u');
  const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

  /** a time as seconds (a number), an ISO date as it is, anything else ''. */
  function parseAt(v) {
    if (typeof v === 'number') return isFinite(v) && v >= 0 ? Math.round(v * 1000) / 1000 : '';
    const s = typeof v === 'string' ? v.trim() : ''; if (!s || s.length > 40) return '';
    if (/^\d{4}-\d\d-\d\d[T ][\d:.]+(?:Z|[+-]\d\d:?\d\d)?$/.test(s)) return isNaN(Date.parse(s)) ? '' : s;
    const m = s.match(new RegExp('^(?:(\\d{1,2}):)?(\\d{1,2}):(\\d{2})(?:[.,](\\d{1,3}))?$')); if (!m) return '';
    return Math.round(((+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + (m[4] ? +('0.' + m[4]) : 0)) * 1000) / 1000;
  }
  /** seconds as h:mm:ss for people; an ISO string or '' comes back as it is */
  function fmtAt(at) { if (typeof at !== 'number') return typeof at === 'string' ? at : ''; const t = Math.floor(at); const p = n => String(n).padStart(2, '0'); return Math.floor(t / 3600) + ':' + p(Math.floor(t % 3600 / 60)) + ':' + p(t % 60); }

  const norm = s => String(s == null ? '' : s).replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, m => ENT[m]).replace(/\s+/g, ' ').trim();
  const words = s => s.split(' ').length;
  const asSpeaker = s => { s = norm(s); return s && s.length <= 60 && words(s) <= 6 ? s : ''; };

  /** collects chunks: merges consecutive lines of one speaker, cuts long chunks, stops at the limit */
  function builder() {
    const out = []; let over = false;
    const push = (speaker, at, text) => { if (out.length >= MAX_CHUNKS) { over = true; return; } out.push({ speaker, at, text }); };
    return { out, over: () => over, add(speaker, at, text) {
      text = norm(text); if (!text) return; const last = out[out.length - 1];
      if (last && speaker && last.speaker === speaker && last.text.length + 1 + text.length <= MAX_TEXT) { last.text += ' ' + text; return; }
      while (text.length > MAX_TEXT) { push(speaker, at, text.slice(0, MAX_TEXT)); text = text.slice(MAX_TEXT).trim(); at = ''; }   // shortcut: a cut can fall inside a word; fine for text that long
      if (text) push(speaker, at, text);
    } };
  }

  function matchSpeaker(line) {
    const m = RX_SPEAKER.exec(line); if (!m) return null; const sp = asSpeaker(m[2]); if (!sp) return null;
    let at = parseAt(m[1]); let speaker = sp;
    if (m[3] != null) { const t = parseAt(m[3]); if (t !== '') at = t; else speaker = asSpeaker(sp + ' (' + m[3] + ')') || sp; }
    return { speaker, at, text: m[4] || '' };
  }
  function matchTeams(line) {
    const m = RX_TEAMS.exec(line); if (!m) return null; const sp = asSpeaker(m[1] || m[4]); if (!sp) return null;
    return { speaker: sp, at: parseAt(m[2] || m[5]), text: m[3] || '' };
  }

  // ---------- one reader per format; each gets the lines and a builder ----------
  function readCues(lines, b) {
    for (let i = 0; i < lines.length; i++) {
      const m = RX_CUE.exec(lines[i]); if (!m) continue; const at = parseAt(m[1]); const body = [];
      while (i + 1 < lines.length && lines[i + 1].trim() !== '' && !RX_CUE.test(lines[i + 1])) body.push(lines[++i]);
      let text = body.join(' '); let speaker = '';
      const v = /^\s*<v(?:\.[^\s>]*)?\s+([^>]{1,80})>/.exec(text); if (v) { speaker = asSpeaker(v[1]); text = text.slice(v[0].length); }
      text = text.replace(/<[^>\n]{0,100}>/g, ''); if (!speaker) { const s = matchSpeaker(norm(text)); if (s && s.text) { speaker = s.speaker; text = s.text; } }
      b.add(speaker, at, text);
    }
  }
  function readBlocks(lines, b, match) {   // Teams and "Speaker: text": a header line starts a chunk, other lines continue it
    let cur = null; let gap = false; const flush = () => { if (cur) { b.add(cur.speaker, cur.at, cur.text); cur = null; } };
    lines.forEach(l => { const line = l.trim(); if (!line) { gap = true; return; } const h = match(line);
      if (h) { flush(); cur = h; } else if (cur && (!gap || match === matchTeams)) cur.text += ' ' + line; else { flush(); cur = { speaker: '', at: '', text: line }; } gap = false; });
    flush();
  }
  function readPlain(lines, b) { let para = []; const flush = () => { if (para.length) { b.add('', '', para.join(' ')); para = []; } }; lines.forEach(l => { if (l.trim()) para.push(l.trim()); else flush(); }); flush(); }
  function readJson(text, b, depth) {
    let j; try { j = JSON.parse(text); } catch (e) { return false; }
    const list = Array.isArray(j) ? j : j && typeof j === 'object' ? (['entries', 'transcript', 'results', 'segments', 'recognizedPhrases', 'utterances'].map(k => j[k]).find(Array.isArray)) : null;
    if (list) { list.slice(0, MAX_CHUNKS).forEach(e => { if (typeof e === 'string') { b.add('', '', e); return; } if (!e || typeof e !== 'object') return;
      const sp = e.speaker || e.speakerName || e.speaker_name || (e.participant && e.participant.name) || ''; const tx = e.text || e.content || e.display || e.transcript || e.words || '';
      b.add(typeof sp === 'string' ? asSpeaker(sp) : '', parseAt(e.start != null ? e.start : e.startTime != null ? e.startTime : e.offset != null ? e.offset : e.timestamp != null ? e.timestamp : e.at), typeof tx === 'string' ? tx : ''); }); return true; }
    const inner = j && typeof j === 'object' && ['text', 'content', 'transcript'].map(k => j[k]).find(x => typeof x === 'string');
    if (inner && (depth || 0) < 1) { const r = parseTranscriptInfo(inner, ''); r.chunks.forEach(c => b.add(c.speaker, c.at, c.text)); return true; }
    return false;
  }

  /** { chunks, format, truncated: { size, count } } for the text of a transcript. hint: a file name or a format name (vtt, srt, json, speaker, teams, plain). */
  function parseTranscriptInfo(text, hint, depth) {
    let s = typeof text === 'string' ? text : ''; const tooBig = s.length > MAX_CHARS; if (tooBig) s = s.slice(0, MAX_CHARS);
    s = s.replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    const lines = s.split('\n').map(l => (l.length > MAX_LINE ? l.slice(0, MAX_LINE) : l)); const used = lines.filter(l => l.trim());
    const b = builder(); const h = String(hint || '').toLowerCase(); let format = '';
    const first = (used[0] || '').trim();
    if ((/\.json$|^json$/.test(h) || /^[{[]/.test(first)) && readJson(s, b, depth)) format = 'json';
    if (!format) {
      const cues = lines.filter(l => l.indexOf('-->') >= 0 && RX_CUE.test(l)).length;
      if (cues || /^WEBVTT/.test(first)) { readCues(lines, b); format = /^WEBVTT/.test(first) || /\.vtt$|^vtt$/.test(h) ? 'vtt' : 'srt'; }
    }
    if (!format) {
      const n = used.length; const teams = used.filter(l => matchTeams(l.trim())).length; const spk = used.filter(l => matchSpeaker(l.trim())).length;
      const strong = k => k >= 2 && k * 10 >= n * 3 || (k >= 1 && k === n);
      const wantTeams = /^teams$/.test(h), wantSpk = /^speaker$/.test(h);
      if ((strong(teams) && !(strong(spk) && spk > teams) && !wantSpk) || (wantTeams && teams)) { readBlocks(lines, b, matchTeams); format = 'teams'; }
      else if (strong(spk) || (wantSpk && spk)) { readBlocks(lines, b, matchSpeaker); format = 'speaker'; }
      else { readPlain(lines, b); format = 'plain'; }
    }
    return { chunks: b.out, format, truncated: { size: tooBig, count: b.over() } };
  }
  const parseTranscript = (text, hint) => parseTranscriptInfo(text, hint).chunks;

  /** the chunks as "Speaker: text" lines, the form the transcript analysis in src/transcripts.js reads */
  const toText = chunks => (Array.isArray(chunks) ? chunks : []).map(c => (c && c.speaker ? c.speaker + ': ' : '') + (c && c.text || '')).join('\n');

  const api = { parseTranscript, parseTranscriptInfo, parseAt, fmtAt, toText, MAX_CHARS, MAX_CHUNKS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBTranscriptParse = api;
})(typeof window !== 'undefined' ? window : globalThis);
