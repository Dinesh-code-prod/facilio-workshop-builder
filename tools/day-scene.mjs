// Hand-run: write the daytime versions of the sign-in night scene (public/brand/login-scene.svg is left as it is).
//   day  -> public/brand/login-scene-day.svg   flat light blue sky, pale blue buildings, white windows (light redesign, user 23 Nov 2026)
//   blue -> public/brand/login-scene-blue.svg  Facilio blue sky, lighter blue buildings, white windows (user 23 Nov 2026: "facilio blue as the background")
// Usage: node tools/day-scene.mjs [day|blue]   (default: both)
import fs from 'node:fs';
const src = 'public/brand/login-scene.svg';
const MAPS = {
  day: { '#121A52': '#DCE8FB', '#1B2A78': '#DCE8FB', '#2A5BB0': '#D0E0F8', '#1D3A86': '#D0E0F8', '#101A57': '#D0E0F8',   // sky and water, flat
    '#0A0F3F': '#BCD1F3', '#5E7DC8': '#A9C3EE', '#8DB8FF': '#B6CCF2', '#FFD58A': '#FFFFFF', '#C6D1FF': '#E9F0FC', '#C0D4FF': '#FFFFFF', '#4C9BFF': '#FFFFFF' },
  blue: { '#121A52': '#1570EF', '#1B2A78': '#1570EF', '#2A5BB0': '#1366E0', '#1D3A86': '#1366E0', '#101A57': '#1366E0',
    '#0A0F3F': '#2E7FF2', '#5E7DC8': '#4A92F5', '#8DB8FF': '#3A88F4', '#FFD58A': '#FFFFFF', '#C6D1FF': '#DCE9FF', '#C0D4FF': '#FFFFFF', '#4C9BFF': '#FFFFFF' },
};
for (const name of (process.argv[2] ? [process.argv[2]] : Object.keys(MAPS))) {
  const MAP = MAPS[name]; if (!MAP) throw new Error('unknown scene ' + name);
  const out = `public/brand/login-scene-${name}.svg`; let s = fs.readFileSync(src, 'utf8'), n = 0;
  s = s.replace(/#[0-9A-Fa-f]{6}\b/g, c => { const k = Object.keys(MAP).find(x => x.toLowerCase() === c.toLowerCase()); if (!k) return c; n++; return MAP[k]; });
  s = s.replace(/(<radialGradient id="glow"[\s\S]*?<\/radialGradient>)/, g => g.replace(/stop-opacity="[^"]*"/g, 'stop-opacity="0"'));   // no glow
  fs.writeFileSync(out, s);
  console.log('wrote', out, n, 'colours swapped');
}
