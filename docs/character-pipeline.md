# Character pipeline: one shared rig, many outfits

Every character and outfit uses **one shared skeleton and one shared body/outfit profile**: the
bones, joints and body proportions of `src/data/hero-c3-B7.rig.json` (Rig Lab's default).
Animations and outfit body textures are made once and work for characters of every sex. Character
identity changes through the head texture (face, hair and optional head size), not sex-specific
torso, arm or leg textures. Each outfit is drawn as **one full body in the arms-out rest pose**,
and every piece is reconstructed from that one image.

- **Production body master:** hero c3 v1, full body
  `docs/rig-spec/pose-arms-out-male.png`, rig `src/data/hero-c3-B7.rig.json`.
  Its five runtime textures are in `assets/rigs/hero-c3/`. The only profile is `shared`;
  the historical `male` filename does not define a separate body type.
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
- **The approved full body is the only shape source.** Each piece is reconstructed faithfully
  from it: same silhouette, widths, details and scale, with only the hidden area completed.
  Nothing is drawn from c3's pieces, with one exception: the master's arm pieces
  (`docs/rig-spec/master-arm_F.png`, `master-arm_B.png`) are a reference for the mass of the
  hidden upper arm only (step 2). In prompts, avoid the vague instruction "copy this";
  name the geometry that must stay unchanged and say that the other references supply costume
  design only, never body proportions or pose.
- **Never re-edit a whole image to fix one part.** Every round the AI redraws everything, and
  parts that were already good drift. Fix single pieces, and lock approved ones.
- **AI is bad at numbers.** Fix positions with scripts, not by re-generating.

## What is fixed (the rig spec)

In full-body pixels (canvas 671×1164, 1 px = 1 rig unit, rig origin at (359.2, 888)), within
about ±5 px:

| Joint | Where |
|---|---|
| neck | (340, 490) |
| shoulders | near (265, 580), far (435, 560) |
| hips (leg dome centres) | near (306, 781), far (427, 781) |
| knees | 169 px below the hips |
| soles / ground | y 1119 |

The script fixes the legs onto the hips and ground (step 4), so the drawn legs may be a little
off. The arms are NOT fixed: the rig's arm bones follow the arms as drawn (step 5).

**Rest pose** (use the shared master `pose-arms-out-male.png`):
- 3/4 view facing right; near arm on screen-left, far arm on screen-right;
- both arms held a little out from the body (about 1.5 fist-widths from the tasset/tunic), so
  each whole arm and fist is visible, not tucked behind the body;
- elbows nearly straight (at most ~15°; the mesh does the bending), shoulder to fist ~265 px;
- legs nearly straight;
- hands: 3 fingers plus a thumb. Near fist: back of the hand. Far fist: the curled fingers face
  the viewer, stacked vertically, the thumb across the front (`refs/construction-arms.png`
  right arm, `refs/construction-far-fist.png`).
- a costume that hides every joint (sleeves or pauldrons over the shoulders, cuffs at the
  wrists and boots, tunic or tasset over the hips).

**Bend zones.** The mesh squashes ±20 px along the limb around the elbow and the knee,
±15 px around the waist (y ~715) and ±28 px around the ankle (y ~1079, inside the boot).
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

## Making an outfit

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
   - **Base image:** always the shared master full body
     (`docs/rig-spec/pose-arms-out-male.png`): it has the standard pose, joints and proportions.
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
     master and the shared standard. Soles more than 15 px off mean the AI scaled the body:
     prefer another variant. Leg widths outside the range mean thin or bulky legs; they are
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

2. **Pieces from the approved full body**: five unique textures map to six runtime parts. The
   reusable outfit supplies four textures (torso, near arm, far arm and one leg); the character
   supplies the head. Both runtime legs use the same leg texture at the same size. Use one
   image_gen call per texture that is new for this character/outfit combination.
   References: a crop of that piece's area of the full body, plus the whole full body. Ask it to
   draw ONLY that piece faithfully from the approved image (same shapes, widths, details and fist
   view) and to complete only what is hidden behind other pieces.
   **Arms also get the master's arm as a third reference** (rule since 2026-10-19):
   `docs/rig-spec/master-arm_F.png` for arm_F, `docs/rig-spec/master-arm_B.png` for arm_B. They are
   the same body in the same pose and scale, so they say how long and thick the upper arm is under
   a torso edge, collar or capelet. The prompt must say: use it ONLY for the arm's mass and
   silhouette (upper-arm length from the shoulder top, thickness right below the shoulder, overall
   width and angle); copy none of its costume (no bare skin, cuff or sleeve shape); every visible
   material, colour and detail comes from the outfit's full body; the hidden upper arm is a full,
   thick sleeve reaching the shoulder top, never tapering near it. Without it the far upper arm came
   out 25–35% too thin and looked cut off (traveler v1, soulbow v1); with it soulbow v2 passed.
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
   | leg | (215, 840, 400, 1125) |

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
     shoulder/sleeve material back to the fixed anatomical shoulder pivot. A visible sleeve
     seam below a hood is not a new joint. Never include the hood in the arm merely because it
     overlaps the arm's reference crop;
   - far arm: it is a separate opposite-side drawing, not a scaled copy. Keep the same character's
     anatomical mass; it may look subtly narrower because of the 3/4 view, but there is no required
     percentage. Reject only when it looks conspicuously tiny or larger than the near arm;
   - **far-fist construction is still a hard requirement even though arm width is not:** near
     fist shows the back of the hand; far fist shows the curled fingers facing the viewer,
     stacked vertically with the thumb across the front. It is not a mirrored near fist. Both
     hands have 3 fingers plus a thumb; count them and reject a twisted wrist.

   Save them as `<out>/raw/<piece>-raw.png` (head, torso, arm_F, arm_B, leg_F). The far leg
   intentionally reuses `leg_F` without perspective scaling: the two legs have the same texture
   and size. Perspective is expressed by overlap and draw order. Arms are different because the
   far hand is seen from the opposite side; their size relationship is judged in the renderer.
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
4. **Fit the legs and assemble**: stands the leg upright and matches its width to the full
   body's near leg at the shin, puts the leg domes on the hips and the soles on the ground,
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
5. **Build the rig**: copies B7's skeleton and settings, turns the arm bones to the arms as
   drawn, turns each arm image upright (see "Arm images upright" below) and places every piece:
   `python tools/build_rig_from_pieces.py <out>/pieces.json <out> <new-rig-name>`
6. **Verify** in Rig Lab (below), still in the drawn arms-out pose, so the rest pose can be
   compared with the full body. Fix a bad piece alone (step 2 for that piece, then 3–5).
   Also inspect each arm alone and rotate it away from the torso: the upper arm must remain
   complete, its shoulder must stay connected and torso clothing must not move with it.
7. **Rest pose, last**: once everything checks out, turn the arms down to the standard rest
   pose. The arm images turn with the bones about the shoulder; no art changes:
   `python tools/set_rest_arms.py <new-rig-name>`
   Every outfit then stands with the same arms (c3's old arms-down angles: near 106.5°, far
   71.3°, shoulder → fist). Rebuilding the arms later (`--arms-only`) brings back the drawn
   pose, so run this step again after it.
   The drawn angles stay in the rig (`drawnRotation` on the upper-arm bones): Rig Lab's
   **✍ ท่าที่วาด** button in Setup mode shows the drawn pose again, to compare with the full
   body (view only; the default is the rest pose).

## Base outfit scope and occluding garments

The four-outfit-texture / six-runtime-part workflow is the BASE contract, not a promise that
every costume can fit it. For the current paladin trial, use armour, cuffs and a short hip-covering
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

**Height is locked, width is free** (user, 2026-10-19). Vertical positions are the same for every
outfit: head size, neck, shoulders, waist, hips, knees and soles. Costume width may differ
(bulky fur or armour, slim cloth), so width readings stay diagnostics.

**Must pass:**
- the full body keeps the shared pose, joint landmarks and overall scale; soles within 15 px of
  the master (a larger offset means the AI shrank or stretched the body: reject the variant,
  don't rely on the leg re-fit to hide it);
- both arms and fists are visible, the hand views are correct, and no required part is missing;
- the rig builds and has no visible gap, tear or broken joint in the standing, elbow-90 and
  planted-feet checks;
- the result still reads as the approved costume at game size.
- existing working rigs continue to build, load and animate without being rearranged to satisfy
  a new measurement rule.

**Diagnostics to inspect, never gates by themselves:**
- SIFT match count, silhouette IoU, head/limb/fist/boot differences and far/near arm ratios;
- busy or hard detail in a bend zone;
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
- `tools/set_rest_arms.py <rig-name>…`: last step; turns the arms to the standard rest pose.
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
  its shoulder → fist line points straight down (`<piece>-upright.png`) and the rig turns it
  back; the rest pose doesn't change. It measures each arm's own angle, so arms drawn further
  out or closer in both come out upright, and it warns if an arm still leans more than 5°
  (usually a bent drawn elbow): check that elbow at 90°.
- **Fist point** (for the arm bones): the middle of the arm pixels farthest from the shoulder,
  found in the piece, whatever the glove colour.
- **Arm bones** point from the shoulder to the fist as drawn, with the elbow halfway; step 7
  then turns them to the shared rest pose (arms down). Animation keys are added on top of it.
  To redo only the arms of an existing rig:
  `python tools/build_rig_from_pieces.py <pieces.json> <dir> <rig> --arms-only`.
- **Mesh** (arms and legs): joint at 50% of the limb, `blend` 8 (a sharp bend), 8 cols ×
  24 rows, `front: child` (the lower part covers the fold).
- **Torso mesh**: bends at the waist (`chest`, 173 units above the hip pivot, the belt line,
  full-body y ~715), `blend` 30 (a soft bend), 8 × 24, `front: child`.
- **Draw order**, back to front: far arm, far leg, near leg, torso, head, near arm. Far parts
  are not tinted (the full body already shows depth; the old `#C9C3DA` tint washed dark
  armour to lavender once the far arm was visible).
- **`groundY`** 231, so the soles rest on the ground line.

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
