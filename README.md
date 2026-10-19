# Kolahon Rig Lab

Character rig sandbox for Kolahon: a PixiJS 8 editor, an engine-independent TypeScript
rig runtime, and local Python tools for fitting outfit art. The main Phaser game is
maintained on another machine.

## Run

Use Node.js with npm, then:

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. The default is the shared production master
`hero-c3-B7`. The editor saves rig JSON through the local dev server; keep it bound
to localhost. `Ctrl+S` saves, `Ctrl+Z` undoes, and `Ctrl+Y` redoes.

```sh
npm run typecheck
npm run build
npm run preview
```

Build output includes rig JSON and its referenced textures. Static preview supports
editing and JSON download; saving back to source files requires `npm run dev`.
For Python outfit tools, install `requirements.txt` in a virtual environment.

## Layout

| Path | Purpose |
| --- | --- |
| `src/rig/core/` | Engine-independent skeleton, animation, IK and mesh deformation |
| `src/rig/pixi/` | PixiJS renderer and texture loading |
| `src/editor/` | Rig and animation editor |
| `src/data/hero-c3-B7.rig.json` | Maintained production master, including its idle clip |
| `assets/rigs/hero-c3/` | Five runtime textures for the master |
| `assets/drafts/` | Ignored generation candidates and renderer captures |
| `tools/` | Maintained outfit fitting and rig-building pipeline |
| `docs/rig-spec/` | Joint, pose and size references |

Runtime images use names for their role: `head.png`, `torso.png`, `arm_F.png`,
`arm_B.png`, `leg.png`. `_F` is near/screen-left and `_B` is far/screen-right.
Both leg parts share `leg.png`. The master rig ID and internal texture keys retain
their existing names so saved rig data stays compatible.

## Documentation

- [Current handoff](docs/handoff.md): project status, cleanup, limitations and Git handoff.
- [Character pipeline](docs/character-pipeline.md): full body → pieces → rig → renderer review.
- [Art direction](docs/art-direction/README.md): style and construction references.
- [Agent instructions](AGENTS.md): canonical working rules.

No replacement outfit is currently approved. Historical experiments were removed
during the 2026-10-19 cleanup; see the handoff for the recovery archive location.
