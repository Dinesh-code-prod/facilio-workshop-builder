// Capture an actual page. The action plan may change app state: inspect it first.
import {createRequire} from 'node:module';
import {parseArgs} from 'node:util';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const {values} = parseArgs({options: {
  url: {type: 'string'}, plan: {type: 'string'}, out: {type: 'string'},
  zoom: {type: 'string', default: '1.5'}, width: {type: 'string', default: '1920'},
  height: {type: 'string', default: '1080'}, runtime: {type: 'string'},
  preflight: {type: 'boolean', default: false}, help: {type: 'boolean'},
}});
if (values.help) {
  console.log('node capture.mjs --url URL --plan actions.json --out NEW_DIRECTORY [--zoom 1.5] [--width 1920 --height 1080] [--preflight] [--runtime /path/to/05_Code]');
  process.exit(0);
}
if (!values.url || !values.plan || !values.out) throw new Error('--url, --plan and --out are required');
const url = new URL(values.url);
if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an http(s) URL without embedded credentials');
const viewport = {width: Number(values.width), height: Number(values.height)};
const zoom = Number(values.zoom);
if (!Object.values(viewport).every(n => Number.isInteger(n) && n >= 320 && n <= 7680) || !Number.isFinite(zoom) || zoom < 1 || zoom > 3) throw new Error('Invalid viewport or zoom (1–3)');
const plan = JSON.parse(await readFile(values.plan, 'utf8'));
if (!Array.isArray(plan.actions)) throw new Error('Plan must have an actions array');
for (const action of plan.actions) {
  if (!['fill', 'click', 'waitFor', 'hold'].includes(action.type)) throw new Error(`Unsupported action: ${action.type}`);
  if (action.type !== 'hold' && typeof action.selector !== 'string') throw new Error('Action needs a selector');
  if (action.type === 'fill' && typeof action.value !== 'string') throw new Error('Fill needs a value');
  if (action.type === 'hold' && (!Number.isFinite(action.ms) || action.ms < 0 || action.ms > 60000)) throw new Error('Hold must be 0–60000 ms');
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(values.runtime ? path.resolve(values.runtime) : path.join(root, 'remotion-starter'), 'package.json'));
const {chromium} = require('playwright');
const out = path.resolve(values.out);
await mkdir(out, {recursive: false}); // Fail on an existing directory; preserve earlier takes.
const browser = await chromium.launch();
let context;
try {
  context = await browser.newContext({viewport, deviceScaleFactor: 1, colorScheme: 'dark',
    ...(values.preflight ? {} : {recordVideo: {dir: path.join(out, 'raw'), size: viewport}}),
  });
  await context.addInitScript(zoom => {
    const apply = () => {document.documentElement.style.zoom = String(zoom);};
    if (document.documentElement) apply();
    else document.addEventListener('DOMContentLoaded', apply, {once: true});
  }, zoom);
  const page = await context.newPage();
  await page.goto(url.href, {waitUntil: 'domcontentloaded'});
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({path: path.join(out, 'preflight.png')});
  if (!values.preflight) {
    for (const action of plan.actions) {
      if (action.type === 'hold') await page.waitForTimeout(action.ms);
      else if (action.type === 'fill') await page.locator(action.selector).fill(action.value);
      else if (action.type === 'click') await page.locator(action.selector).click();
      else await page.locator(action.selector).waitFor({state: 'visible', timeout: action.timeoutMs ?? 30000});
    }
    const video = page.video();
    await context.close();
    context = null;
    await video.saveAs(path.join(out, 'capture.webm'));
    await video.delete(); // Only the duplicate created by this recorder.
  }
  await writeFile(path.join(out, 'capture-notes.json'), JSON.stringify({
    origin: url.origin, viewport, layoutZoom: zoom, zoomMethod: 'CSS layout zoom before recording',
    recorder: 'Playwright', audio: false, preflightOnly: values.preflight,
    representation: 'Actual browser capture; actions and timing determined by the supplied plan and live app.',
    cadence: 'Probe the exported file. Typical Playwright video is 25 fps; no 30/60 fps acquisition claim.',
  }, null, 2));
  console.log(out);
} finally {
  if (context) await context.close();
  await browser.close();
}
