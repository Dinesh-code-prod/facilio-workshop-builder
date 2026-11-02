// Packs this folder into a Claude Desktop extension (.mcpb is a zip with manifest.json at its root): node tools/claude-mcp/build.js
// Output: public/claude/facilio-delivery-studio.mcpb (served by the app at /claude/facilio-delivery-studio.mcpb). No dependencies.
'use strict'; const fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = __dirname, out = path.join(root, '..', '..', 'public', 'claude', 'facilio-delivery-studio.mcpb');
const files = ['manifest.json', 'server/index.js', 'README.md'];
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const parts = [], cen = []; let off = 0;
for (const f of files) {
  const data = fs.readFileSync(path.join(root, f)), def = zlib.deflateRawSync(data, { level: 9 }), name = Buffer.from(f), c = crc(data);
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12); lh.writeUInt32LE(c, 14); lh.writeUInt32LE(def.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26);
  parts.push(lh, name, def);
  const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14); ch.writeUInt32LE(c, 16); ch.writeUInt32LE(def.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
  cen.push(ch, name); off += lh.length + name.length + def.length;
}
const cd = Buffer.concat(cen), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, Buffer.concat([...parts, cd, end])); console.log('built', out, fs.statSync(out).size + ' bytes');
