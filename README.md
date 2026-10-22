# Kolahon Rig Lab & Outfit Pipeline

Experiment handoff for Kolahon: a PixiJS 8 rig editor, a renderer-independent TypeScript
runtime, three reviewed rig assemblies and a documented outfit-generation workflow.
The destination game uses Phaser and is not present in this checkout.

**Receiving agent: start with [PROJECT_HANDOFF](docs/PROJECT_HANDOFF.md), then
[integration](docs/integration.md).** These explain what is usable, what failed and what remains unproven.
Read the [current outfit standard](docs/outfit-pipeline/standard.md) for art construction and fixed joints.

## Run and verify

Node.js 24+ and npm:

```sh
npm ci
npm run dev
npm test
npm run build
```

Open Vite's localhost URL. `Ctrl+S` saves the outfit and shared animation library.
Static builds support editing/export; writing back to source files requires the dev server.
Manual pose QA: `/qa/`. Python colour/fitting tools additionally need `requirements.txt`:

```sh
python -m pip install -r requirements.txt
npm run test:pipeline
```

See [verification evidence and known limits](docs/verification.md), including current Pixi renders.

## Take it to the main game

```sh
npm run export:runtime
```

Creates a new `dist/kolahon-outfit-integration/` with core TypeScript, resolved rig JSON,
all runtime textures, shared clips, specifications, integration docs and a SHA256 inventory.
The exporter refuses to overwrite an existing export; use a new path under `dist/` for another version.
This bundle does not need ignored drafts or the Vite server. A Phaser mesh-rendering adapter
and real game validation are still required; this is not a production-ready Phaser plugin.

## Repository map

| Path | Ownership / use |
|---|---|
| `src/rig/core/` | Portable skeleton, animation, two-bone IK and mesh skinning |
| `src/rig/pixi/` | Pixi renderer; reference implementation for a future Phaser adapter |
| `src/editor/` | Rig Lab UI, history, handles and preview tools |
| `src/server/` | Local save/library adapters; not game-runtime code |
| `src/data/` | `shared-master`, `neutral`, `time-travel`; catalog and shared animations |
| `assets/rigs/`, `assets/characters/` | Stable runtime textures; verified inventory in `assets/rigs/manifest.json` |
| `assets/approved/` | User-approved full-body sources, kept intact |
| `assets/pipeline/` | Reusable guides, source images, example prompts and material recipes |
| `assets/experiments/` | Archived rig data and curated failures; excluded from runtime/build |
| `docs/outfit-pipeline/` | Current standard, tooling, naming, infographic and comparisons |
| `docs/archive/`, `tools/archive/` | Historical records; not current authority |
| `tests/`, `qa/` | Automated regression checks and real-renderer pose inspection |
| `assets/drafts/` | Ignored scratch output; never required for clone/build/playback |

Historical rig URLs still resolve through aliases in `src/data/rig-catalog.json`.
Bone IDs, `neutral-c-v5`, texture keys and animation channels stay stable for compatibility;
filenames now use lowercase kebab-case. `_F` / `_B` internally mean near/front and far/back.

## Current checkpoint

- Shared skeleton: two-part torso, accepted arm joints, 52% knee, anatomical ankle,
  horizontal foot bone and up-to-4% planted-foot compression.
- Neutral scaffold and complete Time Travel outfit are assembled and material-matched.
- Saved animations are shared across outfits; only reviewed idle variants exist so far.
- A second independently generated outfit on the frozen skeleton, Phaser integration,
  production asset optimization and accessory layers remain future work.

See [experiment lessons](docs/experiments.md), [art direction](docs/art-direction/README.md),
[tooling](docs/outfit-pipeline/tooling.md) and [agent instructions](AGENTS.md).
