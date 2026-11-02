/* Outlook hand-off. A native Outlook inbox is NOT available in this deployment (see docs/reference/outlook-feasibility.md): the platform gives the
   app only the signed-in email, not a Microsoft Graph token. So this opens Outlook on the web and pre-fills a draft the person reviews and
   sends themselves. Nothing is sent from here and the app never claims an email was sent. */
(function (root) {
  'use strict';
  const F = root.FWB; const V = root.FWBViews; const { toast } = V;
  const BASE = 'https://outlook.office.com/mail/';
  const MAX_URL = 1900; // browsers and Outlook links stay reliable below about 2,000 characters
  const list = v => String(v || '').split(/[;,\n]/).map(x => x.trim()).filter(x => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(x));
  // Builds the compose link. Returns { url, trimmed, to, cc, dropped } where trimmed is true when the body had to be shortened.
  function composeUrl(m) {
    const to = list(m.to), cc = list(m.cc); const dropped = String(m.to || '').split(/[;,\n]/).concat(String(m.cc || '').split(/[;,\n]/)).map(x => x.trim()).filter(x => x && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(x));
    const q = (body) => BASE + 'deeplink/compose?' + [to.length ? 'to=' + encodeURIComponent(to.join(';')) : '', cc.length ? 'cc=' + encodeURIComponent(cc.join(';')) : '', 'subject=' + encodeURIComponent(m.subject || ''), 'body=' + encodeURIComponent(body)].filter(Boolean).join('&');
    let body = String(m.body || ''); let url = q(body); let trimmed = false;
    if (url.length > MAX_URL) { trimmed = true; const note = '\n\n[Shortened for the link. The full text is on your clipboard: paste it here.]'; let lo = 0, hi = body.length; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (q(body.slice(0, mid) + note).length <= MAX_URL) lo = mid; else hi = mid - 1; } url = q(body.slice(0, lo) + note); }
    return { url, trimmed, to, cc, dropped };
  }
  async function copy(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; } }
  // Opens Outlook on the web with a draft. The caller keeps its own mailto / .eml / copy actions.
  async function compose(m) {
    const r = composeUrl(m); const full = (r.to.length ? 'To: ' + r.to.join('; ') + '\n' : '') + (r.cc.length ? 'Cc: ' + r.cc.join('; ') + '\n' : '') + 'Subject: ' + (m.subject || '') + '\n\n' + (m.body || '');
    const copied = r.trimmed ? await copy(m.body || '') : false;
    const w = root.open(r.url, '_blank', 'noopener'); const notes = [];
    if (!w) { await copy(full); toast('Your browser blocked the Outlook window. The email text is copied: open Outlook and paste it.', 7000, true); return false; }
    if (!r.to.length) notes.push('No valid recipient was found, so add one in Outlook.'); else if (r.to.length > 1) notes.push(r.to.length + ' recipients added.');
    if (r.dropped.length) notes.push('Skipped an invalid address: ' + r.dropped.slice(0, 2).join(', ') + '.');
    if (r.trimmed) notes.push(copied ? 'The message was too long for a link. It is cut short in Outlook, and the full text is copied: paste it over the body.' : 'The message was too long for a link and is cut short. Use Copy to get the full text.');
    toast('Outlook opened with a draft. Review it and press Send there; nothing has been sent. ' + notes.join(' '), 9000);
    return true;
  }
  V.outlook = { composeUrl, compose, BASE, open: () => { root.open(BASE, '_blank', 'noopener'); } };
  V.ACT.openOutlook = () => V.outlook.open();
})(typeof window !== 'undefined' ? window : globalThis);
