import {spawnSync} from 'node:child_process';
import {mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const registry = JSON.parse(
  await readFile(path.join(root, 'compositions.json'), 'utf8'),
);
const ids = process.argv.slice(2);
if (!ids.length || ids.some((id) => !Object.hasOwn(registry, id))) {
  throw new Error(
    `Usage: npm run review -- <ID> [ID ...]. IDs: ${Object.keys(registry).join(', ')}`,
  );
}
// A unique directory keeps prior review evidence intact.
const directory = path.join(root, 'review', `${Date.now()}-${process.pid}`);
await mkdir(directory, {recursive: true});
for (const id of ids) {
  for (const frame of registry[id].reviewFrames) {
    if (
      !Number.isInteger(frame) ||
      frame < 0 ||
      frame >= registry[id].durationInFrames
    )
      throw new Error(`Invalid review frame: ${id}/${frame}`);
    const output = path.join(
      directory,
      `${id}-${String(frame).padStart(4, '0')}.png`,
    );
    const result = spawnSync(
      process.execPath,
      [
        path.join(root, 'node_modules/@remotion/cli/remotion-cli.js'),
        'still',
        'src/index.ts',
        id,
        output,
        `--frame=${frame}`,
        '--image-format=png',
        '--log=error',
      ],
      {cwd: root, stdio: 'inherit'},
    );
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error(`Still render failed for ${id}/${frame}`);
    console.log(`Rendered ${id} frame ${frame}`);
  }
}
console.log(`Review these actual rendered frames: ${directory}`);
