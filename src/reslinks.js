/* Notes & Links helpers (9 Nov 2026): turn the web addresses in a note into clickable links, guess what kind of resource a pasted address is, and apply the private-note rule.
   Pure code: no DOM, no network. Run by tests/reslinks.mjs; used by src/resources.js. */
(function (root) {
  'use strict';
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ESC[c]);
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  // [pattern on the host, type]; first match wins
  const GUESS = [[/(^|\.)miro\.com$/, 'Miro board'], [/(^|\.)figma\.com$/, 'Figma'], [/smartsheet\.com$/, 'SmartSheet'], [/(sharepoint|onedrive|1drv)\./, 'SharePoint / OneDrive'],
    [/(^|\.)(teams\.microsoft\.com|teams\.live\.com|zoom\.us|meet\.google\.com|webex\.com|whereby\.com)$/, 'Meeting link'], [/(^|\.)(loom\.com|vimeo\.com|youtube\.com|youtu\.be|stream\.microsoft\.com)$/, 'Call recording'],
    [/^(docs|drive|sheets|slides)\.google\.com$|(^|\.)(notion\.so|atlassian\.net|dropbox\.com)$/, 'Document']];
  const pathOf = u => { try { return new URL(u).pathname.toLowerCase(); } catch (e) { return ''; } };
  const guessType = url => { const p = pathOf(url); if (/\.(mp4|m4a|mp3|wav|webm)$/.test(p)) return 'Call recording'; if (/\.(pdf|docx?|xlsx?|pptx?)$/.test(p)) return 'Document'; const g = GUESS.find(x => x[0].test(host(url))); return g ? g[1] : 'Other'; };
  // a readable default name for a pasted address: the file name, else the last path word, else the host
  const guessName = url => { try { const u = new URL(url); const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[-_+]+/g, ' ').trim(); return last.length > 2 && !/^[0-9a-f ]{16,}$/i.test(last) ? last.slice(0, 80) : host(url); } catch (e) { return ''; } };
  // plain note text -> safe HTML with every http(s) address a link that opens in a new tab; line breaks are kept by the caller's CSS (white-space: pre-wrap)
  const URL_RE = /https?:\/\/(?:(?!&lt;|&gt;|&quot;|&#39;)[^\s])+/g;
  function linkify(text) {
    return esc(text).replace(URL_RE, m => {
      let u = m, tail = ''; while (/[.,;:!?\]]$/.test(u) || (u.endsWith(')') && !u.includes('('))) { tail = u.slice(-1) + tail; u = u.slice(0, -1); }
      const raw = u.replace(/&amp;/g, '&'); const rest = raw.replace(/^https?:\/\/[^/]+/, '').replace(/^\/$/, '');
      const shown = host(raw) ? host(raw) + (rest ? (rest.length > 24 ? rest.slice(0, 22) + '…' : rest) : '') : raw;
      return '<a class="rs-a" href="' + u + '" target="_blank" rel="noopener noreferrer" title="' + u + '">' + esc(shown) + '</a>' + tail;
    });
  }
  // a short preview that never cuts an address in half
  const preview = (text, n) => { const t = String(text || '').replace(/[ \t]+/g, ' ').trim(); if (t.length <= n) return t; let c = t.slice(0, n); const last = c.split(/\s/).pop(); if (/^https?:/i.test(last)) c = c.slice(0, c.length - last.length); return c.trim() + '…'; };
  // private notes: shown only to the person who wrote them (the server enforces the same rule)
  const visibleTo = (note, email) => !note || note.private !== true || String(note.createdByEmail || '').toLowerCase() === String(email || '').toLowerCase();
  const api = { esc, host, guessType, guessName, linkify, preview, visibleTo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; root.FWBResLinks = api;
})(typeof window !== 'undefined' ? window : globalThis);
