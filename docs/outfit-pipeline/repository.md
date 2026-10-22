# File naming and ownership

Active IDs and filenames use lowercase kebab-case: `shared-master`, `neutral`, `time-travel`.
The authoritative list and legacy aliases live in `src/data/rig-catalog.json`.
Schema IDs (`neutral-c-v5`), bone IDs (`arm_B_1`), texture keys (`torso_B`) and pipeline
working names (`leg_F-raw.png`) remain stable; they are not renamed cosmetically.

| Area | Convention |
|---|---|
| Maintained rig | `src/data/<rig-id>.rig.json` |
| Shared clip library | `src/data/animations/<skeleton-id>.animations.json` |
| Outfit runtime images | `assets/rigs/<outfit-id>/{torso,arm-f,arm-b,leg-f,leg-b}.png` as needed |
| Character head | `assets/characters/<character-id>/head.png` |
| Runtime asset inventory | `assets/rigs/manifest.json` (dimensions + SHA256) |
| Approved source bodies | `assets/approved/<accepted-source-version>/`, preserved intact |
| Reusable guide / source | `assets/pipeline/guides/`, `neutral/`, `sources/` |
| Material recipe | `assets/pipeline/recipes/<outfit-or-pass>.materials.json` |
| Current docs / figures | `docs/outfit-pipeline/`, lowercase kebab-case filenames |
| Scratch generations | ignored `assets/drafts/<outfit>-<experiment>-vN/` |
| Historical trial data | `assets/experiments/rigs/`, original IDs retained as provenance |
| Curated failure evidence | `assets/experiments/evidence/` |
| Old one-time scripts/docs | `tools/archive/`, `docs/archive/` |

Current assets are in stable locations for integration. This does not claim production
atlas/resolution or that the second-outfit proof has passed. Copying selected draft images
to these locations changes paths only; `assets/pipeline/checkpoint-manifest.json` records
their source hashes and migration map.

Only maintained rigs in `src/data/` are included by the build. Archived data must not be moved
back there merely to inspect history, because many trial paths intentionally refer to unshipped
local scratch art. The catalog aliases resolve the three historical maintained names for old URLs.
Changing a linked outfit's geometry or library is a deliberate new skeleton migration, not a rename.

`nightcamp docs/`, agent-skill installations, dependencies, secrets, build output and ignored
drafts are outside this outfit handoff. Do not use a broad `git add -A` to collect unrelated work.
