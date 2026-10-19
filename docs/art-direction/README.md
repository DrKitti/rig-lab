# Kolahon — Art Direction (Rig Lab)

Two reference images, each used for **one thing only**. Never copy either character's
design (face, outfit, colours, props); all Kolahon characters are original.

| Reference | Use it for | Ignore |
|---|---|---|
| `refs/style-linework.png` | Line work, colouring, shading, mood | Its proportions, its character design |
| `refs/proportions-chibi.png` | Body proportions, size, stance | Its line work and colouring, its character design |

## Proportions (from `proportions-chibi.png`)

The user tried taller characters with long arms and legs before and they rigged badly. Keep these compact chibi proportions:

- About **2.2 heads tall**. The head is ~45% of total height.
- Short, stubby arms and legs. Hands and boots are large and chunky.
- Torso is short and slightly wider at the hips than the chest.
- A stance a little wider than the shoulders. Readable at small in-game sizes.

## Line work and colour (from `style-linework.png`)

- **Outlines:** thick, confident dark-brown/black ink with visible brush taper (thicker on
  outer silhouette, thinner on inner details). Not uniform vector lines.
- **Shapes:** slightly angular and jagged rather than soft and round. Examples: spiky
  hair clumps, torn or zig-zag cloth hems, chunky folds.
- **Colour:** flat fills with **one shadow tone**, hue-shifted cool (blue/purple), not
  just darker. A subtle painted texture inside the fills is fine. Mid saturation, slightly
  muted, warm skin tones.
- **Face:** large eyes with clear white sclera and solid dark pupils, small simple mouth,
  minimal nose. Expressive but calm.
- **Feel:** western indie cartoon, hand-inked and a little gritty. Not anime-glossy and
  not pixel art.

## Rig-ready output

- **Full-body reference sheet:**
  - Side 3/4 view facing **right** (matches the rig).
  - Use the same reviewed arms-out master pose across costume options, legs slightly apart.
    Both fists and exposed sleeves must be readable. Opaque garments may still cover the
    anatomical shoulder; complete that hidden region when drawing individual pieces.
  - No weapon in hand. Transparent or plain flat background. No text.
- **Parts:** see "Rig parts requirements" below. They supersede the earlier one-image
  parts-sheet approach.

## Shared outfit body, separate character head

Reusable outfits use one torso, near arm, far arm and leg texture for characters of every sex.
The head (face, hair and optional head size) belongs to the character and can change independently.
Do not make sex-specific arms, legs or torso by default, and do not add a female chest requirement
to shared outfits. A named character may have a torso variant when their particular design needs
one, but it is an exception rather than a second version required for every outfit.

## Rig parts requirements (from the user's feedback on parts sheets v2–v8)

These are the user's own corrections from v2–v8, all rejected in the end. Every new
parts attempt must meet all of them. Sample references: `refs/construction-parts-sheet.webp`
(main construction guide), `refs/construction-arms.png`, `refs/construction-leg.png`,
`refs/construction-hip-join.png`, `refs/construction-far-fist.png`. Detail references:
`refs/construction-far-hand.png`, `refs/construction-hip-stubs.png`,
`refs/construction-torso-hips.png`. These come from another game: copy their construction
only, never their design. Our past mistakes are in `review/`: `c3v1-arms-tops.png`,
`c3v1-torsoA-sleeves-too-long.png`, `v7-hips-problem.png`, `v7-shoulder-problem.png`.

**Pieces**
- In the base workflow, five unique textures map to six runtime parts: the character supplies the head, while the
  reusable outfit supplies torso, near arm, far arm and one leg texture; near leg and far leg
  runtime slots reuse that same leg texture at the same size. Each arm and each leg is ONE piece;
  elbows and knees bend later with mesh deformation in the rig.
- Never cut parts out of a full-body image. Draw every part complete, including areas
  another part hides.
- Character faces right in 3/4 view. Near = closer to camera = screen-left shoulder/hip,
  drawn in front. Far = screen-right, drawn behind the torso.

**Costume hides the joints** (user decision after comparing with the sample's rest pose,
`refs/proportions-chibi.png`)
- Keep character a's face, hair and colour palette, but change the outfit so clothing covers
  every rig joint, like the sample:
  - short puffy sleeves over the shoulders;
  - gloves or wrist wraps with a cuff over the wrists;
  - a vest/tunic long enough to cover the hips;
  - LONG pants down into the boots (no bare knees or shins);
  - boot cuffs over the ankles.
- Proportions follow the sample: big head, short body, SHORT thick arms and legs.

**Torso**
- Includes a short neck stub (it goes under the head).
- Shoulders follow the shirt/vest shape. NO round shoulder discs or sockets, which read as an
  extra limb segment.
- Collar/lapels and a folded hood following the body are torso material, not arm material.
  Keep the underlying shoulder coverage even when a sleeve or pauldron overlaps it.
- The bottom is the tunic or tasset hem, outlined and closed, covering the leg domes. No
  pant stubs.

**Arms** (rest pose: `docs/rig-spec/pose-arms-out-male.png`)
- Near arm and far arm are DIFFERENT drawings. The far arm is seen from the other side;
  don't reuse or mirror the near arm.
- Both arms follow the SAME reviewed arms-out master pose, nearly straight. Readable hands
  and sleeves matter; do not demand that a hood/cape become transparent to expose the joint.
  Each generated arm piece must nevertheless be complete to the anatomical shoulder pivot,
  including hidden sleeve material. Never use the hood/cape edge as its shoulder or arm length.
  Every arm-piece call includes the master's arm (`docs/rig-spec/master-arm_F.png` /
  `master-arm_B.png`) as a reference for the hidden upper arm's mass only, never its costume
  (see `docs/character-pipeline.md` step 2).
- The near arm has NO round joint cap; the sleeve top just ends.
- The far arm's joint is only partly rounded at the TOP-LEFT, not a full circle.
- Fists: 3 fingers plus a thumb. Near fist: back of the hand. Far fist: the curled fingers
  face the viewer, stacked vertically, thumb across the front (`refs/construction-arms.png`
  right arm, `refs/construction-far-fist.png`). Never a twisted wrist. This hand-view rule is
  mandatory and independent of arm width: removing the old numeric far-arm ratio does not make
  mirroring, flipping or inventing the far fist acceptable.

**Legs**
- Straight, or only a barely visible bend. A clear knee bend is wrong.
- Same width all the way down to the boot, toe pointing right.
- A full rounded dome on top, hidden under the torso.
- Near and far legs intentionally use the same texture and size. Do not make a smaller far-leg
  variant; depth comes from overlap and draw order. Arms remain separate because their hand
  views differ. Keep the same character's anatomical mass; the far arm may read subtly narrower
  in the 3/4 drawing, but it has no required numeric scale ratio.

**Proportions and joints**: every character uses the shared rig, so body size and joint
positions are fixed by `docs/character-pipeline.md` ("Rig spec"). What goes on the body
(sleeves, gloves, armour, cuffs) is free, as long as the bend zones there stay plain or
are built to overlap.

**Order of work (agreed with the user)**
1. Design three costume options directly ON THE SAME SHARED MASTER; change clothing, not
   the character's anatomy, head, pose or scale. Do not make free-proportion concepts and
   then regenerate the winner on the master as a routine second design step.
2. Align and compare the full bodies with the master, checking design and geometry separately.
   The user selects and approves one before any parts work. A supplied costume reference can
   go straight to a master-based full body without another three-design round.
3. Then reconstruct parts using only that approved full-body image as the reference. Generate
   fresh from it each time; don't edit old sheets.

**Layer scope**
- The current base-rig paladin trial excludes capes, mantles, long tails and hanging banners.
  Armour pauldrons move with the arm; the torso keeps its underlying shoulder coverage.
- A garment that must cover the near arm may need its own front layer (and possibly a separate
  back piece). The base rig draws the near arm in front of the torso. Do not silently assign
  an occluding cape to the torso or arm and claim correct layering in every pose.
- Extra garment layers and cloth motion are separate extensions, not required additions to
  every outfit. Preserve requested features in future cloth trials and report unsupported
  layering rather than simplifying the design without the user's agreement.

**Process lessons**
- Re-editing the whole sheet from the previous version made every round worse. Don't iterate
  on old sheets.
- AI review said "pass" too easily. Check geometry against measurements, not by eye.
- Built-in image_gen accepts at most 5 reference images per call.
