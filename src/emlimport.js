/* Add an email without any mailbox access: pick one or more .eml files (Outlook on the web and the new Outlook save a message this way: open it, then
   More actions > Download, or drag it to the desktop) and each becomes a ticket, or joins the ticket it replies to. Everything is read in the browser, so no
   Microsoft permission, credential or cost is involved. Outlook's older .msg format is not supported; save it as .eml or paste the text into a ticket. */
(function (root) {
  'use strict';
  // ---- a small RFC 822 reader: headers (unfolded), the first text/plain part, quoted-printable and base64 bodies ----
  const decodeWord = s => String(s || '').replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (m, cs, enc, t) => { try { const bytes = enc.toLowerCase() === 'b' ? Uint8Array.from(atob(t), c => c.charCodeAt(0)) : Uint8Array.from(t.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (x, h) => String.fromCharCode(parseInt(h, 16))), c => c.charCodeAt(0)); return new TextDecoder(cs).decode(bytes); } catch (e) { return t; } });
  function split(raw) { const i = raw.search(/\r?\n\r?\n/); const head = i < 0 ? raw : raw.slice(0, i); const body = i < 0 ? '' : raw.slice(i).replace(/^\r?\n\r?\n/, ''); const h = {}; head.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach(l => { const k = l.indexOf(':'); if (k > 0) { const n = l.slice(0, k).trim().toLowerCase(); if (!(n in h)) h[n] = l.slice(k + 1).trim(); } }); return { h, body }; }
  function decodeBody(body, h) { const enc = String(h['content-transfer-encoding'] || '').toLowerCase(); const cs = (/charset="?([\w-]+)/i.exec(h['content-type'] || '') || [])[1] || 'utf-8'; let bytes;
    try { if (enc === 'base64') bytes = Uint8Array.from(atob(body.replace(/\s+/g, '')), c => c.charCodeAt(0)); else if (enc === 'quoted-printable') bytes = Uint8Array.from(body.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (x, g) => String.fromCharCode(parseInt(g, 16))), c => c.charCodeAt(0) & 255); else return body; return new TextDecoder(cs).decode(bytes); } catch (e) { return body; } }
  const stripHtml = s => String(s).replace(/<(style|script)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim();
  function textOf(raw) { const { h, body } = split(raw); const ct = String(h['content-type'] || 'text/plain').toLowerCase(); const bm = /boundary="?([^";\s]+)"?/i.exec(h['content-type'] || '');
    if (ct.startsWith('multipart/') && bm) { const parts = body.split('--' + bm[1]).slice(1).filter(p => !/^--/.test(p.trim())).map(p => p.replace(/^\r?\n/, '')); let plain = '', html = ''; const names = [];
      parts.forEach(p => { const x = split(p); const t = String(x.h['content-type'] || 'text/plain').toLowerCase(); const disp = String(x.h['content-disposition'] || ''); const fn = /filename\*?="?([^";]+)/i.exec(disp) || /name="?([^";]+)/i.exec(x.h['content-type'] || ''); if (fn && /attachment|inline/i.test(disp + 'attachment')) { if (!/^text\/(plain|html)/.test(t) || /attachment/i.test(disp)) { names.push(decodeWord(fn[1])); return; } }
        if (t.startsWith('multipart/')) { const r = textOf(p); if (!plain) plain = r.text; names.push(...r.attachments); } else if (t.startsWith('text/plain') && !plain) plain = decodeBody(x.body, x.h); else if (t.startsWith('text/html') && !html) html = decodeBody(x.body, x.h); });
      return { text: (plain || stripHtml(html)).trim(), attachments: names }; }
    const d = decodeBody(body, h); return { text: (ct.startsWith('text/html') ? stripHtml(d) : d).trim(), attachments: [] }; }
  function parseEml(raw) { raw = String(raw || ''); const { h } = split(raw); const from = decodeWord(h.from || ''); const m = /<([^>]+)>/.exec(from) || /([^\s<>"]+@[^\s<>"]+)/.exec(from); const email = m ? m[1].trim() : ''; const name = from.replace(/<[^>]*>/, '').replace(/^["'\s]+|["'\s]+$/g, '') || email;
    const t = textOf(raw); let when = ''; try { const d = new Date(h.date); if (!isNaN(d)) when = d.toISOString(); } catch (e) { }
    const id = (h['message-id'] || '').replace(/^<|>$/g, '').trim(); return { messageId: id || 'eml-' + Math.abs(hash(raw)), conversationId: (h['thread-index'] || h['references'] || '').split(/\s+/)[0] || id || undefined, from: { name, email }, subject: decodeWord(h.subject || '(no subject)'), body: t.text, receivedAt: when || undefined, attachments: t.attachments.map(n => ({ name: n })) }; }
  function hash(s) { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return x; }
  const lib = { parseEml };
  if (typeof module !== 'undefined' && module.exports) { module.exports = lib; return; }

  const F = root.FWB; const { S } = F; const V = root.FWBViews; const ACT = V.ACT; const API = root.FWBApi;
  ACT.ibImport = () => { let i = document.getElementById('ibFile'); if (!i) { i = document.createElement('input'); i.type = 'file'; i.id = 'ibFile'; i.accept = '.eml,message/rfc822'; i.multiple = true; i.hidden = true; document.body.appendChild(i);
    i.addEventListener('change', async () => { const files = [...i.files]; i.value = ''; if (!files.length) return; let made = 0, joined = 0, dup = 0; const bad = [];
      for (const f of files) { if (/\.msg$/i.test(f.name)) { bad.push(f.name + ': .msg is not supported, save it as .eml'); continue; } if (f.size > 8e6) { bad.push(f.name + ': larger than 8 MB'); continue; }
        try { const m = parseEml(await f.text()); if (!m.from.email) { bad.push(f.name + ': no sender address found'); continue; } if (!m.body) { bad.push(f.name + ': no readable text'); continue; }
          const r = await API.post(`/api/projects/${S.project.id}/tickets/ingest`, m); if (r.duplicate) dup++; else if (r.appended) joined++; else made++; } catch (e) { bad.push(f.name + ': ' + e.message); } }
      const bits = [made && made + ' new ticket' + (made > 1 ? 's' : ''), joined && joined + ' added to an existing ticket', dup && dup + ' already imported'].filter(Boolean);
      if (bits.length) V.toast(bits.join(', ') + '. Open Tickets to see ' + (made + joined > 1 ? 'them' : 'it') + '.', 6000); if (bad.length) V.toast(bad.slice(0, 3).join(' | '), 8000, true); }); }
    i.click(); };
  ACT.ibOutlook = () => { window.open('https://outlook.office.com/mail/', '_blank', 'noopener'); };
})(typeof window !== 'undefined' ? window : globalThis);
