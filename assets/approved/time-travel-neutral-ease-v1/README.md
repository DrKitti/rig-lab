# Time Travel / Neutral pipeline — PASS

User accepted this image on 2026-10-20 and asked to retain it as PASS.
Scope: **full-body visual/design acceptance**, not geometry/parts/rig/animation approval.
No new reference role is implied: do NOT attach it by default to future generation calls,
replace the body master with it, or treat it as a clothing-volume authority automatically.

## Preserved evidence

- `fullbody-source.png`: unchanged built-in image_gen output (the displayed accepted image).
- `fullbody.png`: existing original-master-head-registered 671x1164 copy, no local correction.
- `prompt.txt`: exact submitted prompt, one built-in call, no corrective generation.
- `costume-reference.png`: the input Time Travel design thumbnail; evidence, not new master.
- `measurements.json`: actual measured evidence, unchanged.
- `comparison.png`: earlier neutral attempt left, accepted neutral-ease attempt right.

Source experiment: `assets/drafts/time-travel-neutral-ease-v1/`.
Underlying neutral input: `assets/approved/neutral-body-v1/fullbody.png`.
There were only TWO input images: neutral body and costume design. No clothed master,
previous generated outfit or volume reference was supplied.

Generation source:
`C:/Users/kitti/.codex/generated_images/01a1537d-3ca8-7680-914f-597ddc9e06d4/exec-9f2996cc-0d7a-4b53-b7bb-2bf61b214144.png`.

## Geometry status kept separately

After head-only global registration to the original master, near sole is +6 px,
far sole +2 px. Both are within the current normalized ±1% height gate (about
±11.6 px on the 1164 px master canvas). User visual/design and full-body height
checks are therefore PASS. Hidden joints and deformation are still unverified;
no parts or rig exist for this trial, so it is not yet a runtime/animation PASS.

Recipe and reusable prompt: `docs/neutral-pipeline.md`.
