# Checkpoint verification

Delivery review: 2026-10-23 (Asia/Bangkok). This records evidence, not a production approval.

## Automated gates

- `npm test`: repository/spec/texture hashes and doc links, plus 9 Node tests covering core,
  editor and shared animation persistence/conflicts.
- `npm run test:pipeline`: 3 Python tests for material/alpha isolation and frozen builder anchors.
- `npm run typecheck` and `npm run build`: editor and maintained QA compile together.
- `npm run export:runtime`: standalone resolved rigs, core source, textures and handoff docs.
- All three material recipes were rebuilt from committed inputs; all nine final part images
  matched the selected runtime outputs pixel-for-pixel. Colour matching preserves alpha;
  this is not an alpha-fringe cleanup pass.

## Real renderer evidence

The maintained `/qa/` page renders the actual Pixi meshes, not infographic illustrations.
Select setup, shared idle, arm bend, knee bend, planted crouch, airborne foot or torso bend.
The screenshots below record setup and planted crouch with bones hidden for art inspection.

![Maintained rigs in setup](outfit-pipeline/figures/maintained-rigs-setup.png)

![Maintained rigs in planted crouch](outfit-pipeline/figures/maintained-rigs-plant.png)

Observed limitation: the legacy Shared Master boot cuffs shear in a deep crouch. Its old
costume is retained for compatibility, not certified as newly reviewed production art.
Neutral and Time Travel are selected experiment assemblies, not a finished game animation set.

There has been no Phaser/gameplay, mobile GPU, atlas, slopes or moving-platform validation.
Automated tests check numeric/runtime contracts, not artistic acceptance of every pose.
