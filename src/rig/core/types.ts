// Rig data format, Spine-like. Stored as src/data/<name>.rig.json and shared by the game and the editor.
// Angles are degrees, a bone points along its local +x axis, y is down.
// Rig units are source-image pixels; the game scales the whole rig for display.

export interface BoneData {
  name: string;
  /** Parent bone name; omit for a root. */
  parent?: string;
  /** Setup pose, relative to the parent. */
  x: number;
  y: number;
  rotation: number;
  scaleX?: number;
  scaleY?: number;
  /** Distance from origin to tip; used for drawing, handles and (later) mesh bending. */
  length: number;
  /**
   * false = the bone follows its parent's position only; `rotation` is then a world angle
   * (e.g. a foot that stays flat on the ground while the shin tilts). Default true.
   */
  inheritRotation?: boolean;
  /**
   * The rotation as drawn on the full body, when the setup pose turned the bone away from it
   * (the arms: drawn out, rested down). Editor-only, to check the drawing; not used when posing.
   */
  drawnRotation?: number;
}

/** An image attached to a bone (Spine calls this a slot + region attachment). */
export interface PartData {
  name: string;
  /** Key into RigData.textures. */
  texture: string;
  bone: string;
  /** Image point (0..1) placed at the part's position; this is the part's pivot. */
  originX: number;
  originY: number;
  /** Image rotation relative to the bone (e.g. 90 for an upright image on an upward bone). */
  rotation: number;
  /** Pivot offset from the bone origin, in bone space. */
  x?: number;
  y?: number;
  /** Multiply tint (0xRRGGBB). */
  tint?: number;
  /** Bend the image across two bones (e.g. elbow, knee) instead of drawing it rigidly. */
  mesh?: MeshDef;
}

/**
 * A grid mesh over the part image, skinned along a chain of bones: `bone` (upper), `child`,
 * then any `chain` bones. Vertices past each joint follow the next bone; a band of `blend`
 * units around every joint mixes the two bones there, so each bend is smooth.
 */
export interface MeshDef {
  /** The bone below the part's bone (its child), e.g. arm_F_2 for an arm on arm_F_1. */
  child: string;
  /** Grid size: columns across the image, rows down it. */
  cols?: number;
  rows?: number;
  /**
   * More bones further down the same limb, each a child of the previous (e.g. a hand after the
   * forearm, a foot after the shin). The mesh then bends at every joint along the chain.
   */
  chain?: string[];
  /** Width of the soft band around the joint, in rig units. */
  blend?: number;
  /** Per-joint override of `blend`, in chain order (joint 0 = the `child` origin). */
  blends?: number[];
  /** End the last joint's blend at the ankle: vertices below it follow the foot fully. */
  rigidFoot?: boolean;
  /** Which side covers the fold when bent: 'child' (forearm over sleeve, default) or 'parent'. */
  front?: 'child' | 'parent';
}

/**
 * Two-bone IK (e.g. a leg): after the pose is applied, `bones` (upper, lower) are turned so the
 * lower bone's tip reaches the target bone's origin. Make the target a root bone (no parent)
 * so it stays put when the body moves: lowering `root` then bends the knees.
 */
export interface IkData {
  name: string;
  /** Upper and lower bone; the lower must be a child of the upper. */
  bones: [string, string];
  target: string;
  /** Which way the joint bends: 1 = the lower bone turns clockwise (a knee bending forward for a character facing right), -1 = the other way. */
  bend: 1 | -1;
  /** 0 = off (the bones keep their keyed rotation), 1 = fully on. */
  mix?: number;
}

export type Channel = 'rotate' | 'x' | 'y' | 'scaleX' | 'scaleY' | 'plant';
export const CHANNELS: readonly Channel[] = ['rotate', 'x', 'y', 'scaleX', 'scaleY', 'plant'];

/** Ankle target drives position; the foot bone controls the shoe's orientation. */
export interface FootPlantData {
  bone: string;
  ik: string;
  /** Distance from ankle to sole on a level floor, in rig units. */
  soleHeight: number;
  /** World foot-bone angle when the sole is level. */
  rotation?: number;
  /** Maximum planted vertical compression of the foot, as a fraction (e.g. .08 = 8%). */
  squash?: number;
  /** Leg shortening fraction that reaches maximum squash. Defaults to .2. */
  squashAt?: number;
}

/** Easing from a key to the next one. */
export type Easing = 'linear' | 'stepped' | 'easeIn' | 'easeOut' | 'easeInOut';
export const EASINGS: readonly Easing[] = ['linear', 'easeInOut', 'easeIn', 'easeOut', 'stepped'];

export interface Keyframe {
  time: number;
  /** Offset from the setup pose: degrees for rotate, units for x/y, a factor for scale. */
  value: number;
  easing?: Easing;
}

export type BoneTimelines = Partial<Record<Channel, Keyframe[]>>;

export interface ClipData {
  name: string;
  /** Game-facing category: idle, walk, run, attack, hit, die, … */
  type: string;
  /** Seconds. */
  duration: number;
  loop: boolean;
  /** Distance the character travels forward over one play of the clip (rig units). */
  rootMotion?: number;
  bones: Record<string, BoneTimelines>;
}

export interface RigData {
  name: string;
  /** Shared setup-geometry contract; absent on archived pre-neutral rigs. */
  skeletonVersion?: string;
  /** Shared animation library for this skeleton, resolved by the editor/server. */
  animationLibrary?: string;
  animationLibraryRevision?: number;
  /** Rig-space y of the ground line in the setup pose. */
  groundY: number;
  /** Texture key → image path relative to the project root. */
  textures: Record<string, string>;
  bones: BoneData[];
  parts: PartData[];
  /** Part names, back to front. */
  drawOrder: string[];
  /** IK constraints, applied in order after the pose. */
  ik: IkData[];
  /** Opt-in foot contacts. Pose channel plant: -1 automatic, 0 airborne, 1 planted. */
  footPlants?: FootPlantData[];
  clips: ClipData[];
}

/** Per-bone offsets from the setup pose (rotate/x/y add, scale multiplies). */
export type BonePose = Partial<Record<Channel, number>>;
export type Pose = Record<string, BonePose>;

export const CLIP_TYPES = ['idle', 'walk', 'run', 'attack', 'hit', 'die', 'other'] as const;

/** Fills defaults for files written by older versions. */
export function normalizeRig(raw: Partial<RigData> & Pick<RigData, 'name' | 'bones' | 'parts'>): RigData {
  const rig: RigData = {
    name: raw.name,
    ...(raw.skeletonVersion ? { skeletonVersion: raw.skeletonVersion } : {}),
    ...(raw.animationLibrary ? { animationLibrary: raw.animationLibrary, animationLibraryRevision: raw.animationLibraryRevision } : {}),
    groundY: raw.groundY ?? 0,
    textures: raw.textures ?? {},
    bones: raw.bones,
    parts: raw.parts,
    drawOrder: raw.drawOrder ?? raw.parts.map((p) => p.name),
    ik: raw.ik ?? [],
    ...(raw.footPlants ? { footPlants: raw.footPlants } : {}),
    clips: raw.clips ?? [],
  };
  if (rig.clips.length === 0) rig.clips.push({ name: 'idle', type: 'idle', duration: 1, loop: true, bones: {} });
  return rig;
}
