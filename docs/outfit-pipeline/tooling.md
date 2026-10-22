# Outfit tooling and reproducible recipes

Read [standard.md](standard.md) for the art contract and [PROJECT_HANDOFF](../PROJECT_HANDOFF.md)
for checkpoint status. Commands below run from the repository root. Node 24+ is required;
Python tools need `python -m pip install -r requirements.txt` in your own environment.

## Current inputs

- Frozen rig: `src/data/shared-master.rig.json`.
- Body refs: `assets/approved/neutral-body-v1/` and `assets/approved/time-travel-neutral-ease-v1/`.
- Reusable construction: `assets/pipeline/neutral/`, `assets/pipeline/guides/`.
- Successful prompt cases: `assets/pipeline/examples/time-travel/` plus approved full-body prompt.
- Art direction: `docs/art-direction/README.md` (third-party refs are construction/style evidence only).
- Material sources: `assets/pipeline/sources/{neutral,time-travel}/`.

## New outfit: authoring sequence

Create a new versioned working directory under ignored `assets/drafts/`; keep raw images,
exact prompt, reference roles and review decisions. Image generation follows AGENTS.md.
Generated images may need actual landmark fitting; prompt numbers alone are not a geometric lock.

```sh
python tools/align_fullbody.py shared assets/drafts/OUTFIT-v1/fullbody VARIANT.png
python tools/fit_pieces.py FULLBODY.png assets/drafts/OUTFIT-v1/raw assets/drafts/OUTFIT-v1/placed
python tools/assemble_pieces.py FULLBODY.png assets/drafts/OUTFIT-v1/placed assets/drafts/OUTFIT-v1/assembled
python tools/check_proportions.py check assets/drafts/OUTFIT-v1/assembled/pieces.json shared
python tools/build_rig_from_pieces.py assets/drafts/OUTFIT-v1/assembled/pieces.json assets/drafts/OUTFIT-v1/assembled outfit-name
```

Working names such as `arm_F-raw.png`, `arm_B-raw.png`, `leg_F-raw.png`, `leg_B-raw.png`
and metadata keys remain case-sensitive tool contracts. Canonical published image filenames
are kebab-case (`arm-f.png`), but bone/part/texture keys retain `_F`/`_B`.

Review the recipe you chose before fitting. `fit_pieces.py` retains historical master-edit
and neutral-arm paths; generic feature matching may fit poorly on newly simplified neutral art.
Inspect transforms, hidden joints and actual renders. `assemble_pieces.py` can remap legacy
leg art; it does not authorize changing the frozen bone setup. Diagnostic widths, IoU and
feature counts do not decide design acceptance. New rig creation refuses an existing file.
The builder copies the current master and library link; append reviewed outfits to the catalog
only when you want them offered in the picker. Before committing a new active outfit promote
its selected textures to `assets/rigs/<outfit>/` and remove its draft runtime dependencies.

The `--arms-only` builder option re-reads the existing rig and changes only arm bindings/art.
Do not apply the archived rest-arm or one-time skeleton migration scripts to current rigs.

## Material matching

All configs resolve paths relative to the config file, preserve image dimensions/alpha and
refuse overwriting outputs. Their sources are committed; their rebuild outputs go into drafts.

```sh
python tools/match_materials.py assets/pipeline/recipes/time-travel.materials.json
python tools/match_materials.py assets/pipeline/recipes/neutral-gray.materials.json
python tools/match_materials.py assets/pipeline/recipes/neutral-skin.materials.json
```

Run the two Neutral passes in that order. The first stage aligns grey parts to the near arm;
the second uses the actual character face for skin. The Time Travel pass aligns plum cloth,
leather, gold, ivory fabric and neck skin to common per-material refs.
Use a new output directory for another run; never casually overwrite approved sources.

Each material declares source/reference `box` or `polygon`, optional OpenCV HSV ranges,
and `lightness_strength` / `chroma_strength`. Source masks must not overlap and need sufficient
pixels. The tool matches bounded LAB statistics, preserving tonal ordering rather than flattening
to a single colour. Inspect masks/results when hues are similar. This is explicit segmentation,
not automatic semantic recognition. It is not an alpha halo remover.
`match_palette.py` is the older broad-HSV-family matcher and comparison utility.

Promote selected outputs only after side-by-side real-renderer inspection and size/alpha checks.
Update texture paths without refitting. `assets/rigs/manifest.json` records active image dimensions
and hashes; refresh deliberately with `node tools/verify_repository.mjs --write-manifest`.

## Verification / delivery

```sh
npm test
npm run test:pipeline
npm run build
npm run dev
# Browser: /qa/ for Setup, elbow/knee bend, crouch, airborne and torso poses.
npm run export:runtime
```

The repository verifier checks canonical rigs, identical shared geometry, library references,
runtime asset existence/hashes and recipe inputs without ignored-draft dependencies.
Core tests exercise setup bind, IK/foot contact, compression and plant-key semantics.
Pipeline tests check material isolation, alpha preservation and the builder's frozen arm anchor.
Manual renderer inspection remains necessary for design, alpha fringes and occlusion quality.

The runtime export creates a new versioned delivery directory, not a deployment. See
[integration.md](../integration.md) before moving it into Phaser.
