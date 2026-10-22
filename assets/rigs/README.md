# Reviewed runtime artwork

Each folder matches a canonical rig ID. Stable kebab-case image filenames are referenced
by `src/data/*.rig.json`; internal texture keys keep their existing `_F`/`_B` spelling.
Character heads live separately in `assets/characters/`.

`manifest.json` records the exact selected files, dimensions and hashes. Runtime builds
must not depend on ignored drafts. Neutral and the master reuse `leg-f.png` for both slots;
Time Travel has separately drawn `leg-f.png` and `leg-b.png`.

These are selected experiment assets with stable handoff paths, not a final production atlas.
See `docs/PROJECT_HANDOFF.md` for remaining visual/alpha/game integration validation.
