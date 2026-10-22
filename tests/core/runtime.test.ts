import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Skeleton, bindMesh, deformMesh, normalizeRig, sampleClip, blendPose, AnimationState } from '../../src/rig/core/index.ts';

const library = JSON.parse(readFileSync(new URL('../../src/data/animations/neutral-c-v5.animations.json', import.meta.url), 'utf8'));
for (const name of ['shared-master', 'neutral', 'time-travel']) {
  test(`${name}: setup binding and planted/airborne feet remain valid`, () => {
    const data = normalizeRig({ ...JSON.parse(readFileSync(new URL(`../../src/data/${name}.rig.json`, import.meta.url), 'utf8')), clips: library.clips });
    const setup = new Skeleton(data); setup.ikEnabled = false; setup.update({});
    const posed = new Skeleton(data); posed.update({ root: { y: 60 } });
    for (const contact of data.footPlants!) {
      assert.equal(posed.footContacts.get(contact.bone), 'planted');
      assert.ok(Math.abs(posed.rotation(contact.bone)) < 1e-6);
      const compression = posed.footSquashes.get(contact.bone)!;
      assert.ok(compression >= .96 && compression < 1);
      assert.ok(Math.abs(posed.origin(contact.bone).y + contact.soleHeight * compression - data.groundY) < 1e-6);
    }
    for (const part of data.parts.filter(p => p.mesh)) {
      // Real image dimensions from the committed asset manifest, not mock aspect ratios.
      const manifest = JSON.parse(readFileSync(new URL('../../assets/rigs/manifest.json', import.meta.url), 'utf8'));
      const asset = manifest.textures.find(a => a.path === data.textures[part.texture]);
      const bind = bindMesh(part, { width: asset.width, height: asset.height }, setup);
      const rest = deformMesh(bind, setup);
      rest.forEach((value, i) => assert.ok(Math.abs(value - bind.setup[i]) < 1e-3));
      for (const value of deformMesh(bind, posed)) assert.ok(Number.isFinite(value));
    }
    posed.update({ root: { y: 35 }, ik_leg_F: { x: -100, y: -75 } });
    assert.equal(posed.footContacts.get('leg_F_3'), 'airborne');
    assert.equal(posed.footContacts.get('leg_B_3'), 'planted');
    assert.equal(posed.footSquashes.get('leg_F_3'), 1);
    posed.ikEnabled = false; posed.update({});
    assert.equal(posed.footContacts.size, 0);
  });
}

test('plant keys are discrete and survive crossfade; shared idle plays on the runtime', () => {
  const clip = { name: 'contact', type: 'other', duration: 2, loop: false,
    bones: { leg_F_3: { plant: [{ time: 0, value: 1 }, { time: 1, value: 0 }] } } };
  assert.equal(sampleClip(clip, .9).leg_F_3.plant, 1);
  assert.equal(sampleClip(clip, 1).leg_F_3.plant, 0);
  assert.equal(blendPose(sampleClip(clip, .9), sampleClip(clip, 1), .75).leg_F_3.plant, 0);
  const state = new AnimationState(); state.play(library.clips[0]); state.update(.5);
  assert.ok(Object.keys(state.pose()).length > 0);
});
