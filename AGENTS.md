# AGENTS.md

Canonical instructions for all agents working in this folder. Do not duplicate
these rules in other docs; `CLAUDE.md` only imports this file.

## Project context

This is a sandbox for prototyping things to bring into the game **Kolahon**
(e.g. character rigs, maps). The main Kolahon project lives on another machine
and is not available here.

Rig Lab uses PixiJS 8 + Vite + TypeScript (`npm run dev`, typecheck with
`npm run typecheck`) with a custom Spine-like rig runtime. Kolahon itself is a
Phaser + Vite web game.

## Rig Lab layout

- `src/rig/core/` — engine-free runtime (data format, matrix math, skeleton, clip
  sampling/easing, `AnimationState` with crossfade, mesh skinning along a bone chain in
  `mesh.ts` for elbows/knees, two-bone IK in `skeleton.ts` for the legs). No imports from
  Pixi or the editor; this is the part meant to move into the game whatever its renderer.
- `src/rig/pixi/` — PixiJS renderer (`SkeletonView`) and texture loading.
- `src/editor/` — the editor: `viewport.ts` (Pixi canvas + handles), `ui/` (topbar, left,
  right, timeline), `state.ts` (shared state + undo). Edits are plain functions in
  `rigEdit.ts` (skeleton/parts) and `animEdit.ts` (keys/clips).
- `src/data/{shared-master,neutral,time-travel}.rig.json` — maintained rig definitions.
  `src/data/animations/` owns shared clips; `src/data/rig-catalog.json` owns picker IDs and aliases.
  The user edits these in the editor and saves through the dev server (`/__rig/<name>`,
  see `vite.config.ts`), so treat them as user data: re-read before changing and never
  overwrite their edits with older values.
- Start a handoff by reading `docs/PROJECT_HANDOFF.md`, then `docs/integration.md`.
- Making a character or outfit: follow `docs/outfit-pipeline/standard.md` and `tooling.md`.
  All characters share one rig (`src/data/shared-master.rig.json`, Rig Lab's default), whose joints are specified in
  `docs/rig-spec/`. The art rules are in `docs/art-direction/README.md`.
- `assets/rigs/<outfit>/` and `assets/characters/` — stable, reviewed runtime textures.
  `assets/pipeline/` holds reusable inputs/recipes; `assets/experiments/` holds historical evidence.
  Active rig data and builds must not depend on ignored drafts. Draft output
  belongs in the ignored `assets/drafts/` tree until it is explicitly accepted and promoted.
- `tools/` — the maintained outfit pipeline (`align_fullbody.py`, `fit_pieces.py`,
  `assemble_pieces.py`, `check_proportions.py`, `build_rig_from_pieces.py`,
  `match_materials.py`) plus the shared frame helper. Usage is in `docs/outfit-pipeline/tooling.md`.
- `src/server/` — Vite/local filesystem adapters, never imported into the portable core.
- `tests/` — portable core, editor, server and Python pipeline tests. Run `npm test`,
  `npm run test:pipeline`, `npm run build`; export with `npm run export:runtime`.
- `tools/archive/` and `docs/archive/` are historical evidence, not current instructions.
  One-time migration scripts there may reference old local layouts; do not rerun them on the master.

## Agent roles

Claude is the primary agent for all coding, planning and project management.
Only raster image generation and editing is delegated to Codex CLI.

## Image generation and editing (Codex worker)

- Invoke: `codex exec --sandbox workspace-write "<task>"` from the repo root.
- Codex must use the `imagegen` skill in built-in `image_gen` mode (ChatGPT login).
  Never use `scripts/image_gen.py`, `OPENAI_API_KEY`, or direct API calls.
  If built-in `image_gen` is unavailable, stop and report — no substitute services.
- Before generating, read the art direction docs in `docs/art-direction/`.
  If they don't exist yet, ask the user for the art direction before generating.
- Write new outputs to `assets/drafts/` with versioned names (`name-v2.png`); never
  leave a project asset only in `~/.codex/generated_images/`.
- Never overwrite, move or modify files in `assets/approved/` without explicit
  user permission.
- After generation, Claude reviews every image against the art direction
  (style, palette, composition, text accuracy) before proposing it for approval.
