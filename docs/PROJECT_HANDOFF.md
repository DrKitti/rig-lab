# Receiving-agent handoff: Kolahon outfit experiments

This is the entry point for an agent integrating the outfit work into the main Kolahon game.
The experiment repository is a sandbox. The main Phaser project was unavailable here;
there is no evidence yet that these assets render correctly in Phaser or under gameplay conditions.

## Read in this order

1. This checkpoint and [integration boundaries](integration.md).
2. [Kolahon Outfit Pipeline — ชุดใหม่บนโครงเดียว](outfit-pipeline/standard.md).
   Before generating any part, also read [part-specific recipes and actual reference roles](outfit-pipeline/part-recipes.md).
3. [Experiment lessons and rejected approaches](experiments.md).
4. [Tooling / regeneration](outfit-pipeline/tooling.md) and [naming/ownership](outfit-pipeline/repository.md).
5. JSON specifications in `docs/rig-spec/`, then runtime and renderer source as needed.

See [verification evidence](verification.md) for the delivery checks and current Pixi screenshots.
The [main-branch file audit](repository-audit.md) explains what was kept, replaced and archived.

`docs/archive/` records old decisions, including contradictory intermediate settings.
Current specs and maintained rig JSON outrank those historical records. Do not infer a current
requirement from an old prompt's numbers or an archived filename containing `master`.

## What is here and what is selected

| Deliverable | Canonical location | Status |
|---|---|---|
| Shared setup rig | `src/data/shared-master.rig.json` | Frozen `neutral-c-v5` contract |
| Neutral assembled scaffold | `src/data/neutral.rig.json` | Accepted torso/arms/simple four-toe shared leg; colours matched |
| Time Travel assembled outfit | `src/data/time-travel.rig.json` | Selected torso, separate F/B arms and legs; complete material colour pass |
| Shared animations | `src/data/animations/neutral-c-v5.animations.json` | Current `idle` from Time Travel; original Hero idle preserved as alternate |
| Engine-free runtime | `src/rig/core/` | FK, pose sampling/crossfade, IK, mesh skinning; tests included |
| Existing renderer | `src/rig/pixi/SkeletonView.ts` | Pixi reference, including actual mesh rendering and picking |
| Rig editor | `src/editor/` | Setup, mesh blend previews, Animate, keys, shared-save/conflict handling |
| Reusable pipeline | `assets/pipeline/`, `tools/` | Guides, original sources, successful prompt cases, fit/colour recipes |
| Review evidence | `docs/outfit-pipeline/figures/`, `assets/experiments/evidence/` | Infographic, colour before/after, foot comparison and leg iteration evidence |

F is near/screen-left in the saved setup pose; B is far/screen-right.
The head is character identity, not part of a reusable outfit. Neutral and Time Travel share
the placeholder hero head; the older master head is retained separately. Skin matching follows
the actual equipped head, so changing character may require a new skin-colour pass.

## Invariants: do not silently change these while integrating

- Copy the shared skeleton unchanged across outfits. Keep stable bone names, local coordinates,
  rotations, lengths, parentage and image attachment matrices.
- Arm_B image placement (+12.195347 right / -6.001767 up from its old anchor) is independent
  of the accepted anatomical bone origin. Do not snap the image to the blue bone or add the offset twice.
- Root is at hip line y=-107. Torso/chest split is at waist y=-217, lengths 110 and 181.
- Hip-to-ankle length is 298: thigh 154.96, shin 143.04, knee 52%.
- Ankle joint is at malleolus y=191. Foot bone runs horizontally toward toe, length 75.
  Ground is y=231; sole offset 40. Do not move the ankle up to the cuff to protect the artwork.
- `plant` is discrete: -1 automatic, 0 airborne, 1 planted. Foot load max .04 at .2 leg shortening.
  `rigidFoot` remains; `rigidFootRise` was rejected and removed.
- Texture dimensions and normalized `originX/Y` are part of the binding. Colour edits keep
  dimensions/alpha unchanged. Different part textures cannot exchange normalized pivots blindly.
- Runtime draw order: arm_B, leg_B, leg_F, torso, head, arm_F.

The skeleton version identifier remains `neutral-c-v5` although canonical filenames were cleaned.
Renaming the contract or bone IDs to match prettier filenames would break compatibility.

## What is complete versus unproven

Completed experiment work: shared geometry selection, Neutral scaffold review, Time Travel
part generation and assembly, knee/foot iterations, shared animation editing, material palette
matching, runtime/editor checks and portable export. This is a selected prototype checkpoint.

Not complete:

- A second outfit generated end-to-end without modifying the shared skeleton. This is the next
  deliberate pipeline proof, not a task that already passed because Time Travel looks good.
- Phaser renderer/mesh implementation, asset loading in the real game and gameplay integration.
- Production walk/run/attack/hit/die animation set. Shared idle variants are not a full animation pack.
- Slopes, moving platforms, collision/terrain-aware foot contacts, stable world-space locomotion
  locks, physics/root-motion application and multiplayer state synchronization.
- Universal garment-volume guide, universal overlap distance or automatic material segmentation.
- Final alpha-fringe cleanup of every source, texture atlas packing, memory/performance profiling
  and production-resolution approval. The colour pass intentionally does not edit alpha.
- The legacy Shared Master's boot cuffs still shear noticeably in a deep planted crouch.
  Its old artwork/weights are a compatibility sample, not a newly approved costume deformation.
  Neutral and Time Travel are the relevant outfit-pipeline comparison; inspect their own limits too.
- Capes, extra front/back garment layers, cloth simulation and further accessory experiments.

## Pipeline authoring update — 2026-10-23

The [part recipes](outfit-pipeline/part-recipes.md) now explicitly separate how arms, torso
and legs were made. Do not substitute one method for another just because both use Neutral
and an approved costume image. Exact historical prompts and selected input/output evidence
are retained in [Time Travel examples](../assets/pipeline/examples/time-travel/README.md),
outside ignored drafts; the evidence manifest records sizes and hashes. Missing historical
markup/crop attachment records are disclosed, not presented as a fully reproducible bundle.

- **Arms:** use the corresponding raw Neutral arm as the **edit target**, approved full body
  as costume authority, and matching master arm as technical reach/hidden-shoulder reference.
  Preserve the drawn pose and anatomical relationships. F/B are separate calls and hand views,
  not mirrors. Do not replace the target with an upright runtime PNG as a loose reference.
- **Torso:** the selected Time Travel construction came from fresh reconstruction followed
  by targeted edits, not a proven one-shot cross-outfit recipe. Complete hidden torso design
  under F, while the moving sleeve/pauldron belongs to the arm. No projecting B receiver.
- **Legs:** F uses a garment envelope, costume crop, Neutral anatomy and full-body authority;
  B uses selected F for volume/finish plus its own far-side design. This is fresh reconstruction,
  not the arm edit recipe. Update guides to current frozen landmarks; do not copy old knee values.

The second-outfit dark-armor experiment remains **local draft work, not a promoted outfit**.
Torso v6/v7 are alternative construction directions awaiting assembly on the same skeleton:

- Both have no projecting arm_B receiver; preserve complete torso overlap over its hidden root.
- F v6 uses an inward-curving receiving edge; F v7 uses a broader sloping torso armor panel
  beneath the arm. Both need complete costume detail in occluded areas. Neither F solution
  is selected as the new standard yet; compare raised arms and torso bends for gaps or a
  second fixed shoulder/wing silhouette.
- The front hem must conceal the rear hem across the center **and both side corners**.
  Shorten/hide rear protrusions, rather than lengthening the front into the knees. Test hip/leg motion.
- These torso candidates are successive edits, not single-shot outputs from stable source refs.
  The construction guidance is recorded in the recipe doc; the draft PNGs are not runtime assets.
- The first armor-arm attempts deviated from the Time Travel recipe (upright loose anatomy
  reference, missing technical master); they look elongated/overdecorated and have alpha halos.
  They are not accepted examples and must not be integrated as approved arms.

Before each new call record recipe, generate/edit intent, exact input paths and roles, invariants
and output review status. Ask before changing a previously selected recipe/pose. The shared
skeleton and current runtime assets/animations are unchanged by this documentation update.

## Main-project integration sequence

1. Inspect the destination game's own architecture and instructions. Do not copy this repository's
   AGENTS.md, package.json or Vite app wholesale over the game.
2. Run this repository's checks and export. Vendor `runtime/` into a scoped game module and keep
   its renderer independence. See [integration.md](integration.md) for the exact interfaces.
3. Load one resolved exported rig and implement the renderer adapter; compare it against Pixi QA.
4. Validate setup, arm bend, knee bend, planted crouch, airborne foot and shared idle on both
   Neutral and Time Travel. Bind meshes with IK disabled; never bind to the animated pose.
5. Add the second-outfit proof while freezing the skeleton. Diagnose art/fit/weights separately
   if it fails. Do not modify the rig to compensate for a costume-generation problem.
6. Only after these gates decide production resolution, atlas/loader layout, runtime ownership,
   animation state integration and accessory layering with the main project's conventions.

## How state is saved

Rig files own outfit images, attachments, meshes, setup geometry and library link.
The animation library is authoritative for clips. Dev GET hydrates clips; Save writes outfit
data and the library; clean open tabs receive library refreshes. Dirty tabs retain work and
outdated revisions return HTTP 409 instead of overwriting newer clips. Export or reconcile first.
Static builds and integration exports embed resolved clips so playback has no filesystem-server dependency.
The local save API is for localhost development, not an authenticated production backend.

## Recovery and provenance

`assets/pipeline/checkpoint-manifest.json` records every promoted copy/move and source hashes.
`assets/experiments/checkpoint-before-organization/` contains the user rigs and shared clips
as read immediately before cleanup. The previous local clips remain in the experiment snapshots;
shared-library migration retains both meaningful idle variants. Original approved full bodies were not changed.

Archived rig JSON is data-only history. Some old references point to local-only scratch art
and are intentionally not included in the build. The original experiment IDs map through the
catalog for maintained rigs; all other IDs are explicitly archived. The broader draft tree
remains local and ignored. Unrelated `nightcamp docs/` is excluded from this handoff.

There is no claim that third-party construction/style reference art is licensed for runtime
redistribution. Keep those references out of game asset packs and review their provenance
before wider distribution. Runtime exports include only selected project character/outfit art.

## Commands

```sh
npm ci
npm test
npm run test:pipeline  # Python requirements needed
npm run build
npm run dev           # /qa/ for real Pixi pose checks
npm run export:runtime
```

See the checkpoint's Git commit/branch for exact code and asset versions. Reproduce from a clean
checkout: do not use files found only in the original agent's home directory or ignored drafts.
