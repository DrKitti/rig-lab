# Main-branch file audit before the outfit handoff PR

Reviewed 2026-10-23 against fetched `origin/main` at `11e9e5f` (68 tracked files).
Local `main` was ahead by an earlier checkpoint; the PR comparison is against the remote base,
not only the latest cleanup commit. Changes are made on `codex/outfit-pipeline-handoff`.
This review does not modify or merge `main` directly.

## Keep, archive, replace or remove

| Files from the original main | Decision and evidence |
|---|---|
| `src/main.ts`, `src/editor/`, `src/rig/core/`, `src/rig/pixi/` | Keep: editor/runtime entry points, imported rendering and editing modules. TypeScript also passes unused-local/parameter checks. |
| `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`, lockfile | Keep/update: app entry, local save API, asset build and dependency reproducibility. |
| `requirements.txt` | Keep: NumPy/Pillow/OpenCV are used by fitting, palette processing and pipeline tests. |
| `.gitattributes`, `.gitignore` | Keep/update: cross-platform LF, binary image handling and scratch/local exclusions. |
| `AGENTS.md`, `CLAUDE.md`, `.claude/launch.json` | Keep: canonical agent instructions, its import and a portable npm launch configuration; not an unused personal credential/config. Do not copy them over the main game's instructions. |
| `assets/drafts/.gitkeep` | Keep: scaffold only; scratch outputs remain ignored and excluded from builds. |
| `src/data/hero-c3-B7.rig.json` | Replace as active data with `shared-master.rig.json`; preserve original snapshots/history and the legacy URL alias. |
| `assets/rigs/hero-c3/*` | Replace active paths with canonical outfit/character folders. Original art remains in `assets/experiments/runtime-origins/hero-c3/`; no irreversible art deletion. |
| `tools/set_rest_arms.py` | Already removed earlier in this PR history: superseded drawn-pose mutation conflicts with the frozen shared setup. Recoverable through Git history. |
| Remaining original Python tools + `pipeline_frame.py` | Keep: documented alignment/fitting/assembly/rig-building/diagnostic commands and their shared helper. They have historical fitting assumptions, explicitly documented rather than claimed to be universal. |
| `docs/character-pipeline.md`, `docs/handoff.md` | Keep short compatibility pointers; full old content is archived. Current entry is `docs/PROJECT_HANDOFF.md`. |
| `docs/art-direction/README.md` | Replace conflicting master-era construction instructions with current art treatment/reference roles and a link to the accepted standard; preserve the complete old text in `docs/archive/art-direction-history.md`. |
| `docs/art-direction/refs/*`, `review/*` | Keep: explicitly indexed style/construction references and failure examples. Evidence only, excluded from runtime export. |
| `docs/rig-spec/{hero-c3-B7-fullbody,hero-c3-B7-spec,master-arm_F,master-arm_B}.png` | Move all four to `docs/archive/rig-spec/`: historical coordinate evidence, old arm samples/diagram, not current v5 authority. No active tool reads these PNGs. |
| `docs/rig-spec/pose-arms-out-male.png` | Keep at its existing path: `align_fullbody.py` actually loads it. Filename is historical, not a sex-specific outfit requirement. |
| `docs/rig-spec/proportions.json` | Keep: two tools read its width samples. Fix dangling rig/source paths and label legacy measurements as diagnostic, not current joint locations or garment requirements. |

## Why not delete all old files?

Selected source art, exact prompts, failure evidence and snapshots explain how the experiment
arrived here and support recovery. They belong in explicit pipeline/history folders, not the
active runtime. `match_palette.py`, although older, is imported by `match_materials.py` for
shared helpers, so deleting it would break the current colour tool.

No approved source was edited, and no canonical skeleton/animation/art binding was changed
by this follow-up audit. The four moved PNGs remain byte-identical and recoverable at their
archive paths. Legacy archive citations intentionally retain their original path wording.

## Verification and scope

See [verification evidence](verification.md) for the full handoff's clean-checkout tests.
The follow-up reruns repository/Node/Python checks, TypeScript unused checks, build and export.
The verifier now checks the diagnostic reference paths too, so this dangling-path error cannot
silently return. Active runtime data still consists of three maintained rigs and 15 textures.

Read [integration boundaries](integration.md) before merging/vendor-copying into Kolahon.
This PR prepares the experiment repository; it does not implement Phaser or complete the
second-outfit proof. No PR creation or merge is implied by saving its description.
