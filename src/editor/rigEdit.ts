import { apply, invert, normalizeAngle, rotationOf } from '../rig/core/math';
import { Skeleton } from '../rig/core/skeleton';
import type { BoneData, IkData, PartData, RigData } from '../rig/core/types';

// Setup-pose edits on RigData, done in place. Structural edits keep bones and parts
// where they are on screen (world transform), the way Spine does when reparenting.

const NAME = /^[A-Za-z0-9_-]+$/;

interface Placement {
  x: number;
  y: number;
  rotation: number;
}

export function isValidName(name: string): boolean {
  return NAME.test(name);
}

function setupWorld(rig: RigData): Skeleton {
  const sk = new Skeleton(rig);
  sk.ikEnabled = false;
  sk.update();
  return sk;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

export function findBone(rig: RigData, name: string): BoneData {
  const bone = rig.bones.find((b) => b.name === name);
  if (!bone) throw new Error(`ไม่มีกระดูกชื่อ "${name}"`);
  return bone;
}

export function findPart(rig: RigData, name: string): PartData {
  const part = rig.parts.find((p) => p.name === name);
  if (!part) throw new Error(`ไม่มีชิ้นส่วนชื่อ "${name}"`);
  return part;
}

/** The switched-on IK constraint that drives this bone, if any. */
export function activeIk(rig: RigData, bone: string): IkData | undefined {
  return rig.ik.find((ik) => (ik.mix ?? 1) > 0 && ik.bones.includes(bone));
}

export function children(rig: RigData, name: string): BoneData[] {
  return rig.bones.filter((b) => b.parent === name);
}

/** True if `name` is `ancestor` or sits anywhere below it. */
export function isDescendant(rig: RigData, name: string, ancestor: string): boolean {
  for (let b: BoneData | undefined = findBone(rig, name); b; b = b.parent ? findBone(rig, b.parent) : undefined) {
    if (b.name === ancestor) return true;
  }
  return false;
}

function boneWorld(sk: Skeleton, name: string): Placement {
  const o = sk.origin(name);
  return { x: o.x, y: o.y, rotation: sk.rotation(name) };
}

/** Local placement that reproduces a world placement under `parent` (or as a root). */
function localUnder(sk: Skeleton, parent: string | undefined, world: Placement): Placement {
  if (!parent) return { x: round(world.x), y: round(world.y), rotation: normalizeAngle(world.rotation) };
  const m = sk.worldOf(parent);
  const p = apply(invert(m), world.x, world.y);
  return { x: round(p.x), y: round(p.y), rotation: normalizeAngle(world.rotation - rotationOf(m)) };
}

export function reparentBone(rig: RigData, name: string, newParent: string): void {
  const bone = findBone(rig, name);
  if (!bone.parent) throw new Error('เปลี่ยนพ่อของ root ไม่ได้');
  if (isDescendant(rig, newParent, name)) throw new Error(`"${newParent}" เป็น "${name}" เองหรือเป็นลูกของมัน — ตั้งเป็นพ่อไม่ได้`);
  const sk = setupWorld(rig);
  Object.assign(bone, localUnder(sk, newParent, boneWorld(sk, name)), { parent: newParent });
}

/** Moves a bone's origin to a rig-space point; its children follow. */
export function moveBone(rig: RigData, name: string, x: number, y: number): void {
  const bone = findBone(rig, name);
  const local = localUnder(setupWorld(rig), bone.parent, { x, y, rotation: 0 });
  bone.x = local.x;
  bone.y = local.y;
}

/** Points a bone at a rig-space point and stretches it to reach it. */
export function aimBone(rig: RigData, name: string, x: number, y: number): void {
  const bone = findBone(rig, name);
  const sk = setupWorld(rig);
  const o = sk.origin(name);
  const angle = (Math.atan2(y - o.y, x - o.x) * 180) / Math.PI;
  bone.rotation = normalizeAngle(angle - rotationOf(sk.parentWorld(name)));
  bone.length = Math.max(1, Math.round(Math.hypot(x - o.x, y - o.y)));
}

function uniqueName(taken: string[], base: string): string {
  for (let i = 1; ; i++) {
    const name = `${base}_${i}`;
    if (!taken.includes(name)) return name;
  }
}

/** Adds a child at the parent's tip, continuing in the parent's direction. Returns its name. */
export function addBone(rig: RigData, parent: string): string {
  const p = findBone(rig, parent);
  const name = uniqueName(
    rig.bones.map((b) => b.name),
    'bone',
  );
  rig.bones.push({ name, parent, x: p.length, y: 0, rotation: 0, length: Math.max(40, Math.round(p.length / 2)) });
  return name;
}

/** Deletes a bone; its children and parts move to its parent, staying where they are. Its keys are dropped. */
export function deleteBone(rig: RigData, name: string): void {
  const bone = findBone(rig, name);
  if (!bone.parent) throw new Error('ลบ root ไม่ได้');
  for (const child of children(rig, name)) reparentBone(rig, child.name, bone.parent);
  for (const part of rig.parts.filter((p) => p.bone === name)) setPartBone(rig, part.name, bone.parent);
  rig.bones.splice(rig.bones.indexOf(bone), 1);
  rig.ik = rig.ik.filter((ik) => !ik.bones.includes(name) && ik.target !== name);
  for (const clip of rig.clips) delete clip.bones[name];
}

export function renameBone(rig: RigData, from: string, to: string): void {
  if (from === to) return;
  if (!isValidName(to)) throw new Error('ชื่อใช้ได้แค่ a-z, 0-9, _ และ -');
  if (rig.bones.some((b) => b.name === to)) throw new Error(`มีกระดูกชื่อ "${to}" อยู่แล้ว`);
  findBone(rig, from).name = to;
  for (const b of rig.bones) if (b.parent === from) b.parent = to;
  for (const p of rig.parts) {
    if (p.bone === from) p.bone = to;
    if (p.mesh?.child === from) p.mesh.child = to;
    if (p.mesh?.chain) p.mesh.chain = p.mesh.chain.map((n) => (n === from ? to : n));
  }
  for (const ik of rig.ik) {
    ik.bones = ik.bones.map((n) => (n === from ? to : n)) as [string, string];
    if (ik.target === from) ik.target = to;
  }
  for (const clip of rig.clips) {
    if (clip.bones[from]) {
      clip.bones[to] = clip.bones[from];
      delete clip.bones[from];
    }
  }
}

function partWorld(sk: Skeleton, part: PartData): Placement {
  const m = sk.partMatrix(part);
  return { x: m.tx, y: m.ty, rotation: rotationOf(m) };
}

function placePart(part: PartData, local: Placement): void {
  part.x = local.x;
  part.y = local.y;
  part.rotation = local.rotation;
}

/** Attaches a part to another bone without moving it on screen. */
export function setPartBone(rig: RigData, name: string, bone: string): void {
  const part = findPart(rig, name);
  const sk = setupWorld(rig);
  placePart(part, localUnder(sk, bone, partWorld(sk, part)));
  part.bone = bone;
}

/** Moves a part's pivot to a rig-space point (the image moves with it). */
export function movePart(rig: RigData, name: string, x: number, y: number): void {
  const part = findPart(rig, name);
  const sk = setupWorld(rig);
  placePart(part, localUnder(sk, part.bone, { x, y, rotation: partWorld(sk, part).rotation }));
}

/**
 * Moves the part's pivot onto its bone's origin without moving the image:
 * the image pixel currently under the bone origin becomes the new pivot.
 */
export function snapPivotToBone(rig: RigData, name: string, size: { width: number; height: number }): void {
  const part = findPart(rig, name);
  const sk = setupWorld(rig);
  const b = sk.origin(part.bone);
  const local = apply(invert(sk.partMatrix(part)), b.x, b.y);
  part.originX = Math.round((part.originX + local.x / size.width) * 10000) / 10000;
  part.originY = Math.round((part.originY + local.y / size.height) * 10000) / 10000;
  part.rotation = normalizeAngle(partWorld(sk, part).rotation - sk.rotation(part.bone));
  delete part.x;
  delete part.y;
}

export function renamePart(rig: RigData, from: string, to: string): void {
  if (from === to) return;
  if (!isValidName(to)) throw new Error('ชื่อใช้ได้แค่ a-z, 0-9, _ และ -');
  if (rig.parts.some((p) => p.name === to)) throw new Error(`มีชิ้นส่วนชื่อ "${to}" อยู่แล้ว`);
  findPart(rig, from).name = to;
  rig.drawOrder = rig.drawOrder.map((n) => (n === from ? to : n));
}

/** Moves a part within the draw order. Index 0 is the back. */
export function reorderPart(rig: RigData, name: string, index: number): void {
  const order = rig.drawOrder.filter((n) => n !== name);
  order.splice(Math.max(0, Math.min(order.length, index)), 0, name);
  rig.drawOrder = order;
}
