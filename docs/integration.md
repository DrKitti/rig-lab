# Integrating the rig into Kolahon (Phaser)

This document describes an adapter boundary, not an implemented Phaser plugin.
Start with [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md); keep the destination game's architecture.

## Transfer choices

For the smallest game integration use `npm run export:runtime`. Its new folder under `dist/`
contains `runtime/`, three `rigs/*.rig.json`, referenced `assets/`, shared `animations/`,
specifications and an SHA256 export inventory. Rigs contain resolved clips.

For continued tooling development, merge/vendor this repo into a scoped tool directory instead.
Keep its Vite server/editor/Pixi dependencies separate from the Phaser game build. Do not overwrite
the destination package.json, AGENTS.md or game assets. No root paths or machine-specific drives
are needed by the portable runtime. Import paths in the TypeScript core are relative and extensionless,
intended for a normal TypeScript bundler.

## Reuse / adapt / do not ship

| Area | Integration action |
|---|---|
| `src/rig/core/*` | Reuse as one engine-free TypeScript module; public entry `index.ts` |
| `src/data/*.rig.json` | Use exported hydrated JSON, or resolve `animationLibrary` yourself before `normalizeRig` |
| `assets/rigs`, `assets/characters` | Copy selected assets with relative path mapping or your loader's equivalent |
| `src/rig/pixi/SkeletonView.ts` | Read as the reference renderer; implement equivalent Phaser mesh/sprite adapter |
| `src/server`, Vite config | Local authoring only; not a game server API |
| `src/editor`, `qa` | Tooling and parity checks; optional separate app |
| `tools`, Python deps | Offline generation/fitting/colour processing only |
| `assets/experiments`, `docs/archive`, third-party refs | Research history; do not bundle as gameplay assets |

## Data and coordinates

Y points down; rotations are degrees. A bone points along local +X. Setup transforms are
parent-relative. Pose `rotate/x/y` are offsets from setup, and scale channels are factors.
Matrices use `{a,b,c,d,tx,ty}`: x'=a*x+c*y+tx; y'=b*x+d*y+ty.
`partMatrix` includes the bone and attachment transform, not the image anchor translation.
For rigid sprites apply `originX/Y` to the image, then the part matrix.

Rig units are source pixels. Apply camera/game scale, mirror/facing and world placement to one
outer container, not independently to limb lengths. The root bone's setup y=-107 is not world origin.
Ground y=231 is a rig-local baseline. Map that baseline to the game's contact position explicitly.

Load images at original dimensions before binding. Atlas trimming/resizing changes the relationship
between normalized origins, UVs and source pixels. Preserve untrimmed dimensions or adapt UV/anchor
math deliberately. The current example uses separate RGBA PNGs, not a tested game atlas pipeline.

## Runtime sequence

```ts
import { normalizeRig, Skeleton, AnimationState, bindMesh, deformMesh } from './runtime';

// rawRig here is an exported/hydrated rig with real clips included.
const rig = normalizeRig(rawRig);
const setup = new Skeleton(rig);
setup.ikEnabled = false;
setup.update({});

// textureSizes is provided by the game loader, keyed like rig.textures.
const binds = new Map(rig.parts.filter(p => p.mesh).map(part => [
  part.name, bindMesh(part, textureSizes.get(part.texture)!, setup),
]));
const skeleton = new Skeleton(rig);
const animation = new AnimationState();
animation.play(rig.clips.find(c => c.name === 'idle')!);

function update(deltaSeconds: number) {
  animation.update(deltaSeconds); // Convert Phaser's millisecond delta to seconds.
  skeleton.update(animation.pose()); // FK, leg IK, foot orientation and compression.
  for (const name of rig.drawOrder) {
    const part = rig.parts.find(p => p.name === name)!;
    const bind = binds.get(name);
    if (bind) {
      const xy = deformMesh(bind, skeleton); // May reuse an output buffer; see mesh.ts.
      // Submit xy, bind.uvs and bind.indices to the Phaser mesh adapter.
    } else {
      const matrix = skeleton.partMatrix(part);
      // Apply matrix, texture and normalized image anchor to a rigid game sprite.
    }
  }
}
```

The actual adapter must render textured triangles with the supplied indices, UVs and draw order.
Check culling/winding, depth ordering, alpha blending and per-part tint. A chain of rotated rigid
sprites will not reproduce the elbow/knee deformation. Avoid applying part transforms twice:
deformed mesh vertices are already in rig space. Bind once for a frozen outfit; rebind only after
setup/attachment/mesh/texture-size changes. The editor rebinds each update because setup is editable;
that cost need not be copied into the game.

`normalizeRig` does not fetch libraries; unresolved clips default to an empty idle. Always use
resolved exports or load the shared clips yourself. `AnimationState` handles clip time/loop and
crossfade, but it does not apply `rootMotion` to a physics body or choose gameplay animation states.

## Feet and limitations

Each leg has thigh/shin/foot; the two-bone IK target is a separate root-level bone.
In setup inspection/binding disable IK. In planted poses lower `root` while ankle targets remain
on the rig floor; move an IK target up or use a discrete `plant: 0` key to lift a foot.
Planted feet level their angle and compress up to 4%, compensating ankle height to keep soles grounded.

This is a flat-floor rig-space contact system. It does not pin a world-space footprint while the
actor translates, handle moving platforms/slopes or query collision geometry. The game needs a
separate world-to-rig target/contact adapter if those features are required. Targets beyond reach
still clamp through the IK solver; foot plant cannot promise contact outside the leg's reach.

## Acceptance before production

Compare the same rig/pose and unscaled texture sizes against `/qa/` in Rig Lab:

1. Setup identical silhouette/anchors/layer order.
2. Elbow and knee bends: correct direction, finite mesh, no seams/gaps.
3. Planted crouch and one airborne foot: sole height, angle and compression.
4. Torso counter-rotation and shared idle: no attachment drift.
5. Swap Neutral/Time Travel with the same animation and preserve skeleton geometry.
6. Repeat at intended game resolution/facing/camera scale, then profile mesh CPU/GPU cost.

Only after parity and the second-outfit proof finalize atlas layout, production asset selection,
animation state/collider ownership and accessory layers. Do not rename bones or regenerate a
costume-specific skeleton just to make the first Phaser render look plausible.
