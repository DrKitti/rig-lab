import { apply, DEG, fromTRS, IDENTITY, multiply, rotationOf, type Mat } from './math';
import type { BoneData, IkData, PartData, Pose, RigData } from './types';

/**
 * Forward kinematics (setup pose + pose offsets → world matrix per bone), then two-bone IK.
 * Reads data.bones on every update, so bones may be edited between updates.
 */
export class Skeleton {
  readonly world = new Map<string, Mat>();
  readonly footContacts = new Map<string, 'planted' | 'airborne'>();
  readonly footSquashes = new Map<string, number>();
  /** Apply the rig's IK constraints after the pose (off for the setup pose meshes bind to). */
  ikEnabled = true;
  private byName = new Map<string, BoneData>();

  constructor(readonly data: RigData) {}

  bone(name: string): BoneData {
    const bone = this.byName.get(name) ?? this.data.bones.find((b) => b.name === name);
    if (!bone) throw new Error(`Unknown bone "${name}"`);
    return bone;
  }

  update(pose: Pose = {}): void {
    this.footContacts.clear();
    this.footSquashes.clear();
    this.byName = new Map(this.data.bones.map((b) => [b.name, b]));
    this.solveAll(pose);
    if (!this.ikEnabled) return;
    // IK: solve each constraint against the posed skeleton, then redo FK with the new angles.
    for (const ik of this.data.ik ?? []) {
      if ((ik.mix ?? 1) <= 0 || !ik.bones.every((n) => this.byName.has(n)) || !this.byName.has(ik.target)) continue;
      const contact = this.data.footPlants?.find(f => f.ik === ik.name && this.byName.has(f.bone));
      let target: { x: number; y: number } | undefined;
      let footSquash = 1;
      if (contact) {
        const at = this.origin(ik.target);
        const floorAnkle = this.data.groundY - contact.soleHeight;
        const mode = pose[contact.bone]?.plant ?? -1;
        const planted = mode < 0 ? at.y >= floorAnkle - 2 : mode >= .5;
        this.footContacts.set(contact.bone, planted ? 'planted' : 'airborne');
        if (planted) {
          const hip = this.origin(ik.bones[0]);
          const reach = this.bone(ik.bones[0]).length + this.bone(ik.bones[1]).length;
          const distance = Math.hypot(at.x - hip.x, floorAnkle - hip.y);
          const compression = Math.max(0, 1 - distance / Math.max(.001, reach));
          const load = Math.min(1, compression / Math.max(.001, contact.squashAt ?? .2));
          footSquash = 1 - Math.max(0, Math.min(.25, contact.squash ?? 0)) * load;
          target = { x: at.x, y: this.data.groundY - contact.soleHeight * footSquash };
        }
        this.footSquashes.set(contact.bone, footSquash);
      }
      pose = this.solveIk(ik, pose, target);
      this.solveAll(pose);
      if (contact && target) {
        const keyed = pose[contact.bone]?.rotate ?? 0;
        const desired = (contact.rotation ?? 0) + keyed;
        const delta = ((desired - this.rotation(contact.bone) + 540) % 360) - 180;
        const keyedScaleY = pose[contact.bone]?.scaleY ?? 1;
        pose = { ...pose, [contact.bone]: {
          ...pose[contact.bone], rotate: keyed + delta, scaleY: keyedScaleY * footSquash,
        } };
        this.solveAll(pose);
      }
    }
  }

  private solveAll(pose: Pose): void {
    this.world.clear();
    for (const bone of this.data.bones) this.solve(bone, pose, new Set());
  }

  /** Returns the pose with the IK bones' rotations replaced (blended by mix). */
  private solveIk(ik: IkData, pose: Pose, target?: { x: number; y: number }): Pose {
    const [upperName, lowerName] = ik.bones;
    const upper = this.bone(upperName);
    const lower = this.bone(lowerName);
    const p = this.origin(upperName);
    const k = this.origin(lowerName);
    const tip = this.tip(lowerName);
    const t = target ?? this.origin(ik.target);
    const l1 = Math.hypot(k.x - p.x, k.y - p.y);
    const l2 = Math.hypot(tip.x - k.x, tip.y - k.y);
    if (l1 < 1e-6 || l2 < 1e-6) return pose;
    const d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, Math.hypot(t.x - p.x, t.y - p.y)));
    const acos = (v: number) => Math.acos(Math.max(-1, Math.min(1, v)));
    const atUpper = acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
    const atJoint = acos((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2));
    // Directions shoulder→joint and joint→tip, in world degrees.
    const toJoint = Math.atan2(t.y - p.y, t.x - p.x) / DEG - ik.bend * (atUpper / DEG);
    const toTip = toJoint + ik.bend * (180 - atJoint / DEG);
    // The joint may sit off the upper bone's axis (lower.x/y); keep that offset.
    const offset = Math.atan2(lower.y, lower.x) / DEG;
    const upperLocal = toJoint - offset - rotationOf(this.parentWorld(upperName));
    const lowerLocal = toTip - (toJoint - offset);
    const mix = Math.min(1, ik.mix ?? 1);
    const blend = (name: string, setup: number, target: number) => {
      const keyed = pose[name]?.rotate ?? 0;
      const want = ((((target - setup - keyed + 180) % 360) + 360) % 360) - 180;
      return { ...pose[name], rotate: keyed + want * mix };
    };
    return {
      ...pose,
      [upperName]: blend(upperName, upper.rotation, upperLocal),
      [lowerName]: blend(lowerName, lower.rotation, lowerLocal),
    };
  }

  private solve(bone: BoneData, pose: Pose, visiting: Set<string>): Mat {
    const done = this.world.get(bone.name);
    if (done) return done;
    if (visiting.has(bone.name)) throw new Error(`Bone cycle at "${bone.name}"`);
    visiting.add(bone.name);

    const p = pose[bone.name] ?? {};
    const local = fromTRS(
      bone.x + (p.x ?? 0),
      bone.y + (p.y ?? 0),
      bone.rotation + (p.rotate ?? 0),
      (bone.scaleX ?? 1) * (p.scaleX ?? 1),
      (bone.scaleY ?? 1) * (p.scaleY ?? 1),
    );
    const parent = bone.parent ? this.byName.get(bone.parent) : undefined;
    let m = local;
    if (parent) {
      const pm = this.solve(parent, pose, visiting);
      if (bone.inheritRotation === false) {
        const at = apply(pm, local.tx, local.ty);
        m = { ...local, tx: at.x, ty: at.y };
      } else {
        m = multiply(pm, local);
      }
    }
    this.world.set(bone.name, m);
    return m;
  }

  worldOf(name: string): Mat {
    return this.world.get(name) ?? IDENTITY;
  }

  parentWorld(name: string): Mat {
    const parent = this.bone(name).parent;
    return parent ? this.worldOf(parent) : IDENTITY;
  }

  origin(name: string): { x: number; y: number } {
    const m = this.worldOf(name);
    return { x: m.tx, y: m.ty };
  }

  rotation(name: string): number {
    return rotationOf(this.worldOf(name));
  }

  tip(name: string): { x: number; y: number } {
    return apply(this.worldOf(name), this.bone(name).length, 0);
  }

  /** World matrix of a part's pivot (image rotation included). */
  partMatrix(part: PartData): Mat {
    return multiply(this.worldOf(part.bone), fromTRS(part.x ?? 0, part.y ?? 0, part.rotation));
  }
}
