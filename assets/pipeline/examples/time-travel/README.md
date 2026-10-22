# Time Travel recipe evidence

Read [part-recipes](../../../../docs/outfit-pipeline/part-recipes.md) before using these files.
This directory contains exact historical prompt texts and selected source images, not a
claim that every part used one recipe or that a prompt guarantees geometric compatibility.

- `arm-{f,b}.prompt.txt`: exact prompts from `assets/drafts/time-travel-parts-v3/`.
- `arm-{f,b}-neutral-edit-target.png`: byte-identical original raw Neutral edit targets,
  from `neutral-arm_F-fresh-v6/arm_F-generated-v2.png` and
  `neutral-arm_B-fresh-v7/arm_B-generated-v2.png` under historical drafts.
  They differ from current upright/fitted/color-matched runtime Neutral images.
- `torso-design-reference.png`: exact old design input from
  `time-travel-torso-armhole-v1/torso-raw-v5f.png`, not the selected construction.
- `torso-{initial,trim,selected}-source.png`: exact v1/v2/v3 raw torso outputs from
  `time-travel-torso-fresh-master-v1/`, with their corresponding three prompt files.
- `leg-{f,b}.prompt.txt` and source PNGs: previously retained accepted leg examples.
- `recipe-evidence.json`: sizes/hashes of the newly retained arm/torso evidence.

Source image copies were verified SHA256-identical. Historical prompt text is not rewritten
to disguise old names or geometry. Use current path mappings and frozen skeleton from the
recipe doc. In particular `hero-c3` master paths now map to `assets/rigs/shared-master/`.
Do not replay historical bone-fitting steps or treat pre-v5 landmarks as current joints.

The torso trim prompt additionally used user boundary-markup guidance; that original bitmap
is not included here. This records the real sequence, not a fully reproducible input bundle.
Leg prompts enumerate reference roles, but the old exact crop/style-reference attachment
manifest is not complete here either. For each new call save the actual input paths/hashes
and roles, not only a descriptive prompt. Current approved outfit design is always replaced
when making another outfit; historical costume colors/designs are not universal requirements.
