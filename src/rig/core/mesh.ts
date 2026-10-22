import { apply, invert, multiply, rotationOf, type Mat } from './math';
import type { Skeleton } from './skeleton';
import type { MeshDef, PartData } from './types';

const DEFAULT_COLS = 3;
const DEFAULT_ROWS = 16;
const DEFAULT_BLEND = 40;

/** A part's mesh in its setup pose: grid vertices, UVs, triangles and per-bone weights. */
export interface MeshBind {
  /** Vertex positions in rig space, setup pose (x, y pairs). */
  setup: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  /** Bones down the limb: the part's bone, `child`, then `chain`. */
  bones: string[];
  /** Weight of each bone per vertex: weights[vertex * bones.length + bone]. */
  weights: Float32Array;
  /** Inverse setup world matrices of the bones. */
  inverseBind: Mat[];
}

/** The bones a mesh is skinned to, upper to lower. */
export function meshBones(part: PartData, mesh: MeshDef = part.mesh!): string[] {
  return [part.bone, mesh.child, ...(mesh.chain ?? [])];
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Builds the mesh for a part from the setup pose. `setup` must be a skeleton updated with no pose.
 * At each joint (the origin of the next bone), weights pass from one bone to the next by how far
 * a vertex lies past the joint along the bone above it.
 */
export function bindMesh(part: PartData, size: { width: number; height: number }, setup: Skeleton): MeshBind {
  const mesh = part.mesh!;
  const cols = Math.max(2, mesh.cols ?? DEFAULT_COLS);
  const rows = Math.max(2, mesh.rows ?? DEFAULT_ROWS);
  const bones = meshBones(part, mesh);
  const k = bones.length;
  const partM = setup.partMatrix(part);
  const joints = bones.slice(1).map((name, j) => {
    const a = (rotationOf(setup.worldOf(bones[j])) * Math.PI) / 180;
    return { origin: setup.origin(name), ux: Math.cos(a), uy: Math.sin(a), blend: mesh.blends?.[j] ?? mesh.blend ?? DEFAULT_BLEND,
      rigidFoot: !!mesh.rigidFoot && j === bones.length - 2 };
  });
  /** How far (0..1) a point has passed a joint, along the bone above it. */
  const passed = (j: (typeof joints)[number], x: number, y: number) =>
    smoothstep(-Math.max(.001, j.blend) / 2,
      j.rigidFoot ? 0 : Math.max(.001, j.blend) / 2,
      (x - j.origin.x) * j.ux + (y - j.origin.y) * j.uy);

  const n = cols * rows;
  const setupPos = new Float32Array(n * 2);
  const uvs = new Float32Array(n * 2);
  const weights = new Float32Array(n * k);
  /** Continuous bone index per vertex (0 = upper, 1 = next, …); used for draw order. */
  const level = new Float32Array(n);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const u = c / (cols - 1);
      const v = r / (rows - 1);
      // Image pixel → part-local (pivot at origin) → rig space.
      const p = apply(partM, (u - part.originX) * size.width, (v - part.originY) * size.height);
      setupPos[i * 2] = p.x;
      setupPos[i * 2 + 1] = p.y;
      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
      // reach = how far past each joint this vertex is (0..1); bone b keeps what the next joint hasn't taken.
      let reach = 1;
      for (let b = 0; b < k; b++) {
        const j = joints[b];
        const t = j ? passed(j, p.x, p.y) : 0;
        weights[i * k + b] = reach * (1 - t);
        level[i] += b * reach * (1 - t);
        reach *= t;
      }
    }
  }

  // Draw order when bent: stretched blend-zone triangles at the back (they only fill the outer
  // corners), then the rigid sections, with `front` deciding whether lower sections cover upper ones.
  const childFront = (mesh.front ?? 'child') === 'child';
  const layer = (lv: number) => {
    const nearest = Math.round(lv);
    if (Math.abs(lv - nearest) > 0.02) return 0;
    return 1 + (childFront ? nearest : k - 1 - nearest);
  };
  const quads: { tri: number[]; layer: number }[] = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const lv = (level[a] + level[a + 1] + level[a + cols] + level[a + cols + 1]) / 4;
      quads.push({ tri: [a, a + 1, a + cols, a + 1, a + cols + 1, a + cols], layer: layer(lv) });
    }
  }
  quads.sort((p, q) => p.layer - q.layer);
  return {
    setup: setupPos,
    uvs,
    indices: new Uint32Array(quads.flatMap((q) => q.tri)),
    bones,
    weights,
    inverseBind: bones.map((b) => invert(setup.worldOf(b))),
  };
}

/** Linear-blend skinning: posed vertex positions in rig space. */
export function deformMesh(bind: MeshBind, posed: Skeleton, out?: Float32Array): Float32Array {
  const result = out ?? new Float32Array(bind.setup.length);
  const k = bind.bones.length;
  const mats = bind.bones.map((b, i) => multiply(posed.worldOf(b), bind.inverseBind[i]));
  for (let i = 0; i < bind.setup.length / 2; i++) {
    const x = bind.setup[i * 2];
    const y = bind.setup[i * 2 + 1];
    let ox = 0;
    let oy = 0;
    for (let b = 0; b < k; b++) {
      const w = bind.weights[i * k + b];
      if (w === 0) continue;
      const p = apply(mats[b], x, y);
      ox += p.x * w;
      oy += p.y * w;
    }
    result[i * 2] = ox;
    result[i * 2 + 1] = oy;
  }
  return result;
}

/** UV (0..1) under a rig-space point if it lies on the deformed mesh, else null. */
export function meshUvAt(bind: MeshBind, positions: Float32Array, x: number, y: number): { u: number; v: number } | null {
  const idx = bind.indices;
  for (let t = 0; t < idx.length; t += 3) {
    const [i0, i1, i2] = [idx[t], idx[t + 1], idx[t + 2]];
    const ax = positions[i0 * 2], ay = positions[i0 * 2 + 1];
    const bx = positions[i1 * 2], by = positions[i1 * 2 + 1];
    const cx = positions[i2 * 2], cy = positions[i2 * 2 + 1];
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(det) < 1e-9) continue;
    const l0 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / det;
    const l1 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / det;
    const l2 = 1 - l0 - l1;
    if (l0 < 0 || l1 < 0 || l2 < 0) continue;
    return {
      u: l0 * bind.uvs[i0 * 2] + l1 * bind.uvs[i1 * 2] + l2 * bind.uvs[i2 * 2],
      v: l0 * bind.uvs[i0 * 2 + 1] + l1 * bind.uvs[i1 * 2 + 1] + l2 * bind.uvs[i2 * 2 + 1],
    };
  }
  return null;
}
