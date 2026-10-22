# Time Travel runtime parts

## Accepted leg pair (2026-10-22)

- `leg_F.png` and `leg_B.png` are the user-accepted separately drawn near/far leg pair.
- They were fitted independently to the fixed shared hip, knee, ankle and ground landmarks.
- Source and QA material remain in `assets/drafts/time-travel-leg-guide-v2/` and
  `assets/drafts/time-travel-leg-pair-rig-v1/`.

### Required follow-up before production

The complete material-aware palette pass is active in the maintained Time Travel rig:
`assets/drafts/time-travel-material-match-v4/` contains matched torso, arms F/B and legs F/B,
plus shared material config, reports, before rig snapshot and rendered comparison.
This directory's original legs remain unchanged. Production asset consolidation is pending
the second-outfit pipeline proof. Colour is matched by material, preserving shadows and alpha.

First material-aware pass is implemented in `tools/match_materials.py`. Draft outputs,
region config, reports and comparisons: `assets/drafts/time-travel-material-match-v1/`.
That first pair-only trial is historical; the complete v4 pass supersedes it in Rig Lab.
