# Rig specification authority

- `shared-skeleton-v5.json`: current torso, knee, ankle, foot and plant settings.
- `shared-arm-placement.json`: accepted arm bones and independent artwork anchors.
- `src/data/shared-master.rig.json`: complete current setup; all maintained outfits share its bones.
- `pose-arms-out-male.png`: retained canonical image frame used by the existing fitting/alignment tools.
  The historical filename is a compatibility detail, not a sex-specific outfit requirement.
- `proportions.json`: legacy Hero costume width samples used by diagnostic tools. Its station rows
  are historical sampling locations, not the current knee/ankle coordinates or mandatory clothing sizes.

Old Hero diagrams and arm drawings are preserved under `docs/archive/rig-spec/`.
Do not derive the current v5 skeleton from them. Current coordinates/reference roles are described
in [the outfit standard](../outfit-pipeline/standard.md).
