import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorState } from '../../src/editor/state.ts';
import { normalizeRig } from '../../src/rig/core/types.ts';

test('shared refresh keeps a clean tab clean and retains its outfit data; dirty tabs are protected', () => {
  const rig = normalizeRig({ name: 'outfit', animationLibrary: 'shared', animationLibraryRevision: 1,
    bones: [], parts: [], textures: { torso: 'my-outfit.png' } });
  const state = new EditorState(rig);
  const incoming = structuredClone(rig);
  incoming.animationLibraryRevision = 2;
  incoming.clips[0].name = 'updated-idle';
  incoming.textures.torso = 'other-outfit.png';
  assert.equal(state.syncAnimationLibrary(incoming), true);
  assert.equal(state.dirty, false);
  assert.equal(state.clipName, 'updated-idle');
  assert.equal(rig.textures.torso, 'my-outfit.png');
  state.edit(() => { state.rig.clips[0].duration = 3; });
  incoming.animationLibraryRevision = 3;
  assert.equal(state.syncAnimationLibrary(incoming), false);
  assert.equal(state.rig.clips[0].duration, 3);
});
