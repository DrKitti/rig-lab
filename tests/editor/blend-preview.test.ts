import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blendPreviewPose } from '../../src/editor/blendPreview.ts';
import type { RigData } from '../../src/rig/core/types.ts';

for (const name of ['shared-master', 'neutral', 'time-travel']) {
  const rig = JSON.parse(readFileSync(new URL(`../../src/data/${name}.rig.json`, import.meta.url), 'utf8')) as RigData;
  const before = JSON.stringify(rig);
  for (const angle of [45, 90, 120]) {
    const pose = blendPreviewPose(rig, 'knee', angle);
    for (const ik of rig.ik) assert.equal(pose[ik.bones[1]]?.rotate, ik.bend * angle);
    for (const ik of rig.ik) {
      const l1 = rig.bones.find(b => b.name === ik.bones[0])!.length;
      const l2 = rig.bones.find(b => b.name === ik.bones[1])!.length;
      const a1 = (90 + pose[ik.bones[0]]!.rotate!) * Math.PI / 180;
      const a2 = a1 + pose[ik.bones[1]]!.rotate! * Math.PI / 180;
      assert.ok(Math.abs(l1 * Math.cos(a1) + l2 * Math.cos(a2)) < 1e-8, 'Ankle stays beneath hip in crouch preview');
    }
  }
  assert.equal(JSON.stringify(rig), before, 'Preview pose must not edit bones or saved attachments');
}
const custom = { bones: [], ik: [{ bones: ['leg_F_1', 'leg_F_2'], bend: -1 }] } as unknown as RigData;
const knee = blendPreviewPose(custom, 'knee', 90);
assert.equal(knee.leg_F_2?.rotate, -90); assert.equal(knee.leg_B_2?.rotate, 90);
assert.ok(knee.leg_F_1!.rotate! > 0); assert.ok(knee.leg_B_1!.rotate! < 0);
assert.deepEqual(blendPreviewPose(custom, 'elbow', 90), { arm_F_2: { rotate: -90 }, arm_B_2: { rotate: 90 } });
assert.deepEqual(blendPreviewPose(custom, 'foot', 20), { leg_F_3: { rotate: 20 }, leg_B_3: { rotate: 20 } });
console.log('Preview knee direction matches real IK on master, neutral and Time Travel; elbow/foot unchanged');
