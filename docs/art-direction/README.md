# Kolahon — current art direction

Start with the [current outfit standard](../outfit-pipeline/standard.md) for construction,
reference roles, fixed joints, torso/arm ownership and acceptance gates. The shared skeleton
JSON is the geometry authority; historical arm drawings and measurement rows are not a new rig spec.

## Reference roles

| Reference | Use it for | Never transfer |
|---|---|---|
| [Style / linework](refs/style-linework.png) | Ink, colouring, shadow treatment and mood | Identity, costume, pose, anatomy, props or palette |
| [Chibi proportions](refs/proportions-chibi.png) | Compactness, big head, short limbs and readability | Character design or a replacement for the accepted Neutral geometry |
| Accepted Neutral full body / part | Underlying anatomy and setup placement | Tight contour tracing that removes clothing ease |
| Approved outfit full body | Costume design, material family and intended volume | Literal standing-foot perspective when it conflicts with the selected motion-ready foot |
| Garment silhouette guide | Outer garment contour and bend zones | A universal width multiplier or changed anatomy |

These external-game references are construction/style evidence, not runtime assets. Make original
Kolahon designs and review source rights before wider distribution. Changing reference images
does not authorize changing the frozen skeleton.

## Visual treatment

- Compact chibi: approximately 2.2 heads tall, large expressive head, short limbs and chunky hands/feet.
  The accepted Neutral and rig are the actual size authorities; do not rescale parts to satisfy this approximation.
- Thick dark-brown/black outlines with brush taper; thinner internal details. Avoid uniform vector ink.
- Slightly angular shapes, chunky folds and purposeful silhouette breaks rather than soft balloon forms.
- Flat fills plus one main cool hue-shifted shadow tone; subtle painted texture is acceptable.
  Muted mid-saturation colour, warm skin; no glossy anime finish or pixel-art treatment.
- Big eyes, simple mouth and minimal nose. Character head/identity stays separate from reusable outfits.

## Current construction contract

Follow [sections 1–7 of the outfit standard](../outfit-pipeline/standard.md), not the archived
master-arm prompts. In particular:

- Neutral supplies anatomy; garments may extend beyond it with controlled ease and volume.
- Draw each complete part, including hidden overlap. Do not cut the visible region out of the full body.
- Each arm/leg is one mesh-deformed piece. F/B arms are separate opposite-view drawings, not mirrors.
  Neutral may reuse one leg; actual outfits use reviewed F/B drawings. Neutral feet have four toes total.
- Fists have three fingers plus a thumb: near hand shows its back; far hand shows curled fingers
  stacked toward the viewer with the thumb across the front. Do not twist the wrist to imitate a mirror.
- Near arm owns its moving sleeve; torso must not add a second visible sleeve/wing or shoulder socket.
  The far arm is behind the torso. Hip domes hide under the hem. No connector sprites by default.
- Keep wrist/ankle trim readable through deformation. Do not move anatomical pivots to protect a cuff.
- Base draw order and additional accessory-layer limits are specified in the standard.
  No unconditional requirement to add gloves, long trousers or boots to every future costume.
- Use separate material regions for the colour pass; retain highlights/shadows, linework, dimensions and alpha.
- Inspect actual renderer poses and game-size readability. Numerical reports alone never approve artwork.

## Retained construction / failure references

The images under `refs/` explain construction only: [parts sheet](refs/construction-parts-sheet.webp),
[arms](refs/construction-arms.png), [leg](refs/construction-leg.png),
[hip join](refs/construction-hip-join.png), [hip stubs](refs/construction-hip-stubs.png),
[torso/hips](refs/construction-torso-hips.png), [far fist](refs/construction-far-fist.png)
and [far hand](refs/construction-far-hand.png).

Earlier failure evidence stays in `review/`: [arm tops](review/c3v1-arms-tops.png),
[long torso sleeves](review/c3v1-torsoA-sleeves-too-long.png),
[hips](review/v7-hips-problem.png) and [shoulder](review/v7-shoulder-problem.png).
These explain mistakes; they are not accepted designs to reproduce.

The complete earlier rule set is preserved in [art-direction history](../archive/art-direction-history.md).
It contains superseded costume-specific instructions, old arm refs and old document paths.
