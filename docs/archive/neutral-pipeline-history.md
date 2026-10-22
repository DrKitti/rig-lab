# Kolahon Outfit Pipeline — full-body recipe (เดิม Neutral pipeline)

ชื่อภาพรวมปัจจุบันคือ **Kolahon Outfit Pipeline — ชุดใหม่บนโครงเดียว**
ไฟล์นี้อธิบายเฉพาะ full-body recipe; ชื่อ Neutral pipeline เก็บไว้เป็น alias ทางประวัติ

Latest consolidated construction/overlap/guide/colour standard:
[มาตรฐานปัจจุบัน](current-character-standard.md). Historical checkpoints below are retained;
material-aware colour matching is now implemented and the Neutral colour pass is active.

Current Rig Lab leg scaffold: `assets/drafts/neutral-leg-simple-v1/leg-v1.png`, the
four-toe simple leg used as anatomy reference for Time Travel. Its uniformly fitted
derivative `leg-fitted-v1.png` replaces both Neutral leg slots using their existing
bindings and shared 52% knee. Source and fit report remain beside the derivative.

Named and accepted by the user on 2026-10-20. This is a separate full-body
generation recipe, not a replacement name for Traveler part generation.

## Reference contract

1. **Edit target / underlying body:** `assets/approved/neutral-body-v1/fullbody.png`.
   It supplies identity, anatomy, minimum body mass, pose and joint landmarks.
   Its fitted gray outline is NOT the required outer clothing silhouette.
2. **Technical assembly reference:** the assembled production master parts from
   `assets/rigs/hero-c3/` and `src/data/hero-c3-B7.rig.json`. They supply the runtime
   canvases, pivot/origin placement, hidden continuation, draw order and skeleton
   attachment contract. They are geometry/assembly references, not costume-design
   or clothing-volume references.
3. **Costume design reference:** the requested new outfit. It supplies garment
   construction, colors, materials and details, not a replacement body or pose.
4. Do not attach a clothed master or earlier generated outfit as an additional
   clothing-volume reference by default. The earlier extra-volume-reference trial
   was rejected as too bulky. Time Travel's accepted result is an example/evidence,
   not a default ref.
5. **Optional style-only reference:** when matching or correcting the drawing style,
   a separate image may be attached explicitly as `STYLE REFERENCE ONLY`, for example
   `docs/art-direction/refs/style-linework.png`. It supplies ink/line weight and taper,
   coloring technique, shadow shapes and texture treatment ONLY. Do not copy its
   anatomy, proportions, height, pose, identity, costume, props, background or actual
   color palette. The neutral body still governs anatomy/pose; the new costume ref
   still governs design/material colors. This is not a clothing-volume reference.
   See `art-direction/README.md` for the shared role boundary. Do not add it silently
   to every call or claim that attaching it guarantees style/geometry preservation.

## Core prompt principle

**Add room for clothing, not flesh to the character.** Neutral is the body INSIDE;
the new costume is clothing OUTSIDE. The body is a minimum anatomical reference,
not a tracing template for skin-tight clothes.

- Keep the underlying body, limb lengths, joint positions, head and pose unchanged.
- Allow believable material thickness and fabric ease outside the neutral outline.
  Do not impose one numerical width increase on all outfits or body regions.
- Let a structured coat hang away from the abdomen, rather than tracing the body's
  curves or tightly cinching the waist into an hourglass.
- For ordinary cloth trousers, ask for relaxed-fit woven fabric falling in a clean,
  continuous silhouette from thigh to ankle, modest room and restrained angular folds.
  Do not trace every knee/calf narrowing of the fitted gray suit.
- Explicitly distinguish comfortable fullness from exaggerated bagginess: no leggings,
  balloon pants, jodhpurs, swollen knees/calves or lumpy zigzag silhouettes unless the
  new design actually calls for them. This fit description is garment-specific, not
  a rule forcing all future outfits to have the same shape.
- Keep sleeves naturally eased over the original arm mass, not inflated shoulder balls.
- Preserve floor contact; build shoes above the existing floor instead of extending
  the character downward. Preserve hand views, stance and all shared landmarks.
- Follow `art-direction/README.md` for style, not a new glossy/vector rendering style.

## Reusable prompt block

Use this with an outfit-specific description, the reference roles above, the
project's geometry invariants and art direction. Keep only fit clauses relevant
to the requested garment:

```text
Image 1 is the EDIT TARGET: the accepted neutral body. Image 2 is a COSTUME
DESIGN REFERENCE ONLY; ignore its background, UI and presentation proportions.

Dress the exact character in image 1. Neutral is the UNDERLYING BODY / minimum
anatomical envelope, not a garment template. Clothing is worn OVER this body
with visible, natural fabric ease. Keep the body unchanged; do not make the
character fatter.

The structured coat hangs away from the abdomen rather than hugging its curves.
Sleeves have modest soft fabric volume over the unchanged arms. Trousers are
ordinary relaxed-fit woven fabric, falling in a clean continuous shape from
thigh to ankle, with modest room and restrained angular folds. Do not trace the
knee/calf contours of the gray suit. Do not make leggings, balloon pants,
puffed knees, swollen calves or a lumpy zigzag silhouette. The clothes should
look comfortably worn, not inflated. Avoid a cinched hourglass torso.

Neutral sets the unchanged BODY INSIDE; the costume reference sets CLOTHING
OUTSIDE. Garment widths may expand; anatomical lengths and joint locations may
not. Preserve the head, pose, hand views, stance and exact floor contacts.
```

The exact tested Time Travel prompt is retained at
`assets/approved/time-travel-neutral-ease-v1/prompt.txt`.

When using the optional style image, add this block with its actual image number:

```text
Image 3 is a STYLE REFERENCE ONLY. Use it only for linework, ink weight/taper,
coloring technique, broad shadow shapes and texture treatment. Do not copy its
character, anatomy, proportions, height, pose, costume, props, background or palette.
The neutral edit target remains the authority for the body and pose; the costume
reference remains the authority for design, materials and costume colors.
Changing the drawing style must not change anatomical lengths or joint locations.
```

## Execution and review

Start fresh from the accepted neutral body plus the requested design, one built-in
image_gen call for the initial trial. A style-matching trial may explicitly include
the optional style-only image above. Do not silently edit a rejected dressed result,
add other extra refs, or keep regenerating until something happens to pass. Save the raw
output, prompt and reference roles so the one-shot result is auditable.

Review garment fit/design and geometry separately. Align to the same original master
for comparisons and retain actual measurements; no local shape/height correction
disguised as alignment. The standard height and renderer gates remain in
`character-pipeline.md`. A visual acceptance is not proof of rig compatibility.

For height, use one normalized hard number: after head/torso alignment the sole line may differ
from the shared master by at most **±1% of the master height** (about ±11.6 px on the current
1164 px canvas). The neck, shoulders, hips, knees and
ankles are inspection anchors, not a separate relaxed tolerance; visible drift there
is a failure even when the feet happen to pass. Extra costume pixels above or beside
the body (for example a hat or pauldron tip) do not count as body-height drift when
the underlying landmarks and sole stay fixed.

This recipe currently covers **full-body generation plus the planned neutral-part study**.
For that study, do not ask ImageGen to invent a second neutral body: use the accepted
neutral full body as the visible anatomy reference and the assembled master parts as
the technical placement reference, then verify the result in the existing renderer.
It does not change bones or silently switch Traveler to neutral-part editing. After
the neutral parts pass, explicitly choose the outfit part recipe and complete its
placement/renderer QA.

### Neutral arm placement

Neutral arms with an integrated rounded shoulder use the opt-in
`placement_mode: "neutral-arm"` in the draft's `parts-plan.json`. This mode is scoped
to `arm_F` and `arm_B`; Traveler/master-edit assets continue to use `master-edit`.

`neutral-arm` first finds the current PNG's rounded shoulder-cap geometry directly
from its alpha silhouette, then maps its side-specific source pivot to the unchanged
skeleton shoulder and maps the fist to the unchanged fist endpoint. For `arm_F`, the
visible cap centre is the source pivot. For `arm_B`, the anatomical joint is hidden
inside the torso rather than at the visible cap centre; the tool transfers the
production far arm's technical pivot-to-cap relationship in cap-radius units onto the
new neutral silhouette. It does not copy the old costume or infer the joint from the
new image's global bounding box. The resulting raw-image coordinate is saved as
`source_pivot` in `placed/placement.json` for audit.

Do not compensate for a thin or wide generated arm by moving this pivot. Once the
shoulder, elbow, wrist marker and hand anchor are correct, remaining thickness
differences belong to art review and regeneration.

### Neutral arm anatomical markers

The retained neutral arm metadata now separates two fixed anatomical landmarks:

- `wrist_marker` is the centre of the suit-to-skin wrist boundary. Use it to review
  forearm reach and to place/check the mesh transition near the wrist.
- `hand_anchor` is a manually fixed point inside the palm. Use it as the stable end
  of the arm chain when a hand endpoint is required.

Do **not** derive either point from the alpha centroid, bounding box, or farthest
pixels of a fist/glove. Those measurements move when the glove silhouette, finger
curl, cuff, or hand view changes even though the anatomy and skeleton have not.
The old `fist` fields remain temporarily for legacy reproduction only and are not
canonical geometry. Outfit generation may change the visible glove, but it must
retain the neutral wrist marker and hand anchor after placement.

## Accepted example, not a default reference

`assets/approved/time-travel-neutral-ease-v1/` is **PASS — user-accepted full-body
visual/design**, 2026-10-20. The exact accepted output and its globally aligned copy
are saved unchanged, along with the prompt and measurements. It is not a new body
master, not the default style/volume reference, and not a runtime/animation pass.

Measured sole deltas in the common original-master head frame remain +6 px near /
+2 px far. These are within the current 1% height gate. Preserve both facts:
the user accepted the picture; this clears the full-body height check but is not yet
a neutral runtime-parts or animation pass. No automatic permission to skip parts QA follows
from this acceptance.
One accepted sample does not establish a guaranteed one-shot success rate.

## Working parts checkpoint — 2026-10-21

The user retained the assembled neutral study at
`assets/drafts/neutral-arm_B-fresh-v7/assembled/` with trial rig
`src/data/neutral-arms-fresh-v7.rig.json` for the next outfit-parts experiment.
Torso and the shared leg are the previously accepted study pieces; arm_B is the fresh generated
v7 candidate and arm_F is the retained fresh v6 candidate. **arm_F still looks odd** and remains
an explicit follow-up for shape review. This is permission to test outfit parts, not promotion
of the set to production or an exact shared-bone-length compatibility claim.

The next authorized experiment is the accepted Time Travel outfit, one part at a time,
starting with torso in `assets/drafts/time-travel-parts-v1/`. Use the retained neutral torso as
the underlying part edit target and the approved Time Travel full body as visible costume
authority. Clothing may extend beyond the neutral envelope (especially coat hems); it should
not be compressed to the neutral torso's skin-tight outer contour or hip-ending bbox.
This is an explicit neutral-part outfit trial and does not rename the Traveler recipe.

Torso review follow-up: Time Travel parts v1 was rejected for its extra lower horizontal
backing band and awkward shoulder/arm connections. The replacement is a fresh generation at
`assets/drafts/time-travel-parts-v2/`, from the original neutral torso and approved outfit full
body, with no rejected torso input. The raw shoulder contours must look sound in isolation;
assembly coverage and alpha-hole checks are not substitutes for that review.

Time Travel follow-up (2026-10-21): the user selected v2 **attempt 1**, not
attempt 3, and explicitly permitted retaining its small sleeve remnants for now.
The exact selected torso is preserved in `assets/drafts/time-travel-parts-v3/raw/`.
Fresh arm_F and arm_B costume edits are now assembled with it in the separate
`time-travel-parts-v3` trial rig. Neutral legs remain placeholders. Actual-renderer
QA and reference/measurement caveats are recorded in that draft's README; near
glove size and doubled shoulder contours remain review points. This is not a
new acceptance or production promotion.

## Neutral skeleton candidate checkpoint — 2026-10-21

`src/data/neutral-skeleton-candidate-v1.rig.json` is the frozen technical candidate
derived from the accepted neutral landmarks. Its arm chains use explicit
shoulder → elbow → hand-anchor geometry rather than a straight shoulder-to-alpha-
centroid approximation. The final static QA covers shoulder sweeps, elbows through
120 degrees, planted-foot crouches, step/wide IK targets, manual hip/knee stress,
torso counter-rotation and a combined pose. It passes without limb separation or
catastrophic mesh collapse.

The visible rounded shoulder seams remain a known non-blocking art/overlap issue.
Do not move pivots or change the shared skeleton per outfit to hide them. Resolve a
problematic seam in that costume's artwork/overlap only when it is actually visible.

This checkpoint does not overwrite `hero-c3-B7.rig.json`. The old production master
parts are bound to its existing arm setup; production promotion must migrate the
attachments or intentionally replace the master art as one operation.

### Shared C promotion — 2026-10-21 (supersedes the checkpoint above)

The user selected C arm joints (both elbows 16 units higher than that checkpoint)
and arm mesh 16×64 / blend 40 / `front: child`. The shared master
`hero-c3-B7.rig.json` and the current Time Travel rig now use `neutral-c-v1`.
`neutral-skeleton-c-v1.rig.json` is the matching neutral reference; the older
candidate and experimental A/B/C/D files remain historical, unchanged.
The C elbow coordinates in the common full-body frame are near
(228.000790, 691.021055), far (478.016371, 671.013392). Shoulders and palm
anchors are unchanged. Attachment transforms were compensated to preserve rest
artwork placement; saved clip keys and textures were retained. This preserves
keys, not a guarantee that an old animation's end-effector trajectory is identical.

New outfit builds copy these bones unchanged rather than deriving elbow/length
from each costume's metadata. The legacy rest-angle tool skips this version.
Keep joint areas soft and avoid important hard details across the blend band;
do not create transparent holes. A prompt is not a geometric lock: run renderer QA.

Setup's bottom dock exposes three paired blend presets: elbow, knee and foot.
Each edits both F/B limbs together. Non-destructive A/B previews use actual outfit
limbs, with explicit Apply buttons. These are per-rig mesh/art bindings saved with
Save/Ctrl+S; skeleton geometry remains shared.
As of shared C-v5, root is on the hip line (`y = -107`), the torso/chest split is on the
Neutral visual waist (`world y = -217`), and the anatomical ankle/IK joint is at `world y = 191`.
Setup artwork remains fixed; these are internal deformation pivots.
Backups, numeric report and native-render QA live in
`assets/drafts/shared-skeleton-c-v1/`. Use `tools/promote_shared_c.py` only for this
one-time backed-up migration; it refuses to overwrite its own backup.

### User-locked arm placement v2 — 2026-10-21 (current)

The user explicitly locked the accepted Time Travel arm_B placement as the neutral
standard: +12.195347 world x / -6.001767 world y relative to the old far shoulder.
The new canonical anchor is full-body (447.195347, 553.998233). Its C elbow/palm
move by the same translation; C lengths and relative joint angles do not change.
The master, current neutral rig and Time Travel now carry `neutral-c-v2`; the saved
Time Travel artwork itself is unchanged by rebinding. Full values, ownership and
registration evidence are in `docs/rig-spec/shared-arm-placement.json`.

Neutral's raw arm PNGs were already drawn at slants. Their existing upright
derivatives had been rebound at legacy upper-arm angles rather than restoring the
actual raw-image rotations. Read-only raw/upright feature registration recovers
24.414557° (F) and -31.100630° (B) with median residual below 0.2 px. The corrected
bindings restore those slants; both neutral palm bone endpoints are covered by the
image. This is not alpha-centroid anatomy detection and does not regenerate art.

The `ท่าที่วาด` control was view-only and its C stored/setup angles were identical;
it was not the source of the saved placement. The legacy toggle and rest-arm script
have now been removed entirely. Upright PNGs remain a mesh-storage
detail: builders undo their rotation when placing them, so generated slants are
preserved. Future v2 builds snap arm_B's source shoulder pivot to the locked anchor.
Keep anatomical inspection and deformation QA; a common anchor does not excuse an
incorrectly drawn arm. Backups/report: `assets/drafts/shared-arm-placement-v2/`.

### Neutral comparison using saved Time Travel attachment transforms

At the user's request, Neutral now copies `x`, `y`, and `rotation` for both arm
attachments from the saved `time-travel-torso-fresh-master-v3` rig. Each Neutral
texture retains its own shoulder origin (`originX/Y`): normalized pivots from a
different texture cannot safely be copied. Bones, textures, meshes, legs and clips
are unchanged. This supersedes the raw-angle restoration above for the current
comparison; raw registration remains historical evidence, not a fit approval.
Backup: `assets/drafts/shared-arm-placement-v2/neutral-before-time-travel-placement.json`.

### Accepted near elbow: shared C-v3

The user accepted the near elbow from the two center-elbow trials as the shared
standard. Master, Neutral and Time Travel now use `neutral-c-v3`: elbow F moves
14 rig units left, while shoulder, palm endpoint and all setup artwork stay fixed.
Meshes remain blend 40. Both trial JSONs and each pre-promotion rig were archived
in `assets/drafts/shared-elbow-center-v3/`; trial picker entries were removed.
The far-arm geometry and image placement remain unchanged, pending separate review.

### Accepted far-arm joints: shared C-v4 (2026-10-22)

The user accepted the blue-arm center-joint trial as the shared standard. Master,
Neutral and current Time Travel now use its far shoulder/elbow geometry, while
keeping the far palm endpoint and all setup artwork fixed. Near-arm C-v3 geometry
is unchanged. The artwork anchor (+12.195347 right / -6.001767 up from the old
placement) is separate from the new bone origin. The builder retains both the
shared C-v4 chain and the artwork anchor, computing their attachment offset.
Backups: `assets/drafts/shared-armb-center-v4/`. This is a pipeline-wide default
for new builds, not a migration of every historical draft.

### Torso-v4 review and colour follow-up (2026-10-22)

Update: user accepted torso v4 after assembly. The main Neutral rig now uses its
fitted texture at `assets/rigs/neutral-c-v4/torso.png`; skeleton and bindings are
unchanged. Use this torso as the accepted neutral construction scaffold. Trial
rigs are hidden from the picker, not erased from history. Separate leg_F and
leg_B v1 candidates remain unapproved and are under review.

Torso v4 is assembled in `neutral-torso-v4-assembly-trial-v1` for review without
changing the shared skeleton, arms or legs. The user does not require neck-shape
changes or regeneration; remaining neck work is matching the face's skin palette
while preserving shading. This is not blanket approval of every new Neutral part.

Required future pipeline step: sample corresponding material regions from the
approved full body and match each generated part by material, not by a global tint.
Keep base/shadow separation, outlines and alpha. The existing broad-HSV-family
matcher is only a starting point; material-aware matching is still TODO. Skin
matching for interchangeable character heads must follow the actual character's
skin palette. See `character-pipeline.md` for the shared requirement.
