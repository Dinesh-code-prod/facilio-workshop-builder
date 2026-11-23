/* Readable text (23 Nov 2026, user: "all the fonts are so tiny and can't be read"). The styles grew over many passes with 11-13px text in about 1,950 places across
   40 files; instead of editing them all, build.mjs runs readableCss over the bundled CSS: every px text size goes up about 1px (13 becomes 14, 12 becomes 13),
   the tiniest (badge counters) get a floor of 11.5px, and 15px and larger stay as they are, so titles keep their order above labels.
   Left alone: the BRD page and Excel previews (.paper, .xls-table: they show how the Word and Excel files will look) and print rules.
   One switch: FWB_TYPE_SCALE=0 builds the old sizes; or take the call out of build.mjs. Checked by tests/typescale.mjs. */
export function readable(px) {
  if (px >= 15) return px;
  if (px >= 14) return 15;
  if (px <= 10.5) return 11.5;
  return px + 1;
}
const fmt = n => String(Math.round(n * 10) / 10);
const SKIP = /\.paper\b|\.xls-table\b|@page/;
// innermost rule blocks only ("selector { declarations }"); @media wrappers are walked through, @media print blocks are left as they are
export function readableCss(css) {
  const printSpans = []; const re = /@media[^{]*\bprint\b[^{]*\{/g; let m;
  while ((m = re.exec(css))) { let d = 1, i = m.index + m[0].length; while (i < css.length && d) { if (css[i] === '{') d++; else if (css[i] === '}') d--; i++; } printSpans.push([m.index, i]); }
  const inPrint = at => printSpans.some(([a, b]) => at >= a && at < b);
  return css.replace(/([^{}]*)\{([^{}]*)\}/g, (all, sel, body, at) => {
    if (SKIP.test(sel) || inPrint(at)) return all;
    const nb = body
      .replace(/(font-size\s*:\s*)(\d+(?:\.\d+)?)px/g, (x, k, n) => k + fmt(readable(+n)) + 'px')
      .replace(/(\bfont\s*:\s*[^;]*?)(\d+(?:\.\d+)?)px/g, (x, k, n) => k + fmt(readable(+n)) + 'px');
    return sel + '{' + nb + '}';
  });
}
