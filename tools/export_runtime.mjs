/** Export a renderer-independent integration handoff with resolved clips and SHA256 inventory. */
import { cp, mkdir, readFile, writeFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { animationStore } from '../src/server/animation-store.mjs';
import { catalog } from '../src/server/rig-catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const argument = process.argv[2];
const output = resolve(root, argument ?? 'dist/kolahon-outfit-integration');
if (!relative(root, output).replaceAll('\\', '/').startsWith('dist/')) throw new Error('Export target must be a new directory under this repository dist/');
try { await access(output); throw new Error(`Export already exists: ${output}. Choose a new versioned directory.`); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const copy = async (source, target = source) => {
  await mkdir(dirname(resolve(output, target)), { recursive: true });
  await cp(resolve(root, source), resolve(output, target), { recursive: true, errorOnExist: true });
};
await mkdir(output, { recursive: true });
await copy('src/rig/core', 'runtime');
const animations = animationStore(resolve(root, 'src/data/animations'));
const textures = new Set();
for (const { rig: id } of catalog.rigs) {
  const raw = JSON.parse(await readFile(resolve(root, `src/data/${id}.rig.json`), 'utf8'));
  const rig = await animations.hydrate(raw);
  delete rig.animationLibraryRevision;
  await mkdir(resolve(output, 'rigs'), { recursive: true });
  await writeFile(resolve(output, `rigs/${id}.rig.json`), JSON.stringify(rig, null, 2) + '\n');
  for (const path of Object.values(rig.textures)) {
    if (!/^(assets\/rigs\/|assets\/characters\/)/.test(path) || path.includes('..') || path.includes('\\'))
      throw new Error(`Export contains an invalid texture path: ${path}`);
    textures.add(path);
  }
}
for (const path of textures) await copy(path);
await copy('src/data/animations', 'animations');
for (const path of ['docs/PROJECT_HANDOFF.md', 'docs/integration.md', 'docs/experiments.md', 'docs/verification.md',
  'docs/current-character-standard.md', 'docs/outfit-pipeline', 'docs/rig-spec',
  'assets/rigs/manifest.json']) await copy(path);
const files = [];
async function inventory(directory) {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, file.name);
    if (file.isDirectory()) await inventory(path);
    else files.push({ path: relative(output, path).replaceAll('\\', '/'),
      sha256: createHash('sha256').update(await readFile(path)).digest('hex') });
  }
}
await inventory(output);
await writeFile(resolve(output, 'export-manifest.json'), JSON.stringify({
  format: 'kolahon-outfit-integration-v1', rigs: catalog.rigs.map(r => r.rig), files,
  notes: ['Clips are embedded in each rig for standalone playback.',
    'runtime is TypeScript source; integrate with your game build.',
    'Phaser rendering adapter is not included; start with docs/integration.md.'],
}, null, 2) + '\n');
await writeFile(resolve(output, 'README.md'), '# Kolahon outfit integration\n\nStart with docs/PROJECT_HANDOFF.md and docs/integration.md.\n\n'+
  'Copy runtime/ into your TypeScript game. Rig texture paths resolve from this bundle root.\n'+
  'All rigs include resolved clips. No Vite server, editor, ignored drafts or Python is required for playback.\n'+
  'The generation-source examples referenced in pipeline docs remain in the full Git repository, not this runtime-only bundle.\n'+
  'The Phaser renderer still needs implementation and in-game validation.\n');
console.log(`Exported ${files.length} files to ${output}`);
