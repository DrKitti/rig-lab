import assert from 'node:assert/strict';
import { groupBlend, jointBlend, setGroupBlend, setJointBlend } from '../../src/editor/meshSettings.ts';
import type { RigData } from '../../src/rig/core/types.ts';

const arm = { child: 'forearm', blend: 40 };
setJointBlend(arm, 0, 24);
assert.equal(jointBlend(arm), 24);
const leg = { child: 'shin', chain: ['foot'], blend: 8, blends: [8, 160] };
setJointBlend(leg, 0, 40);
assert.deepEqual(leg.blends, [40, 160]);
setJointBlend(leg, 1, 120);
assert.deepEqual(leg.blends, [40, 120]);
assert.equal(leg.blend, 40);
const inherited = { child: 'shin', chain: ['foot'], blend: 8 };
setJointBlend(inherited, 0, 24);
assert.equal(jointBlend(inherited, 1), 8, 'Editing knee must not change inherited ankle');
setJointBlend(inherited, 1, -10);
assert.equal(jointBlend(inherited, 1), 1);
assert.throws(() => setJointBlend(arm, 1, 30));
assert.throws(() => setJointBlend(arm, 0, NaN));
assert.throws(() => setJointBlend(arm, 0, Infinity));
const rig = { parts: [
  { name: 'arm_F', mesh: { child: 'a', blend: 40 } },
  { name: 'arm_B', mesh: { child: 'b', blend: 64 } },
  { name: 'leg_F', mesh: { child: 'c', chain: ['d'], blend: 8, blends: [8, 160] } },
  { name: 'leg_B', mesh: { child: 'e', chain: ['f'], blend: 8, blends: [8, 120] } },
] } as unknown as RigData;
assert.equal(groupBlend(rig, 'elbow'), 'mixed');
setGroupBlend(rig, 'elbow', 24);
assert.equal(groupBlend(rig, 'elbow'), 24);
setGroupBlend(rig, 'knee', 40);
assert.equal(groupBlend(rig, 'knee'), 40);
assert.equal(groupBlend(rig, 'foot'), 'mixed', 'Paired knees must not overwrite ankle widths');
setGroupBlend(rig, 'foot', 160);
assert.equal(groupBlend(rig, 'foot'), 160);
assert.equal(groupBlend(rig, 'knee'), 40);
const clone = structuredClone(rig); setGroupBlend(clone, 'elbow', 96);
assert.equal(groupBlend(rig, 'elbow'), 24, 'Preview must not mutate live rig');
console.log('mesh settings: independent joints, override precedence, fallback and validation passed');
