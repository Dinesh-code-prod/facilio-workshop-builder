// Readable text (src/typescale.mjs): small text goes up about 1px with a floor, big text stays, the order of sizes is kept, previews and print are left alone.
import assert from 'node:assert/strict'; import { readable, readableCss } from '../src/typescale.mjs';
let n = 0; const ok = s => { n++; console.log('  ok  ' + s); };
assert.deepEqual([9, 10, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 22].map(readable), [11.5, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15, 15, 22]); ok('sizes: +1px below 14, 14-14.5 become 15, a floor of 11.5, 15 and up unchanged');
const sizes = [9, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16, 18]; for (let i = 1; i < sizes.length; i++) assert.ok(readable(sizes[i]) >= readable(sizes[i - 1])); ok('a bigger size never becomes smaller than a smaller one (titles stay above labels)');
assert.equal(readableCss('.a{color:red;font-size:12px}'), '.a{color:red;font-size:13px}'); ok('font-size is raised');
assert.equal(readableCss('.a{font-size: 11px !important}'), '.a{font-size: 12px !important}'); ok('!important is kept');
assert.equal(readableCss('.b{font:600 12.5px/18px inherit}'), '.b{font:600 13.5px/18px inherit}'); ok('in the font shorthand only the size changes, not the line height');
assert.equal(readableCss('.c{font-size:1.2rem;padding:12px}'), '.c{font-size:1.2rem;padding:12px}'); ok('rem sizes and other px values (padding) are untouched');
assert.equal(readableCss('@media (max-width:600px){.d{font-size:12px}}'), '@media (max-width:600px){.d{font-size:13px}}'); ok('rules inside @media screen blocks are raised');
assert.equal(readableCss('@media print{.e{font-size:9px}.f{font:10px x}}'), '@media print{.e{font-size:9px}.f{font:10px x}}'); ok('print rules are left as they are');
assert.equal(readableCss('.paper p{font-size:11px}.xls-table td{font-size:10px}'), '.paper p{font-size:11px}.xls-table td{font-size:10px}'); ok('the BRD page and Excel previews keep their document sizes');
console.log(`\n${n} readable text checks passed`);
