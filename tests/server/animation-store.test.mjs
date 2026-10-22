import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { animationStore } from '../../src/server/animation-store.mjs';

test('save in outfit A reaches B; stale B cannot overwrite it; deletes propagate', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rig-shared-animation-test-'));
  const path = join(directory, 'shared.animations.json');
  const clip = { name: 'idle', type: 'idle', duration: 2, loop: true, bones: {} };
  await writeFile(path, JSON.stringify({ skeletonVersion: 'shared', revision: 1, clips: [clip] }));
  const store = animationStore(directory);
  const base = { animationLibrary: 'shared', skeletonVersion: 'shared', bones: [{ name: 'root' }] };
  const a = await store.hydrate({ ...base, name: 'A', textures: { arm: 'a.png' } });
  const b = await store.hydrate({ ...base, name: 'B', textures: { arm: 'b.png' } });
  a.clips.push({ ...clip, name: 'walk', bones: { root: { y: [{ time: 0, value: 8 }] } } });
  let persisted;
  const result = await store.save(a, async rig => { persisted = rig; });
  assert.equal(result.animationLibraryRevision, 2);
  assert.equal(persisted.clips, undefined);
  assert.equal(persisted.textures.arm, 'a.png');
  const updatedB = await store.hydrate(b);
  assert.deepEqual(updatedB.clips, a.clips);
  assert.equal(updatedB.textures.arm, 'b.png');
  await assert.rejects(store.save(b, async () => {}), { status: 409 });
  updatedB.clips.splice(0, 1);
  await store.save(updatedB, async () => {});
  assert.deepEqual((await store.hydrate(base)).clips.map(c => c.name), ['walk']);
  assert.equal(JSON.parse(await readFile(path, 'utf8')).revision, 3);
  const invalid = await store.hydrate(base);
  invalid.clips[0].bones = { missing: {} };
  await assert.rejects(store.save(invalid, async () => {}), /Unknown animation bone/);
});

test('concurrent saves serialize and reject the outdated revision', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rig-shared-animation-test-'));
  await writeFile(join(directory, 'shared.animations.json'), JSON.stringify({ skeletonVersion: 'shared', revision: 1,
    clips: [{ name: 'idle', type: 'idle', duration: 1, loop: true, bones: {} }] }));
  const store = animationStore(directory);
  const rig = await store.hydrate({ animationLibrary: 'shared', skeletonVersion: 'shared', bones: [] });
  const result = await Promise.allSettled([store.save(rig, async () => {}), store.save(rig, async () => {})]);
  assert.equal(result[0].status, 'fulfilled');
  assert.equal(result[1].status, 'rejected');
  assert.equal(result[1].reason.status, 409);
});
