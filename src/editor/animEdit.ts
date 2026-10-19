import { CHANNEL_DEFAULT, sampleClip } from '../rig/core/animation';
import type { BonePose, Channel, ClipData, Easing, Keyframe, Pose, RigData } from '../rig/core/types';
import { isValidName } from './rigEdit';

// Keyframe and clip edits, done in place on RigData.

/** Keys are snapped to 1/30 s frames. */
export const FPS = 30;
const EPS = 1e-4;

export interface KeyRef {
  bone: string;
  channel: Channel;
  time: number;
}

export function snapTime(t: number): number {
  return Math.max(0, Math.round(t * FPS) / FPS);
}

export function findClip(rig: RigData, name: string): ClipData {
  const clip = rig.clips.find((c) => c.name === name);
  if (!clip) throw new Error(`ไม่มีท่าชื่อ "${name}"`);
  return clip;
}

function keysOf(clip: ClipData, bone: string, channel: Channel, create: boolean): Keyframe[] | undefined {
  const timelines = clip.bones[bone] ?? (create ? (clip.bones[bone] = {}) : undefined);
  if (!timelines) return undefined;
  return timelines[channel] ?? (create ? (timelines[channel] = []) : undefined);
}

/** Drops empty timelines so the saved file stays small. */
function prune(clip: ClipData, bone: string): void {
  const timelines = clip.bones[bone];
  if (!timelines) return;
  for (const ch of Object.keys(timelines) as Channel[]) if (!timelines[ch]?.length) delete timelines[ch];
  if (Object.keys(timelines).length === 0) delete clip.bones[bone];
}

export function keyAt(clip: ClipData, bone: string, channel: Channel, time: number): Keyframe | undefined {
  return keysOf(clip, bone, channel, false)?.find((k) => Math.abs(k.time - time) < EPS);
}

/** Creates or updates a key; an existing key keeps its easing. */
export function setKey(clip: ClipData, bone: string, channel: Channel, time: number, value: number): void {
  const keys = keysOf(clip, bone, channel, true)!;
  const t = snapTime(time);
  const existing = keys.find((k) => Math.abs(k.time - t) < EPS);
  const v = Math.round(value * 100) / 100;
  if (existing) existing.value = v;
  else {
    keys.push({ time: t, value: v, easing: 'easeInOut' });
    keys.sort((a, b) => a.time - b.time);
  }
}

export function deleteKeys(clip: ClipData, refs: KeyRef[]): void {
  for (const r of refs) {
    const keys = keysOf(clip, r.bone, r.channel, false);
    if (!keys) continue;
    const i = keys.findIndex((k) => Math.abs(k.time - r.time) < EPS);
    if (i >= 0) keys.splice(i, 1);
    prune(clip, r.bone);
  }
}

/** Shifts keys in time; a moved key replaces any key already at its destination. Returns the new refs. */
export function moveKeys(clip: ClipData, refs: KeyRef[], dt: number): KeyRef[] {
  const moving = refs
    .map((r) => ({ r, key: keyAt(clip, r.bone, r.channel, r.time) }))
    .filter((m): m is { r: KeyRef; key: Keyframe } => !!m.key);
  const minTime = Math.min(...moving.map((m) => m.key.time));
  const shift = Math.max(dt, -minTime);
  const out: KeyRef[] = [];
  for (const { r, key } of moving) {
    const keys = keysOf(clip, r.bone, r.channel, false)!;
    keys.splice(keys.indexOf(key), 1);
  }
  for (const { r, key } of moving) {
    const keys = keysOf(clip, r.bone, r.channel, true)!;
    const time = snapTime(key.time + shift);
    const clash = keys.findIndex((k) => Math.abs(k.time - time) < EPS);
    if (clash >= 0) keys.splice(clash, 1);
    keys.push({ ...key, time });
    keys.sort((a, b) => a.time - b.time);
    out.push({ ...r, time });
  }
  return out;
}

export function setEasing(clip: ClipData, refs: KeyRef[], easing: Easing): void {
  for (const r of refs) {
    const key = keyAt(clip, r.bone, r.channel, r.time);
    if (key) key.easing = easing;
  }
}

/** Every key in the clip, optionally only for some bones. */
export function allKeys(clip: ClipData, bones?: string[]): KeyRef[] {
  const out: KeyRef[] = [];
  for (const [bone, timelines] of Object.entries(clip.bones)) {
    if (bones && !bones.includes(bone)) continue;
    for (const [channel, keys] of Object.entries(timelines) as [Channel, Keyframe[]][]) {
      for (const k of keys) out.push({ bone, channel, time: k.time });
    }
  }
  return out;
}

/** Sorted distinct key times, optionally only for some bones. */
export function keyTimes(clip: ClipData, bones?: string[]): number[] {
  const times = allKeys(clip, bones).map((k) => k.time);
  return [...new Set(times.map((t) => Math.round(t * 10000) / 10000))].sort((a, b) => a - b);
}

/** Keys the bones' current values at `time` (every channel they already animate, plus rotate). */
export function keyBones(clip: ClipData, bones: string[], time: number): void {
  const pose = sampleClip(clip, time);
  for (const bone of bones) {
    const channels = new Set<Channel>(['rotate', ...(Object.keys(clip.bones[bone] ?? {}) as Channel[])]);
    for (const ch of channels) setKey(clip, bone, ch, time, pose[bone]?.[ch] ?? CHANNEL_DEFAULT[ch]);
  }
}

export function copyPose(clip: ClipData, time: number): Pose {
  return sampleClip(clip, time);
}

export function pastePose(clip: ClipData, time: number, pose: Pose, bones?: string[]): void {
  for (const [bone, bp] of Object.entries(pose) as [string, BonePose][]) {
    if (bones && !bones.includes(bone)) continue;
    for (const [ch, v] of Object.entries(bp) as [Channel, number][]) setKey(clip, bone, ch, time, v);
  }
}

function uniqueClipName(rig: RigData, base: string): string {
  if (!rig.clips.some((c) => c.name === base)) return base;
  for (let i = 2; ; i++) if (!rig.clips.some((c) => c.name === `${base}_${i}`)) return `${base}_${i}`;
}

export function addClip(rig: RigData, type: string): string {
  const name = uniqueClipName(rig, type);
  rig.clips.push({ name, type, duration: type === 'attack' || type === 'hit' ? 0.5 : 1, loop: type !== 'attack' && type !== 'hit' && type !== 'die', bones: {} });
  return name;
}

export function duplicateClip(rig: RigData, name: string): string {
  const src = findClip(rig, name);
  const copy: ClipData = JSON.parse(JSON.stringify(src));
  copy.name = uniqueClipName(rig, `${name}_copy`);
  rig.clips.splice(rig.clips.indexOf(src) + 1, 0, copy);
  return copy.name;
}

export function deleteClip(rig: RigData, name: string): void {
  if (rig.clips.length <= 1) throw new Error('ต้องมีอย่างน้อย 1 ท่า');
  rig.clips.splice(rig.clips.indexOf(findClip(rig, name)), 1);
}

export function renameClip(rig: RigData, from: string, to: string): void {
  if (from === to) return;
  if (!isValidName(to)) throw new Error('ชื่อใช้ได้แค่ a-z, 0-9, _ และ -');
  if (rig.clips.some((c) => c.name === to)) throw new Error(`มีท่าชื่อ "${to}" อยู่แล้ว`);
  findClip(rig, from).name = to;
}
