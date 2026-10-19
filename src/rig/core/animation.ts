import type { BonePose, Channel, ClipData, Easing, Keyframe, Pose } from './types';

export const CHANNEL_DEFAULT: Record<Channel, number> = { rotate: 0, x: 0, y: 0, scaleX: 1, scaleY: 1 };

export function ease(easing: Easing | undefined, t: number): number {
  switch (easing) {
    case 'stepped':
      return 0;
    case 'easeIn':
      return t * t;
    case 'easeOut':
      return 1 - (1 - t) * (1 - t);
    case 'easeInOut':
      return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
    default:
      return t;
  }
}

/** Value of a channel at `time`; keys must be sorted by time. Holds the first/last value outside the keys. */
export function sampleChannel(keys: Keyframe[] | undefined, time: number): number | undefined {
  if (!keys || keys.length === 0) return undefined;
  if (time <= keys[0].time) return keys[0].value;
  const last = keys[keys.length - 1];
  if (time >= last.time) return last.value;
  let i = 0;
  while (keys[i + 1].time < time) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const t = ease(a.easing, (time - a.time) / (b.time - a.time));
  return a.value + (b.value - a.value) * t;
}

/** Clip time for a playhead that may run past the end (wraps when looping). */
export function wrapTime(clip: ClipData, time: number): number {
  if (clip.duration <= 0) return 0;
  if (clip.loop) return ((time % clip.duration) + clip.duration) % clip.duration;
  return Math.max(0, Math.min(clip.duration, time));
}

export function sampleClip(clip: ClipData, time: number): Pose {
  const pose: Pose = {};
  for (const [bone, timelines] of Object.entries(clip.bones)) {
    const bp: BonePose = {};
    for (const [channel, keys] of Object.entries(timelines) as [Channel, Keyframe[]][]) {
      const v = sampleChannel(keys, time);
      if (v !== undefined) bp[channel] = v;
    }
    pose[bone] = bp;
  }
  return pose;
}

/** Linear blend from pose a to pose b. */
export function blendPose(a: Pose, b: Pose, alpha: number): Pose {
  const out: Pose = {};
  for (const bone of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const pa = a[bone] ?? {};
    const pb = b[bone] ?? {};
    const bp: BonePose = {};
    for (const ch of new Set([...Object.keys(pa), ...Object.keys(pb)]) as Set<Channel>) {
      const va = pa[ch] ?? CHANNEL_DEFAULT[ch];
      const vb = pb[ch] ?? CHANNEL_DEFAULT[ch];
      bp[ch] = va + (vb - va) * alpha;
    }
    out[bone] = bp;
  }
  return out;
}

/** Plays clips for the game: looping, speed, and a short crossfade when switching clips. */
export class AnimationState {
  clip: ClipData | null = null;
  time = 0;
  speed = 1;
  private from: { clip: ClipData; time: number } | null = null;
  private mixTime = 0;
  private mixDuration = 0;

  play(clip: ClipData, mix = 0.12): void {
    if (this.clip === clip) return;
    this.from = this.clip && mix > 0 ? { clip: this.clip, time: this.time } : null;
    this.clip = clip;
    this.time = 0;
    this.mixTime = 0;
    this.mixDuration = mix;
  }

  update(dt: number): void {
    const step = dt * this.speed;
    this.time += step;
    if (this.from) {
      this.from.time += step;
      this.mixTime += step;
      if (this.mixTime >= this.mixDuration) this.from = null;
    }
  }

  get finished(): boolean {
    return !!this.clip && !this.clip.loop && this.time >= this.clip.duration;
  }

  pose(): Pose {
    if (!this.clip) return {};
    const pose = sampleClip(this.clip, wrapTime(this.clip, this.time));
    if (!this.from) return pose;
    const prev = sampleClip(this.from.clip, wrapTime(this.from.clip, this.from.time));
    return blendPose(prev, pose, this.mixTime / this.mixDuration);
  }
}
