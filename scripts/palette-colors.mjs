// Recolours violet / lavender / magenta tinted colours in src/*.css to the neutral palette.
// Usage: node scripts/palette-colors.mjs [--dry]   (--dry only prints what would change)
// Rules (by lightness l, saturation s, and what the declaration styles):
//   lavender greys (hue 238-300): text -> #242424 / #616161; fills and borders -> the neutral greys by lightness
//   saturated pale violets -> the soft brand blue #eaf2ff (sky #8DB8FF when stronger); mid violets used as text -> brand text blue #1262D8
//   dark violets: ink text -> #242424; dark fills -> Facilio navy #1D1A5E
//   magenta text and borders -> danger red #b10e1c; pale magenta fills -> #fdf3f4; strong magenta fills stay brand pink #E5197F
//   tinted rgba() in box-shadow / text-shadow -> neutral black rgba
// Left alone: the login scene, intro and Discover more files (explore*, tourplayer, authclay, animation/), Facilio navy and pink themselves.
import fs from 'node:fs';
const dry = process.argv.includes('--dry');
const SKIP = /^(explore|explore2|tourplayer|authclay|clay-|depthlayer|homeclay)/;
const files = fs.readdirSync('src').filter(f => f.endsWith('.css') && !SKIP.test(f.replace('.css', '')));
const hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s * 100, l * 100]; };
const kindOf = prop => /^(color|fill|stroke|caret-color|text-decoration-color|-webkit-text-fill-color)$/.test(prop) ? 'text' : /shadow|filter/.test(prop) ? 'shadow' : /border|outline|column-rule/.test(prop) ? 'border' : 'bg';
function map(hx, kind) {
  const x = hx.length === 4 ? hx.slice(1).split('').map(c => c + c).join('') : hx.slice(1); const r = parseInt(x.slice(0, 2), 16), g = parseInt(x.slice(2, 4), 16), b = parseInt(x.slice(4, 6), 16); const [h, s, l] = hsl(r, g, b); const low = '#' + x.toLowerCase();
  if (low === '#1d1a5e' || low === '#e5197f' || s < 5 || l <= 3) return null;
  if (h >= 318 && h <= 345) { if (kind === 'text' || kind === 'border') return l < 60 ? '#b10e1c' : null; if (l >= 94) return '#fdf3f4'; if (kind === 'shadow') return null; if (l >= 80) return '#fbe3e6'; return '#E5197F'; }
  if (h < 238 || h > 300) return null;
  if (kind === 'text') return l < 30 ? '#242424' : l < 58 ? (s >= 40 ? '#1262D8' : '#616161') : '#616161';
  if (kind === 'shadow') return null;
  if (l < 40) return '#1D1A5E';
  if (l < 60) return s >= 40 ? '#1570EF' : '#707070';
  if (s >= 70 && l >= 80 && l < 96) return l >= 90 ? '#eaf2ff' : '#8DB8FF';
  if (l >= 97) return kind === 'border' ? '#f0f0f0' : '#fafafa'; if (l >= 94) return kind === 'border' ? '#e0e0e0' : '#f5f5f5'; if (l >= 91) return kind === 'border' ? '#e0e0e0' : '#f0f0f0'; if (l >= 88) return '#e0e0e0'; if (l >= 80) return '#d1d1d1'; return '#bdbdbd';
}
let total = 0; const seen = {};
for (const f of files) {
  const p = 'src/' + f; const src = fs.readFileSync(p, 'utf8'); let n = 0;
  // declarations: property: value up to ; or }
  const out = src.replace(/([a-zA-Z-]+)\s*:\s*([^;{}]*?)(?=;|})/g, (all, prop, val) => {
    const kind = kindOf(prop);
    let v = val.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, m => { const to = map(m, kind); if (to && to.toLowerCase() !== m.toLowerCase()) { n++; const k = m.toLowerCase() + ' -> ' + to + ' (' + kind + ')'; seen[k] = (seen[k] || 0) + 1; return to; } return m; });
    if (kind === 'shadow') v = v.replace(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/g, (m, r, g, b, a) => { const [h, s] = hsl(+r, +g, +b); if (s >= 15 && h >= 238 && h <= 335) { n++; return 'rgba(0, 0, 0, ' + a + ')'; } return m; });
    return v === val ? all : all.replace(val, v);
  });
  if (n) { total += n; console.log(f + ': ' + n + ' colours'); if (!dry) fs.writeFileSync(p, out); }
}
console.log((dry ? 'would change ' : 'changed ') + total + ' colour values');
if (dry) console.log(Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 25).map(e => e[1] + ' x ' + e[0]).join('\n'));
