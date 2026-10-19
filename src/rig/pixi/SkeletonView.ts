import { Assets, Container, Matrix, MeshSimple, Sprite, Texture } from 'pixi.js';
import { apply, invert } from '../core/math';
import { bindMesh, deformMesh, meshBones, meshUvAt, type MeshBind } from '../core/mesh';
import { Skeleton } from '../core/skeleton';
import type { PartData, Pose, RigData } from '../core/types';

interface AlphaMap {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Textures for a rig, plus alpha maps for pixel-accurate picking. */
export interface RigTextures {
  textures: Map<string, Texture>;
  alpha: Map<string, AlphaMap>;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

async function alphaMap(url: string): Promise<AlphaMap> {
  const img = await loadImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const data = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4 + 3];
  return { width: canvas.width, height: canvas.height, data };
}

/** Loads every texture the rig names. Paths are relative to `baseUrl`. */
export async function loadRigTextures(data: RigData, baseUrl = '/', withAlpha = false): Promise<RigTextures> {
  const out: RigTextures = { textures: new Map(), alpha: new Map() };
  await Promise.all(
    Object.entries(data.textures).map(async ([key, path]) => {
      const url = baseUrl + path;
      out.textures.set(key, await Assets.load<Texture>(url));
      if (withAlpha) out.alpha.set(key, await alphaMap(url));
    }),
  );
  return out;
}

const scratch = new Matrix();

/** A part drawn rigidly (sprite) or bent along a chain of bones (mesh). */
type Drawn =
  | { kind: 'sprite'; obj: Sprite }
  | { kind: 'mesh'; obj: MeshSimple; bind: MeshBind; positions: Float32Array; shape: string };

/**
 * Draws a rig with PixiJS: one sprite or skinned mesh per part, kept in draw order.
 * The data may be edited between update() calls (the editor does this).
 */
export class SkeletonView extends Container {
  readonly skeleton: Skeleton;
  /** The skeleton in its setup pose; meshes are bound against it. */
  private readonly setup: Skeleton;
  private readonly drawn = new Map<string, Drawn>();

  constructor(
    readonly data: RigData,
    private readonly assets: RigTextures,
  ) {
    super();
    this.skeleton = new Skeleton(data);
    this.setup = new Skeleton(data);
    this.setup.ikEnabled = false;
  }

  update(pose?: Pose): void {
    this.setup.update();
    this.skeleton.update(pose);
    this.syncDrawn();
    for (const part of this.data.parts) {
      const d = this.drawn.get(part.name)!;
      if (d.kind === 'sprite') {
        const m = this.skeleton.partMatrix(part);
        scratch.set(m.a, m.b, m.c, m.d, m.tx, m.ty);
        d.obj.setFromMatrix(scratch);
      } else {
        // Re-bind every update: setup edits in the editor change the bind pose.
        d.bind = bindMesh(part, this.partSize(part.name)!, this.setup);
        deformMesh(d.bind, this.skeleton, d.positions);
        d.obj.vertices = d.positions;
      }
    }
  }

  /** Deformed mesh triangles (rig space) for a part, for drawing a wireframe. */
  meshOf(name: string): { positions: Float32Array; indices: Uint32Array } | null {
    const d = this.drawn.get(name);
    return d?.kind === 'mesh' ? { positions: d.positions, indices: d.bind.indices } : null;
  }

  partSize(name: string): { width: number; height: number } | null {
    const part = this.data.parts.find((p) => p.name === name);
    const tex = part && this.assets.textures.get(part.texture);
    return tex ? { width: tex.width, height: tex.height } : null;
  }

  /** Front-most part with an opaque pixel at a rig-space point. Needs alpha maps. */
  partAt(x: number, y: number): string | null {
    const order = this.orderedParts();
    for (let i = order.length - 1; i >= 0; i--) {
      const part = order[i];
      const map = this.assets.alpha.get(part.texture);
      const d = this.drawn.get(part.name);
      if (!map || !d || !this.visible) continue;
      let px: number;
      let py: number;
      if (d.kind === 'mesh') {
        const uv = meshUvAt(d.bind, d.positions, x, y);
        if (!uv) continue;
        px = Math.floor(uv.u * map.width);
        py = Math.floor(uv.v * map.height);
      } else {
        const local = apply(invert(this.skeleton.partMatrix(part)), x, y);
        px = Math.floor(local.x + part.originX * map.width);
        py = Math.floor(local.y + part.originY * map.height);
      }
      if (px < 0 || py < 0 || px >= map.width || py >= map.height) continue;
      if (map.data[py * map.width + px] > 40) return part.name;
    }
    return null;
  }

  /** Parts back to front; parts missing from drawOrder go on top. */
  orderedParts(): PartData[] {
    const rank = new Map(this.data.drawOrder.map((name, i) => [name, i]));
    return [...this.data.parts].sort((a, b) => (rank.get(a.name) ?? Infinity) - (rank.get(b.name) ?? Infinity));
  }

  /** A mesh is used only when all its bones exist; otherwise the part falls back to a sprite. */
  private wantsMesh(part: PartData): boolean {
    if (!part.mesh) return false;
    const names = new Set(this.data.bones.map((b) => b.name));
    return meshBones(part).every((b) => names.has(b));
  }

  private syncDrawn(): void {
    const wanted = new Set(this.data.parts.map((p) => p.name));
    for (const [name, d] of this.drawn) {
      if (!wanted.has(name)) {
        d.obj.destroy();
        this.drawn.delete(name);
      }
    }
    this.orderedParts().forEach((part, index) => {
      const texture = this.assets.textures.get(part.texture) ?? Texture.EMPTY;
      const mesh = this.wantsMesh(part);
      const shape = mesh ? `${part.mesh!.cols ?? ''}x${part.mesh!.rows ?? ''}` : '';
      let d = this.drawn.get(part.name);
      // Rebuild when switching sprite ↔ mesh or when the grid size changes.
      if (d && (d.kind === 'mesh') !== mesh || (d?.kind === 'mesh' && d.shape !== shape)) {
        d!.obj.destroy();
        this.drawn.delete(part.name);
        d = undefined;
      }
      if (!d) {
        if (mesh) {
          const bind = bindMesh(part, { width: texture.width, height: texture.height }, this.setup);
          const positions = new Float32Array(bind.setup);
          const obj = new MeshSimple({ texture, vertices: positions, uvs: bind.uvs, indices: bind.indices });
          d = { kind: 'mesh', obj, bind, positions, shape };
        } else {
          d = { kind: 'sprite', obj: new Sprite(texture) };
        }
        this.drawn.set(part.name, d);
        this.addChild(d.obj);
      }
      d.obj.texture = texture;
      if (d.kind === 'sprite') d.obj.anchor.set(part.originX, part.originY);
      d.obj.tint = part.tint ?? 0xffffff;
      if (this.getChildIndex(d.obj) !== index) this.setChildIndex(d.obj, index);
    });
  }
}
