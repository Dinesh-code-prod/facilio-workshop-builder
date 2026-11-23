// Hand-run: write public/brand/login-scene-day.svg, the daytime version of the sign-in night scene (light redesign, user 23 Nov 2026).
// Flat light blue sky and water, no glow, pale blue buildings with white windows; the stars stay but vanish against the light sky. The night file is left as it is.
// Usage: node tools/day-scene.mjs
import fs from 'node:fs';
const src = 'public/brand/login-scene.svg', out = 'public/brand/login-scene-day.svg';
const MAP = { '#121A52': '#DCE8FB', '#1B2A78': '#DCE8FB', '#2A5BB0': '#D0E0F8', '#1D3A86': '#D0E0F8', '#101A57': '#D0E0F8',   // sky and water, flat
  '#0A0F3F': '#BCD1F3', '#5E7DC8': '#A9C3EE', '#8DB8FF': '#B6CCF2', '#FFD58A': '#FFFFFF', '#C6D1FF': '#E9F0FC', '#C0D4FF': '#FFFFFF', '#4C9BFF': '#FFFFFF' };
let s = fs.readFileSync(src, 'utf8'), n = 0;
s = s.replace(/#[0-9A-Fa-f]{6}\b/g, c => { const k = Object.keys(MAP).find(x => x.toLowerCase() === c.toLowerCase()); if (!k) return c; n++; return MAP[k]; });
s = s.replace(/(<radialGradient id="glow"[\s\S]*?<\/radialGradient>)/, g => g.replace(/stop-opacity="[^"]*"/g, 'stop-opacity="0"'));   // no glow by day
fs.writeFileSync(out, s);
console.log('wrote', out, n, 'colours swapped');
