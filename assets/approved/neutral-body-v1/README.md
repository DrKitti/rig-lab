# Neutral body v1 — saved full-body base

Saved on 2026-10-20 following the user's conditional approval to retain the
current neutral full body after checking that its arms are not excessively thin.
Approval scope: **full-body visual reference for the next parts study**.
This is not an approved runtime rig or a claim of exact hidden joint alignment.

## Canonical image

- `fullbody.png`: aligned transparent 671 × 1164 base. Use this file as the
  neutral full-body authority for subsequent part work; do not regenerate it
  routinely or substitute an earlier draft.
- SHA-256: `A0F60973F5F0D401B1DA8206001043A4001314E7AFC2D1B32F774921DB88BAE2`.
- Origin: `assets/drafts/neutral-fullbody-v3/fullbody-review.png` (identical bytes).
- `fullbody-source.png`: unmodified built-in ImageGen output before global
  registration. Registration uses the original production master head features;
  no local art warping was used.
- `measurements.json`, `prompt.txt`, `prompt-feet.txt`: original evidence/prompts.

The head's small redraw differences were accepted by the user. The gray suit is
opaque and fitted; hands and feet are bare. No approved PNG has been repainted
as part of saving this base.

## Extra arm-width check

Cross-sections are perpendicular to the fixed original reference arm rays, at
identical locations in each globally registered image. Width includes outline.

| Near-arm sampling fraction | Original visible forearm | Neutral |
|---|---:|---:|
| 0.45 | 78.25 px | 78.25 px |
| 0.50 | 79.25 px | 78.25 px |
| 0.525 | 78.75 px | 76.0 px |
| 0.55 | 78.5 px | 75.0 px |
| 0.575 | 77.75 px | 72.75 px |

The neutral near forearm is almost unchanged in its middle and modestly narrower
near its wrist (about 4–6%). This is not a substantial whole-arm narrowing.
On the far side, the visible-skin comparison is 65.5 → 66 px at fraction 0.55
and 64.75 → 64.75 px at 0.575. More proximal far-arm sections merge with the
torso/clothing in the original alpha mask and are not reliable isolated widths.
Neither these diagnostics nor a full-body silhouette certify hidden joints.

Original floor is y=1120. Neutral near foot is y=1119; far foot is y=1118.
Both are inside the agreed ±3 px floor tolerance and differ by 1 px.

## Next-stage boundary

No new parts or runtime rig are accepted yet. The next study is one near arm,
using this full body for anatomy/style and the original part for attachment,
reach and hidden construction. Keep the shoulder end smoothly rounded around
the existing pivot, with no extra ball or fully outlined socket ring. Validate
its assembly and elbow/shoulder poses before proceeding to all other parts.

The production master remains `src/data/hero-c3-B7.rig.json` with its original
textures, bones, IK and animation. Keep original master bone lengths during the
parts study; the current builder can recompute them from the drawn image and
must not silently be treated as preserving the skeleton.

Rejected experiments `body-master-v2` and `body-scaffold-v1` are not authorities.
