# User-locked far-arm placement — current standard, 2026-10-21

The user explicitly selected Time Travel's saved arm_B artwork placement as the
neutral standard. `docs/rig-spec/shared-arm-placement.json` records the authority:
full-body shoulder anchor (447.195347,553.998233), a world shift of
(+12.195347,-6.001767) from the original B anchor. The master, current Neutral and
Time Travel use `skeletonVersion: neutral-c-v2`. Historical trials remain archived.

The shift was moved into the shared arm_B_1 origin; elbow and palm translate with
it. C lengths/relative joint angles stay unchanged. Time Travel attachment local
offsets become approximately zero because the bone now follows the user-selected
artwork origin. Its world-space image matrix is unchanged, not shifted twice.
Master's far arm follows the new anchor, retaining its own art orientation.

## Why Neutral looked wrong

Its raw PNGs were drawn at slants, then turned into upright mesh textures. The
existing attachment rotations did not undo the actual raw/upright conversion;
they retained legacy upper-arm angles. Recovering the transform between the
unchanged raw and upright PNGs gave F=24.414557° and B=-31.100630°. Registration
has 13/24 inliers and median residual 0.185/0.125 px. Neutral now restores those
drawn orientations and maps the B pivot to the new canonical anchor. Both palm
bone endpoints fall on opaque image pixels (alpha 254), rather than B falling off
the visible hand. Coverage is a placement check, not a claim of exact anatomical
landmark detection or complete art acceptance. No PNG pixels were modified.

The old `ท่าที่วาด` toggle was view-only. On the previous C rigs its stored angles
already equalled setup angles, so that button was not changing the saved placement.
It is now hidden/ignored for all locked neutral-C versions. The legacy rest utility
skips v1/v2; new v2 builds copy bones unchanged, snap B's source shoulder pivot to
the canonical anchor and undo upright-image rotation to preserve generated slant.

## Verification and recovery

- `*.rig-before.json` are exact pre-migration saved-file backups, including the
  user's latest Time Travel offsets. Hashes and coverage are in `report.json`.
- User Time Travel image matrices and clip keys preserved. Non-arm parts,
  root/torso/leg geometry and approved/runtime texture files were not modified.
- `python tools/verify_shared_c.py` checks the locked anchor, C bones, Neutral
  orientation/coverage, saved keys and the builder snap/freeze contract.
- `node tools/test_blend_preview.ts`, `node tools/test_mesh_settings.ts`, typecheck
  and production build passed. Legacy rest utility skips all three maintained rigs.
- Native renderer: 3 rigs × 6 test poses, all finite; leg IK targets reached.
  Reviewed rest and combined shoulder/elbow renders. This does not mean arbitrary
  future costume artwork can skip pose/coverage inspection.
- PNGs: `assets/drafts/shots/shared-arm-v2-{rest,elbow90,combined,elbow120,crouch,step}.png`.

Use `tools/lock_shared_arm_placement.py` only as this one-time migration; it refuses
to overwrite the spec or backup directory. Do not rerun the old C promotion to
undo this lock. Future rigs start from the current shared master, not old drafts.
