/* The text of one BRD of a project (document brddoc), for Claude: get_document section brddoc part brd:<id> (pages of PAGE characters: brd:<id>.2 and on). An imported BRD is a chain of blocks after 'imp:title'; the Main BRD is generated from the project tabs, so only the text a person added to it is stored here. */
export const PAGE = 12000;
const s = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
const cell = c => s(c && typeof c === 'object' ? c.text : c);
const statusOf = (d, id) => (id === 'main' ? d.status : ((d.docs || {})[id] || {}).status) || 'draft';

/** every BRD of the project: [{ part, id, name, type, imported, agreed, status }] */
export function brdList(d) {
  const ag = ((d && d.agreed) || {}).id || '';
  return (Array.isArray(d && d.list) ? d.list : []).filter(r => r && r.id).map(r => ({ part: 'brd:' + r.id, id: r.id, name: s(r.name).slice(0, 120), type: r.type || 'core', imported: !!r.imported, agreed: r.id === ag, status: statusOf(d, r.id) }));
}

/** one BRD as plain text (# headings, - bullets, | table rows |), hidden blocks left out; null when there is no such BRD */
export function brdText(d, id) {
  const rec = (Array.isArray(d && d.list) ? d.list : []).find(r => r && r.id === id); if (!rec) return null;
  const x = id === 'main' ? d : ((d.docs || {})[id] || {}); const ins = x.inserts || {}, hidden = x.hidden || {}, edits = x.edits || {}; const out = [], seen = new Set();
  const line = b => {
    const e = edits[b.id], t = e && typeof e.text === 'string' ? e.text : b.text;
    if (b.t === 'h') return '#'.repeat(Math.min(3, Math.max(1, b.lvl || 1))) + ' ' + s(t);
    if (b.t === 'ul') return (Array.isArray(b.items) ? b.items : []).map(i => '- ' + cell(i)).join('\n');
    if (b.t === 'table') return [b.headers || []].concat(b.rows || []).map(r => '| ' + (Array.isArray(r) ? r : []).map(cell).join(' | ') + ' |').join('\n');
    return s(t);
  };
  // a block's children follow it (they can be chained), so the walk keeps the order of the document
  const walk = k => (ins[k] || []).forEach(b => { if (!b || !b.id || seen.has(b.id)) return; seen.add(b.id); if (!hidden[b.id]) { const l = line(b); if (l.trim()) out.push(l); } walk(b.id); });
  walk('imp:title'); Object.keys(ins).forEach(walk);
  return { id, name: s(rec.name), type: rec.type || 'core', imported: !!rec.imported, agreed: ((d.agreed || {}).id || '') === id, status: statusOf(d, id), text: out.join('\n\n') };
}
