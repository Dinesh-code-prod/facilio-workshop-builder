/* The "Claude is working" conversation shared by every stage tab (Contract intake now; requirements, BRD, UAT and the rest later). Pure markup, no state: the caller works out what is true from the project's own data and passes it in.
   Run by tests/workchat.mjs. o: { title, hint, messages, tiles, tilesTitle, composer }
   message: { who: 'you' | 'claude' | 'sys' | 'bad', text, at, typing, actions: [{ label, act, attrs, primary, danger }], reply: { fields: [{ value, attrs }], send: { label, act, attrs } } }
   tile: { label, detail, state: 'todo' | 'now' | 'done' | 'bad', badge, open: { label, act, attrs } }. composer: markup built by the caller from its own escaped parts. attrs become data-* attributes. */
(function (root) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const arr = x => (Array.isArray(x) ? x : []);
  const WHO = { you: 'You', claude: 'C', sys: 'S', bad: '!' };
  const attrs = a => Object.keys(a || {}).filter(k => /^[a-z][a-z0-9-]*$/.test(k)).map(k => ' data-' + k + '="' + esc(a[k]) + '"').join('');
  const btn = b => '<button type="button" class="btn sm' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : '') + '" data-act="' + esc(b.act) + '"' + attrs(b.attrs) + '>' + esc(b.label) + '</button>';
  function message(m) {
    const who = Object.prototype.hasOwnProperty.call(WHO, m.who) ? m.who : 'claude';
    const reply = m.reply ? '<div class="ki-reply">' + arr(m.reply.fields).map(f => '<textarea rows="2" maxlength="600" placeholder="Your answer"' + attrs(f.attrs) + '>' + esc(f.value) + '</textarea>').join('') + (m.reply.send ? btn(Object.assign({ primary: true }, m.reply.send)) : '') + '</div>' : '';
    return '<div class="ki-row ' + who + '"><div class="ki-av" aria-hidden="true">' + esc(WHO[who]) + '</div><div class="ki-body"><div class="ki-bub">' + esc(m.text) + (m.typing ? '<span class="ko-typing" aria-hidden="true"><i></i><i></i><i></i></span>' : '') + reply
      + (arr(m.actions).length ? '<div class="ki-acts">' + arr(m.actions).map(btn).join('') + '</div>' : '') + '</div>' + (m.at ? '<div class="ki-time">' + esc(m.at) + '</div>' : '') + '</div></div>';
  }
  const STATE = { todo: 'Waiting', now: 'Preparing…', done: 'Ready', bad: 'Needs attention' };
  function tile(x) {
    const st = Object.prototype.hasOwnProperty.call(STATE, x.state) ? x.state : 'todo';
    return '<div class="ki-tile ' + st + '"><div class="ki-tic" aria-hidden="true"></div><div class="ki-tx"><b>' + esc(x.label) + '</b><span>' + esc(x.detail || STATE[st]) + '</span></div><div class="ki-tr">' + (x.badge ? '<em>' + esc(x.badge) + '</em>' : '') + (x.open && st === 'done' ? btn(Object.assign({}, x.open)) : '') + '</div></div>';
  }
  const feed = msgs => arr(msgs).map(message).join('');
  function html(o) {
    if (o.lite) { const asks = arr(o.messages).filter(m => arr(m.actions).length || m.reply);
      return '<section class="ki-chat ki-lite" aria-label="' + esc(o.title || 'Drafts') + '"><div class="ki-head"><div><b>' + esc(o.title || 'Drafts') + '</b>' + (o.hint ? '<span>' + esc(o.hint) + '</span>' : '') + '</div></div>' + (asks.length ? '<div class="ki-feed ki-asks" role="log" aria-live="polite">' + feed(asks) + '</div>' : '')
        + '<div class="ki-side ki-tiles"><div class="ki-st">' + esc(o.tilesTitle || 'What is prepared') + '</div>' + arr(o.tiles).map(tile).join('') + '</div>' + (o.composer ? '<div class="ki-comp">' + o.composer + '</div>' : '') + '</section>'; }
    return '<section class="ki-chat" aria-label="' + esc(o.title || 'Conversation with Claude') + '"><div class="ki-head"><div><b>' + esc(o.title || 'Claude is working') + '</b>' + (o.hint ? '<span>' + esc(o.hint) + '</span>' : '') + '</div></div><div class="ki-grid">'
      + '<div class="ki-feed-wrap"><div class="ki-feed" role="log" aria-live="polite">' + arr(o.messages).map(message).join('') + '</div>' + (o.composer ? '<div class="ki-comp">' + o.composer + '</div>' : '') + '</div>'
      + '<div class="ki-side"><div class="ki-st">' + esc(o.tilesTitle || 'What Claude prepares') + '</div>' + arr(o.tiles).map(tile).join('') + '</div></div></section>';
  }
  const api = { html, feed };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FWBWorkChat = api;
})(typeof window !== 'undefined' ? window : globalThis);
