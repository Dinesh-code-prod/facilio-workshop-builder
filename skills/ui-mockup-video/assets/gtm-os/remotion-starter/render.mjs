import {spawn, execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {access, mkdir, rename, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(
  await readFile(path.join(root, 'compositions.json'), 'utf8'),
);
const [composition, name, scale = '1', codec = 'h264'] = process.argv.slice(2);
if (
  !Object.hasOwn(registry, composition) ||
  !name ||
  !['1', '2'].includes(scale) ||
  !['h264', 'prores'].includes(codec)
) {
  throw new Error(
    'Usage: node render.mjs <composition ID from compositions.json> out/name.mp4 1|2 [h264|prores]',
  );
}
const output = path.resolve(root, name);
const expectedExtension = codec === 'prores' ? '.mov' : '.mp4';
if (path.extname(output) !== expectedExtension)
  throw new Error(`Use ${expectedExtension} for ${codec}`);
try {
  await access(output);
  throw new Error(
    `Refusing to overwrite ${output}; choose a new filename or archive it first.`,
  );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await mkdir(path.dirname(output), {recursive: true});
const temporary =
  output.slice(0, -expectedExtension.length) +
  `.rendering-${process.pid}` +
  expectedExtension;
const args = [
  path.join(root, 'node_modules/@remotion/cli/remotion-cli.js'),
  'render',
  'src/index.ts',
  composition,
  temporary,
  `--scale=${scale}`,
  `--codec=${codec}`,
  '--image-format=png',
  '--color-space=bt709',
  '--concurrency=2',
  ...(codec === 'prores'
    ? ['--prores-profile=standard', '--pixel-format=yuv422p10le']
    : ['--crf=16', '--pixel-format=yuv420p']),
];
const child = spawn(process.execPath, args, {cwd: root, stdio: 'inherit'});
const [code] = await once(child, 'exit');
if (code !== 0)
  throw new Error(`Render failed (${code}); previous exports preserved.`);
const probe = JSON.parse(
  execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', temporary],
    {encoding: 'utf8'},
  ),
);
const video = probe.streams.find((stream) => stream.codec_type === 'video');
const expected = registry[composition];
const seconds = expected.durationInFrames / expected.fps;
const [rateN, rateD] = (video?.avg_frame_rate ?? '0/1').split('/').map(Number);
if (
  !video ||
  video.width !== expected.width * Number(scale) ||
  video.height !== expected.height * Number(scale) ||
  Math.abs(rateN / rateD - expected.fps) > 0.001 ||
  Math.abs(Number(probe.format.duration) - seconds) > 0.05
) {
  throw new Error(
    'Rendered dimensions, frame rate, or duration differ from the requested composition',
  );
}
execFileSync(
  'ffmpeg',
  ['-v', 'error', '-xerror', '-i', temporary, '-f', 'null', '-'],
  {stdio: ['ignore', 'ignore', 'pipe']},
);
await rename(temporary, output);
console.log(
  `Exported and decoded ${output}. Inspect the visual result before delivery.`,
);
