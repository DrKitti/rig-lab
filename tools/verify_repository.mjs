/** Verify the maintained, cloneable checkpoint. No dependency on ignored drafts or Python. */
import { readFile, writeFile, readdir, access } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { animationStore, validateClips } from '../src/server/animation-store.mjs';
import { catalog, canonicalRigName } from '../src/server/rig-catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = async path => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const safe = path => {
  assert.ok(!path.includes('\\') && !path.split('/').includes('..') && !path.startsWith('/'), `Unsafe asset path: ${path}`);
  const target = resolve(root, path);
  assert.ok(!relative(root, target).startsWith('..'));
  return target;
};
const spec = await read('docs/rig-spec/shared-skeleton-v5.json');
const arms = await read('docs/rig-spec/shared-arm-placement.json');
const animations = animationStore(resolve(root, 'src/data/animations'));
const master = await read('src/data/shared-master.rig.json');
const proportions = (await read('docs/rig-spec/proportions.json')).shared;
assert.equal(proportions.master_rig, 'src/data/shared-master.rig.json');
for (const path of [proportions.master_rig, proportions.fullbody, proportions.source]) await access(safe(path));
const texturePaths = new Set(), rigs = [];
for (const entry of catalog.rigs) {
  const path = `src/data/${entry.rig}.rig.json`, rig = await read(path);
  assert.equal(rig.name, entry.rig);
  assert.equal(rig.skeletonVersion, spec.version);
  assert.equal(rig.animationLibrary, spec.version);
  assert.equal(rig.clips, undefined, 'Shared clips must not be duplicated in outfit files');
  assert.deepEqual(rig.bones, master.bones, 'Maintained rigs must share the same bone setup');
  const byName = new Map(rig.bones.map(b => [b.name, b]));
  assert.equal(byName.size, rig.bones.length);
  assert.deepEqual(rig.bones.filter(b => b.name.startsWith('arm_')), arms.bones);
  assert.equal(byName.get('root').y, spec.rootY);
  assert.equal(byName.get('torso').length, spec.torsoLength);
  for (const side of ['F', 'B']) {
    assert.equal(byName.get(`leg_${side}_1`).length, spec.thighLength);
    assert.equal(byName.get(`leg_${side}_2`).x, spec.thighLength);
    assert.equal(byName.get(`leg_${side}_2`).length, spec.shinLength);
    assert.equal(byName.get(`leg_${side}_3`).x, spec.shinLength);
    assert.equal(byName.get(`leg_${side}_3`).length, spec.footLength);
    assert.equal(byName.get(`ik_leg_${side}`).y, spec.ankleWorldY);
  }
  for (const foot of rig.footPlants) {
    assert.equal(foot.soleHeight, spec.soleHeight);
    assert.equal(foot.squash, spec.footLoad);
    assert.equal(foot.squashAt, spec.footLoadAt);
  }
  for (const bone of rig.bones) if (bone.parent) assert.ok(byName.has(bone.parent));
  const partNames = new Set(rig.parts.map(p => p.name));
  assert.equal(new Set(rig.drawOrder).size, rig.drawOrder.length);
  assert.deepEqual(new Set(rig.drawOrder), partNames);
  for (const part of rig.parts) {
    assert.ok(byName.has(part.bone) && rig.textures[part.texture]);
    if (part.mesh) {
      assert.ok(!Object.hasOwn(part.mesh, 'rigidFootRise'));
      for (const bone of [part.mesh.child, ...(part.mesh.chain ?? [])]) assert.ok(byName.has(bone));
    }
  }
  for (const path of Object.values(rig.textures)) {
    assert.ok(path.startsWith('assets/rigs/') || path.startsWith('assets/characters/'), `Runtime draft dependency: ${path}`);
    await access(safe(path)); texturePaths.add(path);
  }
  const hydrated = await animations.hydrate(rig);
  validateClips(hydrated.clips, new Set(byName.keys()));
  rigs.push({ id: rig.name, path, animationLibrary: rig.animationLibrary });
  console.log(`${rig.name}: shared geometry, clips, draw order and permanent assets passed`);
}
for (const [legacy, current] of Object.entries(catalog.aliases)) {
  assert.equal(canonicalRigName(legacy), current);
  assert.ok(catalog.rigs.some(r => r.rig === current));
}
const textures = [];
for (const path of [...texturePaths].sort()) {
  const data = await readFile(safe(path));
  assert.equal(data.subarray(1, 4).toString(), 'PNG');
  textures.push({ path, width: data.readUInt32BE(16), height: data.readUInt32BE(20),
    sha256: createHash('sha256').update(data).digest('hex') });
}
const manifest = { schemaVersion: 1, skeletonVersion: spec.version, rigs, textures };
if (process.argv.includes('--write-manifest')) {
  await writeFile(resolve(root, 'assets/rigs/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
} else assert.deepEqual(await read('assets/rigs/manifest.json'), manifest, 'Refresh manifest after an intentional asset change');

// Colour recipe inputs must exist in the checkout; intermediate files may be prior job outputs.
const generated = new Set();
for (const file of ['neutral-gray.materials.json', 'neutral-skin.materials.json', 'time-travel.materials.json']) {
  const path = resolve(root, 'assets/pipeline/recipes', file), cfg = JSON.parse(await readFile(path, 'utf8'));
  await access(resolve(dirname(path), cfg.reference));
  for (const job of cfg.parts) {
    const source = resolve(dirname(path), job.source);
    if (!generated.has(source)) await access(source);
    generated.add(resolve(dirname(path), job.output));
  }
}
for (const file of await readdir(resolve(root, 'src/rig/core'))) {
  if (!file.endsWith('.ts')) continue;
  const source = await readFile(resolve(root, 'src/rig/core', file), 'utf8');
  assert.ok(!/from\s+['"](?:pixi|phaser|node:|.*editor|.*server)/.test(source), 'Core imported a host dependency');
}
console.log(`Verified ${rigs.length} maintained rigs and ${textures.length} runtime textures; no draft dependencies.`);

async function verifyDocLinks(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'archive') await verifyDocLinks(path);
    } else if (path.endsWith('.md')) {
      const content = await readFile(path, 'utf8');
      for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const target = match[1].split('#')[0];
        if (!target || /^(https?:|mailto:|\/)/.test(target)) continue;
        await access(resolve(dirname(path), target));
      }
    }
  }
}
await verifyDocLinks(resolve(root, 'docs'));
console.log('Current documentation links passed (historical archive citations excluded).');
