# Character pipeline: one shared rig, many outfits

Every character and outfit uses **one shared skeleton and one shared body/outfit profile**: the
bones, joints and body proportions of `src/data/hero-c3-B7.rig.json` (Rig Lab's default).
Animations and outfit body textures are made once and work for characters of every sex. Character
identity changes through the head texture (face, hair and optional head size), not sex-specific
torso, arm or leg textures. Each outfit is drawn as **one full body in the arms-out rest pose**,
and every piece is reconstructed from that one image.

**Shared C promotion (2026-10-21):** `hero-c3-B7.rig.json` now carries
`skeletonVersion: neutral-c-v1`. Its arm geometry is the user-selected C chain;
arm meshes default to 16×64, blend 40, lower-over-upper. The matching neutral rig is
`src/data/neutral-skeleton-c-v1.rig.json`. Pre-promotion backups and validation live
in `assets/drafts/shared-skeleton-c-v1/`. Historical draft rigs are not mass-migrated.
Root, torso pivot and leg geometry were not changed by this promotion.

**Placement lock v2 (2026-10-21, historical):** `neutral-c-v2` supersedes the initial C
placement. The user's accepted Time Travel arm_B position is the shared far-arm
anchor, full-body (447.195347, 553.998233), +12.195347 right / -6.001767 up from the
old anchor. Authoritative values are in `docs/rig-spec/shared-arm-placement.json`.
Current Time Travel artwork is preserved exactly. Neutral's arm images are restored
to their actual original drawn slants using raw-to-upright PNG registration, not
the legacy fixed arms-down angles. New v2 builds map the arm_B source shoulder
pivot to this shared anchor; never paste an old costume's local x/y into a new one.
The legacy drawn-pose toggle and rest-arm script have since been removed.

**Shared elbow v3 (2026-10-21):** `neutral-c-v3` promotes the accepted
Neutral/Time Travel trial's near elbow, 14 rig units left of C-v2. Shoulder and
palm endpoints stay fixed; arm attachments are rebound so setup artwork stays
unchanged. Master, Neutral and current Time Travel share this geometry; future
builds preserve it. Both trial rigs were archived and removed from the picker.
Backups: `assets/drafts/shared-elbow-center-v3/`. Neutral currently uses the saved
Time Travel attachment placement for comparison, not its original generated angle.
Far-arm bones and artwork were not changed by v3. The v2 far-arm lock moved the
bone anchor to the accepted artwork pivot; these are coincident by construction,
not an independent anatomical validation of that far-shoulder joint.

**Shared far-arm v4 (2026-10-22, current):** `neutral-c-v4` promotes the accepted
blue-arm center-joint trial to master, Neutral and current Time Travel. Near-arm
geometry remains C-v3. Far shoulder and elbow now use the trial geometry, with
the far palm endpoint preserved. All setup artwork stays exactly in place.
The shared far-arm artwork anchor still includes the user's +12.195347 right /
-6.001767 up placement; it is NOT the far bone origin. The builder reads
`arm_B_artwork_anchor_rig` from the shared spec and computes a local attachment
offset instead of snapping art to the bone. Future builds preserve the C-v4 chain.
Backups: `assets/drafts/shared-armb-center-v4/`. Historical drafts remain unchanged.

- **Production body master:** hero c3 v1, full body
  `docs/rig-spec/pose-arms-out-male.png`, rig `src/data/hero-c3-B7.rig.json`.
  Its five runtime textures are in `assets/rigs/hero-c3/`. The only profile is `shared`;
  the historical `male` filename does not define a separate body type.
- **Saved neutral full-body base (2026-10-20):**
  `assets/approved/neutral-body-v1/fullbody.png`. The user accepted this as the
  visual/anatomy reference for the next neutral-parts study. See its adjacent
  `README.md` for measurements and approval scope. Neutral parts and their rig
  assembly history is recorded in `docs/neutral-pipeline.md`. The promoted shared
  C neutral binding is now `neutral-skeleton-c-v1`; runtime textures were not redrawn.
- Rig Lab's character picker (list in `src/editor/characters.ts`) contains the maintained
  master. New rigs open with `?rig=<name>`; add reviewed rigs to that list as needed.
- Draft work belongs in `assets/drafts/<outfit>-v<n>/`, which is ignored by Git. Promote
  accepted runtime textures to `assets/rigs/<outfit>/` and update the rig paths before commit.
- Reference measurements: `docs/rig-spec/proportions.json`, reported by
  `tools/check_proportions.py`. They are diagnostics, not gates.
- Joint reference: `docs/rig-spec/hero-c3-B7-spec.png` (drawn on c3 in the old arms-down
  pose; its shoulders, hips, knees and ground are still the ones every outfit uses).

Art rules live in `docs/art-direction/README.md` ("Rig parts requirements"). Image generation
goes through the Art session / Codex as described in `AGENTS.md`.

Three rules that matter more than any other:
- **The approved full body is the authority for visible costume art.** The part-generation recipe
  is named separately from the end-to-end pipeline. `Traveler pipeline` means one call per part
  editing the matching master runtime texture (`torso`, `arm_F`, `arm_B`, `leg_F`, and an optional
  separate `leg_B`); the master
  supplies the already-rigged canvas, endpoints, anatomical mass and hidden continuation.
  `Fresh reconstruction` means drawing an isolated part from the approved full body/crop while the
  master is only a reference. Do not silently substitute one recipe for the other. Neither recipe
  is a pixel-exact lock, so every result still needs fitting and renderer QA.
- **Never re-edit a whole image to fix one part.** Every round the AI redraws everything, and
  parts that were already good drift. Fix single pieces, and lock approved ones.
- **AI is bad at numbers.** Fix positions with scripts, not by re-generating.

## What is fixed (the rig spec)

In full-body pixels (canvas 671×1164, 1 px = 1 rig unit, rig origin at (359.2, 888)), these
are inspection anchors for the shared skeleton:

| Joint | Where |
|---|---|
| neck | (340, 490) |
| shoulders | near (265, 580), far (447.195347, 553.998233) |
| hips (leg dome centres) | near (306, 781), far (427, 781) |
| elbows (C, placement v2) | near (228.001, 691.021), far (490.212, 665.012) |
| palm anchors | near (155.996, 814.055), far (582.237, 789.026) |
| knees | 169 px below the hips |
| soles / ground | y 1119 |

**Height is a normalized hard gate:** after `align_fullbody.py` registers the head and torso,
the generated sole line must be within **±1% of the master's canonical height**. On the
current 1164 px master canvas this is about ±11.6 px. This is the only tolerance for
small generation/registration drift; it is not permission
to accept a visibly shorter or taller body. A result outside this range fails
full-body QA and must not proceed to piece generation. Never change the shared
skeleton or rely on the later leg-fitting step to conceal a height error.

The old “about ±5 px” wording is only a visual inspection warning for individual
neck/shoulder/hip/knee anchors; it is not a pass range. Investigate visible landmark
drift, and fail the full body when the anatomy or joint coverage no longer matches
even if the soles happen to land within the 1% height gate. Conversely, a hat, wing tip,
pauldron ornament or other costume overhang may extend the top/side silhouette
without changing the skeleton, provided the underlying landmarks and sole line stay
correct.

The script fixes the legs onto the hips and ground (step 4), so the drawn legs may be a little
off. In the neutral pipeline the arms also use the frozen neutral shoulder/elbow/wrist/hand
landmarks; artwork is fitted to that chain rather than creating a new skeleton per outfit.

**Rest pose** (use the shared master `pose-arms-out-male.png`):
- 3/4 view facing right; near arm on screen-left, far arm on screen-right;
- both arms held a little out from the body (about 1.5 fist-widths from the tasset/tunic), so
  each whole arm and fist is visible, not tucked behind the body;
- elbows follow the frozen neutral rest chain rather than being forcibly straightened:
  near about `+11.9°`, far about `-15.4°` at the elbow. Preserve the fixed shoulder,
  elbow, wrist and hand anchors; visible glove pixels do not define arm length;
- legs nearly straight;
- hands: 3 fingers plus a thumb. Near fist: back of the hand. Far fist: the curled fingers face
  the viewer, stacked vertically, the thumb across the front (`refs/construction-arms.png`
  right arm, `refs/construction-far-fist.png`).
- a costume that hides every joint (sleeves or pauldrons over the shoulders, cuffs at the
  wrists and boots, tunic or tasset over the hips).

**Bend zones.** The default blend bands extend ±20 rig units along the upper-arm axis
around the elbow (blend 40), ±4 at the knee (blend 8), and ±15 around the waist
(blend 30). New outfit legs use ±80 at the ankle (blend 160); the historical master
leg attachment still uses ±28 (blend 56). These are weight-transition widths, not
joint-position tolerances.
Soft things there are fine: cloth, chainmail, skin, and soft cuffs or boot tops (c3's own boot
cuff sits on the knee and bends fine). Avoid hard, sharp-edged things there: plate edges,
buckles, gems, logos. This is a preference to check on the render (step 6), not a reason to
reject a full body.

**Hidden overlaps:** the leg domes sit fully under the tunic or tasset, the neck stub under
the head, and the arm tops go under or over the shoulders as drawn.

Inside these rules, design is free.

**Sex and the torso.** Reusable outfits do not get a female chest or a sex-specific torso by
default. At the game's chibi size, face, hair, head shape and costume design carry character
identity without doubling the body assets. Armour, tunics and loose clothing should use the same
torso texture for everyone. If a particular named character needs a visibly shaped chest or waist
for their design, make a character-specific torso variant only; do not turn it into a required
female version of every outfit. It must keep the same shoulder, neck, waist and hip coverage.

## Named generation recipes

- `Neutral pipeline` is the separately named **full-body** recipe in
  [neutral-pipeline.md](neutral-pipeline.md): accepted neutral body as edit target /
  minimum anatomy, plus the new costume design reference. Draw natural clothing ease
  outside the body without making the body fatter or tracing the fitted suit. Do not
  add a clothed volume reference by default. This is an explicit alternative to the
  original-master full-body route below; it does not select a new part recipe.
- `Traveler pipeline` remains the **part-generation** master-edit recipe in step 2.
  Neutral runtime parts have not been approved, so do not silently substitute them.
- The Time Travel neutral-ease trial is user-accepted full-body visual/design PASS at
  `assets/approved/time-travel-neutral-ease-v1/`, not a default reference or rig pass.
  Its recorded +6/+2 px sole offsets are within the current 1% height gate.

## Making an outfit

`Full pipeline` names the complete sequence in this section: design/full-body review, part
generation, placement, assembly, rig build and renderer QA. It does **not** select a generation
recipe by itself. When the user says `Traveler pipeline`, step 2 must use Traveler master-edit.
`Fresh reconstruction` is a separate explicitly named experiment; do not infer it from phrases
such as “start again,” “fresh full pipeline” or “not v2.” Those phrases mean not editing a rejected
generated outfit part, not discarding the stable production master scaffold.

0. **Design on the shared master, then choose a costume.** Make three genuinely different
   costume options, one image_gen call per option, each editing the SAME shared master image.
   Lock its head, body mass, torso length, shoulder/hip/knee landmarks, limb lengths, stance
   and sole level. Costume volume (armour, sleeves, cuffs and hems) may change; anatomy may not.
   Do not first design on three freely redrawn bodies and then transfer the winner back: that
   adds a second redesign opportunity and makes costume comparisons misleading.
   Compare design appeal and geometry separately. A good costume with a drifting body is not
   a rig-ready candidate. Numbers in a prompt do not guarantee that geometry was preserved.
   For outfits needing a wider arms-out drawing, establish ONE reviewed shared pose reference
   before the options, rotating arms about the existing shoulders without lengthening them;
   do not invent a different pose for every option or alter the saved production rig.

1. **Review the master-based full bodies.** Align and inspect the options from step 0, then
   have the user select one. The selected image becomes the full-body shape source; do not
   automatically generate another round that reinterprets the selected costume.
   If the user supplies an existing design, transfer it directly onto the shared master and
   review that result instead; it does not need a new three-option concept round.
   - **Base image (original-master route):** the shared master full body
     (`docs/rig-spec/pose-arms-out-male.png`): it has the standard pose, joints and proportions.
     When the user selects `Neutral pipeline`, use its separately documented neutral
     edit target and fabric-ease contract instead; all shared geometry checks still apply.
     Edit only the costume. The master head is a placeholder while making the outfit; final
     characters supply their own head texture. Explicitly preserve the head and
     body scale, canvas position, shoulder/hip/knee/sole landmarks, arm and leg widths, arm pose
     and hand views. A design reference supplies clothing shapes, colours and materials only.
   - **References** (image_gen takes at most 5): the base, the design source,
     `refs/construction-arms.png` and `refs/construction-far-fist.png` (far fist view),
     `refs/style-linework.png`.
   - **Design source:** a design image if there is one. Never another character's full body in
     the standard pose: the AI copies its proportions too (a male knight drawn from the female
     master came out with her thin legs). If the design is another outfit, crop just the costume
     parts. With no image, describe the costume in the prompt (colours, materials, lengths), and
     say what must stay: "keep the arm and leg widths, head size and pose of the base image".
   - **Align and measure** every variant:
     `python tools/align_fullbody.py shared <out>/fullbody <variant.png>…`
     It matches each variant to the master on the head and torso, writes `fullbody-v1.png`…
     and `fullbody-compare.png`, and prints the soles, head size and near-leg widths against the
     master and the shared standard. Soles more than 1% of the master height off mean the AI scaled the body:
     reject or correct that variant before generating any pieces. Leg widths outside the range mean thin or bulky legs; they are
     taken at fixed rows (knee y 950, shin 1010, boot 1080), so a boot cuff or a different boot
     shape there shifts them: judge with the picture.
     Registration is one global transform: matched head/torso features do NOT prove shoulders,
     hips, knees or soles are correct independently. Inspect those landmarks against the master.
     Do not interpret a coat edge or pauldron tip as an anatomical joint. The current builder
     follows drawn arm lengths, so a stretched arm in the art can otherwise become a stretched
     arm in the rig rather than a build error.
   - **Review**, side by side with the master (`fullbody-compare.png`): pose (arms out, elbows
     nearly straight), a visually balanced far arm, the far fist view, 3
     fingers plus a thumb, no bare skin at a joint, the bend zones (below), and the printout.
     Get one approved for both design and the reviewed full body before pieces work.

2. **Pieces from the approved full body**: the base contract has five unique textures mapping to
   six runtime parts. The reusable outfit supplies four textures (torso, near arm, far arm and one
   shared leg); the character supplies the head. A reviewed separate-leg extension supplies
   `leg_F` and `leg_B` independently, so the outfit has five textures and the character head makes
   six. Use one image_gen call per texture that is new for this character/outfit combination.
   **Traveler pipeline generation recipe — master-edit:** use the matching production master runtime
   texture as the image being edited for every part, not only as a loose reference and not only for
   arms. Supply the approved full body and a clean crop of that part as costume authorities. Ask for
   ONLY that runtime part, preserving the approved visible design and completing only the hidden
   area. The master edit targets are `assets/rigs/hero-c3/torso.png`, `arm_F.png`, `arm_B.png` and
   `leg.png`; the arm construction copies also live at `docs/rig-spec/master-arm_F.png` and
   `master-arm_B.png`. Copy none of the master's costume appearance: it supplies the rig-compatible
   object boundary, length, mass, endpoints and hidden geometry, while the approved full body/crop
   supplies every visible material, colour and detail. A clean crop must exclude pixels from the
   neighbouring leg or garment; Traveler's leg copied a stray far-leg buckle from a contaminated
   crop even though its geometry passed.
   This method is not a v2 patch to a rejected outfit part. It is a fresh single-call costume edit
   on the stable production master part. “Start again from the approved full body” does not mean
   discarding the master-part scaffold.
   After assembling, run `python tools/check_proportions.py check <out>/pieces.json shared`
   and inspect each arm alone in the renderer, including the first 40–80 px below its shoulder.
   The earlier narrow upper-arm failure is a construction lesson; width is still diagnostic.
   Crop boxes, full-body px (the same as `tools/fit_pieces.py`):

   | Piece | Box (x0, y0, x1, y1) |
   |---|---|
   | head | (30, 30, 650, 530), wide enough for big spiky hair |
   | torso | (160, 480, 560, 895) |
   | near arm | (60, 500, 330, 900) |
   | far arm | (400, 500, 640, 900) |
   | near leg (`leg_F`) | (215, 840, 400, 1125) |
   | far leg (`leg_B`, separate-leg extension) | (360, 840, 590, 1125) |

   Only these rules:
   - limbs are one piece each (pauldron or sleeve to fist, leg dome to foot);
   - the leg gets a full dome on top, which the torso covers: about half the thigh's width
     tall, closed with a half circle; the torso gets a neck stub;
   - pauldrons and other overlapping armour go with whichever piece they sit on in the image.
     The torso then draws its own full shoulders underneath (the shirt or breastplate shape
     under the pauldron, as wide as the full body's shoulders), so the arm's pauldron can sit
     on top without a gap;
   - record part ownership before generation: a moving sleeve/pauldron belongs to its arm;
     collar, lapels and a body-following folded hood belong to the torso. Complete hidden
     shoulder/sleeve material back to the fixed anatomical shoulder pivot. Around that pivot,
     smooth the contour of the existing sleeve/pauldron only; do not add a second dome, ball or
     outlined ring above it. The accepted near-arm construction reaches the pivot with one
     continuous sleeve silhouette and does not rise toward the neck. A visible sleeve seam below
     a hood is not a new joint. Never include the hood in the arm merely because it overlaps the
     arm's reference crop;
   - far arm: it is a separate opposite-side drawing, not a scaled copy. Keep the same character's
     anatomical mass; it may look subtly narrower because of the 3/4 view, but there is no required
     percentage. Reject only when it looks conspicuously tiny or larger than the near arm;
   - **far-fist construction is still a hard requirement even though arm width is not:** near
     fist shows the back of the hand; far fist shows the curled fingers facing the viewer,
     stacked vertically with the thumb across the front. It is not a mirrored near fist. Both
     hands have 3 fingers plus a thumb; count them and reject a twisted wrist.

   Save them as `<out>/raw/<piece>-raw.png` (head, torso, arm_F, arm_B, leg_F, plus `leg_B`
   when the separate-leg extension is selected). In the base contract the far leg intentionally
   reuses `leg_F` without perspective scaling: the two legs have the same texture and size.
   In the separate-leg extension, `leg_B` is a genuinely separate opposite-side drawing and must
   not be a mirrored or scaled copy of `leg_F`; both images get their own complete rounded hip dome,
   are fitted to their own fixed hip and sole landmarks, and are animated by their existing
   `leg_F`/`leg_B` bone chains. Perspective is expressed by drawing and overlap, not by a runtime
   scale hack. Arms are different because the far hand is seen from the opposite side; their size
   relationship is judged in the renderer.
   Inspect the duplicated pair against the approved full body in the neutral renderer. If the pair
   no longer reads like the approved design, reject the result, but do not infer a width or hem edit
   from that symptom alone. The approved art is the target; knee/shin/boot measurements are only
   diagnostics. If the mismatch is inherent to duplicating one directional leg, test a separate
   far-leg texture as an explicit pipeline extension instead of repeatedly reshaping `leg_F`.
   When the character head already exists, do not generate it again: copy the existing head
   texture to `<out>/raw/head-raw.png`. `fit_pieces.py` still needs that file so it can create the
   head placement expected by `assemble_pieces.py`; this is reuse, not a fifth outfit texture.
   Pieces that don't change from another outfit are reused:
   copy them and their `placement.json` entries into `<out>/placed/` first.
3. **Place on the full body** (each piece keeps the full body's scale; never rescale one). It warns
   when a piece finds fewer than 30 matches: check that piece's overlay; step 4 re-fits the leg anyway:
   `python tools/fit_pieces.py <fullbody.png> <out>/raw <out>/placed`
   Feature matching understands pixels, not garment ownership. It cannot repair a hood drawn
   into an arm piece. Inspect the isolated piece and its overlay before accepting placement.
4. **Fit the legs and assemble**: stands each supplied leg upright, puts its rounded dome on its
   own fixed hip and its sole on the ground, without width scaling,
   keeps everything else as placed, writes the final pieces, `pieces.json`, `assembled.png`
   and `preview.png`, and prints the overlap with the full body (IoU ~0.9 is good) and
   whether the leg domes are covered:
   `python tools/assemble_pieces.py <fullbody.png> <out>/placed <out>`
   Optionally print size differences from the shared reference:
   `python tools/check_proportions.py check <out>/pieces.json shared`
   Head/limb/fist/boot differences and far-vs-near arm ratios are diagnostic only. Do not resize
   a usable outfit merely to make these numbers match, and never reorganise an already working
   rig to satisfy a newer checker. Fix or redraw a part only when the real renderer shows a
   visible scale, gap or deformation problem.
5. **Build the rig**: copies the shared skeleton/settings, verifies the fixed neutral arm
   landmarks, turns each arm image upright (see "Arm images upright" below) and places every piece.
   For locked `neutral-c-v1` / `neutral-c-v2`, bones are copied unchanged from the shared master; piece metadata
   controls artwork placement only, not new per-outfit joint geometry:
   `python tools/build_rig_from_pieces.py <out>/pieces.json <out> <new-rig-name>`
6. **Verify** in Rig Lab (below), still in the drawn arms-out pose, so the rest pose can be
   compared with the full body. Fix a bad piece alone (step 2 for that piece, then 3–5).
   Also inspect each arm alone and rotate it away from the torso: the upper arm must remain
   complete, its shoulder must stay connected and torso clothing must not move with it.
7. **Rest geometry is shared, not repaired per outfit**: the neutral setup chain already
   defines shoulder → elbow → hand anchor, including its small setup elbow angles.
   The legacy rest-arm script and drawn-pose toggle have been removed. Setup shows the
   saved rig directly; historical `drawnRotation` metadata no longer changes the view.

## Base outfit scope and occluding garments

The four-outfit-texture / six-runtime-part workflow is the BASE contract, not a promise that
every costume can fit it. For a base-rig armour trial, use armour, cuffs and a short hip-covering
tasset only: no cape, mantle, long coat tails, hanging banner or other independently layered cloth.
No new layers/bones or production rig changes are part of that trial.

A cape overlapping the near arm may need a separate front layer, and a cape extending behind the
body may need a back layer. Ownership and draw order are different questions: assigning the cape
to the torso does not make it occlude the near arm, which the base rig draws above the torso.
Separate garment layers and independent cloth bones/meshes are a future explicit extension,
not something the existing builder handles automatically. A layer does not always need a new bone.

Arms-out improves visibility of hands and exposed sleeves; it cannot reveal anatomy covered by
an opaque cape. Do not remove requested garment features, grow the arms, move shoulder bones or
attach a cape to an arm just to fake visibility. Reconstruct hidden arm material at piece generation;
if an unseen sleeve design is ambiguous, resolve a focused construction reference before binding.

## Quality gates

Keep the automatic checks small. Numbers help locate a problem; the renderer and the approved
design decide whether the art is good.

**Height is locked, width is free** (updated by user, 2026-10-20). Vertical positions are the same for every
outfit: head size, neck, shoulders, waist, hips, knees and soles. The aligned sole line has a
hard maximum tolerance of **±1% of the master height** from the master. Costume width may differ (bulky fur or
armour, slim cloth), so width readings stay diagnostics.

**Must pass:**
- the full body keeps the shared pose, joint landmarks and overall scale; soles must be within
  **±1% of the master height** after alignment (a larger offset is a hard failure: reject or correct
  the variant before piece generation, and do not rely on leg re-fit to hide it);
- both arms and fists are visible, the hand views are correct, and no required part is missing;
- the rig builds and has no visible gap, tear or broken joint in the standing, elbow-90 and
  planted-feet checks;
- the result still reads as the approved costume at game size.
- existing working rigs continue to build, load and animate without being rearranged to satisfy
  a new measurement rule.

**Diagnostics to inspect, never gates by themselves:**
- SIFT match count, silhouette IoU, head/limb/fist/boot differences and far/near arm ratios;
- busy or hard detail in a bend zone;

Do not turn a diagnostic percentage into an art instruction such as "widen the knee, shin and
boot." Likewise, do not shorten or reshape an approved torso hem merely to expose more of a leg;
the hem only needs to cover the hidden leg dome without a gap. Diagnose the rendered mismatch
from the approved full body before deciding whether any art or runtime contract actually changes.
- a measurement affected by a cuff, pauldron or unusual costume silhouette.

The check scripts should exit unsuccessfully only for technical failure such as unreadable input,
missing required data or a failed build—not because an outfit differs from a width target.

## Tools

All local Python (numpy, Pillow, OpenCV); no network. Install with
`python -m pip install -r requirements.txt`.
- `tools/align_fullbody.py`: step 1; aligns variants to the master and prints soles, head
  and leg sizes.
- `tools/fit_pieces.py`: feature-matches each piece to its area of the full body and places it
  with one similarity transform. The search box per piece is in the file.
- `tools/assemble_pieces.py`: leg fix, assembly, checks. `--fix-arms` snaps the fists onto B7's
  old arms-down pose instead of keeping them as drawn; not used any more.
- `tools/check_proportions.py`: diagnostic sizes vs the shared reference (`check`), or refresh
  reference measurements (`save`). Use the `shared` profile.
- `tools/match_palette.py`: optional deterministic post-process for independently generated
  RGBA parts. It matches neutral/red/brown/yellow/cool colour-family statistics to an approved
  crop while preserving alpha, geometry and near-black outlines. Run it on raw pieces before
  `fit_pieces.py`; always compare the assembled before/after result by eye. When a reference
  crop contains unrelated colours, reduce only that family, for example
  `--family-weights neutral=1,red=0.15,brown=1,yellow=1,cool=1`. If the piece has already been
  fitted, apply the matcher to the placed image and reuse its existing `placement.json` so a
  colour-only pass cannot move a joint.
- `tools/build_rig_from_pieces.py`: pieces → rig. Refuses to overwrite an existing rig.
- `tools/pipeline_frame.py`: reads `<fullbody>.frame.json` and shifts fitting coordinates
  for padded references. It is shared by fitting and assembly, not a separate CLI step.

## Rig settings (set by the build tool)

- **Bones**: `root` → `torso` (hips, up the spine) → `chest` (from the waist) → `head`;
  `chest` → `arm_F_1` → `arm_F_2` and `arm_B_1` → `arm_B_2`; `root` → `leg_F_1` → `leg_F_2`
  → `leg_F_3` (foot), same for `leg_B`; IK targets `ik_leg_F` / `ik_leg_B` have no parent.
  `torso` moves the whole body; `chest` bends at the waist.
- **Feet**: `leg_X_3` runs from the ankle (40 units above the sole, full-body y ~1079) to the
  sole, with `inheritRotation: false`, so the foot keeps its angle (flat on the ground) while
  the shin tilts. The leg mesh bends at the knee (blend 8) and the ankle. B7 uses ankle blend 56
  (a narrower band tore the instep); new outfit rigs get 12 × 48 with ankle blend 160, because
  56 folded the boot into a point when crouching (traveler v1, soulbow v1).
- **Head**: a new rig uses B7's head texture and attachment exactly (`--own-head` places the
  fitted head piece instead). The fitted head is for the assembly preview only.
- **Leg IK**: root-level targets `ik_leg_F` / `ik_leg_B` sit at the ankles; the IK constraints
  `leg_F` / `leg_B` turn each thigh and shin so the ankle stays on its target, knee bending
  forward. Lowering `root` (its `y` key) bends the knees with the feet planted; moving a target
  steps the foot. In Rig Lab's Animate mode, dragging a leg moves its target; the 🦶 IK button
  turns IK off to rotate the leg bones one by one. IK is not applied in Setup mode.
- **Clips**: `idle` is a 2 s breathing loop (root down 10 → knees bend, small chest, head and
  arm sway); keys are offsets, so it works on every outfit.
  `_F` = near (screen-left, in front), `_B` = far (screen-right, behind).
- **Arm images upright**: the mesh grid follows the image's rows and columns, not the arm. An
  arm drawn at a slant (the arms-out pose leans 25–35°) gets a grid that crosses the elbow at a
  slant, and the inner elbow pinches when it bends. So the build tool turns each arm image until
  its shoulder → fixed hand-anchor line points straight down (`<piece>-upright.png`) and the rig turns it
  back; the rest pose doesn't change. It measures each arm's own angle, so arms drawn further
  out or closer in both come out upright, and it warns if an arm still leans more than 5°
  (usually a bent drawn elbow): check that elbow at 90°.
- **Arm anatomical markers**: `elbow`, `wrist_marker` and `hand_anchor` are fixed metadata
  transferred from the neutral baseline. `wrist_marker` is the centre of the sleeve/skin
  boundary; `hand_anchor` is an internal palm point. Never replace them with a fist alpha
  centroid, farthest pixels or a glove bounding box.
- **Arm bones** follow shoulder → explicit elbow → fixed hand anchor. The lower bone may have
  a non-zero setup rotation; do not straighten it or split shoulder-to-hand distance in half.
  Pose keys are offsets on top of this frozen setup chain.
  To redo only the arms of an existing rig:
  `python tools/build_rig_from_pieces.py <pieces.json> <dir> <rig> --arms-only`.
- **Arm mesh:** C joints are explicit, not a 50% split; 16 cols × 64 rows, `blend` 40,
  `front: child` (lower covers upper). **New outfit leg mesh:** 12 × 48, knee blend 8
  and ankle blend 160; the knee is 169/(169+129) ≈56.7% from hip to ankle.
  In Setup, the bottom dock has three paired preset dropdowns: elbow, knee and foot.
  A selection applies to both F/B limbs in one undo step. Its A/B preview renders
  actual isolated outfit limbs; preview values are not applied until explicitly chosen.
  Save/Ctrl+S persists settings to this rig only, not other outfits or animation keys.
  Side/bottom docks resize and collapse; layout preferences stay local to the browser.
- **Torso mesh**: bends at the waist (`chest`, 173 units above the hip pivot, the belt line,
  full-body y ~715), `blend` 30 (a soft bend), 8 × 24, `front: child`.
- **Draw order**, back to front: far arm, far leg, near leg, torso, head, near arm. Far parts
  are not tinted (the full body already shows depth; the old `#C9C3DA` tint washed dark
  armour to lavender once the far arm was visible).
- **`groundY`** 231, so the soles rest on the ground line.

### Standard shoulder interface — no extra connector parts

Every outfit uses the same asymmetric ownership implied by the fixed draw order; this is not
reinvented per costume:

- `arm_B` is behind the torso. It contains a complete hidden shoulder continuation to the fixed
  pivot; the torso is allowed to cover the inner root and owns the visible far-side torso edge.
- `arm_F` is in front of the torso. It owns the visible near sleeve/pauldron cap and contains its
  complete shoulder continuation. The torso keeps hidden base coverage to the pivot but must not
  expose a second outlined sleeve/cap beside or beneath the arm.
- A torso shoulder is body/shirt coverage, not a second moving sleeve. In the overlap zone its
  concealed edge may be unoutlined; raw runtime textures are not inventory icons. Render item
  icons from the assembled outfit instead of forcing every raw torso texture to read as a
  standalone illustration.
- Do not move pivots, scale an arm, or add a connector sprite to hide a seam. If the fixed rest
  assembly shows two shoulder outlines, regenerate only the offending torso/arm artwork under
  this ownership contract. Large independently moving pauldrons or capes remain explicit
  accessories, not shoulder-gap patches.

## Verify in Rig Lab at game size

Run `npm run dev` and open `http://localhost:5173/?rig=<rig-name>`. Judge renders from the real
renderer, never from a Python re-render (Python mesh drawing shows false cracks).

- Game size: the character is about 200–240px tall.
- To save renders: from the page, draw with `SkeletonView` + `renderer.generateTexture`
  (resolution 3 for smooth images), then POST the PNG to `/__shot/<name>` (dev server only),
  which saves to `assets/drafts/shots/`.
- **Reload the page after replacing a PNG under the same name**; the browser keeps the old one.
- Check: standing, walking, arms forward and raised, elbows at 90°, hips at ±30/45/60°, feet
  on the ground, and the rest pose against the full body.

## Tried and dropped (don't repeat)

- Cutting parts out of a full-body image → missing hidden areas and gaps.
- Pant stubs on the torso joined to legs → kinks at the hip. Use leg domes.
- Round shoulder discs on the torso → read as an extra limb segment.
- Limbs split at the elbow and knee → seams. One piece plus mesh.
- Shape templates drawn by code for the AI to paint over → shapes looked wrong.
- Extra hand bones, hand flipping, separate hand images → artefacts for little gain. (Hand-
  posed ankle bones twisted badly too; the foot bone now poses itself, flat, via
  `inheritRotation: false`.)
- Special armour fixes at the joints → plain armour on the default mesh already looked fine.
- Making pieces by editing c3's pieces with size rules → pieces drifted from the full body and
  the character looked lanky.
- Snapping fists onto B7's arm spec → pulled the far fist behind the tasset.
- Fixing the pinched elbow by turning the arm bones to the drawn bend, or by straightening the
  drawn forearm in the image → changed every bend angle, or didn't help. The cause was the
  slanted mesh grid; turning the whole image upright fixed it.
- The old arms-down rest pose: the far arm is hidden behind the body, so its piece has nothing
  to copy. Every way of inventing it failed: copying the near arm, editing c3's far arm,
  construction refs alone, "rotation-safe" knuckles-forward fists. Draw the far arm visible
  in the full body instead.

## Later

- Short capelets: cape over the far shoulder can be torso material (it hides the far upper arm).
  Over the near shoulder it is either arm-owned (moves like a pauldron, no rig change) or a
  separate part drawn above the near arm (needs builder support).

- A skirt or long robe over the legs needs its own bones (or one mesh over both legs). Long
  hair or a scarf can get extra bones. Both are additions to the shared rig.
