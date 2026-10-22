import type { Pose, RigData } from '../rig/core/types';
import type { BlendGroup } from './meshSettings';

/** Preview knee flexion follows the rig's real IK bend convention, not the arm's. */
export function blendPreviewPose(rig: RigData, group: BlendGroup, angle: number): Pose {
  if (group === 'elbow') return { arm_F_2: { rotate: -angle }, arm_B_2: { rotate: angle } };
  const pose: Pose = {};
  for (const side of ['F', 'B']) {
    if (group === 'knee') {
      const lower = `leg_${side}_2`;
      const ik = rig.ik.find(constraint => constraint.bones[1] === lower);
      const bend = ik?.bend ?? 1;
      const upper = `leg_${side}_1`;
      const thigh = rig.bones.find(b => b.name === upper)?.length ?? 169;
      const shin = rig.bones.find(b => b.name === lower)?.length ?? 129;
      const flexion = Math.min(179, Math.abs(angle));
      const radians = flexion * Math.PI / 180;
      // Split flexion between thigh/shin like a planted-foot crouch. Rotating only
      // the shin by 90° also stress-folded the ankle, obscuring the knee comparison.
      const upperOffset = Math.atan2(shin * Math.sin(radians), thigh + shin * Math.cos(radians)) * 180 / Math.PI;
      pose[upper] = { rotate: -bend * upperOffset };
      pose[lower] = { rotate: bend * flexion };
    } else pose[`leg_${side}_3`] = { rotate: angle };
  }
  return pose;
}
