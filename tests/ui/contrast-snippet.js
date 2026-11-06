/* Contrast check for the browser pane: paste into javascript_tool.
   Walks every visible text node, finds the first opaque ancestor background, computes the WCAG ratio and returns the failures
   (needs 4.5:1; 3:1 for large text = 24px, or 18.66px bold). Text on a gradient or picture is skipped: check by eye.
   Returns {checked, failCount, fails:[{ratio,need,text,fg,bg,sel}]}. */
(() => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = el => { const stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (/gradient|url/.test(cs.backgroundImage || '')) return { img: true }; const c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base); return base; };
  const hidden = el => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return true; } return false; };
  const fails = []; let checked = 0; const seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    const t = n.textContent.trim(); const el = n.parentElement; if (!t || !el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || hidden(el)) continue;
    const cs = getComputedStyle(el), bg = bgOf(el); if (bg.img) continue;
    let fg = parse(cs.color); if (!fg) continue; fg = over(fg, bg);
    const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const size = parseFloat(cs.fontSize), large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700), need = large ? 3 : 4.5; checked++;
    if (ratio < need) { const key = el.className + '|' + cs.color + '|' + t.slice(0, 20); if (seen.has(key)) continue; seen.add(key); fails.push({ ratio: +ratio.toFixed(2), need, text: t.slice(0, 40), fg: cs.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})`, sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '') }); }
  }
  return { checked, failCount: fails.length, fails: fails.slice(0, 25) };
})()
