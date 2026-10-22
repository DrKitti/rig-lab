import type { MeshDef, RigData } from '../rig/core/types';

export const BLEND_GROUPS = {
  elbow: { label: 'ศอก', icon: '💪', parts: ['arm_F', 'arm_B'], joint: 0, presets: [8, 16, 24, 40, 64, 96] },
  knee: { label: 'เข่า', icon: '🦵', parts: ['leg_F', 'leg_B'], joint: 0, presets: [8, 16, 24, 40, 64] },
  foot: { label: 'เท้า', icon: '🦶', parts: ['leg_F', 'leg_B'], joint: 1, presets: [40, 56, 80, 120, 160, 200] },
} as const;
export type BlendGroup = keyof typeof BLEND_GROUPS;

export function groupMeshes(rig: RigData, group: BlendGroup): MeshDef[] {
  const def = BLEND_GROUPS[group];
  return rig.parts.filter(p => (def.parts as readonly string[]).includes(p.name) && p.mesh &&
    def.joint < 1 + (p.mesh.chain?.length ?? 0)).map(p => p.mesh!);
}

/** Preserve mixed legacy values until the user explicitly chooses a paired preset. */
export function groupBlend(rig: RigData, group: BlendGroup): number | 'mixed' | undefined {
  const values = groupMeshes(rig, group).map(mesh => jointBlend(mesh, BLEND_GROUPS[group].joint));
  return !values.length ? undefined : values.every(v => v === values[0]) ? values[0] : 'mixed';
}

export function setGroupBlend(rig: RigData, group: BlendGroup, value: number): void {
  for (const mesh of groupMeshes(rig, group)) setJointBlend(mesh, BLEND_GROUPS[group].joint, value);
}

/** Effective width of one joint's blend band, including per-joint overrides. */
export function jointBlend(mesh: MeshDef, joint = 0): number {
  return mesh.blends?.[joint] ?? mesh.blend ?? 40;
}

/** Edit one joint without changing the other joints that inherited the old fallback. */
export function setJointBlend(mesh: MeshDef, joint: number, value: number): void {
  const count = 1 + (mesh.chain?.length ?? 0);
  if (!Number.isInteger(joint) || joint < 0 || joint >= count) throw new Error('ไม่มีข้อที่เลือกใน mesh นี้');
  if (!Number.isFinite(value)) throw new Error('blend ต้องเป็นตัวเลข');
  const widths = Array.from({ length: count }, (_, i) => jointBlend(mesh, i));
  widths[joint] = Math.max(1, value);
  if (joint === 0) mesh.blend = widths[0];
  if (count > 1 || mesh.blends) mesh.blends = widths;
}
