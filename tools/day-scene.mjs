// Hand-run: write public/brand/login-scene-day.svg, the daytime version of the sign-in night scene (light redesign, user 23 Nov 2026).
// Flat light sky and water, no glow, pale blue buildings with white windows; the stars stay but vanish against the light sky. The night file is left as it is.
// Usage: node tools/day-scene.mjs
import fs from 'node:fs';
const src = 'public/brand/login-scene.svg', out = 'public/brand/login-scene-day.svg';
const MAP = { '#121A52': '#F2F7FF', '#1B2A78': '#F2F7FF', '#2A5BB0': '#E6EFFC', '#1D3A86': '#E6EFFC', '#101A57': '#E6EFFC',   // sky and water, flat
  '#0A0F3F': '#CBDAF2', '#5E7DC8': '#B4C9EC', '#8DB8FF': '#C9DAF6', '#FFD58A': '#FFFFFF', '#C6D1FF': '#E9F0FC', '#C0D4FF': '#FFFFFF', '#4C9BFF': '#FFFFFF' };
let s = fs.readFileSync(src, 'utf8'), n = 0;
s = s.replace(/#[0-9A-Fa-f]{6}\b/g, c => { const k = Object.keys(MAP).find(x => x.toLowerCase() === c.toLowerCase()); if (!k) return c; n++; return MAP[k]; });
s = s.replace(/(<radialGradient id="glow"[\s\S]*?<\/radialGradient>)/, g => g.replace(/stop-opacity="[^"]*"/g, 'stop-opacity="0"'));   // no glow by day
fs.writeFileSync(out, s);
console.log('wrote', out, n, 'colours swapped');
